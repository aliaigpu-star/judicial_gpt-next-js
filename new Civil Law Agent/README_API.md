# ⚖️ JudicialGPT — Civil Law RAG Agent & API

An AI legal assistant exclusively designed for **Judges of Pakistan's civil courts**.
Powered by a Retrieval-Augmented Generation (RAG) pipeline built on the Pakistan civil law corpus.

---

## 📁 Project Structure

```
JudicialGPT Civil Law Agent/
│
├── api.py               ← FastAPI server  (start here for API use)
├── rag_agent.py         ← JudicialGPT agent core  (CLI + importable class)
├── ingest.py            ← One-time PDF ingestion & FAISS index builder
├── config.py            ← All settings in one place
├── requirements.txt     ← All Python dependencies
├── .env                 ← Your API keys  (create from .env.example)
│
├── data/                ← 📥 Place all downloaded statute PDFs here
│   ├── cpc_1908.pdf
│   ├── contract_act_1872.pdf
│   └── ...
│
└── vector_store/        ← Auto-created by ingest.py
    └── faiss_index/
```

---

## ⚡ Quickstart

### Step 1 — Install dependencies

```bash
pip install -r requirements.txt
```

### Step 2 — Set your Groq API key

Create a file named `.env` in the project root:

```
GROQ_API_KEY=your_groq_api_key_here
```

Get a **free** Groq API key at: https://console.groq.com/keys

### Step 3 — Add PDF files to `data/`

Place all your downloaded statute PDFs inside the `data/` folder.
Recommended naming (the ingester auto-detects statute names from filenames):

```
data/
├── cpc_1908.pdf
├── contract_act_1872.pdf
├── transfer_of_property_act_1882.pdf
├── specific_relief_act_1877.pdf
├── qanun_e_shahadat_order_1984.pdf
├── limitation_act_1908.pdf
├── guardians_wards_act_1890.pdf
├── family_courts_act_1964.pdf
├── muslim_family_laws_ordinance_1961.pdf
├── dissolution_muslim_marriages_act_1939.pdf
├── easements_act_1882.pdf
└── constitution_of_pakistan_1973.pdf
```

### Step 4 — Build the knowledge base (run once)

```bash
python ingest.py
```

This will:
- Extract text from all PDFs in `data/`
- Split into legal-aware chunks (1200 chars, 200 overlap)
- Generate embeddings using `BAAI/bge-base-en-v1.5` (local, free, ~400 MB download on first run)
- Save FAISS index to `vector_store/faiss_index/`

> ⏱️ Takes 3–10 minutes on first run depending on how many PDFs you have.
> Subsequent runs are instant as the model is cached.

### Step 5 — Run the API server

```bash
python api.py
```

Or using uvicorn directly (recommended for production):

```bash
uvicorn api:app --host 0.0.0.0 --port 8000 --reload
```

The API will be live at: **http://localhost:8000**

---

## 🌐 API Reference

### Base URL
```
http://localhost:8000
```

### Interactive Docs
| UI | URL |
|----|-----|
| Swagger UI | http://localhost:8000/docs |
| ReDoc | http://localhost:8000/redoc |

---

### `POST /query` — Submit a judicial query ⭐ Main endpoint

**Request body:**

```json
{
  "query": "What is the limitation period for filing a suit on a written contract?",
  "session_id": "civil_suit_42"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `query` | string | ✅ Yes | The judicial question or instruction (3–4000 chars) |
| `session_id` | string | ❌ No | Conversation session ID. Same ID = shared memory. Omit for stateless. |

**Response:**

```json
{
  "session_id": "civil_suit_42",
  "query": "What is the limitation period for filing a suit on a written contract?",
  "answer": "Under Article 37 of the Limitation Act, 1908, the limitation period for a suit on a contract in writing signed by the defendant is six years from the date the right to sue accrues...",
  "sources": [
    {
      "file": "limitation_act_1908.pdf",
      "page": "12",
      "snippet": "Article 37 — Suit on a contract in writing signed by the defendant..."
    }
  ],
  "response_time": 2.341
}
```

---

### `POST /session/clear` — Clear session memory

Clears conversation history for a session. Use when starting a new case.

**Request:**
```json
{
  "session_id": "civil_suit_42"
}
```

**Response:**
```json
{
  "session_id": "civil_suit_42",
  "cleared": true,
  "message": "Session 'civil_suit_42' has been cleared. Ready for a new case."
}
```

---

### `GET /session/list` — List active sessions

Returns all sessions currently holding conversation history.

**Response:**
```json
{
  "total_sessions": 2,
  "sessions": [
    { "session_id": "civil_suit_42", "exchanges": 5 },
    { "session_id": "judge_ali_session", "exchanges": 2 }
  ]
}
```

---

### `GET /health` — Health check

```json
{
  "status": "ok",
  "agent_ready": true,
  "model": "llama-3.3-70b-versatile",
  "embeddings": "BAAI/bge-base-en-v1.5"
}
```

---

### `GET /info` — Agent configuration

```json
{
  "name": "JudicialGPT Civil Law RAG Agent",
  "version": "1.0.0",
  "model": "llama-3.3-70b-versatile",
  "embeddings": "BAAI/bge-base-en-v1.5",
  "retriever_k": 6,
  "memory_window": 5,
  "description": "Pakistan civil law RAG agent trained on CPC 1908..."
}
```

---

## 💬 Example API Calls

### Using `curl`

```bash
# Simple query (stateless)
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Explain res judicata under CPC."}'

# Query with session (maintains context)
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is the limitation period for a property suit?",
    "session_id": "civil_suit_101"
  }'

# Follow-up in same session
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "And what about the burden of proof?",
    "session_id": "civil_suit_101"
  }'

# Clear the session
curl -X POST http://localhost:8000/session/clear \
  -H "Content-Type: application/json" \
  -d '{"session_id": "civil_suit_101"}'
```

### Using Python `requests`

```python
import requests

BASE = "http://localhost:8000"

# Start a session for a case
session_id = "civil_suit_42_lahore"

# First query
r = requests.post(f"{BASE}/query", json={
    "query": "Draft Issue No. 1 on plaintiff's title in a property suit.",
    "session_id": session_id,
})
data = r.json()
print(data["answer"])
print("Sources:", data["sources"])

# Follow-up (agent remembers context)
r = requests.post(f"{BASE}/query", json={
    "query": "Now draft the findings on this issue.",
    "session_id": session_id,
})
print(r.json()["answer"])

# Done with the case — clear memory
requests.post(f"{BASE}/session/clear", json={"session_id": session_id})
```

### Using JavaScript `fetch`

```javascript
const BASE = "http://localhost:8000";

async function askJudicialGPT(query, sessionId) {
  const response = await fetch(`${BASE}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, session_id: sessionId }),
  });
  const data = await response.json();
  console.log("Answer:", data.answer);
  console.log("Sources:", data.sources);
  return data;
}

// Usage
await askJudicialGPT(
  "What are the essentials of a valid mortgage under the Transfer of Property Act?",
  "case_session_1"
);
```

---

## ⚙️ Configuration (`config.py`)

All settings are centralised in `config.py`. Edit this file to tune the agent.

| Setting | Default | Description |
|---------|---------|-------------|
| `GROQ_MODEL` | `llama-3.3-70b-versatile` | Groq LLM model. See alternatives below. |
| `TEMPERATURE` | `0.1` | Lower = more factual. Keep low for legal use. |
| `MAX_TOKENS` | `2048` | Max length of each response. |
| `EMBEDDING_MODEL` | `BAAI/bge-base-en-v1.5` | Local HuggingFace embeddings. |
| `CHUNK_SIZE` | `1200` | Characters per text chunk. Larger = more legal context per chunk. |
| `CHUNK_OVERLAP` | `200` | Overlap between chunks. Prevents cutting mid-section. |
| `RETRIEVER_K` | `6` | Number of chunks returned per query. |
| `RETRIEVER_FETCH_K` | `15` | Candidates fetched before MMR diversity filtering. |
| `MEMORY_WINDOW` | `5` | Number of past Q&A exchanges remembered per session. |

### Available Groq models

| Model | Context | Speed | Best For |
|-------|---------|-------|----------|
| `llama-3.3-70b-versatile` | 128k | Medium | Best quality — default ✅ |
| `llama-3.1-8b-instant` | 128k | Fastest | Quick lookups |
| `mixtral-8x7b-32768` | 32k | Fast | Good reasoning |
| `gemma2-9b-it` | 8k | Fast | Lightweight |

---

## 🧠 How It Works

```
Your PDFs (data/)
      ↓
[ingest.py]
  PyPDFLoader → RecursiveCharacterTextSplitter (legal-aware)
      ↓
  BAAI/bge-base-en-v1.5 embeddings  (local, free)
      ↓
  FAISS vector index  →  saved to vector_store/
      ↓

[api.py]  receives POST /query
      ↓
[rag_agent.py]  JudicialGPTCivilAgent.ask()
      ↓
  create_history_aware_retriever
    → rephrases follow-up questions using chat history
      ↓
  FAISS MMR retrieval  (top-6 diverse chunks)
      ↓
  create_stuff_documents_chain
    → injects chunks into JudicialGPT system prompt
      ↓
  ChatGroq (llama-3.3-70b-versatile)
      ↓
  Answer + Source citations  →  JSON response
```

---

## 📦 Dependencies

| Package | Purpose |
|---------|---------|
| `langchain` | Core framework |
| `langchain-classic` | RAG chain functions (`create_history_aware_retriever` etc.) |
| `langchain-groq` | Groq LLM integration |
| `langchain-huggingface` | Local HuggingFace embeddings |
| `langchain-community` | FAISS vector store, chat history |
| `faiss-cpu` | Vector similarity search |
| `sentence-transformers` | Embedding model runtime |
| `pypdf` | PDF text extraction |
| `fastapi` | API framework |
| `uvicorn` | ASGI server |
| `pydantic` | Request/response validation |
| `python-dotenv` | `.env` file support |

---

## 🔒 Security Notes for Production

1. **Restrict CORS origins** — in `api.py`, change `allow_origins=["*"]` to your frontend domain.
2. **Add API key authentication** — use FastAPI's `HTTPBearer` or `APIKeyHeader` dependency.
3. **Use HTTPS** — run behind an Nginx reverse proxy with SSL.
4. **Disable `--reload`** — only use `reload=True` in development.
5. **Use persistent session storage** — the current in-memory session store resets on server restart. For production, replace `ChatMessageHistory` with `RedisChatMessageHistory`.

---

## 🐛 Common Issues

| Error | Cause | Fix |
|-------|-------|-----|
| `Vector store not found` | `ingest.py` hasn't been run | Run `python ingest.py` |
| `GROQ_API_KEY not found` | Missing `.env` file | Create `.env` with your key |
| `No module named 'langchain_classic'` | Missing package | Run `pip install langchain-classic` |
| `No PDF files found in data/` | Empty data folder | Add PDFs to `data/` and re-run ingest |
| `503 Service Unavailable` | Agent failed to load | Check logs; likely missing vector store |
| Port 8000 already in use | Another process on port 8000 | Use `--port 8001` or kill the other process |

---

## 📋 CLI Mode (without API)

You can also run the agent directly in the terminal without starting the API:

```bash
python rag_agent.py
```

CLI commands:
```
exit / quit       →  Exit
clear             →  Clear current session memory (new case)
session <id>      →  Switch to a different case session
sessions          →  List all active sessions
sources           →  Toggle statute citation display on/off
```

---

## ⚠️ Disclaimer

JudicialGPT is an AI research and drafting assistant. All output must be reviewed
by the presiding Judge before use in any judicial proceeding. The system does not
provide legal advice and should not be relied upon as a substitute for independent
judicial reasoning, legal research, or qualified legal counsel.

---

*JudicialGPT Civil Law Agent — Built for the Judiciary of Pakistan*
