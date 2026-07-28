"""

python api.py




====================================================================
  JudicialGPT — FastAPI Server
  Civil Law RAG Agent  |  Pakistan Civil Law Knowledge Base
====================================================================

Endpoints:
  POST  /query              — Ask a legal question (main endpoint)
  POST  /session/clear      — Clear a session's conversation memory
  GET   /session/list       — List all active sessions
  GET   /health             — Health check
  GET   /info               — Agent configuration info
  GET   /docs               — Swagger UI (auto-generated)
  GET   /redoc              — ReDoc UI (auto-generated)
====================================================================
"""

import time
import uuid
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from rag_agent import JudicialGPTCivilAgent
from config import Config

# ══════════════════════════════════════════════════════════════════
# PYDANTIC SCHEMAS  —  Request & Response models
# ══════════════════════════════════════════════════════════════════

class QueryRequest(BaseModel):
    query: str = Field(
        ...,
        min_length=3,
        max_length=4000,
        description="The judicial query or instruction for JudicialGPT.",
        examples=[
            "What is the limitation period for filing a suit on a written contract?",
            "Draft Issue No. 1 on the plaintiff's title in a property suit.",
            "Explain burden of proof under Section 101 Qanun-e-Shahadat Order 1984.",
        ],
    )
    session_id: Optional[str] = Field(
        default=None,
        description=(
            "Unique session identifier. Use the same ID to maintain conversation "
            "continuity across multiple requests (e.g. one case = one session_id). "
            "If omitted, a new UUID is auto-generated per request (stateless mode)."
        ),
        examples=["civil_suit_42_lahore", "judge_ali_session_1"],
    )

    class Config:
        json_schema_extra = {
            "example": {
                "query": "What is the limitation period for filing a suit on a written contract?",
                "session_id": "civil_suit_42",
            }
        }


class SourceDocument(BaseModel):
    file:    str = Field(description="Source PDF filename")
    page:    str | int = Field(description="Page number within the source PDF")
    snippet: str = Field(description="Relevant text excerpt from the source")


class QueryResponse(BaseModel):
    session_id:    str                  = Field(description="Session ID used for this request")
    query:         str                  = Field(description="The original query submitted")
    answer:        str                  = Field(description="JudicialGPT's response")
    sources:       list[SourceDocument] = Field(description="Statute pages retrieved as context")
    response_time: float                = Field(description="Response time in seconds")

    class Config:
        json_schema_extra = {
            "example": {
                "session_id":    "civil_suit_42",
                "query":         "What is the limitation period for a written contract?",
                "answer":        "Under Article 37 of the Limitation Act, 1908...",
                "sources": [
                    {
                        "file":    "limitation_act_1908.pdf",
                        "page":    "12",
                        "snippet": "Article 37 — Suit on a contract in writing...",
                    }
                ],
                "response_time": 2.34,
            }
        }


class SessionClearRequest(BaseModel):
    session_id: str = Field(
        ...,
        description="The session ID whose conversation history should be cleared.",
        examples=["civil_suit_42"],
    )


class SessionClearResponse(BaseModel):
    session_id: str
    cleared:    bool
    message:    str


class SessionInfo(BaseModel):
    session_id: str
    exchanges:  int = Field(description="Number of Q&A exchanges in this session")


class SessionListResponse(BaseModel):
    total_sessions: int
    sessions:       list[SessionInfo]


class HealthResponse(BaseModel):
    status:     str
    agent_ready: bool
    model:      str
    embeddings: str


class InfoResponse(BaseModel):
    name:          str
    version:       str
    model:         str
    embeddings:    str
    retriever_k:   int
    memory_window: int
    description:   str


# ══════════════════════════════════════════════════════════════════
# LIFESPAN  —  load agent once at startup, release at shutdown
# ══════════════════════════════════════════════════════════════════

agent: Optional[JudicialGPTCivilAgent] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load the JudicialGPT agent at startup."""
    global agent
    print("\n[START]  JudicialGPT API starting up...")
    try:
        agent = JudicialGPTCivilAgent()
        print("[OK]  Agent loaded and ready.\n")
    except FileNotFoundError as e:
        print(f"\n[ERROR]  STARTUP ERROR: {e}")
        print("    Run  python ingest.py  first, then restart the API.\n")
        agent = None
    yield
    print("\n[STOP]  JudicialGPT API shutting down.")


# ══════════════════════════════════════════════════════════════════
# FASTAPI APP
# ══════════════════════════════════════════════════════════════════

app = FastAPI(
    title="JudicialGPT — Civil Law RAG API",
    description=(
        "**JudicialGPT** is an AI legal assistant exclusively designed for Judges "
        "within the judicial system of Pakistan.\n\n"
        "It is powered by a RAG (Retrieval-Augmented Generation) pipeline built on "
        "the Pakistan civil law corpus — including the CPC 1908, Contract Act 1872, "
        "Transfer of Property Act 1882, Specific Relief Act 1877, Qanun-e-Shahadat "
        "Order 1984, Limitation Act 1908, and all major family law statutes.\n\n"
        "**Primary use cases:**\n"
        "- Civil judgment drafting (Order XX Rule 4 CPC format)\n"
        "- Legal research on Pakistani statutes\n"
        "- Framing of issues, evidence analysis, precedent citation\n\n"
        "> ⚠️ This API is for judicial research purposes only. "
        "Always apply independent judicial mind to AI-assisted output."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS (adjust origins for production) ──────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       # restrict to your frontend domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Global error handler ──────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "error":   "Internal server error",
            "detail":  str(exc),
            "path":    str(request.url),
        },
    )


# ── Agent readiness guard ─────────────────────────────────────────
def require_agent():
    if agent is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "JudicialGPT agent is not ready. "
                "The vector store may not have been built yet. "
                "Run  python ingest.py  then restart the API server."
            ),
        )
    return agent


# ══════════════════════════════════════════════════════════════════
# ROUTES
# ══════════════════════════════════════════════════════════════════

# ── Health check ──────────────────────────────────────────────────
@app.get(
    "/health",
    response_model=HealthResponse,
    tags=["System"],
    summary="Health check",
)
async def health():
    """Returns API and agent status. Use this to verify the server is running."""
    cfg = Config()
    return HealthResponse(
        status="ok" if agent else "degraded",
        agent_ready=agent is not None,
        model=cfg.GROQ_MODEL,
        embeddings=cfg.EMBEDDING_MODEL,
    )


# ── Agent info ────────────────────────────────────────────────────
@app.get(
    "/info",
    response_model=InfoResponse,
    tags=["System"],
    summary="Agent configuration",
)
async def info():
    """Returns current agent configuration — model, embeddings, retriever settings."""
    cfg = Config()
    return InfoResponse(
        name="JudicialGPT Civil Law RAG Agent",
        version="1.0.0",
        model=cfg.GROQ_MODEL,
        embeddings=cfg.EMBEDDING_MODEL,
        retriever_k=cfg.RETRIEVER_K,
        memory_window=cfg.MEMORY_WINDOW,
        description=(
            "Pakistan civil law RAG agent trained on CPC 1908, Contract Act 1872, "
            "Transfer of Property Act 1882, Specific Relief Act 1877, "
            "Qanun-e-Shahadat Order 1984, Limitation Act 1908, and family law statutes."
        ),
    )


# ── Main query endpoint ───────────────────────────────────────────
@app.post(
    "/query",
    response_model=QueryResponse,
    tags=["JudicialGPT"],
    summary="Submit a judicial query",
    status_code=status.HTTP_200_OK,
)
async def query(body: QueryRequest):
    """
    **Main endpoint.** Submit any judicial query to JudicialGPT.

    The agent retrieves relevant sections from the Pakistan civil law
    corpus and generates a grounded, cited legal response.

    **Session continuity:**
    Pass the same `session_id` across multiple requests to maintain
    conversation context (e.g. follow-up questions about the same case).
    Each unique `session_id` gets its own isolated conversation history.

    **Example queries:**
    - `"What is the limitation period for a suit on a written contract?"`
    - `"Draft Issue No. 1 on plaintiff's title in a property suit."`
    - `"Explain res judicata under Order 9 Rule 9 CPC."`
    - `"What are the essentials of a valid mortgage under the TPA?"`
    """
    ag = require_agent()

    # Auto-generate session_id if not provided
    session_id = body.session_id or str(uuid.uuid4())

    start = time.perf_counter()
    try:
        result = ag.ask(body.query, session_id=session_id)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Agent error: {str(exc)}",
        )
    elapsed = round(time.perf_counter() - start, 3)

    return QueryResponse(
        session_id=session_id,
        query=body.query,
        answer=result["answer"],
        sources=[SourceDocument(file=s["file"], page=str(s["page"]), snippet=s["snippet"]) for s in result["sources"]],
        response_time=elapsed,
    )


# ── Clear a session ───────────────────────────────────────────────
@app.post(
    "/session/clear",
    response_model=SessionClearResponse,
    tags=["Sessions"],
    summary="Clear session memory",
)
async def clear_session(body: SessionClearRequest):
    """
    Clears the conversation history for the given `session_id`.
    Use this when a judge starts a new case or wants to reset context.
    """
    ag = require_agent()
    ag.clear_session(body.session_id)
    return SessionClearResponse(
        session_id=body.session_id,
        cleared=True,
        message=f"Session '{body.session_id}' has been cleared. Ready for a new case.",
    )


# ── List sessions ─────────────────────────────────────────────────
@app.get(
    "/session/list",
    response_model=SessionListResponse,
    tags=["Sessions"],
    summary="List active sessions",
)
async def list_sessions():
    """
    Returns all currently active session IDs and the number of
    Q&A exchanges stored in each one.
    """
    ag = require_agent()
    sessions = [
        SessionInfo(
            session_id=sid,
            exchanges=len(h.messages) // 2,
        )
        for sid, h in ag._sessions.items()
    ]
    return SessionListResponse(
        total_sessions=len(sessions),
        sessions=sessions,
    )


# ══════════════════════════════════════════════════════════════════
# ENTRY POINT  —  run with:  python api.py
# or:  uvicorn api:app --host 0.0.0.0 --port 7005 --reload
# ══════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "api:app",
        host="0.0.0.0",
        port=7005,
        reload=True,       # set False in production
        log_level="info",
    )