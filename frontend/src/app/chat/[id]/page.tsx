'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { createStreamBuffer } from '@/lib/streamBuffer';
import ChatView from '@/components/chat/ChatView';
import { useChatLayout } from '../layout';

interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    responseTime?: number;
    currentVersion?: number;
    totalVersions?: number;
    createdAt?: string;
    isStreaming?: boolean;
    metadata?: {
        feedback?: 'like' | 'dislike';
    };
}

interface Conversation {
    id: string;
    title: string;
    model?: string;
    isPinned?: boolean;
    isArchived?: boolean;
    messages: Message[];
    isTemporary?: boolean;
}

export default function ConversationPage() {
    const router = useRouter();
    const params = useParams();
    const conversationId = params?.id as string;

    const {
        setConversations,
        user,
    } = useChatLayout();

    const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessingMessage, setIsProcessingMessage] = useState(false);
    const [isWebSearchMode, setIsWebSearchMode] = useState(false);
    const [webSearchEnabled, setWebSearchEnabled] = useState(false);
    const [notFound, setNotFound] = useState(false);

    // Load specific conversation when ID changes
    useEffect(() => {
        if (user && conversationId && !conversationId.startsWith('temp_')) {
            loadConversation(conversationId);
        }
    }, [user, conversationId]);

    const loadConversation = async (id: string) => {
        try {
            setIsLoading(true);
            setNotFound(false);
            const { conversation } = await api.getConversation(id);
            setCurrentConversation({
                ...conversation,
                messages: conversation.messages || []
            });

            // Update in list
            setConversations(prev => prev.map(c =>
                c.id === id ? { ...c, messages: conversation.messages || [] } : c
            ));
        } catch (error: any) {
            console.error('Failed to load conversation:', error);
            if (error?.status === 404 || error?.code === 'NOT_FOUND') {
                setNotFound(true);
            } else {
                router.push('/chat');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleSend = useCallback(async (content: string, displayContent?: string, webEnabled = false) => {
        if (!content.trim()) return;

        setIsProcessingMessage(true);
        setIsWebSearchMode(webEnabled);

        try {
            let actualConversationId = conversationId;

            // Create new conversation if needed
            if (!conversationId || conversationId.startsWith('temp_')) {
                const title = content.slice(0, 30) + (content.length > 30 ? '...' : '');
                const { conversation } = await api.createConversation(title);
                actualConversationId = conversation.id;

                setConversations(prev => [{ ...conversation, messages: [] }, ...prev]);

                // Navigate to new conversation URL
                router.push(`/chat/${actualConversationId}`);
            }

            // Create user message
            const userMessage: Message = {
                id: `temp_user_${Date.now()}`,
                role: 'user',
                content: displayContent || content,
                createdAt: new Date().toISOString()
            };

            // Add user message to current conversation
            setCurrentConversation(prev => prev ? {
                ...prev,
                messages: [...prev.messages, userMessage]
            } : null);

            // Save user message to backend
            const { message: savedUserMsg } = await api.createMessage(
                actualConversationId,
                'user',
                displayContent || content
            );

            // Update with saved message ID
            setCurrentConversation(prev => prev ? {
                ...prev,
                messages: prev.messages.map(m =>
                    m.id === userMessage.id ? { ...m, id: savedUserMsg.id } : m
                )
            } : null);

            const assistantMessageId = `temp_assistant_${Date.now()}`;

            let finalContent = '';
            let responseTime = 0;

            // Prepare messages for AI
            const messagesForAI = [...(currentConversation?.messages || []), { role: 'user', content }]
                .slice(-10)
                .map(m => ({ role: m.role, content: m.content }));

            if (webEnabled) {
                const response = await api.webSearch(content);
                finalContent = response.answer;
                responseTime = response.responseTime || 0;

                // Create assistant message with content
                setCurrentConversation(prev => prev ? {
                    ...prev,
                    messages: [...prev.messages, {
                        id: assistantMessageId,
                        role: 'assistant' as const,
                        content: finalContent,
                        responseTime,
                        createdAt: new Date().toISOString()
                    }]
                } : null);
            } else {
                const buffer = createStreamBuffer((bufferedContent) => {
                    setCurrentConversation(prev => {
                        if (!prev) return null;
                        const exists = prev.messages.some(m => m.id === assistantMessageId);
                        if (exists) {
                            return {
                                ...prev,
                                messages: prev.messages.map(m =>
                                    m.id === assistantMessageId
                                        ? { ...m, content: bufferedContent }
                                        : m
                                )
                            };
                        } else {
                            return {
                                ...prev,
                                messages: [...prev.messages, {
                                    id: assistantMessageId,
                                    role: 'assistant' as const,
                                    content: bufferedContent,
                                    createdAt: new Date().toISOString()
                                }]
                            };
                        }
                    });
                }, 15);
                
                try {
                    await api.sendChatMessageStream(
                        messagesForAI,
                        (streamedContent) => {
                            buffer.push(streamedContent);
                            finalContent = streamedContent;
                        },
                        (time) => {
                            responseTime = time;
                        }
                    );
                    
                    await buffer.waitForComplete();
                } finally {
                    buffer.destroy();
                }
            }

            // Save assistant message to backend
            const { message: savedAssistantMsg } = await api.createMessage(
                actualConversationId,
                'assistant',
                finalContent,
                responseTime
            );

            // Update with saved message ID
            setCurrentConversation(prev => prev ? {
                ...prev,
                messages: prev.messages.map(m =>
                    m.id === assistantMessageId
                        ? { ...m, id: savedAssistantMsg.id, responseTime }
                        : m
                )
            } : null);

        } catch (error) {
            console.error('Failed to send message:', error);
        } finally {
            setTimeout(() => {
                setIsProcessingMessage(false);
                setIsWebSearchMode(false);
            }, 100);
        }
    }, [conversationId, currentConversation, router, setConversations]);

    // Handle message regeneration
    const handleRegenerate = useCallback(async (messageId: string) => {
        if (!currentConversation) return;

        const messageIndex = currentConversation.messages.findIndex(m => m.id === messageId);
        if (messageIndex === -1 || currentConversation.messages[messageIndex].role !== 'assistant') return;

        let userMessageContent = '';
        for (let i = messageIndex - 1; i >= 0; i--) {
            if (currentConversation.messages[i].role === 'user') {
                userMessageContent = currentConversation.messages[i].content;
                break;
            }
        }

        if (!userMessageContent) return;

        setIsProcessingMessage(true);

        try {
            const messagesForAI = currentConversation.messages
                .slice(0, messageIndex)
                .map(m => ({ role: m.role, content: m.content }));

            let newContent = '';
            let responseTime = 0;

            const buffer = createStreamBuffer((bufferedContent) => {
                setCurrentConversation(prev => prev ? {
                    ...prev,
                    messages: prev.messages.map(m =>
                        m.id === messageId
                            ? { ...m, content: bufferedContent, isStreaming: true }
                            : m
                    )
                } : null);
            }, 15);

            try {
                await api.sendChatMessageStream(
                    messagesForAI,
                    (streamedContent) => {
                        buffer.push(streamedContent);
                        newContent = streamedContent;
                    },
                    (time) => {
                        responseTime = time;
                    }
                );

                await buffer.waitForComplete();
                
                // Mark as finished streaming
                setCurrentConversation(prev => prev ? {
                    ...prev,
                    messages: prev.messages.map(m =>
                        m.id === messageId
                            ? { ...m, isStreaming: false }
                            : m
                    )
                } : null);
            } finally {
                buffer.destroy();
            }

            const savedMsg = await api.updateMessage(messageId, newContent);
            
            // Update the message in the current conversation state immediately
            setCurrentConversation(prev => prev ? {
                ...prev,
                messages: prev.messages.map(m => 
                    m.id === messageId 
                        ? { 
                            ...m, 
                            content: newContent, 
                            currentVersion: savedMsg.current_version,
                            totalVersions: savedMsg.total_versions 
                          } 
                        : m
                )
            } : null);
        } catch (error) {
            console.error('Failed to regenerate:', error);
        } finally {
            setIsProcessingMessage(false);
        }
    }, [currentConversation, conversationId]);

    // Handle edit message
    const handleEditMessage = useCallback(async (messageId: string, newContent: string) => {
        if (!currentConversation) return;

        const messageIndex = currentConversation.messages.findIndex(m => m.id === messageId);
        if (messageIndex === -1) return;

        await api.updateMessage(messageId, newContent);

        if (currentConversation.messages[messageIndex].role === 'user') {
            setCurrentConversation(prev => prev ? {
                ...prev,
                messages: prev.messages.map((m, i) =>
                    i === messageIndex ? { ...m, content: newContent } : m
                )
            } : null);

            if (messageIndex + 1 < currentConversation.messages.length) {
                const nextMessage = currentConversation.messages[messageIndex + 1];
                if (nextMessage.role === 'assistant') {
                    await handleRegenerate(nextMessage.id);
                }
            }
        }
    }, [currentConversation, handleRegenerate]);

    // Handle updating messages from ChatView
    const handleUpdateMessages = useCallback((messages: Message[]) => {
        setCurrentConversation(prev => prev ? { ...prev, messages } : null);
    }, []);

    // Show subtle loading skeleton instead of full spinner
    if (isLoading) {
        return (
            <div className="flex flex-col h-full bg-white dark:bg-black animate-fadeIn">
                {/* Skeleton messages area */}
                <div className="flex-1 overflow-hidden px-4 py-6">
                    <div className="max-w-3xl mx-auto space-y-4">
                        {/* Skeleton message bubbles */}
                        {[1, 2, 3].map((i) => (
                            <div key={i} className={`flex gap-2 ${i % 2 === 1 ? 'flex-row-reverse' : 'flex-row'} animate-pulse`}>
                                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700" />
                                <div className={`${i % 2 === 1 ? 'ml-auto' : ''} max-w-[60%]`}>
                                    <div className="rounded-lg bg-gray-100 dark:bg-gray-800 px-3 py-2 space-y-2">
                                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                                        {i % 2 === 0 && (
                                            <>
                                                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
                                                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-4/6" />
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                {/* Skeleton input area */}
                <div className="p-4">
                    <div className="max-w-3xl mx-auto">
                        <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-3 animate-pulse">
                            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-48" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Show not-found UI if conversation doesn't exist
    if (notFound) {
        return (
            <div className="flex-1 h-full flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <div className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4 flex items-center justify-center">
                        <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                        Conversation Not Found
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        The conversation you're looking for doesn't exist or may have been deleted.
                    </p>
                    <button
                        onClick={() => router.push('/chat')}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                        Start New Chat
                    </button>
                </div>
            </div>
        );
    }

    return (
        <ChatView
            conversation={currentConversation}
            onSend={handleSend}
            user={user}
            isProcessingMessage={isProcessingMessage}
            isWebSearchMode={isWebSearchMode}
            webSearchEnabled={webSearchEnabled}
            setWebSearchEnabled={setWebSearchEnabled}
            onRegenerate={handleRegenerate}
            onEditMessage={handleEditMessage}
            onUpdateMessages={handleUpdateMessages}
        />
    );
}
