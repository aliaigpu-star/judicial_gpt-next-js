"""
JudicialGPT – Civil Judgment RAG Application
Pakistan Civil Courts | CPC Order XX Rule 4 Compliant
LLM  : Groq (llama-3.3-70b-versatile)
Stack: LangChain v0.3+ | FAISS | HuggingFace Embeddings

INSTALLATION:
    pip install langchain langchain-community langchain-groq \
                langchain-huggingface faiss-cpu sentence-transformers \
                python-dotenv

USAGE:
    export GROQ_API_KEY="your_groq_api_key_here"
    python judicial_rag_app.py
"""

import os
from dotenv import load_dotenv

# ── LangChain v0.3+ imports ──────────────────────────────────────────────────
from langchain_groq import ChatGroq
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
from langchain_core.prompts import (
    ChatPromptTemplate,
    FewShotChatMessagePromptTemplate,
)
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough

load_dotenv()


# ══════════════════════════════════════════════════════════════════════════════
# 1. KNOWLEDGE BASE — Pakistan Civil Judgment Format & Rules
#    Sources: CPC 1908 Order XX Rule 4 | Punjab Judicial Academy Guidelines
#             FJA Article "Judgment: What and How to Write"
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
# 2. FEW-SHOT EXAMPLES — Real-style Pakistan Civil Judgment Excerpts
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
  Whether the Plaintiff is the lawful owner and whether the Sale Deed is genuine?

  Finding: In favour of the Plaintiff.

  Reasons: The original registered Sale Deed (Exh.P-1) carries a strong
  presumption of correctness under Article 73 of the Qanun-e-Shahadat Order
  1984. PW-2 fully corroborated its execution. The Fard Malkiat (Exh.P-2)
  records the Plaintiff as owner. The Defendant's Wasiyatnama (Exh.D-1) is
  unregistered and DW-2 could not substantiate its execution. The Supreme Court
  in PLD 2019 SC 304 held that an unregistered will cannot override a registered
  sale deed absent compelling evidence of fraud. No such evidence was produced.
  Issues decided in favour of the Plaintiff.

ISSUE No. 3:
  Finding: In the negative. In light of Issues 1 & 2, the Defendant has failed
  to establish any title or possessory right. Issue decided against the Defendant.

ISSUE No. 4 (Limitation):
  Finding: The suit was instituted within six years of the cause of action,
  hence within the period prescribed under Article 120 of the Limitation Act
  1908. Issue decided in favour of the Plaintiff.
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

  (i)  It is declared that the Plaintiff, Muhammad Aslam s/o Muhammad Yaqoob,
       is the lawful owner of property bearing Khasra No. 1045, measuring
       5 Marlas, situated in Mouza Shahdara, Lahore.

  (ii) The Defendant, his agents, servants, and representatives are permanently
       restrained from interfering with the Plaintiff's peaceful possession of
       the suit property in any manner whatsoever.

  (iii) Costs of the suit are awarded to the Plaintiff under Section 35 CPC.

Announced in open court on 10.11.2023.

                                                       (Signature)
                                             Civil Judge 1st Class, Lahore

─────────────────────────────────────────────────────────────────────
DECREE
─────────────────────────────────────────────────────────────────────

Civil Suit No. 312 of 2022
Date of Judgment : 10.11.2023
Date of Decree   : 10.11.2023

This suit having been decreed on 10.11.2023, it is ORDERED AND DECREED that:

  1. The Plaintiff Muhammad Aslam s/o Muhammad Yaqoob is declared the lawful
     owner of Khasra No. 1045 measuring 5 Marlas, Mouza Shahdara, Lahore.
  2. A decree for permanent injunction is passed against the Defendant as
     described above.
  3. Costs are payable by the Defendant to the Plaintiff.

Drawn up by: _______________        Signed: _______________
             Reader/Nazir                   Civil Judge 1st Class, Lahore
             Date: 10.11.2023              Date: 10.11.2023   [Court Seal]
""",
    },
]


# ══════════════════════════════════════════════════════════════════════════════
# 3. SYSTEM PROMPT
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


# ══════════════════════════════════════════════════════════════════════════════
# 4. BUILD THE RAG PIPELINE
# ══════════════════════════════════════════════════════════════════════════════

def build_vectorstore(docs: list[Document]) -> FAISS:
    """Embed knowledge docs and return a FAISS vector store."""
    embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2",
        model_kwargs={"device": "cpu"},
    )
    return FAISS.from_documents(docs, embeddings)


def build_few_shot_prompt() -> FewShotChatMessagePromptTemplate:
    """Construct the few-shot prompt block from examples."""
    example_prompt = ChatPromptTemplate.from_messages([
        ("human", "{input}"),
        ("ai", "{output}"),
    ])
    return FewShotChatMessagePromptTemplate(
        example_prompt=example_prompt,
        examples=FEW_SHOT_EXAMPLES,
    )


def build_rag_chain(vectorstore: FAISS):
    """Assemble the full RAG chain using LangChain v0.3+ LCEL syntax."""

    # Retriever — top-3 most relevant knowledge chunks
    retriever = vectorstore.as_retriever(search_kwargs={"k": 3})

    # Groq LLM
    llm = ChatGroq(
        model="llama-3.3-70b-versatile",
        temperature=0.2,           # Low temp for deterministic legal drafting
        groq_api_key="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",
    )

    # Few-shot block
    few_shot_prompt = build_few_shot_prompt()

    # Final prompt = system + few-shot examples + user question
    prompt = ChatPromptTemplate.from_messages([
        ("system", SYSTEM_PROMPT),
        few_shot_prompt,
        ("human", "{question}"),
    ])

    # Helper to format retrieved docs into a single string
    def format_docs(docs: list[Document]) -> str:
        return "\n\n---\n\n".join(doc.page_content for doc in docs)

    # LCEL chain (LangChain v0.3+ style)
    rag_chain = (
        {
            "context": retriever | format_docs,
            "question": RunnablePassthrough(),
        }
        | prompt
        | llm
        | StrOutputParser()
    )

    return rag_chain


# ══════════════════════════════════════════════════════════════════════════════
# 5. MAIN — Interactive CLI Loop
# ══════════════════════════════════════════════════════════════════════════════

def main():
    print("=" * 70)
    print("  JudicialGPT — Pakistan Civil Judgment RAG Assistant")
    print("  Powered by Groq (llama-3.3-70b) | LangChain v0.3+")
    print("=" * 70)

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise EnvironmentError(
            "GROQ_API_KEY not found. Please set it:\n"
            "  export GROQ_API_KEY='your_key_here'"
        )

    print("\n[1/2] Building vector store from knowledge base...")
    vectorstore = build_vectorstore(KNOWLEDGE_DOCS)
    print("      Done.\n")

    print("[2/2] Initialising RAG chain with Groq LLM...")
    rag_chain = build_rag_chain(vectorstore)
    print("      Done.\n")

    print("Type your query below. Type 'exit' or 'quit' to stop.\n")
    print("-" * 70)

    while True:
        try:
            query = input("\nJudge's Query: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\n\nSession ended. Ma'a salama.")
            break

        if not query:
            continue
        if query.lower() in {"exit", "quit"}:
            print("\nSession ended. Ma'a salama.")
            break

        print("\n[Retrieving context & drafting response...]\n")
        print("-" * 70)
        response = rag_chain.invoke(query)
        print(response)
        print("-" * 70)


if __name__ == "__main__":
    main()