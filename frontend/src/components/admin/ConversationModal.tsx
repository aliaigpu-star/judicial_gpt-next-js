'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    X,
    MessageSquare,
    User,
    Bot,
    Calendar,
    Loader2
} from 'lucide-react';
import { adminApi, type ConversationDetails } from '@/lib/adminApi';

interface ConversationModalProps {
    conversationId: string;
    onClose: () => void;
}

export default function ConversationModal({ conversationId, onClose }: ConversationModalProps) {
    const [conversation, setConversation] = useState<ConversationDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadConversation = async () => {
            try {
                const { conversation } = await adminApi.getConversation(conversationId);
                setConversation(conversation);
            } catch (err: any) {
                setError(err.message || 'Failed to load conversation');
            } finally {
                setLoading(false);
            }
        };

        loadConversation();
    }, [conversationId]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-800 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#00a859]/10 rounded-lg">
                            <MessageSquare className="h-5 w-5 text-[#00a859]" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">
                                {conversation?.title || 'Loading...'}
                            </h2>
                            {conversation?.user && (
                                <p className="text-sm text-gray-400">
                                    {conversation.user.name || conversation.user.email}
                                </p>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <X className="h-5 w-5 text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 text-[#00a859] animate-spin" />
                        </div>
                    ) : error ? (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-center">
                            {error}
                        </div>
                    ) : conversation ? (
                        <div className="space-y-4">
                            {/* Conversation Info */}
                            <div className="bg-gray-800/50 rounded-xl p-4 mb-6">
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="flex items-center gap-2">
                                        <User className="h-4 w-4 text-blue-400" />
                                        <div>
                                            <p className="text-xs text-gray-500">User</p>
                                            <p className="text-sm text-white">
                                                {conversation.user?.name || conversation.user?.email || 'Unknown'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <MessageSquare className="h-4 w-4 text-purple-400" />
                                        <div>
                                            <p className="text-xs text-gray-500">Messages</p>
                                            <p className="text-sm text-white">{conversation.messages.length}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-[#00a859]" />
                                        <div>
                                            <p className="text-xs text-gray-500">Created</p>
                                            <p className="text-sm text-white">
                                                {new Date(conversation.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="space-y-4">
                                {conversation.messages.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        No messages in this conversation
                                    </div>
                                ) : (
                                    conversation.messages.map((message, index) => (
                                        <motion.div
                                            key={message.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            className={`flex gap-3 ${
                                                message.role === 'assistant' ? '' : ''
                                            }`}
                                        >
                                            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                                                message.role === 'assistant'
                                                    ? 'bg-[#00a859]/20 text-[#00a859]'
                                                    : 'bg-blue-500/20 text-blue-400'
                                            }`}>
                                                {message.role === 'assistant' ? (
                                                    <Bot className="h-4 w-4" />
                                                ) : (
                                                    <User className="h-4 w-4" />
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`text-sm font-medium ${
                                                        message.role === 'assistant'
                                                            ? 'text-[#00a859]'
                                                            : 'text-blue-400'
                                                    }`}>
                                                        {message.role === 'assistant' ? 'JudicialGPT' : 'User'}
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        {new Date(message.createdAt).toLocaleTimeString()}
                                                    </span>
                                                </div>
                                                <div className={`rounded-xl p-4 ${
                                                    message.role === 'assistant'
                                                        ? 'bg-gray-800/50 border border-gray-700'
                                                        : 'bg-blue-500/10 border border-blue-500/20'
                                                }`}>
                                                    <p className="text-gray-300 whitespace-pre-wrap text-sm leading-relaxed">
                                                        {message.content}
                                                    </p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </div>
                    ) : null}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end p-4 border-t border-gray-800 flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-xl transition-all"
                    >
                        Close
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
