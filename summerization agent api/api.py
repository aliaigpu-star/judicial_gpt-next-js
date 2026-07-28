# ============================================================
#  api.py  —  JudicialGPT FastAPI Server
#  Wraps the LegalDocumentRAG pipeline for frontend integration
#
#  Endpoints:
#    POST  /summarize          Upload a file → returns job_id
#    GET   /jobs/{job_id}      Poll job status + summary when ready
#    POST  /ask                Ask a question against a loaded document
#    GET   /health             Health check
#
#  Run:
#    uvicorn api:app --reload --port 7002
# ============================================================

import os
import uuid
import time
import tempfile
import asyncio
import logging
from enum import Enum
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
load_dotenv(override=True)

from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ── Local imports ──────────────────────────────────────────
from main import LegalDocumentRAG, Config

# ── Logging ────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("JudicialGPT-API")

# ══════════════════════════════════════════════════════════
#  FASTAPI APP
# ══════════════════════════════════════════════════════════
app = FastAPI(
    title="JudicialGPT API",
    description=(
        "REST API for JudicialGPT — an AI-powered legal document "
        "summarization and question-answering system for the judiciary."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Allow all origins during development — tighten this in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ══════════════════════════════════════════════════════════
#  IN-MEMORY STATE
#  For production, replace with Redis + persistent storage.
# ══════════════════════════════════════════════════════════

class JobStatus(str, Enum):
    PENDING    = "pending"
    PROCESSING = "processing"
    DONE       = "done"
    FAILED     = "failed"


class JobRecord:
    """Holds everything associated with one summarization job."""

    def __init__(self, job_id: str, filename: str):
        self.job_id: str         = job_id
        self.filename: str       = filename
        self.status: JobStatus   = JobStatus.PENDING
        self.summary: str        = ""
        self.error: str          = ""
        self.created_at: float   = time.time()
        self.completed_at: float = 0.0
        self.rag: Optional[LegalDocumentRAG] = None   # kept alive for /ask


# job_id → JobRecord
_jobs: dict[str, JobRecord] = {}

# ══════════════════════════════════════════════════════════
#  PYDANTIC SCHEMAS
# ══════════════════════════════════════════════════════════

class SummarizeResponse(BaseModel):
    job_id: str
    message: str
    filename: str


class JobStatusResponse(BaseModel):
    job_id: str
    filename: str
    status: JobStatus
    summary: Optional[str]   = None
    error: Optional[str]     = None
    created_at: float
    completed_at: Optional[float] = None


class AskRequest(BaseModel):
    job_id: str
    question: str


class AskResponse(BaseModel):
    job_id: str
    question: str
    answer: str


class HealthResponse(BaseModel):
    status: str
    version: str


# ══════════════════════════════════════════════════════════
#  BACKGROUND TASK — runs the full RAG pipeline
# ══════════════════════════════════════════════════════════

def _run_summarization(job_id: str, tmp_path: str) -> None:
    """
    Called in a background thread by FastAPI's BackgroundTasks.
    Runs the full load → split → embed → map-reduce pipeline.
    The RAG instance is kept in the JobRecord so /ask can reuse it.
    """
    record = _jobs[job_id]
    record.status = JobStatus.PROCESSING
    logger.info("Job %s — started processing '%s'", job_id, record.filename)

    try:
        cfg = Config()
        cfg.OUTPUT_DIR = Path("outputs")   # keep saving summaries to disk too
        rag = LegalDocumentRAG(config=cfg)

        summary = rag.summarize(tmp_path, save=True)

        record.rag           = rag          # keep for follow-up questions
        record.summary       = summary
        record.status        = JobStatus.DONE
        record.completed_at  = time.time()
        logger.info(
            "Job %s — done in %.1fs",
            job_id, record.completed_at - record.created_at,
        )

    except Exception as exc:
        record.status = JobStatus.FAILED
        record.error  = str(exc)
        record.completed_at = time.time()
        logger.error("Job %s — failed: %s", job_id, exc)

    finally:
        # Clean up the temp file regardless of outcome
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


# ══════════════════════════════════════════════════════════
#  ENDPOINTS
# ══════════════════════════════════════════════════════════

@app.get("/health", response_model=HealthResponse, tags=["System"])
def health_check():
    """Returns API health status."""
    return HealthResponse(status="ok", version="1.0.0")


# ── POST /summarize ────────────────────────────────────────
@app.post(
    "/summarize",
    response_model=SummarizeResponse,
    status_code=202,
    tags=["Summarization"],
    summary="Upload a legal document for summarization",
    description=(
        "Accepts PDF, DOCX, or TXT files. "
        "Starts a background summarization job and immediately returns a "
        "`job_id`. Poll `GET /jobs/{job_id}` to check progress."
    ),
)
async def summarize(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="Legal document (PDF / DOCX / TXT)"),
):
    # Validate file type
    allowed = {".pdf", ".docx", ".doc", ".txt"}
    suffix  = Path(file.filename).suffix.lower()
    if suffix not in allowed:
        raise HTTPException(
            status_code=415,
            detail=(
                f"Unsupported file type '{suffix}'. "
                f"Allowed: {', '.join(sorted(allowed))}"
            ),
        )

    # Write upload to a named temp file (needed by LangChain loaders)
    suffix_map = {".pdf": ".pdf", ".docx": ".docx", ".doc": ".doc", ".txt": ".txt"}
    tmp = tempfile.NamedTemporaryFile(
        delete=False,
        suffix=suffix_map[suffix],
        prefix="judicialgpt_",
    )
    content = await file.read()
    tmp.write(content)
    tmp.flush()
    tmp.close()

    # Create job record
    job_id = str(uuid.uuid4())
    _jobs[job_id] = JobRecord(job_id=job_id, filename=file.filename)

    # Queue background task
    background_tasks.add_task(_run_summarization, job_id, tmp.name)

    logger.info("Job %s — queued for '%s'", job_id, file.filename)
    return SummarizeResponse(
        job_id=job_id,
        message="Summarization job queued. Poll /jobs/{job_id} for status.",
        filename=file.filename,
    )


# ── GET /jobs/{job_id} ─────────────────────────────────────
@app.get(
    "/jobs/{job_id}",
    response_model=JobStatusResponse,
    tags=["Summarization"],
    summary="Poll the status of a summarization job",
    description=(
        "Returns the current status of the job. "
        "When `status` is `done`, the `summary` field contains the full "
        "14-section judicial summary. "
        "When `status` is `failed`, `error` contains the reason."
    ),
)
def get_job_status(job_id: str):
    record = _jobs.get(job_id)
    if not record:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")

    return JobStatusResponse(
        job_id        = record.job_id,
        filename      = record.filename,
        status        = record.status,
        summary       = record.summary or None,
        error         = record.error   or None,
        created_at    = record.created_at,
        completed_at  = record.completed_at or None,
    )


# ── POST /ask ──────────────────────────────────────────────
@app.post(
    "/ask",
    response_model=AskResponse,
    tags=["QA"],
    summary="Ask a question about a summarized document",
    description=(
        "Runs retrieval-augmented QA over the document that was processed "
        "under `job_id`. The job must be in `done` status before calling this."
    ),
)
def ask_question(body: AskRequest):
    record = _jobs.get(body.job_id)
    if not record:
        raise HTTPException(status_code=404, detail=f"Job '{body.job_id}' not found.")

    if record.status != JobStatus.DONE:
        raise HTTPException(
            status_code=409,
            detail=(
                f"Job is not ready (current status: '{record.status}'). "
                "Wait for status to be 'done' before asking questions."
            ),
        )

    if record.rag is None:
        raise HTTPException(
            status_code=500,
            detail="RAG instance unavailable. The document may need to be reprocessed.",
        )

    try:
        answer = record.rag.ask(body.question)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"QA error: {exc}")

    return AskResponse(
        job_id   = body.job_id,
        question = body.question,
        answer   = answer,
    )


# ══════════════════════════════════════════════════════════
#  ENTRY POINT  (for direct execution)
# ══════════════════════════════════════════════════════════
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=7002, reload=True)
