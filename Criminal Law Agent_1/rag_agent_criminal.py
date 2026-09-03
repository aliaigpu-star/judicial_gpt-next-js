"""
====================================================================
  JudicialGPT — Criminal Law RAG Agent
  Pakistan Criminal Law Knowledge Base
  LangChain v1.x + langchain-classic + Groq + FAISS
====================================================================

Covers:
  • Pakistan Penal Code 1860 (PPC)
  • Code of Criminal Procedure 1898 (CrPC)
  • Qanun-e-Shahadat Order 1984 (Evidence)
  • Anti-Terrorism Act 1997
  • Control of Narcotic Substances Act 1997
  • National Accountability Ordinance 1999
  • Prevention of Electronic Crimes Act 2016
  • Hudood Ordinances 1979
  • Qisas & Diyat Ordinance 1990
  • Juvenile Justice System Act 2018
  • Criminal Law Amendment (Rape) Act 2021
  • Protection of Women Act 2006
  • Anti-Money Laundering Act 2010
  • And all other major Pakistan criminal statutes
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

from config_criminal import CriminalConfig

load_dotenv(Path(__file__).resolve().parent / ".env", override=True)


# ══════════════════════════════════════════════════════════════════
# SYSTEM PROMPT  —  Criminal law variant of JudicialGPT
# ══════════════════════════════════════════════════════════════════

CRIMINAL_SYSTEM_PROMPT = """You are 'JudicialGPT,' an AI Assistant exclusively designed to serve and
support Judges within the criminal judicial system of Pakistan.

CORE IDENTITY:
When asked for an introduction, respond with:
"I am JudicialGPT, a specialised AI assistant designed to support judges in criminal court
proceedings. I am trained on Pakistan's criminal law jurisprudence — including the Pakistan
Penal Code 1860, Code of Criminal Procedure 1898, Qanun-e-Shahadat Order 1984, Hudood
Ordinances, Anti-Terrorism Act 1997, and all major criminal statutes of Pakistan. My primary
function is to assist with drafting criminal judgments, legal research on offences and
punishments, bail matters, and evidence evaluation. I am proficient in both English and Urdu."

PRIMARY ROLE — CRIMINAL JUDGMENT DRAFTING:
You assist judges in drafting well-structured, legally sound criminal judgments strictly
following the Pakistan criminal court format:
  1. Court Heading (Court name, Case No., FIR No., Sections of PPC/Special Law)
  2. Parties (State vs. Accused — full names, CNIC, parentage, address)
  3. Prosecution Case (Summary of FIR, witnesses, medical/forensic evidence)
  4. Defence Case (Plea, witnesses, alibi if any)
  5. Charge (Section-wise charge as framed)
  6. Prosecution Evidence (PW-wise summary, exhibits — Exh.PW, Exh.P)
  7. Defence Evidence (DW-wise summary, exhibits — Exh.DW, Exh.D)
  8. Statements under Section 342 CrPC (Accused's explanation)
  9. Arguments of Parties
  10. Legal Discussion — Element-by-element analysis of the offence
  11. Appreciation of Evidence — Reliability, corroboration, contradictions
  12. Finding on Charge — Guilty / Not Guilty with detailed reasons
  13. Sentence (if guilty) — Under relevant PPC/Special Law section
  14. Benefit of doubt (if applicable) — Cite Supreme Court principle
  15. Operative Part / Order

MANDATORY RULES:
  • Every finding must carry detailed reasons — bare findings are impermissible.
  • Cite relevant Pakistani precedents (SCMR, PLD, PCrLJ, MLD) where applicable.
  • Reference evidence by exhibit numbers (Exh.PW-1, Exh.P-1) and witnesses (PW-1, DW-1).
  • Standard of proof: beyond reasonable doubt in criminal matters.
  • The prosecution bears the burden of proof throughout (Section 117 Qanun-e-Shahadat).
  • Accused is presumed innocent until proved guilty (Article 13 Constitution).
  • In Hudood matters: apply the specific evidentiary requirements (Hadd vs Ta'zir).
  • In ATA matters: apply Section 21-H (presumption re: possession of explosive/weapons).
  • In bail matters: apply the triple test (flight risk, tampering, repeat offence) and
    nature of offence (bailable vs non-bailable under Section 496–498 CrPC).
  • Use formal, temperate, precise language — no abbreviations or slang.
  • Every sentence must be within the statutory minimum-maximum range.
  • Where benefit of doubt arises, acquit — even a single doubt benefits the accused.

SPECIALIST KNOWLEDGE AREAS:
  — PPC Offences: Elements, essential ingredients, punishment, exceptions
  — CrPC Procedure: Bail (Sections 496–498), charge framing (Section 265-C),
    statements (Section 342), appeals (Sections 408–411), revision
  — Evidence: Dying declaration, extra-judicial confession, circumstantial evidence,
    medical evidence, ocular account, corroboration rules
  — Hudood: Zina, Qazf, Robbery (Hadd/Ta'zir distinction, tawbah, diyat)
  — Qisas & Diyat: Wali's right, compounding, diyat calculation
  — Terrorism: Scheduled offences, joint trial, in-camera proceedings
  — Narcotics: CNSA Sections 9, 13, 14 — presumption of possession
  — Juveniles: Age determination, exclusion of death penalty, reformatory approach
  — Sexual offences: DNA evidence, medical examination, in-camera trial

CONTEXT FROM KNOWLEDGE BASE:
Use the following retrieved context from the Pakistan criminal law corpus to inform
your response. Every legal position you state must be grounded in this context.
If the retrieved context does not cover the point raised, state clearly:
"The loaded knowledge base does not contain specific material on this point.
Your Lordship may wish to consult the relevant statute or a qualified law officer directly."

RETRIEVED CONTEXT:
{context}

BEHAVIOURAL GUARDRAILS:
  • Remain strictly neutral and impartial at all times.
  • When arguing or addressing any legal dispute/issue, thoroughly discuss the facts and arguments of both sides, and then take one clear, definitive position based on the law and evidence.
  • Treat all case information as highly confidential.
  • Maintain a formal, respectful, and objective tone.
  • Never express sympathy for either the prosecution or the accused.
  • Do not volunteer the current date/time unless explicitly asked.
  • Always include the caveat that judicial mind must be independently applied."""


# ══════════════════════════════════════════════════════════════════
# CONTEXTUALIZATION PROMPT
# Rephrases follow-up queries into standalone legal questions.
# ══════════════════════════════════════════════════════════════════

CRIMINAL_CONTEXTUALIZE_PROMPT = """You are assisting a Judge of a criminal court in Pakistan.
Given the judicial conversation history and the Judge's latest query
(which may reference prior discussion about a case, an offence, or a legal point),
rewrite the query as a fully self-contained legal research question
that can be understood without the conversation history.

Examples of correct rephrasing:
  Judge asks: "What is the punishment for this offence?"
  → Rephrase to: "What is the punishment for murder under Section 302 of the
    Pakistan Penal Code 1860?"

  Judge asks: "What about bail in this case?"
  → Rephrase to: "What are the principles governing pre-arrest bail in a
    narcotics case under Section 9 of the Control of Narcotic Substances Act 1997?"

  Judge asks: "And the benefit of doubt?"
  → Rephrase to: "What is the principle of benefit of doubt in criminal cases
    under Pakistani law, and when does it entitle an accused to acquittal?"

  Judge asks: "What are the elements of the second charge?"
  → Rephrase to: "What are the essential elements of robbery under Section 392
    of the Pakistan Penal Code 1860?"

Do NOT answer the question — only rephrase it. If it is already self-contained,
return it unchanged."""


# ══════════════════════════════════════════════════════════════════
# MAIN AGENT CLASS
# ══════════════════════════════════════════════════════════════════

class JudicialGPTCriminalAgent:
    """
    JudicialGPT Criminal Law RAG Agent.

    Wraps the Pakistan criminal law FAISS knowledge base with the
    JudicialGPT criminal system prompt and exposes a conversational
    interface for judges to conduct legal research and draft judgments.
    """

    def __init__(self):
        print("\n[INIT] Initialising JudicialGPT Criminal Law Agent...\n")
        self.config       = CriminalConfig()
        self.llm          = self._load_llm()
        self.embeddings   = self._load_embeddings()
        self.vector_store = self._load_vector_store()
        self.retriever    = self._build_retriever()
        self._sessions: dict[str, ChatMessageHistory] = {}
        self.chain        = self._build_chain()
        print("[OK] JudicialGPT Criminal Agent ready.\n")

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
                f"Criminal law vector store not found at: {path}\n"
                "Run  python ingest_criminal.py  first to build the index."
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
        Critical for criminal judgment drafting which may cite PPC,
        CrPC, Qanun-e-Shahadat, and special laws simultaneously.
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
            ("system", CRIMINAL_CONTEXTUALIZE_PROMPT),
            MessagesPlaceholder("chat_history"),
            ("human", "{input}"),
        ])

        history_aware_retriever = create_history_aware_retriever(
            self.llm, self.retriever, ctx_prompt
        )

        # ── Step 2: JudicialGPT criminal answer generation ────────
        qa_prompt = ChatPromptTemplate.from_messages([
            ("system", CRIMINAL_SYSTEM_PROMPT),
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
        Each judge / criminal case can have its own isolated session_id.
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
        Submit a judicial query to JudicialGPT Criminal Agent.

        Args:
            query      : The judge's question or instruction
                         (e.g. "What are the elements of Section 302 PPC?",
                          "Draft findings on the charge of robbery.",
                          "What are bail principles in terrorism cases?")
            session_id : Unique identifier per judge/case session.
                         Different IDs give completely isolated conversations.

        Returns:
            {
              "answer":  str,         — JudicialGPT's response
              "sources": list[dict]   — cited statute pages
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
║          J U D I C I A L G P T   —   C R I M I N A L               ║
║          Criminal Law Research & Judgment Drafting Assistant         ║
║          Pakistan Criminal Law Knowledge Base                        ║
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
    "What are the essential elements of murder under Section 302 PPC?",
    "Draft findings on the charge of robbery under Section 392 PPC.",
    "What are the principles of benefit of doubt in Pakistani criminal law?",
    "Explain the admissibility of an extra-judicial confession.",
    "What are bail principles in a narcotics case under CNSA Section 9?",
    "Draft a Section 342 CrPC statement template for an accused in a theft case.",
    "What is the difference between Hadd and Ta'zir punishment in Hudood cases?",
    "Explain the evidentiary value of ocular account vs. medical evidence.",
    "What is the procedure for framing of charge under Section 265-C CrPC?",
    "How should a dying declaration be evaluated under Qanun-e-Shahadat?",
]


def main():
    print(BANNER)

    print("📋  Sample judicial queries:")
    for i, q in enumerate(SAMPLE_QUERIES, 1):
        print(f"   {i}. {q}")
    print()

    agent        = JudicialGPTCriminalAgent()
    show_sources = True
    session_id   = "case_default"

    while True:
        try:
            raw = input(f"\n👨‍⚖️  Judge [{session_id}]: ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\n\nJudicialGPT Criminal session ended.\n")
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
                print("   Usage: session <case_id>  e.g.  session criminal_case_101")
            continue

        # ── Submit to JudicialGPT ─────────────────────────────────
        print("\n⚖️  JudicialGPT:\n")
        try:
            result = agent.ask(raw, session_id=session_id)
        except Exception as e:
            print(f"❌  Error: {e}")
            continue

        print(result["answer"])

        # if show_sources and result["sources"]:
        #     print("\n📚  Sources:")
        #     for s in result["sources"]:
        #         print(f"   • {s['file']}  (p.{s['page']})")
        #         print(f"     {s['snippet']}")


if __name__ == "__main__":
    main()