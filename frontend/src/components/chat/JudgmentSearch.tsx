'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Loader2, Scale, ExternalLink, CheckCircle2,
    XCircle, AlertTriangle, ShieldAlert, BookOpen, Clock,
    ChevronDown, ChevronUp, Copy, Check, ArrowUp,
    Edit3, ThumbsUp, ThumbsDown, RefreshCw, Share2
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api } from '@/lib/api';
import { copyCleanText } from '@/lib/textUtils';
import { useChatLayout } from '@/app/chat/layout';
import ShareModal from '@/components/modals/ShareModal';

interface SourceResult {
    source_name: string;
    domain: string;
    url: string;
    status: string;
    content_preview?: string;
}

interface JudgmentResult {
    query: string;
    explanation: string;
    sources_searched: SourceResult[];
    successful_sources: number;
    blocked_sources: string[];
    timestamp: string;
}

interface SearchHistoryItem {
    id: string;
    query: string;
    result: JudgmentResult;
    timestamp: Date;
    userMessageId?: string;
    assistantMessageId?: string;
}

const JUDGMENT_API_URL = process.env.NEXT_PUBLIC_JUDGMENT_AGENT_URL || 'https://judgementsearch-judicial-gpt.in.ngrok.io';

export default function JudgmentSearch() {
    const [query, setQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [expandedSources, setExpandedSources] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [searchProgress, setSearchProgress] = useState('');
    const [dbConversationId, setDbConversationId] = useState<string | null>(null);
    const [feedbackState, setFeedbackState] = useState<Record<string, 'like' | 'dislike' | null>>({});
    const [showShareModal, setShowShareModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

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
        if (searchHistory.length > 0) {
            resultsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [searchHistory]);

    // Fetch a search result from the agent. Shared by new searches,
    // regenerate, and edit-and-resubmit so all three behave identically.
    const runSearchQuery = async (searchQuery: string): Promise<JudgmentResult> => {
        const progressSteps = [
            'Querying Supreme Court, High Courts...',
            'Searching law libraries & statute portals...',
            'Analyzing retrieved content with AI...',
            'Building legal analysis...'
        ];
        let stepIndex = 0;
        const progressInterval = setInterval(() => {
            if (stepIndex < progressSteps.length) {
                setSearchProgress(progressSteps[stepIndex]);
                stepIndex++;
            }
        }, 3000);

        try {
            const response = await fetch(`${JUDGMENT_API_URL}/search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: searchQuery, max_results: 8 }),
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.detail || `Search failed (${response.status})`);
            }

            return await response.json();
        } finally {
            clearInterval(progressInterval);
        }
    };

    const handleSearch = async () => {
        if (!query.trim() || isSearching) return;

        const searchQuery = query.trim();
        setQuery('');
        setIsSearching(true);
        setError(null);
        setSearchProgress('Searching Pakistani legal portals...');

        try {
            const result = await runSearchQuery(searchQuery);

            const historyItem: SearchHistoryItem = {
                id: `search_${Date.now()}`,
                query: searchQuery,
                result,
                timestamp: new Date(),
            };

            setSearchHistory(prev => [...prev, historyItem]);

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
                const { message: savedUserMsg } = await api.createMessage(convId!, 'user', searchQuery);

                // Create assistant message (the AI explanation), persisting the
                // sources metadata so it survives a reload instead of only
                // living in this component's local state.
                const { message: savedAssistantMsg } = await api.createMessage(convId!, 'assistant', result.explanation, undefined, {
                    judgmentSearch: {
                        successfulSources: result.successful_sources,
                        blockedSources: result.blocked_sources,
                        sourcesSearched: result.sources_searched,
                    }
                });

                setSearchHistory(prev => prev.map(h =>
                    h.id === historyItem.id
                        ? { ...h, userMessageId: savedUserMsg.id, assistantMessageId: savedAssistantMsg.id }
                        : h
                ));
            } catch (saveErr) {
                console.error('Failed to save judgment search to DB:', saveErr);
            }

        } catch (err: any) {
            console.error('Judgment search error:', err);
            if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
                setError('Cannot connect to the Judgment Search Agent. Make sure it is running on port 7001.');
            } else {
                setError(err.message || 'Search failed. Please try again.');
            }
        } finally {
            setIsSearching(false);
            setSearchProgress('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSearch();
        }
    };

    // Rate a search result (mirrors ChatView's feedback flow)
    const handleFeedback = async (item: SearchHistoryItem, feedback: 'like' | 'dislike') => {
        if (!item.assistantMessageId) return;
        const current = feedbackState[item.id];
        const newFeedback = current === feedback ? null : feedback;
        try {
            await api.setMessageFeedback(item.assistantMessageId, newFeedback);
            setFeedbackState(prev => ({ ...prev, [item.id]: newFeedback }));
        } catch (err) {
            console.error('Failed to save feedback:', err);
        }
    };

    // Re-run the same query and replace this item's result in place
    const handleRegenerate = async (item: SearchHistoryItem) => {
        if (regeneratingId) return;
        setRegeneratingId(item.id);
        setError(null);
        setSearchProgress('Searching Pakistani legal portals...');

        try {
            const result = await runSearchQuery(item.query);

            setSearchHistory(prev => prev.map(h => h.id === item.id ? { ...h, result } : h));

            if (item.assistantMessageId) {
                await api.updateMessage(item.assistantMessageId, result.explanation);
            }
        } catch (err: any) {
            console.error('Failed to regenerate search:', err);
            setError(err.message || 'Regenerate failed. Please try again.');
        } finally {
            setRegeneratingId(null);
            setSearchProgress('');
        }
    };

    const handleStartEdit = (item: SearchHistoryItem) => {
        setEditingId(item.id);
        setEditValue(item.query);
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditValue('');
    };

    // Edit the query text and re-run the search with it
    const handleSaveEdit = async (item: SearchHistoryItem) => {
        const newQuery = editValue.trim();
        if (!newQuery || regeneratingId) return;

        setEditingId(null);
        setRegeneratingId(item.id);
        setError(null);
        setSearchProgress('Searching Pakistani legal portals...');

        try {
            const result = await runSearchQuery(newQuery);

            setSearchHistory(prev => prev.map(h =>
                h.id === item.id ? { ...h, query: newQuery, result } : h
            ));

            if (item.userMessageId) {
                await api.updateMessage(item.userMessageId, newQuery);
            }
            if (item.assistantMessageId) {
                await api.updateMessage(item.assistantMessageId, result.explanation);
            }
        } catch (err: any) {
            console.error('Failed to re-run edited search:', err);
            setError(err.message || 'Search failed. Please try again.');
        } finally {
            setRegeneratingId(null);
            setSearchProgress('');
        }
    };

    const handleCopy = async (messageId: string, content: string) => {
        const success = await copyCleanText(content);
        if (success) {
            setCopiedId(messageId);
            setTimeout(() => setCopiedId(null), 2000);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'success':
                return <CheckCircle2 className="w-3.5 h-3.5 text-[#10a37f]" />;
            case 'blocked':
                return <ShieldAlert className="w-3.5 h-3.5 text-[#f59e0b]" />;
            case 'error':
                return <XCircle className="w-3.5 h-3.5 text-red-400" />;
            default:
                return <AlertTriangle className="w-3.5 h-3.5 text-gray-400" />;
        }
    };

    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'success':
                return 'bg-[#10a37f]/10 text-[#10a37f] border-[#10a37f]/20';
            case 'blocked':
                return 'bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20';
            case 'error':
                return 'bg-red-500/10 text-red-500 border-red-500/20';
            default:
                return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
        }
    };

    const suggestedQueries = [
        'Bail conditions under section 497 CrPC',
        'Supreme Court ruling on fundamental rights',
        'Land acquisition compensation case law',
        'Blasphemy law interpretation Pakistan',
    ];

    // Input form — must be declared before emptyState
    const inputForm = (
        <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="max-w-3xl mx-auto">
            <div className="relative flex items-center gap-2 rounded-3xl px-3 py-2 transition-colors shadow-sm bg-[#f4f4f4] dark:bg-[#2f2f2f] border border-[#e5e5e5] dark:border-[#424242] focus-within:border-[#10a37f]/50 dark:focus-within:border-[#10a37f]/40">
                {/* Scale icon */}
                <div className="p-1.5">
                    <Scale className="w-5 h-5 text-[#10a37f]" />
                </div>

                {/* Text input */}
                <textarea
                    ref={inputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search for judgments, case law, or legal topics..."
                    rows={1}
                    disabled={isSearching}
                    className="flex-1 bg-transparent resize-none outline-none max-h-[150px] disabled:opacity-50 text-base leading-6 py-0.5 text-[#0d0d0d] dark:text-[#ececec] placeholder-[#666666] dark:placeholder-[#8e8e8e]"
                />

                {/* Send button */}
                <button
                    type="submit"
                    disabled={!query.trim() || isSearching}
                    className={`p-2 rounded-full transition-all ${(!query.trim() || isSearching)
                        ? 'bg-[#d9d9d9] dark:bg-[#424242] text-[#999999] dark:text-[#666666] cursor-not-allowed'
                        : 'bg-[#0d0d0d] dark:bg-[#ececec] text-white dark:text-[#0d0d0d] hover:opacity-80'
                        }`}
                    title="Search judgments"
                >
                    {isSearching ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <ArrowUp className="w-5 h-5" />
                    )}
                </button>
            </div>

            {/* Search progress */}
            <AnimatePresence>
                {isSearching && searchProgress && (
                    <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-2 mt-3 px-2"
                    >
                        <div className="flex gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#10a37f] animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-1.5 h-1.5 rounded-full bg-[#10a37f] animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-1.5 h-1.5 rounded-full bg-[#10a37f] animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span className="text-sm text-[#10a37f]">{searchProgress}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Error display */}
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

            {searchHistory.length > 0 && (
                <p className="text-center text-xs text-[#999999] dark:text-[#666666] mt-2">
                    JudicialGPT can make mistakes. Consider checking important information.
                </p>
            )}
        </form>
    );

    // Empty state — same pattern as ChatView for proper centering
    const emptyState = (
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 w-full max-w-3xl mx-auto my-auto">
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="text-center w-full mb-8"
            >
                {/* Icon */}
                <div className="flex justify-center mb-4">
                    <div className="w-10 h-10 rounded-full bg-[#10a37f]/10 flex items-center justify-center">
                        <Scale className="w-5 h-5 text-[#10a37f]" />
                    </div>
                </div>

                <h1 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-[#0d0d0d] dark:text-[#ececec] mb-2">
                    Judgment Search
                </h1>
                <p className="text-[#666666] dark:text-[#b4b4b4] text-xs md:text-sm max-w-md mx-auto mb-6">
                    Search Pakistani court judgments, statutes, and legal precedents from authentic sources.
                </p>

                {/* Suggested queries */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-2xl mx-auto">
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
                            className="px-3.5 py-2 rounded-xl text-left text-xs border border-[#e5e5e5] dark:border-[#424242] text-[#666666] dark:text-[#b4b4b4] hover:bg-[#f4f4f4] dark:hover:bg-[#2f2f2f] hover:text-[#0d0d0d] dark:hover:text-[#ececec] transition-all duration-200 shadow-sm flex items-center gap-2"
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-[#10a37f]/50 flex-shrink-0" />
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
            {searchHistory.length === 0 && !isSearching ? (
                emptyState
            ) : (
                <>
                    {/* Results area */}
                    <div
                        ref={resultsContainerRef}
                        className="flex-1 overflow-y-auto"
                    >
                        <div className="max-w-3xl mx-auto py-6 px-4">
                            <AnimatePresence initial={false}>
                                {searchHistory.map((item) => (
                                    <motion.div
                                        key={item.id}
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.3 }}
                                        className="mb-8"
                                    >
                                        {/* User query */}
                                        <div className="flex items-start gap-4 flex-row-reverse py-2">
                                            <div className="flex-shrink-0 mt-0.5">
                                                <div className="w-7 h-7 rounded-full bg-[#10a37f] flex items-center justify-center text-xs font-medium text-white">
                                                    <Search className="w-3.5 h-3.5" />
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0 max-w-[85%] flex flex-col items-end">
                                                {editingId === item.id ? (
                                                    <div className="w-full">
                                                        <textarea
                                                            value={editValue}
                                                            onChange={(e) => setEditValue(e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                                                    e.preventDefault();
                                                                    if (editValue.trim()) handleSaveEdit(item);
                                                                }
                                                                if (e.key === 'Escape') handleCancelEdit();
                                                            }}
                                                            autoFocus
                                                            onFocus={(e) => {
                                                                const len = e.target.value.length;
                                                                e.target.setSelectionRange(len, len);
                                                            }}
                                                            className="w-full bg-[#f4f4f4] dark:bg-[#2f2f2f] border border-[#e5e5e5] dark:border-[#424242] rounded-xl p-3 text-base resize-none outline-none focus:border-[#10a37f] dark:focus:border-[#10a37f] transition-colors text-[#0d0d0d] dark:text-[#ececec]"
                                                            rows={Math.min(Math.max(editValue.split('\n').length, 2), 6)}
                                                        />
                                                        <div className="flex items-center justify-end gap-2 mt-2">
                                                            <button
                                                                onClick={handleCancelEdit}
                                                                className="px-3 py-1.5 text-sm font-medium text-[#666666] dark:text-[#b4b4b4] hover:bg-[#ececec] dark:hover:bg-[#2f2f2f] rounded-lg transition-colors"
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button
                                                                onClick={() => handleSaveEdit(item)}
                                                                disabled={!editValue.trim()}
                                                                className="px-3 py-1.5 text-sm font-medium bg-[#0d0d0d] dark:bg-[#ececec] text-white dark:text-[#0d0d0d] hover:opacity-80 disabled:opacity-40 rounded-lg transition-colors"
                                                            >
                                                                Save & search
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="px-4 py-2.5 rounded-2xl bg-[#f4f4f4] dark:bg-[#2f2f2f] text-[#0d0d0d] dark:text-[#ececec]">
                                                            <p className="text-base">{item.query}</p>
                                                        </div>
                                                        <div className="flex items-center gap-1 mt-1">
                                                            <button
                                                                onClick={() => handleCopy(`${item.id}_query`, item.query)}
                                                                className="p-1.5 rounded-lg hover:bg-[#f4f4f4] dark:hover:bg-[#2f2f2f] transition-colors"
                                                                title="Copy"
                                                            >
                                                                {copiedId === `${item.id}_query` ? (
                                                                    <Check className="w-3.5 h-3.5 text-[#10a37f]" />
                                                                ) : (
                                                                    <Copy className="w-3.5 h-3.5 text-[#666666] dark:text-[#b4b4b4]" />
                                                                )}
                                                            </button>
                                                            <button
                                                                onClick={() => handleStartEdit(item)}
                                                                className="p-1.5 rounded-lg hover:bg-[#f4f4f4] dark:hover:bg-[#2f2f2f] transition-colors"
                                                                title="Edit"
                                                            >
                                                                <Edit3 className="w-3.5 h-3.5 text-[#666666] dark:text-[#b4b4b4]" />
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* AI response */}
                                        <div className="flex items-start gap-4 py-2">
                                            <div className="flex-shrink-0 mt-0.5">
                                                <div className="w-7 h-7 rounded-sm bg-[#10a37f] flex items-center justify-center">
                                                    <Scale className="w-4 h-4 text-white" />
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                {/* Sources summary badge */}
                                                <div className="flex flex-wrap items-center gap-2 mb-3">
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#10a37f]/10 text-[#10a37f] border border-[#10a37f]/20">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        {item.result.successful_sources} sources found
                                                    </span>
                                                    {item.result.blocked_sources.length > 0 && (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20">
                                                            <ShieldAlert className="w-3 h-3" />
                                                            {item.result.blocked_sources.length} blocked
                                                        </span>
                                                    )}
                                                    <span className="inline-flex items-center gap-1.5 px-2 py-1 text-xs text-[#999999] dark:text-[#666666]">
                                                        <Clock className="w-3 h-3" />
                                                        {item.result.timestamp}
                                                    </span>
                                                </div>

                                                {/* Explanation content */}
                                                <div className="message-content text-[#0d0d0d] dark:text-[#ececec]">
                                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                        {item.result.explanation}
                                                    </ReactMarkdown>
                                                </div>

                                                {/* Action buttons */}
                                                <div className="flex items-center gap-1 mt-3">
                                                    <button
                                                        onClick={() => handleCopy(item.id, item.result.explanation)}
                                                        className="p-1.5 rounded-lg hover:bg-[#f4f4f4] dark:hover:bg-[#2f2f2f] transition-colors"
                                                        title="Copy response"
                                                    >
                                                        {copiedId === item.id ? (
                                                            <Check className="w-4 h-4 text-[#10a37f]" />
                                                        ) : (
                                                            <Copy className="w-4 h-4 text-[#666666] dark:text-[#b4b4b4]" />
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={() => handleFeedback(item, 'like')}
                                                        className="p-1.5 rounded-lg hover:bg-[#f4f4f4] dark:hover:bg-[#2f2f2f] transition-colors"
                                                        title="Good response"
                                                    >
                                                        <ThumbsUp className={`w-4 h-4 ${feedbackState[item.id] === 'like' ? 'fill-current text-[#10a37f]' : 'text-[#666666] dark:text-[#b4b4b4]'}`} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleFeedback(item, 'dislike')}
                                                        className="p-1.5 rounded-lg hover:bg-[#f4f4f4] dark:hover:bg-[#2f2f2f] transition-colors"
                                                        title="Bad response"
                                                    >
                                                        <ThumbsDown className={`w-4 h-4 ${feedbackState[item.id] === 'dislike' ? 'fill-current text-red-500' : 'text-[#666666] dark:text-[#b4b4b4]'}`} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleRegenerate(item)}
                                                        disabled={regeneratingId === item.id}
                                                        className="p-1.5 rounded-lg hover:bg-[#f4f4f4] dark:hover:bg-[#2f2f2f] transition-colors"
                                                        title="Regenerate"
                                                    >
                                                        <RefreshCw className={`w-4 h-4 text-[#666666] dark:text-[#b4b4b4] ${regeneratingId === item.id ? 'animate-spin' : ''}`} />
                                                    </button>
                                                    <button
                                                        onClick={() => setShowShareModal(true)}
                                                        className="p-1.5 rounded-lg hover:bg-[#f4f4f4] dark:hover:bg-[#2f2f2f] transition-colors"
                                                        title="Share conversation"
                                                    >
                                                        <Share2 className="w-4 h-4 text-[#666666] dark:text-[#b4b4b4]" />
                                                    </button>
                                                </div>

                                                {/* Sources collapsible */}
                                                <div className="mt-4">
                                                    <button
                                                        onClick={() => setExpandedSources(expandedSources === item.id ? null : item.id)}
                                                        className="flex items-center gap-2 text-sm font-medium text-[#666666] dark:text-[#b4b4b4] hover:text-[#0d0d0d] dark:hover:text-[#ececec] transition-colors"
                                                    >
                                                        {expandedSources === item.id ? (
                                                            <ChevronUp className="w-4 h-4" />
                                                        ) : (
                                                            <ChevronDown className="w-4 h-4" />
                                                        )}
                                                        View {item.result.sources_searched.length} sources searched
                                                    </button>

                                                    <AnimatePresence>
                                                        {expandedSources === item.id && (
                                                            <motion.div
                                                                initial={{ height: 0, opacity: 0 }}
                                                                animate={{ height: 'auto', opacity: 1 }}
                                                                exit={{ height: 0, opacity: 0 }}
                                                                transition={{ duration: 0.2 }}
                                                                className="overflow-hidden"
                                                            >
                                                                <div className="mt-3 space-y-2">
                                                                    {item.result.sources_searched.map((source, si) => (
                                                                        <div
                                                                            key={si}
                                                                            className="flex items-start gap-3 p-3 rounded-xl bg-[#f9f9f9] dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#2f2f2f]"
                                                                        >
                                                                            <div className="mt-0.5">
                                                                                {getStatusIcon(source.status)}
                                                                            </div>
                                                                            <div className="flex-1 min-w-0">
                                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                                    <span className="text-sm font-medium text-[#0d0d0d] dark:text-[#ececec] truncate">
                                                                                        {source.source_name}
                                                                                    </span>
                                                                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${getStatusBadgeClass(source.status)}`}>
                                                                                        {source.status}
                                                                                    </span>
                                                                                </div>
                                                                                <p className="text-xs text-[#999999] dark:text-[#666666] mt-0.5 truncate">
                                                                                    {source.domain}
                                                                                </p>
                                                                                {source.content_preview && source.status === 'success' && (
                                                                                    <p className="text-xs text-[#666666] dark:text-[#b4b4b4] mt-1 line-clamp-2">
                                                                                        {source.content_preview.slice(0, 150)}...
                                                                                    </p>
                                                                                )}
                                                                            </div>
                                                                            <a
                                                                                href={source.url}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="p-1 rounded hover:bg-[#ececec] dark:hover:bg-[#2f2f2f] transition-colors flex-shrink-0"
                                                                                title="Open source"
                                                                            >
                                                                                <ExternalLink className="w-3.5 h-3.5 text-[#666666] dark:text-[#b4b4b4]" />
                                                                            </a>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>

                            {/* Searching indicator */}
                            {isSearching && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex items-start gap-4 py-2 mb-4"
                                >
                                    <div className="flex-shrink-0 mt-0.5">
                                        <div className="w-7 h-7 rounded-sm bg-[#10a37f] flex items-center justify-center">
                                            <Scale className="w-4 h-4 text-white animate-pulse" />
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3">
                                            <Loader2 className="w-4 h-4 text-[#10a37f] animate-spin" />
                                            <span className="text-sm text-[#666666] dark:text-[#b4b4b4]">
                                                {searchProgress || 'Searching...'}
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

                    {/* Input at bottom */}
                    <div className="px-4 pb-4 pt-2">
                        {inputForm}
                    </div>
                </>
            )}

            {/* Share Modal */}
            <ShareModal
                isOpen={showShareModal}
                onClose={() => setShowShareModal(false)}
                conversationId={dbConversationId || ''}
                conversationTitle={searchHistory[0]?.query || 'Judgment Search'}
            />
        </div>
    );
}
