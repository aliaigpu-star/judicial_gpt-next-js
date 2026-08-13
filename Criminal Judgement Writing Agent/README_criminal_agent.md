# CriminalJudicialGPT — Criminal Judgment Writing Agent

A RAG-based FastAPI service that drafts Pakistani criminal court judgments
(PPC / Cr.P.C. / Qisas-Diyat / special laws) and answers criminal-procedure
questions, grounded in retrieved reference documents. Like its civil
counterpart, it can export any response as a downloadable `.docx` file when
explicitly asked.

---

## Setup

```bash
pip install fastapi uvicorn langchain langchain-community langchain-groq \
            langchain-huggingface faiss-cpu sentence-transformers \
            python-dotenv python-docx
```

Create a `.env` file in the project root:
```
GROQ_API_KEY=your_groq_api_key_here
```

Run the server (a different port than the civil agent, if running both
side by side):
```bash
uvicorn api:app --host 0.0.0.0 --port 8001 --reload
```

Interactive API docs (Swagger UI): `http://127.0.0.1:8001/docs`.

---

## Endpoints

### `GET /`
Basic liveness check.

**Response**
```json
{
  "service": "CriminalJudicialGPT API",
  "status": "running",
  "docs": "/docs",
  "covers": "PPC | Cr.P.C. | CNS Act | ATA | Qisas/Diyat"
}
```

---

### `GET /health`
Detailed health check — confirms the RAG engine, vector store, and embedding
model are loaded correctly.

**Response** (`HealthResponse`)
| Field | Type | Description |
|---|---|---|
| `status` | string | `"healthy"` if ready |
| `model` | string | LLM in use (Groq) |
| `embeddings` | string | Embedding model name |
| `vector_store_docs` | int | Number of documents indexed in FAISS |
| `sessions_active` | int | Number of active `/chat/history` sessions |

Returns `503` if the RAG engine hasn't finished initializing.

---

### `POST /chat`
Send a single query and get back a complete criminal judgment draft or
legal answer. No conversation memory.

**Request** (`ChatRequest`)
```json
{ "query": "Draft a full judgment convicting the accused under Section 302 PPC." }
```

**Response** (`ChatResponse`)
| Field | Type | Description |
|---|---|---|
| `query` | string | The original query |
| `response` | string | The full markdown judgment/answer |
| `sources` | string[] | Names of retrieved reference documents used |
| `document` | object \| null | Present only if the query explicitly asked for a downloadable file |

**`document` object** (`DocumentInfo`), when present:
| Field | Type | Description |
|---|---|---|
| `title` | string | Derived from the query |
| `doc_type` | string | Always `"DOCX"` currently |
| `download_url` | string | Direct link to `GET /documents/{filename}` |

Same trigger rule as the civil agent: `document` is only populated when the
query names a file type (document/docx/word file/pdf) **and** uses an
action verb requesting it (give me / download / export / create /
generate...). Plain drafting requests do not trigger a file on their own.

---

### `GET /documents/{filename}`
Downloads a previously generated `.docx` file — the URL returned in
`document.download_url`.

Returns `400` for suspicious/path-traversal filenames, `404` if the file
doesn't exist.

---

### `POST /chat/stream`
Streams the response token-by-token over Server-Sent Events (SSE).

**Request**: same as `/chat`.

**Response**: `text/event-stream`:
```
data: <token>

```
ending with:
```
data: [DONE]

```

> `/chat/stream` does not produce a `document` — export only runs on
> `/chat` and `/chat/history`.

---

### `POST /chat/history`
Multi-turn conversation. Pass the same `session_id` across calls to keep
context; omit it to start fresh.

**Request** (`HistoryChatRequest`)
```json
{ "session_id": "optional-existing-id", "query": "What was the verdict on Charge No. 2?" }
```

**Response** (`HistoryChatResponse`)
| Field | Type | Description |
|---|---|---|
| `session_id` | string | Save this to continue the conversation |
| `query` | string | The original query |
| `response` | string | The full markdown answer |
| `sources` | string[] | Retrieved reference document names |
| `turn` | int | Turn number within this session |
| `document` | object \| null | Same rule as `/chat` |

---

### `DELETE /chat/history/{session_id}`
Clears all stored history for a session.

**Response**
```json
{ "message": "Session '<id>' cleared successfully." }
```
Returns `404` if the session doesn't exist.

---

### `GET /sessions`
Lists all active sessions (in-memory — cleared on server restart).

**Response** (`SessionInfo[]`)
| Field | Type | Description |
|---|---|---|
| `session_id` | string | |
| `turns` | int | Number of user turns so far |
| `preview` | string | First ~80 characters of the first user message |

---

## Document export feature

Identical mechanism to the civil agent: after the LLM produces its markdown
answer, a query that explicitly asks for a file (e.g. *"...export it as a
word document"*) triggers a conversion of that markdown into a `.docx`
(headings, bold/italic, and lists preserved), saved to `generated_docs/`.
The response's `document.download_url` points at `GET /documents/{filename}`
to fetch it.

This runs strictly **after** the RAG/LLM chain and never alters model
behavior. A failure here (e.g. disk issue) never breaks the chat response —
`document` will just be `null`, with a warning printed server-side.

**Relevant environment variables:**
| Variable | Default | Purpose |
|---|---|---|
| `DOC_EXPORT_DIR` | `generated_docs` | Local folder where `.docx` files are saved |
| `PUBLIC_BASE_URL` | `http://127.0.0.1:8000` | Base URL for `download_url` — **update to your real domain when deploying**, and to the correct port if this agent runs on 8001 |

> ⚠️ If running this agent alongside the civil agent, make sure
> `PUBLIC_BASE_URL` (and the port in it) matches wherever *this* server is
> actually reachable — copying the civil agent's `.env` as-is will point
> download links at the wrong service.

> Generated files are not auto-deleted — add your own retention/cleanup job
> if needed.
