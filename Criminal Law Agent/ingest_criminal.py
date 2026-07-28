"""
ingest_criminal.py — One-time PDF ingestion & FAISS index builder
==================================================================
Run this script once (or whenever you add new PDFs to /data_criminal):

    python ingest_criminal.py

It will:
  1. Load all PDFs from the /data_criminal folder
  2. Split them into smart legal chunks
  3. Create embeddings (locally, no API cost)
  4. Save the FAISS index to /vector_store_criminal/

After this, run rag_agent_criminal.py to start asking questions.

PDFs currently in your data/ folder:
  • Anti-Terrorism-Act-1997-Complete.pdf
  • Code_of_criminal_procedure_1898.pdf
  • Control of Narcotic Substances Act.pdf
  • hlacnsa1997.pdf
  • JUVENILE JUSTICE SYSTEM ACT, 2018.pdf
  • NAB 2013.pdf
  • nab_ord_1999.pdf
  • Offence of Qazf (Enforcement of Hadd) Ordinance.pdf
  • PAKISTAN PENAL CODE.pdf
  • PPC.pdf
  • RULES OF PROCEDURE AND CONDUCT OF BUSINESS.pdf
  • THE OFFENCE OF ZINA (ENFORCEMENT OF HUDOOD).pdf
  • THE OFFENCES AGAINST PROPERTY (ENFORCEMENT OF HUDOOD).pdf
  • THE OFFENCES AGAINST PROPERTY.pdf
  • The Offences of Zina (Enforcement of Hudood).pdf
  • The Prevention Of Corruption Act.pdf
  • THE PROHIBITION (ENFORCEMENT OF HADD).pdf
  • THE_PREVENTION_OF_CORRUPTION_ACT_1947.pdf
  • Updated_NAO_1999_Sept24.pdf
"""

import os
import sys
import time
from pathlib import Path

from dotenv import load_dotenv

# ── LangChain v0.3 imports ─────────────────────────────────────────
from langchain_community.document_loaders import PyPDFLoader, DirectoryLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS

from config_criminal import CriminalConfig

load_dotenv()


# ══════════════════════════════════════════════════════════════════
#  STEP 1: LOAD PDFS
# ══════════════════════════════════════════════════════════════════

def load_documents(data_dir: Path) -> list:
    """
    Load every PDF from the data_criminal/ folder recursively.
    Each page becomes a separate Document with metadata:
      {source: "path/to/file.pdf", page: 0}
    """
    pdf_files = list(data_dir.rglob("*.pdf"))

    if not pdf_files:
        print(f"❌  No PDF files found in '{data_dir}'")
        print("    Download the statutes listed in the docstring and place them there.")
        sys.exit(1)

    print(f"📂  Found {len(pdf_files)} PDF file(s):")
    for f in pdf_files:
        size_kb = f.stat().st_size // 1024
        print(f"    • {f.name}  ({size_kb} KB)")

    print("\n📖  Loading and extracting text from PDFs...")

    all_docs = []
    failed   = []

    for pdf_path in pdf_files:
        try:
            loader = PyPDFLoader(str(pdf_path))
            pages  = loader.load()

            for page in pages:
                page.metadata["source"]    = str(pdf_path)
                page.metadata["file_name"] = pdf_path.name
                page.metadata["statute"]   = _guess_statute_name(pdf_path.name)

            all_docs.extend(pages)
            print(f"    ✅ {pdf_path.name}  → {len(pages)} pages")

        except Exception as exc:
            failed.append((pdf_path.name, str(exc)))
            print(f"    ⚠️  {pdf_path.name}  → FAILED: {exc}")

    if failed:
        print(f"\n⚠️  {len(failed)} file(s) failed to load (skipped).")

    print(f"\n✅  Total pages loaded: {len(all_docs)}")
    return all_docs


def _guess_statute_name(filename: str) -> str:
    """Map filename keywords → clean statute name for metadata.
    Tuned to the exact filenames in your data/ folder.
    """
    f = filename.lower()

    # ── Exact / near-exact filename matches (your data/ folder) ───
    # administrator01031a2c8... → likely a CrPC/court rules download
    if f.startswith("administrator"):
        return "Court Rules / Administrative Document"

    # Anti-Terrorism-Act-1997-Complete
    if "anti-terrorism" in f or "anti_terrorism" in f:
        return "Anti-Terrorism Act 1997"

    # CCP  (Code of Civil Procedure — if present, ignore for criminal)
    if f == "ccp.pdf" or f == "ccp":
        return "Code of Civil Procedure 1908"

    # Code_of_criminal_procedure_1898
    if "criminal_procedure" in f or "criminal procedure" in f or "crpc" in f:
        return "Code of Criminal Procedure 1898"

    # Control of Narcotic Substances Act
    if "narcotic" in f:
        return "Control of Narcotic Substances Act 1997"

    # hlacnsa1997  → High Level ATA/CNSA combo document
    if "hlacnsa" in f:
        return "Control of Narcotic Substances Act 1997 (HL)"

    # JUVENILE JUSTICE SYSTEM ACT, 2018
    if "juvenile" in f:
        return "Juvenile Justice System Act 2018"

    # LIB-18-000002  → likely a judicial library gazette / misc
    if f.startswith("lib-"):
        return "Judicial Library Document"

    # NAB 2013
    if f == "nab 2013" or f == "nab 2013.pdf" or f == "nab2013":
        return "National Accountability Bureau Amendments 2013"

    # nab_ord_1999
    if "nab_ord" in f or "nab ord" in f:
        return "National Accountability Ordinance 1999"

    # Updated_NAO_1999_Sept24
    if "nao" in f or "updated_nao" in f:
        return "National Accountability Ordinance 1999 (Updated)"

    # Offence of Qazf (Enforcement of Hadd) Ordinance
    if "qazf" in f:
        return "Offence of Qazf (Enforcement of Hadd) Ordinance 1979"

    # PAKISTAN PENAL CODE  /  PPC
    if "pakistan penal" in f or f.startswith("ppc") or f == "ppc.pdf":
        return "Pakistan Penal Code 1860"

    # RULES OF PROCEDURE AND CONDUCT OF BUSINESS
    if "rules of procedure" in f or "conduct of bu" in f:
        return "Rules of Procedure and Conduct of Business"

    # THE OFFENCE OF ZINA (ENFORCEMENT OF HUDOOD)
    if "zina" in f:
        return "The Offence of Zina (Enforcement of Hudood) Ordinance 1979"

    # THE OFFENCES AGAINST PROPERTY (ENFORCEMENT OF HUDOOD)
    # THE OFFENCES AGAINST PROPERTY
    if "offences against property" in f or "offence against property" in f:
        return "The Offences Against Property (Enforcement of Hudood) Ordinance 1979"

    # The Prevention Of Corruption Act  /  THE_PREVENTION_OF_CORRUPTION_ACT_1947
    if "corruption" in f or "prevention of corruption" in f:
        return "The Prevention of Corruption Act 1947"

    # THE PROHIBITION (ENFORCEMENT OF HADD)
    if "prohibition" in f and "hadd" in f:
        return "The Prohibition (Enforcement of Hadd) Order 1979"

    # ── Generic fallback keywords ──────────────────────────────────
    if "qanun" in f or "shahadat" in f or "evidence" in f:
        return "Qanun-e-Shahadat Order 1984"
    if "constitution" in f:
        return "Constitution of Pakistan 1973"
    if "peca" in f or "electronic crime" in f or "electronic_crime" in f:
        return "Prevention of Electronic Crimes Act 2016"
    if "juvenile" in f or "child" in f:
        return "Juvenile Justice System Act 2018"
    if "money launder" in f or "money_launder" in f or "aml" in f:
        return "Anti-Money Laundering Act 2010"
    if "arms" in f:
        return "Arms Act 1878"
    if "explosive" in f:
        return "Explosive Substances Act 1908"
    if "prison" in f:
        return "Prisons Act 1894"
    if "probation" in f:
        return "Probation of Offenders Ordinance 1960"

    # Final fallback: prettify the filename
    return filename.replace("_", " ").replace("-", " ").title()


# ══════════════════════════════════════════════════════════════════
#  STEP 2: SMART LEGAL CHUNKING
# ══════════════════════════════════════════════════════════════════

def chunk_documents(documents: list, config: CriminalConfig) -> list:
    """
    Split documents using RecursiveCharacterTextSplitter with
    legal-aware separators — tries to cut at section/clause
    boundaries before falling back to sentence/character splits.
    """
    print(f"\n✂️   Chunking documents...")
    print(f"    Chunk size: {config.CHUNK_SIZE} chars | Overlap: {config.CHUNK_OVERLAP} chars")

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=config.CHUNK_SIZE,
        chunk_overlap=config.CHUNK_OVERLAP,
        separators=[
            "\n\n\n",     # Major section breaks
            "\n\n",       # Paragraph breaks
            "\n",         # Line breaks
            "(?<=\\.)",   # Sentence boundaries (after full-stop)
            " ",
            "",
        ],
        length_function=len,
        is_separator_regex=False,
    )

    chunks = splitter.split_documents(documents)

    # Filter out tiny chunks (less than 50 chars) — usually page numbers / headers
    chunks = [c for c in chunks if len(c.page_content.strip()) > 50]

    print(f"    ✅ {len(chunks)} chunks created from {len(documents)} pages")
    return chunks


# ══════════════════════════════════════════════════════════════════
#  STEP 3: EMBED + INDEX → FAISS
# ══════════════════════════════════════════════════════════════════

def build_vector_store(chunks: list, config: CriminalConfig) -> FAISS:
    """
    Create embeddings with a local HuggingFace model (free, no API)
    and save a FAISS index to disk.
    """
    print(f"\n🔢  Loading embedding model: {config.EMBEDDING_MODEL}")
    print("    (First run downloads ~400 MB — subsequent runs use cache)")

    embeddings = HuggingFaceEmbeddings(
        model_name=config.EMBEDDING_MODEL,
        model_kwargs={"device": "cpu"},
        encode_kwargs={"normalize_embeddings": True},
    )

    print(f"\n🏗️   Building FAISS index for {len(chunks)} chunks...")
    print("    This may take a few minutes on first run...")

    start = time.time()

    BATCH_SIZE = 100
    batches    = [chunks[i:i + BATCH_SIZE] for i in range(0, len(chunks), BATCH_SIZE)]

    print(f"    Processing {len(batches)} batch(es) of {BATCH_SIZE} chunks...")

    vector_store = None
    for i, batch in enumerate(batches, 1):
        print(f"    Batch {i}/{len(batches)}...", end="\r")
        if vector_store is None:
            vector_store = FAISS.from_documents(batch, embeddings)
        else:
            batch_vs = FAISS.from_documents(batch, embeddings)
            vector_store.merge_from(batch_vs)

    elapsed = time.time() - start
    print(f"\n    ✅ Indexing complete in {elapsed:.1f}s")
    return vector_store


# ══════════════════════════════════════════════════════════════════
#  STEP 4: SAVE INDEX
# ══════════════════════════════════════════════════════════════════

def save_vector_store(vector_store: FAISS, config: CriminalConfig):
    save_path = Path(config.VECTOR_STORE_PATH)
    save_path.parent.mkdir(parents=True, exist_ok=True)

    vector_store.save_local(str(save_path))
    print(f"\n💾  FAISS index saved to: {save_path}")


# ══════════════════════════════════════════════════════════════════
#  INGESTION SUMMARY
# ══════════════════════════════════════════════════════════════════

def print_summary(documents: list, chunks: list, config: CriminalConfig):
    statutes = {}
    for doc in documents:
        statute = doc.metadata.get("statute", "Unknown")
        statutes[statute] = statutes.get(statute, 0) + 1

    print("\n" + "═" * 60)
    print("  INGESTION SUMMARY — CRIMINAL LAW")
    print("═" * 60)
    print(f"  Total pages  : {len(documents)}")
    print(f"  Total chunks : {len(chunks)}")
    print(f"  Chunk size   : {config.CHUNK_SIZE} chars (overlap: {config.CHUNK_OVERLAP})")
    print(f"  Embeddings   : {config.EMBEDDING_MODEL}")
    print(f"  Vector store : {config.VECTOR_STORE_PATH}")
    print()
    print("  Statutes indexed:")
    for statute, pages in sorted(statutes.items()):
        print(f"    • {statute:<50} ({pages} pages)")
    print("═" * 60)
    print("\n✅  Done! Run  python rag_agent_criminal.py  to start the agent.\n")


# ══════════════════════════════════════════════════════════════════
#  ENTRY POINT
# ══════════════════════════════════════════════════════════════════

def main():
    config = CriminalConfig()

    print("═" * 60)
    print("  PAKISTAN CRIMINAL LAW — RAG INGESTION PIPELINE")
    print("═" * 60)

    if not config.DATA_DIR.exists():
        config.DATA_DIR.mkdir(parents=True)
        print(f"\n📁  Created empty data/ folder at: {config.DATA_DIR}")
        print("    Add your PDF statutes there and re-run this script.")
        sys.exit(0)

    documents    = load_documents(config.DATA_DIR)
    chunks       = chunk_documents(documents, config)
    vector_store = build_vector_store(chunks, config)
    save_vector_store(vector_store, config)
    print_summary(documents, chunks, config)


if __name__ == "__main__":
    main()