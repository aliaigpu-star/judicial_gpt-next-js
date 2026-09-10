"""
diagnose_retrieval.py — Standalone retrieval diagnostic
=========================================================
Checks what your FAISS index actually returns for a query,
completely bypassing the LLM (no GOOGLE_API_KEY needed).

Use this to answer: "Is the right chunk even in the index,
and is the retriever surfacing it?"

Run with:
    python diagnose_retrieval.py "your query here"

If no query is given, a default limitation-period query is used.
"""

import sys
from pathlib import Path

from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS

from config import Config


def load_vector_store(config: Config) -> FAISS:
    path = config.VECTOR_STORE_PATH
    if not Path(path).exists():
        print(f"❌  Vector store not found at: {path}")
        print("    Run  python ingest.py  first.")
        sys.exit(1)

    print(f"🔢  Loading embedding model: {config.EMBEDDING_MODEL}")
    embeddings = HuggingFaceEmbeddings(
        model_name=config.EMBEDDING_MODEL,
        model_kwargs={"device": "cpu"},
        encode_kwargs={"normalize_embeddings": True},
    )

    print(f"📂  Loading vector store: {path}\n")
    return FAISS.load_local(
        path, embeddings,
        allow_dangerous_deserialization=True,
    )


def show_results(label: str, docs: list):
    print(f"── {label}  ({len(docs)} result(s)) " + "─" * 40)
    if not docs:
        print("   (none)")
    for i, d in enumerate(docs, 1):
        fname = Path(d.metadata.get("source", "Unknown")).name
        page  = d.metadata.get("page", "N/A")
        snippet = d.page_content[:220].replace("\n", " ")
        print(f"   {i}. {fname}  (page {page})")
        print(f"      {snippet}...")
    print()


def main():
    query = " ".join(sys.argv[1:]) or \
        "What is the limitation period for filing a suit on a written contract?"

    print(f"🔍  Query: {query}\n")

    config = Config()
    vs = load_vector_store(config)

    # ── Plain similarity search (pure relevance, no diversity trade-off) ──
    sim_docs = vs.similarity_search(query, k=10)
    show_results("Similarity search (k=10)", sim_docs)

    # ── Similarity search with scores, so you can see how close/far matches are ──
    print("── Similarity scores (lower = closer, FAISS L2 distance) " + "─" * 10)
    for doc, score in vs.similarity_search_with_score(query, k=10):
        fname = Path(doc.metadata.get("source", "Unknown")).name
        page  = doc.metadata.get("page", "N/A")
        print(f"   score={score:.4f}  {fname}  (page {page})")
    print()

    # ── Current app config: MMR with lambda_mult=0.6 ──
    mmr_current = vs.max_marginal_relevance_search(
        query, k=config.RETRIEVER_K, fetch_k=config.RETRIEVER_FETCH_K, lambda_mult=0.6
    )
    show_results(f"MMR search — current config (k={config.RETRIEVER_K}, lambda_mult=0.6)", mmr_current)

    # ── MMR with relevance weighted much higher, for comparison ──
    mmr_relevance_heavy = vs.max_marginal_relevance_search(
        query, k=config.RETRIEVER_K, fetch_k=config.RETRIEVER_FETCH_K, lambda_mult=0.9
    )
    show_results(f"MMR search — relevance-heavy (k={config.RETRIEVER_K}, lambda_mult=0.9)", mmr_relevance_heavy)

    print("=" * 70)
    print("If the article you expect (e.g. Limitation Act Schedule entry for")
    print("suits on a written contract) does NOT appear in the plain similarity")
    print("search above, it's an indexing/chunking problem — check how that PDF")
    print("was chunked in ingest.py. If it DOES appear there but not in the MMR")
    print("results, the retriever's diversity setting is filtering it out.")
    print("=" * 70)


if __name__ == "__main__":
    main()