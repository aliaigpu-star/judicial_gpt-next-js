'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { createStreamBuffer } from '@/lib/streamBuffer';
import ChatView from '@/components/chat/ChatView';
import { useChatLayout } from './layout';

interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    responseTime?: number;
    currentVersion?: number;
    totalVersions?: number;
    createdAt?: string;
    isStreaming?: boolean;
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

export default function ChatPage() {
    const router = useRouter();
    const {
        setConversations,
        user,
        isTemporaryMode,
        newChatTrigger,
    } = useChatLayout();

    const [newChatMessages, setNewChatMessages] = useState<Message[]>([]);
    const [isProcessingMessage, setIsProcessingMessage] = useState(false);
    const [isWebSearchMode, setIsWebSearchMode] = useState(false);
    const [webSearchEnabled, setWebSearchEnabled] = useState(false);

    // Track the conversation ID once created so subsequent messages go to the same conversation
    const createdConversationIdRef = useRef<string | null>(null);

    // Reset state for new chat when triggered from sidebar/layout
    useEffect(() => {
        if (newChatTrigger > 0) {
            setNewChatMessages([]);
            createdConversationIdRef.current = null;
            window.history.replaceState(null, '', '/chat');
        }
    }, [newChatTrigger]);

    const handleSend = useCallback(async (content: string, displayContent?: string, webEnabled = false) => {
        if (!content.trim()) return;

        setIsProcessingMessage(true);
        setIsWebSearchMode(webEnabled);

        try {
            // TEMPORARY MODE - Don't save to database, keep messages in memory only
            if (isTemporaryMode) {
                // Add user message locally
                const userMessage: Message = {
                    id: `temp_user_${Date.now()}`,
                    role: 'user',
                    content: displayContent || content,
                    createdAt: new Date().toISOString()
                };
                setNewChatMessages(prev => [...prev, userMessage]);

                const assistantMessageId = `temp_assistant_${Date.now()}`;

                // Get AI response
                const messagesForAI = [
                    ...newChatMessages.map(m => ({ role: m.role, content: m.content })),
                    { role: 'user', content }
                ];

                let finalContent = '';
                let responseTime = 0;

                if (webEnabled) {
                    const response = await api.webSearch(content);
                    finalContent = response.answer;
                    responseTime = response.responseTime || 0;

                    setNewChatMessages(prev => [...prev, {
                        id: assistantMessageId,
                        role: 'assistant',
                        content: finalContent,
                        responseTime,
                        createdAt: new Date().toISOString()
                    }]);
                } else {
                    const buffer = createStreamBuffer((bufferedContent) => {
                        setNewChatMessages(prev => {
                            const exists = prev.some(m => m.id === assistantMessageId);
                            if (exists) {
                                return prev.map(m =>
                                    m.id === assistantMessageId
                                        ? { ...m, content: bufferedContent }
                                        : m
                                );
                            } else {
                                return [...prev, {
                                    id: assistantMessageId,
                                    role: 'assistant',
                                    content: bufferedContent,
                                    createdAt: new Date().toISOString()
                                }];
                            }
                        });
                    }, 15); // Set character delay for readable speed

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

                        // Wait for the typing animation to reach the end
                        await buffer.waitForComplete();

                        // Update final state with response time
                        setNewChatMessages(prev => prev.map(m =>
                            m.id === assistantMessageId
                                ? { ...m, responseTime }
                                : m
                        ));
                    } finally {
                        buffer.destroy();
                    }
                }

                // Stay on the same page, no navigation, no database save
                return;
            }

            // NORMAL MODE - Save to database
            let conversationId = createdConversationIdRef.current;

            // Create conversation only on the first message
            if (!conversationId) {
                const tempTitle = content.slice(0, 30) + (content.length > 30 ? '...' : '');
                const { conversation } = await api.createConversation(tempTitle);
                conversationId = conversation.id;
                createdConversationIdRef.current = conversationId;

                // Add to sidebar list immediately
                setConversations(prev => [{ ...conversation, messages: [] }, ...prev]);

                // Generate smart title asynchronously (don't block)
                api.generateTitle(displayContent || content).then(async ({ title }) => {
                    if (title && title !== tempTitle) {
                        await api.renameConversation(conversation.id, title);
                        setConversations(prev => prev.map(c =>
                            c.id === conversation.id ? { ...c, title } : c
                        ));
                    }
                }).catch(err => {
                    console.error('Failed to generate title:', err);
                });

                // Silently update the URL bar without triggering a page navigation
                // This prevents the blink caused by unmounting this page and mounting [id] page
                window.history.replaceState(null, '', `/chat/${conversationId}`);
            }

            // Save user message
            const { message: savedUserMsg } = await api.createMessage(conversationId!, 'user', displayContent || content);

            // Add user message to local state for display
            const userMessage: Message = {
                id: savedUserMsg.id,
                role: 'user',
                content: displayContent || content,
                createdAt: new Date().toISOString()
            };
            setNewChatMessages(prev => [...prev, userMessage]);

            const assistantMessageId = `temp_assistant_${Date.now()}`;

            // Get AI response - include all messages in context
            const messagesForAI = [
                ...newChatMessages.map(m => ({ role: m.role, content: m.content })),
                { role: 'user', content }
            ].slice(-10);

            let finalContent = '';
            let responseTime = 0;

            if (webEnabled) {
                const response = await api.webSearch(content);
                finalContent = response.answer;
                responseTime = response.responseTime || 0;

                // Add with temp id first so the message appears immediately
                setNewChatMessages(prev => [...prev, {
                    id: assistantMessageId,
                    role: 'assistant',
                    content: finalContent,
                    responseTime,
                    createdAt: new Date().toISOString()
                }]);
            } else {
                const buffer = createStreamBuffer((bufferedContent) => {
                    setNewChatMessages(prev => {
                        const exists = prev.some(m => m.id === assistantMessageId);
                        if (exists) {
                            return prev.map(m =>
                                m.id === assistantMessageId
                                    ? { ...m, content: bufferedContent }
                                    : m
                            );
                        } else {
                            return [...prev, {
                                id: assistantMessageId,
                                role: 'assistant',
                                content: bufferedContent,
                                createdAt: new Date().toISOString()
                            }];
                        }
                    });
                }, 15); // Set character delay for readable speed
                
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
                    
                    // Wait for the typing animation to reach the end
                    await buffer.waitForComplete();
                    
                    // Update final state with response time
                    setNewChatMessages(prev => prev.map(m =>
                        m.id === assistantMessageId
                            ? { ...m, responseTime }
                            : m
                    ));
                } finally {
                    buffer.destroy();
                }
            }

            // Save assistant message to backend and capture the real DB id
            const { message: savedAssistantMsg } = await api.createMessage(conversationId!, 'assistant', finalContent, responseTime);

            // Swap the temp id for the real DB id so handleRegenerate can call api.updateMessage
            setNewChatMessages(prev => prev.map(m =>
                m.id === assistantMessageId
                    ? {
                        ...m,
                        id: savedAssistantMsg.id,
                        responseTime,
                        isStreaming: false,
                        currentVersion: savedAssistantMsg.currentVersion,
                        totalVersions: savedAssistantMsg.totalVersions,
                      }
                    : m
            ));

            // NO router.push() here — the URL is already updated, page stays mounted, no blink!

        } catch (error) {
            console.error('Failed to send message:', error);
        } finally {
            setIsProcessingMessage(false);
            setIsWebSearchMode(false);
        }
    }, [router, setConversations, isTemporaryMode, newChatMessages]);

    // Handle message regeneration for conversations owned by this page
    // (chat/page.tsx stays mounted via replaceState, so it must implement this itself)
    const handleRegenerate = useCallback(async (messageId: string) => {
        // No regenerate in temporary mode — messages have no DB ids
        if (isTemporaryMode) return;

        const conversationId = createdConversationIdRef.current;
        if (!conversationId) return;

        const messageIndex = newChatMessages.findIndex(m => m.id === messageId);
        if (messageIndex === -1 || newChatMessages[messageIndex].role !== 'assistant') return;

        // Find the preceding user message to build context
        let userMessageContent = '';
        for (let i = messageIndex - 1; i >= 0; i--) {
            if (newChatMessages[i].role === 'user') {
                userMessageContent = newChatMessages[i].content;
                break;
            }
        }
        if (!userMessageContent) return;

        setIsProcessingMessage(true);

        try {
            const messagesForAI = newChatMessages
                .slice(0, messageIndex)
                .map(m => ({ role: m.role, content: m.content }));

            let newContent = '';
            let responseTime = 0;

            const buffer = createStreamBuffer((bufferedContent) => {
                setNewChatMessages(prev => prev.map(m =>
                    m.id === messageId
                        ? { ...m, content: bufferedContent, isStreaming: true }
                        : m
                ));
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

                // Clear streaming flag once animation completes
                setNewChatMessages(prev => prev.map(m =>
                    m.id === messageId
                        ? { ...m, isStreaming: false }
                        : m
                ));
            } finally {
                buffer.destroy();
            }

            // Persist the new version to the DB
            const savedMsg = await api.updateMessage(messageId, newContent);

            // Update message state to match DB shape
            setNewChatMessages(prev => prev.map(m =>
                m.id === messageId
                    ? {
                        ...m,
                        content: newContent,
                        responseTime,
                        isStreaming: false,
                        currentVersion: savedMsg.current_version,
                        totalVersions: savedMsg.total_versions,
                      }
                    : m
            ));
        } catch (error) {
            console.error('Failed to regenerate:', error);
        } finally {
            setIsProcessingMessage(false);
        }
    }, [isTemporaryMode, newChatMessages]);

    // New chat - no conversation selected
    const newChatConversation: Conversation = {
        id: createdConversationIdRef.current || 'new',
        title: isTemporaryMode ? 'Temporary Chat' : 'New Chat',
        messages: newChatMessages,
        isTemporary: isTemporaryMode
    };

    return (
        <ChatView
            conversation={newChatConversation}
            onSend={handleSend}
            user={user}
            isProcessingMessage={isProcessingMessage}
            isWebSearchMode={isWebSearchMode}
            webSearchEnabled={webSearchEnabled}
            setWebSearchEnabled={setWebSearchEnabled}
            onRegenerate={isTemporaryMode ? undefined : handleRegenerate}
            isTemporaryMode={isTemporaryMode}
        />
    );
}
