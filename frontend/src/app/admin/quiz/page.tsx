'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, Check, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

const API = process.env.NEXT_PUBLIC_API_URL || '';

interface Question {
    id: number;
    question_text: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_option: 'a' | 'b' | 'c' | 'd';
    question_order: number;
}

const emptyForm = { question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_option: 'a' as const };

export default function AdminQuizPage() {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<Question | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [error, setError] = useState('');

    const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${api.getToken()}` });

    const load = async () => {
        setLoading(true);
        const res = await fetch(`${API}/api/quiz/questions/admin`, { headers: headers() });
        const data = await res.json();
        setQuestions(data.questions || []);
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const openAdd = () => { setEditing(null); setForm(emptyForm); setError(''); setShowForm(true); };
    const openEdit = (q: Question) => { setEditing(q); setForm({ question_text: q.question_text, option_a: q.option_a, option_b: q.option_b, option_c: q.option_c, option_d: q.option_d, correct_option: q.correct_option }); setError(''); setShowForm(true); };

    const save = async () => {
        if (!form.question_text.trim() || !form.option_a.trim() || !form.option_b.trim() || !form.option_c.trim() || !form.option_d.trim()) {
            setError('All fields are required'); return;
        }
        setSaving(true); setError('');
        const url = editing ? `${API}/api/quiz/questions/${editing.id}` : `${API}/api/quiz/questions`;
        const method = editing ? 'PUT' : 'POST';
        const res = await fetch(url, { method, headers: headers(), body: JSON.stringify(form) });
        setSaving(false);
        if (res.ok) { setShowForm(false); load(); } else { const d = await res.json(); setError(d.message || 'Failed to save'); }
    };

    const remove = async (id: number) => {
        await fetch(`${API}/api/quiz/questions/${id}`, { method: 'DELETE', headers: headers() });
        setDeleteId(null);
        load();
    };

    const optionLabel = (key: string) => key.toUpperCase();

    return (
        <div className="p-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-[#0d0d0d] dark:text-[#ececec]">Quiz Questions</h1>
                    <p className="text-sm text-[#666666] dark:text-[#aaaaaa] mt-0.5">{questions.length} question{questions.length !== 1 ? 's' : ''} total</p>
                </div>
                <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-[#00a859] text-white rounded-xl text-sm font-medium hover:bg-[#009048] transition-colors">
                    <Plus className="w-4 h-4" /> Add Question
                </button>
            </div>

            {/* Questions list */}
            {loading ? (
                <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#00a859]" /></div>
            ) : questions.length === 0 ? (
                <div className="text-center py-16 text-[#999999]">No questions yet. Add your first MCQ.</div>
            ) : (
                <div className="space-y-3">
                    {questions.map((q, i) => (
                        <div key={q.id} className="bg-white dark:bg-[#1a1a1a] border border-[#e5e5e5] dark:border-[#333] rounded-2xl p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-[#0d0d0d] dark:text-[#ececec]">
                                        <span className="text-[#00a859] mr-2">Q{i + 1}.</span>{q.question_text}
                                    </p>
                                    <div className="mt-2 grid grid-cols-2 gap-1.5">
                                        {(['a', 'b', 'c', 'd'] as const).map(opt => (
                                            <div key={opt} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${q.correct_option === opt ? 'bg-[#00a859]/10 text-[#00a859] border border-[#00a859]/30 font-medium' : 'text-[#555] dark:text-[#aaa]'}`}>
                                                {q.correct_option === opt && <Check className="w-3 h-3 flex-shrink-0" />}
                                                <span className="font-semibold mr-1">{optionLabel(opt)}.</span> {q[`option_${opt}` as keyof Question] as string}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex gap-1 flex-shrink-0">
                                    <button onClick={() => openEdit(q)} className="p-2 rounded-lg text-[#666] hover:bg-[#f4f4f4] dark:hover:bg-[#2a2a2a] transition-colors"><Pencil className="w-4 h-4" /></button>
                                    <button onClick={() => setDeleteId(q.id)} className="p-2 rounded-lg text-[#666] hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add/Edit modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl w-full max-w-lg shadow-2xl">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e5e5e5] dark:border-[#333]">
                            <h2 className="font-semibold text-[#0d0d0d] dark:text-[#ececec]">{editing ? 'Edit Question' : 'Add Question'}</h2>
                            <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-[#f4f4f4] dark:hover:bg-[#2a2a2a]"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="p-5 space-y-3">
                            <div>
                                <label className="text-xs font-medium text-[#555] dark:text-[#aaa] mb-1 block">Question</label>
                                <textarea rows={2} value={form.question_text} onChange={e => setForm(f => ({ ...f, question_text: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-[#e5e5e5] dark:border-[#333] bg-[#f9f9f9] dark:bg-[#111] text-sm text-[#0d0d0d] dark:text-[#ececec] outline-none resize-none" placeholder="Enter question text..." />
                            </div>
                            {(['a', 'b', 'c', 'd'] as const).map(opt => (
                                <div key={opt}>
                                    <label className="text-xs font-medium text-[#555] dark:text-[#aaa] mb-1 block">Option {opt.toUpperCase()}</label>
                                    <input value={form[`option_${opt}` as keyof typeof form]} onChange={e => setForm(f => ({ ...f, [`option_${opt}`]: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-[#e5e5e5] dark:border-[#333] bg-[#f9f9f9] dark:bg-[#111] text-sm text-[#0d0d0d] dark:text-[#ececec] outline-none" placeholder={`Option ${opt.toUpperCase()}`} />
                                </div>
                            ))}
                            <div>
                                <label className="text-xs font-medium text-[#555] dark:text-[#aaa] mb-1 block">Correct Answer</label>
                                <div className="flex gap-2">
                                    {(['a', 'b', 'c', 'd'] as const).map(opt => (
                                        <button key={opt} type="button" onClick={() => setForm(f => ({ ...f, correct_option: opt }))} className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${form.correct_option === opt ? 'bg-[#00a859] text-white' : 'bg-[#f4f4f4] dark:bg-[#2a2a2a] text-[#555] dark:text-[#aaa] hover:bg-[#e5e5e5] dark:hover:bg-[#333]'}`}>
                                            {opt.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {error && <p className="text-xs text-red-500">{error}</p>}
                        </div>
                        <div className="px-5 pb-5 flex justify-end gap-2">
                            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-sm text-[#555] hover:bg-[#f4f4f4] dark:hover:bg-[#2a2a2a] transition-colors">Cancel</button>
                            <button onClick={save} disabled={saving} className="px-4 py-2 rounded-xl text-sm bg-[#00a859] text-white font-medium hover:bg-[#009048] disabled:opacity-60 transition-colors flex items-center gap-2">
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
