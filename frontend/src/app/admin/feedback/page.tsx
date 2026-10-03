'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ThumbsUp, ThumbsDown, Smile, Inbox, Save, RefreshCw, Search, X, Loader2,
    CheckCircle2, Ban, Eye, ChevronLeft, ChevronRight, FileJson, FileSpreadsheet, MessageSquareQuote
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
    adminApi,
    type FeedbackFilters,
    type FeedbackItem,
    type FeedbackStats,
    type FeedbackStatus
} from '@/lib/adminApi';

const PAGE_SIZE = 20;

const SOURCE_LABELS: Record<string, string> = {
    chat: 'Main chat',
    civil_law: 'Civil Law',
    criminal_law: 'Criminal Law',
    family_law: 'Family Law',
    summarizer: 'Summarizer',
    judgment_search: 'Judgment Search',
    civil_judgment: 'Civil Judgment',
    criminal_judgment: 'Criminal Judgment',
};

const REASON_LABELS: Record<string, string> = {
    inaccurate: 'Inaccurate',
    wrong_citation: 'Wrong citation',
    incomplete: 'Incomplete',
    not_relevant: 'Not relevant',
    unclear: 'Unclear',
    outdated: 'Outdated',
    other: 'Other',
};

const STATUS_STYLES: Record<FeedbackStatus, { label: string; className: string }> = {
    new: { label: 'New', className: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
    reviewed: { label: 'Reviewed', className: 'bg-gray-500/10 text-gray-300 border-gray-500/30' },
    approved: { label: 'Approved for training', className: 'bg-[#00a859]/10 text-[#00a859] border-[#00a859]/30' },
    excluded: { label: 'Excluded', className: 'bg-red-500/10 text-red-400 border-red-500/30' },
};

const formatDate = (value: string) =>
    new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

function Panel({ title, children, className = '' }: { title?: string; children: React.ReactNode; className?: string }) {
    return (
        <div className={`rounded-2xl border border-gray-800 bg-[#0a0a0a] p-5 ${className}`}>
            {title && <h2 className="mb-4 text-sm font-semibold text-gray-300">{title}</h2>}
            {children}
        </div>
    );
}

function Metric({ icon: Icon, label, value, hint, tone }: {
    icon: React.ElementType; label: string; value: React.ReactNode; hint?: string; tone: string;
}) {
    return (
        <div className="rounded-2xl border border-gray-800 bg-[#0a0a0a] p-5">
            <div className="flex items-center justify-between">
                <p className="text-sm text-gray-400">{label}</p>
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}>
                    <Icon className="h-4.5 w-4.5" />
                </span>
            </div>
            <p className="mt-3 text-3xl font-bold text-white">{value}</p>
            {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
        </div>
    );
}

/** 30-day likes (green) vs dislikes (red) as stacked bars. */
function TrendChart({ daily }: { daily: FeedbackStats['daily'] }) {
    const max = Math.max(1, ...daily.map(d => d.likes + d.dislikes));
    return (
        <div>
            <div className="flex h-40 items-end gap-1">
                {daily.map(d => (
                    <div key={d.date} className="group relative flex h-full flex-1 flex-col justify-end" title={`${d.date}: ${d.likes} 👍 / ${d.dislikes} 👎`}>
                        <div className="w-full rounded-t-sm bg-red-500/80" style={{ height: `${(d.dislikes / max) * 100}%` }} />
                        <div className="w-full bg-[#00a859]" style={{ height: `${(d.likes / max) * 100}%` }} />
                    </div>
                ))}
            </div>
            <div className="mt-2 flex justify-between text-[11px] text-gray-500">
                <span>{daily[0]?.date.slice(5)}</span>
                <span className="flex items-center gap-3">
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-[#00a859]" />Likes</span>
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-red-500" />Dislikes</span>
                </span>
                <span>{daily[daily.length - 1]?.date.slice(5)}</span>
            </div>
        </div>
    );
}

function Breakdown({ rows }: { rows: Array<{ label: string; value: number; tone: string }> }) {
    const max = Math.max(1, ...rows.map(r => r.value));
    if (!rows.length) return <p className="text-sm text-gray-500">No data yet.</p>;
    return (
        <div className="space-y-3">
            {rows.map(r => (
                <div key={r.label}>
                    <div className="mb-1 flex justify-between text-sm">
                        <span className="text-gray-300">{r.label}</span>
                        <span className="text-gray-500">{r.value}</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-800">
                        <div className={`h-2 rounded-full ${r.tone}`} style={{ width: `${(r.value / max) * 100}%` }} />
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function FeedbackPage() {
    const [stats, setStats] = useState<FeedbackStats | null>(null);
    const [items, setItems] = useState<FeedbackItem[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [filters, setFilters] = useState<FeedbackFilters>({ rating: '', status: '', source: '', search: '' });
    const [searchInput, setSearchInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selected, setSelected] = useState<FeedbackItem | null>(null);
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [exporting, setExporting] = useState<'jsonl' | 'csv' | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [statsRes, listRes] = await Promise.all([
                adminApi.getFeedbackStats(),
                adminApi.getFeedback(filters, PAGE_SIZE, page * PAGE_SIZE),
            ]);
            setStats(statsRes.stats);
            setItems(listRes.items);
            setTotal(listRes.total);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Failed to load feedback');
        } finally {
            setLoading(false);
        }
    }, [filters, page]);

    useEffect(() => { load(); }, [load]);

    // Debounced search.
    useEffect(() => {
        const timer = setTimeout(() => {
            setPage(0);
            setFilters(f => ({ ...f, search: searchInput.trim() }));
        }, 350);
        return () => clearTimeout(timer);
    }, [searchInput]);

    const setFilter = (key: keyof FeedbackFilters, value: string) => {
        setPage(0);
        setFilters(f => ({ ...f, [key]: value }));
    };

    const openItem = (item: FeedbackItem) => {
        setSelected(item);
        setNotes(item.admin_notes || '');
    };

    const review = async (status?: FeedbackStatus) => {
        if (!selected) return;
        setSaving(true);
        try {
            const { item } = await adminApi.reviewFeedback(selected.id, { status, notes });
            const merged = { ...selected, ...item };
            setSelected(merged);
            setItems(prev => prev.map(i => (i.id === item.id ? merged : i)));
            adminApi.getFeedbackStats().then(r => setStats(r.stats)).catch(() => {});
        } catch (err: any) {
            setError(err.message || 'Failed to update feedback');
        } finally {
            setSaving(false);
        }
    };

    const exportData = async (format: 'jsonl' | 'csv') => {
        setExporting(format);
        try {
            await adminApi.downloadFeedback(format, filters);
        } catch (err: any) {
            setError(err.message || 'Export failed');
        } finally {
            setExporting(null);
        }
    };

    const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const selectClass = 'rounded-xl border border-gray-800 bg-[#0a0a0a] px-3 py-2 text-sm text-gray-200 outline-none focus:border-[#00a859]';

    return (
        <div className="p-4 md:p-8">
            {/* Header */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Feedback & Quality</h1>
                    <p className="mt-1 text-gray-400">What users think of the AI&apos;s answers, and the data to improve it.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button onClick={load} className="flex items-center gap-2 rounded-xl border border-gray-800 bg-gray-900 px-3.5 py-2 text-sm text-gray-300 hover:bg-gray-800">
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
                    </button>
                    <button onClick={() => exportData('csv')} disabled={!!exporting} className="flex items-center gap-2 rounded-xl border border-gray-800 bg-gray-900 px-3.5 py-2 text-sm text-gray-300 hover:bg-gray-800 disabled:opacity-50">
                        {exporting === 'csv' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />} CSV
                    </button>
                    <button onClick={() => exportData('jsonl')} disabled={!!exporting} className="flex items-center gap-2 rounded-xl bg-[#00a859] px-3.5 py-2 text-sm font-medium text-white hover:bg-[#009a51] disabled:opacity-50" title="Export the filtered records as a JSONL training dataset">
                        {exporting === 'jsonl' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileJson className="h-4 w-4" />} Export dataset
                    </button>
                </div>
            </div>

            {error && <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-400">{error}</div>}

            {/* Metrics */}
            <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
                <Metric icon={Smile} label="Satisfaction" tone="bg-[#00a859]/15 text-[#00a859]"
                    value={stats?.satisfaction != null ? `${stats.satisfaction}%` : '–'}
                    hint={stats ? `${stats.total} ratings from ${stats.raters} users` : undefined} />
                <Metric icon={ThumbsUp} label="Liked answers" tone="bg-[#00a859]/15 text-[#00a859]" value={stats?.likes ?? '–'} />
                <Metric icon={ThumbsDown} label="Disliked answers" tone="bg-red-500/15 text-red-400" value={stats?.dislikes ?? '–'} />
                <Metric icon={Inbox} label="Waiting for review" tone="bg-blue-500/15 text-blue-400"
                    value={stats?.pending_review ?? '–'} hint={stats ? `${stats.approved} approved for training` : undefined} />
            </div>

            {/* Charts */}
            <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
                <Panel title="Last 30 days" className="lg:col-span-2">
                    {stats ? <TrendChart daily={stats.daily} /> : <div className="h-40 animate-pulse rounded-xl bg-gray-900" />}
                </Panel>
                <Panel title="Why answers were disliked">
                    <Breakdown rows={(stats?.reasons || []).map(r => ({ label: r.label, value: r.count, tone: 'bg-red-500/80' }))} />
                </Panel>
            </div>

            <Panel title="Satisfaction by agent" className="mb-6">
                {stats?.sources.length ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {stats.sources.map(s => {
                            const rated = s.likes + s.dislikes;
                            const pct = rated ? Math.round((s.likes / rated) * 100) : 0;
                            return (
                                <div key={s.source} className="rounded-xl border border-gray-800 p-3">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-200">{SOURCE_LABELS[s.source] || s.source}</span>
                                        <span className={pct >= 70 ? 'text-[#00a859]' : pct >= 40 ? 'text-amber-400' : 'text-red-400'}>{pct}%</span>
                                    </div>
                                    <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-gray-800">
                                        <div className="bg-[#00a859]" style={{ width: `${pct}%` }} />
                                        <div className="bg-red-500/80" style={{ width: `${100 - pct}%` }} />
                                    </div>
                                    <p className="mt-1.5 text-xs text-gray-500">{s.likes} 👍 · {s.dislikes} 👎</p>
                                </div>
                            );
                        })}
                    </div>
                ) : <p className="text-sm text-gray-500">No ratings yet.</p>}
            </Panel>

            {/* Filters */}
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="flex rounded-xl border border-gray-800 bg-[#0a0a0a] p-1">
                    {([['', 'All'], ['like', 'Liked'], ['dislike', 'Disliked']] as const).map(([value, label]) => (
                        <button key={label} onClick={() => setFilter('rating', value)}
                            className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${filters.rating === value ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-gray-200'}`}>
                            {label}
                        </button>
                    ))}
                </div>
                <select value={filters.status} onChange={e => setFilter('status', e.target.value)} className={selectClass}>
                    <option value="">All statuses</option>
                    {(Object.keys(STATUS_STYLES) as FeedbackStatus[]).map(s => <option key={s} value={s}>{STATUS_STYLES[s].label}</option>)}
                </select>
                <select value={filters.source} onChange={e => setFilter('source', e.target.value)} className={selectClass}>
                    <option value="">All agents</option>
                    {Object.entries(SOURCE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                    <input value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Search question, answer, comment or email"
                        className="w-full rounded-xl border border-gray-800 bg-[#0a0a0a] py-2 pl-9 pr-3 text-sm text-gray-200 outline-none placeholder:text-gray-500 focus:border-[#00a859]" />
                </div>
            </div>

            {/* List */}
            <div className="overflow-hidden rounded-2xl border border-gray-800 bg-[#0a0a0a]">
                {loading && !items.length ? (
                    <div className="flex items-center justify-center gap-2 py-16 text-gray-400"><Loader2 className="h-5 w-5 animate-spin" /> Loading feedback…</div>
                ) : !items.length ? (
                    <div className="py-16 text-center text-gray-500">
                        <MessageSquareQuote className="mx-auto mb-3 h-10 w-10 text-gray-700" />
                        No feedback matches these filters.
                    </div>
                ) : (
                    <ul className="divide-y divide-gray-800">
                        {items.map(item => (
                            <li key={item.id}>
                                <button onClick={() => openItem(item)} className="flex w-full items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-gray-900/60">
                                    <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${item.rating === 'like' ? 'bg-[#00a859]/15 text-[#00a859]' : 'bg-red-500/15 text-red-400'}`}>
                                        {item.rating === 'like' ? <ThumbsUp className="h-4 w-4" /> : <ThumbsDown className="h-4 w-4" />}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-white">{item.prompt || '(question not available)'}</p>
                                        <p className="mt-1 line-clamp-2 text-sm text-gray-400">{item.response}</p>
                                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                            {item.reasons.map(r => (
                                                <span key={r} className="rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[11px] text-red-300">{REASON_LABELS[r] || r}</span>
                                            ))}
                                            {item.comment && <span className="rounded-full border border-gray-700 px-2 py-0.5 text-[11px] text-gray-300">💬 comment</span>}
                                            <span className="text-[11px] text-gray-500">{SOURCE_LABELS[item.source] || item.source} · {item.user_email || 'deleted user'} · {formatDate(item.created_at)}</span>
                                        </div>
                                    </div>
                                    <span className={`hidden shrink-0 rounded-full border px-2.5 py-1 text-xs sm:inline ${STATUS_STYLES[item.review_status].className}`}>
                                        {STATUS_STYLES[item.review_status].label}
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
                <div className="flex items-center justify-between border-t border-gray-800 px-5 py-3 text-sm text-gray-400">
                    <span>{total} record{total === 1 ? '' : 's'}</span>
                    <div className="flex items-center gap-2">
                        <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="rounded-lg p-1.5 hover:bg-gray-800 disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
                        <span>Page {page + 1} of {pageCount}</span>
                        <button disabled={page + 1 >= pageCount} onClick={() => setPage(p => p + 1)} className="rounded-lg p-1.5 hover:bg-gray-800 disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
                    </div>
                </div>
            </div>

            {/* Detail drawer */}
            <AnimatePresence>
                {selected && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setSelected(null)} />
                        <motion.aside
                            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col border-l border-gray-800 bg-[#0a0a0a]"
                        >
                            <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${selected.rating === 'like' ? 'bg-[#00a859]/15 text-[#00a859]' : 'bg-red-500/15 text-red-400'}`}>
                                        {selected.rating === 'like' ? <ThumbsUp className="h-4 w-4" /> : <ThumbsDown className="h-4 w-4" />}
                                    </span>
                                    <div>
                                        <p className="font-semibold text-white">{selected.rating === 'like' ? 'Liked answer' : 'Disliked answer'}</p>
                                        <p className="text-xs text-gray-500">{selected.user_name || selected.user_email || 'Deleted user'} · {formatDate(selected.created_at)}</p>
                                    </div>
                                </div>
                                <button onClick={() => setSelected(null)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-800"><X className="h-5 w-5" /></button>
                            </div>

                            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
                                <div className="flex flex-wrap gap-2 text-xs">
                                    <span className={`rounded-full border px-2.5 py-1 ${STATUS_STYLES[selected.review_status].className}`}>{STATUS_STYLES[selected.review_status].label}</span>
                                    <span className="rounded-full border border-gray-700 px-2.5 py-1 text-gray-300">{SOURCE_LABELS[selected.source] || selected.source}</span>
                                    {selected.model && <span className="rounded-full border border-gray-700 px-2.5 py-1 text-gray-300">{selected.model}</span>}
                                    {selected.conversation_title && <span className="rounded-full border border-gray-700 px-2.5 py-1 text-gray-400">{selected.conversation_title}</span>}
                                </div>

                                {(selected.reasons.length > 0 || selected.comment) && (
                                    <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-300">User&apos;s feedback</p>
                                        {selected.reasons.length > 0 && (
                                            <div className="mb-2 flex flex-wrap gap-1.5">
                                                {selected.reasons.map(r => <span key={r} className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs text-red-200">{REASON_LABELS[r] || r}</span>)}
                                            </div>
                                        )}
                                        {selected.comment && <p className="text-sm text-gray-200">“{selected.comment}”</p>}
                                    </div>
                                )}

                                <div>
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Question</p>
                                    <div className="whitespace-pre-wrap rounded-xl bg-gray-900 p-4 text-sm text-gray-200">{selected.prompt || '(not available)'}</div>
                                </div>
                                <div>
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Answer{selected.message_version ? ` (version ${selected.message_version})` : ''}</p>
                                    <div className="message-content rounded-xl border border-gray-800 p-4 text-sm text-gray-200">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{selected.response}</ReactMarkdown>
                                    </div>
                                </div>
                                <div>
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Reviewer notes</p>
                                    <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                                        placeholder="e.g. Correct answer is Section 497(1) — use as negative example"
                                        className="w-full resize-none rounded-xl border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-gray-200 outline-none focus:border-[#00a859]" />
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 border-t border-gray-800 px-6 py-4">
                                <button disabled={saving} onClick={() => review('approved')} className="flex items-center gap-2 rounded-xl bg-[#00a859] px-4 py-2 text-sm font-medium text-white hover:bg-[#009a51] disabled:opacity-50">
                                    <CheckCircle2 className="h-4 w-4" /> Approve for training
                                </button>
                                <button disabled={saving} onClick={() => review('reviewed')} className="flex items-center gap-2 rounded-xl border border-gray-700 px-4 py-2 text-sm text-gray-200 hover:bg-gray-800 disabled:opacity-50">
                                    <Eye className="h-4 w-4" /> Mark reviewed
                                </button>
                                <button disabled={saving} onClick={() => review('excluded')} className="flex items-center gap-2 rounded-xl border border-red-500/30 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 disabled:opacity-50">
                                    <Ban className="h-4 w-4" /> Exclude
                                </button>
                                <button disabled={saving} onClick={() => review()} className="ml-auto flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-gray-400 hover:bg-gray-800 disabled:opacity-50">
                                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save notes
                                </button>
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
