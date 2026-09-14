"""
====================================================================
  api_family.py — FastAPI server for JudicialGPT Family Law Agent
====================================================================
Run with:

    uvicorn api_family:app --host 0.0.0.0 --port 7007 --reload

Endpoints:
  GET  /health                        → liveness check
  POST /ask                           → ask a judicial question
  POST /sessions/{session_id}/clear   → clear a session's memory
  GET  /sessions                      → list active sessions
  DELETE /sessions/{session_id}       → delete a session entirely

The heavy agent (LLM, embeddings, FAISS index) is loaded ONCE at
startup and reused across requests — do not re-instantiate per call.
====================================================================
"""

import logging
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from rag_agent_family import JudicialGPTFamilyAgent

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("judicialgpt.family.api")


# ══════════════════════════════════════════════════════════════════
# LIFESPAN — load the agent once at startup, not per-request
# ══════════════════════════════════════════════════════════════════

agent: Optional[JudicialGPTFamilyAgent] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global agent
    logger.info("Loading JudicialGPT Family Law Agent (LLM + embeddings + FAISS)...")
    agent = JudicialGPTFamilyAgent()
    logger.info("JudicialGPT Family Law Agent loaded and ready.")
    yield
    logger.info("Shutting down JudicialGPT Family Law API.")


app = FastAPI(
    title="JudicialGPT — Family Law API",
    description="RAG-backed API for Pakistan family law legal research and judgment drafting.",
    version="1.0.0",
    lifespan=lifespan,
)

# Adjust allow_origins for production — "*" is fine for local dev only.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ══════════════════════════════════════════════════════════════════
# SCHEMAS
# ══════════════════════════════════════════════════════════════════

class AskRequest(BaseModel):
    query: str = Field(..., min_length=1, description="The judge's question or instruction.")
    session_id: str = Field(
        default="default",
        description="Unique ID per judge/case. Different IDs = isolated conversations.",
    )


class SourceDoc(BaseModel):
    file: str
    page: str | int
    snippet: str


class AskResponse(BaseModel):
    answer: str
    sources: list[SourceDoc]
    session_id: str


class SessionInfo(BaseModel):
    session_id: str
    exchanges: int


class SessionListResponse(BaseModel):
    sessions: list[SessionInfo]


class ClearResponse(BaseModel):
    session_id: str
    status: str


class HealthResponse(BaseModel):
    status: str
    model: str


# ══════════════════════════════════════════════════════════════════
# HELPERS
# ══════════════════════════════════════════════════════════════════

def _get_agent() -> JudicialGPTFamilyAgent:
    if agent is None:
        raise HTTPException(status_code=503, detail="Agent is still initialising. Try again shortly.")
    return agent


# ══════════════════════════════════════════════════════════════════
# ROUTES
# ══════════════════════════════════════════════════════════════════

@app.get("/health", response_model=HealthResponse, tags=["system"])
def health():
    """Liveness/readiness check."""
    a = _get_agent()
    return HealthResponse(status="ok", model=a.config.GEMINI_MODEL)


@app.post("/ask", response_model=AskResponse, tags=["agent"])
def ask(payload: AskRequest):
    """
    Submit a judicial query to JudicialGPT Family Law Agent.

    Example:
        {
          "query": "What are the grounds for judicial dissolution of marriage
                     under the Dissolution of Muslim Marriages Act 1939?",
          "session_id": "case_2026_family_101"
        }
    """
    a = _get_agent()
    try:
        result = a.ask(payload.query, session_id=payload.session_id)
    except Exception as exc:
        logger.exception("Error while answering query")
        raise HTTPException(status_code=500, detail=f"Agent error: {exc}") from exc

    return AskResponse(
        answer=result["answer"],
        sources=[SourceDoc(**s) for s in result["sources"]],
        session_id=payload.session_id,
    )


@app.post("/sessions/{session_id}/clear", response_model=ClearResponse, tags=["sessions"])
def clear_session(session_id: str):
    """Clear conversation memory for a session (e.g. starting a new case)."""
    a = _get_agent()
    a.clear_session(session_id)
    return ClearResponse(session_id=session_id, status="cleared")


@app.delete("/sessions/{session_id}", response_model=ClearResponse, tags=["sessions"])
def delete_session(session_id: str):
    """Alias for clearing/removing a session entirely."""
    a = _get_agent()
    a.clear_session(session_id)
    return ClearResponse(session_id=session_id, status="deleted")


@app.get("/sessions", response_model=SessionListResponse, tags=["sessions"])
def list_sessions():
    """List all active in-memory sessions and how many exchanges each has."""
    a = _get_agent()
    sessions = [
        SessionInfo(session_id=sid, exchanges=len(h.messages) // 2)
        for sid, h in a._sessions.items()
    ]
    return SessionListResponse(sessions=sessions)


# ══════════════════════════════════════════════════════════════════
# LOCAL DEV ENTRY POINT
# ══════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api_family:app", host="0.0.0.0", port=7007, reload=True)
