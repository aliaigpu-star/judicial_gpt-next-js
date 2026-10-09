'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
    Library, Search, X, Loader2, ChevronLeft, ChevronRight, ArrowLeft,
    Landmark, CalendarDays, Gavel, FileText, ExternalLink, Copy, Check, AlertTriangle
} from 'lucide-react';
import { caseLibraryApi, type CaseDetail, type CasePage, type CaseSummary } from '@/lib/caseLibraryApi';
import { copyCleanText } from '@/lib/textUtils';

const ACCENT = '#00a859';

const citationOf = (c: { citation: string | null; citation_raw: string | null }) => c.citation || c.citation_raw;

/** Case Library: browse and read approved judgments (10 per page). */
export default function CaseLibrary() {
    const [page, setPage] = useState(1);
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [data, setData] = useState<CasePage | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [openId, setOpenId] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setData(await caseLibraryApi.list(page, search));
        } catch (err: any) {
            setError(err.message || 'Failed to load judgments');
        } finally {
            setLoading(false);
        }
    }, [page, search]);

    useEffect(() => { load(); }, [load]);

    // Debounced search.
    useEffect(() => {
        const timer = setTimeout(() => {
            setPage(1);
            setSearch(searchInput.trim());
        }, 350);
        return () => clearTimeout(timer);
    }, [searchInput]);

    if (openId) {
        return <CaseReader id={openId} onBack={() => setOpenId(null)} />;
    }

    return (
        <div className="flex flex-col h-full bg-white dark:bg-[#212121]">
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-4xl mx-auto px-4 py-6">
                    {/* Heading */}
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${ACCENT}1a` }}>
                            <Library className="w-5 h-5" style={{ color: ACCENT }} />
                        </div>
                        <div>
                            <h1 className="text-xl font-semibold text-[#0d0d0d] dark:text-[#ececec]">Case Library</h1>
                            <p className="text-sm text-[#666666] dark:text-[#b4b4b4]">
                                Approved judgments{data ? ` · ${data.total} ${search ? 'matching' : 'available'}` : ''}
                            </p>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="relative mb-5">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999999]" />
                        <input
                            value={searchInput}
                            onChange={e => setSearchInput(e.target.value)}
                            placeholder="Search by title, court, citation, judge or keyword"
                            className="w-full rounded-2xl border border-[#e5e5e5] dark:border-[#424242] bg-[#f9f9f9] dark:bg-[#2f2f2f] py-3 pl-10 pr-10 text-sm text-[#0d0d0d] dark:text-[#ececec] outline-none focus:border-[#00a859]"
                        />
                        {searchInput && (
                            <button onClick={() => setSearchInput('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-[#999999] hover:bg-[#ececec] dark:hover:bg-[#3a3a3a]" title="Clear">
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {error && (
                        <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" /> {error}
                        </div>
                    )}

                    {/* List */}
                    {loading && !data ? (
                        <div className="space-y-3">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="h-28 rounded-2xl bg-[#f4f4f4] dark:bg-[#2a2a2a] animate-pulse" />
                            ))}
                        </div>
                    ) : data && data.cases.length === 0 ? (
                        <div className="py-16 text-center text-sm text-[#666666] dark:text-[#b4b4b4]">No judgments match your search.</div>
                    ) : (
                        <div className={`space-y-3 transition-opacity ${loading ? 'opacity-60' : ''}`}>
                            {data?.cases.map((c, i) => (
                                <CaseCard key={c.id} item={c} index={(data.page - 1) * data.pageSize + i + 1} onOpen={() => setOpenId(c.id)} />
                            ))}
                        </div>
                    )}

                    {/* Pagination */}
                    {data && data.totalPages > 1 && (
                        <div className="mt-6 flex items-center justify-between gap-3">
                            <button
                                disabled={page <= 1 || loading}
                                onClick={() => setPage(p => p - 1)}
                                className="flex items-center gap-1.5 rounded-xl border border-[#e5e5e5] dark:border-[#424242] px-3 py-2 text-sm text-[#0d0d0d] dark:text-[#ececec] hover:bg-[#f4f4f4] dark:hover:bg-[#2f2f2f] disabled:opacity-40"
                            >
                                <ChevronLeft className="w-4 h-4" /> Previous
                            </button>
                            <div className="flex flex-wrap justify-center gap-1">
                                {Array.from({ length: data.totalPages }, (_, i) => i + 1).map(n => (
                                    <button
                                        key={n}
                                        onClick={() => setPage(n)}
                                        className={`h-8 min-w-8 rounded-lg px-2 text-sm transition-colors ${n === data.page
                                            ? 'text-white'
                                            : 'text-[#666666] dark:text-[#b4b4b4] hover:bg-[#f4f4f4] dark:hover:bg-[#2f2f2f]'
                                            }`}
                                        style={n === data.page ? { backgroundColor: ACCENT } : undefined}
                                    >
                                        {n}
                                    </button>
                                ))}
                            </div>
                            <button
                                disabled={page >= data.totalPages || loading}
                                onClick={() => setPage(p => p + 1)}
                                className="flex items-center gap-1.5 rounded-xl border border-[#e5e5e5] dark:border-[#424242] px-3 py-2 text-sm text-[#0d0d0d] dark:text-[#ececec] hover:bg-[#f4f4f4] dark:hover:bg-[#2f2f2f] disabled:opacity-40"
                            >
                                Next <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function CaseCard({ item, index, onOpen }: { item: CaseSummary; index: number; onOpen: () => void }) {
    const citation = citationOf(item);
    return (
        <motion.button
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={onOpen}
            className="w-full text-left rounded-2xl border border-[#e5e5e5] dark:border-[#333333] bg-white dark:bg-[#262626] p-4 hover:border-[#00a859]/50 hover:shadow-sm transition-all"
        >
            <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-7 min-w-7 items-center justify-center rounded-lg bg-[#f4f4f4] dark:bg-[#333333] px-1.5 text-xs font-medium text-[#666666] dark:text-[#b4b4b4]">
                    {index}
                </span>
                <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-[#0d0d0d] dark:text-[#ececec] leading-snug">{item.title || 'Untitled judgment'}</h3>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#666666] dark:text-[#b4b4b4]">
                        {item.court && <span className="flex items-center gap-1"><Landmark className="w-3.5 h-3.5" />{item.court}</span>}
                        {(item.decision_date || item.year) && <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" />{item.decision_date || item.year}</span>}
                        {citation && <span className="rounded-md bg-[#00a859]/10 px-1.5 py-0.5 font-medium text-[#00a859]">{citation}</span>}
                        {item.case_type && <span className="rounded-md bg-[#f4f4f4] dark:bg-[#333333] px-1.5 py-0.5">{item.case_type}</span>}
                    </div>
                    {item.summary && (
                        <p className="mt-2 line-clamp-2 text-sm text-[#555555] dark:text-[#a3a3a3]">{item.summary}</p>
                    )}
                </div>
                <ChevronRight className="mt-1 w-4 h-4 flex-shrink-0 text-[#b4b4b4]" />
            </div>
        </motion.button>
    );
}

function CaseReader({ id, onBack }: { id: string; onBack: () => void }) {
    const [judgment, setJudgment] = useState<CaseDetail | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        caseLibraryApi.get(id).then(setJudgment, err => setError(err.message || 'Failed to load judgment'));
    }, [id]);

    const copy = async () => {
        if (judgment && await copyCleanText(judgment.fullText)) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const facts: Array<[string, string | null]> = judgment ? [
        ['Court', judgment.court],
        ['Decided', judgment.decision_date || judgment.year],
        ['Case no.', judgment.case_number],
        ['Case type', [judgment.case_type, judgment.case_subtype].filter(Boolean).join(' · ') || null],
        ['Bench', judgment.bench_type],
        ['Judge(s)', judgment.judges || judgment.author_judge],
        ['Petitioner', judgment.petitioner],
        ['Respondent', judgment.respondent],
        ['Acts referred', judgment.acts_referred],
        ['Keywords', judgment.keywords],
    ] : [];

    return (
        <div className="flex flex-col h-full bg-white dark:bg-[#212121]">
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-3xl mx-auto px-4 py-6">
                    <div className="mb-4 flex items-center justify-between gap-2">
                        <button onClick={onBack} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-[#666666] dark:text-[#b4b4b4] hover:bg-[#f4f4f4] dark:hover:bg-[#2f2f2f]">
                            <ArrowLeft className="w-4 h-4" /> All judgments
                        </button>
                        {judgment && (
                            <div className="flex items-center gap-1">
                                <button onClick={copy} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-[#666666] dark:text-[#b4b4b4] hover:bg-[#f4f4f4] dark:hover:bg-[#2f2f2f]" title="Copy judgment text">
                                    {copied ? <Check className="w-4 h-4 text-[#00a859]" /> : <Copy className="w-4 h-4" />} {copied ? 'Copied' : 'Copy'}
                                </button>
                                {(judgment.pdf_url || judgment.source_url) && (
                                    <a href={(judgment.pdf_url || judgment.source_url)!} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-[#666666] dark:text-[#b4b4b4] hover:bg-[#f4f4f4] dark:hover:bg-[#2f2f2f]">
                                        <ExternalLink className="w-4 h-4" /> Source
                                    </a>
                                )}
                            </div>
                        )}
                    </div>

                    {error ? (
                        <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" /> {error}
                        </div>
                    ) : !judgment ? (
                        <div className="flex items-center gap-2 py-16 justify-center text-sm text-[#666666] dark:text-[#b4b4b4]">
                            <Loader2 className="w-4 h-4 animate-spin" style={{ color: ACCENT }} /> Loading judgment…
                        </div>
                    ) : (
                        <article>
                            <h1 className="font-serif text-2xl font-semibold leading-snug text-[#0d0d0d] dark:text-[#ececec]">{judgment.title}</h1>
                            {citationOf(judgment) && (
                                <p className="mt-2 inline-block rounded-md bg-[#00a859]/10 px-2 py-0.5 text-sm font-medium text-[#00a859]">{citationOf(judgment)}</p>
                            )}

                            <dl className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 rounded-2xl border border-[#e5e5e5] dark:border-[#333333] p-4 text-sm">
                                {facts.filter(([, v]) => v).map(([label, value]) => (
                                    <div key={label} className="flex gap-2 min-w-0">
                                        <dt className="w-28 flex-shrink-0 text-[#999999]">{label}</dt>
                                        <dd className="min-w-0 text-[#0d0d0d] dark:text-[#ececec] break-words">{value}</dd>
                                    </div>
                                ))}
                            </dl>

                            {judgment.headnote && (
                                <Section icon={FileText} title="Headnote" text={judgment.headnote} />
                            )}
                            {judgment.ratio_decidendi && (
                                <Section icon={Gavel} title="Ratio decidendi" text={judgment.ratio_decidendi} />
                            )}

                            <h2 className="mt-8 mb-3 flex items-center gap-2 text-base font-semibold text-[#0d0d0d] dark:text-[#ececec]">
                                <Library className="w-4 h-4" style={{ color: ACCENT }} /> Full judgment
                            </h2>
                            <div className="whitespace-pre-wrap font-serif text-[15px] leading-7 text-[#1f1f1f] dark:text-[#dcdcdc]">
                                {judgment.fullText || 'The full text of this judgment is not available.'}
                            </div>
                        </article>
                    )}
                </div>
            </div>
        </div>
    );
}

function Section({ icon: Icon, title, text }: { icon: React.ElementType; title: string; text: string }) {
    return (
        <section className="mt-6">
            <h2 className="mb-2 flex items-center gap-2 text-base font-semibold text-[#0d0d0d] dark:text-[#ececec]">
                <Icon className="w-4 h-4" style={{ color: ACCENT }} /> {title}
            </h2>
            <p className="whitespace-pre-wrap text-[15px] leading-7 text-[#333333] dark:text-[#cfcfcf]">{text}</p>
        </section>
    );
}
