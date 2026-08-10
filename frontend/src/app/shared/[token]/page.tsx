'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Eye, Clock, Loader2, ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';

interface Message {
    id: string;
    role: string;
    content: string;
    responseTime?: number;
    createdAt: string;
    isStreaming?: boolean;
}

interface SharedChatData {
    title: string;
    model: string;
    messages: Message[];
    viewCount: number;
    createdAt: string;
}

export default function SharedChatPage() {
    const params = useParams();
    const token = params?.token as string;

    const [data, setData] = useState<SharedChatData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (token) {
            loadSharedChat();
        }
    }, [token]);

    const getBaseUrl = () => {
        return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    };

    const loadSharedChat = async () => {
        try {
            const baseUrl = getBaseUrl();
            const response = await fetch(`${baseUrl}/api/share/view/${token}`);
            if (!response.ok) {
                if (response.status === 404) {
                    setError('This shared chat was not found or has been revoked.');
                } else {
                    setError('Failed to load shared chat');
                }
                return;
            }
            const result = await response.json();
            setData(result);
        } catch (err) {
            setError('Failed to load shared chat');
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-[#0c9344]" />
                    <p className="text-gray-600 dark:text-gray-400">Loading shared chat...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        Chat Not Available
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#0c9344] text-white rounded-lg hover:bg-[#0c9344] transition-colors"
                    >
                        <ExternalLink className="w-4 h-4" />
                        Try JudicialGPT
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-black flex flex-col">
            {/* Header */}
            <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-2">
                <div className="max-w-3xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden">
                            <img
                                src="/judicial-logo.png"
                                alt="JudicialGPT"
                                className="w-full h-full object-cover rounded-full"
                                onError={(e) => {
                                    const target = e.currentTarget;
                                    const parent = target.parentElement;
                                    if (parent) {
                                        parent.className = 'w-8 h-8 rounded-full bg-[#0c9344] flex items-center justify-center';
                                        parent.innerHTML = '<div class="text-white text-xs font-bold" style="font-family: \'Century\', \'Century Gothic\', \'Times New Roman\', serif">JG</div>';
                                    }
                                }}
                            />
                        </div>
                        <div>
                            <h1 className="font-semibold text-gray-900 dark:text-white">
                                {data?.title || 'Shared Conversation'}
                            </h1>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Shared by JudicialGPT
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                            <Eye className="w-4 h-4" />
                            <span>{data?.viewCount} views</span>
                        </div>
                        <Link
                            href="/register"
                            className="px-3 py-1.5 bg-[#0c9344] text-white text-sm rounded-lg hover:bg-[#0c9344] transition-colors"
                        >
                            Try JudicialGPT
                        </Link>
                    </div>
                </div>
            </header>

            {/* Messages */}
            <main className="flex-1 w-full max-w-3xl mx-auto py-6 px-4">
                <div className="space-y-4">
                    <AnimatePresence>
                        {data?.messages.map((message, index) => (
                            <motion.div
                                key={message.id || index}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                            >
                                {/* Avatar */}
                                <div className="flex-shrink-0">
                                    {message.role === 'user' ? (
                                        <div className="w-7 h-7 rounded-full bg-[#0c9344] flex items-center justify-center text-xs font-medium text-white">
                                            U
                                        </div>
                                    ) : (
                                        <div className="w-7 h-7 rounded-full flex items-center justify-center overflow-hidden">
                                            <img
                                                src="/judicial-logo.png"
                                                alt="JudicialGPT"
                                                className="w-full h-full object-cover rounded-full"
                                                onError={(e) => {
                                                    const target = e.currentTarget;
                                                    const parent = target.parentElement;
                                                    if (parent) {
                                                        parent.className = 'w-7 h-7 rounded-full bg-[#0c9344] flex items-center justify-center';
                                                        parent.innerHTML = '<div class="text-white text-xs font-bold" style="font-family: \'Century\', \'Century Gothic\', \'Times New Roman\', serif">JG</div>';
                                                    }
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Message */}
                                <div className={`max-w-[80%] ${message.role === 'user' ? '' : ''}`}>
                                    <div className="rounded-lg px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white">
                                        {message.role === 'assistant' ? (
                                            <div className="prose prose-sm dark:prose-invert max-w-none" style={{ fontSize: '0.875rem', lineHeight: '1.5', fontFamily: 'inherit' }}>
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                    {message.content.replace(/^Answer:\s*/i, '').replace(/^Answer\s*/i, '')}
                                                </ReactMarkdown>
                                            </div>
                                        ) : (
                                            <p className="text-sm whitespace-pre-wrap" style={{ fontSize: '0.875rem', lineHeight: '1.5', fontFamily: 'inherit' }}>{message.content}</p>
                                        )}
                                    </div>
                                    {/* Response time */}
                                    {message.role === 'assistant' && message.responseTime && (
                                        <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                                            <Clock className="w-3 h-3" />
                                            <span>{message.responseTime}ms</span>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {/* CTA */}
                <div className="mt-8 p-6 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-[#0c9344]/20 dark:to-[#0c9344]/20 rounded-xl text-center">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        Want to create your own legal research?
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                        JudicialGPT helps you research legal cases, analyze documents, and get answers to your legal questions.
                    </p>
                    <Link
                        href="/register"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-[#0c9344] text-white rounded-lg hover:bg-[#0c9344] transition-colors font-medium"
                    >
                        Get Started for Free
                        <ExternalLink className="w-4 h-4" />
                    </Link>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-gray-200 dark:border-gray-800 py-4 mt-8">
                <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                    Powered by <span className="text-[#0c9344] font-medium">JudicialGPT</span>
                </p>
            </footer>
        </div>
    );
}
