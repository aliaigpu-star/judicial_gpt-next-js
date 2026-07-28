'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Loader2, BookOpen, CheckCircle2, XCircle, Clock,
    Copy, Check, ArrowUp, Scale, Gavel
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api } from '@/lib/api';
import { copyCleanText } from '@/lib/textUtils';
import { useChatLayout } from '@/app/chat/layout';

interface SourceDoc {
    file?: string;
    page?: string | number;
    snippet?: string;
}

interface HistoryItem {
    id: string;
    query: string;
    answer: string;
    sources: SourceDoc[];
    timestamp: Date;
}

export interface LawAgentChatProps {
    agentType: 'civil' | 'criminal';
    title: string;
    description: string;
    apiUrl: string;
    accentColor: string;
    suggestedQueries: string[];
    portHint: string;
}

export default function LawAgentChat({
    agentType,
    title,
    description,
    apiUrl,
    accentColor,
    suggestedQueries,
    portHint,
}: LawAgentChatProps) {
    const [query, setQuery] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [dbConversationId, setDbConversationId] = useState<string | null>(null);
    const [progress, setProgress] = useState('');

    const { setConversations } = useChatLayout();
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const resultsEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
            inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 150) + 'px';
        }
    }, [query]);

    useEffect(() => {
        if (history.length > 0) {
            resultsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [history]);

    const handleAsk = async () => {
        if (!query.trim() || isProcessing) return;

        const searchQuery = query.trim();
        setQuery('');
        setIsProcessing(true);
        setError(null);
        setProgress('Consulting legal knowledge base...');

        try {
            const response = await fetch(`${apiUrl}/query`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true',
                },
                body: JSON.stringify({
                    query: searchQuery,
                    session_id: sessionId || undefined,
                }),
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.detail || `Request failed (${response.status})`);
            }

            const data = await response.json();
            if (data.session_id) setSessionId(data.session_id);

            const item: HistoryItem = {
                id: `law_${Date.now()}`,
                query: searchQuery,
                answer: data.answer || '',
                sources: data.sources || [],
                timestamp: new Date(),
            };
            setHistory(prev => [...prev, item]);

            try {
                let convId = dbConversationId;
                if (!convId) {
                    const title = `${agentType === 'civil' ? 'Civil' : 'Criminal'} Law: ${searchQuery.slice(0, 40)}`;
                    const { conversation } = await api.createConversation(title);
                    convId = conversation.id;
                    setDbConversationId(convId);
                    setConversations(prev => [{ ...conversation, messages: [] }, ...prev]);
                }
                await api.createMessage(convId!, 'user', searchQuery);
                await api.createMessage(convId!, 'assistant', data.answer || '');
            } catch {
                // Non-blocking if backend conversation save fails
            }
        } catch (err: any) {
            setError(
                err.message?.includes('Failed to fetch')
                    ? `Cannot connect to the ${title} agent. Make sure it is running on port ${portHint}.`
                    : err.message || 'Something went wrong'
            );
        } finally {
            setIsProcessing(false);
            setProgress('');
        }
    };

    const handleCopy = async (id: string, text: string) => {
        const success = await copyCleanText(text);
        if (success) {
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
        }
    };

    const Icon = agentType === 'civil' ? Scale : Gavel;

    const inputForm = (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                handleAsk();
            }}
            className="w-full"
        >
            <div className="relative flex items-end gap-2 bg-[#f4f4f4] dark:bg-[#2f2f2f] rounded-3xl px-4 py-3 border border-transparent focus-within:border-[#e5e5e5] dark:focus-within:border-[#424242] transition-colors">
                <textarea
                    ref={inputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleAsk();
                        }
                    }}
                    placeholder={`Ask ${title}...`}
                    rows={1}
                    className="flex-1 bg-transparent resize-none outline-none text-[#0d0d0d] dark:text-[#ececec] text-base max-h-[150px] py-1"
                    disabled={isProcessing}
                />
                <button
                    type="submit"
                    disabled={!query.trim() || isProcessing}
                    className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all disabled:opacity-40"
                    style={{ backgroundColor: query.trim() && !isProcessing ? accentColor : '#d1d5db' }}
                >
                    {isProcessing ? (
                        <Loader2 className="w-4 h-4 text-white animate-spin" />
                    ) : (
                        <ArrowUp className="w-4 h-4 text-white" />
                    )}
                </button>
            </div>

            <AnimatePresence>
                {(error || progress) && (
                    <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className={`mt-3 px-4 py-3 rounded-xl flex items-start gap-2 ${
                            error
                                ? 'bg-red-500/10 border border-red-500/20'
                                : 'bg-gray-100 dark:bg-[#2f2f2f]'
                        }`}
                    >
                        {error ? (
                            <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                        ) : (
                            <Loader2 className="w-4 h-4 mt-0.5 flex-shrink-0 animate-spin" style={{ color: accentColor }} />
                        )}
                        <span className={`text-sm ${error ? 'text-red-600 dark:text-red-400' : 'text-[#666666] dark:text-[#b4b4b4]'}`}>
                            {error || progress}
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>
        </form>
    );

    const emptyState = (
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 w-full max-w-3xl mx-auto my-auto">
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center w-full mb-8"
            >
                <div className="flex justify-center mb-4">
                    <div
                        className="w-12 h-12 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: `${accentColor}1a` }}
                    >
                        <Icon className="w-6 h-6" style={{ color: accentColor }} />
                    </div>
                </div>
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-[#0d0d0d] dark:text-[#ececec] mb-2">
                    {title}
                </h1>
                <p className="text-[#666666] dark:text-[#b4b4b4] text-xs md:text-sm max-w-md mx-auto mb-6">
                    {description}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
                    {suggestedQueries.map((suggestion, i) => (
                        <motion.button
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 + i * 0.05 }}
                            onClick={() => {
                                setQuery(suggestion);
                                inputRef.current?.focus();
                            }}
                            className="px-4 py-2.5 rounded-xl text-left text-xs border border-[#e5e5e5] dark:border-[#424242] text-[#666666] dark:text-[#b4b4b4] hover:bg-[#f4f4f4] dark:hover:bg-[#2f2f2f] hover:text-[#0d0d0d] dark:hover:text-[#ececec] transition-all duration-200 shadow-sm flex items-center gap-2"
                        >
                            <span
                                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: `${accentColor}a6` }}
                            />
                            <span className="line-clamp-2">{suggestion}</span>
                        </motion.button>
                    ))}
                </div>
            </motion.div>
            <div className="w-full">{inputForm}</div>
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-white dark:bg-[#212121]">
            {history.length === 0 && !isProcessing ? (
                emptyState
            ) : (
                <>
                    <div className="flex-1 overflow-y-auto">
                        <div className="max-w-3xl mx-auto py-6 px-4">
                            <AnimatePresence initial={false}>
                                {history.map((item) => (
                                    <motion.div
                                        key={item.id}
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mb-8"
                                    >
                                        <div className="flex items-start gap-4 flex-row-reverse py-2">
                                            <div className="flex-shrink-0 mt-0.5">
                                                <div
                                                    className="w-7 h-7 rounded-full flex items-center justify-center text-white"
                                                    style={{ backgroundColor: accentColor }}
                                                >
                                                    <BookOpen className="w-3.5 h-3.5" />
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0 max-w-[85%] flex flex-col items-end">
                                                <div className="px-4 py-2.5 rounded-2xl bg-[#f4f4f4] dark:bg-[#2f2f2f] text-[#0d0d0d] dark:text-[#ececec]">
                                                    <p className="text-base">{item.query}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-4 py-2">
                                            <div className="flex-shrink-0 mt-0.5">
                                                <div
                                                    className="w-7 h-7 rounded-sm flex items-center justify-center"
                                                    style={{ backgroundColor: accentColor }}
                                                >
                                                    <Icon className="w-4 h-4 text-white" />
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-wrap items-center gap-2 mb-3">
                                                    <span
                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border"
                                                        style={{
                                                            backgroundColor: `${accentColor}1a`,
                                                            color: accentColor,
                                                            borderColor: `${accentColor}33`,
                                                        }}
                                                    >
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        {agentType === 'civil' ? 'Civil Law RAG' : 'Criminal Law RAG'}
                                                    </span>
                                                    <span className="inline-flex items-center gap-1.5 px-2 py-1 text-xs text-[#999999] dark:text-[#666666]">
                                                        <Clock className="w-3 h-3" />
                                                        {item.timestamp.toLocaleTimeString()}
                                                    </span>
                                                </div>

                                                <div className="message-content text-[#0d0d0d] dark:text-[#ececec] bg-[#f9f9f9] dark:bg-[#171717] p-5 rounded-2xl border border-[#e5e5e5] dark:border-[#2f2f2f]">
                                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                        {item.answer}
                                                    </ReactMarkdown>
                                                </div>

                                                {item.sources?.length > 0 && (
                                                    <div className="mt-3 space-y-2">
                                                        <p className="text-xs font-medium text-[#666666] dark:text-[#b4b4b4]">Sources</p>
                                                        {item.sources.slice(0, 4).map((src, i) => (
                                                            <div
                                                                key={i}
                                                                className="text-xs px-3 py-2 rounded-lg bg-white dark:bg-[#2f2f2f] border border-[#e5e5e5] dark:border-[#424242]"
                                                            >
                                                                <span className="font-medium text-[#0d0d0d] dark:text-[#ececec]">
                                                                    {src.file || 'Statute'}
                                                                </span>
                                                                {src.page != null && (
                                                                    <span className="text-[#999999]"> · p.{src.page}</span>
                                                                )}
                                                                {src.snippet && (
                                                                    <p className="mt-1 text-[#666666] dark:text-[#b4b4b4] line-clamp-2">
                                                                        {src.snippet}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                <button
                                                    onClick={() => handleCopy(item.id, item.answer)}
                                                    className="mt-3 inline-flex items-center gap-1.5 text-xs text-[#666666] dark:text-[#b4b4b4] hover:text-[#0d0d0d] dark:hover:text-[#ececec]"
                                                >
                                                    {copiedId === item.id ? (
                                                        <Check className="w-3.5 h-3.5 text-[#10a37f]" />
                                                    ) : (
                                                        <Copy className="w-3.5 h-3.5" />
                                                    )}
                                                    {copiedId === item.id ? 'Copied' : 'Copy'}
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>

                            {isProcessing && (
                                <div className="flex items-center gap-3 py-4 text-sm text-[#666666] dark:text-[#b4b4b4]">
                                    <Loader2 className="w-4 h-4 animate-spin" style={{ color: accentColor }} />
                                    {progress || 'Thinking...'}
                                </div>
                            )}
                            <div ref={resultsEndRef} />
                        </div>
                    </div>
                    <div className="p-4 border-t border-[#e5e5e5] dark:border-[#2f2f2f]">
                        <div className="max-w-3xl mx-auto">{inputForm}</div>
                    </div>
                </>
            )}
        </div>
    );
}
