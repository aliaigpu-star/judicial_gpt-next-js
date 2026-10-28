'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Scale, Gavel, Users } from 'lucide-react';
import { api } from '@/lib/api';
import type { ChatImage } from '@/lib/chatImage';
import { createStreamBuffer } from '@/lib/streamBuffer';
import { useChatLayout } from '@/app/chat/layout';
import ChatView, { type Message } from '@/components/chat/ChatView';

/**
 * Removes the closing "Note: …" disclaimer the law agents append to answers
 * (and the divider before it), so only the answer itself is shown and saved.
 */
const stripTrailingNote = (answer: string) => {
    const lines = answer.trimEnd().split('\n');
    const noteStart = lines.findLastIndex(line => /^[\s>*_]*(\*\*)?note\s*:/i.test(line));
    // Only a note at the very end (its own final paragraph) is removed.
    if (noteStart < 0 || lines.slice(noteStart + 1).some(line => line.trim() === '')) return answer;
    let cut = noteStart;
    while (cut > 0 && (lines[cut - 1].trim() === '' || /^\s*([-*_─]\s*){3,}$/.test(lines[cut - 1]))) cut--;
    return cut > 0 ? lines.slice(0, cut).join('\n') : answer;
};

export interface LawAgentChatProps {
    agentType: 'civil' | 'criminal' | 'family';
    title: string;
    description: string;
    apiUrl: string;
    accentColor: string;
    suggestedQueries: string[];
    portHint: string;
    /** A saved conversation to continue (when reopened from the sidebar). */
    initialConversation?: { id: string; messages: Message[] };
}

// Per-agent display metadata and the API shape each backend actually expects.
// Civil/Criminal Law Agents expose POST /query (form-encoded); the Family Law
// Agent exposes POST /ask (JSON) — see api_family.py's AskRequest/AskResponse.
const AGENT_META: Record<LawAgentChatProps['agentType'], { name: string; ragLabel: string; icon: typeof Scale; endpoint: string }> = {
    civil: { name: 'Civil', ragLabel: 'Civil Law RAG', icon: Scale, endpoint: '/query' },
    criminal: { name: 'Criminal', ragLabel: 'Criminal Law RAG', icon: Gavel, endpoint: '/query' },
    family: { name: 'Family', ragLabel: 'Family Law RAG', icon: Users, endpoint: '/ask' },
};

const UPLOAD_PREFIX = /^(?:📄|🖼️) Uploaded:.*\n\n/;

export default function LawAgentChat({
    agentType,
    title,
    description,
    apiUrl,
    accentColor,
    suggestedQueries,
    portHint,
    initialConversation,
}: LawAgentChatProps) {
    const [messages, setMessages] = useState<Message[]>(initialConversation?.messages ?? []);
    const [conversationId, setConversationId] = useState<string | null>(initialConversation?.id ?? null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    // Set while an answer is being typed out; calling it freezes the answer where it is.
    const stopRef = useRef<(() => void) | null>(null);

    const { setConversations, user } = useChatLayout();
    const meta = AGENT_META[agentType];

    /** Sends the question to the agent and returns its answer. */
    const askAgent = async (query: string): Promise<string> => {
        // The Family Law Agent's POST /ask takes a JSON body; Civil/Criminal
        // Law's POST /query takes form-encoded fields (Form(...) on the
        // FastAPI side) - send whichever shape each backend actually expects.
        const isJsonAgent = meta.endpoint === '/ask';
        const headers: Record<string, string> = { 'ngrok-skip-browser-warning': 'true' };
        if (isJsonAgent) headers['Content-Type'] = 'application/json';

        // authFetch adds the session token and renews it if it has expired.
        const response = await api.authFetch(`${apiUrl}${meta.endpoint}`, {
            method: 'POST',
            headers,
            body: isJsonAgent
                ? JSON.stringify({ query, session_id: sessionId || undefined })
                : new URLSearchParams({ query, ...(sessionId ? { session_id: sessionId } : {}) }),
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            if (response.status === 401) throw new Error('Your session has expired. Please sign in again.');
            throw new Error(errData.detail || errData.error || `Request failed (${response.status})`);
        }

        const data = await response.json();
        if (data.session_id) setSessionId(data.session_id);
        return stripTrailingNote(data.answer || '');
    };

    const errorText = (err: any) =>
        `⚠️ ${err.message?.includes('Failed to fetch')
            ? `Cannot connect to the ${title} agent. Make sure it is running on port ${portHint}.`
            : err.message || 'Something went wrong'}`;

    /** Types the answer into the message with the same animation as the main chat; returns the text shown. */
    const typeAnswer = async (id: string, answer: string): Promise<string> => {
        const buffer = createStreamBuffer((text) => {
            setMessages(prev => prev.some(m => m.id === id)
                ? prev.map(m => (m.id === id ? { ...m, content: text } : m))
                : [...prev, { id, role: 'assistant', content: text, createdAt: new Date().toISOString() }]);
        }, 15);
        let stopped: string | null = null;
        stopRef.current = () => { stopped = buffer.stop(); };
        try {
            buffer.push(answer);
            await buffer.waitForComplete();
            return stopped ?? answer;
        } finally {
            buffer.destroy();
            stopRef.current = null;
        }
    };

    /** Text read from attached images, since the agents' knowledge bases only take text. */
    const readImages = async (images: ChatImage[]) => {
        const texts = await Promise.all(images.map(async (image) => {
            const blob = await (await fetch(`data:${image.mimeType};base64,${image.data}`)).blob();
            const { text } = await api.readImageText(new File([blob], 'image.jpg', { type: image.mimeType }));
            return text;
        }));
        return texts.filter(Boolean).map(text => `Text from the attached image:\n${text}`).join('\n\n');
    };

    const handleSend = useCallback(async (content: string, displayContent?: string, _webEnabled?: boolean, images?: ChatImage[]) => {
        if (!content.trim()) return;
        setIsProcessing(true);

        const shown = displayContent || content;
        const userId = `temp_user_${Date.now()}`;
        const assistantId = `temp_assistant_${Date.now()}`;
        setMessages(prev => [...prev, { id: userId, role: 'user', content: shown, createdAt: new Date().toISOString() }]);

        try {
            const imageText = images?.length ? await readImages(images) : '';
            const answer = await typeAnswer(assistantId, await askAgent(imageText ? `${imageText}\n\n${content}` : content));

            try {
                let convId = conversationId;
                if (!convId) {
                    const subject = shown.replace(UPLOAD_PREFIX, '').trim() || content;
                    const { conversation } = await api.createConversation(`${meta.name} Law: ${subject.slice(0, 40)}`);
                    convId = conversation.id as string;
                    setConversationId(convId);
                    setConversations(prev => [{ ...conversation, messages: [] }, ...prev]);
                }
                const { message: savedUser } = await api.createMessage(convId, 'user', shown);
                const { message: savedAnswer } = await api.createMessage(convId, 'assistant', answer);
                setMessages(prev => prev.map(m => (m.id === userId ? { ...m, id: savedUser.id } : m.id === assistantId ? { ...m, id: savedAnswer.id } : m)));
            } catch {
                // Non-blocking if backend conversation save fails
            }
        } catch (err: any) {
            setMessages(prev => [...prev, { id: `temp_error_${Date.now()}`, role: 'assistant', content: errorText(err) }]);
        } finally {
            setIsProcessing(false);
        }
    }, [conversationId, sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleRegenerate = async (messageId: string) => {
        const index = messages.findIndex(m => m.id === messageId);
        if (index < 1 || messages[index - 1].role !== 'user') return;

        setIsProcessing(true);
        try {
            const answer = await askAgent(messages[index - 1].content.replace(UPLOAD_PREFIX, ''));
            setMessages(prev => prev.map(m => (m.id === messageId ? { ...m, content: answer } : m)));
            if (!messageId.startsWith('temp_')) await api.updateMessage(messageId, answer).catch(() => undefined);
        } catch (err: any) {
            setMessages(prev => [...prev, { id: `temp_error_${Date.now()}`, role: 'assistant', content: errorText(err) }]);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <ChatView
            conversation={{ id: conversationId ?? '', title, messages }}
            onSend={handleSend}
            onStop={() => stopRef.current?.()}
            user={user}
            isProcessingMessage={isProcessing}
            isWebSearchMode={false}
            webSearchEnabled={false}
            setWebSearchEnabled={() => undefined}
            onRegenerate={handleRegenerate}
            onUpdateMessages={setMessages}
            agent={{ title, description, accentColor, icon: meta.icon, badge: meta.ragLabel, suggestions: suggestedQueries }}
        />
    );
}
