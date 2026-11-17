'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

const API = process.env.NEXT_PUBLIC_API_URL || '';

interface Question {
    id: number;
    question_text: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
}

interface Breakdown {
    [qid: number]: { correct: boolean; correct_option: string; user_answer: string };
}

export default function QuizPage() {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [current, setCurrent] = useState(0);
    const [answers, setAnswers] = useState<{ [id: number]: string }>({});
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<{ score: number; total: number; breakdown: Breakdown } | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        fetch(`${API}/api/quiz/questions`, { headers: { Authorization: `Bearer ${api.getToken()}` } })
            .then(r => r.json())
            .then(d => { setQuestions(d.questions || []); setLoading(false); })
            .catch(() => { setError('Failed to load quiz.'); setLoading(false); });
    }, []);

    const q = questions[current];
    const total = questions.length;
    const answered = Object.keys(answers).length;
    const progress = total ? Math.round((current / total) * 100) : 0;

    const select = (opt: string) => {
        setAnswers(a => ({ ...a, [q.id]: opt }));
    };

    const submit = async () => {
        setSubmitting(true);
        const res = await fetch(`${API}/api/quiz/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${api.getToken()}` },
            body: JSON.stringify({ answers }),
        });
        setSubmitting(false);
        if (res.ok) { setResult(await res.json()); } else { setError('Failed to submit. Please try again.'); }
    };

    const restart = () => { setAnswers({}); setCurrent(0); setResult(null); };

    const optionLabel = (opt: string) => opt.toUpperCase();
    const optionText = (q: Question, opt: string) => q[`option_${opt}` as keyof Question] as string;

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-[#f9f9f9] dark:bg-[#111]">
            <Loader2 className="w-8 h-8 animate-spin text-[#00a859]" />
        </div>
    );

    if (error) return (
        <div className="min-h-screen flex items-center justify-center bg-[#f9f9f9] dark:bg-[#111]">
            <p className="text-red-500">{error}</p>
        </div>
    );

    if (questions.length === 0) return (
        <div className="min-h-screen flex items-center justify-center bg-[#f9f9f9] dark:bg-[#111]">
            <p className="text-[#666] dark:text-[#aaa]">No questions available yet.</p>
        </div>
    );

    // Result screen
    if (result) {
        const pct = Math.round((result.score / result.total) * 100);
        return (
            <div className="min-h-screen bg-[#f9f9f9] dark:bg-[#111] py-8 px-4">
                <div className="max-w-2xl mx-auto">
                    {/* Score card */}
                    <div className="bg-white dark:bg-[#1a1a1a] rounded-3xl shadow-sm border border-[#e5e5e5] dark:border-[#333] p-8 text-center mb-6">
                        <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-black ${pct >= 70 ? 'bg-[#00a859]/10 text-[#00a859]' : pct >= 40 ? 'bg-yellow-50 text-yellow-600' : 'bg-red-50 text-red-500'}`}>
                            {pct}%
                        </div>
                        <h2 className="text-2xl font-bold text-[#0d0d0d] dark:text-[#ececec]">
                            {pct >= 70 ? 'Excellent!' : pct >= 40 ? 'Good Effort!' : 'Keep Practicing!'}
                        </h2>
                        <p className="text-[#666] dark:text-[#aaa] mt-1">You scored <strong>{result.score}</strong> out of <strong>{result.total}</strong></p>
                        <button onClick={restart} className="mt-5 px-6 py-2.5 bg-[#00a859] text-white rounded-xl text-sm font-medium hover:bg-[#009048] transition-colors">
                            Try Again
                        </button>
                    </div>

                    {/* Per-question breakdown */}
                    <div className="space-y-3">
                        {questions.map((q, i) => {
                            const info = result.breakdown[q.id];
                            if (!info) return null;
                            return (
                                <div key={q.id} className={`bg-white dark:bg-[#1a1a1a] rounded-2xl border p-4 ${info.correct ? 'border-[#00a859]/30' : 'border-red-300/50 dark:border-red-800/40'}`}>
                                    <div className="flex items-start gap-3">
                                        {info.correct
                                            ? <CheckCircle className="w-5 h-5 text-[#00a859] flex-shrink-0 mt-0.5" />
                                            : <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                        }
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-[#0d0d0d] dark:text-[#ececec]">
                                                <span className="text-[#999] mr-1.5">Q{i + 1}.</span>{q.question_text}
                                            </p>
                                            <div className="mt-2 space-y-1.5">
                                                {(['a', 'b', 'c', 'd'] as const).map(opt => {
                                                    const isCorrect = opt === info.correct_option;
                                                    const isUser = opt === info.user_answer;
                                                    const isWrong = isUser && !isCorrect;
                                                    return (
                                                        <div key={opt} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${isCorrect ? 'bg-[#00a859]/10 text-[#00a859] font-medium' : isWrong ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' : 'text-[#666] dark:text-[#999]'}`}>
                                                            <span className="font-semibold w-4">{optionLabel(opt)}.</span>
                                                            <span>{optionText(q, opt)}</span>
                                                            {isCorrect && <span className="ml-auto text-[10px] font-semibold">✓ Correct</span>}
                                                            {isWrong && <span className="ml-auto text-[10px] font-semibold">✗ Your answer</span>}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    // Quiz screen
    return (
        <div className="min-h-screen bg-[#f9f9f9] dark:bg-[#111] py-8 px-4">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <h1 className="text-lg font-bold text-[#0d0d0d] dark:text-[#ececec]">JudicialGPT Quiz</h1>
                        <span className="text-sm text-[#666] dark:text-[#aaa]">{current + 1} / {total}</span>
                    </div>
                    {/* Progress bar */}
                    <div className="h-1.5 bg-[#e5e5e5] dark:bg-[#333] rounded-full overflow-hidden">
                        <div className="h-full bg-[#00a859] rounded-full transition-all duration-300" style={{ width: `${((current + 1) / total) * 100}%` }} />
                    </div>
                </div>

                {/* Question card */}
                <div className="bg-white dark:bg-[#1a1a1a] rounded-3xl shadow-sm border border-[#e5e5e5] dark:border-[#333] p-6 mb-4">
                    <p className="text-base font-semibold text-[#0d0d0d] dark:text-[#ececec] leading-relaxed mb-5">
                        <span className="text-[#00a859] mr-2 font-bold">Q{current + 1}.</span>{q.question_text}
                    </p>
                    <div className="space-y-2.5">
                        {(['a', 'b', 'c', 'd'] as const).map(opt => {
                            const selected = answers[q.id] === opt;
                            return (
                                <button key={opt} type="button" onClick={() => select(opt)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-left transition-all border ${selected
                                        ? 'border-[#00a859] bg-[#00a859]/5 text-[#00a859] font-medium'
                                        : 'border-[#e5e5e5] dark:border-[#333] text-[#333] dark:text-[#ccc] hover:border-[#00a859]/50 hover:bg-[#00a859]/5'
                                    }`}>
                                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${selected ? 'bg-[#00a859] text-white' : 'bg-[#f4f4f4] dark:bg-[#2a2a2a] text-[#555] dark:text-[#aaa]'}`}>
                                        {optionLabel(opt)}
                                    </span>
                                    {optionText(q, opt)}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between">
                    <button onClick={() => setCurrent(c => c - 1)} disabled={current === 0}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm text-[#555] dark:text-[#aaa] hover:bg-white dark:hover:bg-[#1a1a1a] border border-transparent hover:border-[#e5e5e5] dark:hover:border-[#333] disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                        <ChevronLeft className="w-4 h-4" /> Previous
                    </button>

                    {current < total - 1 ? (
                        <button onClick={() => setCurrent(c => c + 1)}
                            className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm bg-[#0d0d0d] dark:bg-[#ececec] text-white dark:text-[#0d0d0d] font-medium hover:opacity-80 transition-opacity">
                            Next <ChevronRight className="w-4 h-4" />
                        </button>
                    ) : (
                        <button onClick={submit} disabled={submitting || answered < total}
                            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm bg-[#00a859] text-white font-medium hover:bg-[#009048] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                            Submit Quiz
                        </button>
                    )}
                </div>

                {/* Unanswered warning on last question */}
                {current === total - 1 && answered < total && (
                    <p className="text-center text-xs text-[#999] mt-3">{total - answered} question{total - answered > 1 ? 's' : ''} unanswered — please answer all before submitting.</p>
                )}
            </div>
        </div>
    );
}
