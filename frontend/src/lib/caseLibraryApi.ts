/**
 * Case Library API
 * Browse approved judgments from the LexIndex database via /api/case-library.
 */

import { api, API_URL } from '@/lib/api';

export interface CaseSummary {
    id: string;
    title: string | null;
    court: string | null;
    year: string | null;
    decision_date: string | null;
    citation: string | null;
    citation_raw: string | null;
    case_number: string | null;
    case_type: string | null;
    author_judge: string | null;
    judges: string | null;
    petitioner: string | null;
    respondent: string | null;
    summary: string;
}

export interface CaseDetail extends Omit<CaseSummary, 'summary'> {
    citation_type: string | null;
    case_subtype: string | null;
    bench_type: string | null;
    jurisdiction: string | null;
    keywords: string | null;
    acts_referred: string | null;
    headnote: string | null;
    ratio_decidendi: string | null;
    source_url: string | null;
    pdf_url: string | null;
    fullText: string;
}

export interface CasePage {
    cases: CaseSummary[];
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
}

async function get<T>(path: string): Promise<T> {
    const response = await api.authFetch(`${API_URL}${path}`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.error || `Request failed (${response.status})`);
    }
    return data as T;
}

export const caseLibraryApi = {
    list(page = 1, search = ''): Promise<CasePage> {
        const query = new URLSearchParams({ page: String(page), ...(search ? { search } : {}) });
        return get(`/api/case-library?${query}`);
    },

    async get(id: string): Promise<CaseDetail> {
        const data = await get<{ judgment: CaseDetail }>(`/api/case-library/${encodeURIComponent(id)}`);
        return data.judgment;
    }
};
