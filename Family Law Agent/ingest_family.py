"""
ingest_family.py — One-time PDF ingestion & FAISS index builder
==================================================================
Run this script once (or whenever you add new PDFs to /data_family):

    python ingest_family.py

It will:
  1. Load all PDFs from the /data_family folder
  2. Split them into smart legal chunks
  3. Create embeddings (locally, no API cost)
  4. Save the FAISS index to /vector_store_family/

After this, run rag_agent_family.py to start asking questions.

Drop the family-law statutes you have into data_family/, e.g.:
  • Muslim Family Laws Ordinance 1961.pdf
  • West Pakistan Family Courts Act 1964.pdf
  • Dissolution of Muslim Marriages Act 1939.pdf
  • Guardians and Wards Act 1890.pdf
  • Child Marriage Restraint Act 1929.pdf
  • Divorce Act 1869.pdf
  • Muslim Personal Law (Shariat) Application Act 1962.pdf
  • Majority Act 1875.pdf
  • Succession Act 1925 (family-relevant parts).pdf
  • Punjab/Sindh/KP Family Courts Rules.pdf
  • Nikahnama Rules.pdf

The filenames above are just examples — the loader picks up every
PDF in the folder regardless of name; _guess_statute_name() below
maps common filename keywords to a clean statute label for metadata.
"""

import os
import sys
import time
from pathlib import Path

from dotenv import load_dotenv

# ── LangChain v0.3+ imports ─────────────────────────────────────────
from langchain_community.document_loaders import PyPDFLoader, DirectoryLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS

from config_family import FamilyConfig

load_dotenv()


# ══════════════════════════════════════════════════════════════════
#  STEP 1: LOAD PDFS
# ══════════════════════════════════════════════════════════════════

def load_documents(data_dir: Path) -> list:
    """
    Load every PDF from the data_family/ folder recursively.
    Each page becomes a separate Document with metadata:
      {source: "path/to/file.pdf", page: 0}
    """
    pdf_files = list(data_dir.rglob("*.pdf"))

    if not pdf_files:
        print(f"❌  No PDF files found in '{data_dir}'")
        print("    Add the family-law statute PDFs there and re-run.")
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
    Tuned for common Pakistan family-law statute filenames.
    Add more `if` branches here as you add PDFs with different names.
    """
    f = filename.lower()

    # Muslim Family Laws Ordinance 1961
    if "muslim family law" in f or "mflo" in f:
        return "Muslim Family Laws Ordinance 1961"

    # West Pakistan Family Courts Act 1964
    if "family court" in f and "act" in f:
        return "West Pakistan Family Courts Act 1964"

    # Family Courts Rules (provincial)
    if "family court" in f and "rule" in f:
        return "Family Courts Rules"

    # Dissolution of Muslim Marriages Act 1939
    if "dissolution" in f and "marriage" in f:
        return "Dissolution of Muslim Marriages Act 1939"

    # Guardians and Wards Act 1890
    if "guardian" in f and "ward" in f:
        return "Guardians and Wards Act 1890"

    # Child Marriage Restraint Act 1929
    if "child marriage" in f:
        return "Child Marriage Restraint Act 1929"

    # Divorce Act 1869 (non-Muslim / Christian divorce)
    if "divorce act" in f:
        return "Divorce Act 1869"

    # Muslim Personal Law (Shariat) Application Act 1962
    if "shariat" in f or "personal law" in f:
        return "Muslim Personal Law (Shariat) Application Act 1962"

    # Majority Act 1875
    if "majority act" in f:
        return "Majority Act 1875"

    # Succession Act 1925
    if "succession" in f:
        return "Succession Act 1925"

    # Nikahnama / Nikah Registration Rules
    if "nikah" in f:
        return "Nikahnama / Nikah Registration Rules"

    # Qanun-e-Shahadat (often relevant for family court evidence)
    if "qanun" in f or "shahadat" in f or "evidence" in f:
        return "Qanun-e-Shahadat Order 1984"

    # Constitution (Articles on family/personal status rights)
    if "constitution" in f:
        return "Constitution of Pakistan 1973"

    # Hindu Marriage Act 2017 (Pakistan)
    if "hindu marriage" in f:
        return "Hindu Marriage Act 2017"

    # Christian Marriage Act 1872
    if "christian marriage" in f:
        return "Christian Marriage Act 1872"

    # Maintenance-related
    if "maintenance" in f:
        return "Maintenance / Nafaqa Provisions"

    # Khula / dower related
    if "khula" in f:
        return "Khula Provisions"

    if "dower" in f or "haq mehr" in f or "mehr" in f:
        return "Dower (Haq Mehr) Provisions"

    if "custody" in f or "hizanat" in f:
        return "Custody (Hizanat) Provisions"

    # Final fallback: prettify the filename
    return filename.replace("_", " ").replace("-", " ").title()


# ══════════════════════════════════════════════════════════════════
#  STEP 2: SMART LEGAL CHUNKING
# ══════════════════════════════════════════════════════════════════

def chunk_documents(documents: list, config: FamilyConfig) -> list:
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

def build_vector_store(chunks: list, config: FamilyConfig) -> FAISS:
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

def save_vector_store(vector_store: FAISS, config: FamilyConfig):
    save_path = Path(config.VECTOR_STORE_PATH)
    save_path.parent.mkdir(parents=True, exist_ok=True)

    vector_store.save_local(str(save_path))
    print(f"\n💾  FAISS index saved to: {save_path}")


# ══════════════════════════════════════════════════════════════════
#  INGESTION SUMMARY
# ══════════════════════════════════════════════════════════════════

def print_summary(documents: list, chunks: list, config: FamilyConfig):
    statutes = {}
    for doc in documents:
        statute = doc.metadata.get("statute", "Unknown")
        statutes[statute] = statutes.get(statute, 0) + 1

    print("\n" + "═" * 60)
    print("  INGESTION SUMMARY — FAMILY LAW")
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
    print("\n✅  Done! Run  python rag_agent_family.py  to start the agent.\n")


# ══════════════════════════════════════════════════════════════════
#  ENTRY POINT
# ══════════════════════════════════════════════════════════════════

def main():
    config = FamilyConfig()

    print("═" * 60)
    print("  PAKISTAN FAMILY LAW — RAG INGESTION PIPELINE")
    print("═" * 60)

    if not config.DATA_DIR.exists():
        config.DATA_DIR.mkdir(parents=True)
        print(f"\n📁  Created empty data_family/ folder at: {config.DATA_DIR}")
        print("    Add your PDF statutes there and re-run this script.")
        sys.exit(0)

    documents    = load_documents(config.DATA_DIR)
    chunks       = chunk_documents(documents, config)
    vector_store = build_vector_store(chunks, config)
    save_vector_store(vector_store, config)
    print_summary(documents, chunks, config)


if __name__ == "__main__":
    main()
