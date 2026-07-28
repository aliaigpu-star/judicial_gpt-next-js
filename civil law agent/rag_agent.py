"""
====================================================================
  JudicialGPT — Civil Law RAG Agent
  Pakistan Civil Law Knowledge Base
  LangChain v1.x + langchain-classic + Groq + FAISS
====================================================================
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

from langchain_groq import ChatGroq
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_core.chat_history import BaseChatMessageHistory
from langchain_community.chat_message_histories import ChatMessageHistory
from langchain_classic.chains import (
    create_history_aware_retriever,
    create_retrieval_chain,
)
from langchain_classic.chains.combine_documents import create_stuff_documents_chain

from config import Config

load_dotenv(Path(__file__).resolve().parent / ".env", override=True)


# ══════════════════════════════════════════════════════════════════
# SYSTEM PROMPT  —  aligned with JudicialGPT main prompt
# ══════════════════════════════════════════════════════════════════

JUDICIAL_SYSTEM_PROMPT = """You are 'JudicialGPT,' an AI Assistant exclusively designed to serve and
support Judges within the judicial system of Pakistan.

CORE IDENTITY:
When asked for an introduction, respond with:
"I am JudicialGPT, a specialised AI assistant designed to support judges in their duties.
I am trained on Pakistani legal jurisprudence, procedural law under the Code of Civil
Procedure 1908, and judicial processes. My primary function is to assist with drafting
civil judgments, legal research, and case management. I am proficient in both English
and Urdu."

PRIMARY ROLE — CIVIL JUDGMENT DRAFTING:
You assist judges in drafting well-structured, legally sound civil judgments strictly
following the Pakistan civil court format mandated by Order XX Rule 4 CPC:
  1. Court Heading
  2. Statement of the Case
  3. Framing of Issues
  4. Evidence Summary
  5. Issue-wise Findings with Reasons
  6. Legal Discussion & Precedents
  7. Conclusion / Operative Part
  8. Decree

MANDATORY RULES:
  • Every finding must carry detailed reasons — bare findings are impermissible.
  • Cite relevant Pakistani precedents (SCMR, PLD, CLC, MLD) where applicable.
  • Reference evidence by exhibit numbers (Exh.P-1, Exh.D-1) and witnesses (PW-1, DW-1).
  • Use formal, temperate, precise language — no abbreviations or slang.
  • Standard of proof: balance of probabilities in civil matters.
  • Burden of proof lies on the plaintiff under Section 101 Qanun-e-Shahadat Order 1984.

CONTEXT FROM KNOWLEDGE BASE:
Use the following retrieved context from the Pakistan civil law corpus to inform your response.
Every legal position you state must be grounded in this context. If the retrieved context does
not cover the point raised, state clearly:
"The loaded knowledge base does not contain specific material on this point.
Your Lordship may wish to consult the relevant statute or a qualified law officer directly."

RETRIEVED CONTEXT:
{context}

BEHAVIOURAL GUARDRAILS:
  • Remain strictly neutral and impartial at all times.
  • When arguing or addressing any legal dispute/issue, thoroughly discuss the facts and arguments of both sides, and then take one clear, definitive position based on the law and evidence.
  • Treat all case information as highly confidential.
  • Maintain a formal, respectful, and objective tone.
  • Do not volunteer the current date/time unless explicitly asked."""


# ══════════════════════════════════════════════════════════════════
# CONTEXTUALIZATION PROMPT
# Rephrases follow-up queries from a judge into standalone
# legal research questions before hitting the retriever.
# ══════════════════════════════════════════════════════════════════

CONTEXTUALIZE_PROMPT = """You are assisting a Judge of a civil court in Pakistan.
Given the judicial conversation history and the Judge's latest query
(which may reference prior discussion about a case or legal point),
rewrite the query as a fully self-contained legal research question
that can be understood without the conversation history.

Examples of correct rephrasing:
  Judge asks: "What about the second ground?"
  → Rephrase to: "What is the second ground for dissolution of a Muslim marriage
    under the Dissolution of Muslim Marriages Act 1939?"

  Judge asks: "And the burden of proof here?"
  → Rephrase to: "What is the burden of proof in a civil suit for specific
    performance under the Specific Relief Act 1877?"

Do NOT answer the question — only rephrase it. If it is already self-contained,
return it unchanged."""


# ══════════════════════════════════════════════════════════════════
# MAIN AGENT CLASS
# ══════════════════════════════════════════════════════════════════

class JudicialGPTCivilAgent:
    """
    JudicialGPT Civil Law RAG Agent.

    Wraps the Pakistan civil law FAISS knowledge base with the
    JudicialGPT system prompt and exposes a conversational interface
    for judges to conduct legal research and draft judgments.
    """

    def __init__(self):
        print("\n[INIT] Initialising JudicialGPT Civil Law Agent...\n")
        self.config       = Config()
        self.llm          = self._load_llm()
        self.embeddings   = self._load_embeddings()
        self.vector_store = self._load_vector_store()
        self.retriever    = self._build_retriever()
        self._sessions: dict[str, ChatMessageHistory] = {}
        self.chain        = self._build_chain()
        print("[OK] JudicialGPT Civil Agent ready.\n")

    # ── LLM ───────────────────────────────────────────────────────
    def _load_llm(self) -> ChatGroq:
        key = os.getenv("GROQ_API_KEY")
        if not key:
            raise EnvironmentError(
                "GROQ_API_KEY not found.\n"
                "Add it to .env — free key at https://console.groq.com/keys"
            )
        print(f"   LLM       : {self.config.GROQ_MODEL}")
        return ChatGroq(
            model=self.config.GROQ_MODEL,
            temperature=self.config.TEMPERATURE,
            max_tokens=self.config.MAX_TOKENS,
            groq_api_key=key,
        )

    # ── Embeddings ────────────────────────────────────────────────
    def _load_embeddings(self) -> HuggingFaceEmbeddings:
        print(f"   Embeddings : {self.config.EMBEDDING_MODEL}")
        return HuggingFaceEmbeddings(
            model_name=self.config.EMBEDDING_MODEL,
            model_kwargs={"device": "cpu"},
            encode_kwargs={"normalize_embeddings": True},
        )

    # ── Vector store ──────────────────────────────────────────────
    def _load_vector_store(self) -> FAISS:
        path = self.config.VECTOR_STORE_PATH
        if not Path(path).exists():
            raise FileNotFoundError(
                f"Vector store not found at: {path}\n"
                "Run  python ingest.py  first to build the index."
            )
        print(f"   Vector store: {path}")
        return FAISS.load_local(
            path, self.embeddings,
            allow_dangerous_deserialization=True,
        )

    # ── Retriever ─────────────────────────────────────────────────
    def _build_retriever(self):
        """
        MMR retriever — fetches diverse chunks from across different
        statutes rather than returning similar sections repeatedly.
        Critical for judgment drafting which may cite multiple Acts.
        """
        print(f"   Retriever  : MMR  k={self.config.RETRIEVER_K}")
        return self.vector_store.as_retriever(
            search_type="mmr",
            search_kwargs={
                "k":           self.config.RETRIEVER_K,
                "fetch_k":     self.config.RETRIEVER_FETCH_K,
                "lambda_mult": 0.6,
            },
        )

    # ── Build the RAG chain ───────────────────────────────────────
    def _build_chain(self) -> RunnableWithMessageHistory:

        # ── Step 1: contextualize judge's follow-up queries ───────
        ctx_prompt = ChatPromptTemplate.from_messages([
            ("system", CONTEXTUALIZE_PROMPT),
            MessagesPlaceholder("chat_history"),
            ("human", "{input}"),
        ])

        history_aware_retriever = create_history_aware_retriever(
            self.llm, self.retriever, ctx_prompt
        )

        # ── Step 2: JudicialGPT answer generation ─────────────────
        # JUDICIAL_SYSTEM_PROMPT contains {context} which
        # create_stuff_documents_chain fills with retrieved chunks.
        qa_prompt = ChatPromptTemplate.from_messages([
            ("system", JUDICIAL_SYSTEM_PROMPT),
            MessagesPlaceholder("chat_history"),
            ("human", "{input}"),
        ])

        qa_chain  = create_stuff_documents_chain(self.llm, qa_prompt)
        rag_chain = create_retrieval_chain(history_aware_retriever, qa_chain)

        # ── Step 3: wrap with per-session conversation memory ──────
        return RunnableWithMessageHistory(
            rag_chain,
            self._get_session,
            input_messages_key="input",
            history_messages_key="chat_history",
            output_messages_key="answer",
        )

    # ── Session memory factory ────────────────────────────────────
    def _get_session(self, session_id: str) -> BaseChatMessageHistory:
        """
        Returns the ChatMessageHistory for a given session.
        Each judge / case can have its own isolated session_id.
        """
        if session_id not in self._sessions:
            self._sessions[session_id] = ChatMessageHistory()
        h = self._sessions[session_id]
        # Trim to last MEMORY_WINDOW exchanges to control token usage
        max_msgs = self.config.MEMORY_WINDOW * 2
        if len(h.messages) > max_msgs:
            h.messages = h.messages[-max_msgs:]
        return h

    # ── Public API ────────────────────────────────────────────────
    def ask(self, query: str, session_id: str = "default") -> dict:
        """
        Submit a judicial query to JudicialGPT.

        Args:
            query      : The judge's question or instruction
                         (e.g. "Draft Issue No. 1 on plaintiff's title",
                          "What is the limitation period for this suit?")
            session_id : Unique identifier per judge/case session.
                         Different IDs give completely isolated conversations.

        Returns:
            {
              "answer":  str,             — JudicialGPT's response
              "sources": list[dict]       — cited statute pages
            }
        """
        result = self.chain.invoke(
            {"input": query},
            config={"configurable": {"session_id": session_id}},
        )
        return {
            "answer":  result["answer"],
            "sources": self._fmt_sources(result.get("context", [])),
        }

    def _fmt_sources(self, docs: list) -> list[dict]:
        """Deduplicate and format retrieved source documents."""
        seen, out = set(), []
        for doc in docs:
            m     = doc.metadata
            fname = Path(m.get("source", "Unknown")).name
            page  = m.get("page", "N/A")
            key   = f"{fname}:{page}"
            if key not in seen:
                seen.add(key)
                out.append({
                    "file":    fname,
                    "page":    page,
                    "snippet": doc.page_content[:200].replace("\n", " ") + "…",
                })
        return out

    def clear_session(self, session_id: str = "default"):
        """Clear conversation history for a session (e.g. new case)."""
        self._sessions.pop(session_id, None)
        print(f"🗑️  Session '{session_id}' cleared.")

    def list_sessions(self):
        """List all active sessions."""
        if not self._sessions:
            print("   No active sessions.")
        else:
            for sid, h in self._sessions.items():
                print(f"   • {sid}  ({len(h.messages)//2} exchanges)")


# ══════════════════════════════════════════════════════════════════
# CLI
# ══════════════════════════════════════════════════════════════════

BANNER = """
╔══════════════════════════════════════════════════════════════════════╗
║          J U D I C I A L G P T                                       ║
║          Civil Law Research & Judgment Drafting Assistant            ║
║          Pakistan Civil Law Knowledge Base                           ║
╠══════════════════════════════════════════════════════════════════════╣
║  Commands:                                                           ║
║    exit / quit    →  exit                                            ║
║    clear          →  clear current session memory (new case)         ║
║    session <id>   →  switch to a different case session              ║
║    sessions       →  list all active sessions                        ║
║    sources        →  toggle statute citation display                 ║
╚══════════════════════════════════════════════════════════════════════╝
"""

SAMPLE_QUERIES = [
    "Draft Issue No. 1 on plaintiff's title in a property suit.",
    "What is the limitation period for a suit on a written contract?",
    "Explain the burden of proof under Section 101 Qanun-e-Shahadat Order.",
    "Draft findings on the issue of consideration in a contract dispute.",
    "What are the essentials of a valid mortgage under the Transfer of Property Act?",
    "Summarise the grounds for specific performance under the Specific Relief Act.",
]


def main():
    print(BANNER)

    print("📋  Sample judicial queries:")
    for i, q in enumerate(SAMPLE_QUERIES, 1):
        print(f"   {i}. {q}")
    print()

    agent        = JudicialGPTCivilAgent()
    show_sources = True
    session_id   = "case_default"

    while True:
        try:
            raw = input(f"\n👨‍⚖️  Judge [{session_id}]: ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\n\nJudicialGPT session ended.\n")
            sys.exit(0)

        if not raw:
            continue

        cmd = raw.lower()

        if cmd in ("exit", "quit", "q"):
            print("\nJudicialGPT session ended. Good day, Your Lordship.\n")
            sys.exit(0)

        elif cmd == "clear":
            agent.clear_session(session_id)
            print(f"   Session '{session_id}' cleared. Ready for a new case.")
            continue

        elif cmd == "sessions":
            agent.list_sessions()
            continue

        elif cmd == "sources":
            show_sources = not show_sources
            print(f"   Statute citations: {'ON ✅' if show_sources else 'OFF ❌'}")
            continue

        elif cmd.startswith("session "):
            new_sid = raw[8:].strip()
            if new_sid:
                session_id = new_sid
                print(f"   Switched to session: '{session_id}'")
            else:
                print("   Usage: session <case_id>  e.g.  session civil_suit_42")
            continue

        # ── Submit to JudicialGPT ─────────────────────────────────
        print("\n⚖️  JudicialGPT:\n")
        try:
            result = agent.ask(raw, session_id=session_id)
        except Exception as e:
            print(f"❌  Error: {e}")
            continue

        print(result["answer"])



if __name__ == "__main__":
    main()