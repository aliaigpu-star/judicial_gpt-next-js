"""
ingest.py — One-time PDF ingestion & FAISS index builder
=========================================================
Run this script once (or whenever you add new PDFs to /data):

    python ingest.py

It will:
  1. Load all PDFs from the /data folder
  2. Split them into smart legal chunks
  3. Create embeddings (locally, no API cost)
  4. Save the FAISS index to /vector_store/

After this, run rag_agent.py to start asking questions.
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
from langchain_classic.indexes import SQLRecordManager, index

from config import Config

load_dotenv()


# ══════════════════════════════════════════════════════════════════
#  STEP 1: LOAD PDFS
# ══════════════════════════════════════════════════════════════════

def load_documents(data_dir: Path) -> list:
    """
    Load every PDF from the data/ folder recursively.
    Each page becomes a separate Document with metadata:
      {source: "path/to/file.pdf", page: 0}
    """
    pdf_files = list(data_dir.rglob("*.pdf"))

    if not pdf_files:
        print(f"❌  No PDF files found in '{data_dir}'")
        print("    Download the statutes listed in the report and place them there.")
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

            # Enrich metadata with cleaner source name
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
    """Map filename keywords → clean statute name for metadata."""
    filename = filename.lower()
    mapping = {
        "cpc":                    "Code of Civil Procedure 1908",
        "civil_procedure":        "Code of Civil Procedure 1908",
        "civil procedure":        "Code of Civil Procedure 1908",
        "contract":               "Contract Act 1872",
        "transfer":               "Transfer of Property Act 1882",
        "specific_relief":        "Specific Relief Act 1877",
        "specific relief":        "Specific Relief Act 1877",
        "qanun":                  "Qanun-e-Shahadat Order 1984",
        "shahadat":               "Qanun-e-Shahadat Order 1984",
        "evidence":               "Qanun-e-Shahadat Order 1984",
        "limitation":             "Limitation Act 1908",
        "guardian":               "Guardians and Wards Act 1890",
        "ward":                   "Guardians and Wards Act 1890",
        "family_court":           "West Pakistan Family Courts Act 1964",
        "family court":           "West Pakistan Family Courts Act 1964",
        "muslim_family":          "Muslim Family Laws Ordinance 1961",
        "muslim family":          "Muslim Family Laws Ordinance 1961",
        "dissolution":            "Dissolution of Muslim Marriages Act 1939",
        "easement":               "Easements Act 1882",
        "constitution":           "Constitution of Pakistan 1973",
        "registration":           "Registration Act 1908",
        "stamp":                  "Stamp Act 1899",
    }
    for key, value in mapping.items():
        if key in filename:
            return value
    return filename.replace("_", " ").replace("-", " ").title()


# ══════════════════════════════════════════════════════════════════
#  STEP 2: SMART LEGAL CHUNKING
# ══════════════════════════════════════════════════════════════════

def chunk_documents(documents: list, config: Config) -> list:
    """
    Split documents using RecursiveCharacterTextSplitter with
    legal-aware separators — tries to cut at section/clause
    boundaries before falling back to sentence/character splits.
    """
    print(f"\n✂️   Chunking documents...")
    print(f"    Chunk size: {config.CHUNK_SIZE} chars | Overlap: {config.CHUNK_OVERLAP} chars")

    # Legal-aware split hierarchy:
    # 1. Try to split at section breaks (e.g., "\n\n1.", "\n(a)")
    # 2. Fall back to paragraph → sentence → word → character
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

    # Filter out tiny chunks (less than 50 chars) — usually page numbers
    chunks = [c for c in chunks if len(c.page_content.strip()) > 50]

    print(f"    ✅ {len(chunks)} chunks created from {len(documents)} pages")
    return chunks


# ══════════════════════════════════════════════════════════════════
#  STEP 3: EMBED + INDEX → FAISS
# ══════════════════════════════════════════════════════════════════

def build_vector_store(chunks: list, config: Config) -> FAISS:
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

    # Process in batches to avoid memory issues with large corpora
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

def save_vector_store(vector_store: FAISS, config: Config):
    save_path = Path(config.VECTOR_STORE_PATH)
    save_path.parent.mkdir(parents=True, exist_ok=True)

    vector_store.save_local(str(save_path))
    print(f"\n💾  FAISS index saved to: {save_path}")


# ══════════════════════════════════════════════════════════════════
#  INGESTION SUMMARY
# ══════════════════════════════════════════════════════════════════

def print_summary(documents: list, chunks: list, config: Config):
    statutes = {}
    for doc in documents:
        statute = doc.metadata.get("statute", "Unknown")
        statutes[statute] = statutes.get(statute, 0) + 1

    print("\n" + "═" * 60)
    print("  INGESTION SUMMARY")
    print("═" * 60)
    print(f"  Total pages  : {len(documents)}")
    print(f"  Total chunks : {len(chunks)}")
    print(f"  Chunk size   : {config.CHUNK_SIZE} chars (overlap: {config.CHUNK_OVERLAP})")
    print(f"  Embeddings   : {config.EMBEDDING_MODEL}")
    print(f"  Vector store : {config.VECTOR_STORE_PATH}")
    print()
    print("  Statutes indexed:")
    for statute, pages in sorted(statutes.items()):
        print(f"    • {statute:<45} ({pages} pages)")
    print("═" * 60)
    print("\n✅  Done! Run  python rag_agent.py  to start the agent.\n")


# ══════════════════════════════════════════════════════════════════
#  ENTRY POINT
# ══════════════════════════════════════════════════════════════════

def main():
    config = Config()

    print("═" * 60)
    print("  PAKISTAN CIVIL LAW — RAG INGESTION PIPELINE")
    print("═" * 60)

    # Ensure data directory exists
    if not config.DATA_DIR.exists():
        config.DATA_DIR.mkdir(parents=True)
        print(f"\n📁  Created empty data/ folder at: {config.DATA_DIR}")
        print("    Add your PDF files there and re-run this script.")
        sys.exit(0)

    # Step 1: Load
    documents = load_documents(config.DATA_DIR)

    # Step 2: Chunk
    chunks = chunk_documents(documents, config)

    # Step 3: Embed + Index
    vector_store = build_vector_store(chunks, config)

    # Step 4: Save
    save_vector_store(vector_store, config)

    # Summary
    print_summary(documents, chunks, config)


if __name__ == "__main__":
    main()
