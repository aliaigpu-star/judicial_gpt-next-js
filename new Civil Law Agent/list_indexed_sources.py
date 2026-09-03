"""
list_indexed_sources.py — What's actually inside the FAISS index?
====================================================================
Lists every unique source PDF in the vector store, how many chunks
came from it, and — for a given keyword — shows any chunk whose
content mentions it (useful for finding scattered/mangled matches
that similarity search ranked too low to surface).

Run with:
    python list_indexed_sources.py
    python list_indexed_sources.py "written contract"
"""

import sys
from collections import Counter
from pathlib import Path

from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS

from config import Config


def load_vector_store(config: Config) -> FAISS:
    path = config.VECTOR_STORE_PATH
    if not Path(path).exists():
        print(f"❌  Vector store not found at: {path}")
        sys.exit(1)

    embeddings = HuggingFaceEmbeddings(
        model_name=config.EMBEDDING_MODEL,
        model_kwargs={"device": "cpu"},
        encode_kwargs={"normalize_embeddings": True},
    )
    return FAISS.load_local(
        path, embeddings,
        allow_dangerous_deserialization=True,
    )


def main():
    keyword = " ".join(sys.argv[1:]).lower()

    config = Config()
    vs = load_vector_store(config)

    # Pull every document out of the FAISS docstore directly
    all_docs = list(vs.docstore._dict.values())
    print(f"📦  Total chunks in index: {len(all_docs)}\n")

    # ── Unique source files + chunk counts ──────────────────────────
    counts = Counter(
        Path(d.metadata.get("source", "Unknown")).name for d in all_docs
    )
    print("── Indexed source files ─────────────────────────────────")
    for fname, n in sorted(counts.items()):
        print(f"   {n:4d} chunks   {fname}")
    print()

    if "limitation" not in " ".join(counts.keys()).lower():
        print("⚠️   No file with 'Limitation' in its name was found in the index.")
        print("     Check whether the Limitation Act PDF is actually in /data,")
        print("     and whether ingest.py logged it as loaded successfully.\n")

    # ── Keyword scan across raw chunk text (not embedding-based) ────
    if keyword:
        print(f"── Chunks whose raw text contains \"{keyword}\" ─────────────")
        hits = [d for d in all_docs if keyword in d.page_content.lower()]
        print(f"   {len(hits)} match(es)\n")
        for d in hits[:15]:
            fname = Path(d.metadata.get("source", "Unknown")).name
            page  = d.metadata.get("page", "N/A")
            snippet = d.page_content[:250].replace("\n", " ")
            print(f"   • {fname}  (page {page})")
            print(f"     {snippet}...\n")


if __name__ == "__main__":
    main()