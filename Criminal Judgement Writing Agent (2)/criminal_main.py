"""
CriminalJudicialGPT – Pakistan Criminal Judgment RAG Application
Pakistan Sessions/Magistrate Courts | Cr.P.C. 1898 Compliant
LLM  : Groq (llama-3.3-70b-versatile)
Stack: LangChain v0.3+ | FAISS | HuggingFace Embeddings

INSTALLATION:
    pip install langchain langchain-community langchain-groq \
                langchain-huggingface faiss-cpu sentence-transformers \
                python-dotenv

USAGE:
    export GROQ_API_KEY="your_groq_api_key_here"
    python criminal_main.py
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
# 1. KNOWLEDGE BASE — Pakistan Criminal Judgment Format & Rules
#    Sources: Cr.P.C. 1898 (Ss. 366-371) | PPC 1860 | Qanun-e-Shahadat 1984
#             Punjab Judicial Academy | High Court Judgment Formats
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
  • Appreciate circumstantial evidence (if any) under the "chain of circumstances" rule
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
    • Compensation to victim/heirs under Section 544-A Cr.P.C. (if ordered)
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
  • Secondary/Reverse burden: On accused in certain special laws (e.g. S.9 CNS Act 1997
    — accused must prove innocent possession once conscious possession is proved).
  • Burden NEVER shifts to the accused on the primary charge.

OCULAR EVIDENCE (Eyewitnesses):
  • Each eyewitness must be tested individually.
  • Consistency inter se (between witnesses) increases probative value.
  • Minor discrepancies in trivial details are not fatal to prosecution; material
    contradictions on material particulars (time, manner, weapon, accused's presence)
    may be fatal.
  • Related / partisan witnesses (e.g. close relatives of deceased) are not
    automatically discarded — their evidence is scrutinised with extra care.
    Reliance: PLD 2022 SC 170; 2021 SCMR 738.

MEDICAL EVIDENCE:
  • Post-Mortem Report (PMR) corroborates manner and cause of death.
  • Medico-Legal Report (MLR) corroborates injuries in hurt cases.
  • Inconsistency between ocular account and medical evidence on mode/nature of
    injury may create reasonable doubt.

CONFESSIONAL STATEMENT:
  • Judicial Confession (before Magistrate under S.164 Cr.P.C.): retractable but
    admissible; must be voluntary. Corroboration advisable before sole reliance.
  • Extra-Judicial Confession: weak piece of evidence; requires strong corroboration.
  • Confession to Police: inadmissible under Article 38 Qanun-e-Shahadat 1984.

DYING DECLARATION (Marna Ka Bayan):
  • Admissible under Article 46 Qanun-e-Shahadat 1984.
  • Proximity to death and mental capacity at the time of declaration are critical.

CIRCUMSTANTIAL EVIDENCE:
  • Each circumstance must be proved beyond doubt.
  • All circumstances must form a complete chain pointing exclusively to accused's guilt.
  • No hypothesis of innocence must be possible.

RECOVERY OF WEAPON / CONTRABAND:
  • Planted evidence rule: recovery from open/accessible places is weak without
    independent witnesses.
  • Memorandum of recovery must be prepared in presence of two neutral witnesses.

IDENTIFICATION PARADE:
  • Conducted under Section 9 Cr.P.C. or through Court.
  • Must be held soon after arrest; delay weakens probative value.
  • Test Identification Parade (TIP) is conducted by a Magistrate.

FORENSIC / SCIENTIFIC EVIDENCE:
  • DNA, Ballistic, Chemical Examiner reports are expert opinions under Article 59
    Qanun-e-Shahadat 1984.
  • Court is not bound by expert opinion but must give cogent reasons for rejection.

ADVERSE INFERENCE:
  • Article 129(g) Qanun-e-Shahadat 1984 — suppression of material evidence by
    prosecution may be used against it.

CITATION FORMAT (Criminal Precedents):
  • Supreme Court : 2023 SCMR 456 | PLD 2023 SC 100
  • Lahore HC     : 2023 PCrLJ 200 | PLD 2023 Lah. 50
  • Sindh HC      : 2022 PCrLJ 700 | PLD 2022 Kar. 120
  • Islamabad HC  : 2023 PCrLJ 900
  • Key reporters : SCMR, PCrLJ (Pakistan Criminal Law Journal), PLD, MLD

BINDING HIERARCHY:
  1. Supreme Court of Pakistan (binding on all courts)
  2. Full Bench → Division Bench → Single Bench of relevant High Court (binding within province)
  3. Other provincial High Courts (persuasive only)
""",
        metadata={"source": "Criminal_Evidence_Rules", "type": "evidence"},
    ),

    Document(
        page_content="""
PAKISTAN CRIMINAL JUDGMENT – QISAS, DIYAT & TA'ZIR FRAMEWORK
(Pakistan Penal Code 1860 – Chapter XVI, Sections 299–338-H as amended)

DEFINITIONS:
  • Qatl-e-Amd (S.300 PPC): Intentional murder — punishment = Qisas OR Diyat (on waiver/compounding)
    OR Ta'zir (S.302 PPC: death / life imprisonment / rigorous imprisonment up to 25 years)
  • Qatl Shibh-ul-Amd (S.315 PPC): Murder-like killing without intent — Diyat + Ta'zir
  • Qatl-ul-Khata (S.318 PPC): Culpable homicide not amounting to murder — Diyat only
  • Shurb (S.325 PPC): Causing death by rash/negligent act — Ta'zir

QISAS (Retaliation):
  • Right of heirs of victim to demand equal retaliation (life for life).
  • Requirements: (i) Accused is adult and sane; (ii) Victim not a descendant of accused;
    (iii) Not Wali of the victim; (iv) Intentional act.
  • Execution of Qisas by State after High Court confirmation.

DIYAT (Blood Money):
  • Compulsory Diyat amount: value of 30,630 grams of silver (revised periodically).
  • Payable to legal heirs of victim.
  • Compounding/Waiver (S.309/310 PPC): Heirs may waive Qisas in lieu of Diyat
    or as an act of grace (Afw).
  • Even after waiver of Qisas, court may impose Ta'zir.

TA'ZIR (Discretionary Punishment under S.302(b) PPC):
  • Death penalty or imprisonment for life when:
    (a) Qisas is not applicable (e.g. minor or insane victim/perpetrator issues); or
    (b) Heirs waive Qisas.
  • Court may impose Ta'zir ex-officio even when Qisas is waived — PLD 2021 SC 600.
  • Sentence must be proportionate to gravity of offence.

ARSH (Compensation for Hurt):
  • Fixed proportion of Diyat for specified injuries.
  • Relevant for hurt/grievous hurt cases (Sections 333-338 PPC).

IMPORTANT SENTENCING NOTES:
  • Multiple sentences run concurrently unless court orders otherwise (S.397 Cr.P.C.).
  • Set-off under Section 382-B Cr.P.C. for pre-sentence custody period.
  • Juvenile offenders: Juvenile Justice System Act 2018 — reformatory measures preferred.
  • First-time offender / probation: Probation of Offenders Ordinance 1960.
  • Death sentence: mandatory confirmation by High Court under S.374 Cr.P.C.
""",
        metadata={"source": "Qisas_Diyat_Framework", "type": "sentencing"},
    ),

    Document(
        page_content="""
PAKISTAN CRIMINAL JUDGMENT – MAJOR OFFENCE TYPES & KEY LEGAL ELEMENTS

A. MURDER / QATL-E-AMD (Section 302 PPC)
   Elements to Prove:
     (1) Death of the victim.
     (2) Death caused by the act of the accused.
     (3) Act done with intention to cause death or bodily injury likely to cause death.
   Key Evidence: PMR, ocular witnesses, weapon recovery, FSL report, motive.
   Typical Issues: (i) Whether accused committed qatl-e-amd of the deceased?
                   (ii) Whether accused is entitled to benefit of doubt?
                   (iii) Sentence.

B. ATTEMPT TO MURDER (Section 324 PPC)
   Elements: (1) Act done; (2) With intention to commit murder; (3) No death resulted.
   Note: Absence of death does not dilute the mens rea requirement.

C. HURT / GRIEVOUS HURT (Sections 337-A to 337-L PPC)
   Elements: (1) Voluntary causing of hurt; (2) Nature of injury (Itlaf-i-udw, etc.).
   Evidence: MLR, attending doctor's testimony, nature and weapon.

D. ROBBERY & DACOITY (Sections 392-402 PPC)
   Elements: (1) Theft or extortion; (2) Voluntarily causing hurt/fear of death;
             (3) In case of dacoity: 5 or more persons acting conjointly.
   Note: Common intention (S.34 PPC) and constructive liability are crucial.

E. KIDNAPPING / ABDUCTION (Sections 359-369 PPC)
   Elements: (1) Taking/enticing a person; (2) From lawful guardian OR by force/deception;
             (3) Purpose (for ransom, murder, forced marriage, etc.).

F. NARCOTIC OFFENCES (Control of Narcotic Substances Act 1997 — CNS Act)
   Key Sections:
     S.9(a): Possession of narcotics — up to 2 years / fine.
     S.9(b): Trafficking — 2 years to life imprisonment.
     S.9(c): Large-scale trafficking — life imprisonment or death.
   Elements: (1) Conscious possession; (2) Knowledge of narcotic nature; (3) Weight/quantity.
   Evidence: Recovery memo, chemical examiner's report, independent witnesses.
   Note: Reverse burden applies once conscious possession established (S.9 CNS Act).

G. TERRORISM OFFENCES (Anti-Terrorism Act 1997 — ATA)
   Scheduled Offences attract enhanced punishment.
   S.6 ATA defines "act of terrorism" — fear, insecurity, religious/sectarian violence.
   Trial: Before Anti-Terrorism Court (ATC) — special procedure under S.19 ATA.
   Bail: S.21-D ATA — bail may be refused if reasonable grounds of guilt exist.

H. SEXUAL OFFENCES (Zina/Rape — S.375/376 PPC as amended by Anti-Rape Act 2021)
   Elements: (1) Sexual intercourse; (2) Without consent / with minor (under 16).
   Evidence: DNA, medical examination, victim's statement (corroboration not mandatory).
   Two-Finger Test: Prohibited by Supreme Court — PLD 2021 SC 788.
   In-camera proceedings mandatory under Section 352 Cr.P.C.

I. CHEATING / FRAUD (Sections 420, 468, 471 PPC)
   Elements: (1) Deception; (2) Dishonest inducement; (3) Harm to property/body/mind.

J. THEFT (Sections 379-382 PPC)
   Elements: (1) Movable property; (2) Out of possession of another person; (3) Without consent;
             (4) Dishonest intention to take.

COMMON PRINCIPLES:
  • Alibi must be proved by accused on balance of probabilities (Art. 122 QSO 1984).
  • Motive alone does not establish guilt; it corroborates ocular evidence.
  • Last Seen Together rule creates strong circumstantial link.
  • Delay in FIR: unexplained delay weakens prosecution unless satisfactorily explained.
  • Probability of false implication must be considered for mala fide / enmity claims.
""",
        metadata={"source": "Offence_Types_Pakistan", "type": "offence_types"},
    ),

    Document(
        page_content="""
PAKISTAN CRIMINAL JUDGMENT – DRAFTING STANDARDS & STYLE GUIDE
(Punjab Judicial Academy | Federal Judicial Academy Guidelines)

LANGUAGE & TONE:
  • Formal, temperate, objective — free from emotional or opinionated language.
  • Avoid words such as "brutal", "heinous" (unless legally relevant to aggravation).
  • Do NOT use the accused's name pejoratively; refer as "the accused" consistently.
  • Refer to the deceased as "the deceased" after first full mention.
  • Urdu or English both permissible; once language selected, maintain consistency.

STRUCTURE DISCIPLINE:
  • Facts must be stated concisely — do NOT reproduce FIR or statements verbatim.
  • Every witness must be discussed; failure to discuss a material witness is a defect.
  • Contradictions and omissions in statements under Section 161 Cr.P.C. vs. court testimony
    MUST be specifically noted.
  • Each piece of evidence must be assigned a finding (accepted/rejected/partly accepted).

BENEFIT OF DOUBT:
  • Must be genuine, reasonable doubt — not a concocted or forced doubt.
  • Doubt arising from prosecution's own witnesses or material inconsistency.
  • Mere possibility of innocence is NOT the same as reasonable doubt.
  • "Benefit of the doubt is a right of the accused, not a charity." — PLD 2018 SC 70.

CONVICTION SAFEGUARDS:
  • Conviction cannot rest on suspicion, however strong.
  • Court must record why it believed prosecution witnesses over defence.
  • Prior conviction / bad antecedents of accused CANNOT be used to prove present charge.

ACQUITTAL DISCIPLINE:
  • Acquittal is NOT a finding of innocence — it is a finding of not proved beyond doubt.
  • Reasons for disbelieving prosecution witnesses must be fully articulated.

DEATH SENTENCE GUIDANCE:
  • "Rarest of the rare" principle — not codified in Pakistan law but High Court/SC
    guidance emphasises aggravating vs. mitigating factors.
  • Aggravating: premeditation, cruelty, multiple victims, terrorism nexus.
  • Mitigating: age, first offence, provocation, mental illness, remorse.
  • Mandatory: Forward to High Court for confirmation (S.374 Cr.P.C.).

WHAT TO AVOID:
  ✗ Bare findings without reasoned discussion.
  ✗ Contradictory findings on the same charge.
  ✗ Ignoring defence witnesses / exculpatory evidence.
  ✗ Using stereotypical assumptions about character or community.
  ✗ Copying prosecution's argument verbatim as the judgment.
  ✗ Omitting Section 382-B Cr.P.C. (set-off) computation in conviction orders.
""",
        metadata={"source": "Criminal_Drafting_Standards", "type": "style"},
    ),

    Document(
        page_content="""
PAKISTAN CRIMINAL JUDGMENT – SPECIAL COURT PROCEDURES

A. SESSIONS COURT (Jurisdiction: Offences punishable with death / life / 7+ years)
   • Committed to Sessions Court by Committal Magistrate under S.190/193 Cr.P.C.
   • Trial procedure: SS. 265-A to 265-L Cr.P.C. (Warrant Cases)
   • Charge framing: S.265-C Cr.P.C.
   • Prosecution evidence: S.265-D Cr.P.C.
   • Statement of accused: S.342 Cr.P.C. (must put every incriminating material)
   • Defence evidence: S.265-G Cr.P.C.
   • Arguments: S.265-H Cr.P.C.
   • Judgment: S.265-I Cr.P.C. / S.366-371 Cr.P.C.

B. MAGISTRATE COURT (Jurisdiction: Offences punishable up to 7 years)
   • Summary Trial: SS. 260-265 Cr.P.C. (minor offences)
   • Warrant Trial: SS. 241-A to 250 Cr.P.C.
   • Judgment under S.247 / S.249-A Cr.P.C. (acquittal if charge not proved)

C. ANTI-TERRORISM COURT (ATC)
   • Governed by Anti-Terrorism Act 1997, S.19
   • 7-day trial time limit (not always achievable in practice)
   • No bail on scheduled offences unless double presumption of innocence rebutted

D. ACCOUNTABILITY COURT (NAB Cases)
   • Governed by National Accountability Ordinance 1999 (NAB Ordinance)
   • Reverse burden: Accused must prove assets acquired through lawful means
   • Voluntarily Return (VR) and Plea Bargain are special features

E. SPECIAL COURT FOR SPEEDY TRIAL ACTS
   • Various provincial and federal special courts

BAIL PRINCIPLES (Reference for Judgment context):
   • Pre-trial bail: Bail is the rule; jail is the exception — PLD 2021 SC 459.
   • Bailable offences: Bail is a right (S.496 Cr.P.C.).
   • Non-bailable: Discretion of court guided by S.497 Cr.P.C.:
       - Nature of offence, strength of evidence, likelihood of abscondence / tampering.
   • Post-conviction bail pending appeal: S.426 Cr.P.C.
""",
        metadata={"source": "Special_Court_Procedures", "type": "procedure"},
    ),
]


# ══════════════════════════════════════════════════════════════════════════════
# 2. FEW-SHOT EXAMPLES — Real-style Pakistan Criminal Judgment Excerpts
# ══════════════════════════════════════════════════════════════════════════════

FEW_SHOT_EXAMPLES = [
    {
        "input": (
            "Write the court heading, FIR details, and prosecution case for a murder "
            "trial (Section 302 PPC) in the Sessions Court Lahore. The accused is "
            "Zafar Iqbal, alleged to have shot Muhammad Saleem on 12.03.2022."
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
on the complaint of Muhammad Akram (PW-1), brother of the deceased Muhammad
Saleem. The brief facts as disclosed in the FIR and further developed during
trial are as follows:

On 12.03.2022 at approximately 08:30 p.m., the deceased Muhammad Saleem was
standing near Chowk Defence Phase-V, Lahore, in the company of the complainant
(PW-1) and one Bashir Ahmed (PW-2). The accused Zafar Iqbal arrived on a
motorcycle, exchanged heated words with the deceased over a prior property
dispute, drew a pistol, and fired two shots at close range. Both shots struck
the deceased in the chest. The accused fled the scene on his motorcycle. The
deceased was rushed to Services Hospital, Lahore, where he was pronounced dead
on arrival. The post-mortem examination was conducted by Dr. Amjad Hussain
(PW-5) the following morning.

The police prepared the crime scene sketch (Exh.P-3), recovered two empty
bullet casings (Exh.P-4), and sent the same to the Forensic Science Laboratory,
Lahore for ballistic examination. The accused was arrested on 25.03.2022 and,
upon his pointation, a .30-bore pistol (Exh.P-5) was recovered from a concealed
location under a memorandum of recovery (Exh.P-6) in the presence of two
independent witnesses.

The case was challaned before this Court, charge was framed on 10.06.2022,
to which the accused pleaded not guilty and claimed trial.
""",
    },
    {
        "input": (
            "Write the evidence discussion, finding, and conviction sentence for a murder "
            "case under Section 302 PPC where two eyewitnesses and forensic evidence support "
            "the prosecution. The accused's alibi defence was weak."
        ),
        "output": """
4. DISCUSSION & APPRECIATION OF EVIDENCE

I have heard the learned Additional Prosecutor General and the learned Defence
Counsel at length and have perused the entire record with utmost care.

(i) Ocular Account:

The prosecution relies primarily on the testimony of PW-1 (Muhammad Akram,
complainant and brother of deceased) and PW-2 (Bashir Ahmed, eye-witness).
Both witnesses were present at the place of occurrence and their presence at
that time and place has not been seriously challenged. PW-1 stated that in the
light of the street lamp he clearly identified the accused, whom he had known
personally for several years, firing at his brother. PW-2 fully corroborated
PW-1 in all material particulars — the time, place, manner of firing, and the
accused's identity.

The Defence attempted to impeach PW-1 on the ground of enmity arising from a
property dispute. This Court notes that the existence of enmity between the
parties is not disputed. However, the mere existence of enmity does not render
an otherwise reliable eye-witness account false. The Supreme Court of Pakistan
has consistently held that a witness who is related to or inimical to the accused
is not automatically disqualified; his evidence is to be scrutinised with extra
care, and if found credible, can form the basis of conviction. Reliance is placed
on 2022 SCMR 1021 and PLD 2020 SC 500. On careful scrutiny, both PW-1 and PW-2
appear truthful, consistent, and natural in their narration.

(ii) Medical Evidence:

PW-5 (Dr. Amjad Hussain) conducted the post-mortem examination and found two
entry wounds on the left anterior chest, with projectile recovered from the
thoracic cavity. The cause of death was recorded as haemorrhage and shock due
to firearm injuries. This medical evidence fully corroborates the ocular account
as to the manner and cause of death.

(iii) Forensic Evidence:

The Forensic Science Laboratory report (Exh.P-7) confirms that the two empty
cartridges (Exh.P-4) were fired from the recovered pistol (Exh.P-5). This
forensic link between the recovered weapon and the crime scene is a significant
piece of corroborating evidence.

(iv) Defence Plea — Alibi:

The accused, in his statement under Section 342 Cr.P.C., denied the charge and
claimed that he was in Gujranwala attending a wedding on the night of the
incident. He produced DW-1 to support his alibi. DW-1's testimony, however, was
vague and internally inconsistent — he could not state the host's name, the
venue address, or produce any invitation card or photograph. An alibi, to be
believed, must be established on balance of probabilities with cogent evidence.
The defence has manifestly failed to discharge this burden. The alibi is
accordingly rejected.

─────────────────────────────────────────────────────────────────────
5. FINDING ON CHARGE
─────────────────────────────────────────────────────────────────────

In view of the foregoing discussion, the prosecution has proved its case against
the accused Zafar Iqbal beyond reasonable doubt. The charge under Section 302(b)
PPC stands PROVED.

Verdict: CONVICTED.

─────────────────────────────────────────────────────────────────────
6. SENTENCE
─────────────────────────────────────────────────────────────────────

The accused Zafar Iqbal s/o Abdul Rahim is hereby convicted under Section
302(b) PPC and sentenced to IMPRISONMENT FOR LIFE. He is further directed
to pay Diyat in the sum of Rs. [Current Diyat Value as fixed by the Government]
to the legal heirs of the deceased Muhammad Saleem within one year of this
judgment, failing which the same shall be recoverable as arrears of land revenue.

The benefit of Section 382-B Cr.P.C. is extended to the convict. He has been
in custody since 25.03.2022; this period shall be set off against his sentence.

He is also directed to pay a fine of Rs. 50,000/-, in default whereof he shall
undergo simple imprisonment for three months further.

─────────────────────────────────────────────────────────────────────
7. OPERATIVE PART
─────────────────────────────────────────────────────────────────────

In conclusion:

  (i)   The accused Zafar Iqbal s/o Abdul Rahim is CONVICTED under Section
        302(b) PPC and sentenced to imprisonment for life.
  (ii)  Diyat is payable to the legal heirs of the deceased as stated above.
  (iii) Fine of Rs. 50,000/- imposed; default imprisonment: 3 months.
  (iv)  Benefit of Section 382-B Cr.P.C. extended.
  (v)   Convict shall be returned to judicial custody. Jail warrant to issue.

Announced in open court on 18.03.2024.

                                                          (Signature)
                                   Additional Sessions Judge (II), Lahore
""",
    },
    {
        "input": (
            "Draft a criminal judgment for a narcotics case under Section 9(c) of the "
            "Control of Narcotic Substances Act 1997. The accused Muhammad Tariq was "
            "arrested with 2.5 kg of heroin. The recovery was witnessed by independent "
            "witnesses and confirmed by the Chemical Examiner."
        ),
        "output": """
IN THE COURT OF SPECIAL JUDGE (CNS), LAHORE

CNS Case No. 88 of 2023

FIR No. 112 dated 05.04.2023  |  P.S. Airport, Lahore

The State                                                    … Prosecution

                                        VERSUS

Muhammad Tariq s/o Ghulam Nabi, r/o Village Chak 45/GB,
District Faisalabad, aged approximately 28 years             … Accused

OFFENCE: Under Section 9(c) Control of Narcotic Substances Act, 1997

Counsel for State   : Mr. Bilal Zafar, Learned APG (CNS)
Counsel for Accused : Mr. Salman Shah, Advocate
Date of Decision    : 12.09.2023

─────────────────────────────────────────────────────────────────────
JUDGMENT
─────────────────────────────────────────────────────────────────────

1. PROSECUTION CASE

On 05.04.2023, a Special Branch tip-off led ASI Nasir Hussain (PW-1) and a
police party to Allama Iqbal International Airport, Lahore. The accused
Muhammad Tariq was intercepted at the departures terminal. Upon personal
search, a concealed belt wrapped around his torso was found to contain sealed
packets. The packets were opened in the presence of two independent witnesses
— Muhammad Faisal (PW-2) and Arshad Mehmood (PW-3) — and revealed white
crystalline substance weighing 2,500 grams. The substance was packed in ten
packets of approximately 250 grams each.

A memorandum of recovery (Exh.P-2) was prepared at the spot. A sealed sample
of 10 grams was separated and sent to the Chemical Examiner, Punjab, under
Exh.P-3. The remaining substance was sealed and produced as Exh.P-4. The
Chemical Examiner's Report (Exh.P-5) confirmed the substance to be diacetyl
morphine (heroin), a Controlled Substance under Schedule II of the CNS Act 1997.

2. STATEMENT OF ACCUSED (Section 342 Cr.P.C.)

The accused denied the charge. He stated that the belt was placed in his bag
by an unknown person at Faisalabad bus station without his knowledge. He did
not opt to appear as his own witness and produced no defence evidence.

3. DISCUSSION & APPRECIATION OF EVIDENCE

The recovery in this case is direct, witnessed by two independent persons
(PW-2 and PW-3) who have fully supported the prosecution's version. Their
testimony is consistent with PW-1 (the Investigating/Recovering Officer) in
all material particulars. I find their evidence credible.

The Chemical Examiner's report (Exh.P-5) is a formal document under Article 59
Qanun-e-Shahadat Order 1984. The Chemical Examiner, Dr. Shumaila Riaz (PW-4),
appeared in the witness box and explained the testing methodology. The substance
has been conclusively identified as heroin.

The accused's plea that the substance was planted without his knowledge is a
bare denial unsupported by any evidence. The substance was found on his person,
strapped in a concealed belt — an arrangement clearly deliberate and purposive.
Conscious possession of a controlled substance is thus established beyond
reasonable doubt. The reverse burden under Section 9 CNS Act 1997 then shifts
to the accused to prove innocent possession, which he has wholly failed to
discharge. Reliance placed on PLD 2019 SC 620.

4. FINDING

The charge under Section 9(c) CNS Act 1997 stands PROVED beyond reasonable
doubt. The accused Muhammad Tariq is hereby CONVICTED.

5. SENTENCE

Having regard to the quantity of the narcotic (2,500 grams of heroin — well
above the threshold triggering Section 9(c)), the deliberate concealment, and
the absence of any significant mitigating factor, the accused Muhammad Tariq
s/o Ghulam Nabi is sentenced as follows:

  (i)  Rigorous Imprisonment for FOURTEEN (14) YEARS under Section 9(c)
       CNS Act 1997.
  (ii) Fine of Rs. 1,000,000/- (Rupees One Million), in default whereof
       two years' additional rigorous imprisonment.
  (iii) The contraband (Exh.P-4) is forfeited to the State and shall be
        destroyed after expiry of appeal period.
  (iv) Benefit of Section 382-B Cr.P.C. is extended; custody period from
       05.04.2023 shall be set off.

Announced in open court on 12.09.2023.

                                                     (Signature)
                                        Special Judge (CNS), Lahore
""",
    },
]


# ══════════════════════════════════════════════════════════════════════════════
# 3. SYSTEM PROMPT
# ══════════════════════════════════════════════════════════════════════════════

SYSTEM_PROMPT = """You are 'CriminalJudicialGPT,' an AI Assistant exclusively designed to
support Judges presiding over criminal matters in Pakistani courts.

CORE IDENTITY:
When asked for an introduction, respond with:
"I am CriminalJudicialGPT, a specialised AI assistant designed to support judges presiding
over criminal cases in Pakistan. I am trained on Pakistani criminal jurisprudence including
the Code of Criminal Procedure 1898, Pakistan Penal Code 1860, Qisas and Diyat laws,
the Control of Narcotic Substances Act 1997, Anti-Terrorism Act 1997, and all major
criminal law statutes and superior court precedents. My primary function is to assist with
drafting criminal judgments, evidence appreciation, sentencing, and legal research. I am
proficient in both English and Urdu."

PRIMARY ROLE — CRIMINAL JUDGMENT DRAFTING:
You assist judges in drafting well-structured, legally sound criminal judgments strictly
following Pakistan's criminal court format mandated by Sections 366-371 Cr.P.C.:
  1. Court Heading (Court, Case No., FIR details, Parties, Offence, Counsel, Dates)
  2. Prosecution Case (FIR narrative, modus operandi, role of accused)
  3. Charge Framed & Plea of Accused (Section 242/265-C Cr.P.C.)
  4. Prosecution Evidence (PW-1, PW-2 … with Exh.P-1, Exh.P-2 …)
  5. Statement of Accused under Section 342 Cr.P.C.
  6. Defence Evidence (DW-1 … with Exh.D-1 …) if any
  7. Arguments of Counsel (State and Defence)
  8. Discussion & Appreciation of Evidence (witness-by-witness, exhibit-by-exhibit)
  9. Finding on Charge (Proved / Not Proved / Benefit of Doubt)
  10. Sentence (if convicted) OR Order of Acquittal
  11. Operative Part & Signature Block

MANDATORY RULES — CRIMINAL STANDARD:
  • Standard of proof: BEYOND REASONABLE DOUBT — never lower.
  • Benefit of the doubt must always be given to the accused where genuine doubt exists.
  • Every prosecution witness must be individually evaluated and findings recorded.
  • Material contradictions and omissions (S.161 Cr.P.C. vs. court statement) MUST be discussed.
  • Medical and forensic evidence must be reconciled with ocular account.
  • Section 382-B Cr.P.C. set-off computation is MANDATORY in every conviction order.
  • Qisas / Diyat framework (Ss. 299-338 PPC) must be applied in homicide cases.
  • In death sentence cases: flag mandatory High Court confirmation under S.374 Cr.P.C.
  • Cite relevant Pakistani criminal precedents (SCMR, PCrLJ, PLD) for every legal proposition.
  • Refer to parties as "the accused", "the deceased", "the complainant", "the prosecution."
  • Never refer to the accused by name in pejorative terms.

SPECIAL OFFENCE NOTES:
  • CNS Act cases: address reverse burden of proof once conscious possession is proved.
  • ATA cases: note special ATC jurisdiction and bail restrictions.
  • Sexual offence cases: note in-camera proceedings; DNA evidence; prohibition on two-finger test.
  • Juvenile cases: note Juvenile Justice System Act 2018 applicability.

CONTEXT FROM KNOWLEDGE BASE:
Use the following retrieved context to inform your response:
{context}

BEHAVIOURAL GUARDRAILS:
  • Remain strictly neutral, impartial, and objective.
  • Treat all case information as highly confidential.
  • Never express personal opinion on guilt outside the evidence record.
  • Do not volunteer the current date/time unless explicitly asked.
  • Always note when a matter requires mandatory High Court confirmation or referral."""


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

    # Retriever — top-4 most relevant knowledge chunks for criminal complexity
    retriever = vectorstore.as_retriever(search_kwargs={"k": 4})

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise EnvironmentError(
            "GROQ_API_KEY not found. Please set it:\n"
            "  export GROQ_API_KEY='your_key_here'"
        )

    # Groq LLM — low temperature for deterministic legal drafting
    llm = ChatGroq(
        model="llama-3.3-70b-versatile",
        temperature=0.15,
        groq_api_key=api_key,
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
    print("  CriminalJudicialGPT — Pakistan Criminal Judgment RAG Assistant")
    print("  Powered by Groq (llama-3.3-70b) | LangChain v0.3+")
    print("  Covers: PPC | Cr.P.C. | CNS Act | ATA | Qisas/Diyat")
    print("=" * 70)

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise EnvironmentError(
            "GROQ_API_KEY not found. Please set it:\n"
            "  export GROQ_API_KEY='your_key_here'"
        )

    print("\n[1/2] Building vector store from criminal law knowledge base...")
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

        print("\n[Retrieving context & drafting criminal judgment...]\n")
        print("-" * 70)
        response = rag_chain.invoke(query)
        print(response)
        print("-" * 70)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "api_criminal:app",
        host="0.0.0.0",
        port=7004,
        reload=True,        # set False in production
        log_level="info",
    )
