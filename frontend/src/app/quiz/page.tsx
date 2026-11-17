'use client';

import { useEffect, useState } from 'react';
import { ChevronRight, ChevronLeft, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

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

interface InfoForm {
    name: string;
    personal_email: string;
    designation: string;
    posting: string;
    years_experience: string;
    contact_no: string;
}

type Stage = 'info' | 'quiz' | 'result';

const HEADER_COLOR = '#1a73e8';

export default function QuizPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    const [questions, setQuestions] = useState<Question[]>([]);
    const [loadingQ, setLoadingQ] = useState(true);
    const [stage, setStage] = useState<Stage>('info');
    const [current, setCurrent] = useState(0);
    const [answers, setAnswers] = useState<{ [id: number]: string }>({});
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<{ score: number; total: number; breakdown: Breakdown } | null>(null);
    const [fetchError, setFetchError] = useState('');

    const [info, setInfo] = useState<InfoForm>({
        name: '', personal_email: '', designation: '', posting: '', years_experience: '', contact_no: ''
    });
    const [infoError, setInfoError] = useState('');

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login?redirect=/quiz');
        }
    }, [authLoading, user, router]);

    useEffect(() => {
        if (!user) return;
        // Pre-fill name from account
        setInfo(i => ({ ...i, name: user.name || '', personal_email: user.email || '' }));
        fetch(`${API}/api/quiz/questions`, { headers: { Authorization: `Bearer ${api.getToken()}` } })
            .then(r => r.json())
            .then(d => { setQuestions(d.questions || []); setLoadingQ(false); })
            .catch(() => { setFetchError('Failed to load quiz.'); setLoadingQ(false); });
    }, [user]);

    if (authLoading || (!user && !authLoading)) {
        return <div className="min-h-screen flex items-center justify-center bg-[#f0ebf8]"><Loader2 className="w-8 h-8 animate-spin text-[#673ab7]" /></div>;
    }

    const q = questions[current];
    const total = questions.length;

    const submitInfo = () => {
        if (!info.name.trim() || !info.personal_email.trim() || !info.designation.trim() || !info.posting.trim() || !info.contact_no.trim()) {
            setInfoError('Please fill all required fields.'); return;
        }
        setInfoError('');
        setStage('quiz');
    };

    const select = (opt: string) => setAnswers(a => ({ ...a, [q.id]: opt }));

    const submitQuiz = async () => {
        setSubmitting(true);
        const res = await fetch(`${API}/api/quiz/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${api.getToken()}` },
            body: JSON.stringify({ answers, ...info }),
        });
        setSubmitting(false);
        if (res.ok) { setResult(await res.json()); setStage('result'); }
        else { setFetchError('Failed to submit. Please try again.'); }
    };

    const restart = () => { setAnswers({}); setCurrent(0); setResult(null); setStage('info'); };

    const optionKey = (opt: string) => `option_${opt}` as keyof Question;

    // ── Info page ──────────────────────────────────────────────────────────────
    if (stage === 'info') {
        return (
            <div className="min-h-screen bg-[#f0ebf8] py-8 px-4">
                <div className="max-w-[640px] mx-auto space-y-4">
                    {/* Title card */}
                    <div className="rounded-2xl overflow-hidden shadow-sm">
                        <div className="h-2.5 bg-[#673ab7]" />
                        <div className="bg-white px-6 py-5 border border-t-0 border-[#e0e0e0] rounded-b-2xl">
                            <h1 className="text-2xl font-normal text-[#202124]">Workshop on Generative AI &amp; Its Applications in the Legal and Judicial Domains</h1>
                            <p className="mt-2 text-sm text-[#444746]">Final Quiz</p>
                            <p className="mt-3 text-xs text-red-600 flex items-center gap-1">* Indicates required question</p>
                        </div>
                    </div>

                    {/* Info form card */}
                    <div className="bg-white rounded-2xl border border-[#e0e0e0] shadow-sm px-6 py-5 space-y-5">
                        {[
                            { key: 'name', label: 'Name', required: true, placeholder: 'Your answer' },
                            { key: 'personal_email', label: 'Personal Email', required: true, placeholder: 'Your answer' },
                            { key: 'designation', label: 'Designation', required: true, placeholder: 'Your answer' },
                            { key: 'posting', label: 'Posting', required: true, placeholder: 'Your answer' },
                            { key: 'years_experience', label: 'Years of Experience', required: false, placeholder: 'Your answer' },
                            { key: 'contact_no', label: 'Contact no.', required: true, placeholder: 'Your answer' },
                        ].map(field => (
                            <div key={field.key}>
                                <label className="text-sm text-[#202124] font-medium">
                                    {field.label} {field.required && <span className="text-red-600">*</span>}
                                </label>
                                <input
                                    type="text"
                                    value={info[field.key as keyof InfoForm]}
                                    onChange={e => setInfo(i => ({ ...i, [field.key]: e.target.value }))}
                                    placeholder={field.placeholder}
                                    className="mt-1 w-full border-b border-[#b0b0b0] focus:border-[#673ab7] outline-none py-1.5 text-sm text-[#202124] bg-transparent transition-colors"
                                />
                            </div>
                        ))}
                        {infoError && <p className="text-xs text-red-600">{infoError}</p>}
                    </div>

                    {/* Next button */}
                    <div className="flex justify-between items-center">
                        <button onClick={submitInfo} className="px-6 py-2.5 bg-[#673ab7] text-white rounded-md text-sm font-medium hover:bg-[#5c2fa0] transition-colors">
                            Next
                        </button>
                        <button onClick={restart} className="text-sm text-[#673ab7] hover:underline">Clear form</button>
                    </div>
                    <p className="text-xs text-[#70757a] pb-4">Never submit passwords through this form.</p>
                </div>
            </div>
        );
    }

    // ── Result page ────────────────────────────────────────────────────────────
    if (stage === 'result' && result) {
        const pct = Math.round((result.score / result.total) * 100);
        return (
            <div className="min-h-screen bg-[#f0ebf8] py-8 px-4">
                <div className="max-w-[640px] mx-auto space-y-4">
                    {/* Score card */}
                    <div className="rounded-2xl overflow-hidden shadow-sm">
                        <div className="h-2.5 bg-[#673ab7]" />
                        <div className="bg-white px-6 py-6 border border-t-0 border-[#e0e0e0] rounded-b-2xl text-center">
                            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl font-bold ${pct >= 70 ? 'bg-green-50 text-green-600' : pct >= 40 ? 'bg-yellow-50 text-yellow-600' : 'bg-red-50 text-red-500'}`}>
                                {pct}%
                            </div>
                            <h2 className="text-xl font-normal text-[#202124]">
                                {pct >= 70 ? 'Excellent Result!' : pct >= 40 ? 'Good Effort!' : 'Keep Practicing!'}
                            </h2>
                            <p className="text-sm text-[#444746] mt-1">You scored <strong>{result.score}</strong> out of <strong>{result.total}</strong></p>
                            <button onClick={restart} className="mt-4 px-6 py-2 bg-[#673ab7] text-white rounded-md text-sm font-medium hover:bg-[#5c2fa0] transition-colors">
                                Submit another response
                            </button>
                        </div>
                    </div>

                    {/* Per-question breakdown */}
                    {questions.map((q, i) => {
                        const info = result.breakdown[q.id];
                        if (!info) return null;
                        return (
                            <div key={q.id} className={`bg-white rounded-2xl border shadow-sm px-6 py-5 ${info.correct ? 'border-green-300' : 'border-red-300'}`}>
                                <div className="flex items-start gap-2 mb-3">
                                    {info.correct ? <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" /> : <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />}
                                    <p className="text-sm font-medium text-[#202124]"><span className="text-[#70757a] mr-1">{i + 1}.</span>{q.question_text}</p>
                                </div>
                                <div className="space-y-1.5 ml-7">
                                    {(['a', 'b', 'c', 'd'] as const).map(opt => {
                                        const isCorrect = opt === info.correct_option;
                                        const isWrong = opt === info.user_answer && !isCorrect;
                                        return (
                                            <div key={opt} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${isCorrect ? 'bg-green-50 text-green-700 font-medium' : isWrong ? 'bg-red-50 text-red-600' : 'text-[#444746]'}`}>
                                                <span className="w-5 font-semibold">{opt.toUpperCase()}.</span>
                                                <span>{q[optionKey(opt)] as string}</span>
                                                {isCorrect && <span className="ml-auto text-xs font-semibold text-green-600">✓ Correct answer</span>}
                                                {isWrong && <span className="ml-auto text-xs font-semibold text-red-500">✗ Your answer</span>}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // ── Quiz page ──────────────────────────────────────────────────────────────
    if (loadingQ) return <div className="min-h-screen flex items-center justify-center bg-[#f0ebf8]"><Loader2 className="w-8 h-8 animate-spin text-[#673ab7]" /></div>;
    if (fetchError) return <div className="min-h-screen flex items-center justify-center bg-[#f0ebf8]"><p className="text-red-500">{fetchError}</p></div>;
    if (questions.length === 0) return <div className="min-h-screen flex items-center justify-center bg-[#f0ebf8]"><p className="text-[#70757a]">No questions available yet.</p></div>;

    return (
        <div className="min-h-screen bg-[#f0ebf8] py-8 px-4">
            <div className="max-w-[640px] mx-auto space-y-4">
                {/* Progress */}
                <div className="bg-white rounded-2xl border border-[#e0e0e0] shadow-sm px-6 py-3 flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-[#e0e0e0] rounded-full overflow-hidden">
                        <div className="h-full bg-[#673ab7] rounded-full transition-all duration-300" style={{ width: `${((current + 1) / total) * 100}%` }} />
                    </div>
                    <span className="text-xs text-[#70757a] flex-shrink-0">{current + 1} / {total}</span>
                </div>

                {/* Question card */}
                <div className="bg-white rounded-2xl border border-[#e0e0e0] shadow-sm px-6 py-5">
                    <p className="text-sm font-medium text-[#202124] mb-4">
                        <span className="text-[#70757a] mr-1.5">{current + 1}.</span>{q.question_text}
                        <span className="text-red-600 ml-1">*</span>
                    </p>
                    <div className="space-y-2">
                        {(['a', 'b', 'c', 'd'] as const).map(opt => {
                            const selected = answers[q.id] === opt;
                            return (
                                <label key={opt} className={`flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-colors border ${selected ? 'border-[#673ab7] bg-[#f3eefb]' : 'border-transparent hover:bg-[#f8f9fa]'}`}>
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${selected ? 'border-[#673ab7]' : 'border-[#aaa]'}`}>
                                        {selected && <div className="w-2.5 h-2.5 rounded-full bg-[#673ab7]" />}
                                    </div>
                                    <span className="text-sm text-[#202124]">{q[optionKey(opt)] as string}</span>
                                </label>
                            );
                        })}
                    </div>
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between pb-4">
                    <div className="flex gap-2">
                        {current > 0 && (
                            <button onClick={() => setCurrent(c => c - 1)} className="flex items-center gap-1 px-4 py-2 rounded-md text-sm text-[#673ab7] hover:bg-[#e8def8] transition-colors font-medium">
                                <ChevronLeft className="w-4 h-4" /> Back
                            </button>
                        )}
                        {current < total - 1 ? (
                            <button onClick={() => setCurrent(c => c + 1)} className="flex items-center gap-1 px-5 py-2 bg-[#673ab7] text-white rounded-md text-sm font-medium hover:bg-[#5c2fa0] transition-colors">
                                Next <ChevronRight className="w-4 h-4" />
                            </button>
                        ) : (
                            <button onClick={submitQuiz} disabled={submitting || Object.keys(answers).length < total}
                                className="flex items-center gap-2 px-5 py-2 bg-[#673ab7] text-white rounded-md text-sm font-medium hover:bg-[#5c2fa0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                Submit
                            </button>
                        )}
                    </div>
                    <button onClick={restart} className="text-sm text-[#673ab7] hover:underline">Clear form</button>
                </div>

                {current === total - 1 && Object.keys(answers).length < total && (
                    <p className="text-xs text-[#70757a] text-center -mt-2 pb-2">{total - Object.keys(answers).length} question(s) unanswered</p>
                )}
            </div>
        </div>
    );
}
