# JudicialGPT — Civil Judgment Writing Agent

A RAG-based FastAPI service that drafts Pakistani civil court judgments and
answers civil-procedure questions, grounded in retrieved reference documents
(CPC drafting standards, suit-type formats, etc.). It can also export any
response as a downloadable `.docx` file when explicitly asked.

---

## Setup

```bash
pip install -r requirements.txt
```

Create a `.env` file in the project root:
```
GROQ_API_KEY=your_groq_api_key_here
```

Run the server:
```bash
uvicorn api:app --host 0.0.0.0 --port 8000 --reload
```

Interactive API docs (Swagger UI) are available at `http://127.0.0.1:8000/docs`
once the server is running.

---

## Endpoints

### `GET /`
Basic liveness check. Returns service name and status.

**Response**
```json
{
  "service": "JudicialGPT API",
  "status": "running",
  "docs": "/docs"
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
Send a single query and get back a complete judgment draft or legal answer.
No conversation memory — each call is independent. Best for simple
integrations that don't need multi-turn context.

**Request** (`ChatRequest`)
```json
{ "query": "Draft a full judgment for a suit for declaration filed by Ahmed against Bilal." }
```

**Response** (`ChatResponse`)
| Field | Type | Description |
|---|---|---|
| `query` | string | The original query |
| `response` | string | The full markdown judgment/answer |
| `sources` | string[] | Names of retrieved reference documents used |
| `document` | object \| null | Present only if the query explicitly asked for a downloadable file (see below) |

**`document` object** (`DocumentInfo`), when present:
| Field | Type | Description |
|---|---|---|
| `title` | string | Derived from the query |
| `doc_type` | string | Always `"DOCX"` currently |
| `download_url` | string | Direct link to `GET /documents/{filename}` |

`document` is only populated when the query both names a file type
(document/docx/word file/pdf/etc.) **and** uses an action verb requesting it
(give me / download / export / create / generate...). A plain drafting
request like *"draft a judgment for..."* will **not** trigger a file —
you have to ask for the document explicitly, e.g. *"...and give me a
downloadable docx file."*

---

### `GET /documents/{filename}`
Downloads a previously generated `.docx` file. This is the URL returned in
`document.download_url` — you generally won't call it directly, just follow
the link.

Returns `400` if the filename looks like a path-traversal attempt, `404` if
the file doesn't exist (e.g. it was cleaned up).

---

### `POST /chat/stream`
Same as `/chat`, but streams the response token-by-token over
Server-Sent Events (SSE) instead of waiting for the full answer. Useful for
"typing" effects in a frontend.

**Request**: same as `/chat`.

**Response**: `text/event-stream`, each event formatted as:
```
data: <token>

```
followed by a final:
```
data: [DONE]

```

> Note: `/chat/stream` does **not** currently produce a `document` — the
> export step only runs on `/chat` and `/chat/history`.

---

### `POST /chat/history`
Multi-turn conversation. Pass the same `session_id` across calls to
maintain context; omit it (or use a new one) to start a fresh conversation.

**Request** (`HistoryChatRequest`)
```json
{ "session_id": "optional-existing-id", "query": "What issues were framed?" }
```
If `session_id` is omitted, a new UUID is generated automatically.

**Response** (`HistoryChatResponse`)
| Field | Type | Description |
|---|---|---|
| `session_id` | string | Echoes/generates the session ID — save this for follow-ups |
| `query` | string | The original query |
| `response` | string | The full markdown answer |
| `sources` | string[] | Retrieved reference document names |
| `turn` | int | Turn number within this session |
| `document` | object \| null | Same as in `/chat` — populated only on explicit file requests |

---

### `DELETE /chat/history/{session_id}`
Clears all stored conversation history for a given session.

**Response**
```json
{ "message": "Session '<id>' cleared successfully." }
```
Returns `404` if the session doesn't exist.

---

### `GET /sessions`
Lists all currently active sessions (in-memory — cleared on server restart).

**Response** (`SessionInfo[]`)
| Field | Type | Description |
|---|---|---|
| `session_id` | string | |
| `turns` | int | Number of user turns so far |
| `preview` | string | First ~80 characters of the first user message |

---

## Document export feature

Any `/chat` or `/chat/history` call whose query explicitly asks for a file
(e.g. *"...give me a complete docx file"*) will, after the LLM's answer is
generated, convert that markdown response into a `.docx` (preserving
headings, bold/italic, and lists) and save it to the `generated_docs/`
folder. The response includes a `document.download_url` pointing at
`GET /documents/{filename}` to retrieve it.

This step runs strictly **after** the RAG/LLM chain — it never changes model
behavior, prompts, or retrieval. A failure in the export step (e.g. disk
issue) never breaks the chat response itself; `document` will simply be
`null` and a warning is logged server-side.

**Environment variables relevant to this feature:**
| Variable | Default | Purpose |
|---|---|---|
| `DOC_EXPORT_DIR` | `generated_docs` | Local folder where `.docx` files are saved |
| `PUBLIC_BASE_URL` | `http://127.0.0.1:8000` | Base URL used to build `download_url` — **update this when deploying**, or download links will point at localhost |

> Generated files are **not** automatically deleted. Set up your own
> retention/cleanup job (e.g. a scheduled task deleting files older than
> N days) if this matters for your deployment.
