"""
config.py — Centralised settings for Pakistan Civil Law RAG Agent
Edit this file to tune the agent without touching any other file.
"""

from pathlib import Path


class Config:

    # ── Paths ──────────────────────────────────────────────────────
    BASE_DIR          = Path(__file__).parent
    DATA_DIR          = BASE_DIR / "data"           # Put your PDFs here
    VECTOR_STORE_PATH = str(BASE_DIR / "vector_store" / "faiss_index")

    # ── Google Gemini LLM ────────────────────────────────────────────
    GEMINI_MODEL = "gemini-3.6-flash"
    TEMPERATURE  = 0.1      # Low = more factual (good for legal)
    MAX_TOKENS   = 15000     # Max response length

    # ── Embeddings (local HuggingFace, no API key needed) ─────────
    # "BAAI/bge-base-en-v1.5"  ← Best balance of quality & speed
    # "all-MiniLM-L6-v2"       ← Fastest, slightly lower quality
    EMBEDDING_MODEL = "BAAI/bge-base-en-v1.5"

    # ── Text Chunking ──────────────────────────────────────────────
    # Legal text tip: larger chunks preserve full sections/clauses
    CHUNK_SIZE    = 1200    # Characters per chunk
    CHUNK_OVERLAP = 200     # Overlap to prevent cutting mid-section

    # ── Retriever ──────────────────────────────────────────────────
    RETRIEVER_K       = 6   # Final chunks returned to LLM
    RETRIEVER_FETCH_K = 15  # Candidates fetched before MMR filtering

    # ── Memory ────────────────────────────────────────────────────
    MEMORY_WINDOW = 5       # Number of past Q&A pairs to remember