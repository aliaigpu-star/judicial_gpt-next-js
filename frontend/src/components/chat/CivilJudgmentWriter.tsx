'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Loader2, FileText, ExternalLink, CheckCircle2,
    XCircle, AlertTriangle, ShieldAlert, BookOpen, Clock,
    ChevronDown, ChevronUp, Copy, Check, ArrowUp, Gavel
} from 'lucide-react';
import { api } from '@/lib/api';
import { copyCleanText } from '@/lib/textUtils';
import { useChatLayout } from '@/app/chat/layout';

interface SourceResult {
    source_name: string;
    domain: string;
    url: string;
    status: string;
    content_preview?: string;
}

interface WriterResult {
    query: string;
    response: string;
    sources: string[];
    timestamp: string;
}

interface HistoryItem {
    id: string;
    query: string;
    result: WriterResult;
    timestamp: Date;
}

const WRITER_API_URL = process.env.NEXT_PUBLIC_CIVIL_WRITER_AGENT_URL || 'https://civiljudgement-judicial-gpt.in.ngrok.io';

// Strip stray lone-underscore artifact lines the model occasionally emits
// around section separators, without touching the real "─────" dividers.
const cleanJudgmentText = (text: string) =>
    text.split('\n').filter(line => !/^\s*_+\s*$/.test(line)).join('\n');

// Judgment documents are rendered as plain text to preserve literal
// spacing/alignment, but the model still sometimes emits inline markdown
// (**bold**, *italic*) and "#"-style headings within that plain-text
// layout. Parse just those inline/heading bits by hand rather than handing
// the whole thing to ReactMarkdown, which would collapse the alignment
// spacing again.
const INLINE_MD_RE = /(\*\*\*.+?\*\*\*|\*\*.+?\*\*|\*.+?\*)/g;

const renderInlineMarkdown = (text: string, keyPrefix: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let pos = 0;
    let idx = 0;
    let match: RegExpExecArray | null;
    const re = new RegExp(INLINE_MD_RE);
    while ((match = re.exec(text)) !== null) {
        if (match.index > pos) parts.push(text.slice(pos, match.index));
        const token = match[0];
        if (token.startsWith('***') && token.endsWith('***')) {
            parts.push(<strong key={`${keyPrefix}-${idx}`}><em>{token.slice(3, -3)}</em></strong>);
        } else if (token.startsWith('**') && token.endsWith('**')) {
            parts.push(<strong key={`${keyPrefix}-${idx}`}>{token.slice(2, -2)}</strong>);
        } else {
            parts.push(<em key={`${keyPrefix}-${idx}`}>{token.slice(1, -1)}</em>);
        }
        idx++;
        pos = re.lastIndex;
    }
    if (pos < text.length) parts.push(text.slice(pos));
    return parts;
};

// Render the long "─────" separator lines as a real <hr> instead of raw
// repeated dash characters — as plain text they have no spaces to wrap at,
// so `.message-content`'s word-wrap:break-word forces a mid-run break that
// strands 1-2 dashes on their own line, looking like a stray underscore.
const renderJudgmentText = (text: string) =>
    cleanJudgmentText(text).split('\n').map((line, i) => {
        const trimmed = line.trim();
        if (/^[─\-]{5,}$/.test(trimmed)) {
            return <hr key={i} className="my-2 border-t border-current opacity-20" />;
        }
        const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
        if (headingMatch) {
            const level = headingMatch[1].length;
            return (
                <div key={i} className={`whitespace-pre-wrap font-semibold ${level <= 2 ? 'text-lg mt-3' : 'text-base mt-2'}`}>
                    {renderInlineMarkdown(headingMatch[2], `h${i}`)}
                </div>
            );
        }
        return <div key={i} className="whitespace-pre-wrap">{renderInlineMarkdown(line, `l${i}`)}</div>;
    });

export default function CivilJudgmentWriter() {
    const [query, setQuery] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [currentStreamingMessage, setCurrentStreamingMessage] = useState<{ id: string, query: string, response: string, sources: string[] } | null>(null);
    const [progress, setProgress] = useState('');
    const [dbConversationId, setDbConversationId] = useState<string | null>(null);

    const { setConversations } = useChatLayout();

    const inputRef = useRef<HTMLTextAreaElement>(null);
    const resultsEndRef = useRef<HTMLDivElement>(null);
    const resultsContainerRef = useRef<HTMLDivElement>(null);

    // Auto-resize textarea
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
            inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 150) + 'px';
        }
    }, [query]);

    // Scroll to latest result
    useEffect(() => {
        if (history.length > 0 || currentStreamingMessage) {
            resultsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [history, currentStreamingMessage]);

    const handleSearch = async () => {
        if (!query.trim() || isProcessing) return;

        const searchQuery = query.trim();
        setQuery('');
        setIsProcessing(true);
        setError(null);
        setProgress('Connecting to JudicialGPT Writing Agent...');
        setCurrentStreamingMessage({ id: `stream_${Date.now()}`, query: searchQuery, response: '', sources: [] });

        try {
            const response = await fetch(`${WRITER_API_URL}/chat/stream`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: searchQuery }),
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.detail || `Streaming failed (${response.status})`);
            }

            setProgress(''); // Clear initial progress, now streaming

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let accumulatedResponse = '';
            let finalSources: string[] = [];
            let sseBuffer = '';  // Buffer for incomplete SSE lines across chunks
            let streamDone = false;

            if (!reader) throw new Error('Response body is not readable');

            while (!streamDone) {
                const { done, value } = await reader.read();
                if (done) break;

                sseBuffer += decoder.decode(value, { stream: true });

                // Split on newlines; the last element may be an incomplete line
                const lines = sseBuffer.split('\n');
                sseBuffer = lines.pop() || '';  // Keep the last (possibly partial) line in the buffer

                for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;

                    const content = trimmedLine.slice(6).trim();
                    if (content === '[DONE]') {
                        streamDone = true;
                        break;
                    }

                    try {
                        const data = JSON.parse(content);

                        if (data.text) {
                            accumulatedResponse += data.text;
                            setCurrentStreamingMessage(prev => prev ? { ...prev, response: accumulatedResponse } : null);
                        } else if (data.metadata) {
                            if (data.metadata.sources) {
                                finalSources = data.metadata.sources;
                            }
                        }
                    } catch (e) {
                        // If JSON parsing fails, treat raw content as text (fallback)
                        if (content && content !== '[ERROR]') {
                            accumulatedResponse += content;
                            setCurrentStreamingMessage(prev => prev ? { ...prev, response: accumulatedResponse } : null);
                        }
                    }
                }
            }

            // Finalize by adding to history
            const historyItem: HistoryItem = {
                id: `write_${Date.now()}`,
                query: searchQuery,
                result: {
                    query: searchQuery,
                    response: accumulatedResponse,
                    sources: finalSources,
                    timestamp: new Date().toLocaleTimeString(),
                },
                timestamp: new Date(),
            };

            setHistory(prev => [...prev, historyItem]);
            setCurrentStreamingMessage(null);

            // SAVE TO DATABASE
            try {
                let convId = dbConversationId;
                if (!convId) {
                    const title = searchQuery.slice(0, 40) + (searchQuery.length > 40 ? '...' : '');
                    const { conversation } = await api.createConversation(title);
                    convId = conversation.id;
                    setDbConversationId(convId);
                    
                    // Add to sidebar
                    setConversations(prev => [{ ...conversation, messages: [] }, ...prev]);
                    
                    // Update URL silently
                    window.history.replaceState(null, '', `/chat/${convId}`);
                }

                // Create user message
                await api.createMessage(convId!, 'user', searchQuery);
                
                // Create assistant message
                await api.createMessage(convId!, 'assistant', accumulatedResponse);
            } catch (saveErr) {
                console.error('Failed to save civil judgment to DB:', saveErr);
            }

        } catch (err: any) {
            console.error('Writer error:', err);
            setCurrentStreamingMessage(null);
            if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
                setError('Cannot connect to the Civil Judgment Writing Agent. Make sure it is running on port 7003.');
            } else {
                setError(err.message || 'Processing failed. Please try again.');
            }
        } finally {
            setIsProcessing(false);
            setProgress('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSearch();
        }
    };

    const handleCopy = async (id: string, text: string) => {
        const success = await copyCleanText(text);
        if (success) {
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
        }
    };

    const suggestedQueries = [
        'Draft a heading and statement of case for a declaration suit',
        'Frame issues for a specific performance contract dispute',
        'Draft findings on issue of limitation in a property suit',
        'Write the operative part and decree for a dismissed suit',
    ];

    const inputForm = (
        <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="max-w-3xl mx-auto">
            <div className="relative flex items-center gap-2 rounded-3xl px-3 py-2 transition-colors shadow-sm bg-[#f4f4f4] dark:bg-[#2f2f2f] border border-[#e5e5e5] dark:border-[#424242] focus-within:border-[#3b82f6]/50 dark:focus-within:border-[#3b82f6]/40">
                <div className="p-1.5">
                    <Gavel className="w-5 h-5 text-[#3b82f6]" />
                </div>

                <textarea
                    ref={inputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Provide case details or ask to draft a judgment section..."
                    rows={1}
                    disabled={isProcessing}
                    className="flex-1 bg-transparent resize-none outline-none max-h-[150px] disabled:opacity-50 text-base leading-6 py-0.5 text-[#0d0d0d] dark:text-[#ececec] placeholder-[#666666] dark:placeholder-[#8e8e8e]"
                />

                <button
                    type="submit"
                    disabled={!query.trim() || isProcessing}
                    className={`p-2 rounded-full transition-all ${(!query.trim() || isProcessing)
                        ? 'bg-[#d9d9d9] dark:bg-[#424242] text-[#999999] dark:text-[#666666] cursor-not-allowed'
                        : 'bg-[#0d0d0d] dark:bg-[#ececec] text-white dark:text-[#0d0d0d] hover:opacity-80'
                        }`}
                    title="Generate judgment"
                >
                    {isProcessing ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <ArrowUp className="w-5 h-5" />
                    )}
                </button>
            </div>

            <AnimatePresence>
                {isProcessing && progress && (
                    <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-2 mt-3 px-2"
                    >
                        <div className="flex gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#3b82f6] animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-1.5 h-1.5 rounded-full bg-[#3b82f6] animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-1.5 h-1.5 rounded-full bg-[#3b82f6] animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span className="text-sm text-[#3b82f6]">{progress}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="mt-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2"
                    >
                        <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {history.length > 0 && (
                <p className="text-center text-xs text-[#999999] dark:text-[#666666] mt-2">
                    JudicialGPT drafting is based on CPC 1908 Order XX Rule 4. Always review legal accuracy.
                </p>
            )}
        </form>
    );

    const emptyState = (
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 w-full max-w-3xl mx-auto my-auto">
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="text-center w-full mb-8"
            >
                <div className="flex justify-center mb-4">
                    <div className="w-12 h-12 rounded-full bg-[#3b82f6]/10 flex items-center justify-center">
                        <FileText className="w-6 h-6 text-[#3b82f6]" />
                    </div>
                </div>

                <h1 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-[#0d0d0d] dark:text-[#ececec] mb-2">
                    Civil Judgment Writing
                </h1>
                <p className="text-[#666666] dark:text-[#b4b4b4] text-xs md:text-sm max-w-md mx-auto mb-6">
                    Assist in drafting legally sound civil judgments compliant with CPC Pakistan procedural standards.
                </p>

                {/* Suggested queries organized in exactly two columns (2 rows) */}
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
                            <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6]/65 flex-shrink-0" />
                            <span className="line-clamp-2">{suggestion}</span>
                        </motion.button>
                    ))}
                </div>
            </motion.div>

            <div className="w-full">
                {inputForm}
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-white dark:bg-[#212121]">
            {history.length === 0 && !isProcessing ? (
                emptyState
            ) : (
                <>
                    <div
                        ref={resultsContainerRef}
                        className="flex-1 overflow-y-auto"
                    >
                        <div className="max-w-3xl mx-auto py-6 px-4">
                            <AnimatePresence initial={false}>
                                {history.map((item) => (
                                    <motion.div
                                        key={item.id}
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.3 }}
                                        className="mb-8"
                                    >
                                        <div className="flex items-start gap-4 flex-row-reverse py-2">
                                            <div className="flex-shrink-0 mt-0.5">
                                                <div className="w-7 h-7 rounded-full bg-[#3b82f6] flex items-center justify-center text-xs font-medium text-white">
                                                    <FileText className="w-3.5 h-3.5" />
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
                                                <div className="w-7 h-7 rounded-sm bg-[#3b82f6] flex items-center justify-center">
                                                    <Gavel className="w-4 h-4 text-white" />
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-wrap items-center gap-2 mb-3">
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/20">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        CPC Compliant
                                                    </span>
                                                    <span className="inline-flex items-center gap-1.5 px-2 py-1 text-xs text-[#999999] dark:text-[#666666]">
                                                        <Clock className="w-3 h-3" />
                                                        {item.result.timestamp}
                                                    </span>
                                                </div>

                                                <div className="message-content font-serif text-[#0d0d0d] dark:text-[#ececec] bg-[#f9f9f9] dark:bg-[#171717] p-5 rounded-2xl border border-[#e5e5e5] dark:border-[#2f2f2f]">
                                                    {renderJudgmentText(item.result.response)}
                                                </div>

                                                <div className="flex items-center gap-1 mt-3">
                                                    <button
                                                        onClick={() => handleCopy(item.id, item.result.response)}
                                                        className="p-1.5 rounded-lg hover:bg-[#f4f4f4] dark:hover:bg-[#2f2f2f] transition-colors"
                                                        title="Copy judgment"
                                                    >
                                                        {copiedId === item.id ? (
                                                            <Check className="w-4 h-4 text-[#10a37f]" />
                                                        ) : (
                                                            <Copy className="w-4 h-4 text-[#666666] dark:text-[#b4b4b4]" />
                                                        )}
                                                    </button>
                                                </div>

                                                {item.result.sources.length > 0 && (
                                                    <div className="mt-4">
                                                        <div className="flex items-center gap-2 text-xs font-medium text-[#666666] dark:text-[#b4b4b4] mb-2">
                                                            <BookOpen className="w-3 h-3" />
                                                            KNOWLEDGE SOURCES
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            {item.result.sources.map((src, si) => (
                                                                <span key={si} className="px-2 py-1 rounded-md bg-[#f4f4f4] dark:bg-[#2f2f2f] text-[10px] text-[#666666] dark:text-[#ececec] border border-[#e5e5e5] dark:border-[#424242]">
                                                                    {src}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}

                                {/* Live Streaming Message */}
                                {currentStreamingMessage && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mb-8"
                                    >
                                        <div className="flex items-start gap-4 flex-row-reverse py-2">
                                            <div className="flex-shrink-0 mt-0.5">
                                                <div className="w-7 h-7 rounded-full bg-[#3b82f6] flex items-center justify-center text-xs font-medium text-white">
                                                    <FileText className="w-3.5 h-3.5" />
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0 max-w-[85%] flex flex-col items-end">
                                                <div className="px-4 py-2.5 rounded-2xl bg-[#f4f4f4] dark:bg-[#2f2f2f] text-[#0d0d0d] dark:text-[#ececec]">
                                                    <p className="text-base">{currentStreamingMessage.query}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-4 py-2">
                                            <div className="flex-shrink-0 mt-0.5">
                                                <div className="w-7 h-7 rounded-sm bg-[#3b82f6] flex items-center justify-center">
                                                    <Gavel className="w-4 h-4 text-white" />
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-wrap items-center gap-2 mb-3">
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/20">
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                        Generating draft...
                                                    </span>
                                                </div>

                                                <div className="message-content font-serif text-[#0d0d0d] dark:text-[#ececec] bg-[#f9f9f9] dark:bg-[#171717] p-5 rounded-2xl border border-[#e5e5e5] dark:border-[#2f2f2f]">
                                                    {renderJudgmentText(currentStreamingMessage.response + ' ▌')}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {isProcessing && !currentStreamingMessage && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex items-start gap-4 py-2 mb-4"
                                >
                                    <div className="flex-shrink-0 mt-0.5">
                                        <div className="w-7 h-7 rounded-sm bg-[#3b82f6] flex items-center justify-center">
                                            <Gavel className="w-4 h-4 text-white animate-pulse" />
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3">
                                            <Loader2 className="w-4 h-4 text-[#3b82f6] animate-spin" />
                                            <span className="text-sm text-[#666666] dark:text-[#b4b4b4]">
                                                {progress || 'Generating...'}
                                            </span>
                                        </div>
                                        <div className="mt-3 space-y-2">
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="h-4 rounded bg-[#f4f4f4] dark:bg-[#2f2f2f] animate-pulse" style={{ width: `${85 - i * 15}%` }} />
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            <div ref={resultsEndRef} />
                        </div>
                    </div>

                    <div className="px-4 pb-4 pt-2">
                        {inputForm}
                    </div>
                </>
            )}
        </div>
    );
}
