# """
# JudicialGPT – FastAPI Server
# Pakistan Civil Courts RAG Application
# ─────────────────────────────────────
# INSTALLATION:
#     pip install fastapi uvicorn langchain langchain-community langchain-groq \
#                 langchain-huggingface faiss-cpu sentence-transformers \
#                 python-dotenv

# RUN:
#     uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# ENDPOINTS:
#     GET  /              → health check
#     GET  /health        → detailed health + model info
#     POST /chat          → standard chat (full response)
#     POST /chat/stream   → streaming chat (SSE token-by-token)
#     POST /chat/history  → multi-turn conversation with history
#     DELETE /chat/history/{session_id} → clear a session
#     GET  /sessions      → list active sessions
# """

# import os
# import asyncio
# from contextlib import asynccontextmanager
# from typing import AsyncGenerator
# from uuid import uuid4

# from dotenv import load_dotenv
# from fastapi import FastAPI, HTTPException, Request
# from fastapi.middleware.cors import CORSMiddleware
# from fastapi.responses import StreamingResponse
# from pydantic import BaseModel, Field

# # ── LangChain v0.3+ ──────────────────────────────────────────────────────────
# from langchain_groq import ChatGroq
# from langchain_huggingface import HuggingFaceEmbeddings
# from langchain_community.vectorstores import FAISS
# from langchain_core.documents import Document
# from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
# from langchain_core.prompts import (
#     ChatPromptTemplate,
#     FewShotChatMessagePromptTemplate,
#     MessagesPlaceholder,
# )
# from langchain_core.output_parsers import StrOutputParser
# from langchain_core.runnables import RunnablePassthrough, RunnableLambda

# load_dotenv()

# # ── Document export (Markdown → .docx → Google Drive) ───────────────────────
# # Fully separate from the RAG/LLM chain — only ever called on the *final*
# # markdown string the chain has already produced.
# from document_export import should_generate_document, export_markdown_as_docx


# # ══════════════════════════════════════════════════════════════════════════════
# # 1. KNOWLEDGE BASE
# # ══════════════════════════════════════════════════════════════════════════════

# KNOWLEDGE_DOCS = [
#     Document(
#         page_content="""
# PAKISTAN CIVIL JUDGMENT – MANDATORY STRUCTURAL FORMAT
# (Code of Civil Procedure 1908, Order XX Rule 4)

# SECTION 1 – COURT HEADING (Caption Block)
#   • Name of Court  (e.g. "In the Court of Civil Judge 1st Class, Lahore")
#   • Suit Number and Year  (e.g. "Civil Suit No. 245/2023")
#   • Plaintiff: [Full Name] s/o [Father's Name], r/o [Address]
#   • Defendant: [Full Name] s/o [Father's Name], r/o [Address]
#   • Nature of Suit  (e.g. "Suit for Declaration and Permanent Injunction")
#   • Counsel for Plaintiff / Defendant
#   • Date of Institution | Date of Decision

# SECTION 2 – CONCISE STATEMENT OF THE CASE
#   • Summary of plaintiff's claim (plaint averments)
#   • Summary of defendant's reply (written statement)
#   • Procedural history

# SECTION 3 – FRAMING OF ISSUES  (Order XIV Rule 1 CPC)
#   Numbered questions of law and fact, e.g.:
#     Issue No.1: Whether the plaintiff is entitled to a decree for declaration?
#     Issue No.2: Whether the suit is barred by limitation?
#     Issue No.3: Relief.

# SECTION 4 – EVIDENCE SUMMARY
#   • Plaintiff's witnesses: PW-1, PW-2 … with role
#   • Defendant's witnesses: DW-1, DW-2 … with role
#   • Documentary exhibits: Exh.P-1, Exh.D-1, etc.
#   • Arguments of counsel

# SECTION 5 – FINDINGS ON ISSUES  (Order XX Rule 5 CPC)
#   For EACH issue separately:
#     ISSUE No.__ [Re-state issue]
#     Finding:  [in favour of / against whom]
#     Reasons:  [evidence appreciation + law + precedents (PLD/SCMR/CLC)]

# SECTION 6 – LEGAL DISCUSSION & PRECEDENTS
#   • Relevant statutes (CPC, Specific Relief Act 1877, TP Act 1882, etc.)
#   • Binding precedents: SCMR / PLD SC (Supreme Court — binding on all courts)
#   • High Court: PLD Lah. / CLC / MLD (binding within province)

# SECTION 7 – CONCLUSION / OPERATIVE PART
#   "In view of the above findings, the suit is DECREED / DISMISSED."
#   Specify exact relief. Costs order under Section 35 CPC.

# SECTION 8 – DECREE  (Order XX Rule 6 CPC — separate document)
#   Formal expression of adjudication; signed, sealed, dated.

# PROCEDURAL RULES:
#   • Judgment MUST be written and signed (Order XX Rule 3)
#   • Pronounced in open court (Order XX Rule 1)
#   • Must be pronounced within 90 days of conclusion of arguments
#   • Language: English or Urdu (both permissible)
#   • Oral judgments have NO legal validity in Pakistan
# """,
#         metadata={"source": "CPC_Order_XX_Format", "type": "structure"},
#     ),
#     Document(
#         page_content="""
# PAKISTAN CIVIL JUDGMENT – EVIDENCE APPRECIATION RULES

# BURDEN OF PROOF: On the plaintiff — Section 101 Qanun-e-Shahadat Order 1984.
# STANDARD OF PROOF: Balance of probabilities (civil standard).

# WITNESS EVALUATION:
#   - Demeanour remarks must be based on observed evidence, not personal opinion.
#   - References: PW-1, PW-2 (plaintiff's witnesses); DW-1, DW-2 (defendant's).

# DOCUMENTARY EVIDENCE:
#   - Registered documents carry strong presumption of authenticity.
#   - Originals preferred; secondary evidence requires justification.

# APPRECIATION vs. MARSHALLING:
#   - Appreciate each piece of evidence individually.
#   - Marshal accepted evidence under relevant issues.

# ADVERSE INFERENCE: Article 129(g) Qanun-e-Shahadat Order 1984 — if a party
# withholds material evidence, court may draw adverse inference.

# CITATION FORMAT:
#   • Supreme Court : 2023 SCMR 1234  |  PLD 2023 SC 456
#   • Lahore HC     : 2023 CLC 789    |  PLD 2023 Lah. 100
#   • Sindh HC      : 2022 MLD 500    |  PLD 2022 Kar. 200
#   • Islamabad HC  : 2023 CLD 400

# BINDING HIERARCHY:
#   1. Supreme Court of Pakistan (binding on all courts)
#   2. Full Bench → Division Bench → Single Bench of relevant High Court
#   3. Other provincial High Courts (persuasive only)
# """,
#         metadata={"source": "Evidence_Rules", "type": "evidence"},
#     ),
#     Document(
#         page_content="""
# PAKISTAN CIVIL JUDGMENT – DRAFTING STANDARDS
# (Punjab Judicial Academy Guidelines | FJA Article by Justice Shafiur Rahman)

# LANGUAGE:
#   • Simple, precise, reader-friendly language.
#   • Avoid Latin phrases without explanation.
#   • Avoid abbreviations, code words, disparaging remarks.
#   • Temperate and objective tone at all times.

# STYLE:
#   • Do NOT reproduce pleadings verbatim — summarise concisely.
#   • Every finding must carry reasons; bare findings are insufficient.
#   • Ratio decidendi must be clearly stated.
#   • Cross-reference evidence by exhibit number (Exh.P-1, Exh.D-1).
#   • Use "Plaintiff" and "Defendant" consistently (not names repeatedly).

# WHAT TO AVOID:
#   ✗ Unnecessarily long judgments — brevity + completeness is the ideal.
#   ✗ Verbatim copying from pleadings or other judgments.
#   ✗ Personal opinions unconnected to evidence.
#   ✗ Contradictory findings on the same issue.
#   ✗ Omitting a finding on any framed issue.
# """,
#         metadata={"source": "Drafting_Standards_PJA", "type": "style"},
#     ),
#     Document(
#         page_content="""
# PAKISTAN CIVIL JUDGMENT – COMMON SUIT TYPES & TYPICAL ISSUES

# SUIT FOR DECLARATION (S.42 Specific Relief Act 1877)
#   Issues: (1) Entitlement to declaration? (2) Limitation? (3) Relief.
#   Note: Plaintiff must show a present legal right. Limitation = 6 years.

# SUIT FOR PERMANENT INJUNCTION (S.54 Specific Relief Act 1877)
#   Issues: (1) Legal right? (2) Infringement/threat? (3) Relief.
#   Note: Three conditions — legal right, infringement, no adequate remedy at law.

# SUIT FOR SPECIFIC PERFORMANCE (S.12 Specific Relief Act 1877)
#   Issues: (1) Valid contract? (2) Plaintiff ready and willing to perform?
#           (3) Defendant's refusal? (4) Relief.
#   Note: Equitable discretion of court; hardship to defendant is relevant.

# SUIT FOR RECOVERY OF MONEY
#   Issues: (1) Indebtedness? (2) Amount due? (3) Relief.

# PRE-EMPTION SUIT (Punjab Pre-emption Act 1991)
#   Issues: (1) Right of pre-emption? (2) Sale without notice to plaintiff?
#           (3) Limitation? (4) Relief.
#   Special: Order XX Rule 14 CPC — decree must specify exact deposit date.

# SUIT FOR POSSESSION
#   Issues: (1) Ownership/possessory right? (2) Unlawful dispossession?
#           (3) Limitation? (4) Relief.
# """,
#         metadata={"source": "Suit_Types_Pakistan", "type": "suit_types"},
#     ),
# ]


# # ══════════════════════════════════════════════════════════════════════════════
# # 2. FEW-SHOT EXAMPLES
# # ══════════════════════════════════════════════════════════════════════════════

# FEW_SHOT_EXAMPLES = [
#     {
#         "input": (
#             "Write the heading and statement of case for a suit for declaration "
#             "of title filed by Muhammad Aslam against Ghulam Hussain in Civil Court Lahore."
#         ),
#         "output": """
# IN THE COURT OF CIVIL JUDGE 1ST CLASS, LAHORE

# Civil Suit No. 312 of 2022

# Muhammad Aslam s/o Muhammad Yaqoob, r/o House No. 45, Street 7,
# Gulshan-e-Ravi, Lahore                                         … Plaintiff

#                                     VERSUS

# Ghulam Hussain s/o Noor Muhammad, r/o House No. 12, Shadman Colony,
# Lahore                                                         … Defendant

# NATURE OF SUIT : Suit for Declaration of Title and Permanent Injunction
# Counsel for Plaintiff  : Mr. Tariq Mahmood, Advocate
# Counsel for Defendant  : Mr. Rashid Anwar, Advocate
# Date of Institution    : 15.03.2022
# Date of Decision       : 10.11.2023

# ─────────────────────────────────────────────────────────────────────
# JUDGMENT
# ─────────────────────────────────────────────────────────────────────

# 1. STATEMENT OF THE CASE

# The Plaintiff instituted the present suit seeking a declaration that he is
# the lawful owner of property bearing Khasra No. 1045, measuring 5 Marlas,
# situated in Mouza Shahdara, Lahore ("suit property"), together with a
# permanent injunction restraining the Defendant from interfering with his
# peaceful possession thereof.

# The Plaintiff's case is that he purchased the suit property from Haji Karim
# Bakhsh vide registered Sale Deed No. 1234 dated 20.01.2015, duly registered
# before the Sub-Registrar, Lahore, and has been in continuous, peaceful
# possession since. The Defendant, without any lawful authority, has threatened
# to dispossess the Plaintiff on the basis of a forged document.

# The Defendant denied all allegations and claimed ownership through inheritance
# from his late father, contending that the Sale Deed is fictitious.

# On the divergent pleadings, the following issues were framed on 05.07.2022.
# """,
#     },
#     {
#         "input": (
#             "Draft the issues, evidence summary, and issue-wise findings for "
#             "a property suit where the dispute is about the validity of a sale deed."
#         ),
#         "output": """
# 2. ISSUES

#   Issue No. 1 : Whether the Plaintiff is the lawful owner of the suit property
#                 by virtue of Sale Deed dated 20.01.2015?
#   Issue No. 2 : Whether the said Sale Deed is genuine, valid, and duly executed?
#   Issue No. 3 : Whether the Defendant has any lawful right or title to the suit property?
#   Issue No. 4 : Whether the suit is within time?
#   Issue No. 5 : Relief.

# ─────────────────────────────────────────────────────────────────────
# 3. EVIDENCE
# ─────────────────────────────────────────────────────────────────────

# The Plaintiff produced himself as PW-1 and examined PW-2 (Muhammad Yousaf,
# marginal witness of the Sale Deed). Documentary exhibits tendered:
#   Exh.P-1 — Original registered Sale Deed dated 20.01.2015
#   Exh.P-2 — Fard Malkiat (Record of Rights)
#   Exh.P-3 — Stamp Duty Receipt

# The Defendant appeared as DW-1 and produced DW-2 (a neighbour). Exhibit:
#   Exh.D-1 — Purported Wasiyatnama (Will) in Defendant's favour

# Both counsel addressed final arguments on 25.10.2023.

# ─────────────────────────────────────────────────────────────────────
# 4. FINDINGS ON ISSUES
# ─────────────────────────────────────────────────────────────────────

# ISSUE No. 1 & 2 (taken together):
#   Finding: In favour of the Plaintiff.
#   Reasons: The original registered Sale Deed (Exh.P-1) carries a strong
#   presumption of correctness under Article 73 Qanun-e-Shahadat Order 1984.
#   PW-2 fully corroborated its execution. Exh.P-2 records the Plaintiff as owner.
#   The Defendant's Wasiyatnama (Exh.D-1) is unregistered; DW-2 could not
#   substantiate its execution. Reliance placed on PLD 2019 SC 304.
#   Issues decided in favour of the Plaintiff.

# ISSUE No. 3:
#   Finding: In the negative. Defendant failed to establish any title.

# ISSUE No. 4 (Limitation):
#   Finding: Suit instituted within six years — within Article 120 Limitation
#   Act 1908. Issue decided in favour of the Plaintiff.
# """,
#     },
#     {
#         "input": "Write the conclusion, operative part, and decree for a decreed declaration suit.",
#         "output": """
# 5. CONCLUSION

# In view of the findings on all issues, the Plaintiff has successfully established
# his title to the suit property. The Defendant has failed to rebut the Plaintiff's
# case with credible evidence.

# ─────────────────────────────────────────────────────────────────────
# 6. OPERATIVE PART
# ─────────────────────────────────────────────────────────────────────

# Consequently, the suit is hereby DECREED in the following terms:

#   (i)   It is declared that the Plaintiff, Muhammad Aslam s/o Muhammad Yaqoob,
#         is the lawful owner of property bearing Khasra No. 1045, measuring
#         5 Marlas, situated in Mouza Shahdara, Lahore.
#   (ii)  The Defendant, his agents and servants, are permanently restrained from
#         interfering with the Plaintiff's peaceful possession.
#   (iii) Costs of the suit are awarded to the Plaintiff under Section 35 CPC.

# Announced in open court on 10.11.2023.

#                                                        (Signature)
#                                              Civil Judge 1st Class, Lahore

# ─────────────────────────────────────────────────────────────────────
# DECREE
# ─────────────────────────────────────────────────────────────────────

# Civil Suit No. 312 of 2022
# Date of Judgment : 10.11.2023  |  Date of Decree : 10.11.2023

#   1. Plaintiff declared lawful owner of Khasra No. 1045, 5 Marlas, Mouza Shahdara.
#   2. Permanent injunction against the Defendant as described above.
#   3. Costs payable by the Defendant to the Plaintiff.

# Drawn up by: _______________        Signed: _______________
#              Reader/Nazir                   Civil Judge 1st Class, Lahore
#              Date: 10.11.2023              Date: 10.11.2023   [Court Seal]
# """,
#     },
# ]


# # ══════════════════════════════════════════════════════════════════════════════
# # 3. SYSTEM PROMPTS
# # ══════════════════════════════════════════════════════════════════════════════

# SYSTEM_PROMPT = """You are 'JudicialGPT,' an AI Assistant exclusively designed to serve and
# support Judges within the judicial system of Pakistan.

# CORE IDENTITY:
# When asked for an introduction, respond with:
# "I am JudicialGPT, a specialised AI assistant designed to support judges in their duties.
# I am trained on Pakistani legal jurisprudence, procedural law under the Code of Civil
# Procedure 1908, and judicial processes. My primary function is to assist with drafting
# civil judgments, legal research, and case management. I am proficient in both English
# and Urdu."

# PRIMARY ROLE — CIVIL JUDGMENT DRAFTING:
# You assist judges in drafting well-structured, legally sound civil judgments strictly
# following the Pakistan civil court format mandated by Order XX Rule 4 CPC:
#   1. Court Heading
#   2. Statement of the Case
#   3. Framing of Issues
#   4. Evidence Summary
#   5. Issue-wise Findings with Reasons
#   6. Legal Discussion & Precedents
#   7. Conclusion / Operative Part
#   8. Decree

# MANDATORY RULES:
#   • Every finding must carry detailed reasons — bare findings are impermissible.
#   • Cite relevant Pakistani precedents (SCMR, PLD, CLC, MLD) where applicable.
#   • Reference evidence by exhibit numbers (Exh.P-1, Exh.D-1) and witnesses (PW-1, DW-1).
#   • Use formal, temperate, precise language — no abbreviations or slang.
#   • Standard of proof: balance of probabilities in civil matters.
#   • Burden of proof lies on the plaintiff under Section 101 Qanun-e-Shahadat Order 1984.

# CONTEXT FROM KNOWLEDGE BASE:
# Use the following retrieved context to inform your response:
# {context}

# BEHAVIOURAL GUARDRAILS:
#   • Remain strictly neutral and impartial at all times.
#   • Treat all case information as highly confidential.
#   • Maintain a formal, respectful, and objective tone.
#   • Do not volunteer the current date/time unless explicitly asked."""

# # System prompt variant for the history-aware chain (no {context} placeholder
# # — context is injected dynamically via a RunnableLambda)
# HISTORY_SYSTEM_PROMPT = """You are 'JudicialGPT,' an AI Assistant exclusively designed to serve and
# support Judges within the judicial system of Pakistan.

# You assist judges in drafting well-structured civil judgments following Order XX Rule 4 CPC:
#   1. Court Heading  2. Statement of the Case  3. Issues  4. Evidence Summary
#   5. Issue-wise Findings  6. Legal Discussion & Precedents
#   7. Conclusion / Operative Part  8. Decree

# MANDATORY RULES:
#   • Every finding must carry detailed reasons.
#   • Cite Pakistani precedents (SCMR, PLD, CLC, MLD) where applicable.
#   • Reference evidence as Exh.P-1 / Exh.D-1 and witnesses as PW-1 / DW-1.
#   • Use formal, temperate, precise language.
#   • Standard of proof: balance of probabilities.
#   • Burden of proof on plaintiff under Section 101 Qanun-e-Shahadat Order 1984.

# RETRIEVED CONTEXT:
# {context}

# Remain strictly neutral, confidential, and objective at all times."""


# # ══════════════════════════════════════════════════════════════════════════════
# # 4. RAG ENGINE (singleton — built once at startup)
# # ══════════════════════════════════════════════════════════════════════════════

# class RAGEngine:
#     def __init__(self):
#         self.vectorstore: FAISS | None = None
#         self.rag_chain = None
#         self.history_chain = None
#         self.llm: ChatGroq | None = None
#         self.retriever = None

#     def build(self):
#         api_key = os.getenv("GROQ_API_KEY")
#         if not api_key:
#             raise RuntimeError("GROQ_API_KEY environment variable is not set.")

#         # Embeddings + Vector Store
#         embeddings = HuggingFaceEmbeddings(
#             model_name="sentence-transformers/all-MiniLM-L6-v2",
#             model_kwargs={"device": "cpu"},
#         )
#         self.vectorstore = FAISS.from_documents(KNOWLEDGE_DOCS, embeddings)
#         self.retriever = self.vectorstore.as_retriever(search_kwargs={"k": 3})

#         # LLM
#         self.llm = ChatGroq(
#             model="llama-3.3-70b-versatile",
#             temperature=0.2,
#             groq_api_key=os.getenv("GROQ_API_KEY"),
#         )

#         # ── Standard RAG chain (stateless) ───────────────────────────────────
#         example_prompt = ChatPromptTemplate.from_messages([
#             ("human", "{input}"),
#             ("ai", "{output}"),
#         ])
#         few_shot = FewShotChatMessagePromptTemplate(
#             example_prompt=example_prompt,
#             examples=FEW_SHOT_EXAMPLES,
#         )
#         prompt = ChatPromptTemplate.from_messages([
#             ("system", SYSTEM_PROMPT),
#             few_shot,
#             ("human", "{question}"),
#         ])

#         def format_docs(docs: list[Document]) -> str:
#             return "\n\n---\n\n".join(d.page_content for d in docs)

#         self.rag_chain = (
#             {
#                 "context": self.retriever | format_docs,
#                 "question": RunnablePassthrough(),
#             }
#             | prompt
#             | self.llm
#             | StrOutputParser()
#         )

#         # ── History-aware chain ───────────────────────────────────────────────
#         history_prompt = ChatPromptTemplate.from_messages([
#             ("system", HISTORY_SYSTEM_PROMPT),
#             few_shot,
#             MessagesPlaceholder(variable_name="chat_history"),
#             ("human", "{question}"),
#         ])

#         def inject_context(inputs: dict) -> dict:
#             docs = self.retriever.invoke(inputs["question"])
#             inputs["context"] = format_docs(docs)
#             return inputs

#         self.history_chain = (
#             RunnableLambda(inject_context)
#             | history_prompt
#             | self.llm
#             | StrOutputParser()
#         )


# rag_engine = RAGEngine()

# # In-memory session store  { session_id: [HumanMessage | AIMessage] }
# session_store: dict[str, list] = {}


# # ══════════════════════════════════════════════════════════════════════════════
# # 5. FASTAPI APP — lifespan startup
# # ══════════════════════════════════════════════════════════════════════════════

# @asynccontextmanager
# async def lifespan(app: FastAPI):
#     print("⚙️  Building RAG engine (embeddings + vector store + Groq LLM)...")
#     await asyncio.get_event_loop().run_in_executor(None, rag_engine.build)
#     print("✅  JudicialGPT RAG engine is ready.")
#     yield
#     print("🛑  Shutting down JudicialGPT.")


# app = FastAPI(
#     title="JudicialGPT API",
#     description=(
#         "RAG-powered API for Pakistan Civil Court judgment drafting. "
#         "Backed by Groq (llama-3.3-70b) and LangChain v0.3+."
#     ),
#     version="1.0.0",
#     lifespan=lifespan,
# )

# # ── CORS — allow all origins (restrict in production) ────────────────────────
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )


# # ══════════════════════════════════════════════════════════════════════════════
# # 6. PYDANTIC SCHEMAS
# # ══════════════════════════════════════════════════════════════════════════════

# class ChatRequest(BaseModel):
#     query: str = Field(..., min_length=1, description="Judge's query or instruction")


# class DocumentInfo(BaseModel):
#     title: str
#     doc_type: str
#     download_url: str
#     view_url: str


# class ChatResponse(BaseModel):
#     query: str
#     response: str
#     sources: list[str] = Field(default_factory=list)
#     document: DocumentInfo | None = None


# class HistoryChatRequest(BaseModel):
#     session_id: str = Field(
#         default_factory=lambda: str(uuid4()),
#         description="Unique session ID for conversation continuity",
#     )
#     query: str = Field(..., min_length=1)


# class HistoryChatResponse(BaseModel):
#     session_id: str
#     query: str
#     response: str
#     sources: list[str] = Field(default_factory=list)
#     turn: int = Field(description="Turn number in this session")
#     document: DocumentInfo | None = None


# class SessionInfo(BaseModel):
#     session_id: str
#     turns: int
#     preview: str = Field(description="First user message preview")


# class HealthResponse(BaseModel):
#     status: str
#     model: str
#     embeddings: str
#     vector_store_docs: int
#     sessions_active: int


# # ══════════════════════════════════════════════════════════════════════════════
# # 7. HELPERS
# # ══════════════════════════════════════════════════════════════════════════════

# def get_source_names(query: str) -> list[str]:
#     """Return metadata source names from retrieved docs for a given query."""
#     if rag_engine.retriever is None:
#         return []
#     docs = rag_engine.retriever.invoke(query)
#     return list({d.metadata.get("source", "unknown") for d in docs})


# def _make_doc_title(query: str) -> str:
#     """Short, filesystem-safe title derived from the user's query."""
#     words = query.strip().split()
#     return " ".join(words[:8]) if words else "Judgment"


# def run_document_export(query: str, response_markdown: str) -> DocumentInfo | None:
#     """
#     Blocking function — call it via run_in_executor from async routes.

#     Runs strictly AFTER the LLM has already produced its full markdown
#     answer. Never touches the RAG chain, prompt, or model call — only
#     converts+uploads the string the chain already returned. Wrapped in
#     try/except so a Drive/export failure never breaks the chat response.
#     """
#     if not should_generate_document(query):
#         return None
#     try:
#         title = _make_doc_title(query)
#         result = export_markdown_as_docx(response_markdown, title)
#         return DocumentInfo(
#             title=result.title,
#             doc_type=result.doc_type,
#             download_url=result.download_url,
#             view_url=result.view_url,
#         )
#     except Exception as exc:
#         print(f"⚠️  Document export failed (chat still succeeded): {exc}")
#         return None


# async def stream_rag_response(query: str) -> AsyncGenerator[str, None]:
#     """Yield SSE-formatted tokens from the RAG chain."""
#     if rag_engine.rag_chain is None:
#         yield "data: [ERROR] RAG engine not initialised.\n\n"
#         return

#     # Retrieve context synchronously (fast, CPU-bound)
#     context_docs = await asyncio.get_event_loop().run_in_executor(
#         None, rag_engine.retriever.invoke, query
#     )
#     context = "\n\n---\n\n".join(d.page_content for d in context_docs)

#     # Stream tokens from the LLM
#     example_prompt = ChatPromptTemplate.from_messages([
#         ("human", "{input}"),
#         ("ai", "{output}"),
#     ])
#     few_shot = FewShotChatMessagePromptTemplate(
#         example_prompt=example_prompt,
#         examples=FEW_SHOT_EXAMPLES,
#     )
#     prompt = ChatPromptTemplate.from_messages([
#         ("system", SYSTEM_PROMPT),
#         few_shot,
#         ("human", "{question}"),
#     ])

#     messages = await prompt.ainvoke({"context": context, "question": query})

#     async for chunk in rag_engine.llm.astream(messages):
#         token = chunk.content
#         if token:
#             # SSE format: "data: <token>\n\n"
#             yield f"data: {token}\n\n"

#     yield "data: [DONE]\n\n"


# # ══════════════════════════════════════════════════════════════════════════════
# # 8. ROUTES
# # ══════════════════════════════════════════════════════════════════════════════

# # ── Root ─────────────────────────────────────────────────────────────────────
# @app.get("/", tags=["Health"])
# async def root():
#     return {
#         "service": "JudicialGPT API",
#         "status": "running",
#         "docs": "/docs",
#     }


# # ── Health ───────────────────────────────────────────────────────────────────
# @app.get("/health", response_model=HealthResponse, tags=["Health"])
# async def health():
#     if rag_engine.vectorstore is None:
#         raise HTTPException(status_code=503, detail="RAG engine not ready.")
#     return HealthResponse(
#         status="healthy",
#         model="llama-3.3-70b-versatile (Groq)",
#         embeddings="sentence-transformers/all-MiniLM-L6-v2",
#         vector_store_docs=rag_engine.vectorstore.index.ntotal,
#         sessions_active=len(session_store),
#     )


# # ── Standard Chat (full response) ────────────────────────────────────────────
# @app.post("/chat", response_model=ChatResponse, tags=["Chat"])
# async def chat(request: ChatRequest):
#     """
#     Send a query and receive the full judgment draft or legal answer.
#     Best for frontend components that render the entire response at once.
#     """
#     if rag_engine.rag_chain is None:
#         raise HTTPException(status_code=503, detail="RAG engine not ready.")

#     try:
#         response = await asyncio.get_event_loop().run_in_executor(
#             None, rag_engine.rag_chain.invoke, request.query
#         )
#         sources = get_source_names(request.query)

#         # ── Document export (runs only if the query implies a document
#         #    request; converts the markdown already produced above) ────────
#         document = await asyncio.get_event_loop().run_in_executor(
#             None, run_document_export, request.query, response
#         )

#         return ChatResponse(
#             query=request.query, response=response, sources=sources, document=document
#         )

#     except Exception as exc:
#         raise HTTPException(status_code=500, detail=str(exc))


# # ── Streaming Chat (SSE) ──────────────────────────────────────────────────────
# @app.post("/chat/stream", tags=["Chat"])
# async def chat_stream(request: ChatRequest):
#     """
#     Stream the response token-by-token using Server-Sent Events (SSE).
#     Frontend should consume with EventSource or fetch + ReadableStream.

#     SSE format:
#         data: <token>\\n\\n   (for each token)
#         data: [DONE]\\n\\n    (end of stream)
#     """
#     if rag_engine.llm is None:
#         raise HTTPException(status_code=503, detail="RAG engine not ready.")

#     return StreamingResponse(
#         stream_rag_response(request.query),
#         media_type="text/event-stream",
#         headers={
#             "Cache-Control": "no-cache",
#             "X-Accel-Buffering": "no",        # Disable nginx buffering
#             "Connection": "keep-alive",
#         },
#     )


# # ── History-aware Chat ────────────────────────────────────────────────────────
# @app.post("/chat/history", response_model=HistoryChatResponse, tags=["Chat"])
# async def chat_with_history(request: HistoryChatRequest):
#     """
#     Multi-turn conversation. Pass the same session_id across turns to maintain
#     context. A new session_id starts a fresh conversation.
#     """
#     if rag_engine.history_chain is None:
#         raise HTTPException(status_code=503, detail="RAG engine not ready.")

#     # Initialise session if new
#     if request.session_id not in session_store:
#         session_store[request.session_id] = []

#     history = session_store[request.session_id]

#     try:
#         response = await asyncio.get_event_loop().run_in_executor(
#             None,
#             rag_engine.history_chain.invoke,
#             {"question": request.query, "chat_history": history},
#         )

#         # Persist messages
#         history.append(HumanMessage(content=request.query))
#         history.append(AIMessage(content=response))

#         sources = get_source_names(request.query)
#         turn = len(history) // 2   # Each turn = 1 human + 1 AI message

#         document = await asyncio.get_event_loop().run_in_executor(
#             None, run_document_export, request.query, response
#         )

#         return HistoryChatResponse(
#             session_id=request.session_id,
#             query=request.query,
#             response=response,
#             sources=sources,
#             turn=turn,
#             document=document,
#         )

#     except Exception as exc:
#         raise HTTPException(status_code=500, detail=str(exc))


# # ── Clear Session ─────────────────────────────────────────────────────────────
# @app.delete("/chat/history/{session_id}", tags=["Sessions"])
# async def clear_session(session_id: str):
#     """Clear all conversation history for a given session."""
#     if session_id not in session_store:
#         raise HTTPException(status_code=404, detail="Session not found.")
#     del session_store[session_id]
#     return {"message": f"Session '{session_id}' cleared successfully."}


# # ── List Sessions ─────────────────────────────────────────────────────────────
# @app.get("/sessions", response_model=list[SessionInfo], tags=["Sessions"])
# async def list_sessions():
#     """List all active session IDs with turn count and first message preview."""
#     sessions = []
#     for sid, history in session_store.items():
#         human_msgs = [m for m in history if isinstance(m, HumanMessage)]
#         preview = human_msgs[0].content[:80] + "…" if human_msgs else ""
#         sessions.append(
#             SessionInfo(
#                 session_id=sid,
#                 turns=len(human_msgs),
#                 preview=preview,
#             )
#         )
#     return sessions













"""
JudicialGPT – FastAPI Server
Pakistan Civil Courts RAG Application
─────────────────────────────────────
INSTALLATION:
    pip install fastapi uvicorn langchain langchain-community langchain-groq \
                langchain-huggingface faiss-cpu sentence-transformers \
                python-dotenv

RUN:
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload

ENDPOINTS:
    GET  /              → health check
    GET  /health        → detailed health + model info
    POST /chat          → standard chat (full response)
    POST /chat/stream   → streaming chat (SSE token-by-token)
    POST /chat/history  → multi-turn conversation with history
    DELETE /chat/history/{session_id} → clear a session
    GET  /sessions      → list active sessions
"""

import os
import json
import asyncio
from contextlib import asynccontextmanager
from typing import AsyncGenerator
from uuid import uuid4

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from pydantic import BaseModel, Field

# ── LangChain v0.3+ ──────────────────────────────────────────────────────────
from langchain_groq import ChatGroq
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_core.prompts import (
    ChatPromptTemplate,
    FewShotChatMessagePromptTemplate,
    MessagesPlaceholder,
)
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough, RunnableLambda

load_dotenv()

# ── Document export (Markdown → .docx → Google Drive) ───────────────────────
# Fully separate from the RAG/LLM chain — only ever called on the *final*
# markdown string the chain has already produced.
import document_export
from document_export import should_generate_document, export_markdown_as_docx


# ══════════════════════════════════════════════════════════════════════════════
# 1. KNOWLEDGE BASE
# ══════════════════════════════════════════════════════════════════════════════

KNOWLEDGE_DOCS = [
    Document(
        page_content="""
PAKISTAN CIVIL JUDGMENT – MANDATORY STRUCTURAL FORMAT
(Code of Civil Procedure 1908, Order XX Rule 4)

SECTION 1 – COURT HEADING (Caption Block)
  • Name of Court  (e.g. "In the Court of Civil Judge 1st Class, Lahore")
  • Suit Number and Year  (e.g. "Civil Suit No. 245/2023")
  • Plaintiff: [Full Name] s/o [Father's Name], r/o [Address]
  • Defendant: [Full Name] s/o [Father's Name], r/o [Address]
  • Nature of Suit  (e.g. "Suit for Declaration and Permanent Injunction")
  • Counsel for Plaintiff / Defendant
  • Date of Institution | Date of Decision

SECTION 2 – CONCISE STATEMENT OF THE CASE
  • Summary of plaintiff's claim (plaint averments)
  • Summary of defendant's reply (written statement)
  • Procedural history

SECTION 3 – FRAMING OF ISSUES  (Order XIV Rule 1 CPC)
  Numbered questions of law and fact, e.g.:
    Issue No.1: Whether the plaintiff is entitled to a decree for declaration?
    Issue No.2: Whether the suit is barred by limitation?
    Issue No.3: Relief.

SECTION 4 – EVIDENCE SUMMARY
  • Plaintiff's witnesses: PW-1, PW-2 … with role
  • Defendant's witnesses: DW-1, DW-2 … with role
  • Documentary exhibits: Exh.P-1, Exh.D-1, etc.
  • Arguments of counsel

SECTION 5 – FINDINGS ON ISSUES  (Order XX Rule 5 CPC)
  For EACH issue separately:
    ISSUE No.__ [Re-state issue]
    Finding:  [in favour of / against whom]
    Reasons:  [evidence appreciation + law + precedents (PLD/SCMR/CLC)]

SECTION 6 – LEGAL DISCUSSION & PRECEDENTS
  • Relevant statutes (CPC, Specific Relief Act 1877, TP Act 1882, etc.)
  • Binding precedents: SCMR / PLD SC (Supreme Court — binding on all courts)
  • High Court: PLD Lah. / CLC / MLD (binding within province)

SECTION 7 – CONCLUSION / OPERATIVE PART
  "In view of the above findings, the suit is DECREED / DISMISSED."
  Specify exact relief. Costs order under Section 35 CPC.

SECTION 8 – DECREE  (Order XX Rule 6 CPC — separate document)
  Formal expression of adjudication; signed, sealed, dated.

PROCEDURAL RULES:
  • Judgment MUST be written and signed (Order XX Rule 3)
  • Pronounced in open court (Order XX Rule 1)
  • Must be pronounced within 90 days of conclusion of arguments
  • Language: English or Urdu (both permissible)
  • Oral judgments have NO legal validity in Pakistan
""",
        metadata={"source": "CPC_Order_XX_Format", "type": "structure"},
    ),
    Document(
        page_content="""
PAKISTAN CIVIL JUDGMENT – EVIDENCE APPRECIATION RULES

BURDEN OF PROOF: On the plaintiff — Section 101 Qanun-e-Shahadat Order 1984.
STANDARD OF PROOF: Balance of probabilities (civil standard).

WITNESS EVALUATION:
  - Demeanour remarks must be based on observed evidence, not personal opinion.
  - References: PW-1, PW-2 (plaintiff's witnesses); DW-1, DW-2 (defendant's).

DOCUMENTARY EVIDENCE:
  - Registered documents carry strong presumption of authenticity.
  - Originals preferred; secondary evidence requires justification.

APPRECIATION vs. MARSHALLING:
  - Appreciate each piece of evidence individually.
  - Marshal accepted evidence under relevant issues.

ADVERSE INFERENCE: Article 129(g) Qanun-e-Shahadat Order 1984 — if a party
withholds material evidence, court may draw adverse inference.

CITATION FORMAT:
  • Supreme Court : 2023 SCMR 1234  |  PLD 2023 SC 456
  • Lahore HC     : 2023 CLC 789    |  PLD 2023 Lah. 100
  • Sindh HC      : 2022 MLD 500    |  PLD 2022 Kar. 200
  • Islamabad HC  : 2023 CLD 400

BINDING HIERARCHY:
  1. Supreme Court of Pakistan (binding on all courts)
  2. Full Bench → Division Bench → Single Bench of relevant High Court
  3. Other provincial High Courts (persuasive only)
""",
        metadata={"source": "Evidence_Rules", "type": "evidence"},
    ),
    Document(
        page_content="""
PAKISTAN CIVIL JUDGMENT – DRAFTING STANDARDS
(Punjab Judicial Academy Guidelines | FJA Article by Justice Shafiur Rahman)

LANGUAGE:
  • Simple, precise, reader-friendly language.
  • Avoid Latin phrases without explanation.
  • Avoid abbreviations, code words, disparaging remarks.
  • Temperate and objective tone at all times.

STYLE:
  • Do NOT reproduce pleadings verbatim — summarise concisely.
  • Every finding must carry reasons; bare findings are insufficient.
  • Ratio decidendi must be clearly stated.
  • Cross-reference evidence by exhibit number (Exh.P-1, Exh.D-1).
  • Use "Plaintiff" and "Defendant" consistently (not names repeatedly).

WHAT TO AVOID:
  ✗ Unnecessarily long judgments — brevity + completeness is the ideal.
  ✗ Verbatim copying from pleadings or other judgments.
  ✗ Personal opinions unconnected to evidence.
  ✗ Contradictory findings on the same issue.
  ✗ Omitting a finding on any framed issue.
""",
        metadata={"source": "Drafting_Standards_PJA", "type": "style"},
    ),
    Document(
        page_content="""
PAKISTAN CIVIL JUDGMENT – COMMON SUIT TYPES & TYPICAL ISSUES

SUIT FOR DECLARATION (S.42 Specific Relief Act 1877)
  Issues: (1) Entitlement to declaration? (2) Limitation? (3) Relief.
  Note: Plaintiff must show a present legal right. Limitation = 6 years.

SUIT FOR PERMANENT INJUNCTION (S.54 Specific Relief Act 1877)
  Issues: (1) Legal right? (2) Infringement/threat? (3) Relief.
  Note: Three conditions — legal right, infringement, no adequate remedy at law.

SUIT FOR SPECIFIC PERFORMANCE (S.12 Specific Relief Act 1877)
  Issues: (1) Valid contract? (2) Plaintiff ready and willing to perform?
          (3) Defendant's refusal? (4) Relief.
  Note: Equitable discretion of court; hardship to defendant is relevant.

SUIT FOR RECOVERY OF MONEY
  Issues: (1) Indebtedness? (2) Amount due? (3) Relief.

PRE-EMPTION SUIT (Punjab Pre-emption Act 1991)
  Issues: (1) Right of pre-emption? (2) Sale without notice to plaintiff?
          (3) Limitation? (4) Relief.
  Special: Order XX Rule 14 CPC — decree must specify exact deposit date.

SUIT FOR POSSESSION
  Issues: (1) Ownership/possessory right? (2) Unlawful dispossession?
          (3) Limitation? (4) Relief.
""",
        metadata={"source": "Suit_Types_Pakistan", "type": "suit_types"},
    ),
]


# ══════════════════════════════════════════════════════════════════════════════
# 2. FEW-SHOT EXAMPLES
# ══════════════════════════════════════════════════════════════════════════════

FEW_SHOT_EXAMPLES = [
    {
        "input": (
            "Write the heading and statement of case for a suit for declaration "
            "of title filed by Muhammad Aslam against Ghulam Hussain in Civil Court Lahore."
        ),
        "output": """
IN THE COURT OF CIVIL JUDGE 1ST CLASS, LAHORE

Civil Suit No. 312 of 2022

Muhammad Aslam s/o Muhammad Yaqoob, r/o House No. 45, Street 7,
Gulshan-e-Ravi, Lahore                                         … Plaintiff

                                    VERSUS

Ghulam Hussain s/o Noor Muhammad, r/o House No. 12, Shadman Colony,
Lahore                                                         … Defendant

NATURE OF SUIT : Suit for Declaration of Title and Permanent Injunction
Counsel for Plaintiff  : Mr. Tariq Mahmood, Advocate
Counsel for Defendant  : Mr. Rashid Anwar, Advocate
Date of Institution    : 15.03.2022
Date of Decision       : 10.11.2023

─────────────────────────────────────────────────────────────────────
JUDGMENT
─────────────────────────────────────────────────────────────────────

1. STATEMENT OF THE CASE

The Plaintiff instituted the present suit seeking a declaration that he is
the lawful owner of property bearing Khasra No. 1045, measuring 5 Marlas,
situated in Mouza Shahdara, Lahore ("suit property"), together with a
permanent injunction restraining the Defendant from interfering with his
peaceful possession thereof.

The Plaintiff's case is that he purchased the suit property from Haji Karim
Bakhsh vide registered Sale Deed No. 1234 dated 20.01.2015, duly registered
before the Sub-Registrar, Lahore, and has been in continuous, peaceful
possession since. The Defendant, without any lawful authority, has threatened
to dispossess the Plaintiff on the basis of a forged document.

The Defendant denied all allegations and claimed ownership through inheritance
from his late father, contending that the Sale Deed is fictitious.

On the divergent pleadings, the following issues were framed on 05.07.2022.
""",
    },
    {
        "input": (
            "Draft the issues, evidence summary, and issue-wise findings for "
            "a property suit where the dispute is about the validity of a sale deed."
        ),
        "output": """
2. ISSUES

  Issue No. 1 : Whether the Plaintiff is the lawful owner of the suit property
                by virtue of Sale Deed dated 20.01.2015?
  Issue No. 2 : Whether the said Sale Deed is genuine, valid, and duly executed?
  Issue No. 3 : Whether the Defendant has any lawful right or title to the suit property?
  Issue No. 4 : Whether the suit is within time?
  Issue No. 5 : Relief.

─────────────────────────────────────────────────────────────────────
3. EVIDENCE
─────────────────────────────────────────────────────────────────────

The Plaintiff produced himself as PW-1 and examined PW-2 (Muhammad Yousaf,
marginal witness of the Sale Deed). Documentary exhibits tendered:
  Exh.P-1 — Original registered Sale Deed dated 20.01.2015
  Exh.P-2 — Fard Malkiat (Record of Rights)
  Exh.P-3 — Stamp Duty Receipt

The Defendant appeared as DW-1 and produced DW-2 (a neighbour). Exhibit:
  Exh.D-1 — Purported Wasiyatnama (Will) in Defendant's favour

Both counsel addressed final arguments on 25.10.2023.

─────────────────────────────────────────────────────────────────────
4. FINDINGS ON ISSUES
─────────────────────────────────────────────────────────────────────

ISSUE No. 1 & 2 (taken together):
  Finding: In favour of the Plaintiff.
  Reasons: The original registered Sale Deed (Exh.P-1) carries a strong
  presumption of correctness under Article 73 Qanun-e-Shahadat Order 1984.
  PW-2 fully corroborated its execution. Exh.P-2 records the Plaintiff as owner.
  The Defendant's Wasiyatnama (Exh.D-1) is unregistered; DW-2 could not
  substantiate its execution. Reliance placed on PLD 2019 SC 304.
  Issues decided in favour of the Plaintiff.

ISSUE No. 3:
  Finding: In the negative. Defendant failed to establish any title.

ISSUE No. 4 (Limitation):
  Finding: Suit instituted within six years — within Article 120 Limitation
  Act 1908. Issue decided in favour of the Plaintiff.
""",
    },
    {
        "input": "Write the conclusion, operative part, and decree for a decreed declaration suit.",
        "output": """
5. CONCLUSION

In view of the findings on all issues, the Plaintiff has successfully established
his title to the suit property. The Defendant has failed to rebut the Plaintiff's
case with credible evidence.

─────────────────────────────────────────────────────────────────────
6. OPERATIVE PART
─────────────────────────────────────────────────────────────────────

Consequently, the suit is hereby DECREED in the following terms:

  (i)   It is declared that the Plaintiff, Muhammad Aslam s/o Muhammad Yaqoob,
        is the lawful owner of property bearing Khasra No. 1045, measuring
        5 Marlas, situated in Mouza Shahdara, Lahore.
  (ii)  The Defendant, his agents and servants, are permanently restrained from
        interfering with the Plaintiff's peaceful possession.
  (iii) Costs of the suit are awarded to the Plaintiff under Section 35 CPC.

Announced in open court on 10.11.2023.

                                                       (Signature)
                                             Civil Judge 1st Class, Lahore

─────────────────────────────────────────────────────────────────────
DECREE
─────────────────────────────────────────────────────────────────────

Civil Suit No. 312 of 2022
Date of Judgment : 10.11.2023  |  Date of Decree : 10.11.2023

  1. Plaintiff declared lawful owner of Khasra No. 1045, 5 Marlas, Mouza Shahdara.
  2. Permanent injunction against the Defendant as described above.
  3. Costs payable by the Defendant to the Plaintiff.

Drawn up by: _______________        Signed: _______________
             Reader/Nazir                   Civil Judge 1st Class, Lahore
             Date: 10.11.2023              Date: 10.11.2023   [Court Seal]
""",
    },
]


# ══════════════════════════════════════════════════════════════════════════════
# 3. SYSTEM PROMPTS
# ══════════════════════════════════════════════════════════════════════════════

SYSTEM_PROMPT = """You are 'JudicialGPT,' an AI Assistant exclusively designed to serve and
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
Use the following retrieved context to inform your response:
{context}

BEHAVIOURAL GUARDRAILS:
  • Remain strictly neutral and impartial at all times.
  • Treat all case information as highly confidential.
  • Maintain a formal, respectful, and objective tone.
  • Do not volunteer the current date/time unless explicitly asked."""

# System prompt variant for the history-aware chain (no {context} placeholder
# — context is injected dynamically via a RunnableLambda)
HISTORY_SYSTEM_PROMPT = """You are 'JudicialGPT,' an AI Assistant exclusively designed to serve and
support Judges within the judicial system of Pakistan.

You assist judges in drafting well-structured civil judgments following Order XX Rule 4 CPC:
  1. Court Heading  2. Statement of the Case  3. Issues  4. Evidence Summary
  5. Issue-wise Findings  6. Legal Discussion & Precedents
  7. Conclusion / Operative Part  8. Decree

MANDATORY RULES:
  • Every finding must carry detailed reasons.
  • Cite Pakistani precedents (SCMR, PLD, CLC, MLD) where applicable.
  • Reference evidence as Exh.P-1 / Exh.D-1 and witnesses as PW-1 / DW-1.
  • Use formal, temperate, precise language.
  • Standard of proof: balance of probabilities.
  • Burden of proof on plaintiff under Section 101 Qanun-e-Shahadat Order 1984.

RETRIEVED CONTEXT:
{context}

Remain strictly neutral, confidential, and objective at all times."""


# ══════════════════════════════════════════════════════════════════════════════
# 4. RAG ENGINE (singleton — built once at startup)
# ══════════════════════════════════════════════════════════════════════════════

class RAGEngine:
    def __init__(self):
        self.vectorstore: FAISS | None = None
        self.rag_chain = None
        self.history_chain = None
        self.llm: ChatGroq | None = None
        self.retriever = None

    def build(self):
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise RuntimeError("GROQ_API_KEY environment variable is not set.")

        # Embeddings + Vector Store
        embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2",
            model_kwargs={"device": "cpu"},
        )
        self.vectorstore = FAISS.from_documents(KNOWLEDGE_DOCS, embeddings)
        self.retriever = self.vectorstore.as_retriever(search_kwargs={"k": 3})

        # LLM
        self.llm = ChatGroq(
            model="llama-3.3-70b-versatile",
            temperature=0.2,
            groq_api_key=api_key,
        )

        # ── Standard RAG chain (stateless) ───────────────────────────────────
        example_prompt = ChatPromptTemplate.from_messages([
            ("human", "{input}"),
            ("ai", "{output}"),
        ])
        few_shot = FewShotChatMessagePromptTemplate(
            example_prompt=example_prompt,
            examples=FEW_SHOT_EXAMPLES,
        )
        prompt = ChatPromptTemplate.from_messages([
            ("system", SYSTEM_PROMPT),
            few_shot,
            ("human", "{question}"),
        ])

        def format_docs(docs: list[Document]) -> str:
            return "\n\n---\n\n".join(d.page_content for d in docs)

        self.rag_chain = (
            {
                "context": self.retriever | format_docs,
                "question": RunnablePassthrough(),
            }
            | prompt
            | self.llm
            | StrOutputParser()
        )

        # ── History-aware chain ───────────────────────────────────────────────
        history_prompt = ChatPromptTemplate.from_messages([
            ("system", HISTORY_SYSTEM_PROMPT),
            few_shot,
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "{question}"),
        ])

        def inject_context(inputs: dict) -> dict:
            docs = self.retriever.invoke(inputs["question"])
            inputs["context"] = format_docs(docs)
            return inputs

        self.history_chain = (
            RunnableLambda(inject_context)
            | history_prompt
            | self.llm
            | StrOutputParser()
        )


rag_engine = RAGEngine()

# In-memory session store  { session_id: [HumanMessage | AIMessage] }
session_store: dict[str, list] = {}


# ══════════════════════════════════════════════════════════════════════════════
# 5. FASTAPI APP — lifespan startup
# ══════════════════════════════════════════════════════════════════════════════

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("⚙️  Building RAG engine (embeddings + vector store + Groq LLM)...")
    await asyncio.get_event_loop().run_in_executor(None, rag_engine.build)
    print("✅  JudicialGPT RAG engine is ready.")
    yield
    print("🛑  Shutting down JudicialGPT.")


app = FastAPI(
    title="JudicialGPT API",
    description=(
        "RAG-powered API for Pakistan Civil Court judgment drafting. "
        "Backed by Groq (llama-3.3-70b) and LangChain v0.3+."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS — allow all origins (restrict in production) ────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ══════════════════════════════════════════════════════════════════════════════
# 6. PYDANTIC SCHEMAS
# ══════════════════════════════════════════════════════════════════════════════

class ChatRequest(BaseModel):
    query: str = Field(..., min_length=1, description="Judge's query or instruction")


class DocumentInfo(BaseModel):
    title: str
    doc_type: str
    download_url: str


class ChatResponse(BaseModel):
    query: str
    response: str
    sources: list[str] = Field(default_factory=list)
    document: DocumentInfo | None = None


class HistoryChatRequest(BaseModel):
    session_id: str = Field(
        default_factory=lambda: str(uuid4()),
        description="Unique session ID for conversation continuity",
    )
    query: str = Field(..., min_length=1)


class HistoryChatResponse(BaseModel):
    session_id: str
    query: str
    response: str
    sources: list[str] = Field(default_factory=list)
    turn: int = Field(description="Turn number in this session")
    document: DocumentInfo | None = None


class SessionInfo(BaseModel):
    session_id: str
    turns: int
    preview: str = Field(description="First user message preview")


class HealthResponse(BaseModel):
    status: str
    model: str
    embeddings: str
    vector_store_docs: int
    sessions_active: int


# ══════════════════════════════════════════════════════════════════════════════
# 7. HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def get_source_names(query: str) -> list[str]:
    """Return metadata source names from retrieved docs for a given query."""
    if rag_engine.retriever is None:
        return []
    docs = rag_engine.retriever.invoke(query)
    return list({d.metadata.get("source", "unknown") for d in docs})


def _make_doc_title(query: str) -> str:
    """Short, filesystem-safe title derived from the user's query."""
    words = query.strip().split()
    return " ".join(words[:8]) if words else "Judgment"


def run_document_export(query: str, response_markdown: str) -> DocumentInfo | None:
    """
    Blocking function — call it via run_in_executor from async routes.

    Runs strictly AFTER the LLM has already produced its full markdown
    answer. Never touches the RAG chain, prompt, or model call — only
    converts+uploads the string the chain already returned. Wrapped in
    try/except so a Drive/export failure never breaks the chat response.
    """
    if not should_generate_document(query):
        return None
    try:
        title = _make_doc_title(query)
        result = export_markdown_as_docx(response_markdown, title)
        return DocumentInfo(
            title=result.title,
            doc_type=result.doc_type,
            download_url=result.download_url,
        )
    except Exception as exc:
        print(f"⚠️  Document export failed (chat still succeeded): {exc}")
        return None


async def stream_rag_response(query: str) -> AsyncGenerator[str, None]:
    """Yield SSE-formatted tokens from the RAG chain."""
    if rag_engine.rag_chain is None:
        yield "data: [ERROR] RAG engine not initialised.\n\n"
        return

    # Retrieve context synchronously (fast, CPU-bound)
    context_docs = await asyncio.get_event_loop().run_in_executor(
        None, rag_engine.retriever.invoke, query
    )
    context = "\n\n---\n\n".join(d.page_content for d in context_docs)

    # Stream tokens from the LLM
    example_prompt = ChatPromptTemplate.from_messages([
        ("human", "{input}"),
        ("ai", "{output}"),
    ])
    few_shot = FewShotChatMessagePromptTemplate(
        example_prompt=example_prompt,
        examples=FEW_SHOT_EXAMPLES,
    )
    prompt = ChatPromptTemplate.from_messages([
        ("system", SYSTEM_PROMPT),
        few_shot,
        ("human", "{question}"),
    ])

    messages = await prompt.ainvoke({"context": context, "question": query})

    async for chunk in rag_engine.llm.astream(messages):
        token = chunk.content
        if token:
            # JSON-encode so whitespace-only tokens (spaces, newlines) and
            # tokens containing embedded newlines survive SSE's line-based
            # framing intact instead of being trimmed/dropped by the client.
            payload = json.dumps({"text": token})
            yield f"data: {payload}\n\n"

    yield "data: [DONE]\n\n"


# ══════════════════════════════════════════════════════════════════════════════
# 8. ROUTES
# ══════════════════════════════════════════════════════════════════════════════

# ── Root ─────────────────────────────────────────────────────────────────────
@app.get("/", tags=["Health"])
async def root():
    return {
        "service": "JudicialGPT API",
        "status": "running",
        "docs": "/docs",
    }


# ── Health ───────────────────────────────────────────────────────────────────
@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health():
    if rag_engine.vectorstore is None:
        raise HTTPException(status_code=503, detail="RAG engine not ready.")
    return HealthResponse(
        status="healthy",
        model="llama-3.3-70b-versatile (Groq)",
        embeddings="sentence-transformers/all-MiniLM-L6-v2",
        vector_store_docs=rag_engine.vectorstore.index.ntotal,
        sessions_active=len(session_store),
    )


# ── Document download ────────────────────────────────────────────────────────
@app.get("/documents/{filename}", tags=["Documents"])
async def download_document(filename: str):
    """
    Serves a previously generated .docx file (see document_export.py).
    This is the URL that DocumentInfo.download_url points at.
    """
    # Path-traversal guard: reject anything that isn't a bare filename.
    if "/" in filename or "\\" in filename or ".." in filename:
        raise HTTPException(status_code=400, detail="Invalid filename.")

    filepath = os.path.join(document_export.EXPORT_DIR, filename)
    if not os.path.isfile(filepath):
        raise HTTPException(status_code=404, detail="Document not found.")

    return FileResponse(
        path=filepath,
        filename=filename,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )


# ── Standard Chat (full response) ────────────────────────────────────────────
@app.post("/chat", response_model=ChatResponse, tags=["Chat"])
async def chat(request: ChatRequest):
    """
    Send a query and receive the full judgment draft or legal answer.
    Best for frontend components that render the entire response at once.
    """
    if rag_engine.rag_chain is None:
        raise HTTPException(status_code=503, detail="RAG engine not ready.")

    try:
        response = await asyncio.get_event_loop().run_in_executor(
            None, rag_engine.rag_chain.invoke, request.query
        )
        sources = get_source_names(request.query)

        # ── Document export (runs only if the query implies a document
        #    request; converts the markdown already produced above) ────────
        document = await asyncio.get_event_loop().run_in_executor(
            None, run_document_export, request.query, response
        )

        return ChatResponse(
            query=request.query, response=response, sources=sources, document=document
        )

    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ── Streaming Chat (SSE) ──────────────────────────────────────────────────────
@app.post("/chat/stream", tags=["Chat"])
async def chat_stream(request: ChatRequest):
    """
    Stream the response token-by-token using Server-Sent Events (SSE).
    Frontend should consume with EventSource or fetch + ReadableStream.

    SSE format:
        data: <token>\\n\\n   (for each token)
        data: [DONE]\\n\\n    (end of stream)
    """
    if rag_engine.llm is None:
        raise HTTPException(status_code=503, detail="RAG engine not ready.")

    return StreamingResponse(
        stream_rag_response(request.query),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",        # Disable nginx buffering
            "Connection": "keep-alive",
        },
    )


# ── History-aware Chat ────────────────────────────────────────────────────────
@app.post("/chat/history", response_model=HistoryChatResponse, tags=["Chat"])
async def chat_with_history(request: HistoryChatRequest):
    """
    Multi-turn conversation. Pass the same session_id across turns to maintain
    context. A new session_id starts a fresh conversation.
    """
    if rag_engine.history_chain is None:
        raise HTTPException(status_code=503, detail="RAG engine not ready.")

    # Initialise session if new
    if request.session_id not in session_store:
        session_store[request.session_id] = []

    history = session_store[request.session_id]

    try:
        response = await asyncio.get_event_loop().run_in_executor(
            None,
            rag_engine.history_chain.invoke,
            {"question": request.query, "chat_history": history},
        )

        # Persist messages
        history.append(HumanMessage(content=request.query))
        history.append(AIMessage(content=response))

        sources = get_source_names(request.query)
        turn = len(history) // 2   # Each turn = 1 human + 1 AI message

        document = await asyncio.get_event_loop().run_in_executor(
            None, run_document_export, request.query, response
        )

        return HistoryChatResponse(
            session_id=request.session_id,
            query=request.query,
            response=response,
            sources=sources,
            turn=turn,
            document=document,
        )

    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ── Clear Session ─────────────────────────────────────────────────────────────
@app.delete("/chat/history/{session_id}", tags=["Sessions"])
async def clear_session(session_id: str):
    """Clear all conversation history for a given session."""
    if session_id not in session_store:
        raise HTTPException(status_code=404, detail="Session not found.")
    del session_store[session_id]
    return {"message": f"Session '{session_id}' cleared successfully."}


# ── List Sessions ─────────────────────────────────────────────────────────────
@app.get("/sessions", response_model=list[SessionInfo], tags=["Sessions"])
async def list_sessions():
    """List all active session IDs with turn count and first message preview."""
    sessions = []
    for sid, history in session_store.items():
        human_msgs = [m for m in history if isinstance(m, HumanMessage)]
        preview = human_msgs[0].content[:80] + "…" if human_msgs else ""
        sessions.append(
            SessionInfo(
                session_id=sid,
                turns=len(human_msgs),
                preview=preview,
            )
        )
    return sessions


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=7003, reload=True)