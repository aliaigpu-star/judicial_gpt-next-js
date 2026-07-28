'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Upload, FileText, Loader2, CheckCircle2, XCircle,
    Copy, Check, ArrowUp, Clock, AlertTriangle,
    FileUp, X, MessageSquare, Send, BookOpen, Search
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api } from '@/lib/api';
import { copyCleanText } from '@/lib/textUtils';
import { useChatLayout } from '@/app/chat/layout';

type JobStatus = 'idle' | 'uploading' | 'pending' | 'processing' | 'done' | 'failed';

interface QAItem {
    id: string;
    question: string;
    answer: string;
    timestamp: Date;
}

export default function DocumentSummarizer() {
    const { setConversations, conversations } = useChatLayout();

    const [status, setStatus] = useState<JobStatus>('idle');
    const [jobId, setJobId] = useState<string | null>(null);
    const [dbConversationId, setDbConversationId] = useState<string | null>(null);
    const [filename, setFilename] = useState<string>('');
    const [summary, setSummary] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState<string>('');
    const [copied, setCopied] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);

    // QA state
    const [qaItems, setQaItems] = useState<QAItem[]>([]);
    const [qaQuestion, setQaQuestion] = useState('');
    const [isAskingQuestion, setIsAskingQuestion] = useState(false);
    const [showQA, setShowQA] = useState(false);

    // Drag & drop state
    const [isDragging, setIsDragging] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const summaryRef = useRef<HTMLDivElement>(null);
    const qaInputRef = useRef<HTMLTextAreaElement>(null);
    const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const startTimeRef = useRef<number>(0);

    // Cleanup intervals on unmount
    useEffect(() => {
        return () => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    const startTimer = useCallback(() => {
        startTimeRef.current = Date.now();
        setElapsedTime(0);
        timerRef.current = setInterval(() => {
            setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }, 1000);
    }, []);

    const stopTimer = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return m > 0 ? `${m}m ${s}s` : `${s}s`;
    };

    // Polling for job status
    const startPolling = useCallback((id: string, convId: string) => {
        const progressMessages = [
            'Loading document...',
            'Splitting into chunks...',
            'Building vector embeddings...',
            'Extracting legal facts...',
            'Processing document chunks...',
            'Analyzing legal content...',
            'Synthesizing final summary...',
            'Generating comprehensive summary...',
        ];
        let msgIndex = 0;
        setProgress(progressMessages[0]);

        const progressTimer = setInterval(() => {
            msgIndex = Math.min(msgIndex + 1, progressMessages.length - 1);
            setProgress(progressMessages[msgIndex]);
        }, 8000);

        pollIntervalRef.current = setInterval(async () => {
            try {
                const data = await api.getSummarizationStatus(id);

                if (data.status === 'done') {
                    clearInterval(pollIntervalRef.current!);
                    clearInterval(progressTimer);
                    pollIntervalRef.current = null;
                    stopTimer();
                    setStatus('done');
                    const fullSummary = data.summary || '';
                    setSummary(fullSummary);
                    setProgress('');

                    // Save summary to database as assistant message
                    try {
                        const totalTime = Math.floor((Date.now() - startTimeRef.current) / 1000);
                        await api.createMessage(convId, 'assistant', fullSummary, totalTime * 1000);
                    } catch (dbErr) {
                        console.error('Failed to save summary to DB:', dbErr);
                    }

                    // Scroll to summary
                    setTimeout(() => {
                        summaryRef.current?.scrollIntoView({ behavior: 'smooth' });
                    }, 300);
                } else if (data.status === 'failed') {
                    clearInterval(pollIntervalRef.current!);
                    clearInterval(progressTimer);
                    pollIntervalRef.current = null;
                    stopTimer();
                    setStatus('failed');
                    setError(data.error || 'Summarization failed');
                    setProgress('');
                }
            } catch (err: any) {
                console.error('Polling error:', err);
            }
        }, 3000);

        return () => clearInterval(progressTimer);
    }, [stopTimer]);

    const handleUpload = useCallback(async (file: File) => {
        setError(null);
        setStatus('uploading');
        setFilename(file.name);
        setSummary('');
        setQaItems([]);
        setShowQA(false);

        try {
            startTimer();
            setProgress('Uploading document...');

            // 1. Create a database conversation first
            const convData = await api.createConversation(`Summary: ${file.name}`);
            const convId = convData.conversation.id;
            setDbConversationId(convId);
            
            // Add to sidebar
            setConversations([convData.conversation, ...conversations]);

            // 2. Save the upload action as a user message
            await api.createMessage(convId, 'user', `Uploaded document for summarization: ${file.name}`);

            // 3. Upload to agent
            const data = await api.uploadForSummarization(file);

            setJobId(data.jobId);
            setStatus('processing');
            setProgress('Document uploaded. Starting analysis...');

            // 4. Start polling
            startPolling(data.jobId, convId);
        } catch (err: any) {
            stopTimer();
            setStatus('failed');
            setError(err.message || 'Upload failed');
            setProgress('');
        }
    }, [startTimer, stopTimer, startPolling, conversations, setConversations]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            handleUpload(file);
        }
        e.target.value = '';
    };

    // Drag & drop handlers
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) {
            const ext = file.name.split('.').pop()?.toLowerCase();
            if (['pdf', 'docx', 'doc', 'txt'].includes(ext || '')) {
                setSelectedFile(file);
                handleUpload(file);
            } else {
                setError('Unsupported file type. Please upload PDF, DOCX, DOC, or TXT files.');
            }
        }
    };

    const handleCopy = async (text: string) => {
        const success = await copyCleanText(text);
        if (success) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleAskQuestion = async () => {
        if (!qaQuestion.trim() || !jobId || !dbConversationId || isAskingQuestion) return;

        const question = qaQuestion.trim();
        setQaQuestion('');
        setIsAskingQuestion(true);

        // Save question to DB
        try {
            await api.createMessage(dbConversationId, 'user', question);
        } catch (dbErr) {
            console.error('Failed to save question to DB:', dbErr);
        }

        const startTime = Date.now();
        try {
            const data = await api.askSummarization(jobId, question);
            const responseTime = Date.now() - startTime;
            
            // Save answer to DB
            try {
                await api.createMessage(dbConversationId, 'assistant', data.answer, responseTime);
            } catch (dbErr) {
                console.error('Failed to save answer to DB:', dbErr);
            }

            setQaItems(prev => [...prev, {
                id: `qa_${Date.now()}`,
                question,
                answer: data.answer,
                timestamp: new Date(),
            }]);
        } catch (err: any) {
            setQaItems(prev => [...prev, {
                id: `qa_${Date.now()}`,
                question,
                answer: `Error: ${err.message || 'Failed to get answer'}`,
                timestamp: new Date(),
            }]);
        } finally {
            setIsAskingQuestion(false);
        }
    };

    const handleReset = () => {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        stopTimer();
        setStatus('idle');
        setJobId(null);
        setDbConversationId(null);
        setFilename('');
        setSummary('');
        setError(null);
        setProgress('');
        setQaItems([]);
        setShowQA(false);
        setSelectedFile(null);
        setElapsedTime(0);
    };

    const handleQaKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleAskQuestion();
        }
    };

    // Auto-resize QA textarea
    useEffect(() => {
        if (qaInputRef.current) {
            qaInputRef.current.style.height = 'auto';
            qaInputRef.current.style.height = Math.min(qaInputRef.current.scrollHeight, 120) + 'px';
        }
    }, [qaQuestion]);

    const suggestedQuestions = [
        'What reliefs were granted?',
        'List all statutes cited',
        'Who are the parties involved?',
        'What was the final verdict?',
    ];

    // ── IDLE STATE ─────────────────────────────
    const idleState = (
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 w-full max-w-3xl mx-auto my-auto">
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="text-center w-full mb-8"
            >
                <div className="flex justify-center mb-4">
                    <div className="w-10 h-10 rounded-full bg-[#10a37f]/10 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-[#10a37f]" />
                    </div>
                </div>

                <h1 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-[#0d0d0d] dark:text-[#ececec] mb-2">
                    Document Summarizer
                </h1>
                <p className="text-[#666666] dark:text-[#b4b4b4] text-xs md:text-sm max-w-md mx-auto mb-6">
                    Upload a legal document (PDF, DOCX, TXT) for AI-powered summarization with a comprehensive judicial analysis.
                </p>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="w-full"
            >
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300 p-10 text-center group ${
                        isDragging
                            ? 'border-[#10a37f] bg-[#10a37f]/5 dark:bg-[#10a37f]/10 scale-[1.02]'
                            : 'border-[#e5e5e5] dark:border-[#424242] hover:border-[#10a37f]/50 hover:bg-[#f9f9f9] dark:hover:bg-[#2f2f2f]/50'
                    }`}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.docx,.doc,.txt"
                        onChange={handleFileSelect}
                        className="hidden"
                    />

                    <div className={`w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                        isDragging
                            ? 'bg-[#10a37f]/15 scale-110'
                            : 'bg-[#f4f4f4] dark:bg-[#2f2f2f] group-hover:bg-[#10a37f]/10'
                    }`}>
                        <FileUp className={`w-7 h-7 transition-colors duration-300 ${
                            isDragging
                                ? 'text-[#10a37f]'
                                : 'text-[#666666] dark:text-[#b4b4b4] group-hover:text-[#10a37f]'
                        }`} />
                    </div>

                    <p className="text-base font-medium text-[#0d0d0d] dark:text-[#ececec] mb-1">
                        {isDragging ? 'Drop your document here' : 'Drag & drop or click to upload'}
                    </p>
                    <p className="text-sm text-[#999999] dark:text-[#666666]">
                        Supports PDF, DOCX, DOC, TXT • Up to 50MB
                    </p>
                </div>
            </motion.div>
        </div>
    );

    // ── PROCESSING STATE ─────────────────────────
    const processingState = (
        <div className="flex-1 flex flex-col items-center justify-center px-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-lg text-center"
            >
                <div className="relative w-20 h-20 mx-auto mb-6">
                    <div className="absolute inset-0 rounded-2xl bg-[#10a37f]/10 animate-pulse" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <FileText className="w-10 h-10 text-[#10a37f]" />
                    </div>
                    <svg className="absolute inset-0 w-20 h-20 animate-spin" style={{ animationDuration: '3s' }}>
                        <circle
                            cx="40" cy="40" r="36"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeDasharray="60 160"
                            className="text-[#10a37f]/40"
                        />
                    </svg>
                </div>

                <h2 className="text-xl font-semibold text-[#0d0d0d] dark:text-[#ececec] mb-2">
                    Analyzing Document
                </h2>
                <p className="text-sm text-[#666666] dark:text-[#b4b4b4] mb-1 truncate max-w-sm mx-auto">
                    {filename}
                </p>

                <div className="flex items-center justify-center gap-2 mt-4 mb-2">
                    <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#10a37f] animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-1.5 h-1.5 rounded-full bg-[#10a37f] animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-1.5 h-1.5 rounded-full bg-[#10a37f] animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-sm text-[#10a37f]">{progress}</span>
                </div>

                <div className="flex items-center justify-center gap-1.5 text-xs text-[#999999] dark:text-[#666666]">
                    <Clock className="w-3 h-3" />
                    <span>Elapsed: {formatTime(elapsedTime)}</span>
                </div>

                <p className="text-xs text-[#999999] dark:text-[#666666] mt-6 max-w-sm mx-auto leading-relaxed">
                    This process involves loading, chunking, and full legal analysis. Large documents may take a few minutes.
                </p>
            </motion.div>
        </div>
    );

    // ── DONE STATE ───────────────────────────────
    const doneState = (
        <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto py-6 px-4" ref={summaryRef}>
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6"
                >
                    <div className="flex items-start gap-4 py-2">
                        <div className="flex-shrink-0 mt-0.5">
                            <div className="w-7 h-7 rounded-sm bg-[#10a37f] flex items-center justify-center">
                                <FileText className="w-4 h-4 text-white" />
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#10a37f]/10 text-[#10a37f] border border-[#10a37f]/20">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Summary complete
                                </span>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#10a37f]/10 text-[#10a37f] border border-[#10a37f]/20">
                                    <FileText className="w-3 h-3" />
                                    {filename}
                                </span>
                            </div>

                            <div className="message-content text-[#0d0d0d] dark:text-[#ececec]">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {summary}
                                </ReactMarkdown>
                            </div>

                            <div className="flex items-center gap-1 mt-4 pt-3 border-t border-[#e5e5e5] dark:border-[#2f2f2f]">
                                <button
                                    onClick={() => handleCopy(summary)}
                                    className="p-1.5 rounded-lg hover:bg-[#f4f4f4] dark:hover:bg-[#2f2f2f] transition-colors"
                                    title="Copy summary"
                                >
                                    {copied ? (
                                        <Check className="w-4 h-4 text-[#10a37f]" />
                                    ) : (
                                        <Copy className="w-4 h-4 text-[#666666] dark:text-[#b4b4b4]" />
                                    )}
                                </button>
                                <button
                                    onClick={() => { setShowQA(true); setTimeout(() => qaInputRef.current?.focus(), 100); }}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                                        showQA
                                            ? 'bg-[#10a37f]/10 text-[#10a37f]'
                                            : 'hover:bg-[#f4f4f4] dark:hover:bg-[#2f2f2f] text-[#666666] dark:text-[#b4b4b4]'
                                    }`}
                                >
                                    <MessageSquare className="w-4 h-4" />
                                    Ask Questions
                                </button>
                                <button
                                    onClick={handleReset}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm hover:bg-[#f4f4f4] dark:hover:bg-[#2f2f2f] text-[#666666] dark:text-[#b4b4b4] transition-colors ml-auto"
                                >
                                    <Upload className="w-4 h-4" />
                                    New Document
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>

                <AnimatePresence>
                    {showQA && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="border-t border-[#e5e5e5] dark:border-[#2f2f2f] pt-6 mt-2">
                                <h3 className="flex items-center gap-2 text-sm font-medium text-[#0d0d0d] dark:text-[#ececec] mb-4">
                                    <BookOpen className="w-4 h-4 text-[#10a37f]" />
                                    Ask Questions About This Document
                                </h3>

                                {qaItems.length === 0 && (
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {suggestedQuestions.map((q, i) => (
                                            <button
                                                key={i}
                                                onClick={() => {
                                                    setQaQuestion(q);
                                                    qaInputRef.current?.focus();
                                                }}
                                                className="px-3 py-1.5 rounded-full text-xs border border-[#e5e5e5] dark:border-[#424242] text-[#666666] dark:text-[#b4b4b4] hover:bg-[#f4f4f4] dark:hover:bg-[#2f2f2f] hover:text-[#0d0d0d] dark:hover:text-[#ececec] transition-all duration-200"
                                            >
                                                {q}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {qaItems.map((item) => (
                                    <div key={item.id} className="mb-6">
                                        <div className="flex items-start gap-4 flex-row-reverse py-2">
                                            <div className="flex-shrink-0 mt-0.5">
                                                <div className="w-7 h-7 rounded-full bg-[#10a37f] flex items-center justify-center text-xs font-medium text-white">
                                                    <MessageSquare className="w-3.5 h-3.5" />
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0 max-w-[85%] flex flex-col items-end">
                                                <div className="px-4 py-2.5 rounded-2xl bg-[#f4f4f4] dark:bg-[#2f2f2f] text-[#0d0d0d] dark:text-[#ececec]">
                                                    <p className="text-base">{item.question}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-4 py-2">
                                            <div className="flex-shrink-0 mt-0.5">
                                                <div className="w-7 h-7 rounded-sm bg-[#10a37f] flex items-center justify-center">
                                                    <FileText className="w-4 h-4 text-white" />
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0 message-content text-[#0d0d0d] dark:text-[#ececec]">
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                    {item.answer}
                                                </ReactMarkdown>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {isAskingQuestion && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex items-start gap-4 py-2 mb-4"
                                    >
                                        <div className="flex-shrink-0 mt-0.5">
                                            <div className="w-7 h-7 rounded-sm bg-[#10a37f] flex items-center justify-center">
                                                <FileText className="w-4 h-4 text-white animate-pulse" />
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3">
                                                <Loader2 className="w-4 h-4 text-[#10a37f] animate-spin" />
                                                <span className="text-sm text-[#666666] dark:text-[#b4b4b4]">
                                                    Retrieving and reasoning...
                                                </span>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );

    // ── ERROR STATE ──────────────────────────────
    const errorState = (
        <div className="flex-1 flex flex-col items-center justify-center px-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md text-center"
            >
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-500/10 flex items-center justify-center">
                    <XCircle className="w-8 h-8 text-red-500" />
                </div>
                <h2 className="text-xl font-semibold text-[#0d0d0d] dark:text-[#ececec] mb-2">
                    Summarization Failed
                </h2>
                <div className="mt-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-left">
                    <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
                    </div>
                </div>
                <button
                    onClick={handleReset}
                    className="mt-6 px-6 py-2.5 rounded-xl bg-[#0d0d0d] dark:bg-[#ececec] text-white dark:text-[#0d0d0d] text-sm font-medium hover:opacity-80 transition-opacity"
                >
                    Try Again
                </button>
            </motion.div>
        </div>
    );

    const qaInputBar = showQA && status === 'done' && (
        <div className="px-4 pb-4 pt-2">
            <form onSubmit={(e) => { e.preventDefault(); handleAskQuestion(); }} className="max-w-3xl mx-auto">
                <div className="relative flex items-center gap-2 rounded-3xl px-3 py-2 transition-colors shadow-sm bg-[#f4f4f4] dark:bg-[#2f2f2f] border border-[#e5e5e5] dark:border-[#424242] focus-within:border-[#10a37f]/50 dark:focus-within:border-[#10a37f]/40">
                    <div className="p-1.5">
                        <BookOpen className="w-5 h-5 text-[#10a37f]" />
                    </div>
                    <textarea
                        ref={qaInputRef}
                        value={qaQuestion}
                        onChange={(e) => setQaQuestion(e.target.value)}
                        onKeyDown={handleQaKeyDown}
                        placeholder="Ask a question about the document..."
                        rows={1}
                        disabled={isAskingQuestion}
                        className="flex-1 bg-transparent resize-none outline-none max-h-[120px] disabled:opacity-50 text-base leading-6 py-0.5 text-[#0d0d0d] dark:text-[#ececec] placeholder-[#666666] dark:placeholder-[#8e8e8e]"
                    />
                    <button
                        type="submit"
                        disabled={!qaQuestion.trim() || isAskingQuestion}
                        className={`p-2 rounded-full transition-all ${(!qaQuestion.trim() || isAskingQuestion)
                            ? 'bg-[#d9d9d9] dark:bg-[#424242] text-[#999999] dark:text-[#666666] cursor-not-allowed'
                            : 'bg-[#10a37f] text-white hover:opacity-80'
                        }`}
                    >
                        {isAskingQuestion ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <ArrowUp className="w-5 h-5" />
                        )}
                    </button>
                </div>
            </form>
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-white dark:bg-[#212121]">
            {status === 'idle' && idleState}
            {(status === 'uploading' || status === 'pending' || status === 'processing') && processingState}
            {status === 'done' && doneState}
            {status === 'failed' && errorState}
            {qaInputBar}
        </div>
    );
}
