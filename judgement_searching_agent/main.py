import os
import requests
from bs4 import BeautifulSoup
from langchain_groq import ChatGroq
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.documents import Document
import time
import logging
import re
import concurrent.futures
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import uvicorn
from datetime import datetime
import zoneinfo
from dotenv import load_dotenv

load_dotenv(override=True)

# ─────────────────────────────────────────────────────────────────────────────
# Logging
# ─────────────────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

os.environ["USER_AGENT"] = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36"
)

# ─────────────────────────────────────────────────────────────────────────────
# Environment / API Keys
# ─────────────────────────────────────────────────────────────────────────────
GROQ_API_KEY    = os.getenv("GROQ_API_KEY")
GOOGLE_API_KEY  = os.getenv("GOOGLE_API_KEY")
GOOGLE_CSE_ID   = os.getenv("GOOGLE_CSE_ID")

if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY is not set.")
if not GOOGLE_API_KEY or not GOOGLE_CSE_ID:
    raise ValueError("GOOGLE_API_KEY and GOOGLE_CSE_ID must be set.")

# ─────────────────────────────────────────────────────────────────────────────
# Target judgment / law portals with metadata
# ─────────────────────────────────────────────────────────────────────────────
JUDGMENT_SOURCES = [
    # ── Primary Court Sources ──────────────────────────────────────────────
    {
        "name": "Supreme Court of Pakistan",
        "domain": "scp.gov.pk",
        "url": "https://scp.gov.pk/OnlineCaseInformation",
        "category": "primary_court",
        "description": "Online case information and judgments",
    },
    {
        "name": "Lahore High Court – Reported Judgments",
        "domain": "data.lhc.gov.pk",
        "url": "https://data.lhc.gov.pk/reported_judgments/judgments_approved_for_reporting",
        "category": "primary_court",
        "description": "Decisions approved for reporting (PDFs)",
    },
    {
        "name": "High Court of Sindh",
        "domain": "sindhhighcourt.gov.pk",
        "url": "https://sindhhighcourt.gov.pk/",
        "category": "primary_court",
        "description": "Search judgments by case law and digital copies",
    },
    {
        "name": "Islamabad High Court – Case Law Search",
        "domain": "mis.ihc.gov.pk",
        "url": "https://mis.ihc.gov.pk/frmSrchOrdr",
        "category": "primary_court",
        "description": "Case law search by case number, title, citation",
    },
    # ── Official Statute / Law Portals ─────────────────────────────────────
    {
        "name": "Pakistan Code – Federal Laws",
        "domain": "pakistancode.gov.pk",
        "url": "https://pakistancode.gov.pk/english/",
        "category": "statute",
        "description": "All federal laws consolidated and searchable",
    },
    {
        "name": "Punjab Laws Online",
        "domain": "punjablaws.gov.pk",
        "url": "https://www.punjablaws.gov.pk/",
        "category": "statute",
        "description": "Punjab provincial laws from 1860 to present",
    },
    # ── Additional Law Libraries ───────────────────────────────────────────
    {
        "name": "Lexway – Statutes Collections",
        "domain": "lexway.pk",
        "url": "https://lexway.pk/statutes/",
        "category": "library",
        "description": "Alphabetical list of major Pakistan statutes",
    },
    {
        "name": "Legislation.pk",
        "domain": "legislation.pk",
        "url": "https://www.legislation.pk/",
        "category": "library",
        "description": "Browse federal & provincial laws with search and filters",
    },
    {
        "name": "PLJ Law Site – Statute Search",
        "domain": "pljlawsite.com",
        "url": "https://www.pljlawsite.com/StatuteSearch.asp",
        "category": "library",
        "description": "Search statutes by name or year (historical statutes)",
    },
    {
        "name": "RahmatLaw.com – Law Library",
        "domain": "rahmatlaw.com",
        "url": "https://rahmatlaw.com/",
        "category": "library",
        "description": "Statutes, SROs, rules, and case law linked to statutes",
    },
]

# All domains for easy site-restricted searches
ALL_DOMAINS = [s["domain"] for s in JUDGMENT_SOURCES]

# ─────────────────────────────────────────────────────────────────────────────
# LLM & Embeddings
# ─────────────────────────────────────────────────────────────────────────────
llm = ChatGroq(model="llama-3.3-70b-versatile", temperature=0.2)
embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

# ─────────────────────────────────────────────────────────────────────────────
# FastAPI App
# ─────────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Pakistan Judgment Search Agent",
    description="AI agent that searches authentic Pakistani legal sources for judgments and explains them.",
    version="2.0.0",
)

# CORS middleware for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────────────────────────────────────
# Pydantic models
# ─────────────────────────────────────────────────────────────────────────────
class SearchRequest(BaseModel):
    query: str
    max_results: Optional[int] = 8

class SourceResult(BaseModel):
    source_name: str
    domain: str
    url: str
    status: str          # "success" | "blocked" | "error" | "no_content"
    content_preview: Optional[str] = None

class JudgmentResponse(BaseModel):
    query: str
    explanation: str
    sources_searched: List[SourceResult]
    successful_sources: int
    blocked_sources: List[str]
    timestamp: str


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────
def get_pst_time() -> str:
    now = datetime.now(zoneinfo.ZoneInfo("Asia/Karachi"))
    return now.strftime("%A, %B %d, %Y at %I:%M %p PST")


BLOCK_STATUS_CODES   = {401, 403, 406, 429, 503}
BLOCK_PHRASES        = [
    "access denied", "403 forbidden", "blocked", "captcha",
    "cloudflare", "bot detection", "please enable javascript",
    "ddos protection", "rate limit", "too many requests",
    "you have been blocked", "enable cookies", "security check",
]

def is_blocked_response(response: requests.Response, text: str) -> bool:
    if response.status_code in BLOCK_STATUS_CODES:
        return True
    lower_text = text.lower()
    return any(phrase in lower_text for phrase in BLOCK_PHRASES)


def fetch_url(url: str, timeout: int = 12) -> dict:
    """
    Fetch a single URL.  Returns a dict with keys:
        url, status, text, title, error_message
    status ∈ {"success", "blocked", "error", "no_content"}
    """
    headers = {"User-Agent": os.environ["USER_AGENT"]}
    result = {"url": url, "status": "error", "text": "", "title": "", "error_message": ""}

    try:
        resp = requests.get(url, headers=headers, timeout=timeout, allow_redirects=True)
        soup = BeautifulSoup(resp.content, "html.parser")

        # Strip scripts / styles
        for tag in soup(["script", "style", "noscript"]):
            tag.decompose()

        raw_text = " ".join(soup.get_text(" ", strip=True).split())
        title    = soup.title.string.strip() if soup.title else "No title"

        if is_blocked_response(resp, raw_text):
            result["status"]        = "blocked"
            result["error_message"] = (
                f"⚠️ Access Blocked: The website '{url}' blocked our request "
                f"(HTTP {resp.status_code}). We cannot retrieve judgments from this source at this time."
            )
            logger.warning(f"BLOCKED: {url} (HTTP {resp.status_code})")
            return result

        if len(raw_text) < 150:
            result["status"]        = "no_content"
            result["error_message"] = f"No usable content returned from {url}."
            return result

        result["status"] = "success"
        result["text"]   = raw_text[:8000]   # cap per page
        result["title"]  = title

    except requests.exceptions.Timeout:
        result["error_message"] = f"Request timed out for {url}."
    except requests.exceptions.ConnectionError:
        result["error_message"] = f"Could not connect to {url}."
    except Exception as exc:
        result["error_message"] = str(exc)

    return result


# ─────────────────────────────────────────────────────────────────────────────
# Google Custom Search
# ─────────────────────────────────────────────────────────────────────────────
def google_search(query: str, num: int = 10, site_restrict: str = None) -> list:
    """Return list of {title, snippet, url} dicts from Google CSE."""
    params = {
        "key": GOOGLE_API_KEY,
        "cx":  GOOGLE_CSE_ID,
        "q":   f"{query} site:{site_restrict}" if site_restrict else query,
        "num": min(num, 10),
    }
    try:
        resp = requests.get(
            "https://www.googleapis.com/customsearch/v1",
            params=params, timeout=15
        )
        resp.raise_for_status()
        items = resp.json().get("items", [])
        return [
            {"title": i.get("title", ""), "snippet": i.get("snippet", ""), "url": i.get("link", "")}
            for i in items if i.get("link")
        ]
    except Exception as exc:
        logger.error(f"Google search error (query='{query}'): {exc}")
        return []


# ─────────────────────────────────────────────────────────────────────────────
# Core search-and-retrieve pipeline
# ─────────────────────────────────────────────────────────────────────────────
def search_judgments(query: str, max_results: int = 8):
    """
    1. Run site-restricted Google searches on each legal domain.
    2. Run a broad Google search adding "Pakistan judgment" context.
    3. Fetch URLs in parallel, tracking blocked / errored sources.
    4. Build FAISS vector store from successful content.

    Returns (retriever | None, source_results: list[SourceResult])
    """
    collected_urls: dict[str, dict] = {}   # url -> google result meta
    source_results: list[SourceResult] = []

    # ── Step 1: site-restricted searches ──────────────────────────────────
    logger.info("Running site-restricted Google searches …")
    for src in JUDGMENT_SOURCES:
        hits = google_search(query, num=3, site_restrict=src["domain"])
        for h in hits:
            if h["url"] and h["url"] not in collected_urls:
                collected_urls[h["url"]] = {**h, "source_meta": src}
        time.sleep(0.25)

    # ── Step 2: broad search ───────────────────────────────────────────────
    broad_hits = google_search(f"{query} Pakistan court judgment law", num=max_results)
    for h in broad_hits:
        if h["url"] and h["url"] not in collected_urls:
            # Try to match domain to known source
            matched = next(
                (s for s in JUDGMENT_SOURCES if s["domain"] in h["url"]), None
            )
            collected_urls[h["url"]] = {**h, "source_meta": matched}

    urls_to_fetch = list(collected_urls.keys())[:12]

    if not urls_to_fetch:
        logger.warning("No URLs found after Google searches.")
        return None, []

    # ── Step 3: parallel fetch ─────────────────────────────────────────────
    logger.info(f"Fetching {len(urls_to_fetch)} URLs in parallel …")
    good_docs: list[Document] = []

    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        future_map = {pool.submit(fetch_url, url): url for url in urls_to_fetch}
        for future in concurrent.futures.as_completed(future_map):
            url        = future_map[future]
            meta       = collected_urls[url]
            src_meta   = meta.get("source_meta") or {}

            try:
                res = future.result()
            except Exception as exc:
                res = {
                    "url": url, "status": "error",
                    "text": "", "title": "",
                    "error_message": str(exc),
                }

            sr = SourceResult(
                source_name    = src_meta.get("name", url),
                domain         = src_meta.get("domain", url.split("/")[2] if "//" in url else url),
                url            = url,
                status         = res["status"],
                content_preview= (
                    res["text"][:300] + "…"
                    if res["status"] == "success" and res["text"] else
                    res.get("error_message", "")
                ),
            )
            source_results.append(sr)

            if res["status"] == "success":
                doc = Document(
                    page_content=res["text"],
                    metadata={
                        "source_url": url,
                        "title": res["title"],
                        "domain": sr.domain,
                        "source_name": sr.source_name,
                    },
                )
                good_docs.append(doc)

    if not good_docs:
        logger.warning("No documents successfully fetched.")
        return None, source_results

    # ── Step 4: vector store ───────────────────────────────────────────────
    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=150)
    splits   = splitter.split_documents(good_docs)

    vectorstore = FAISS.from_documents(splits, embeddings)
    retriever   = vectorstore.as_retriever(search_kwargs={"k": 6})

    logger.info(f"Vector store built with {len(splits)} chunks from {len(good_docs)} documents.")
    return retriever, source_results


# ─────────────────────────────────────────────────────────────────────────────
# LLM chains
# ─────────────────────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """You are JudicialGPT — an expert AI legal research assistant specializing in Pakistani law.
Your role is to help judges, lawyers, and legal researchers find and understand court judgments and statutes.

CORE RULES:
- Be precise, formal, and objective.
- Always cite the source of every fact or judgment you mention using [Source N] notation.
- If information comes from a blocked or unavailable source, clearly state so.
- Explain legal concepts in clear language while maintaining professional depth.
- Structure your answer with: (1) Relevant Judgment(s) Found, (2) Key Legal Principles, (3) Summary & Applicability.
"""

JUDGMENT_EXPLAIN_TEMPLATE = SYSTEM_PROMPT + """
──────────────────────────────────────────────────────
RETRIEVED CONTENT FROM LEGAL SOURCES:
{context}
──────────────────────────────────────────────────────
BLOCKED / UNAVAILABLE SOURCES:
{blocked_info}
──────────────────────────────────────────────────────

USER QUERY: {query}

Please provide a comprehensive explanation of any relevant judgments, statutes, or legal principles found above.
If specific sources were blocked, mention them and note that users may visit those portals directly.

ANSWER:"""

NO_RESULTS_TEMPLATE = SYSTEM_PROMPT + """
The search was performed but no content could be retrieved from the legal portals.

BLOCKED SOURCES:
{blocked_info}

USER QUERY: {query}

Based on your legal training, provide a helpful response about this query and advise the user to visit
the relevant court portals directly. List the specific portals they should check.

ANSWER:"""


def explain_judgments(query: str, retriever, source_results: list[SourceResult]) -> str:
    """Build context from retriever and generate LLM explanation."""
    docs = retriever.invoke(query)

    context_parts = []
    for i, doc in enumerate(docs, 1):
        m = doc.metadata
        context_parts.append(
            f"[Source {i}] — {m.get('source_name', 'Unknown')} ({m.get('domain', '')})\n"
            f"URL: {m.get('source_url', '')}\n"
            f"Title: {m.get('title', 'No title')}\n"
            f"Content:\n{doc.page_content}\n"
        )
    context = "\n\n".join(context_parts) if context_parts else "No content retrieved."

    blocked = [sr for sr in source_results if sr.status == "blocked"]
    blocked_info = (
        "\n".join(
            f"• {b.source_name} ({b.domain}) — {b.content_preview}"
            for b in blocked
        )
        if blocked else "None"
    )

    prompt = PromptTemplate.from_template(JUDGMENT_EXPLAIN_TEMPLATE)
    chain  = prompt | llm | StrOutputParser()
    return chain.invoke({"context": context, "blocked_info": blocked_info, "query": query})


def explain_no_results(query: str, source_results: list[SourceResult]) -> str:
    """Generate a helpful reply when no content was retrieved."""
    blocked = [sr for sr in source_results if sr.status == "blocked"]
    blocked_info = (
        "\n".join(
            f"• {b.source_name} ({b.domain}) — {b.content_preview}"
            for b in blocked
        )
        if blocked else "None"
    )
    prompt = PromptTemplate.from_template(NO_RESULTS_TEMPLATE)
    chain  = prompt | llm | StrOutputParser()
    return chain.invoke({"blocked_info": blocked_info, "query": query})


# ─────────────────────────────────────────────────────────────────────────────
# FastAPI Endpoints
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/")
async def root():
    return {
        "service": "Pakistan Judgment Search Agent",
        "status": "running",
        "endpoints": {
            "search": "POST /search",
            "sources": "GET /sources",
            "health": "GET /health",
        },
        "timestamp": get_pst_time(),
    }


@app.get("/health")
async def health():
    return {"status": "healthy", "timestamp": get_pst_time()}


@app.get("/sources")
async def list_sources():
    """List all legal portals this agent searches."""
    grouped: dict[str, list] = {}
    for src in JUDGMENT_SOURCES:
        cat = src["category"]
        grouped.setdefault(cat, []).append(
            {"name": src["name"], "url": src["url"], "description": src["description"]}
        )
    return {
        "total_sources": len(JUDGMENT_SOURCES),
        "sources_by_category": grouped,
        "timestamp": get_pst_time(),
    }


@app.post("/search", response_model=JudgmentResponse)
async def search_endpoint(request: SearchRequest):
    """
    Main endpoint: search for Pakistani court judgments and explain them.

    Body:
        query       - your legal query / case topic
        max_results - number of web results to consider (default 8)
    """
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    logger.info(f"Search request: '{request.query}'")

    try:
        retriever, source_results = search_judgments(request.query, request.max_results)
    except Exception as exc:
        logger.error(f"Search pipeline error: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Search error: {str(exc)}")

    blocked_names = [sr.source_name for sr in source_results if sr.status == "blocked"]
    successful    = sum(1 for sr in source_results if sr.status == "success")

    # Generate explanation
    try:
        if retriever:
            explanation = explain_judgments(request.query, retriever, source_results)
        else:
            explanation = explain_no_results(request.query, source_results)
    except Exception as exc:
        logger.error(f"LLM error: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"LLM error: {str(exc)}")

    # Prepend blocked-source warnings at top of explanation if any
    if blocked_names:
        warning = (
            "⚠️ **BLOCKED SOURCES NOTICE:** The following portals blocked automated access. "
            "Please visit them directly in your browser for authoritative judgments:\n"
            + "\n".join(
                f"  • {sr.source_name}: {sr.url}"
                for sr in source_results if sr.status == "blocked"
            )
            + "\n\n"
        )
        explanation = warning + explanation

    return JudgmentResponse(
        query              = request.query,
        explanation        = explanation,
        sources_searched   = source_results,
        successful_sources = successful,
        blocked_sources    = blocked_names,
        timestamp          = get_pst_time(),
    )


# ─────────────────────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=7001, reload=True, log_level="info")