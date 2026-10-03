'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { MessageSquare, Eye, Clock, Loader2, ArrowRight, Scale, Link2, Check, CalendarDays } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';
import { isJudgmentDocument, renderJudgmentText } from '@/lib/judgmentText';

interface Message {
    id: string;
    role: string;
    content: string;
    responseTime?: number;
    createdAt: string;
}

interface SharedChatData {
    title: string;
    model: string;
    messages: Message[];
    viewCount: number;
    createdAt: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/** Removes the "Answer:" prefix some agents put in front of replies. */
const cleanAnswer = (content: string) => content.replace(/^Answer:?\s*/i, '');

const formatDate = (value?: string) => {
    const date = value ? new Date(value) : null;
    return date && !isNaN(date.getTime())
        ? date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
        : null;
};

/** The JudicialGPT logo used across the website header. */
function BrandMark({ size = 'md' }: { size?: 'sm' | 'md' }) {
    const box = size === 'sm' ? 'w-7 h-7 rounded-lg' : 'w-9 h-9 rounded-[10px]';
    const icon = size === 'sm' ? 'w-3.5 h-3.5' : 'w-[18px] h-[18px]';
    return (
        <div className={`${box} bg-[#0c7a4b] flex items-center justify-center text-white shadow-sm shrink-0`}>
            <Scale className={`${icon} stroke-[2.2]`} />
        </div>
    );
}

function Brand() {
    return (
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <BrandMark />
            <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                Judicial<span className="text-[#0c7a4b]">GPT</span>
            </span>
        </Link>
    );
}

export default function SharedChatPage() {
    const params = useParams();
    const token = params?.token as string;

    const [data, setData] = useState<SharedChatData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!token) return;
        (async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/share/view/${token}`);
                if (!response.ok) {
                    setError(response.status === 404
                        ? 'This shared chat was not found or has been revoked.'
                        : 'Failed to load shared chat');
                    return;
                }
                setData(await response.json());
            } catch {
                setError('Failed to load shared chat');
            } finally {
                setIsLoading(false);
            }
        })();
    }, [token]);

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Clipboard unavailable (e.g. insecure context): nothing to do.
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#fafaf9] dark:bg-[#171717] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-[#0c7a4b]" />
                    <p className="text-slate-500 dark:text-slate-400">Loading shared chat…</p>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen bg-[#fafaf9] dark:bg-[#171717] flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                        <MessageSquare className="w-8 h-8 text-slate-400" />
                    </div>
                    <h1 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Chat not available</h1>
                    <p className="text-slate-600 dark:text-slate-400 mb-6">{error}</p>
                    <Link
                        href="/chat"
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0c7a4b] text-white rounded-xl hover:bg-[#0a6840] transition-colors font-medium"
                    >
                        Try JudicialGPT <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>
        );
    }

    const sharedOn = formatDate(data.createdAt);

    return (
        <div className="min-h-screen bg-[#fafaf9] dark:bg-[#171717] flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-20 bg-white/85 dark:bg-[#171717]/85 backdrop-blur border-b border-slate-200/80 dark:border-white/10">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
                    <Brand />
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={copyLink}
                            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                        >
                            {copied ? <Check className="w-4 h-4 text-[#0c7a4b]" /> : <Link2 className="w-4 h-4" />}
                            {copied ? 'Copied' : 'Copy link'}
                        </button>
                        <Link
                            href="/chat"
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0c7a4b] text-white text-sm font-semibold rounded-xl hover:bg-[#0a6840] transition-colors shadow-sm"
                        >
                            Try JudicialGPT <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </header>

            <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
                {/* Title */}
                <div className="mb-8 pb-6 border-b border-slate-200 dark:border-white/10">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 mb-3 text-xs font-semibold text-[#0c7a4b] bg-[#0c7a4b]/10 rounded-full">
                        <MessageSquare className="w-3.5 h-3.5" /> Shared conversation
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                        {data.title || 'Shared conversation'}
                    </h1>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
                        {sharedOn && (
                            <span className="inline-flex items-center gap-1.5"><CalendarDays className="w-4 h-4" />{sharedOn}</span>
                        )}
                        <span className="inline-flex items-center gap-1.5">
                            <Eye className="w-4 h-4" />{data.viewCount} {data.viewCount === 1 ? 'view' : 'views'}
                        </span>
                    </div>
                </div>

                {/* Messages */}
                <div className="space-y-8">
                    {data.messages.map((message, index) => {
                        const isUser = message.role === 'user';
                        return (
                            <motion.div
                                key={message.id || index}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: Math.min(index * 0.04, 0.4) }}
                            >
                                {isUser ? (
                                    <div className="flex justify-end">
                                        <div className="max-w-[85%] bg-[#f0f0ee] dark:bg-[#2f2f2f] text-slate-900 dark:text-[#ececec] px-4 py-2.5 rounded-2xl rounded-tr-md text-base leading-7 whitespace-pre-wrap">
                                            {message.content}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex gap-3">
                                        <div className="pt-1"><BrandMark size="sm" /></div>
                                        <div className="min-w-0 flex-1">
                                            {isJudgmentDocument(message.content) ? (
                                                <div className="message-content font-serif text-slate-900 dark:text-[#ececec] bg-white dark:bg-[#1f1f1f] border border-slate-200 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-sm">
                                                    {renderJudgmentText(cleanAnswer(message.content))}
                                                </div>
                                            ) : (
                                                <div className="message-content text-slate-900 dark:text-[#ececec]">
                                                    <ReactMarkdown
                                                        remarkPlugins={[remarkGfm]}
                                                        components={{
                                                            table: ({ children, ...props }) => (
                                                                <div style={{ overflowX: 'auto', margin: '1rem 0' }}>
                                                                    <table {...props}>{children}</table>
                                                                </div>
                                                            ),
                                                            a: ({ children, ...props }) => (
                                                                <a {...props} target="_blank" rel="noopener noreferrer">{children}</a>
                                                            )
                                                        }}
                                                    >
                                                        {cleanAnswer(message.content)}
                                                    </ReactMarkdown>
                                                </div>
                                            )}
                                            {message.responseTime ? (
                                                <div className="flex items-center gap-1 mt-2 text-xs text-slate-400">
                                                    <Clock className="w-3 h-3" />
                                                    {(message.responseTime / 1000).toFixed(2)}s
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                </div>

                {/* CTA */}
                <div className="mt-14 relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c7a4b] to-[#075b38] p-8 sm:p-10 text-center text-white shadow-xl">
                    <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
                    <div className="relative">
                        <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-white/15 flex items-center justify-center">
                            <Scale className="w-6 h-6" />
                        </div>
                        <h2 className="text-xl sm:text-2xl font-bold mb-2">Do your own legal research with JudicialGPT</h2>
                        <p className="text-white/80 max-w-lg mx-auto mb-6">
                            Research case law, draft judgments, analyse documents and get answers to your legal questions.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                            <Link
                                href="/signup"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[#0c7a4b] rounded-xl font-semibold hover:bg-white/90 transition-colors"
                            >
                                Get started for free <ArrowRight className="w-4 h-4" />
                            </Link>
                            <Link
                                href="/login"
                                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white border border-white/30 hover:bg-white/10 transition-colors"
                            >
                                Sign in
                            </Link>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-slate-200 dark:border-white/10 py-6">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <span>© {new Date().getFullYear()} JudicialGPT. AI responses may contain mistakes.</span>
                    <div className="flex items-center gap-4">
                        <Link href="/privacy" className="hover:text-slate-900 dark:hover:text-white">Privacy</Link>
                        <Link href="/terms" className="hover:text-slate-900 dark:hover:text-white">Terms</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
