# ============================================================
#  main.py  —  JudicialGPT Legal Document RAG Summarizer
#  Stack: LangChain + Groq API + FAISS + HuggingFace Embeddings
#  Fix: Manual map-reduce — bypasses langchain_classic's broken
#       GPT-2 token counter that caused the ValueError crash.
# ============================================================

import os
import sys
import time
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from rich.console import Console
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.rule import Rule

# ── LangChain imports ──────────────────────────────────────────
from langchain_groq import ChatGroq
from langchain_community.document_loaders import (
    PyPDFLoader,
    TextLoader,
    Docx2txtLoader,
    UnstructuredFileLoader,
)
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_classic.chains import RetrievalQA

# ── Local imports ──────────────────────────────────────────────
from prompts import (
    MAP_PROMPT_TEMPLATE,
    REDUCE_PROMPT_TEMPLATE,
    QA_PROMPT_TEMPLATE,
)

# ── Bootstrap ──────────────────────────────────────────────────
load_dotenv()
console = Console()


# ══════════════════════════════════════════════════════════════
#  CONFIGURATION
# ══════════════════════════════════════════════════════════════
class Config:
    """Central configuration — edit here or use .env overrides."""

    # Groq — llama-3.3-70b-versatile has 128k context & high free-tier TPM
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    GROQ_TEMPERATURE: float = 0.0     # 0 = fully deterministic; best for legal accuracy
    GROQ_MAX_TOKENS: int = 4096       # output tokens per call

    # Embeddings (runs fully locally — no API call)
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"

    # Chunking
    # 1000 chars ≈ ~250 tokens of content
    # MAP prompt adds ~500 tokens → ~750 tokens/call, well under any free TPM limit
    CHUNK_SIZE: int = 1000
    CHUNK_OVERLAP: int = 150

    # Retrieval (for QA)
    RETRIEVAL_K: int = 6

    # Output directory for saved summaries
    OUTPUT_DIR: Path = Path("outputs")


# ══════════════════════════════════════════════════════════════
#  DOCUMENT LOADER
# ══════════════════════════════════════════════════════════════
def load_document(file_path: str) -> list[Document]:
    """
    Load a legal document from disk.
    Supported: PDF, TXT, DOCX, and most unstructured text formats.
    """
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"Document not found: {file_path}")

    suffix = path.suffix.lower()
    console.print(f"[cyan]Loading document:[/cyan] {path.name}  [dim]({suffix})[/dim]")

    if suffix == ".pdf":
        loader = PyPDFLoader(str(path))
    elif suffix == ".txt":
        loader = TextLoader(str(path), encoding="utf-8")
    elif suffix in (".docx", ".doc"):
        loader = Docx2txtLoader(str(path))
    else:
        loader = UnstructuredFileLoader(str(path))

    docs = loader.load()
    console.print(
        f"[green]✓ Loaded[/green] {len(docs)} page(s) "
        f"— {sum(len(d.page_content) for d in docs):,} characters total"
    )
    return docs


# ══════════════════════════════════════════════════════════════
#  TEXT SPLITTER
# ══════════════════════════════════════════════════════════════
def split_documents(docs: list[Document], cfg: Config) -> list[Document]:
    """
    Split documents into overlapping chunks optimised for legal text.
    Separators respect structural boundaries before resorting to mid-sentence breaks.
    """
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=cfg.CHUNK_SIZE,
        chunk_overlap=cfg.CHUNK_OVERLAP,
        length_function=len,
        separators=[
            "\n\n\n",    # major section breaks
            "\n\n",      # paragraph breaks
            "\n",        # line breaks
            ". ",        # sentence boundary
            "؟ ", "! ", # Urdu/Arabic sentence-end punctuation
            " ",         # word boundary (last resort)
            "",          # character-level (absolute last resort)
        ],
    )
    chunks = splitter.split_documents(docs)
    console.print(
        f"[green]✓ Split[/green] into [bold]{len(chunks)}[/bold] chunks "
        f"(≤{cfg.CHUNK_SIZE} chars, {cfg.CHUNK_OVERLAP} overlap)"
    )
    return chunks


# ══════════════════════════════════════════════════════════════
#  VECTOR STORE  (FAISS — local, zero API cost)
# ══════════════════════════════════════════════════════════════
def build_vector_store(chunks: list[Document], cfg: Config) -> FAISS:
    """Embed all chunks into a local FAISS index for QA retrieval."""
    console.print(
        f"[cyan]Building vector store[/cyan] "
        f"using [bold]{cfg.EMBEDDING_MODEL}[/bold] …"
    )
    embeddings = HuggingFaceEmbeddings(
        model_name=cfg.EMBEDDING_MODEL,
        model_kwargs={"device": "cpu"},
        encode_kwargs={"normalize_embeddings": True},
    )
    vector_store = FAISS.from_documents(chunks, embeddings)
    console.print("[green]✓ Vector store ready[/green]")
    return vector_store


# ══════════════════════════════════════════════════════════════
#  LLM  (Groq)
# ══════════════════════════════════════════════════════════════
def build_llm(cfg: Config) -> ChatGroq:
    """Initialise the Groq-backed LLM."""
    if not cfg.GROQ_API_KEY:
        console.print(
            "[red]ERROR:[/red] GROQ_API_KEY is not set.\n"
            "Create a .env file in this folder and add:\n"
            "  GROQ_API_KEY=your_key_here\n"
            "Get a free key at https://console.groq.com/keys"
        )
        sys.exit(1)

    llm = ChatGroq(
        groq_api_key=cfg.GROQ_API_KEY,
        model_name=cfg.GROQ_MODEL,
        temperature=cfg.GROQ_TEMPERATURE,
        max_tokens=cfg.GROQ_MAX_TOKENS,
    )
    console.print(
        f"[green]✓ LLM ready[/green]  →  model: [bold]{cfg.GROQ_MODEL}[/bold]"
    )
    return llm


# ══════════════════════════════════════════════════════════════
#  MANUAL MAP-REDUCE SUMMARISATION
#  Root cause of all previous errors:
#    langchain_classic uses a GPT-2 tokenizer internally to count
#    tokens before the reduce/collapse step. For Llama models this
#    count is wildly wrong, causing either 413 (over-limit) or the
#    "document longer than context" ValueError crash.
#  Solution: bypass load_summarize_chain entirely and call the LLM
#    directly via langchain_core chains (no internal tokenizer used).
# ══════════════════════════════════════════════════════════════
def summarize_documents(
    llm: ChatGroq,
    chunks: list[Document],
    cfg: Config,
) -> str:
    """
    Manual map-reduce pipeline:

    MAP    — call LLM once per chunk → compact legal extract (≤300 words)
    REDUCE — call LLM once on all extracts → final 14-section summary

    For very long documents (combined extracts > 60k chars) an automatic
    intermediate collapse step kicks in before the final reduce.
    """
    parser = StrOutputParser()

    map_prompt    = PromptTemplate(template=MAP_PROMPT_TEMPLATE,    input_variables=["text"])
    reduce_prompt = PromptTemplate(template=REDUCE_PROMPT_TEMPLATE, input_variables=["text"])

    map_chain    = map_prompt    | llm | parser
    reduce_chain = reduce_prompt | llm | parser

    # ── MAP step ──────────────────────────────────────────────
    console.print(
        f"\n[bold cyan]MAP step[/bold cyan] — extracting from "
        f"[bold]{len(chunks)}[/bold] chunks …"
    )
    partial_summaries: list[str] = []

    for i, chunk in enumerate(chunks, 1):
        console.print(
            f"  [dim]→ chunk {i}/{len(chunks)}  "
            f"({len(chunk.page_content)} chars)[/dim]",
            end="",
        )
        try:
            result = map_chain.invoke({"text": chunk.page_content})
            partial_summaries.append(result.strip())
            console.print("  [green]✓[/green]")
        except Exception as e:
            console.print(f"  [red]✗ skipped:[/red] {e}")

    if not partial_summaries:
        raise RuntimeError(
            "All chunks failed during MAP step. "
            "Check your GROQ_API_KEY and internet connection."
        )

    console.print(
        f"\n[green]✓ MAP complete[/green] — "
        f"{len(partial_summaries)} extracts produced"
    )

    # ── REDUCE step ───────────────────────────────────────────
    SEPARATOR = "\n\n" + "─" * 40 + "\n\n"
    combined = SEPARATOR.join(partial_summaries)

    # Guard: if combined extracts exceed ~60k chars, do an intermediate
    # collapse (re-map the halves) before the final reduce.
    MAX_REDUCE_CHARS = 60_000
    if len(combined) > MAX_REDUCE_CHARS:
        console.print(
            f"\n[yellow]⚠ Combined extracts are large "
            f"({len(combined):,} chars > {MAX_REDUCE_CHARS:,}).\n"
            f"  Running intermediate collapse …[/yellow]"
        )
        mid = len(partial_summaries) // 2
        half_a = SEPARATOR.join(partial_summaries[:mid])
        half_b = SEPARATOR.join(partial_summaries[mid:])
        try:
            collapse_a = map_chain.invoke({"text": half_a})
            collapse_b = map_chain.invoke({"text": half_b})
            combined = collapse_a.strip() + SEPARATOR + collapse_b.strip()
            console.print("[green]✓ Intermediate collapse done[/green]")
        except Exception as e:
            console.print(
                f"[yellow]⚠ Collapse failed ({e}), "
                f"proceeding with truncated combined text …[/yellow]"
            )
            combined = combined[:MAX_REDUCE_CHARS]

    console.print("\n[bold cyan]REDUCE step[/bold cyan] — generating final summary …")
    final_summary = reduce_chain.invoke({"text": combined})
    return final_summary.strip()


# ══════════════════════════════════════════════════════════════
#  QA CHAIN
# ══════════════════════════════════════════════════════════════
def build_qa_chain(
    llm: ChatGroq,
    vector_store: FAISS,
    cfg: Config,
) -> RetrievalQA:
    """Build a retrieval-augmented QA chain over the loaded document."""
    qa_prompt = PromptTemplate(
        template=QA_PROMPT_TEMPLATE,
        input_variables=["context", "question"],
    )
    chain = RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff",
        retriever=vector_store.as_retriever(
            search_kwargs={"k": cfg.RETRIEVAL_K}
        ),
        chain_type_kwargs={"prompt": qa_prompt},
        return_source_documents=True,
    )
    console.print(
        f"[green]✓ QA chain ready[/green]  →  retrieval k={cfg.RETRIEVAL_K}"
    )
    return chain


# ══════════════════════════════════════════════════════════════
#  SAVE OUTPUT
# ══════════════════════════════════════════════════════════════
def save_summary(summary: str, source_file: str, cfg: Config) -> Path:
    """Write the final summary to a timestamped .txt file."""
    cfg.OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    stem = Path(source_file).stem
    timestamp = time.strftime("%Y%m%d_%H%M%S")
    out_path = cfg.OUTPUT_DIR / f"{stem}_summary_{timestamp}.txt"
    out_path.write_text(summary, encoding="utf-8")
    return out_path


# ══════════════════════════════════════════════════════════════
#  MAIN RAG CLASS
# ══════════════════════════════════════════════════════════════
class LegalDocumentRAG:
    """
    End-to-end RAG pipeline for legal document summarisation and QA.

    Usage:
        rag = LegalDocumentRAG()
        summary = rag.summarize("path/to/judgment.pdf")
        answer  = rag.ask("What reliefs were granted to the petitioner?")
    """

    def __init__(self, config: Optional[Config] = None):
        self.cfg = config or Config()
        self.llm = build_llm(self.cfg)
        self._vector_store: Optional[FAISS] = None
        self._qa_chain = None

    # ── Summarise ──────────────────────────────────────────────
    def summarize(self, file_path: str, save: bool = True) -> str:
        """
        Full pipeline: load → split → embed → MAP → REDUCE → (save)
        Returns the final summary string.
        """
        console.rule(
            "[bold yellow]⚖  JudicialGPT — Legal Document Summariser  ⚖[/bold yellow]"
        )

        # 1. Load document
        docs = load_document(file_path)

        # 2. Split into chunks
        chunks = split_documents(docs, self.cfg)

        # 3. Build FAISS vector store for QA
        self._vector_store = build_vector_store(chunks, self.cfg)
        self._qa_chain = build_qa_chain(self.llm, self._vector_store, self.cfg)

        # 4. Manual map-reduce summarisation (no langchain_classic tokenizer)
        summary = summarize_documents(self.llm, chunks, self.cfg)

        # 5. Display
        console.rule("[bold green]SUMMARY COMPLETE[/bold green]")
        console.print(
            Panel(
                summary,
                title="[bold]⚖  JUDICIAL DOCUMENT SUMMARY  ⚖[/bold]",
                expand=True,
                border_style="yellow",
            )
        )

        # 6. Save
        if save:
            out_path = save_summary(summary, file_path, self.cfg)
            console.print(
                f"\n[green]✓ Summary saved →[/green] [bold]{out_path}[/bold]"
            )

        return summary

    # ── Ask questions ──────────────────────────────────────────
    def ask(self, question: str) -> str:
        """
        Ask a specific question about the loaded document.
        summarize() must be called first.
        """
        if self._qa_chain is None:
            raise RuntimeError(
                "No document loaded. Call summarize(file_path) first."
            )

        console.rule("[bold cyan]QA Query[/bold cyan]")
        console.print(f"[bold]Question:[/bold] {question}\n")

        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console,
        ) as progress:
            task = progress.add_task(
                "[yellow]Retrieving and reasoning …[/yellow]", total=None
            )
            result = self._qa_chain.invoke({"query": question})
            progress.stop_task(task)

        answer = result.get("result", "No answer returned.")
        console.print(
            Panel(
                answer,
                title="[bold]JudicialGPT Answer[/bold]",
                border_style="cyan",
            )
        )

        sources = result.get("source_documents", [])
        if sources:
            console.print(
                f"[dim]  ↳ {len(sources)} source chunk(s) retrieved[/dim]"
            )

        return answer


# ══════════════════════════════════════════════════════════════
#  CLI
# ══════════════════════════════════════════════════════════════
def main():
    import argparse

    parser = argparse.ArgumentParser(
        description="JudicialGPT — Legal Document RAG Summarizer",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python main.py summarize --file judgment.pdf
  python main.py summarize --file order.pdf --interactive
  python main.py ask --file judgment.pdf --question "What reliefs were granted?"
        """,
    )
    subparsers = parser.add_subparsers(dest="command")

    # summarize
    sp = subparsers.add_parser("summarize", help="Summarise a legal document")
    sp.add_argument("--file",        required=True,  help="Path to the legal document")
    sp.add_argument("--interactive", "-i", action="store_true",
                    help="Enter interactive QA mode after summarising")
    sp.add_argument("--no-save",     action="store_true",
                    help="Do not save output to disk")

    # ask
    ap = subparsers.add_parser("ask", help="Summarise then answer a question")
    ap.add_argument("--file",     required=True, help="Path to the legal document")
    ap.add_argument("--question", required=True, help="Question to answer")

    args = parser.parse_args()
    if args.command is None:
        parser.print_help()
        sys.exit(0)

    rag = LegalDocumentRAG()

    if args.command == "summarize":
        rag.summarize(args.file, save=not args.no_save)

        if args.interactive:
            console.rule("[bold magenta]Interactive QA Mode[/bold magenta]")
            console.print(
                "[dim]Type a question and press Enter.  "
                "Type [bold]exit[/bold] to stop.[/dim]\n"
            )
            while True:
                try:
                    q = input("Your question: ").strip()
                    if not q or q.lower() in ("exit", "quit"):
                        console.print("[yellow]Session ended.[/yellow]")
                        break
                    rag.ask(q)
                except KeyboardInterrupt:
                    console.print("\n[yellow]Session interrupted.[/yellow]")
                    break

    elif args.command == "ask":
        rag.summarize(args.file, save=False)
        rag.ask(args.question)


if __name__ == "__main__":
    main()