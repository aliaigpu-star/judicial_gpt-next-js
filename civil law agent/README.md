# ⚖️ Pakistan Civil Law — RAG Agent

A conversational AI legal assistant that answers questions about Pakistan's civil
law using your downloaded PDF statutes, powered by **LangChain v0.3 + Groq + FAISS**.

---

## 🗂️ Project Structure

```
pakistan_civil_law_rag/
├── rag_agent.py      ← Main agent (CLI interface)
├── app.py            ← Streamlit web UI
├── ingest.py         ← One-time PDF ingestion & indexing
├── config.py         ← All settings (model, chunk size, etc.)
├── requirements.txt  ← Python dependencies
├── .env.example      ← Copy to .env and add your Groq key
├── data/             ← 📥 PUT YOUR PDFs HERE
└── vector_store/     ← Auto-created by ingest.py
```

---

## ⚡ Quickstart

### 1. Clone / download the project

### 2. Install dependencies
```bash
pip install -r requirements.txt
```

### 3. Add your Groq API key
```bash
cp .env.example .env
# Edit .env and add your key from https://console.groq.com/keys
```

### 4. Add your PDF files
Place all your downloaded statutes into the `data/` folder:
```
data/
├── code_of_civil_procedure_1908.pdf
├── contract_act_1872.pdf
├── transfer_of_property_act_1882.pdf
├── specific_relief_act_1877.pdf
├── qanun_e_shahadat_order_1984.pdf
├── limitation_act_1908.pdf
├── guardians_wards_act_1890.pdf
├── family_courts_act_1964.pdf
├── muslim_family_laws_ordinance_1961.pdf
├── dissolution_of_muslim_marriages_act_1939.pdf
├── easements_act_1882.pdf
└── constitution_of_pakistan_1973.pdf
```

### 5. Build the knowledge base (run once)
```bash
python ingest.py
```
This will:
- Extract text from all PDFs
- Split into smart legal chunks
- Generate embeddings (downloads ~400 MB model first time)
- Save a FAISS index locally

### 6. Run the agent

**CLI (terminal chat):**
```bash
python rag_agent.py
```

**Web UI (Streamlit):**
```bash
pip install streamlit
streamlit run app.py
```

---

## 🧠 How It Works

```
Your PDFs
   ↓
[ingest.py] PyPDFLoader → RecursiveCharacterTextSplitter
   ↓
BAAI/bge-base-en-v1.5 embeddings (local, free)
   ↓
FAISS vector index (saved to disk)
   ↓
[rag_agent.py]
User Question
   ↓
ConversationalRetrievalChain
   ├── Reformulates question using chat history
   ├── MMR retrieval (top 6 diverse chunks)
   └── Groq LLM (llama-3.3-70b-versatile) generates answer
        ↓
    Answer + Source Citations
```

---

## ⚙️ Configuration (`config.py`)

| Setting | Default | Description |
|---------|---------|-------------|
| `GROQ_MODEL` | `llama-3.3-70b-versatile` | LLM model |
| `TEMPERATURE` | `0.1` | Lower = more factual |
| `EMBEDDING_MODEL` | `BAAI/bge-base-en-v1.5` | Local embeddings |
| `CHUNK_SIZE` | `1200` | Characters per chunk |
| `CHUNK_OVERLAP` | `200` | Overlap between chunks |
| `RETRIEVER_K` | `6` | Chunks returned per query |
| `MEMORY_WINDOW` | `5` | Conversation turns remembered |

---

## 💬 Example Questions

- *"What is the limitation period for filing a suit on a contract?"*
- *"Explain res judicata under the CPC."*
- *"What are the grounds for dissolution of a Muslim marriage?"*
- *"How is a mortgage defined under the Transfer of Property Act?"*
- *"What does Section 9 of the CPC say?"*
- *"What is the difference between void and voidable contracts?"*
- *"When is specific performance granted?"*
- *"What is the procedure for appeal from a District Court?"*

---

## ⚠️ Disclaimer

This tool is for **legal research and education only**.
Always consult a qualified Pakistani advocate for real legal matters.

---

## 📦 Key Libraries

| Library | Version | Purpose |
|---------|---------|---------|
| `langchain` | ≥0.3.0 | Core framework |
| `langchain-groq` | ≥0.2.0 | Groq LLM integration |
| `langchain-huggingface` | ≥0.1.0 | Local embeddings |
| `faiss-cpu` | ≥1.8.0 | Vector store |
| `pypdf` | ≥4.0.0 | PDF extraction |
| `python-dotenv` | ≥1.0.0 | Environment management |
