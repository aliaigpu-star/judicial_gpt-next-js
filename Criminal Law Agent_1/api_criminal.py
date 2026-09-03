"""
# ══════════════════════════════════════════════════════════════════
# ENTRY POINT  —  run with:  python api_criminal.py
# or:  uvicorn api_criminal:app --host 0.0.0.0 --port 7006 --reload
# ══════════════════════════════════════════════════════════════════




====================================================================
  JudicialGPT — FastAPI Server (Criminal Law)
  Criminal Law RAG Agent  |  Pakistan Criminal Law Knowledge Base
====================================================================

Endpoints:
  POST  /query              — Ask a criminal law question (main endpoint)
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

from rag_agent_criminal import JudicialGPTCriminalAgent
from config_criminal import CriminalConfig


# ══════════════════════════════════════════════════════════════════
# PYDANTIC SCHEMAS  —  Request & Response models
# ══════════════════════════════════════════════════════════════════

class QueryRequest(BaseModel):
    query: str = Field(
        ...,
        min_length=3,
        max_length=4000,
        description="The judicial query or instruction for JudicialGPT Criminal.",
        examples=[
            "What are the essential elements of murder under Section 302 PPC?",
            "Draft findings on the charge of robbery under Section 392 PPC.",
            "What are the bail principles in a narcotics case under CNSA Section 9?",
            "Explain the admissibility of an extra-judicial confession.",
            "What is the difference between Hadd and Ta'zir in Hudood cases?",
        ],
    )
    session_id: Optional[str] = Field(
        default=None,
        description=(
            "Unique session identifier. Use the same ID to maintain conversation "
            "continuity across multiple requests (e.g. one criminal case = one session_id). "
            "If omitted, a new UUID is auto-generated per request (stateless mode)."
        ),
        examples=["sessions_cr_42_lahore", "judge_khan_session_1"],
    )

    class Config:
        json_schema_extra = {
            "example": {
                "query": "What are the essential elements of Section 302 PPC murder?",
                "session_id": "criminal_case_101",
            }
        }


class SourceDocument(BaseModel):
    file:    str     = Field(description="Source PDF filename")
    page:    str|int = Field(description="Page number within the source PDF")
    snippet: str     = Field(description="Relevant text excerpt from the source")


class QueryResponse(BaseModel):
    session_id:    str                  = Field(description="Session ID used for this request")
    query:         str                  = Field(description="The original query submitted")
    answer:        str                  = Field(description="JudicialGPT Criminal's response")
    sources:       list[SourceDocument] = Field(description="Statute pages retrieved as context")
    response_time: float                = Field(description="Response time in seconds")

    class Config:
        json_schema_extra = {
            "example": {
                "session_id":    "criminal_case_101",
                "query":         "What are the elements of Section 302 PPC?",
                "answer":        "Section 302 of the Pakistan Penal Code 1860 prescribes...",
                "sources": [
                    {
                        "file":    "pakistan_penal_code_1860.pdf",
                        "page":    "87",
                        "snippet": "Section 302 — Punishment of Qatl-i-Amd...",
                    }
                ],
                "response_time": 2.41,
            }
        }


class SessionClearRequest(BaseModel):
    session_id: str = Field(
        ...,
        description="The session ID whose conversation history should be cleared.",
        examples=["criminal_case_101"],
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
    status:      str
    agent_ready: bool
    model:       str
    embeddings:  str


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

agent: Optional[JudicialGPTCriminalAgent] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load the JudicialGPT Criminal agent at startup."""
    global agent
    print("\n[START]  JudicialGPT Criminal API starting up...")
    try:
        agent = JudicialGPTCriminalAgent()
        print("[OK]  Criminal Law Agent loaded and ready.\n")
    except FileNotFoundError as e:
        print(f"\n[ERROR]  STARTUP ERROR: {e}")
        print("    Run  python ingest_criminal.py  first, then restart the API.\n")
        agent = None
    yield
    print("\n[STOP]  JudicialGPT Criminal API shutting down.")


# ══════════════════════════════════════════════════════════════════
# FASTAPI APP
# ══════════════════════════════════════════════════════════════════

app = FastAPI(
    title="JudicialGPT — Criminal Law RAG API",
    description=(
        "**JudicialGPT Criminal** is an AI legal assistant exclusively designed for Judges "
        "presiding over criminal matters within the judicial system of Pakistan.\n\n"
        "It is powered by a RAG (Retrieval-Augmented Generation) pipeline built on "
        "the Pakistan criminal law corpus — including the PPC 1860, CrPC 1898, "
        "Qanun-e-Shahadat Order 1984, Anti-Terrorism Act 1997, Control of Narcotic "
        "Substances Act 1997, Hudood Ordinances 1979, Qisas & Diyat Ordinance 1990, "
        "Juvenile Justice System Act 2018, and all major criminal statutes of Pakistan.\n\n"
        "**Primary use cases:**\n"
        "- Criminal judgment drafting (charge-wise findings, appreciation of evidence)\n"
        "- Legal research on PPC offences, CrPC procedure, and special laws\n"
        "- Bail analysis (bailable/non-bailable, pre-arrest bail, cancellation)\n"
        "- Evidence appreciation (ocular, medical, forensic, confessional)\n"
        "- Sentence determination within statutory range\n"
        "- Hudood, Qisas, Ta'zir analysis\n\n"
        "> ⚠️ This API is for judicial research purposes only. "
        "Always apply independent judicial mind to AI-assisted output."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ───────────────────────────────────────────────────────────
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
            "error":  "Internal server error",
            "detail": str(exc),
            "path":   str(request.url),
        },
    )


# ── Agent readiness guard ─────────────────────────────────────────
def require_agent():
    if agent is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "JudicialGPT Criminal agent is not ready. "
                "The vector store may not have been built yet. "
                "Run  python ingest_criminal.py  then restart the API server."
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
    cfg = CriminalConfig()
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
    cfg = CriminalConfig()
    return InfoResponse(
        name="JudicialGPT Criminal Law RAG Agent",
        version="1.0.0",
        model=cfg.GROQ_MODEL,
        embeddings=cfg.EMBEDDING_MODEL,
        retriever_k=cfg.RETRIEVER_K,
        memory_window=cfg.MEMORY_WINDOW,
        description=(
            "Pakistan criminal law RAG agent covering PPC 1860, CrPC 1898, "
            "Qanun-e-Shahadat Order 1984, Anti-Terrorism Act 1997, CNSA 1997, "
            "Hudood Ordinances 1979, Qisas & Diyat Ordinance 1990, JJSA 2018, "
            "PECA 2016, and all major Pakistan criminal statutes."
        ),
    )


# ── Main query endpoint ───────────────────────────────────────────
@app.post(
    "/query",
    response_model=QueryResponse,
    tags=["JudicialGPT Criminal"],
    summary="Submit a criminal judicial query",
    status_code=status.HTTP_200_OK,
)
async def query(body: QueryRequest):
    """
    **Main endpoint.** Submit any criminal law query to JudicialGPT.

    The agent retrieves relevant sections from the Pakistan criminal law
    corpus and generates a grounded, cited legal response.

    **Session continuity:**
    Pass the same `session_id` across multiple requests to maintain
    conversation context (e.g. follow-up questions about the same case).
    Each unique `session_id` gets its own isolated conversation history.

    **Example queries:**
    - `"What are the essential elements of Section 302 PPC?"`
    - `"Draft findings on the charge of robbery with hurt."`
    - `"Explain bail principles in a narcotics case under CNSA."`
    - `"How should a dying declaration be evaluated?"`
    - `"What is the Ta'zir punishment for theft where Hadd is not applicable?"`
    - `"Draft a Section 342 CrPC statement template."`
    """
    ag = require_agent()

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
        sources=[
            SourceDocument(file=s["file"], page=str(s["page"]), snippet=s["snippet"])
            for s in result["sources"]
        ],
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
    Use this when a judge starts a new criminal case or wants to reset context.
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
# ENTRY POINT  —  run with:  python api_criminal.py
# or:  uvicorn api_criminal:app --host 0.0.0.0 --port 7006 --reload
# ══════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "api_criminal:app",
        host="0.0.0.0",
        port=7006,
        reload=True,        # set False in production
        log_level="info",
    )
