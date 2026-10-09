"""
Case Library: read-only browsing of approved judgments from the LexIndex
database (table approved_cases, full text in judgments.file_content).

Served by the Judgment Search agent, so the database stays on this machine:
the website reaches it through the agent's tunnel and the backend proxy
(/api/ai/agent/judgment-search/cases).

Config (agent .env):  LEXINDEX_DATABASE_URL=postgresql://user:pass@127.0.0.1:5432/lexindex
"""

import html
import math
import os
import re

import psycopg
from psycopg.rows import dict_row
from fastapi import APIRouter, HTTPException, Query

router = APIRouter(prefix="/cases", tags=["Case Library"])

# Only the first 100 approved judgments are offered.
LIBRARY_LIMIT = 100
PAGE_SIZE = 10

LIBRARY_CTE = f"""
    WITH library AS (
        SELECT *
        FROM approved_cases
        ORDER BY year NULLS LAST, title, id
        LIMIT {LIBRARY_LIMIT}
    )"""

SEARCH_FILTER = """
    WHERE title ILIKE %(q)s OR court ILIKE %(q)s OR citation ILIKE %(q)s OR citation_raw ILIKE %(q)s
       OR judges ILIKE %(q)s OR author_judge ILIKE %(q)s OR keywords ILIKE %(q)s OR case_number ILIKE %(q)s"""


def _connect():
    url = os.getenv("LEXINDEX_DATABASE_URL")
    if not url:
        raise HTTPException(status_code=503, detail="Case library is not configured (LEXINDEX_DATABASE_URL missing).")
    try:
        return psycopg.connect(url, row_factory=dict_row, connect_timeout=10)
    except psycopg.Error as exc:
        raise HTTPException(status_code=503, detail=f"Case library database unavailable: {exc}") from exc


def html_to_text(raw: str) -> str:
    """Word-generated HTML -> readable plain text with paragraph breaks."""
    if not raw:
        return ""
    text = re.sub(r"[\r\n]+", " ", raw)  # raw line breaks in HTML are just word wraps
    text = re.sub(r"<(script|style|head|xml)[^>]*>.*?</\1>", "", text, flags=re.I | re.S)
    text = re.sub(r"<!--.*?-->", "", text, flags=re.S)
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.I)
    text = re.sub(r"</(p|div|h[1-6]|li|tr|table|blockquote)>", "\n\n", text, flags=re.I)
    text = re.sub(r"</t[dh]>", "\t", text, flags=re.I)
    text = re.sub(r"<[^>]+>", "", text)
    text = html.unescape(text).replace(" ", " ")
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n[ \t]+", "\n", text)
    text = re.sub(r"[ \t]{2,}", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


@router.get("")
def list_cases(page: int = Query(1, ge=1), search: str = Query("", max_length=200)):
    """One page (10) of the library, optionally filtered."""
    search = search.strip()
    params = {"offset": (page - 1) * PAGE_SIZE}
    where = ""
    if search:
        params["q"] = f"%{search}%"
        where = SEARCH_FILTER

    with _connect() as conn:
        cases = conn.execute(
            f"""{LIBRARY_CTE}
                SELECT id, title, court, year, decision_date, citation, citation_raw, case_number,
                       case_type, author_judge, judges, petitioner, respondent,
                       LEFT(COALESCE(headnote, ratio_decidendi, ''), 320) AS summary
                FROM library {where}
                ORDER BY year NULLS LAST, title, id
                LIMIT {PAGE_SIZE} OFFSET %(offset)s""",
            params,
        ).fetchall()
        total = conn.execute(f"{LIBRARY_CTE} SELECT COUNT(*) AS total FROM library {where}", params).fetchone()["total"]

    return {
        "success": True,
        "cases": cases,
        "page": page,
        "pageSize": PAGE_SIZE,
        "total": total,
        "totalPages": max(1, math.ceil(total / PAGE_SIZE)),
    }


@router.get("/{case_id}")
def get_case(case_id: str):
    """Full details and readable text of one judgment from the library."""
    with _connect() as conn:
        row = conn.execute(
            f"""{LIBRARY_CTE}
                SELECT l.id, l.title, l.court, l.year, l.decision_date, l.citation, l.citation_raw, l.citation_type,
                       l.case_number, l.case_type, l.case_subtype, l.bench_type, l.jurisdiction,
                       l.author_judge, l.judges, l.petitioner, l.respondent, l.keywords, l.acts_referred,
                       l.headnote, l.ratio_decidendi, l.source_url, l.pdf_url,
                       j.file_content, j.file_type
                FROM library l
                LEFT JOIN judgments j ON j.id = l.judgment_id
                WHERE l.id = %(id)s""",
            {"id": case_id},
        ).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Judgment not found")

    content = row.pop("file_content") or ""
    file_type = row.pop("file_type")
    is_html = file_type == "html" or bool(re.search(r"<\w+[^>]*>", content))
    row["fullText"] = html_to_text(content) if is_html else content.strip()
    return {"success": True, "judgment": row}
