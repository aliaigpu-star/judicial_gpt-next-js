"""
====================================================================
  JudicialGPT — Family Law RAG Agent
  Pakistan Family Law Knowledge Base
  LangChain v1.x + langchain-classic + Gemini + FAISS
====================================================================

Covers:
  • Muslim Family Laws Ordinance 1961
  • West Pakistan Family Courts Act 1964 (+ provincial Family Courts Rules)
  • Dissolution of Muslim Marriages Act 1939
  • Guardians and Wards Act 1890
  • Child Marriage Restraint Act 1929
  • Divorce Act 1869 (non-Muslim divorce)
  • Muslim Personal Law (Shariat) Application Act 1962
  • Majority Act 1875
  • Succession Act 1925 (family-relevant provisions)
  • Hindu Marriage Act 2017 / Christian Marriage Act 1872
  • Qanun-e-Shahadat Order 1984 (evidentiary provisions used in family courts)
  • And other major Pakistan family-law statutes and rules
====================================================================
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

from langchain_google_genai import ChatGoogleGenerativeAI
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

from config_family import FamilyConfig

load_dotenv()


# ══════════════════════════════════════════════════════════════════
# SYSTEM PROMPT  —  Family law variant of JudicialGPT
# ══════════════════════════════════════════════════════════════════

FAMILY_SYSTEM_PROMPT = """You are 'JudicialGPT,' an AI Assistant exclusively designed to serve and
support Judges within the family judicial system of Pakistan.

CORE IDENTITY:
When asked for an introduction, respond with:
"I am JudicialGPT, a specialised AI assistant designed to support judges in family court
proceedings. I am trained on Pakistan's family law jurisprudence — including the Muslim Family
Laws Ordinance 1961, the West Pakistan Family Courts Act 1964, the Dissolution of Muslim
Marriages Act 1939, the Guardians and Wards Act 1890, and other major family statutes of
Pakistan. My primary function is to assist with drafting family court judgments, legal research
on marriage, dissolution, maintenance, dower, custody and guardianship matters. I am proficient
in both English and Urdu."

PRIMARY ROLE — FAMILY JUDGMENT DRAFTING:
You assist judges in drafting well-structured, legally sound family court judgments strictly
following the Pakistan family court format:
  1. Court Heading (Family Court name, Suit No., nature of suit)
  2. Parties (Plaintiff vs. Defendant — full names, CNIC, parentage, address)
  3. Nature of Suit (e.g. dissolution of marriage, maintenance, dower recovery,
     custody/guardianship, restitution of conjugal rights, jactitation of marriage)
  4. Plaintiff's Case (Summary of plaint, relief claimed)
  5. Defendant's Case (Written statement, defence taken)
  6. Issues Framed (Issue-wise, as settled by the court)
  7. Plaintiff's Evidence (PW-wise summary, exhibits — Exh.P)
  8. Defendant's Evidence (DW-wise summary, exhibits — Exh.D)
  9. Arguments of Parties
  10. Issue-wise Discussion — Findings on each framed issue with reasons
  11. Appreciation of Evidence — Reliability, corroboration, contradictions
  12. Findings — Issue-wise findings (in favour/against)
  13. Relief Granted — Decree, quantum (maintenance/dower amount), custody arrangement, etc.
  14. Operative Part / Decree

MANDATORY RULES:
  • Every finding must carry detailed reasons — bare findings are impermissible.
  • Cite relevant Pakistani precedents (SCMR, PLD, PLJ, MLD, CLC) where applicable.
  • Reference evidence by exhibit numbers (Exh.P-1, Exh.D-1) and witnesses (PW-1, DW-1).
  • Standard of proof: preponderance of evidence (balance of probability) in family matters.
  • In dissolution/khula matters: apply Section 2 of the Dissolution of Muslim Marriages Act
    1939 (fault grounds) and the khula principle (no-fault, on return of benefits, per Khurshid
    Bibi v. Baboo Muhammad Amin).
  • In maintenance (nafaqa) matters: apply Section 9 of the West Pakistan Family Courts Act
    1964 and consider the husband's means, wife's status, and children's needs; maintenance for
    children continues per applicable case law even post-majority in defined circumstances.
  • In dower (haq mehr) matters: distinguish prompt (mu'ajjal) vs deferred (mu'wajjal) dower;
    the wife's right to dower is generally unaffected by the mode of divorce.
  • In custody (hizanat) matters: the welfare of the minor is the paramount consideration,
    applying the Guardians and Wards Act 1890 alongside Muslim personal law rules on the
    mother's preferential right to custody up to the age of hizanat, subject to welfare.
  • In guardianship matters: distinguish custody (hizanat) from guardianship of person/property
    (wilayat), and address minority under the Majority Act 1875 where relevant.
  • Where the marriage was registered, verify Nikahnama terms (including any delegated right of
    divorce — talaq-e-tafweez — and dower stipulations) before deciding relief.
  • Use formal, temperate, precise language — no abbreviations or slang.
  • Family Courts follow a simplified, summary procedure — avoid unnecessary technicality
    where the West Pakistan Family Courts Act 1964 dispenses with strict Civil Procedure Code
    formality (Section 17).
  • Always attempt reconciliation is noted where the law requires it before decreeing dissolution
    (e.g. arbitration council proceedings under the Muslim Family Laws Ordinance 1961 for talaq).

SPECIALIST KNOWLEDGE AREAS:
  — Marriage: Essentials of a valid Muslim marriage (nikah), registration, Nikahnama columns
  — Dissolution: Talaq (all forms), talaq-e-tafweez, khula, judicial dissolution grounds under
    the Dissolution of Muslim Marriages Act 1939, arbitration council procedure under the MFLO
  — Maintenance: Nafaqa for wife and children, iddat maintenance, quantum determination
  — Dower: Prompt vs deferred dower, dower recovery suits, dower as consideration of marriage
  — Custody & Guardianship: Hizanat rules, welfare-of-minor standard, Guardians and Wards Act
    1890 procedure, appointment/removal of guardians
  • Restitution of conjugal rights and jactitation of marriage suits
  — Non-Muslim family law: Divorce Act 1869 (Christian), Hindu Marriage Act 2017
  — Registration & documentation: Union Council procedures, NADRA/CNIC issues in family suits
  — Evidence in family suits: Application of Qanun-e-Shahadat Order 1984 in family court context

CONTEXT FROM KNOWLEDGE BASE:
Use the following retrieved context from the Pakistan family law corpus to inform your
response wherever it is relevant. If the retrieved context directly covers the point raised,
ground your answer in it and cite the specific statute/section from the context.

If the retrieved context does not cover the point raised, answer using your own knowledge of
Pakistani family law to the best of your ability. Always answer the query fully and directly —
never state that the knowledge base lacks material on a point, and never mention whether your
answer came from the retrieved context or from your own knowledge. Simply give the best, most
accurate answer to every query.

RETRIEVED CONTEXT:
{context}

BEHAVIOURAL GUARDRAILS:
  • Remain strictly neutral and impartial at all times.
  • Treat all case information as highly confidential, particularly sensitive family details.
  • Maintain a formal, respectful, and objective tone — family disputes are personal and
    emotionally sensitive; avoid moralising or expressing personal opinion on either party.
  • Do not volunteer the current date/time unless explicitly asked.
  • Always include the caveat that judicial mind must be independently applied."""


# ══════════════════════════════════════════════════════════════════
# CONTEXTUALIZATION PROMPT
# Rephrases follow-up queries into standalone legal questions.
# ══════════════════════════════════════════════════════════════════

FAMILY_CONTEXTUALIZE_PROMPT = """You are assisting a Judge of a family court in Pakistan.
Given the judicial conversation history and the Judge's latest query
(which may reference prior discussion about a case, a party, or a legal point),
rewrite the query as a fully self-contained legal research question
that can be understood without the conversation history.

Examples of correct rephrasing:
  Judge asks: "What is the quantum of maintenance here?"
  → Rephrase to: "How is the quantum of maintenance (nafaqa) determined for a wife and
    minor children under Section 9 of the West Pakistan Family Courts Act 1964?"

  Judge asks: "What about the deferred dower?"
  → Rephrase to: "What are the principles governing recovery of deferred (mu'wajjal) dower
    in a dower recovery suit under Pakistani family law?"

  Judge asks: "And custody of the minor?"
  → Rephrase to: "What is the mother's right of hizanat (custody) over a minor child under
    Muslim personal law as applied in Pakistan, subject to the welfare principle?"

  Judge asks: "Is this ground for dissolution valid?"
  → Rephrase to: "What are the grounds for judicial dissolution of marriage under Section 2
    of the Dissolution of Muslim Marriages Act 1939?"

Do NOT answer the question — only rephrase it. If it is already self-contained,
return it unchanged."""


# ══════════════════════════════════════════════════════════════════
# MAIN AGENT CLASS
# ══════════════════════════════════════════════════════════════════

class JudicialGPTFamilyAgent:
    """
    JudicialGPT Family Law RAG Agent.

    Wraps the Pakistan family law FAISS knowledge base with the
    JudicialGPT family system prompt and exposes a conversational
    interface for judges to conduct legal research and draft judgments.
    """

    def __init__(self):
        print("\n👨‍👩‍👧  Initialising JudicialGPT Family Law Agent...\n")
        self.config       = FamilyConfig()
        self.llm          = self._load_llm()
        self.embeddings   = self._load_embeddings()
        self.vector_store = self._load_vector_store()
        self.retriever    = self._build_retriever()
        self._sessions: dict[str, ChatMessageHistory] = {}
        self.chain        = self._build_chain()
        print("✅  JudicialGPT Family Agent ready.\n")

    # ── LLM ───────────────────────────────────────────────────────
    def _load_llm(self) -> ChatGoogleGenerativeAI:
        key = os.getenv("GOOGLE_API_KEY")
        if not key:
            raise EnvironmentError(
                "GOOGLE_API_KEY not found.\n"
                "Add it to .env — get a key at https://aistudio.google.com/apikey"
            )
        print(f"   🤖  LLM       : {self.config.GEMINI_MODEL}")
        return ChatGoogleGenerativeAI(
            model=self.config.GEMINI_MODEL,
            temperature=self.config.TEMPERATURE,
            max_tokens=self.config.MAX_TOKENS,
            google_api_key=key,
        )

    # ── Embeddings ────────────────────────────────────────────────
    def _load_embeddings(self) -> HuggingFaceEmbeddings:
        print(f"   🔢  Embeddings : {self.config.EMBEDDING_MODEL}")
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
                f"Family law vector store not found at: {path}\n"
                "Run  python ingest_family.py  first to build the index."
            )
        print(f"   📂  Vector store: {path}")
        return FAISS.load_local(
            path, self.embeddings,
            allow_dangerous_deserialization=True,
        )

    # ── Retriever ─────────────────────────────────────────────────
    def _build_retriever(self):
        """
        MMR retriever — fetches diverse chunks from across different
        statutes rather than returning similar sections repeatedly.
        Useful for family judgment drafting which may cite the MFLO,
        Family Courts Act, Dissolution Act, and Guardians and Wards
        Act simultaneously.
        """
        print(f"   🔍  Retriever  : MMR  k={self.config.RETRIEVER_K}")
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
            ("system", FAMILY_CONTEXTUALIZE_PROMPT),
            MessagesPlaceholder("chat_history"),
            ("human", "{input}"),
        ])

        history_aware_retriever = create_history_aware_retriever(
            self.llm, self.retriever, ctx_prompt
        )

        # ── Step 2: JudicialGPT family answer generation ──────────
        qa_prompt = ChatPromptTemplate.from_messages([
            ("system", FAMILY_SYSTEM_PROMPT),
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
        Each judge / family case can have its own isolated session_id.
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
        Submit a judicial query to JudicialGPT Family Agent.

        Args:
            query      : The judge's question or instruction
                         (e.g. "What are the grounds for khula?",
                          "Draft findings on the issue of maintenance.",
                          "What is the welfare-of-minor test in custody cases?")
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
║          J U D I C I A L G P T   —   F A M I L Y                    ║
║          Family Law Research & Judgment Drafting Assistant           ║
║          Pakistan Family Law Knowledge Base                          ║
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
    "What are the grounds for judicial dissolution of marriage under the 1939 Act?",
    "Draft findings on the issue of maintenance (nafaqa) for the wife and minor children.",
    "What is the difference between prompt and deferred dower?",
    "Explain the welfare-of-minor principle in custody (hizanat) disputes.",
    "What is the arbitration council procedure for talaq under the MFLO 1961?",
    "Draft a decree template for a khula suit.",
    "What is talaq-e-tafweez and how is it exercised?",
    "Explain the procedure for a guardianship petition under the Guardians and Wards Act 1890.",
    "What is the summary procedure under Section 17 of the Family Courts Act 1964?",
    "How is dower treated when divorce is initiated by the wife versus the husband?",
]


def main():
    print(BANNER)

    print("📋  Sample judicial queries:")
    for i, q in enumerate(SAMPLE_QUERIES, 1):
        print(f"   {i}. {q}")
    print()

    agent        = JudicialGPTFamilyAgent()
    show_sources = True
    session_id   = "case_default"

    while True:
        try:
            raw = input(f"\n👨‍⚖️  Judge [{session_id}]: ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\n\nJudicialGPT Family session ended.\n")
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
                print("   Usage: session <case_id>  e.g.  session family_case_101")
            continue

        # ── Submit to JudicialGPT ─────────────────────────────────
        print("\n👨‍👩‍👧  JudicialGPT:\n")
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
