'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, Check, Loader2, Users, ClipboardList, ChevronDown, ChevronUp, Search, FileText } from 'lucide-react';
import { api } from '@/lib/api';

const API = process.env.NEXT_PUBLIC_API_URL || '';

type QuestionType = 'mcq' | 'text';
type CorrectOption = 'a' | 'b' | 'c' | 'd';

interface Question {
    id: number;
    question_text: string;
    option_a: string | null;
    option_b: string | null;
    option_c: string | null;
    option_d: string | null;
    correct_option: CorrectOption | null;
    expected_answer: string | null;
    question_type: QuestionType;
    question_order: number;
}

interface Submission {
    id: number;
    name: string;
    personal_email: string;
    designation: string;
    posting: string;
    years_experience: string;
    contact_no: string;
    batch: string;
    score: number;
    total: number;
    answers: { [qid: string]: string };
    ai_feedback: { [qid: string]: { ai_score: number; feedback: string } } | null;
    submitted_at: string;
}

interface FormState {
    question_text: string;
    question_type: QuestionType;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_option: CorrectOption;
    expected_answer: string;
}

const emptyForm: FormState = {
    question_text: '', question_type: 'mcq',
    option_a: '', option_b: '', option_c: '', option_d: '',
    correct_option: 'a', expected_answer: ''
};

type Tab = 'questions' | 'submissions';
type ScoreFilter = 'all' | 'high' | 'medium' | 'low';

export default function AdminQuizPage() {
    const [tab, setTab] = useState<Tab>('questions');

    // Questions state
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loadingQ, setLoadingQ] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<Question | null>(null);
    const [form, setForm] = useState<FormState>(emptyForm);
    const [saving, setSaving] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [formError, setFormError] = useState('');
    const [expandedQId, setExpandedQId] = useState<number | null>(null);

    // Submissions state
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loadingS, setLoadingS] = useState(false);
    const [expandedSubId, setExpandedSubId] = useState<number | null>(null);
    const [filterName, setFilterName] = useState('');
    const [filterBatch, setFilterBatch] = useState('');
    const [filterScore, setFilterScore] = useState<ScoreFilter>('all');

    const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${api.getToken()}` });

    const loadQuestions = async () => {
        setLoadingQ(true);
        const res = await fetch(`${API}/api/quiz/questions/admin`, { headers: headers() });
        const data = await res.json();
        setQuestions(data.questions || []);
        setLoadingQ(false);
    };

    const loadSubmissions = async () => {
        setLoadingS(true);
        const res = await fetch(`${API}/api/quiz/submissions`, { headers: headers() });
        const data = await res.json();
        setSubmissions(data.submissions || []);
        setLoadingS(false);
    };

    useEffect(() => { loadQuestions(); }, []);
    useEffect(() => { if (tab === 'submissions') loadSubmissions(); }, [tab]);

    const openAdd = () => { setEditing(null); setForm(emptyForm); setFormError(''); setShowForm(true); };
    const openEdit = (q: Question) => {
        setEditing(q);
        setForm({
            question_text: q.question_text,
            question_type: q.question_type || 'mcq',
            option_a: q.option_a || '',
            option_b: q.option_b || '',
            option_c: q.option_c || '',
            option_d: q.option_d || '',
            correct_option: (q.correct_option as CorrectOption) || 'a',
            expected_answer: q.expected_answer || ''
        });
        setFormError(''); setShowForm(true);
    };

    const save = async () => {
        if (!form.question_text.trim()) { setFormError('Question text is required'); return; }
        if (form.question_type === 'mcq') {
            if (!form.option_a.trim() || !form.option_b.trim() || !form.option_c.trim() || !form.option_d.trim()) {
                setFormError('All 4 options are required for MCQ'); return;
            }
        } else {
            if (!form.expected_answer.trim()) { setFormError('Expected answer is required for text questions'); return; }
        }
        setSaving(true); setFormError('');
        const url = editing ? `${API}/api/quiz/questions/${editing.id}` : `${API}/api/quiz/questions`;
        const method = editing ? 'PUT' : 'POST';
        const res = await fetch(url, { method, headers: headers(), body: JSON.stringify(form) });
        setSaving(false);
        if (res.ok) { setShowForm(false); loadQuestions(); }
        else { const d = await res.json(); setFormError(d.message || 'Failed to save'); }
    };

    const remove = async (id: number) => {
        await fetch(`${API}/api/quiz/questions/${id}`, { method: 'DELETE', headers: headers() });
        setDeleteId(null);
        loadQuestions();
    };

    const pct = (s: Submission) => s.total ? Math.round((s.score / s.total) * 100) : 0;

    // Filtered submissions
    const uniqueBatches = [...new Set(submissions.map(s => s.batch).filter(Boolean))];
    const filteredSubs = submissions
        .filter(s => !filterName || s.name?.toLowerCase().includes(filterName.toLowerCase()) || s.personal_email?.toLowerCase().includes(filterName.toLowerCase()))
        .filter(s => !filterBatch || s.batch === filterBatch)
        .filter(s => {
            if (filterScore === 'all') return true;
            const p = pct(s);
            if (filterScore === 'high') return p >= 70;
            if (filterScore === 'medium') return p >= 40 && p < 70;
            return p < 40;
        });

    return (
        <div className="p-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-[#0d0d0d] dark:text-[#ececec]">Quiz Management</h1>
                    <p className="text-sm text-[#666666] dark:text-[#aaaaaa] mt-0.5">
                        {questions.length} question{questions.length !== 1 ? 's' : ''} · {submissions.length > 0 ? `${submissions.length} submission${submissions.length !== 1 ? 's' : ''}` : 'No submissions yet'}
                    </p>
                </div>
                {tab === 'questions' && (
                    <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-[#00a859] text-white rounded-xl text-sm font-medium hover:bg-[#009048] transition-colors">
                        <Plus className="w-4 h-4" /> Add Question
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-5 bg-[#f4f4f4] dark:bg-[#1a1a1a] rounded-xl p-1 w-fit">
                {([['questions', ClipboardList, 'Questions'], ['submissions', Users, 'Submissions']] as const).map(([key, Icon, label]) => (
                    <button key={key} onClick={() => setTab(key as Tab)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === key ? 'bg-white dark:bg-[#2a2a2a] text-[#0d0d0d] dark:text-[#ececec] shadow-sm' : 'text-[#666] dark:text-[#aaa] hover:text-[#0d0d0d] dark:hover:text-[#ececec]'}`}>
                        <Icon className="w-4 h-4" />{label}
                    </button>
                ))}
            </div>

            {/* ── Questions tab ── */}
            {tab === 'questions' && (
                loadingQ ? (
                    <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#00a859]" /></div>
                ) : questions.length === 0 ? (
                    <div className="text-center py-16 text-[#999999]">No questions yet. Click &quot;Add Question&quot; to get started.</div>
                ) : (
                    <div className="space-y-2">
                        {questions.map((q, i) => {
                            const isOpen = expandedQId === q.id;
                            return (
                                <div key={q.id} className="bg-white dark:bg-[#1a1a1a] border border-[#e5e5e5] dark:border-[#333] rounded-2xl overflow-hidden">
                                    {/* Collapsed header — always visible */}
                                    <button onClick={() => setExpandedQId(isOpen ? null : q.id)}
                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#f9f9f9] dark:hover:bg-[#222] transition-colors text-left">
                                        <span className="text-xs font-bold text-[#00a859] flex-shrink-0 w-8">Q{i + 1}.</span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${q.question_type === 'text' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' : 'bg-[#00a859]/10 text-[#00a859]'}`}>
                                            {q.question_type === 'text' ? 'Text' : 'MCQ'}
                                        </span>
                                        <p className="text-sm text-[#0d0d0d] dark:text-[#ececec] flex-1 truncate">{q.question_text}</p>
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            <button onClick={e => { e.stopPropagation(); openEdit(q); }} className="p-1.5 rounded-lg text-[#666] hover:bg-[#f4f4f4] dark:hover:bg-[#2a2a2a] transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                                            <button onClick={e => { e.stopPropagation(); setDeleteId(q.id); }} className="p-1.5 rounded-lg text-[#666] hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                                            {isOpen ? <ChevronUp className="w-4 h-4 text-[#999]" /> : <ChevronDown className="w-4 h-4 text-[#999]" />}
                                        </div>
                                    </button>

                                    {/* Expanded detail */}
                                    {isOpen && (
                                        <div className="border-t border-[#e5e5e5] dark:border-[#333] px-4 py-3">
                                            {q.question_type === 'mcq' ? (
                                                <div className="grid grid-cols-2 gap-1.5">
                                                    {(['a', 'b', 'c', 'd'] as const).map(opt => (
                                                        <div key={opt} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${q.correct_option === opt ? 'bg-[#00a859]/10 text-[#00a859] border border-[#00a859]/30 font-medium' : 'text-[#555] dark:text-[#aaa]'}`}>
                                                            {q.correct_option === opt && <Check className="w-3 h-3 flex-shrink-0" />}
                                                            <span className="font-semibold mr-1">{opt.toUpperCase()}.</span>
                                                            {q[`option_${opt}` as keyof Question] as string}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl px-3 py-2">
                                                    <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">Expected Answer (AI reference)</p>
                                                    <p className="text-xs text-[#444] dark:text-[#ccc]">{q.expected_answer}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )
            )}

            {/* ── Submissions tab ── */}
            {tab === 'submissions' && (
                loadingS ? (
                    <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#00a859]" /></div>
                ) : (
                    <>
                        {/* Filter bar */}
                        <div className="flex flex-wrap gap-2 mb-4">
                            <div className="relative flex-1 min-w-[180px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#999]" />
                                <input value={filterName} onChange={e => setFilterName(e.target.value)}
                                    placeholder="Search by name or email..."
                                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-[#e5e5e5] dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-sm text-[#0d0d0d] dark:text-[#ececec] outline-none" />
                            </div>
                            {uniqueBatches.length > 0 && (
                                <select value={filterBatch} onChange={e => setFilterBatch(e.target.value)}
                                    className="px-3 py-2 rounded-xl border border-[#e5e5e5] dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-sm text-[#0d0d0d] dark:text-[#ececec] outline-none">
                                    <option value="">All Batches</option>
                                    {uniqueBatches.map(b => <option key={b} value={b}>Batch {b}</option>)}
                                </select>
                            )}
                            <select value={filterScore} onChange={e => setFilterScore(e.target.value as ScoreFilter)}
                                className="px-3 py-2 rounded-xl border border-[#e5e5e5] dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-sm text-[#0d0d0d] dark:text-[#ececec] outline-none">
                                <option value="all">All Scores</option>
                                <option value="high">High ≥70%</option>
                                <option value="medium">Medium 40–69%</option>
                                <option value="low">Low &lt;40%</option>
                            </select>
                            <span className="self-center text-xs text-[#999]">{filteredSubs.length} result{filteredSubs.length !== 1 ? 's' : ''}</span>
                        </div>

                        {filteredSubs.length === 0 ? (
                            <div className="text-center py-16 text-[#999999]">No submissions match the current filters.</div>
                        ) : (
                            <div className="space-y-3">
                                {filteredSubs.map(s => (
                                    <div key={s.id} className="bg-white dark:bg-[#1a1a1a] border border-[#e5e5e5] dark:border-[#333] rounded-2xl overflow-hidden">
                                        <button onClick={() => setExpandedSubId(expandedSubId === s.id ? null : s.id)}
                                            className="w-full flex items-center gap-4 px-5 py-4 hover:bg-[#f9f9f9] dark:hover:bg-[#222] transition-colors text-left">
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${pct(s) >= 70 ? 'bg-[#00a859]/10 text-[#00a859]' : pct(s) >= 40 ? 'bg-yellow-50 text-yellow-600' : 'bg-red-50 text-red-500'}`}>
                                                {pct(s)}%
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-semibold text-sm text-[#0d0d0d] dark:text-[#ececec]">{s.name || 'Unknown'}</p>
                                                    {s.batch && <span className="text-xs bg-[#f4f4f4] dark:bg-[#2a2a2a] text-[#666] dark:text-[#aaa] px-2 py-0.5 rounded-full">Batch {s.batch}</span>}
                                                </div>
                                                <p className="text-xs text-[#666] dark:text-[#aaa] truncate">{s.personal_email} · {s.designation}</p>
                                                <p className="text-xs text-[#999] mt-0.5">{s.score}/{s.total} correct · {new Date(s.submitted_at).toLocaleString()}</p>
                                            </div>
                                            {expandedSubId === s.id ? <ChevronUp className="w-4 h-4 text-[#999]" /> : <ChevronDown className="w-4 h-4 text-[#999]" />}
                                        </button>

                                        {expandedSubId === s.id && (
                                            <div className="border-t border-[#e5e5e5] dark:border-[#333] px-5 py-4 space-y-4">
                                                {/* Personal info */}
                                                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                                                    {[['Name', s.name], ['Personal Email', s.personal_email], ['Designation', s.designation], ['Posting', s.posting], ['Experience', s.years_experience], ['Contact', s.contact_no], ['Batch', s.batch]].map(([label, val]) => val ? (
                                                        <div key={label}>
                                                            <span className="text-xs text-[#999] block">{label}</span>
                                                            <span className="text-[#0d0d0d] dark:text-[#ececec]">{val}</span>
                                                        </div>
                                                    ) : null)}
                                                </div>
                                                {/* Answers */}
                                                <div>
                                                    <p className="text-xs font-semibold text-[#999] uppercase tracking-wide mb-2">Answers</p>
                                                    <div className="space-y-2">
                                                        {questions.map((q, i) => {
                                                            const userAns = s.answers?.[q.id];
                                                            const aiInfo = s.ai_feedback?.[q.id];
                                                            if (q.question_type === 'text') {
                                                                const aiScore = aiInfo?.ai_score ?? 0;
                                                                const isGood = aiScore >= 6;
                                                                return (
                                                                    <div key={q.id} className={`px-3 py-2.5 rounded-xl text-xs border ${isGood ? 'border-[#00a859]/30 bg-[#00a859]/5' : 'border-red-200 bg-red-50 dark:bg-red-900/10'}`}>
                                                                        <div className="flex items-center gap-2 mb-1.5">
                                                                            <span className="font-bold text-[#999]">Q{i + 1}.</span>
                                                                            <span className="text-[#0d0d0d] dark:text-[#ccc] flex-1">{q.question_text}</span>
                                                                            <span className={`font-bold text-sm flex-shrink-0 ${isGood ? 'text-[#00a859]' : 'text-red-500'}`}>{aiScore}/10</span>
                                                                        </div>
                                                                        <p className="text-[#444] dark:text-[#bbb] italic ml-5">&quot;{userAns || 'No answer'}&quot;</p>
                                                                        {aiInfo?.feedback && <p className="text-[#666] dark:text-[#aaa] ml-5 mt-1"><span className="font-semibold">AI:</span> {aiInfo.feedback}</p>}
                                                                    </div>
                                                                );
                                                            }
                                                            const isCorrect = userAns === q.correct_option;
                                                            return (
                                                                <div key={q.id} className={`flex items-start gap-2 px-3 py-2 rounded-lg text-xs ${isCorrect ? 'bg-[#00a859]/5 text-[#00a859]' : 'bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400'}`}>
                                                                    <span className={`font-bold flex-shrink-0 ${isCorrect ? 'text-[#00a859]' : 'text-red-500'}`}>{isCorrect ? '✓' : '✗'}</span>
                                                                    <span className="flex-1 text-[#0d0d0d] dark:text-[#ccc]"><span className="text-[#999] mr-1">Q{i + 1}.</span>{q.question_text}</span>
                                                                    <span className="flex-shrink-0 font-semibold">
                                                                        {userAns ? `${userAns.toUpperCase()} — ${q[`option_${userAns}` as keyof Question] as string}` : 'No answer'}
                                                                    </span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )
            )}

            {/* Add/Edit modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e5e5e5] dark:border-[#333] sticky top-0 bg-white dark:bg-[#1a1a1a]">
                            <h2 className="font-semibold text-[#0d0d0d] dark:text-[#ececec]">{editing ? 'Edit Question' : 'Add Question'}</h2>
                            <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-[#f4f4f4] dark:hover:bg-[#2a2a2a]"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            {/* Question type toggle */}
                            <div>
                                <label className="text-xs font-medium text-[#555] dark:text-[#aaa] mb-2 block">Question Type</label>
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => setForm(f => ({ ...f, question_type: 'mcq' }))}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-colors ${form.question_type === 'mcq' ? 'bg-[#00a859] text-white' : 'bg-[#f4f4f4] dark:bg-[#2a2a2a] text-[#555] dark:text-[#aaa]'}`}>
                                        <Check className="w-3.5 h-3.5" /> MCQ
                                    </button>
                                    <button type="button" onClick={() => setForm(f => ({ ...f, question_type: 'text' }))}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-colors ${form.question_type === 'text' ? 'bg-blue-500 text-white' : 'bg-[#f4f4f4] dark:bg-[#2a2a2a] text-[#555] dark:text-[#aaa]'}`}>
                                        <FileText className="w-3.5 h-3.5" /> Text (AI Graded)
                                    </button>
                                </div>
                            </div>

                            {/* Question text */}
                            <div>
                                <label className="text-xs font-medium text-[#555] dark:text-[#aaa] mb-1 block">Question</label>
                                <textarea rows={2} value={form.question_text} onChange={e => setForm(f => ({ ...f, question_text: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-xl border border-[#e5e5e5] dark:border-[#333] bg-[#f9f9f9] dark:bg-[#111] text-sm text-[#0d0d0d] dark:text-[#ececec] outline-none resize-none"
                                    placeholder="Enter question text..." />
                            </div>

                            {/* MCQ options */}
                            {form.question_type === 'mcq' && (
                                <>
                                    {(['a', 'b', 'c', 'd'] as const).map(opt => (
                                        <div key={opt}>
                                            <label className="text-xs font-medium text-[#555] dark:text-[#aaa] mb-1 block">Option {opt.toUpperCase()}</label>
                                            <input value={form[`option_${opt}` as keyof FormState] as string}
                                                onChange={e => setForm(f => ({ ...f, [`option_${opt}`]: e.target.value }))}
                                                className="w-full px-3 py-2 rounded-xl border border-[#e5e5e5] dark:border-[#333] bg-[#f9f9f9] dark:bg-[#111] text-sm text-[#0d0d0d] dark:text-[#ececec] outline-none"
                                                placeholder={`Option ${opt.toUpperCase()}`} />
                                        </div>
                                    ))}
                                    <div>
                                        <label className="text-xs font-medium text-[#555] dark:text-[#aaa] mb-1 block">Correct Answer</label>
                                        <div className="flex gap-2">
                                            {(['a', 'b', 'c', 'd'] as CorrectOption[]).map(opt => (
                                                <button key={opt} type="button" onClick={() => setForm(f => ({ ...f, correct_option: opt }))}
                                                    className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${form.correct_option === opt ? 'bg-[#00a859] text-white' : 'bg-[#f4f4f4] dark:bg-[#2a2a2a] text-[#555] dark:text-[#aaa] hover:bg-[#e5e5e5] dark:hover:bg-[#333]'}`}>
                                                    {opt.toUpperCase()}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Text question expected answer */}
                            {form.question_type === 'text' && (
                                <div>
                                    <label className="text-xs font-medium text-[#555] dark:text-[#aaa] mb-1 block">
                                        Expected Answer <span className="text-blue-500">(AI uses this to grade student responses)</span>
                                    </label>
                                    <textarea rows={4} value={form.expected_answer} onChange={e => setForm(f => ({ ...f, expected_answer: e.target.value }))}
                                        className="w-full px-3 py-2 rounded-xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-900/10 text-sm text-[#0d0d0d] dark:text-[#ececec] outline-none resize-none"
                                        placeholder="Enter the ideal/expected answer. The AI will compare student answers to this and give a score 0-10..." />
                                </div>
                            )}

                            {formError && <p className="text-xs text-red-500">{formError}</p>}
                        </div>
                        <div className="px-5 pb-5 flex justify-end gap-2">
                            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-sm text-[#555] hover:bg-[#f4f4f4] dark:hover:bg-[#2a2a2a] transition-colors">Cancel</button>
                            <button onClick={save} disabled={saving}
                                className="px-4 py-2 rounded-xl text-sm bg-[#00a859] text-white font-medium hover:bg-[#009048] disabled:opacity-60 transition-colors flex items-center gap-2">
                                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                {editing ? 'Save Changes' : 'Add Question'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete confirm */}
            {deleteId !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center">
                        <p className="font-semibold text-[#0d0d0d] dark:text-[#ececec] mb-1">Delete this question?</p>
                        <p className="text-sm text-[#666] dark:text-[#aaa] mb-5">This action cannot be undone.</p>
                        <div className="flex justify-center gap-3">
                            <button onClick={() => setDeleteId(null)} className="px-4 py-2 rounded-xl text-sm text-[#555] hover:bg-[#f4f4f4] dark:hover:bg-[#2a2a2a] transition-colors">Cancel</button>
                            <button onClick={() => remove(deleteId)} className="px-4 py-2 rounded-xl text-sm bg-red-500 text-white font-medium hover:bg-red-600 transition-colors">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
