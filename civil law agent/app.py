"""
app.py — Streamlit Web UI for Pakistan Civil Law RAG Agent
==========================================================
Run with:  streamlit run app.py
"""

import streamlit as st
from rag_agent import PakistanCivilLawAgent

# ── Page config ────────────────────────────────────────────────────
st.set_page_config(
    page_title="Pakistan Civil Law — AI Legal Assistant",
    page_icon="⚖️",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── Custom CSS ─────────────────────────────────────────────────────
st.markdown("""
<style>
    .main { background-color: #f8f9fa; }
    .stChatMessage { border-radius: 10px; margin-bottom: 8px; }
    .source-box {
        background: #eef2ff;
        border-left: 3px solid #4f46e5;
        border-radius: 6px;
        padding: 10px 14px;
        margin-top: 8px;
        font-size: 0.82rem;
        color: #374151;
    }
    .statute-badge {
        background: #1e3a5f;
        color: white;
        padding: 2px 10px;
        border-radius: 12px;
        font-size: 0.75rem;
        font-weight: 600;
        margin-right: 4px;
    }
    h1 { color: #1e3a5f !important; }
</style>
""", unsafe_allow_html=True)


# ── Sidebar ─────────────────────────────────────────────────────────
with st.sidebar:
    st.image("https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/Flag_of_Pakistan.svg/200px-Flag_of_Pakistan.svg.png", width=80)
    st.title("⚖️ Pakistan Civil Law\nAI Legal Assistant")
    st.caption("Powered by LangChain v0.3 + Groq + FAISS")

    st.divider()
    st.markdown("**📚 Indexed Statutes**")
    statutes = [
        "Code of Civil Procedure 1908",
        "Contract Act 1872",
        "Transfer of Property Act 1882",
        "Specific Relief Act 1877",
        "Qanun-e-Shahadat Order 1984",
        "Limitation Act 1908",
        "Guardians & Wards Act 1890",
        "Family Courts Act 1964",
        "Muslim Family Laws Ord. 1961",
        "Dissolution of MM Act 1939",
        "Easements Act 1882",
        "Constitution of Pakistan 1973",
    ]
    for s in statutes:
        st.markdown(f"• {s}")

    st.divider()

    show_sources = st.toggle("Show source citations", value=True)

    if st.button("🗑️ Clear conversation", use_container_width=True):
        st.session_state.messages = []
        if "agent" in st.session_state:
            st.session_state.agent.clear_memory()
        st.rerun()

    st.divider()
    st.caption("⚠️ This tool is for legal research only. Always consult a qualified Pakistani advocate for actual legal matters.")


# ── Agent (cached singleton) ────────────────────────────────────────
@st.cache_resource(show_spinner="Loading Pakistan Civil Law knowledge base...")
def load_agent():
    return PakistanCivilLawAgent()


# ── Chat history ────────────────────────────────────────────────────
if "messages" not in st.session_state:
    st.session_state.messages = []

if "agent" not in st.session_state:
    st.session_state.agent = load_agent()


# ── Header ──────────────────────────────────────────────────────────
st.title("⚖️ Pakistan Civil Law — AI Legal Assistant")
st.caption("Ask any question about Pakistan's civil law, statutes, procedures, or case law.")

# Example questions
with st.expander("💡 Example questions to get started"):
    examples = [
        "What is the limitation period for filing a suit on a contract?",
        "Explain the concept of res judicata under the CPC.",
        "What are the grounds for dissolution of a Muslim marriage?",
        "How is a mortgage defined under the Transfer of Property Act?",
        "What is the procedure for filing a civil suit in a District Court?",
        "What does Section 9 of the CPC say about civil court jurisdiction?",
        "What is the difference between void and voidable contracts?",
        "Explain the concept of specific performance and when it is granted.",
    ]
    cols = st.columns(2)
    for i, ex in enumerate(examples):
        if cols[i % 2].button(ex, key=f"ex_{i}", use_container_width=True):
            st.session_state.pending_question = ex


# ── Display chat history ─────────────────────────────────────────────
for msg in st.session_state.messages:
    with st.chat_message(msg["role"], avatar="🧑‍⚖️" if msg["role"] == "user" else "⚖️"):
        st.markdown(msg["content"])
        if msg["role"] == "assistant" and show_sources and msg.get("sources"):
            with st.expander(f"📚 Sources ({len(msg['sources'])} references)", expanded=False):
                for src in msg["sources"]:
                    st.markdown(f"""<div class="source-box">
                        <strong>📄 {src['file']}</strong> — Page {src['page']}<br>
                        <em>{src['snippet']}</em>
                    </div>""", unsafe_allow_html=True)


# ── Handle example button clicks ────────────────────────────────────
pending = st.session_state.pop("pending_question", None)

# ── Chat input ──────────────────────────────────────────────────────
user_question = st.chat_input("Ask a question about Pakistan civil law...") or pending

if user_question:
    # Display user message
    st.session_state.messages.append({"role": "user", "content": user_question})
    with st.chat_message("user", avatar="🧑‍⚖️"):
        st.markdown(user_question)

    # Generate response
    with st.chat_message("assistant", avatar="⚖️"):
        with st.spinner("Searching legal corpus..."):
            try:
                result = st.session_state.agent.ask(user_question)
                answer  = result["answer"]
                sources = result["sources"]
            except Exception as exc:
                answer  = f"❌ An error occurred: {exc}\n\nPlease check that the vector store has been built by running `python ingest.py`."
                sources = []

        st.markdown(answer)

        if show_sources and sources:
            with st.expander(f"📚 Sources ({len(sources)} references)", expanded=False):
                for src in sources:
                    st.markdown(f"""<div class="source-box">
                        <strong>📄 {src['file']}</strong> — Page {src['page']}<br>
                        <em>{src['snippet']}</em>
                    </div>""", unsafe_allow_html=True)

    st.session_state.messages.append({
        "role":    "assistant",
        "content": answer,
        "sources": sources,
    })
