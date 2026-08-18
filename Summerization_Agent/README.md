# ⚖️ JudicialGPT Summerization Agent API

A FastAPI-powered REST backend for **JudicialGPT** — an AI legal document summarization and question-answering system built for the Pakistani judiciary.

Powered by **LangChain + Groq (Llama 3.3 70B) + FAISS + HuggingFace Embeddings**.

---

## Table of Contents

- [Features](#features)
- [Project Structure](#project-structure)
- [Requirements](#requirements)
- [Setup & Installation](#setup--installation)
- [Configuration](#configuration)
- [Running the Server](#running-the-server)
- [API Reference](#api-reference)
  - [GET /health](#get-health)
  - [POST /summarize](#post-summarize)
  - [GET /jobs/{job_id}](#get-jobsjob_id)
  - [POST /ask](#post-ask)
- [Typical Frontend Flow](#typical-frontend-flow)
- [Example Requests](#example-requests)
- [Notes on Scaling](#notes-on-scaling)

---

## Features

- 📄 **Multi-format document ingestion** — PDF, DOCX, DOC, TXT
- 🗺️ **Manual Map-Reduce summarization** — bypasses LangChain's broken GPT-2 token counter for Llama models
- ⚖️ **14-section judicial summary** — document profile, parties, facts, legal issues, citations, arguments, findings, orders, and more
- 🔍 **Retrieval-Augmented QA** — ask follow-up questions against the loaded document via FAISS vector search
- 🔄 **Async background jobs** — summarization runs in the background; the frontend polls for completion
- 🌐 **Bilingual** — handles English and Urdu legal documents
- 📑 **Auto-saves summaries** to the `outputs/` directory with timestamps

---

## Project Structure

```
.
├── api.py               # FastAPI server (this file)
├── main.py              # Core RAG pipeline (LegalDocumentRAG class)
├── prompts.py           # All LLM prompt templates
├── requirements.txt     # Python dependencies
├── .env                 # API keys (create this — see Configuration)
└── outputs/             # Auto-created; timestamped summary .txt files saved here
```

---

## Requirements

- Python **3.10+**
- A free [Groq API key](https://console.groq.com/keys)

---

## Setup & Installation

**1. Clone the repo and enter the directory:**
```bash
git clone <your-repo-url>
cd judicialgpt
```

**2. Create and activate a virtual environment:**
```bash
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate
```

**3. Install dependencies:**
```bash
pip install -r requirements.txt
```

**4. Create your `.env` file:**
```bash
cp .env.example .env   # or create it manually
```

---

## Configuration

Create a `.env` file in the project root:

```env
# Required
GROQ_API_KEY=your_groq_api_key_here

# Optional overrides (defaults shown)
GROQ_MODEL=llama-3.3-70b-versatile
GROQ_TEMPERATURE=0.0
GROQ_MAX_TOKENS=4096
CHUNK_SIZE=1000
CHUNK_OVERLAP=150
RETRIEVAL_K=6
```

| Variable | Default | Description |
|---|---|---|
| `GROQ_API_KEY` | — | **Required.** Your Groq API key |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` | Groq model to use |
| `GROQ_TEMPERATURE` | `0.0` | 0 = fully deterministic (recommended for legal accuracy) |
| `GROQ_MAX_TOKENS` | `4096` | Max output tokens per LLM call |
| `CHUNK_SIZE` | `1000` | Characters per document chunk |
| `CHUNK_OVERLAP` | `150` | Overlap between consecutive chunks |
| `RETRIEVAL_K` | `6` | Number of chunks retrieved for QA |

---

## Running the Server

```bash
# Development (with auto-reload)
uvicorn api:app --reload --port 8000

# Production
uvicorn api:app --host 0.0.0.0 --port 8000 --workers 4
```

Once running, visit:

- **Interactive API docs (Swagger UI):** http://localhost:8000/docs
- **Alternative docs (ReDoc):** http://localhost:8000/redoc

---

## API Reference

### GET /health

Returns the health status of the API.

**Response `200`:**
```json
{
  "status": "ok",
  "version": "1.0.0"
}
```

---

### POST /summarize

Upload a legal document. Starts a background summarization job and immediately returns a `job_id`. The actual summarization runs asynchronously — use `GET /jobs/{job_id}` to poll for the result.

**Request:** `multipart/form-data`

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | File | ✅ | Legal document — PDF, DOCX, DOC, or TXT |

**Response `202 Accepted`:**
```json
{
  "job_id": "3f7a2b1c-84d0-4e5f-a912-7bc1234def56",
  "message": "Summarization job queued. Poll /jobs/{job_id} for status.",
  "filename": "judgment_lahore_hc.pdf"
}
```

**Error responses:**

| Code | Reason |
|---|---|
| `415` | Unsupported file type |

---

### GET /jobs/{job_id}

Poll the status of a summarization job.

**Path parameter:** `job_id` — the ID returned by `POST /summarize`

**Response `200`:**
```json
{
  "job_id": "3f7a2b1c-84d0-4e5f-a912-7bc1234def56",
  "filename": "judgment_lahore_hc.pdf",
  "status": "done",
  "summary": "━━━━━━━━━━ ⚖ JUDICIAL DOCUMENT SUMMARY ⚖ ━━━━━━━━━━\n\n### SECTION 1 — DOCUMENT PROFILE\n...",
  "error": null,
  "created_at": 1720000000.0,
  "completed_at": 1720000087.3
}
```

**`status` values:**

| Value | Meaning |
|---|---|
| `pending` | Job is queued, not yet started |
| `processing` | Summarization is actively running |
| `done` | Complete — `summary` field is populated |
| `failed` | An error occurred — `error` field contains the reason |

**Error responses:**

| Code | Reason |
|---|---|
| `404` | Job ID not found |

---

### POST /ask

Ask a specific question about a document that has already been summarized. The job must have `status: done` before calling this endpoint.

**Request body (`application/json`):**
```json
{
  "job_id": "3f7a2b1c-84d0-4e5f-a912-7bc1234def56",
  "question": "What reliefs were granted to the petitioner?"
}
```

**Response `200`:**
```json
{
  "job_id": "3f7a2b1c-84d0-4e5f-a912-7bc1234def56",
  "question": "What reliefs were granted to the petitioner?",
  "answer": "Based on the retrieved document sections, the petitioner was granted..."
}
```

**Error responses:**

| Code | Reason |
|---|---|
| `404` | Job ID not found |
| `409` | Job is not yet in `done` status |
| `500` | Internal QA error |

---

## Typical Frontend Flow

```
1.  User uploads a document
        │
        ▼
2.  POST /summarize  ──►  { job_id }
        │
        ▼
3.  Poll GET /jobs/{job_id}  every 3–5 seconds
        │
        ├── status: "pending"     → keep polling
        ├── status: "processing"  → show progress indicator
        ├── status: "failed"      → show error message
        └── status: "done"        → display summary ✅
        │
        ▼
4.  User asks follow-up questions
        │
        ▼
5.  POST /ask  ──►  { answer }
```

---

## Example Requests

**cURL — Upload and summarize:**
```bash
curl -X POST http://localhost:8000/summarize \
  -F "file=@/path/to/judgment.pdf"
```

**cURL — Poll for result:**
```bash
curl http://localhost:8000/jobs/3f7a2b1c-84d0-4e5f-a912-7bc1234def56
```

**cURL — Ask a question:**
```bash
curl -X POST http://localhost:8000/ask \
  -H "Content-Type: application/json" \
  -d '{
    "job_id": "3f7a2b1c-84d0-4e5f-a912-7bc1234def56",
    "question": "What section of the PPC was invoked?"
  }'
```

**JavaScript (fetch):**
```javascript
// 1. Upload document
const formData = new FormData();
formData.append("file", fileInput.files[0]);

const { job_id } = await fetch("http://localhost:8000/summarize", {
  method: "POST",
  body: formData,
}).then(r => r.json());

// 2. Poll until done
const poll = async () => {
  const job = await fetch(`http://localhost:8000/jobs/${job_id}`).then(r => r.json());
  if (job.status === "done")    return job.summary;
  if (job.status === "failed")  throw new Error(job.error);
  await new Promise(r => setTimeout(r, 4000));  // wait 4s
  return poll();
};

const summary = await poll();

// 3. Ask a question
const { answer } = await fetch("http://localhost:8000/ask", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ job_id, question: "What reliefs were sought?" }),
}).then(r => r.json());
```

---

## Notes on Scaling

The current implementation stores all job state in memory (`_jobs` dict). This is suitable for single-server deployments. For production scale, consider:

- **Job persistence:** Replace `_jobs` with a Redis store so jobs survive server restarts and are shared across workers.
- **Multiple workers:** With `--workers 4`, each worker has its own memory. Background jobs must be handed off to a proper task queue (e.g., Celery + Redis) instead of FastAPI `BackgroundTasks`.
- **File storage:** Replace `tempfile` with an object store (S3, MinIO) so uploaded files are accessible to all workers.
- **RAG state:** The FAISS index is held in-memory per job. For large deployments, serialize and persist the index to disk or a vector DB (e.g., Pinecone, Qdrant).

---

> **Confidentiality Notice:** JudicialGPT is designed for use within a judicial system. All uploaded documents and generated summaries are treated as confidential. Ensure this API is deployed behind appropriate authentication and access controls in production.
