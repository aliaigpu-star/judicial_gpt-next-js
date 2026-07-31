# """
# CriminalJudicialGPT – FastAPI Server
# Pakistan Criminal Courts RAG Application
# ──────────────────────────────────────────
# INSTALLATION:
#     pip install fastapi uvicorn langchain langchain-community langchain-groq \
#                 langchain-huggingface faiss-cpu sentence-transformers \
#                 python-dotenv

# RUN:
#     uvicorn criminal_api:app --host 0.0.0.0 --port 8001 --reload

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
# from fastapi import FastAPI, HTTPException
# from fastapi.middleware.cors import CORSMiddleware
# from fastapi.responses import StreamingResponse
# from pydantic import BaseModel, Field

# # ── LangChain v0.3+ ──────────────────────────────────────────────────────────
# from langchain_groq import ChatGroq
# from langchain_huggingface import HuggingFaceEmbeddings
# from langchain_community.vectorstores import FAISS
# from langchain_core.documents import Document
# from langchain_core.messages import HumanMessage, AIMessage
# from langchain_core.prompts import (
#     ChatPromptTemplate,
#     FewShotChatMessagePromptTemplate,
#     MessagesPlaceholder,
# )
# from langchain_core.output_parsers import StrOutputParser
# from langchain_core.runnables import RunnablePassthrough, RunnableLambda

# load_dotenv()


# # ══════════════════════════════════════════════════════════════════════════════
# # 1. KNOWLEDGE BASE — Pakistan Criminal Judgment Format & Rules
# # ══════════════════════════════════════════════════════════════════════════════

# KNOWLEDGE_DOCS = [
#     Document(
#         page_content="""
# PAKISTAN CRIMINAL JUDGMENT – MANDATORY STRUCTURAL FORMAT
# (Code of Criminal Procedure 1898, Sections 366-371)

# SECTION 1 – COURT HEADING (Caption Block)
#   • Name of Court (e.g. "In the Court of Sessions Judge / Additional Sessions Judge,
#     Lahore" OR "In the Court of Judicial Magistrate 1st Class, Lahore")
#   • Sessions Case No. / Criminal Case No. / Complaint Case No. and Year
#   • FIR No., Date, Police Station, District
#   • The State  vs.  Accused: [Full Name] s/o [Father's Name], r/o [Address],
#     CNIC No. [if available], Age: [__] years, Occupation: [__]
#   • Offence(s): Under Section(s) [__] PPC / special law
#   • Counsel for State: Learned APG / Prosecutor / Complainant's Counsel
#   • Counsel for Defence: Mr./Ms. [Name], Advocate
#   • Date of Commencement | Date of Decision

# SECTION 2 – FIR / COMPLAINT DETAILS & PROSECUTION CASE
#   • FIR No., date, time, police station, challan submitted on [date]
#   • Brief narration of the prosecution's version of events
#   • Modus operandi, place of occurrence, time of occurrence
#   • Role attributed to each accused

# SECTION 3 – CHARGE (Section 242/265-C Cr.P.C.)
#   • Exact charge(s) framed — PPC section(s) with punishment range
#   • Date charge was framed
#   • Accused's plea: Guilty / Not Guilty
#   • If guilty plea: record and convict under Section 243 Cr.P.C.

# SECTION 4 – PROSECUTION EVIDENCE
#   • Prosecution witnesses examined: PW-1, PW-2 … (name, role)
#   • Documentary / physical exhibits: Exh.P-1, Exh.P-2 …
#   • Medical evidence (MLR, Post-Mortem Report) if applicable
#   • Forensic / ballistic / chemical analysis reports if applicable

# SECTION 5 – STATEMENT OF ACCUSED (Section 342 Cr.P.C.)
#   • Summary of the accused's statement under Section 342 Cr.P.C.
#   • Whether accused opted to appear as his own witness (Section 340(2) Cr.P.C.)
#   • Defence witnesses (if any): DW-1, DW-2 … with exhibits Exh.D-1 …

# SECTION 6 – ARGUMENTS OF COUNSEL
#   • Learned APG / Prosecutor's submissions
#   • Learned Defence Counsel's submissions

# SECTION 7 – DISCUSSION & APPRECIATION OF EVIDENCE
#   • Evaluate each prosecution witness individually
#   • Test for consistency, corroboration, and credibility
#   • Appreciate circumstantial evidence under the "chain of circumstances" rule
#   • Discuss medical, forensic, and expert evidence
#   • Address alibi or defence plea with reasons for acceptance or rejection
#   • Every material discrepancy must be addressed

# SECTION 8 – FINDING ON CHARGE / VERDICT
#   On Charge No. 1 (Section __ PPC):
#     Finding: Proved / Not Proved / Partially Proved
#     Reasons: [detailed reasons]
#   Verdict: CONVICTED / ACQUITTED

# SECTION 9 – SENTENCE (if convicted) OR ACQUITTAL ORDER
#   CONVICTION:
#     • Nature of sentence (imprisonment/death/fine/Qisas/Diyat/Ta'zir)
#     • Quantum of sentence with legal basis
#     • Benefit of Section 382-B Cr.P.C. (set-off of pre-trial detention)
#     • Compensation under Section 544-A Cr.P.C. if ordered
#   ACQUITTAL:
#     • "Charge stands not proved beyond reasonable doubt."
#     • Order of acquittal under Section 245/265-H(1) Cr.P.C.
#     • Bail bonds cancelled; sureties discharged

# SECTION 10 – OPERATIVE PART & SIGNATURE
#   • Clear, unambiguous operative order
#   • Announced in open court on [date]
#   • Signed and dated by the Presiding Officer with designation

# PROCEDURAL RULES:
#   • Judgment must be in writing (Section 366 Cr.P.C.)
#   • Must state the offence proved and punishment (Section 367 Cr.P.C.)
#   • In death sentence cases: must be confirmed by High Court (Section 374 Cr.P.C.)
#   • Oral judgments are impermissible
#   • Judgment must be pronounced in open court (Section 366 Cr.P.C.)
# """,
#         metadata={"source": "CrPC_Judgment_Format", "type": "structure"},
#     ),

#     Document(
#         page_content="""
# PAKISTAN CRIMINAL JUDGMENT – STANDARD OF PROOF & EVIDENCE RULES

# STANDARD OF PROOF IN CRIMINAL CASES:
#   Beyond Reasonable Doubt — the highest legal standard.
#   Doubt is to be resolved in favour of the accused. (Benefit of the doubt)
#   "It is better that ten guilty persons escape than that one innocent suffer."

# BURDEN OF PROOF:
#   • Primary burden: On the Prosecution to prove guilt — Article 117 Qanun-e-Shahadat 1984.
#   • Secondary/Reverse burden: On accused in certain special laws (e.g. S.9 CNS Act 1997).
#   • Burden NEVER shifts to the accused on the primary charge.

# OCULAR EVIDENCE (Eyewitnesses):
#   • Each eyewitness must be tested individually.
#   • Consistency inter se increases probative value.
#   • Minor discrepancies in trivial details are not fatal to prosecution; material
#     contradictions on material particulars may be fatal.
#   • Related/partisan witnesses are not automatically discarded — scrutinised with extra care.
#     Reliance: PLD 2022 SC 170; 2021 SCMR 738.

# MEDICAL EVIDENCE:
#   • Post-Mortem Report (PMR) corroborates manner and cause of death.
#   • Medico-Legal Report (MLR) corroborates injuries in hurt cases.
#   • Inconsistency between ocular account and medical evidence may create reasonable doubt.

# CONFESSIONAL STATEMENT:
#   • Judicial Confession (before Magistrate under S.164 Cr.P.C.): admissible; must be voluntary.
#   • Extra-Judicial Confession: weak; requires strong corroboration.
#   • Confession to Police: inadmissible under Article 38 Qanun-e-Shahadat 1984.

# DYING DECLARATION (Marna Ka Bayan):
#   • Admissible under Article 46 Qanun-e-Shahadat 1984.
#   • Proximity to death and mental capacity are critical.

# CIRCUMSTANTIAL EVIDENCE:
#   • Each circumstance must be proved beyond doubt.
#   • All circumstances must form a complete chain pointing exclusively to accused's guilt.

# RECOVERY OF WEAPON / CONTRABAND:
#   • Memorandum of recovery must be prepared in presence of two neutral witnesses.
#   • Recovery from open/accessible places is weak without independent witnesses.

# FORENSIC / SCIENTIFIC EVIDENCE:
#   • DNA, Ballistic, Chemical Examiner reports are expert opinions — Article 59 QSO 1984.
#   • Court is not bound by expert opinion but must give cogent reasons for rejection.

# CITATION FORMAT (Criminal Precedents):
#   • Supreme Court : 2023 SCMR 456 | PLD 2023 SC 100
#   • Lahore HC     : 2023 PCrLJ 200 | PLD 2023 Lah. 50
#   • Sindh HC      : 2022 PCrLJ 700 | PLD 2022 Kar. 120
#   • Islamabad HC  : 2023 PCrLJ 900
#   • Key reporters : SCMR, PCrLJ, PLD, MLD

# BINDING HIERARCHY:
#   1. Supreme Court of Pakistan (binding on all courts)
#   2. Full Bench → Division Bench → Single Bench of relevant High Court
#   3. Other provincial High Courts (persuasive only)
# """,
#         metadata={"source": "Criminal_Evidence_Rules", "type": "evidence"},
#     ),

#     Document(
#         page_content="""
# PAKISTAN CRIMINAL JUDGMENT – QISAS, DIYAT & TA'ZIR FRAMEWORK
# (Pakistan Penal Code 1860 – Chapter XVI, Sections 299–338-H as amended)

# DEFINITIONS:
#   • Qatl-e-Amd (S.300 PPC): Intentional murder — Qisas OR Diyat (on waiver/compounding)
#     OR Ta'zir (S.302 PPC: death / life imprisonment / rigorous imprisonment up to 25 years)
#   • Qatl Shibh-ul-Amd (S.315 PPC): Murder-like killing without intent — Diyat + Ta'zir
#   • Qatl-ul-Khata (S.318 PPC): Culpable homicide not amounting to murder — Diyat only

# QISAS (Retaliation):
#   • Right of heirs to demand equal retaliation (life for life).
#   • Requirements: (i) Accused is adult and sane; (ii) Victim not a descendant of accused.
#   • Execution of Qisas by State after High Court confirmation.

# DIYAT (Blood Money):
#   • Compulsory Diyat amount: value of 30,630 grams of silver (revised periodically).
#   • Payable to legal heirs of victim.
#   • Compounding/Waiver (S.309/310 PPC): Heirs may waive Qisas in lieu of Diyat or Afw.
#   • Even after waiver of Qisas, court may impose Ta'zir — PLD 2021 SC 600.

# TA'ZIR (Discretionary Punishment under S.302(b) PPC):
#   • Death penalty or imprisonment for life.
#   • Court may impose Ta'zir ex-officio even when Qisas is waived.
#   • Sentence must be proportionate to gravity of offence.

# ARSH (Compensation for Hurt):
#   • Fixed proportion of Diyat for specified injuries.
#   • Relevant for hurt/grievous hurt cases (Sections 333-338 PPC).

# IMPORTANT SENTENCING NOTES:
#   • Multiple sentences run concurrently unless court orders otherwise (S.397 Cr.P.C.).
#   • Set-off under Section 382-B Cr.P.C. for pre-sentence custody period — MANDATORY.
#   • Juvenile offenders: Juvenile Justice System Act 2018 — reformatory measures preferred.
#   • Death sentence: mandatory confirmation by High Court under S.374 Cr.P.C.
# """,
#         metadata={"source": "Qisas_Diyat_Framework", "type": "sentencing"},
#     ),

#     Document(
#         page_content="""
# PAKISTAN CRIMINAL JUDGMENT – MAJOR OFFENCE TYPES & KEY LEGAL ELEMENTS

# A. MURDER / QATL-E-AMD (Section 302 PPC)
#    Elements: (1) Death; (2) Caused by accused; (3) Intentional act.
#    Key Evidence: PMR, ocular witnesses, weapon recovery, FSL report, motive.

# B. ATTEMPT TO MURDER (Section 324 PPC)
#    Elements: (1) Act done; (2) Intention to commit murder; (3) No death resulted.

# C. HURT / GRIEVOUS HURT (Sections 337-A to 337-L PPC)
#    Elements: (1) Voluntary hurt; (2) Nature of injury (Itlaf-i-udw, etc.).

# D. ROBBERY & DACOITY (Sections 392-402 PPC)
#    Elements: (1) Theft or extortion; (2) Use of force/fear; (3) Dacoity: 5+ persons.
#    Note: Common intention (S.34 PPC) is crucial.

# E. KIDNAPPING / ABDUCTION (Sections 359-369 PPC)
#    Elements: (1) Taking/enticing a person; (2) From guardian OR by force; (3) Purpose.

# F. NARCOTIC OFFENCES (Control of Narcotic Substances Act 1997 — CNS Act)
#    S.9(a): Possession — up to 2 years / fine.
#    S.9(b): Trafficking — 2 years to life imprisonment.
#    S.9(c): Large-scale — life imprisonment or death.
#    Elements: (1) Conscious possession; (2) Knowledge; (3) Quantity.
#    Note: Reverse burden applies once conscious possession established.

# G. TERRORISM OFFENCES (Anti-Terrorism Act 1997)
#    S.6 ATA defines "act of terrorism."
#    Trial: Before Anti-Terrorism Court (ATC) — special procedure under S.19 ATA.

# H. SEXUAL OFFENCES (Sections 375/376 PPC as amended by Anti-Rape Act 2021)
#    Elements: (1) Sexual intercourse; (2) Without consent / with minor.
#    Evidence: DNA mandatory; Two-Finger Test prohibited — PLD 2021 SC 788.
#    In-camera proceedings mandatory under Section 352 Cr.P.C.

# I. CHEATING / FRAUD (Sections 420, 468, 471 PPC)
#    Elements: (1) Deception; (2) Dishonest inducement; (3) Harm to property.

# J. THEFT (Sections 379-382 PPC)
#    Elements: (1) Movable property; (2) Out of possession of another; (3) No consent;
#              (4) Dishonest intention.

# COMMON PRINCIPLES:
#   • Alibi must be proved by accused on balance of probabilities (Art. 122 QSO 1984).
#   • Motive alone does not establish guilt — corroborates ocular evidence only.
#   • Unexplained delay in FIR weakens prosecution unless satisfactorily explained.
#   • Probability of false implication for enmity must be considered.
# """,
#         metadata={"source": "Offence_Types_Pakistan", "type": "offence_types"},
#     ),

#     Document(
#         page_content="""
# PAKISTAN CRIMINAL JUDGMENT – DRAFTING STANDARDS & STYLE GUIDE

# LANGUAGE & TONE:
#   • Formal, temperate, objective — free from emotional language.
#   • Refer to accused as "the accused" — never pejoratively.
#   • Refer to deceased as "the deceased" after first full mention.

# STRUCTURE DISCIPLINE:
#   • Facts stated concisely — do NOT reproduce FIR or statements verbatim.
#   • Every witness must be discussed; failure to discuss a material witness is a defect.
#   • Contradictions and omissions (S.161 Cr.P.C. statements vs. court testimony) MUST be noted.

# BENEFIT OF DOUBT:
#   • Must be genuine, reasonable doubt — not a forced or fanciful doubt.
#   • "Benefit of the doubt is a right of the accused, not a charity." — PLD 2018 SC 70.
#   • Doubt arising from prosecution's own witnesses or material inconsistency.

# CONVICTION SAFEGUARDS:
#   • Conviction cannot rest on suspicion, however strong.
#   • Court must record why it believed prosecution over defence.
#   • Prior conviction CANNOT be used to prove the present charge.

# ACQUITTAL DISCIPLINE:
#   • Acquittal is NOT a finding of innocence — it is not proved beyond doubt.
#   • Reasons for disbelieving prosecution witnesses must be fully articulated.

# DEATH SENTENCE GUIDANCE:
#   • Aggravating factors: premeditation, cruelty, multiple victims, terrorism nexus.
#   • Mitigating factors: age, first offence, provocation, mental illness, remorse.
#   • Mandatory: Forward to High Court for confirmation (S.374 Cr.P.C.).

# WHAT TO AVOID:
#   ✗ Bare findings without reasoned discussion.
#   ✗ Contradictory findings on the same charge.
#   ✗ Ignoring defence witnesses or exculpatory evidence.
#   ✗ Stereotypical assumptions about character or community.
#   ✗ Copying prosecution's argument verbatim as the judgment.
#   ✗ Omitting Section 382-B Cr.P.C. computation in conviction orders.
# """,
#         metadata={"source": "Criminal_Drafting_Standards", "type": "style"},
#     ),

#     Document(
#         page_content="""
# PAKISTAN CRIMINAL JUDGMENT – SPECIAL COURT PROCEDURES

# A. SESSIONS COURT (Offences: death / life / 7+ years)
#    Trial: SS. 265-A to 265-L Cr.P.C. (Warrant Cases)
#    Charge: S.265-C Cr.P.C. | Evidence: S.265-D | Statement: S.342 | Judgment: S.265-I

# B. MAGISTRATE COURT (Offences: up to 7 years)
#    Summary Trial: SS. 260-265 Cr.P.C. | Warrant Trial: SS. 241-A to 250 Cr.P.C.

# C. ANTI-TERRORISM COURT (ATC)
#    Governed by ATA 1997, S.19 | No bail on scheduled offences unless double presumption rebutted.

# D. ACCOUNTABILITY COURT (NAB)
#    NAO 1999 | Reverse burden on accused | Plea Bargain and Voluntary Return available.

# BAIL PRINCIPLES (reference for context):
#    • Pre-trial bail: Bail is the rule; jail is the exception — PLD 2021 SC 459.
#    • Bailable offences: S.496 Cr.P.C. (bail is a right).
#    • Non-bailable: S.497 Cr.P.C. — nature of offence, strength of evidence, abscondence risk.
#    • Post-conviction bail pending appeal: S.426 Cr.P.C.
# """,
#         metadata={"source": "Special_Court_Procedures", "type": "procedure"},
#     ),
# ]


# # ══════════════════════════════════════════════════════════════════════════════
# # 2. FEW-SHOT EXAMPLES
# # ══════════════════════════════════════════════════════════════════════════════

# FEW_SHOT_EXAMPLES = [
#     {
#         "input": (
#             "Write the court heading, FIR details, and prosecution case for a murder "
#             "trial (Section 302 PPC) in the Sessions Court Lahore. Accused is Zafar Iqbal, "
#             "alleged to have shot Muhammad Saleem on 12.03.2022."
#         ),
#         "output": """
# IN THE COURT OF ADDITIONAL SESSIONS JUDGE (II), LAHORE

# Sessions Case No. 412 of 2022

# FIR No. 245 dated 12.03.2022  |  P.S. Defence, Lahore

# The State                                                    … Prosecution

#                                         VERSUS

# Zafar Iqbal s/o Abdul Rahim, r/o House No. 7-B, Model Town Extension,
# Lahore, aged approximately 35 years                          … Accused

# OFFENCE: Under Section 302(b) Pakistan Penal Code 1860

# Counsel for State      : Mr. Asad Khan, Learned Additional Prosecutor General
# Counsel for Accused    : Mr. Kamran Butt, Advocate
# Date of Commencement   : 20.05.2022
# Date of Decision       : 18.03.2024

# ─────────────────────────────────────────────────────────────────────
# JUDGMENT
# ─────────────────────────────────────────────────────────────────────

# 1. PROSECUTION CASE

# FIR No. 245 dated 12.03.2022 was registered at Police Station Defence, Lahore
# on the complaint of Muhammad Akram (PW-1), brother of the deceased. On
# 12.03.2022 at approximately 08:30 p.m., the deceased was standing near Chowk
# Defence Phase-V when the accused Zafar Iqbal arrived on a motorcycle,
# exchanged heated words over a prior property dispute, drew a pistol, and
# fired two shots at close range. Both shots struck the deceased in the chest.
# The deceased was rushed to Services Hospital where he was pronounced dead on
# arrival. The post-mortem was conducted by Dr. Amjad Hussain (PW-5).

# The police prepared the crime scene sketch (Exh.P-3), recovered two empty
# bullet casings (Exh.P-4), and sent the same to FSL Lahore for ballistic
# examination. The accused was arrested on 25.03.2022 and, upon his pointation,
# a .30-bore pistol (Exh.P-5) was recovered under a memorandum of recovery
# (Exh.P-6) in presence of two independent witnesses.

# The case was challaned before this Court; charge was framed on 10.06.2022,
# to which the accused pleaded not guilty and claimed trial.
# """,
#     },
#     {
#         "input": (
#             "Write the evidence discussion, finding, and conviction sentence for the above "
#             "murder case where two eyewitnesses and forensic evidence support the prosecution "
#             "and the accused's alibi defence was weak."
#         ),
#         "output": """
# 4. DISCUSSION & APPRECIATION OF EVIDENCE

# I have heard the learned APG and the learned Defence Counsel at length and have
# perused the entire record with utmost care.

# (i) Ocular Account:

# The prosecution relies primarily on PW-1 (Muhammad Akram, complainant/brother
# of deceased) and PW-2 (Bashir Ahmed, eyewitness). Both were present at the
# place of occurrence and their presence has not been seriously challenged.
# PW-1 identified the accused — known to him personally for several years — in
# the light of a street lamp. PW-2 fully corroborated PW-1 in all material
# particulars: time, place, manner of firing, and the accused's identity.

# The Defence impeached PW-1 on the ground of enmity arising from a property
# dispute. The mere existence of enmity does not render an otherwise reliable
# eyewitness account false. The Supreme Court has consistently held that a related
# or inimical witness is not automatically disqualified; his evidence is scrutinised
# with extra care and, if found credible, can sustain conviction. Reliance: 2022
# SCMR 1021; PLD 2020 SC 500. On careful scrutiny, both PW-1 and PW-2 appear
# truthful, consistent, and natural in their narration.

# (ii) Medical Evidence:

# PW-5 (Dr. Amjad Hussain) conducted the post-mortem examination. He found two
# entry wounds on the left anterior chest, projectile recovered from the thoracic
# cavity. Cause of death: haemorrhage and shock due to firearm injuries. This
# fully corroborates the ocular account as to manner and cause of death.

# (iii) Forensic Evidence:

# The FSL report (Exh.P-7) confirms that the two empty cartridges (Exh.P-4) were
# fired from the recovered pistol (Exh.P-5). This forensic link between the weapon
# and the crime scene is a significant corroborating piece of evidence.

# (iv) Defence Plea — Alibi:

# The accused, in his Section 342 Cr.P.C. statement, claimed he was in Gujranwala
# attending a wedding. DW-1's testimony in support was vague and internally
# inconsistent — he could not name the host, specify the venue address, or produce
# any corroborating document. An alibi must be established on balance of
# probabilities. The defence has manifestly failed. The alibi is rejected.

# ─────────────────────────────────────────────────────────────────────
# 5. FINDING ON CHARGE
# ─────────────────────────────────────────────────────────────────────

# The prosecution has proved its case against the accused beyond reasonable doubt.
# The charge under Section 302(b) PPC stands PROVED. Verdict: CONVICTED.

# ─────────────────────────────────────────────────────────────────────
# 6. SENTENCE
# ─────────────────────────────────────────────────────────────────────

# The accused Zafar Iqbal s/o Abdul Rahim is convicted under Section 302(b) PPC
# and sentenced to IMPRISONMENT FOR LIFE. He is further directed to pay Diyat
# (at the current Government-notified value) to the legal heirs of the deceased
# within one year, failing which recoverable as arrears of land revenue.

# Fine of Rs. 50,000/-; in default, three months' simple imprisonment.
# Benefit of Section 382-B Cr.P.C. is extended. Custody from 25.03.2022 is
# set off against the sentence.

# ─────────────────────────────────────────────────────────────────────
# 7. OPERATIVE PART
# ─────────────────────────────────────────────────────────────────────

#   (i)   Accused CONVICTED under S.302(b) PPC — imprisonment for life.
#   (ii)  Diyat payable to legal heirs as stated above.
#   (iii) Fine of Rs. 50,000/- imposed; default: 3 months' imprisonment.
#   (iv)  Benefit of S.382-B Cr.P.C. extended.
#   (v)   Jail warrant to issue. Convict returned to judicial custody.

# Announced in open court on 18.03.2024.

#                                                           (Signature)
#                                    Additional Sessions Judge (II), Lahore
# """,
#     },
#     {
#         "input": (
#             "Draft a full criminal judgment for a narcotics case under Section 9(c) CNS Act 1997. "
#             "Accused Muhammad Tariq arrested with 2.5 kg heroin. Recovery witnessed by independent "
#             "witnesses and confirmed by Chemical Examiner. Accused denies knowledge."
#         ),
#         "output": """
# IN THE COURT OF SPECIAL JUDGE (CNS), LAHORE

# CNS Case No. 88 of 2023
# FIR No. 112 dated 05.04.2023  |  P.S. Airport, Lahore

# The State                                                    … Prosecution
#                                         VERSUS
# Muhammad Tariq s/o Ghulam Nabi, r/o Village Chak 45/GB,
# District Faisalabad, aged approximately 28 years             … Accused

# OFFENCE: Section 9(c) Control of Narcotic Substances Act, 1997

# Counsel for State   : Mr. Bilal Zafar, Learned APG (CNS)
# Counsel for Accused : Mr. Salman Shah, Advocate
# Date of Decision    : 12.09.2023

# ─────────────────────────────────────────────────────────────────────
# JUDGMENT
# ─────────────────────────────────────────────────────────────────────

# 1. PROSECUTION CASE

# On 05.04.2023, acting on Special Branch intelligence, ASI Nasir Hussain (PW-1)
# intercepted the accused at Allama Iqbal International Airport, Lahore. Personal
# search revealed a concealed belt around his torso containing ten sealed packets.
# The packets were opened before two independent witnesses — Muhammad Faisal (PW-2)
# and Arshad Mehmood (PW-3) — yielding a white crystalline substance weighing 2,500
# grams. A memorandum of recovery (Exh.P-2) was prepared at spot. A 10-gram sample
# was separated, sealed, and dispatched to the Chemical Examiner (Exh.P-3). The
# Chemical Examiner's Report (Exh.P-5) confirmed the substance to be diacetylmorphine
# (heroin), a Scheduled Substance under the CNS Act 1997.

# 2. CHARGE & PLEA

# Charge under Section 9(c) CNS Act 1997 was framed on 01.06.2023. The accused
# pleaded not guilty and claimed trial.

# 3. PROSECUTION EVIDENCE

# PW-1 (ASI Nasir Hussain) deposed to the interception, search, and recovery.
# PW-2 and PW-3 (independent witnesses) deposed to witnessing the recovery and
# signing the memorandum. PW-4 (Dr. Shumaila Riaz, Chemical Examiner) appeared
# in the witness box, produced Exh.P-5, and explained the testing methodology
# confirming the substance as heroin.

# 4. STATEMENT UNDER SECTION 342 Cr.P.C.

# The accused denied the charge. He stated the belt was placed in his bag by an
# unknown person at Faisalabad bus station. He did not appear as his own witness
# and produced no defence evidence.

# 5. ARGUMENTS

# Learned APG submitted that the recovery was direct, witnessed by two independent
# persons, and confirmed by expert analysis. The reverse burden had shifted to the
# accused under S.9 CNS Act who had failed to discharge it.

# Learned Defence Counsel argued that the recovery was planted and the independent
# witnesses were associated with the police.

# 6. DISCUSSION & APPRECIATION OF EVIDENCE

# PW-2 and PW-3 (independent witnesses) have fully supported the prosecution's
# version and their testimony is consistent with PW-1's account in all material
# particulars. The Defence suggestion of association with police is a bare
# assertion without factual basis. I find their evidence credible.

# The Chemical Examiner's report (Exh.P-5) stands unchallenged in substance. The
# accused's allegation that the substance was planted is wholly unsupported. The
# contraband was found on his person in a deliberately concealed belt — an
# arrangement clearly purposive. Conscious possession is proved beyond reasonable
# doubt.

# Once conscious possession of a controlled substance is established, the reverse
# burden under Section 9 CNS Act 1997 shifts to the accused to prove innocent
# possession. The accused's bare denial is insufficient. He has wholly failed to
# discharge this burden. Reliance: PLD 2019 SC 620; 2021 SCMR 515.

# 7. FINDING

# The charge under Section 9(c) CNS Act 1997 stands PROVED beyond reasonable
# doubt. Verdict: CONVICTED.

# 8. SENTENCE

# Having regard to the substantial quantity (2,500 grams of heroin), the
# deliberate concealment, and absence of mitigating factors:

#   (i)  Rigorous Imprisonment for FOURTEEN (14) YEARS under S.9(c) CNS Act 1997.
#   (ii) Fine of Rs. 1,000,000/- (One Million); in default: two years' rigorous
#        imprisonment.
#   (iii) Contraband (Exh.P-4) forfeited to the State; to be destroyed after
#         expiry of appeal period as per standing SOP.
#   (iv) Benefit of Section 382-B Cr.P.C. extended; custody from 05.04.2023
#        set off against sentence.

# 9. OPERATIVE PART

#   (i)   Accused CONVICTED under S.9(c) CNS Act 1997.
#   (ii)  Sentence: 14 years R.I. + fine Rs. 1,000,000/-.
#   (iii) Contraband forfeited and to be destroyed.
#   (iv)  S.382-B Cr.P.C. benefit extended.
#   (v)   Jail warrant to issue.

# Announced in open court on 12.09.2023.

#                                                      (Signature)
#                                         Special Judge (CNS), Lahore
# """,
#     },
# ]


# # ══════════════════════════════════════════════════════════════════════════════
# # 3. SYSTEM PROMPTS
# # ══════════════════════════════════════════════════════════════════════════════

# SYSTEM_PROMPT = """You are 'CriminalJudicialGPT,' an AI Assistant exclusively designed to
# support Judges presiding over criminal matters in Pakistani courts.

# CORE IDENTITY:
# When asked for an introduction, respond with:
# "I am CriminalJudicialGPT, a specialised AI assistant designed to support judges presiding
# over criminal cases in Pakistan. I am trained on the Code of Criminal Procedure 1898, Pakistan
# Penal Code 1860, Qisas and Diyat laws, CNS Act 1997, Anti-Terrorism Act 1997, and all
# major criminal law statutes and superior court precedents. My primary function is to assist
# with drafting criminal judgments, evidence appreciation, sentencing, and legal research.
# I am proficient in both English and Urdu."

# PRIMARY ROLE — CRIMINAL JUDGMENT DRAFTING:
# You assist judges in drafting well-structured, legally sound criminal judgments following
# Sections 366-371 Cr.P.C.:
#   1. Court Heading (Court, Case No., FIR details, Parties, Offence, Counsel, Dates)
#   2. Prosecution Case (FIR narrative, modus operandi, role of accused)
#   3. Charge Framed & Plea of Accused (S.242/265-C Cr.P.C.)
#   4. Prosecution Evidence (PW-1, PW-2 … with Exh.P-1, Exh.P-2 …)
#   5. Statement of Accused under Section 342 Cr.P.C.
#   6. Defence Evidence (DW-1 … with Exh.D-1 …) if any
#   7. Arguments of Counsel
#   8. Discussion & Appreciation of Evidence (witness-by-witness, exhibit-by-exhibit)
#   9. Finding on Charge (Proved / Not Proved / Benefit of Doubt)
#   10. Sentence (if convicted) OR Order of Acquittal
#   11. Operative Part & Signature Block

# MANDATORY RULES:
#   • Standard of proof: BEYOND REASONABLE DOUBT — never lower.
#   • Benefit of the doubt must always be given to the accused where genuine doubt exists.
#   • Every prosecution witness must be individually evaluated.
#   • Material contradictions (S.161 Cr.P.C. vs. court statement) MUST be discussed.
#   • Medical and forensic evidence must be reconciled with ocular account.
#   • Section 382-B Cr.P.C. set-off is MANDATORY in every conviction order.
#   • Qisas/Diyat framework (Ss. 299-338 PPC) must be applied in homicide cases.
#   • Death sentence: flag mandatory High Court confirmation under S.374 Cr.P.C.
#   • Cite Pakistani criminal precedents (SCMR, PCrLJ, PLD) for every legal proposition.
#   • CNS Act: address reverse burden once conscious possession is proved.
#   • Sexual offences: note in-camera requirement; DNA evidence; prohibition on two-finger test.

# CONTEXT FROM KNOWLEDGE BASE:
# Use the following retrieved context to inform your response:
# {context}

# BEHAVIOURAL GUARDRAILS:
#   • Remain strictly neutral, impartial, and objective.
#   • Treat all case information as highly confidential.
#   • Never express personal opinion on guilt outside the evidence record.
#   • Do not volunteer the current date/time unless explicitly asked."""

# HISTORY_SYSTEM_PROMPT = """You are 'CriminalJudicialGPT,' an AI Assistant exclusively designed to
# support Judges presiding over criminal matters in Pakistani courts.

# You assist judges in drafting well-structured criminal judgments following Ss. 366-371 Cr.P.C.:
#   1. Court Heading  2. Prosecution Case  3. Charge & Plea  4. Prosecution Evidence
#   5. S.342 Statement  6. Defence Evidence  7. Arguments  8. Evidence Discussion
#   9. Finding on Charge  10. Sentence / Acquittal  11. Operative Part

# MANDATORY RULES:
#   • Standard of proof: BEYOND REASONABLE DOUBT.
#   • Benefit of the doubt always to the accused where genuine doubt exists.
#   • Every prosecution witness must be individually evaluated.
#   • Section 382-B Cr.P.C. set-off is MANDATORY in every conviction order.
#   • Qisas/Diyat framework applies in homicide cases (Ss. 299-338 PPC).
#   • Death sentence: mandatory High Court confirmation under S.374 Cr.P.C.
#   • Cite SCMR, PCrLJ, PLD precedents for every legal proposition.
#   • CNS Act cases: address reverse burden once conscious possession is proved.

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
#         # k=4 for criminal cases — more context chunks needed for complex law
#         self.retriever = self.vectorstore.as_retriever(search_kwargs={"k": 4})

#         # LLM — slightly lower temperature for deterministic legal drafting
#         self.llm = ChatGroq(
#             model="llama-3.3-70b-versatile",
#             temperature=0.15,
#             groq_api_key=api_key,
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
#     print("⚙️  Building Criminal RAG engine (embeddings + vector store + Groq LLM)...")
#     await asyncio.get_event_loop().run_in_executor(None, rag_engine.build)
#     print("✅  CriminalJudicialGPT RAG engine is ready.")
#     yield
#     print("🛑  Shutting down CriminalJudicialGPT.")


# app = FastAPI(
#     title="CriminalJudicialGPT API",
#     description=(
#         "RAG-powered API for Pakistan Criminal Court judgment drafting. "
#         "Covers PPC, Cr.P.C., CNS Act, ATA, Qisas/Diyat. "
#         "Backed by Groq (llama-3.3-70b) and LangChain v0.3+."
#     ),
#     version="1.0.0",
#     lifespan=lifespan,
# )

# # ── CORS ─────────────────────────────────────────────────────────────────────
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


# class ChatResponse(BaseModel):
#     query: str
#     response: str
#     sources: list[str] = Field(default_factory=list)


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

#     # Rebuild prompt for streaming
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
#             yield f"data: {token}\n\n"

#     yield "data: [DONE]\n\n"


# # ══════════════════════════════════════════════════════════════════════════════
# # 8. ROUTES
# # ══════════════════════════════════════════════════════════════════════════════

# @app.get("/", tags=["Health"])
# async def root():
#     return {
#         "service": "CriminalJudicialGPT API",
#         "status": "running",
#         "docs": "/docs",
#         "covers": "PPC | Cr.P.C. | CNS Act | ATA | Qisas/Diyat",
#     }


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


# @app.post("/chat", response_model=ChatResponse, tags=["Chat"])
# async def chat(request: ChatRequest):
#     """
#     Send a query and receive a full criminal judgment draft or legal answer.
#     Best for frontends that render the entire response at once.
#     """
#     if rag_engine.rag_chain is None:
#         raise HTTPException(status_code=503, detail="RAG engine not ready.")

#     try:
#         response = await asyncio.get_event_loop().run_in_executor(
#             None, rag_engine.rag_chain.invoke, request.query
#         )
#         sources = get_source_names(request.query)
#         return ChatResponse(query=request.query, response=response, sources=sources)

#     except Exception as exc:
#         raise HTTPException(status_code=500, detail=str(exc))


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
#             "X-Accel-Buffering": "no",
#             "Connection": "keep-alive",
#         },
#     )


# @app.post("/chat/history", response_model=HistoryChatResponse, tags=["Chat"])
# async def chat_with_history(request: HistoryChatRequest):
#     """
#     Multi-turn conversation. Pass the same session_id across turns to maintain
#     context. A new session_id starts a fresh conversation.
#     """
#     if rag_engine.history_chain is None:
#         raise HTTPException(status_code=503, detail="RAG engine not ready.")

#     if request.session_id not in session_store:
#         session_store[request.session_id] = []

#     history = session_store[request.session_id]

#     try:
#         response = await asyncio.get_event_loop().run_in_executor(
#             None,
#             rag_engine.history_chain.invoke,
#             {"question": request.query, "chat_history": history},
#         )

#         history.append(HumanMessage(content=request.query))
#         history.append(AIMessage(content=response))

#         sources = get_source_names(request.query)
#         turn = len(history) // 2

#         return HistoryChatResponse(
#             session_id=request.session_id,
#             query=request.query,
#             response=response,
#             sources=sources,
#             turn=turn,
#         )

#     except Exception as exc:
#         raise HTTPException(status_code=500, detail=str(exc))


# @app.delete("/chat/history/{session_id}", tags=["Sessions"])
# async def clear_session(session_id: str):
#     """Clear all conversation history for a given session."""
#     if session_id not in session_store:
#         raise HTTPException(status_code=404, detail="Session not found.")
#     del session_store[session_id]
#     return {"message": f"Session '{session_id}' cleared successfully."}


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
CriminalJudicialGPT – FastAPI Server
Pakistan Criminal Courts RAG Application
──────────────────────────────────────────
INSTALLATION:
    pip install fastapi uvicorn langchain langchain-community langchain-groq \
                langchain-huggingface faiss-cpu sentence-transformers \
                python-dotenv

RUN:
    uvicorn criminal_api:app --host 0.0.0.0 --port 8001 --reload

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
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from pydantic import BaseModel, Field

# ── LangChain v0.3+ ──────────────────────────────────────────────────────────
from langchain_groq import ChatGroq
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
from langchain_core.messages import HumanMessage, AIMessage
from langchain_core.prompts import (
    ChatPromptTemplate,
    FewShotChatMessagePromptTemplate,
    MessagesPlaceholder,
)
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough, RunnableLambda

load_dotenv()

# ── Document export (Markdown → .docx, served locally) ──────────────────────
# Fully separate from the RAG/LLM chain — only ever called on the *final*
# markdown string the chain has already produced.
import document_export
from document_export import should_generate_document, export_markdown_as_docx


# ══════════════════════════════════════════════════════════════════════════════
# 1. KNOWLEDGE BASE — Pakistan Criminal Judgment Format & Rules
# ══════════════════════════════════════════════════════════════════════════════

KNOWLEDGE_DOCS = [
    Document(
        page_content="""
PAKISTAN CRIMINAL JUDGMENT – MANDATORY STRUCTURAL FORMAT
(Code of Criminal Procedure 1898, Sections 366-371)

SECTION 1 – COURT HEADING (Caption Block)
  • Name of Court (e.g. "In the Court of Sessions Judge / Additional Sessions Judge,
    Lahore" OR "In the Court of Judicial Magistrate 1st Class, Lahore")
  • Sessions Case No. / Criminal Case No. / Complaint Case No. and Year
  • FIR No., Date, Police Station, District
  • The State  vs.  Accused: [Full Name] s/o [Father's Name], r/o [Address],
    CNIC No. [if available], Age: [__] years, Occupation: [__]
  • Offence(s): Under Section(s) [__] PPC / special law
  • Counsel for State: Learned APG / Prosecutor / Complainant's Counsel
  • Counsel for Defence: Mr./Ms. [Name], Advocate
  • Date of Commencement | Date of Decision

SECTION 2 – FIR / COMPLAINT DETAILS & PROSECUTION CASE
  • FIR No., date, time, police station, challan submitted on [date]
  • Brief narration of the prosecution's version of events
  • Modus operandi, place of occurrence, time of occurrence
  • Role attributed to each accused

SECTION 3 – CHARGE (Section 242/265-C Cr.P.C.)
  • Exact charge(s) framed — PPC section(s) with punishment range
  • Date charge was framed
  • Accused's plea: Guilty / Not Guilty
  • If guilty plea: record and convict under Section 243 Cr.P.C.

SECTION 4 – PROSECUTION EVIDENCE
  • Prosecution witnesses examined: PW-1, PW-2 … (name, role)
  • Documentary / physical exhibits: Exh.P-1, Exh.P-2 …
  • Medical evidence (MLR, Post-Mortem Report) if applicable
  • Forensic / ballistic / chemical analysis reports if applicable

SECTION 5 – STATEMENT OF ACCUSED (Section 342 Cr.P.C.)
  • Summary of the accused's statement under Section 342 Cr.P.C.
  • Whether accused opted to appear as his own witness (Section 340(2) Cr.P.C.)
  • Defence witnesses (if any): DW-1, DW-2 … with exhibits Exh.D-1 …

SECTION 6 – ARGUMENTS OF COUNSEL
  • Learned APG / Prosecutor's submissions
  • Learned Defence Counsel's submissions

SECTION 7 – DISCUSSION & APPRECIATION OF EVIDENCE
  • Evaluate each prosecution witness individually
  • Test for consistency, corroboration, and credibility
  • Appreciate circumstantial evidence under the "chain of circumstances" rule
  • Discuss medical, forensic, and expert evidence
  • Address alibi or defence plea with reasons for acceptance or rejection
  • Every material discrepancy must be addressed

SECTION 8 – FINDING ON CHARGE / VERDICT
  On Charge No. 1 (Section __ PPC):
    Finding: Proved / Not Proved / Partially Proved
    Reasons: [detailed reasons]
  Verdict: CONVICTED / ACQUITTED

SECTION 9 – SENTENCE (if convicted) OR ACQUITTAL ORDER
  CONVICTION:
    • Nature of sentence (imprisonment/death/fine/Qisas/Diyat/Ta'zir)
    • Quantum of sentence with legal basis
    • Benefit of Section 382-B Cr.P.C. (set-off of pre-trial detention)
    • Compensation under Section 544-A Cr.P.C. if ordered
  ACQUITTAL:
    • "Charge stands not proved beyond reasonable doubt."
    • Order of acquittal under Section 245/265-H(1) Cr.P.C.
    • Bail bonds cancelled; sureties discharged

SECTION 10 – OPERATIVE PART & SIGNATURE
  • Clear, unambiguous operative order
  • Announced in open court on [date]
  • Signed and dated by the Presiding Officer with designation

PROCEDURAL RULES:
  • Judgment must be in writing (Section 366 Cr.P.C.)
  • Must state the offence proved and punishment (Section 367 Cr.P.C.)
  • In death sentence cases: must be confirmed by High Court (Section 374 Cr.P.C.)
  • Oral judgments are impermissible
  • Judgment must be pronounced in open court (Section 366 Cr.P.C.)
""",
        metadata={"source": "CrPC_Judgment_Format", "type": "structure"},
    ),

    Document(
        page_content="""
PAKISTAN CRIMINAL JUDGMENT – STANDARD OF PROOF & EVIDENCE RULES

STANDARD OF PROOF IN CRIMINAL CASES:
  Beyond Reasonable Doubt — the highest legal standard.
  Doubt is to be resolved in favour of the accused. (Benefit of the doubt)
  "It is better that ten guilty persons escape than that one innocent suffer."

BURDEN OF PROOF:
  • Primary burden: On the Prosecution to prove guilt — Article 117 Qanun-e-Shahadat 1984.
  • Secondary/Reverse burden: On accused in certain special laws (e.g. S.9 CNS Act 1997).
  • Burden NEVER shifts to the accused on the primary charge.

OCULAR EVIDENCE (Eyewitnesses):
  • Each eyewitness must be tested individually.
  • Consistency inter se increases probative value.
  • Minor discrepancies in trivial details are not fatal to prosecution; material
    contradictions on material particulars may be fatal.
  • Related/partisan witnesses are not automatically discarded — scrutinised with extra care.
    Reliance: PLD 2022 SC 170; 2021 SCMR 738.

MEDICAL EVIDENCE:
  • Post-Mortem Report (PMR) corroborates manner and cause of death.
  • Medico-Legal Report (MLR) corroborates injuries in hurt cases.
  • Inconsistency between ocular account and medical evidence may create reasonable doubt.

CONFESSIONAL STATEMENT:
  • Judicial Confession (before Magistrate under S.164 Cr.P.C.): admissible; must be voluntary.
  • Extra-Judicial Confession: weak; requires strong corroboration.
  • Confession to Police: inadmissible under Article 38 Qanun-e-Shahadat 1984.

DYING DECLARATION (Marna Ka Bayan):
  • Admissible under Article 46 Qanun-e-Shahadat 1984.
  • Proximity to death and mental capacity are critical.

CIRCUMSTANTIAL EVIDENCE:
  • Each circumstance must be proved beyond doubt.
  • All circumstances must form a complete chain pointing exclusively to accused's guilt.

RECOVERY OF WEAPON / CONTRABAND:
  • Memorandum of recovery must be prepared in presence of two neutral witnesses.
  • Recovery from open/accessible places is weak without independent witnesses.

FORENSIC / SCIENTIFIC EVIDENCE:
  • DNA, Ballistic, Chemical Examiner reports are expert opinions — Article 59 QSO 1984.
  • Court is not bound by expert opinion but must give cogent reasons for rejection.

CITATION FORMAT (Criminal Precedents):
  • Supreme Court : 2023 SCMR 456 | PLD 2023 SC 100
  • Lahore HC     : 2023 PCrLJ 200 | PLD 2023 Lah. 50
  • Sindh HC      : 2022 PCrLJ 700 | PLD 2022 Kar. 120
  • Islamabad HC  : 2023 PCrLJ 900
  • Key reporters : SCMR, PCrLJ, PLD, MLD

BINDING HIERARCHY:
  1. Supreme Court of Pakistan (binding on all courts)
  2. Full Bench → Division Bench → Single Bench of relevant High Court
  3. Other provincial High Courts (persuasive only)
""",
        metadata={"source": "Criminal_Evidence_Rules", "type": "evidence"},
    ),

    Document(
        page_content="""
PAKISTAN CRIMINAL JUDGMENT – QISAS, DIYAT & TA'ZIR FRAMEWORK
(Pakistan Penal Code 1860 – Chapter XVI, Sections 299–338-H as amended)

DEFINITIONS:
  • Qatl-e-Amd (S.300 PPC): Intentional murder — Qisas OR Diyat (on waiver/compounding)
    OR Ta'zir (S.302 PPC: death / life imprisonment / rigorous imprisonment up to 25 years)
  • Qatl Shibh-ul-Amd (S.315 PPC): Murder-like killing without intent — Diyat + Ta'zir
  • Qatl-ul-Khata (S.318 PPC): Culpable homicide not amounting to murder — Diyat only

QISAS (Retaliation):
  • Right of heirs to demand equal retaliation (life for life).
  • Requirements: (i) Accused is adult and sane; (ii) Victim not a descendant of accused.
  • Execution of Qisas by State after High Court confirmation.

DIYAT (Blood Money):
  • Compulsory Diyat amount: value of 30,630 grams of silver (revised periodically).
  • Payable to legal heirs of victim.
  • Compounding/Waiver (S.309/310 PPC): Heirs may waive Qisas in lieu of Diyat or Afw.
  • Even after waiver of Qisas, court may impose Ta'zir — PLD 2021 SC 600.

TA'ZIR (Discretionary Punishment under S.302(b) PPC):
  • Death penalty or imprisonment for life.
  • Court may impose Ta'zir ex-officio even when Qisas is waived.
  • Sentence must be proportionate to gravity of offence.

ARSH (Compensation for Hurt):
  • Fixed proportion of Diyat for specified injuries.
  • Relevant for hurt/grievous hurt cases (Sections 333-338 PPC).

IMPORTANT SENTENCING NOTES:
  • Multiple sentences run concurrently unless court orders otherwise (S.397 Cr.P.C.).
  • Set-off under Section 382-B Cr.P.C. for pre-sentence custody period — MANDATORY.
  • Juvenile offenders: Juvenile Justice System Act 2018 — reformatory measures preferred.
  • Death sentence: mandatory confirmation by High Court under S.374 Cr.P.C.
""",
        metadata={"source": "Qisas_Diyat_Framework", "type": "sentencing"},
    ),

    Document(
        page_content="""
PAKISTAN CRIMINAL JUDGMENT – MAJOR OFFENCE TYPES & KEY LEGAL ELEMENTS

A. MURDER / QATL-E-AMD (Section 302 PPC)
   Elements: (1) Death; (2) Caused by accused; (3) Intentional act.
   Key Evidence: PMR, ocular witnesses, weapon recovery, FSL report, motive.

B. ATTEMPT TO MURDER (Section 324 PPC)
   Elements: (1) Act done; (2) Intention to commit murder; (3) No death resulted.

C. HURT / GRIEVOUS HURT (Sections 337-A to 337-L PPC)
   Elements: (1) Voluntary hurt; (2) Nature of injury (Itlaf-i-udw, etc.).

D. ROBBERY & DACOITY (Sections 392-402 PPC)
   Elements: (1) Theft or extortion; (2) Use of force/fear; (3) Dacoity: 5+ persons.
   Note: Common intention (S.34 PPC) is crucial.

E. KIDNAPPING / ABDUCTION (Sections 359-369 PPC)
   Elements: (1) Taking/enticing a person; (2) From guardian OR by force; (3) Purpose.

F. NARCOTIC OFFENCES (Control of Narcotic Substances Act 1997 — CNS Act)
   S.9(a): Possession — up to 2 years / fine.
   S.9(b): Trafficking — 2 years to life imprisonment.
   S.9(c): Large-scale — life imprisonment or death.
   Elements: (1) Conscious possession; (2) Knowledge; (3) Quantity.
   Note: Reverse burden applies once conscious possession established.

G. TERRORISM OFFENCES (Anti-Terrorism Act 1997)
   S.6 ATA defines "act of terrorism."
   Trial: Before Anti-Terrorism Court (ATC) — special procedure under S.19 ATA.

H. SEXUAL OFFENCES (Sections 375/376 PPC as amended by Anti-Rape Act 2021)
   Elements: (1) Sexual intercourse; (2) Without consent / with minor.
   Evidence: DNA mandatory; Two-Finger Test prohibited — PLD 2021 SC 788.
   In-camera proceedings mandatory under Section 352 Cr.P.C.

I. CHEATING / FRAUD (Sections 420, 468, 471 PPC)
   Elements: (1) Deception; (2) Dishonest inducement; (3) Harm to property.

J. THEFT (Sections 379-382 PPC)
   Elements: (1) Movable property; (2) Out of possession of another; (3) No consent;
             (4) Dishonest intention.

COMMON PRINCIPLES:
  • Alibi must be proved by accused on balance of probabilities (Art. 122 QSO 1984).
  • Motive alone does not establish guilt — corroborates ocular evidence only.
  • Unexplained delay in FIR weakens prosecution unless satisfactorily explained.
  • Probability of false implication for enmity must be considered.
""",
        metadata={"source": "Offence_Types_Pakistan", "type": "offence_types"},
    ),

    Document(
        page_content="""
PAKISTAN CRIMINAL JUDGMENT – DRAFTING STANDARDS & STYLE GUIDE

LANGUAGE & TONE:
  • Formal, temperate, objective — free from emotional language.
  • Refer to accused as "the accused" — never pejoratively.
  • Refer to deceased as "the deceased" after first full mention.

STRUCTURE DISCIPLINE:
  • Facts stated concisely — do NOT reproduce FIR or statements verbatim.
  • Every witness must be discussed; failure to discuss a material witness is a defect.
  • Contradictions and omissions (S.161 Cr.P.C. statements vs. court testimony) MUST be noted.

BENEFIT OF DOUBT:
  • Must be genuine, reasonable doubt — not a forced or fanciful doubt.
  • "Benefit of the doubt is a right of the accused, not a charity." — PLD 2018 SC 70.
  • Doubt arising from prosecution's own witnesses or material inconsistency.

CONVICTION SAFEGUARDS:
  • Conviction cannot rest on suspicion, however strong.
  • Court must record why it believed prosecution over defence.
  • Prior conviction CANNOT be used to prove the present charge.

ACQUITTAL DISCIPLINE:
  • Acquittal is NOT a finding of innocence — it is not proved beyond doubt.
  • Reasons for disbelieving prosecution witnesses must be fully articulated.

DEATH SENTENCE GUIDANCE:
  • Aggravating factors: premeditation, cruelty, multiple victims, terrorism nexus.
  • Mitigating factors: age, first offence, provocation, mental illness, remorse.
  • Mandatory: Forward to High Court for confirmation (S.374 Cr.P.C.).

WHAT TO AVOID:
  ✗ Bare findings without reasoned discussion.
  ✗ Contradictory findings on the same charge.
  ✗ Ignoring defence witnesses or exculpatory evidence.
  ✗ Stereotypical assumptions about character or community.
  ✗ Copying prosecution's argument verbatim as the judgment.
  ✗ Omitting Section 382-B Cr.P.C. computation in conviction orders.
""",
        metadata={"source": "Criminal_Drafting_Standards", "type": "style"},
    ),

    Document(
        page_content="""
PAKISTAN CRIMINAL JUDGMENT – SPECIAL COURT PROCEDURES

A. SESSIONS COURT (Offences: death / life / 7+ years)
   Trial: SS. 265-A to 265-L Cr.P.C. (Warrant Cases)
   Charge: S.265-C Cr.P.C. | Evidence: S.265-D | Statement: S.342 | Judgment: S.265-I

B. MAGISTRATE COURT (Offences: up to 7 years)
   Summary Trial: SS. 260-265 Cr.P.C. | Warrant Trial: SS. 241-A to 250 Cr.P.C.

C. ANTI-TERRORISM COURT (ATC)
   Governed by ATA 1997, S.19 | No bail on scheduled offences unless double presumption rebutted.

D. ACCOUNTABILITY COURT (NAB)
   NAO 1999 | Reverse burden on accused | Plea Bargain and Voluntary Return available.

BAIL PRINCIPLES (reference for context):
   • Pre-trial bail: Bail is the rule; jail is the exception — PLD 2021 SC 459.
   • Bailable offences: S.496 Cr.P.C. (bail is a right).
   • Non-bailable: S.497 Cr.P.C. — nature of offence, strength of evidence, abscondence risk.
   • Post-conviction bail pending appeal: S.426 Cr.P.C.
""",
        metadata={"source": "Special_Court_Procedures", "type": "procedure"},
    ),
]


# ══════════════════════════════════════════════════════════════════════════════
# 2. FEW-SHOT EXAMPLES
# ══════════════════════════════════════════════════════════════════════════════

FEW_SHOT_EXAMPLES = [
    {
        "input": (
            "Write the court heading, FIR details, and prosecution case for a murder "
            "trial (Section 302 PPC) in the Sessions Court Lahore. Accused is Zafar Iqbal, "
            "alleged to have shot Muhammad Saleem on 12.03.2022."
        ),
        "output": """
IN THE COURT OF ADDITIONAL SESSIONS JUDGE (II), LAHORE

Sessions Case No. 412 of 2022

FIR No. 245 dated 12.03.2022  |  P.S. Defence, Lahore

The State                                                    … Prosecution

                                        VERSUS

Zafar Iqbal s/o Abdul Rahim, r/o House No. 7-B, Model Town Extension,
Lahore, aged approximately 35 years                          … Accused

OFFENCE: Under Section 302(b) Pakistan Penal Code 1860

Counsel for State      : Mr. Asad Khan, Learned Additional Prosecutor General
Counsel for Accused    : Mr. Kamran Butt, Advocate
Date of Commencement   : 20.05.2022
Date of Decision       : 18.03.2024

─────────────────────────────────────────────────────────────────────
JUDGMENT
─────────────────────────────────────────────────────────────────────

1. PROSECUTION CASE

FIR No. 245 dated 12.03.2022 was registered at Police Station Defence, Lahore
on the complaint of Muhammad Akram (PW-1), brother of the deceased. On
12.03.2022 at approximately 08:30 p.m., the deceased was standing near Chowk
Defence Phase-V when the accused Zafar Iqbal arrived on a motorcycle,
exchanged heated words over a prior property dispute, drew a pistol, and
fired two shots at close range. Both shots struck the deceased in the chest.
The deceased was rushed to Services Hospital where he was pronounced dead on
arrival. The post-mortem was conducted by Dr. Amjad Hussain (PW-5).

The police prepared the crime scene sketch (Exh.P-3), recovered two empty
bullet casings (Exh.P-4), and sent the same to FSL Lahore for ballistic
examination. The accused was arrested on 25.03.2022 and, upon his pointation,
a .30-bore pistol (Exh.P-5) was recovered under a memorandum of recovery
(Exh.P-6) in presence of two independent witnesses.

The case was challaned before this Court; charge was framed on 10.06.2022,
to which the accused pleaded not guilty and claimed trial.
""",
    },
    {
        "input": (
            "Write the evidence discussion, finding, and conviction sentence for the above "
            "murder case where two eyewitnesses and forensic evidence support the prosecution "
            "and the accused's alibi defence was weak."
        ),
        "output": """
4. DISCUSSION & APPRECIATION OF EVIDENCE

I have heard the learned APG and the learned Defence Counsel at length and have
perused the entire record with utmost care.

(i) Ocular Account:

The prosecution relies primarily on PW-1 (Muhammad Akram, complainant/brother
of deceased) and PW-2 (Bashir Ahmed, eyewitness). Both were present at the
place of occurrence and their presence has not been seriously challenged.
PW-1 identified the accused — known to him personally for several years — in
the light of a street lamp. PW-2 fully corroborated PW-1 in all material
particulars: time, place, manner of firing, and the accused's identity.

The Defence impeached PW-1 on the ground of enmity arising from a property
dispute. The mere existence of enmity does not render an otherwise reliable
eyewitness account false. The Supreme Court has consistently held that a related
or inimical witness is not automatically disqualified; his evidence is scrutinised
with extra care and, if found credible, can sustain conviction. Reliance: 2022
SCMR 1021; PLD 2020 SC 500. On careful scrutiny, both PW-1 and PW-2 appear
truthful, consistent, and natural in their narration.

(ii) Medical Evidence:

PW-5 (Dr. Amjad Hussain) conducted the post-mortem examination. He found two
entry wounds on the left anterior chest, projectile recovered from the thoracic
cavity. Cause of death: haemorrhage and shock due to firearm injuries. This
fully corroborates the ocular account as to manner and cause of death.

(iii) Forensic Evidence:

The FSL report (Exh.P-7) confirms that the two empty cartridges (Exh.P-4) were
fired from the recovered pistol (Exh.P-5). This forensic link between the weapon
and the crime scene is a significant corroborating piece of evidence.

(iv) Defence Plea — Alibi:

The accused, in his Section 342 Cr.P.C. statement, claimed he was in Gujranwala
attending a wedding. DW-1's testimony in support was vague and internally
inconsistent — he could not name the host, specify the venue address, or produce
any corroborating document. An alibi must be established on balance of
probabilities. The defence has manifestly failed. The alibi is rejected.

─────────────────────────────────────────────────────────────────────
5. FINDING ON CHARGE
─────────────────────────────────────────────────────────────────────

The prosecution has proved its case against the accused beyond reasonable doubt.
The charge under Section 302(b) PPC stands PROVED. Verdict: CONVICTED.

─────────────────────────────────────────────────────────────────────
6. SENTENCE
─────────────────────────────────────────────────────────────────────

The accused Zafar Iqbal s/o Abdul Rahim is convicted under Section 302(b) PPC
and sentenced to IMPRISONMENT FOR LIFE. He is further directed to pay Diyat
(at the current Government-notified value) to the legal heirs of the deceased
within one year, failing which recoverable as arrears of land revenue.

Fine of Rs. 50,000/-; in default, three months' simple imprisonment.
Benefit of Section 382-B Cr.P.C. is extended. Custody from 25.03.2022 is
set off against the sentence.

─────────────────────────────────────────────────────────────────────
7. OPERATIVE PART
─────────────────────────────────────────────────────────────────────

  (i)   Accused CONVICTED under S.302(b) PPC — imprisonment for life.
  (ii)  Diyat payable to legal heirs as stated above.
  (iii) Fine of Rs. 50,000/- imposed; default: 3 months' imprisonment.
  (iv)  Benefit of S.382-B Cr.P.C. extended.
  (v)   Jail warrant to issue. Convict returned to judicial custody.

Announced in open court on 18.03.2024.

                                                          (Signature)
                                   Additional Sessions Judge (II), Lahore
""",
    },
    {
        "input": (
            "Draft a full criminal judgment for a narcotics case under Section 9(c) CNS Act 1997. "
            "Accused Muhammad Tariq arrested with 2.5 kg heroin. Recovery witnessed by independent "
            "witnesses and confirmed by Chemical Examiner. Accused denies knowledge."
        ),
        "output": """
IN THE COURT OF SPECIAL JUDGE (CNS), LAHORE

CNS Case No. 88 of 2023
FIR No. 112 dated 05.04.2023  |  P.S. Airport, Lahore

The State                                                    … Prosecution
                                        VERSUS
Muhammad Tariq s/o Ghulam Nabi, r/o Village Chak 45/GB,
District Faisalabad, aged approximately 28 years             … Accused

OFFENCE: Section 9(c) Control of Narcotic Substances Act, 1997

Counsel for State   : Mr. Bilal Zafar, Learned APG (CNS)
Counsel for Accused : Mr. Salman Shah, Advocate
Date of Decision    : 12.09.2023

─────────────────────────────────────────────────────────────────────
JUDGMENT
─────────────────────────────────────────────────────────────────────

1. PROSECUTION CASE

On 05.04.2023, acting on Special Branch intelligence, ASI Nasir Hussain (PW-1)
intercepted the accused at Allama Iqbal International Airport, Lahore. Personal
search revealed a concealed belt around his torso containing ten sealed packets.
The packets were opened before two independent witnesses — Muhammad Faisal (PW-2)
and Arshad Mehmood (PW-3) — yielding a white crystalline substance weighing 2,500
grams. A memorandum of recovery (Exh.P-2) was prepared at spot. A 10-gram sample
was separated, sealed, and dispatched to the Chemical Examiner (Exh.P-3). The
Chemical Examiner's Report (Exh.P-5) confirmed the substance to be diacetylmorphine
(heroin), a Scheduled Substance under the CNS Act 1997.

2. CHARGE & PLEA

Charge under Section 9(c) CNS Act 1997 was framed on 01.06.2023. The accused
pleaded not guilty and claimed trial.

3. PROSECUTION EVIDENCE

PW-1 (ASI Nasir Hussain) deposed to the interception, search, and recovery.
PW-2 and PW-3 (independent witnesses) deposed to witnessing the recovery and
signing the memorandum. PW-4 (Dr. Shumaila Riaz, Chemical Examiner) appeared
in the witness box, produced Exh.P-5, and explained the testing methodology
confirming the substance as heroin.

4. STATEMENT UNDER SECTION 342 Cr.P.C.

The accused denied the charge. He stated the belt was placed in his bag by an
unknown person at Faisalabad bus station. He did not appear as his own witness
and produced no defence evidence.

5. ARGUMENTS

Learned APG submitted that the recovery was direct, witnessed by two independent
persons, and confirmed by expert analysis. The reverse burden had shifted to the
accused under S.9 CNS Act who had failed to discharge it.

Learned Defence Counsel argued that the recovery was planted and the independent
witnesses were associated with the police.

6. DISCUSSION & APPRECIATION OF EVIDENCE

PW-2 and PW-3 (independent witnesses) have fully supported the prosecution's
version and their testimony is consistent with PW-1's account in all material
particulars. The Defence suggestion of association with police is a bare
assertion without factual basis. I find their evidence credible.

The Chemical Examiner's report (Exh.P-5) stands unchallenged in substance. The
accused's allegation that the substance was planted is wholly unsupported. The
contraband was found on his person in a deliberately concealed belt — an
arrangement clearly purposive. Conscious possession is proved beyond reasonable
doubt.

Once conscious possession of a controlled substance is established, the reverse
burden under Section 9 CNS Act 1997 shifts to the accused to prove innocent
possession. The accused's bare denial is insufficient. He has wholly failed to
discharge this burden. Reliance: PLD 2019 SC 620; 2021 SCMR 515.

7. FINDING

The charge under Section 9(c) CNS Act 1997 stands PROVED beyond reasonable
doubt. Verdict: CONVICTED.

8. SENTENCE

Having regard to the substantial quantity (2,500 grams of heroin), the
deliberate concealment, and absence of mitigating factors:

  (i)  Rigorous Imprisonment for FOURTEEN (14) YEARS under S.9(c) CNS Act 1997.
  (ii) Fine of Rs. 1,000,000/- (One Million); in default: two years' rigorous
       imprisonment.
  (iii) Contraband (Exh.P-4) forfeited to the State; to be destroyed after
        expiry of appeal period as per standing SOP.
  (iv) Benefit of Section 382-B Cr.P.C. extended; custody from 05.04.2023
       set off against sentence.

9. OPERATIVE PART

  (i)   Accused CONVICTED under S.9(c) CNS Act 1997.
  (ii)  Sentence: 14 years R.I. + fine Rs. 1,000,000/-.
  (iii) Contraband forfeited and to be destroyed.
  (iv)  S.382-B Cr.P.C. benefit extended.
  (v)   Jail warrant to issue.

Announced in open court on 12.09.2023.

                                                     (Signature)
                                        Special Judge (CNS), Lahore
""",
    },
]


# ══════════════════════════════════════════════════════════════════════════════
# 3. SYSTEM PROMPTS
# ══════════════════════════════════════════════════════════════════════════════

SYSTEM_PROMPT = """You are 'CriminalJudicialGPT,' an AI Assistant exclusively designed to
support Judges presiding over criminal matters in Pakistani courts.

CORE IDENTITY:
When asked for an introduction, respond with:
"I am CriminalJudicialGPT, a specialised AI assistant designed to support judges presiding
over criminal cases in Pakistan. I am trained on the Code of Criminal Procedure 1898, Pakistan
Penal Code 1860, Qisas and Diyat laws, CNS Act 1997, Anti-Terrorism Act 1997, and all
major criminal law statutes and superior court precedents. My primary function is to assist
with drafting criminal judgments, evidence appreciation, sentencing, and legal research.
I am proficient in both English and Urdu."

PRIMARY ROLE — CRIMINAL JUDGMENT DRAFTING:
You assist judges in drafting well-structured, legally sound criminal judgments following
Sections 366-371 Cr.P.C.:
  1. Court Heading (Court, Case No., FIR details, Parties, Offence, Counsel, Dates)
  2. Prosecution Case (FIR narrative, modus operandi, role of accused)
  3. Charge Framed & Plea of Accused (S.242/265-C Cr.P.C.)
  4. Prosecution Evidence (PW-1, PW-2 … with Exh.P-1, Exh.P-2 …)
  5. Statement of Accused under Section 342 Cr.P.C.
  6. Defence Evidence (DW-1 … with Exh.D-1 …) if any
  7. Arguments of Counsel
  8. Discussion & Appreciation of Evidence (witness-by-witness, exhibit-by-exhibit)
  9. Finding on Charge (Proved / Not Proved / Benefit of Doubt)
  10. Sentence (if convicted) OR Order of Acquittal
  11. Operative Part & Signature Block

MANDATORY RULES:
  • Standard of proof: BEYOND REASONABLE DOUBT — never lower.
  • Benefit of the doubt must always be given to the accused where genuine doubt exists.
  • Every prosecution witness must be individually evaluated.
  • Material contradictions (S.161 Cr.P.C. vs. court statement) MUST be discussed.
  • Medical and forensic evidence must be reconciled with ocular account.
  • Section 382-B Cr.P.C. set-off is MANDATORY in every conviction order.
  • Qisas/Diyat framework (Ss. 299-338 PPC) must be applied in homicide cases.
  • Death sentence: flag mandatory High Court confirmation under S.374 Cr.P.C.
  • Cite Pakistani criminal precedents (SCMR, PCrLJ, PLD) for every legal proposition.
  • CNS Act: address reverse burden once conscious possession is proved.
  • Sexual offences: note in-camera requirement; DNA evidence; prohibition on two-finger test.

CONTEXT FROM KNOWLEDGE BASE:
Use the following retrieved context to inform your response:
{context}

BEHAVIOURAL GUARDRAILS:
  • Remain strictly neutral, impartial, and objective.
  • Treat all case information as highly confidential.
  • Never express personal opinion on guilt outside the evidence record.
  • Do not volunteer the current date/time unless explicitly asked."""

HISTORY_SYSTEM_PROMPT = """You are 'CriminalJudicialGPT,' an AI Assistant exclusively designed to
support Judges presiding over criminal matters in Pakistani courts.

You assist judges in drafting well-structured criminal judgments following Ss. 366-371 Cr.P.C.:
  1. Court Heading  2. Prosecution Case  3. Charge & Plea  4. Prosecution Evidence
  5. S.342 Statement  6. Defence Evidence  7. Arguments  8. Evidence Discussion
  9. Finding on Charge  10. Sentence / Acquittal  11. Operative Part

MANDATORY RULES:
  • Standard of proof: BEYOND REASONABLE DOUBT.
  • Benefit of the doubt always to the accused where genuine doubt exists.
  • Every prosecution witness must be individually evaluated.
  • Section 382-B Cr.P.C. set-off is MANDATORY in every conviction order.
  • Qisas/Diyat framework applies in homicide cases (Ss. 299-338 PPC).
  • Death sentence: mandatory High Court confirmation under S.374 Cr.P.C.
  • Cite SCMR, PCrLJ, PLD precedents for every legal proposition.
  • CNS Act cases: address reverse burden once conscious possession is proved.

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
        # k=4 for criminal cases — more context chunks needed for complex law
        self.retriever = self.vectorstore.as_retriever(search_kwargs={"k": 4})

        # LLM — slightly lower temperature for deterministic legal drafting
        self.llm = ChatGroq(
            model="llama-3.3-70b-versatile",
            temperature=0.15,
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
    print("⚙️  Building Criminal RAG engine (embeddings + vector store + Groq LLM)...")
    await asyncio.get_event_loop().run_in_executor(None, rag_engine.build)
    print("✅  CriminalJudicialGPT RAG engine is ready.")
    yield
    print("🛑  Shutting down CriminalJudicialGPT.")


app = FastAPI(
    title="CriminalJudicialGPT API",
    description=(
        "RAG-powered API for Pakistan Criminal Court judgment drafting. "
        "Covers PPC, Cr.P.C., CNS Act, ATA, Qisas/Diyat. "
        "Backed by Groq (llama-3.3-70b) and LangChain v0.3+."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────────────────────────
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
    converts+saves the string the chain already returned. Wrapped in
    try/except so an export failure never breaks the chat response.
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

    # Rebuild prompt for streaming
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

@app.get("/", tags=["Health"])
async def root():
    return {
        "service": "CriminalJudicialGPT API",
        "status": "running",
        "docs": "/docs",
        "covers": "PPC | Cr.P.C. | CNS Act | ATA | Qisas/Diyat",
    }


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


@app.post("/chat", response_model=ChatResponse, tags=["Chat"])
async def chat(request: ChatRequest):
    """
    Send a query and receive a full criminal judgment draft or legal answer.
    Best for frontends that render the entire response at once.
    """
    if rag_engine.rag_chain is None:
        raise HTTPException(status_code=503, detail="RAG engine not ready.")

    try:
        response = await asyncio.get_event_loop().run_in_executor(
            None, rag_engine.rag_chain.invoke, request.query
        )
        sources = get_source_names(request.query)

        document = await asyncio.get_event_loop().run_in_executor(
            None, run_document_export, request.query, response
        )

        return ChatResponse(
            query=request.query, response=response, sources=sources, document=document
        )

    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


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
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@app.post("/chat/history", response_model=HistoryChatResponse, tags=["Chat"])
async def chat_with_history(request: HistoryChatRequest):
    """
    Multi-turn conversation. Pass the same session_id across turns to maintain
    context. A new session_id starts a fresh conversation.
    """
    if rag_engine.history_chain is None:
        raise HTTPException(status_code=503, detail="RAG engine not ready.")

    if request.session_id not in session_store:
        session_store[request.session_id] = []

    history = session_store[request.session_id]

    try:
        response = await asyncio.get_event_loop().run_in_executor(
            None,
            rag_engine.history_chain.invoke,
            {"question": request.query, "chat_history": history},
        )

        history.append(HumanMessage(content=request.query))
        history.append(AIMessage(content=response))

        sources = get_source_names(request.query)
        turn = len(history) // 2

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


@app.delete("/chat/history/{session_id}", tags=["Sessions"])
async def clear_session(session_id: str):
    """Clear all conversation history for a given session."""
    if session_id not in session_store:
        raise HTTPException(status_code=404, detail="Session not found.")
    del session_store[session_id]
    return {"message": f"Session '{session_id}' cleared successfully."}


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