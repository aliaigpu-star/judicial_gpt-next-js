'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || '';

type QuestionType = 'mcq' | 'text';

interface Question {
    id: number;
    question_text: string;
    option_a: string | null;
    option_b: string | null;
    option_c: string | null;
    option_d: string | null;
    question_type: QuestionType;
}

interface BreakdownItem {
    correct: boolean;
    question_type: QuestionType;
    user_answer: string;
    correct_option?: string;
    ai_score?: number;
    ai_feedback?: string;
}

interface Breakdown {
    [qid: number]: BreakdownItem;
}

interface InfoForm {
    name: string;
    personal_email: string;
    designation: string;
    posting: string;
    years_experience: string;
    contact_no: string;
    batch: string;
}

type Stage = 'info' | 'quiz' | 'result';

export default function QuizPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    const [questions, setQuestions] = useState<Question[]>([]);
    const [loadingQ, setLoadingQ] = useState(true);
    const [stage, setStage] = useState<Stage>('info');
    const [answers, setAnswers] = useState<{ [id: number]: string }>({});
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<{ score: number; total: number; breakdown: Breakdown } | null>(null);
    const [fetchError, setFetchError] = useState('');

    const [info, setInfo] = useState<InfoForm>({
        name: '', personal_email: '', designation: '', posting: '', years_experience: '', contact_no: '', batch: ''
    });
    const [infoError, setInfoError] = useState('');

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login?redirect=/quiz');
        }
    }, [authLoading, user, router]);

    useEffect(() => {
        if (!user) return;
        setInfo(i => ({ ...i, name: user.name || '', personal_email: user.email || '' }));
        fetch(`${API}/api/quiz/questions`, { headers: { Authorization: `Bearer ${api.getToken()}` } })
            .then(async r => {
                const d = await r.json();
                if (!r.ok) throw new Error(d.message || 'Error loading quiz');
                setQuestions(d.questions || []);
                setLoadingQ(false);
            })
            .catch(() => { setFetchError('Failed to load quiz. Please refresh the page.'); setLoadingQ(false); });
    }, [user]);

    if (authLoading || (!user && !authLoading)) {
        return <div className="min-h-screen flex items-center justify-center bg-[#f0ebf8]"><Loader2 className="w-8 h-8 animate-spin text-[#673ab7]" /></div>;
    }

    const total = questions.length;
    const answeredCount = Object.values(answers).filter(v => v && v.trim()).length;

    const submitInfo = () => {
        if (!info.name.trim() || !info.personal_email.trim() || !info.designation.trim() || !info.posting.trim() || !info.contact_no.trim()) {
            setInfoError('Please fill all required fields.'); return;
        }
        if (fetchError) { setInfoError('Quiz failed to load. Please refresh the page.'); return; }
        if (!loadingQ && questions.length === 0) { setInfoError('No quiz questions available yet.'); return; }
        setInfoError('');
        setStage('quiz');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const setAnswer = (qid: number, value: string) => setAnswers(a => ({ ...a, [qid]: value }));

    const submitQuiz = async () => {
        setSubmitting(true);
        const res = await fetch(`${API}/api/quiz/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${api.getToken()}` },
            body: JSON.stringify({ answers, ...info }),
        });
        setSubmitting(false);
        if (res.ok) {
            setResult(await res.json());
            setStage('result');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            setFetchError('Failed to submit. Please try again.');
        }
    };

    const restart = () => { setAnswers({}); setResult(null); setStage('info'); window.scrollTo({ top: 0, behavior: 'smooth' }); };

    const optionKey = (opt: string) => `option_${opt}` as keyof Question;

    const headerCard = (subtitle?: string) => (
        <div className="rounded-2xl overflow-hidden shadow-sm">
            <div className="h-2.5 bg-[#673ab7]" />
            <div className="bg-white px-6 py-5 border border-t-0 border-[#e0e0e0] rounded-b-2xl">
                <h1 className="text-xl font-normal text-[#202124]">Workshop on Generative AI &amp; Its Applications in the Legal and Judicial Domains</h1>
                <p className="mt-1 text-sm text-[#444746]">{subtitle || 'Final Quiz'}</p>
            </div>
        </div>
    );

    // ── Info page ──────────────────────────────────────────────────────────────
    if (stage === 'info') {
        return (
            <div className="min-h-screen bg-[#f0ebf8] py-8 px-4">
                <div className="max-w-[640px] mx-auto space-y-4">
                    {headerCard('Please fill in your details before starting the quiz.')}

                    <div className="bg-white rounded-2xl border border-[#e0e0e0] shadow-sm px-6 py-5 space-y-5">
                        {[
                            { key: 'name', label: 'Name', required: true },
                            { key: 'personal_email', label: 'Personal Email', required: true },
                            { key: 'designation', label: 'Designation', required: true },
                            { key: 'posting', label: 'Posting', required: true },
                            { key: 'years_experience', label: 'Years of Experience', required: false },
                            { key: 'contact_no', label: 'Contact no.', required: true },
                            { key: 'batch', label: 'Batch No.', required: false },
                        ].map(field => (
                            <div key={field.key}>
                                <label className="text-sm text-[#202124] font-medium">
                                    {field.label} {field.required && <span className="text-red-600">*</span>}
                                </label>
                                <input
                                    type="text"
                                    value={info[field.key as keyof InfoForm]}
                                    onChange={e => setInfo(i => ({ ...i, [field.key]: e.target.value }))}
                                    placeholder="Your answer"
                                    className="mt-1 w-full border-b border-[#b0b0b0] focus:border-[#673ab7] outline-none py-1.5 text-sm text-[#202124] bg-transparent transition-colors"
                                />
                            </div>
                        ))}
                        {infoError && <p className="text-xs text-red-600">{infoError}</p>}
                        <p className="text-xs text-red-600">* Indicates required question</p>
                    </div>

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

                    {questions.map((q, i) => {
                        const bd = result.breakdown[q.id];
                        if (!bd) return null;
                        if (q.question_type === 'text') {
                            const aiScore = bd.ai_score ?? 0;
                            const isGood = aiScore >= 6;
                            const cleanFeedback = bd.ai_feedback?.replace(/^\[Debug\]\s*(Raw:|Error:)?\s*/i, '').trim() || '';
                            return (
                                <div key={q.id} className={`bg-white rounded-2xl border shadow-sm px-6 py-5 ${isGood ? 'border-green-300' : 'border-orange-200'}`}>
                                    <div className="flex items-start gap-2 mb-3">
                                        {isGood ? <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" /> : <XCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />}
                                        <p className="text-sm font-medium text-[#202124]"><span className="text-[#70757a] mr-1">{i + 1}.</span>{q.question_text}</p>
                                    </div>
                                    <div className="ml-7 space-y-2">
                                        <div className="bg-[#f8f9fa] rounded-lg px-3 py-2 text-sm text-[#444746] italic">&quot;{bd.user_answer || 'No answer'}&quot;</div>
                                        {cleanFeedback && (
                                            <div className="flex gap-2 text-sm">
                                                <span className="text-[#673ab7] font-semibold flex-shrink-0">AI Feedback:</span>
                                                <span className="text-[#444746]">{cleanFeedback}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        }
                        return (
                            <div key={q.id} className={`bg-white rounded-2xl border shadow-sm px-6 py-5 ${bd.correct ? 'border-green-300' : 'border-red-300'}`}>
                                <div className="flex items-start gap-2 mb-3">
                                    {bd.correct ? <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" /> : <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />}
                                    <p className="text-sm font-medium text-[#202124]"><span className="text-[#70757a] mr-1">{i + 1}.</span>{q.question_text}</p>
                                </div>
                                <div className="space-y-1.5 ml-7">
                                    {(['a', 'b', 'c', 'd'] as const).map(opt => {
                                        const isCorrect = opt === bd.correct_option;
                                        const isWrong = opt === bd.user_answer && !isCorrect;
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

    // ── Quiz page — all questions on one page ─────────────────────────────────
    if (loadingQ) return <div className="min-h-screen flex items-center justify-center bg-[#f0ebf8]"><Loader2 className="w-8 h-8 animate-spin text-[#673ab7]" /></div>;
    if (fetchError) return <div className="min-h-screen flex items-center justify-center bg-[#f0ebf8]"><p className="text-red-500">{fetchError}</p></div>;
    if (questions.length === 0) return <div className="min-h-screen flex items-center justify-center bg-[#f0ebf8]"><p className="text-[#70757a]">No questions available yet.</p></div>;

    return (
        <div className="min-h-screen bg-[#f0ebf8] py-8 px-4">
            <div className="max-w-[640px] mx-auto space-y-4">
                {headerCard('Final Quiz')}

                {/* Progress summary */}
                <div className="bg-white rounded-2xl border border-[#e0e0e0] shadow-sm px-6 py-3 flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-[#e0e0e0] rounded-full overflow-hidden">
                        <div className="h-full bg-[#673ab7] rounded-full transition-all duration-300" style={{ width: `${total > 0 ? (answeredCount / total) * 100 : 0}%` }} />
                    </div>
                    <span className="text-xs text-[#70757a] flex-shrink-0">{answeredCount} / {total} answered</span>
                </div>

                {/* All questions */}
                {questions.map((q, i) => (
                    <div key={q.id} className="bg-white rounded-2xl border border-[#e0e0e0] shadow-sm px-6 py-5">
                        <p className="text-sm font-medium text-[#202124] mb-4">
                            <span className="text-[#70757a] mr-1.5">{i + 1}.</span>{q.question_text}
                            <span className="text-red-600 ml-1">*</span>
                        </p>

                        {q.question_type === 'text' ? (
                            <textarea
                                rows={4}
                                value={answers[q.id] || ''}
                                onChange={e => setAnswer(q.id, e.target.value)}
                                placeholder="Write your answer here..."
                                className="w-full px-4 py-3 rounded-xl border border-[#e0e0e0] focus:border-[#673ab7] outline-none text-sm text-[#202124] bg-[#fafafa] resize-none transition-colors"
                            />
                        ) : (
                            <div className="space-y-2">
                                {(['a', 'b', 'c', 'd'] as const).map(opt => {
                                    const selected = answers[q.id] === opt;
                                    const optText = q[optionKey(opt)];
                                    if (!optText) return null;
                                    return (
                                        <div key={opt} onClick={() => setAnswer(q.id, opt)}
                                            className={`flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-colors border ${selected ? 'border-[#673ab7] bg-[#f3eefb]' : 'border-transparent hover:bg-[#f8f9fa]'}`}>
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${selected ? 'border-[#673ab7]' : 'border-[#aaa]'}`}>
                                                {selected && <div className="w-2.5 h-2.5 rounded-full bg-[#673ab7]" />}
                                            </div>
                                            <span className="text-sm text-[#202124]">{optText as string}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ))}

                {/* Bottom navigation */}
                <div className="flex items-center justify-between pb-4">
                    <div className="flex gap-2">
                        <button onClick={() => setStage('info')} className="px-4 py-2 rounded-md text-sm text-[#673ab7] hover:bg-[#e8def8] transition-colors font-medium">
                            ← Back
                        </button>
                        <button onClick={submitQuiz} disabled={submitting || answeredCount < total}
                            className="flex items-center gap-2 px-6 py-2 bg-[#673ab7] text-white rounded-md text-sm font-medium hover:bg-[#5c2fa0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                            {submitting ? 'Grading...' : 'Submit'}
                        </button>
                    </div>
                    <button onClick={restart} className="text-sm text-[#673ab7] hover:underline">Clear form</button>
                </div>

                {answeredCount < total && (
                    <p className="text-xs text-[#70757a] text-center -mt-2 pb-2">{total - answeredCount} question(s) unanswered</p>
                )}
            </div>
        </div>
    );
}
