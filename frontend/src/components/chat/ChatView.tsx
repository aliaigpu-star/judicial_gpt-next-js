'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Mic, Globe, Plus, ArrowUp, ArrowDown,
    FileText, Image as ImageIcon, X, StopCircle, Loader2,
    Copy, Edit3, ThumbsUp, ThumbsDown, RefreshCw, ChevronLeft, ChevronRight, Check, Upload, Clock, Share2,
    Phone, ShieldAlert, CheckCircle2, ChevronDown, ChevronUp, ExternalLink, AlertTriangle
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { api } from '@/lib/api';
import { copyCleanText } from '@/lib/textUtils';
import ShareModal from '@/components/modals/ShareModal';
import TypingAnimation from '@/components/ui/TypingAnimation';
import VoiceAgent from '@/components/chat/VoiceAgent';

interface SourceResult {
    source_name: string;
    domain: string;
    url: string;
    status: string;
    content_preview?: string;
}

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
        judgmentSearch?: {
            successfulSources: number;
            blockedSources: string[];
            sourcesSearched: SourceResult[];
        };
    };
}

interface Conversation {
    id: string;
    title: string;
    messages: Message[];
    model?: string;
    isPinned?: boolean;
    isArchived?: boolean;
}

interface ChatViewProps {
    conversation: Conversation | null;
    onSend: (content: string, displayContent?: string, webEnabled?: boolean) => Promise<void>;
    user: any;
    isProcessingMessage: boolean;
    isWebSearchMode: boolean;
    webSearchEnabled: boolean;
    setWebSearchEnabled: (enabled: boolean) => void;
    onRegenerate?: (messageId: string) => Promise<void>;
    onEditMessage?: (messageId: string, newContent: string) => Promise<void>;
    onUpdateMessages?: (messages: Message[]) => void;
    isTemporaryMode?: boolean;
}

// Judgment Writer (Civil/Criminal) responses are plain, whitespace-aligned
// legal documents, not markdown — running them through ReactMarkdown collapses
// the alignment spacing and turns deeply-indented lines (e.g. "VERSUS") into
// code blocks. Detect that format by its distinctive markers and render it
// as preserved plain text instead, while leaving genuine markdown (from the
// general chat / Law Agent / other flows sharing this component) untouched.
const isJudgmentDocument = (text: string) => text.includes('IN THE COURT OF') || text.includes('─────');

// Strip stray lone-underscore artifact lines the model occasionally emits
// around section separators, without touching the real "─────" dividers.
const cleanJudgmentText = (text: string) =>
    text.split('\n').filter(line => !/^\s*_+\s*$/.test(line)).join('\n');

// Judgment documents are rendered as plain text (see isJudgmentDocument
// above) to preserve literal spacing/alignment, but the model still
// sometimes emits inline markdown (**bold**, *italic*) and "#"-style
// headings within that plain-text layout. Parse just those inline/heading
// bits by hand rather than handing the whole thing to ReactMarkdown, which
// would collapse the alignment spacing again.
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

// Status styling for the Judgment Search sources list (mirrors JudgmentSearch.tsx)
const getSourceStatusIcon = (status: string) => {
    switch (status) {
        case 'success':
            return <CheckCircle2 className="w-3.5 h-3.5 text-[#10a37f]" />;
        case 'blocked':
            return <ShieldAlert className="w-3.5 h-3.5 text-[#f59e0b]" />;
        case 'error':
            return <X className="w-3.5 h-3.5 text-red-400" />;
        default:
            return <AlertTriangle className="w-3.5 h-3.5 text-gray-400" />;
    }
};

const getSourceStatusBadgeClass = (status: string) => {
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

export default function ChatView({
    conversation,
    onSend,
    user,
    isProcessingMessage,
    isWebSearchMode,
    webSearchEnabled,
    setWebSearchEnabled,
    onRegenerate,
    onEditMessage,
    onUpdateMessages,
    isTemporaryMode
}: ChatViewProps) {
    const [input, setInput] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [isProcessingFile, setIsProcessingFile] = useState(false);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
    const [showAttachMenu, setShowAttachMenu] = useState(false);

    // Message action states
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');
    const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
    const [feedbackState, setFeedbackState] = useState<Record<string, 'like' | 'dislike' | null>>({});
    const [showShareModal, setShowShareModal] = useState(false);
    const [expandedSourcesId, setExpandedSourcesId] = useState<string | null>(null);
    const [showScrollButton, setShowScrollButton] = useState(false);
    const [showVoiceAgent, setShowVoiceAgent] = useState(false);

    // Track message counts for auto-scrolling
    // animatingMessageIndex state has been removed to disable artificial blink effects
    const [animatedMessageIds, setAnimatedMessageIds] = useState<Set<string>>(new Set());
    const prevMessagesLengthRef = useRef(0);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const prevConversationIdRef = useRef<string | null>(null);
    const isInitialLoadRef = useRef(true);
    const shouldAutoScrollRef = useRef(true);
    const isProgrammaticScrollRef = useRef(false);

    const SCROLL_THRESHOLD = 100;

    const scrollToBottomIfNeeded = useCallback((behavior: ScrollBehavior = 'auto') => {
        if (!shouldAutoScrollRef.current) return;

        const container = messagesContainerRef.current;
        if (!container) return;

        isProgrammaticScrollRef.current = true;
        if (behavior === 'smooth') {
            container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
            window.setTimeout(() => {
                isProgrammaticScrollRef.current = false;
            }, 400);
        } else {
            container.scrollTop = container.scrollHeight;
            requestAnimationFrame(() => {
                isProgrammaticScrollRef.current = false;
            });
        }
    }, []);

    // Auto-scroll only when the user is already near the bottom
    useEffect(() => {
        const currentConversationId = conversation?.id || null;
        const isConversationChange = currentConversationId !== prevConversationIdRef.current;
        const msgs = conversation?.messages || [];

        if (isConversationChange) {
            shouldAutoScrollRef.current = true;
            setShowScrollButton(false);
            prevConversationIdRef.current = currentConversationId;
            isInitialLoadRef.current = false;
            requestAnimationFrame(() => scrollToBottomIfNeeded('auto'));
            prevMessagesLengthRef.current = msgs.length;
            return;
        }

        const prevLength = prevMessagesLengthRef.current;
        const lastMsg = msgs[msgs.length - 1];
        if (msgs.length > prevLength && lastMsg?.role === 'user') {
            shouldAutoScrollRef.current = true;
            setShowScrollButton(false);
        }
        prevMessagesLengthRef.current = msgs.length;

        if (msgs.length > 0) {
            requestAnimationFrame(() => scrollToBottomIfNeeded('auto'));
        }
    }, [conversation?.id, conversation?.messages, scrollToBottomIfNeeded]);

    // Handle scroll to detect if user has moved away from the bottom
    const handleScroll = useCallback(() => {
        if (isProgrammaticScrollRef.current) return;

        const container = messagesContainerRef.current;
        if (!container) return;

        const { scrollTop, scrollHeight, clientHeight } = container;
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
        const atBottom = distanceFromBottom < SCROLL_THRESHOLD;

        shouldAutoScrollRef.current = atBottom;
        setShowScrollButton(!atBottom);
    }, []);

    // Scroll to bottom when user clicks the button
    const scrollToBottom = useCallback(() => {
        shouldAutoScrollRef.current = true;
        setShowScrollButton(false);

        const container = messagesContainerRef.current;
        if (!container) return;

        isProgrammaticScrollRef.current = true;
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
        window.setTimeout(() => {
            isProgrammaticScrollRef.current = false;
        }, 400);
    }, []);

    const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
        if (e.deltaY < 0) {
            shouldAutoScrollRef.current = false;
            setShowScrollButton(true);
        }
    }, []);

    // Initialize feedback state from loaded messages
    useEffect(() => {
        if (conversation?.messages) {
            const initialFeedback: Record<string, 'like' | 'dislike' | null> = {};
            conversation.messages.forEach(msg => {
                if (msg.metadata?.feedback) {
                    initialFeedback[msg.id] = msg.metadata.feedback;
                }
            });
            setFeedbackState(prev => ({ ...prev, ...initialFeedback }));
        }
    }, [conversation?.messages]);

    // Auto-resize textarea
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
            inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 200) + 'px';
        }
    }, [input]);

    // Clear notification after 3 seconds
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setShowAttachMenu(false);
            }
        };
        if (showAttachMenu) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [showAttachMenu]);

    const showNotification = (message: string, type: 'success' | 'error' | 'warning') => {
        setNotification({ message, type });
    };

    // Copy message to clipboard (stripping markdown syntax like # and *)
    const handleCopy = async (e: React.MouseEvent, messageId: string, content: string) => {
        e.preventDefault();
        e.stopPropagation();
        const success = await copyCleanText(content);
        if (success) {
            setCopiedMessageId(messageId);
            setTimeout(() => setCopiedMessageId(null), 2000);
        } else {
            showNotification('Failed to copy', 'error');
        }
    };

    // Start editing a message
    const handleStartEdit = (message: Message) => {
        setEditingMessageId(message.id);
        setEditContent(message.content);
    };

    // Save edited message
    const handleSaveEdit = async (messageId: string) => {
        if (!editContent.trim() || !onEditMessage) return;
        try {
            await onEditMessage(messageId, editContent);
            setEditingMessageId(null);
            setEditContent('');
        } catch (err) {
            showNotification('Failed to update message', 'error');
        }
    };

    // Cancel edit
    const handleCancelEdit = () => {
        setEditingMessageId(null);
        setEditContent('');
    };

    // Handle feedback (like/dislike)
    const handleFeedback = async (e: React.MouseEvent, messageId: string, feedback: 'like' | 'dislike') => {
        e.preventDefault();
        e.stopPropagation();
        const currentFeedback = feedbackState[messageId];
        const newFeedback = currentFeedback === feedback ? null : feedback;

        try {
            await api.setMessageFeedback(messageId, newFeedback);
            setFeedbackState(prev => ({ ...prev, [messageId]: newFeedback }));
        } catch (err) {
            showNotification('Failed to save feedback', 'error');
        }
    };

    // Switch message version
    const handleSwitchVersion = async (messageId: string, direction: 'prev' | 'next', currentVersion: number, totalVersions: number) => {
        const newVersion = direction === 'prev'
            ? Math.max(1, currentVersion - 1)
            : Math.min(totalVersions, currentVersion + 1);

        if (newVersion === currentVersion) return;

        try {
            const result = await api.switchMessageVersion(messageId, newVersion) as { message: { content: string } };
            if (onUpdateMessages && conversation) {
                const updatedMessages = conversation.messages.map(m =>
                    m.id === messageId
                        ? { ...m, content: result.message.content, currentVersion: newVersion }
                        : m
                );
                onUpdateMessages(updatedMessages);
            }
        } catch (err) {
            showNotification('Failed to switch version', 'error');
        }
    };

    // Handle regenerate
    const handleRegenerateClick = async (e: React.MouseEvent, messageId: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (onRegenerate) {
            await onRegenerate(messageId);
        }
    };

    // Handle voice agent AI response - returns AI response WITHOUT saving to chat
    const handleVoiceAgentAIResponse = async (content: string): Promise<string> => {
        // Call AI directly without saving to chat history - use Groq supported model
        const result = await api.sendChatMessage(
            [{ role: 'user', content }],
            { model: 'llama-3.3-70b-versatile' }
        );
        return result.message?.content || result.message || 'Sorry, I could not understand.';
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (isProcessingMessage || isProcessingFile) return;
        if (!input.trim() && !selectedFile && !selectedImage) return;

        let messageToSend = input.trim();
        let displayMessage = input.trim();
        const userQuestion = input.trim();

        // Handle PDF/document file
        if (selectedFile) {
            setIsProcessingFile(true);
            try {
                const result = await api.readPDFContent(selectedFile);
                displayMessage = `📄 Uploaded: ${selectedFile.name}\n\n${userQuestion}`;
                messageToSend = `Document Content from "${selectedFile.name}":\n\n${result.text}\n\nUser Question: ${userQuestion}`;
                showNotification('Document processed successfully!', 'success');
            } catch (error: any) {
                console.error('PDF processing failed:', error);
                displayMessage = `❌ Error processing "${selectedFile.name}": ${error.message}`;
                messageToSend = `Error processing document: ${error.message}\n\nUser Question: ${userQuestion}`;
                showNotification(error.message || 'Failed to process document', 'error');
            } finally {
                setSelectedFile(null);
                setIsProcessingFile(false);
            }
        }

        // Handle image file
        if (selectedImage) {
            setIsProcessingFile(true);
            try {
                const result = await api.readImageText(selectedImage);
                displayMessage = `🖼️ Uploaded: ${selectedImage.name}\n\n${userQuestion}`;
                messageToSend = `Image "${selectedImage.name}" OCR Text:\n\n${result.text}\n\nUser Question: ${userQuestion}`;
                showNotification('Image text extracted successfully!', 'success');
            } catch (error: any) {
                console.error('OCR failed:', error);
                displayMessage = `🖼️ Uploaded: ${selectedImage.name}\n\n${userQuestion}`;
                messageToSend = `[Image attached: ${selectedImage.name}]\n\nUser Question: ${userQuestion}`;
                showNotification('Could not extract text from image, sending as attachment', 'warning');
            } finally {
                setSelectedImage(null);
                setIsProcessingFile(false);
            }
        }

        if (messageToSend) {
            setInput('');
            shouldAutoScrollRef.current = true;
            setShowScrollButton(false);
            await onSend(messageToSend, displayMessage, webSearchEnabled);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    // File handling
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';

        if (!file) return;

        const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain'
        ];

        if (!allowedTypes.includes(file.type)) {
            showNotification('Please select a PDF, Word, or Text file', 'error');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            showNotification('File must be smaller than 5MB', 'error');
            return;
        }

        setSelectedFile(file);
        showNotification(`"${file.name}" attached. Ask your question!`, 'success');
    };

    const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';

        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showNotification('Please select an image file', 'error');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            showNotification('Image must be smaller than 10MB', 'error');
            return;
        }

        setSelectedImage(file);
        showNotification(`Image "${file.name}" attached`, 'success');
    };

    // Voice recording
    const startRecording = async () => {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                showNotification('Microphone not supported on this browser/connection (requires HTTPS)', 'error');
                return;
            }
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : 'audio/webm';

            const recorder = new MediaRecorder(stream, { mimeType });
            const chunks: Blob[] = [];

            recorder.ondataavailable = (e) => chunks.push(e.data);
            recorder.onstop = async () => {
                const audioBlob = new Blob(chunks, { type: 'audio/webm' });

                try {
                    showNotification('Transcribing audio...', 'success');
                    const result = await api.transcribeAudio(audioBlob);
                    if (result.text) {
                        setInput(result.text);
                        showNotification('Transcription ready! Edit and send.', 'success');
                        inputRef.current?.focus();
                    } else {
                        showNotification('No speech detected. Try again.', 'warning');
                    }
                } catch (error: any) {
                    console.error('Transcription error:', error);
                    showNotification('Transcription failed. Check microphone/server.', 'error');
                }

                stream.getTracks().forEach(track => track.stop());
            };

            recorder.start();
            setMediaRecorder(recorder);
            setIsRecording(true);
        } catch (err) {
            console.error('Mic access denied:', err);
            showNotification('Microphone access denied', 'error');
        }
    };

    const stopRecording = () => {
        if (mediaRecorder && isRecording) {
            mediaRecorder.stop();
            setIsRecording(false);
        }
    };

    const messages = conversation?.messages || [];
    const isDisabled = (!input.trim() && !selectedFile && !selectedImage) || isProcessingMessage || isProcessingFile;

    const inputForm = (
        <>
            {/* Hidden file inputs */}
            <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                onChange={handleFileSelect}
                className="hidden"
            />
            <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
            />

            <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
                {/* File attachment display */}
                {(selectedFile || selectedImage) && (
                    <div className="mb-3 flex flex-wrap gap-2">
                        {selectedFile && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-[#f4f4f4] dark:bg-[#2f2f2f] rounded-xl border border-[#e5e5e5] dark:border-[#424242]">
                                <FileText className="w-4 h-4 text-[#10a37f]" />
                                <span className="text-sm text-[#0d0d0d] dark:text-[#ececec] truncate max-w-[200px]">
                                    {selectedFile.name}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setSelectedFile(null)}
                                    className="p-0.5 hover:bg-[#e5e5e5] dark:hover:bg-[#424242] rounded"
                                >
                                    <X className="w-4 h-4 text-[#666666]" />
                                </button>
                            </div>
                        )}
                        {selectedImage && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-[#f4f4f4] dark:bg-[#2f2f2f] rounded-xl border border-[#e5e5e5] dark:border-[#424242]">
                                <ImageIcon className="w-4 h-4 text-blue-500" />
                                <span className="text-sm text-[#0d0d0d] dark:text-[#ececec] truncate max-w-[200px]">
                                    {selectedImage.name}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setSelectedImage(null)}
                                    className="p-0.5 hover:bg-[#e5e5e5] dark:hover:bg-[#424242] rounded"
                                >
                                    <X className="w-4 h-4 text-[#666666]" />
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* ChatGPT-style input container */}
                <div className={`relative flex items-center gap-2 rounded-3xl px-3 py-2 transition-colors shadow-sm ${isTemporaryMode
                    ? 'bg-[#383838] border border-transparent'
                    : 'bg-[#f4f4f4] dark:bg-[#2f2f2f] border border-[#e5e5e5] dark:border-[#424242] focus-within:border-[#b4b4b4] dark:focus-within:border-[#666666]'
                    }`}>
                    {/* Attach button */}
                    <div className="relative" ref={menuRef}>
                        <button
                            type="button"
                            onClick={() => setShowAttachMenu(!showAttachMenu)}
                            className={`p-1.5 rounded-lg transition-colors ${showAttachMenu
                                ? (isTemporaryMode ? 'bg-[#4a4a4a] text-[#ececec]' : 'bg-[#e5e5e5] dark:bg-[#424242] text-[#0d0d0d] dark:text-[#ececec]')
                                : (isTemporaryMode ? 'text-[#b4b4b4] hover:text-[#ececec] hover:bg-[#4a4a4a]' : 'text-[#666666] dark:text-[#b4b4b4] hover:text-[#0d0d0d] dark:hover:text-[#ececec] hover:bg-[#e5e5e5] dark:hover:bg-[#424242]')
                                }`}
                        >
                            <Plus className="w-5 h-5" />
                        </button>

                        {/* Attachment menu */}
                        <AnimatePresence>
                            {showAttachMenu && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    transition={{ duration: 0.1 }}
                                    className="absolute bottom-full left-0 mb-2 z-50"
                                >
                                    <div className="bg-white dark:bg-[#2f2f2f] rounded-xl shadow-lg border border-[#e5e5e5] dark:border-[#424242] py-1 min-w-[180px]">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                fileInputRef.current?.click();
                                                setShowAttachMenu(false);
                                            }}
                                            className="w-full px-3 py-2.5 text-left text-sm hover:bg-[#f4f4f4] dark:hover:bg-[#424242] flex items-center gap-3 text-[#0d0d0d] dark:text-[#ececec]"
                                        >
                                            <FileText className="w-4 h-4 text-[#666666] dark:text-[#b4b4b4]" /> Upload file
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                imageInputRef.current?.click();
                                                setShowAttachMenu(false);
                                            }}
                                            className="w-full px-3 py-2.5 text-left text-sm hover:bg-[#f4f4f4] dark:hover:bg-[#424242] flex items-center gap-3 text-[#0d0d0d] dark:text-[#ececec]"
                                        >
                                            <ImageIcon className="w-4 h-4 text-[#666666] dark:text-[#b4b4b4]" /> Upload image
                                        </button>
                                        <div className="my-1 border-t border-[#e5e5e5] dark:border-[#424242]" />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setWebSearchEnabled(!webSearchEnabled);
                                                setShowAttachMenu(false);
                                            }}
                                            className="w-full px-3 py-2.5 text-left text-sm hover:bg-[#f4f4f4] dark:hover:bg-[#424242] flex items-center gap-3 text-[#0d0d0d] dark:text-[#ececec]"
                                        >
                                            <Globe className={`w-4 h-4 ${webSearchEnabled ? 'text-[#10a37f]' : 'text-[#666666] dark:text-[#b4b4b4]'}`} />
                                            {webSearchEnabled ? 'Disable search' : 'Search the web'}
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Web search indicator */}
                    {webSearchEnabled && (
                        <button
                            type="button"
                            onClick={() => setWebSearchEnabled(false)}
                            className="flex items-center gap-1.5 px-2.5 py-1 bg-[#10a37f]/10 text-[#10a37f] rounded-full text-xs font-medium hover:bg-[#10a37f]/20 transition-colors"
                        >
                            <Globe className="w-3.5 h-3.5" />
                            Search
                            <X className="w-3 h-3" />
                        </button>
                    )}

                    {/* Text input */}
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={
                            isProcessingFile ? 'Processing...' :
                                webSearchEnabled ? 'Search the web...' :
                                    'Message JudicialGPT'
                        }
                        rows={1}
                        disabled={isProcessingFile}
                        className={`flex-1 bg-transparent resize-none outline-none max-h-[200px] disabled:opacity-50 text-base leading-6 py-0.5 ${isTemporaryMode
                            ? 'text-[#ececec] placeholder-[#b4b4b4]'
                            : 'text-[#0d0d0d] dark:text-[#ececec] placeholder-[#666666] dark:placeholder-[#8e8e8e]'
                            }`}
                    />

                    {/* Voice recording button */}
                    <button
                        type="button"
                        onClick={isRecording ? stopRecording : startRecording}
                        disabled={isProcessingFile}
                        className={`p-1.5 rounded-lg transition-colors ${isRecording
                            ? 'text-red-500 bg-red-100 dark:bg-red-900/30 animate-pulse'
                            : (isTemporaryMode ? 'text-[#b4b4b4] hover:text-[#ececec] hover:bg-[#4a4a4a]' : 'text-[#666666] dark:text-[#b4b4b4] hover:text-[#0d0d0d] dark:hover:text-[#ececec] hover:bg-[#e5e5e5] dark:hover:bg-[#424242]')
                            }`}
                        title={isRecording ? "Stop recording" : "Voice input"}
                    >
                        {isRecording ? <StopCircle className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </button>

                    {/* Voice Agent button - opens voice-to-voice conversation */}
                    <button
                        type="button"
                        onClick={() => setShowVoiceAgent(true)}
                        disabled={isProcessingFile}
                        className={`p-1.5 rounded-lg transition-colors ${isTemporaryMode 
                            ? 'text-[#b4b4b4] hover:text-[#ececec] hover:bg-[#4a4a4a]' 
                            : 'text-[#666666] dark:text-[#b4b4b4] hover:text-[#0d0d0d] dark:hover:text-[#ececec] hover:bg-[#e5e5e5] dark:hover:bg-[#424242]'
                        }`}
                        title="Voice Agent - Speak with AI"
                    >
                        <Phone className="w-5 h-5" />
                    </button>

                    {/* Send button - ChatGPT style */}
                    <button
                        type="submit"
                        disabled={isDisabled}
                        className={`p-2 rounded-full transition-all ${isDisabled
                            ? (isTemporaryMode ? 'bg-[#424242] text-[#666666] cursor-not-allowed' : 'bg-[#d9d9d9] dark:bg-[#424242] text-[#999999] dark:text-[#666666] cursor-not-allowed')
                            : (isTemporaryMode ? 'bg-white text-black hover:opacity-90' : 'bg-[#0d0d0d] dark:bg-[#ececec] text-white dark:text-[#0d0d0d] hover:opacity-80')
                            }`}
                        title="Send message"
                    >
                        {isProcessingFile ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <ArrowUp className="w-5 h-5" />
                        )}
                    </button>
                </div>

                {/* Disclaimer text - ChatGPT style */}
                {/* Disclaimer text - Only show when messages exist (bottom view) */}
                {messages.length > 0 && (
                    <p className="text-center text-xs text-[#999999] dark:text-[#666666] mt-2">
                        JudicialGPT can make mistakes. Consider checking important information.
                    </p>
                )}
            </form>
        </>
    );

    return (
        <div className="flex flex-col h-full bg-white dark:bg-[#212121]">
            {/* Notification */}
            <AnimatePresence>
                {notification && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={`absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full shadow-lg text-sm font-medium ${notification.type === 'success' ? 'bg-[#10a37f] text-white' :
                            notification.type === 'error' ? 'bg-red-500 text-white' :
                                'bg-yellow-500 text-white'
                            }`}
                    >
                        {notification.message}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main content area */}
            {messages.length === 0 ? (
                /* Empty state - ChatGPT style centered greeting */
                /* Empty state - ChatGPT style centered greeting */
                <div className="flex-1 flex flex-col items-center justify-center px-4 w-full -mt-16">
                    <div className="w-full max-w-3xl relative">
                        <div className="absolute bottom-full left-0 w-full text-center mb-8">
                            <AnimatePresence mode="wait">
                                {isTemporaryMode ? (
                                    <motion.div
                                        key="temp-mode"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <h1 className="text-3xl font-semibold text-[#0d0d0d] dark:text-[#ececec] mb-2">
                                            Temporary Chat
                                        </h1>
                                        <p className="text-[#666666] dark:text-[#b4b4b4] text-base">
                                            This chat won&apos;t appear in your chat history, and won&apos;t be used to train our models.
                                        </p>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="normal-mode"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <h1 className="text-3xl font-semibold text-[#0d0d0d] dark:text-[#ececec]">
                                            {user?.firstName || user?.name?.split(' ')[0]
                                                ? `Hi ${user?.firstName || user?.name?.split(' ')[0]}, how can I help?`
                                                : 'How can I help you today?'}
                                        </h1>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {inputForm}
                    </div>
                </div>
            ) : (
                /* Messages area - ChatGPT style */
                <div
                    ref={messagesContainerRef}
                    onScroll={handleScroll}
                    onWheel={handleWheel}
                    className="flex-1 overflow-y-auto"
                >
                    <div className="max-w-4xl mx-auto py-6 px-4">
                        <AnimatePresence initial={false}>
                            {messages.map((message, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="py-2"
                                >
                                    {/* Message header with icon */}
                                    <div className={`flex items-start gap-4 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                        {/* Avatar - ChatGPT style */}
                                        <div className="flex-shrink-0 mt-0.5">
                                            {message.role === 'user' ? (
                                                user?.avatarUrl ? (
                                                    <img
                                                        src={user.avatarUrl}
                                                        alt="User"
                                                        className="w-7 h-7 rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-7 h-7 rounded-full bg-[#10a37f] flex items-center justify-center text-xs font-medium text-white">
                                                        {user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                                                    </div>
                                                )
                                            ) : (
                                                <div className="w-7 h-7 rounded-sm bg-[#10a37f] flex items-center justify-center">
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-white">
                                                        <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                        <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                        <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                </div>
                                            )}
                                        </div>

                                        {/* Message content */}
                                        <div className={`flex-1 min-w-0 max-w-[85%] flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                                            {editingMessageId === message.id ? (
                                                // Editing mode
                                                <motion.div
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    className="w-full"
                                                >
                                                    <textarea
                                                        value={editContent}
                                                        onChange={(e) => setEditContent(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                                                e.preventDefault();
                                                                if (editContent.trim()) {
                                                                    handleSaveEdit(message.id);
                                                                }
                                                            }
                                                            if (e.key === 'Escape') {
                                                                handleCancelEdit();
                                                            }
                                                        }}
                                                        autoFocus
                                                        onFocus={(e) => {
                                                            const len = e.target.value.length;
                                                            e.target.setSelectionRange(len, len);
                                                        }}
                                                        className="w-full bg-[#f4f4f4] dark:bg-[#2f2f2f] border border-[#e5e5e5] dark:border-[#424242] rounded-xl p-4 text-base resize-none outline-none focus:border-[#10a37f] dark:focus:border-[#10a37f] transition-colors text-[#0d0d0d] dark:text-[#ececec] min-h-[100px]"
                                                        rows={Math.min(Math.max(editContent.split('\n').length, 3), 10)}
                                                    />
                                                    <div className="flex items-center justify-end gap-2 mt-3">
                                                        <button
                                                            onClick={handleCancelEdit}
                                                            className="px-4 py-2 text-sm font-medium text-[#666666] dark:text-[#b4b4b4] hover:bg-[#ececec] dark:hover:bg-[#2f2f2f] rounded-lg transition-colors"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            onClick={() => handleSaveEdit(message.id)}
                                                            disabled={!editContent.trim()}
                                                            className="px-4 py-2 text-sm font-medium bg-[#0d0d0d] dark:bg-[#ececec] text-white dark:text-[#0d0d0d] hover:opacity-80 disabled:opacity-40 rounded-lg transition-colors"
                                                        >
                                                            Save
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            ) : (
                                                // Display mode
                                                <>
                                                    {/* Judgment Search sources summary (persisted via message.metadata) */}
                                                    {message.role === 'assistant' && message.metadata?.judgmentSearch && (
                                                        <div className="flex flex-wrap items-center gap-2 mb-3">
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#10a37f]/10 text-[#10a37f] border border-[#10a37f]/20">
                                                                <CheckCircle2 className="w-3 h-3" />
                                                                {message.metadata.judgmentSearch.successfulSources} sources found
                                                            </span>
                                                            {message.metadata.judgmentSearch.blockedSources.length > 0 && (
                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20">
                                                                    <ShieldAlert className="w-3 h-3" />
                                                                    {message.metadata.judgmentSearch.blockedSources.length} blocked
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}

                                                    {message.role === 'assistant' ? (
                                                        isJudgmentDocument(message.content) ? (
                                                            <div className="message-content font-serif text-[#0d0d0d] dark:text-[#ececec]">
                                                                {renderJudgmentText(message.content.replace(/^Answer:\s*/i, '').replace(/^Answer\s*/i, '') + (message.isStreaming ? ' ●' : ''))}
                                                            </div>
                                                        ) : (
                                                        <div className="message-content text-[#0d0d0d] dark:text-[#ececec]">
                                                        <ReactMarkdown
                                                            remarkPlugins={[remarkGfm]}
                                                            rehypePlugins={[rehypeRaw]}
                                                            components={{
                                                                table: ({ children, ...props }) => (
                                                                    <div style={{ overflowX: 'auto', margin: '1rem 0' }}>
                                                                        <table {...props}>{children}</table>
                                                                    </div>
                                                                )
                                                            }}
                                                        >
                                                            {message.content.replace(/^Answer:\s*/i, '').replace(/^Answer\s*/i, '') + (message.isStreaming ? ' ●' : '')}
                                                        </ReactMarkdown>
                                                        </div>
                                                        )
                                                    ) : (
                                                        <div className={`text-base leading-7 whitespace-pre-wrap ${message.role === 'user'
                                                            ? 'bg-[#f4f4f4] dark:bg-[#383838] px-4 py-2.5 rounded-2xl rounded-tr-sm inline-block text-[#0d0d0d] dark:text-[#ececec]'
                                                            : 'text-[#0d0d0d] dark:text-[#ececec]'
                                                            }`}>
                                                            {message.content}
                                                        </div>
                                                    )}
                                                </>
                                            )}

                                            {/* Action bar - ChatGPT style */}
                                            {!editingMessageId && (
                                                <div className={`flex items-center gap-1 mt-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                    {/* Response Time */}
                                                    {message.role === 'assistant' && message.responseTime && (
                                                        <span className="text-xs text-[#999999] dark:text-[#666666] mr-2 flex items-center gap-1 select-none" title="Response time">
                                                            <Clock className="w-3 h-3" />
                                                            {(message.responseTime / 1000).toFixed(2)}s
                                                        </span>
                                                    )}

                                                    {/* Copy button */}
                                                     <button
                                                        type="button"
                                                        onClick={(e) => handleCopy(e, message.id, message.content)}
                                                        className="p-1.5 hover:bg-[#ececec] dark:hover:bg-[#2f2f2f] active:scale-95 rounded-lg transition-all text-[#666666] dark:text-[#b4b4b4]"
                                                        title="Copy"
                                                    >
                                                        {copiedMessageId === message.id ? (
                                                            <Check className="w-4 h-4 text-[#10a37f]" />
                                                        ) : (
                                                            <Copy className="w-4 h-4" />
                                                        )}
                                                    </button>

                                                    {/* Edit button (for user messages) */}
                                                    {message.role === 'user' && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleStartEdit(message);
                                                            }}
                                                            className="p-1.5 hover:bg-[#ececec] dark:hover:bg-[#2f2f2f] active:scale-95 rounded-lg transition-all text-[#666666] dark:text-[#b4b4b4]"
                                                            title="Edit"
                                                        >
                                                            <Edit3 className="w-4 h-4" />
                                                        </button>
                                                    )}

                                                    {/* Assistant-only actions */}
                                                    {message.role === 'assistant' && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => handleFeedback(e, message.id, 'like')}
                                                                className="p-1.5 hover:bg-[#ececec] dark:hover:bg-[#2f2f2f] active:scale-95 rounded-lg transition-all text-[#666666] dark:text-[#b4b4b4]"
                                                                title="Good response"
                                                            >
                                                                <ThumbsUp className={`w-4 h-4 ${(feedbackState[message.id] || message.metadata?.feedback) === 'like'
                                                                    ? 'fill-current text-[#10a37f]'
                                                                    : ''
                                                                    }`} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => handleFeedback(e, message.id, 'dislike')}
                                                                className="p-1.5 hover:bg-[#ececec] dark:hover:bg-[#2f2f2f] active:scale-95 rounded-lg transition-all text-[#666666] dark:text-[#b4b4b4]"
                                                                title="Bad response"
                                                            >
                                                                <ThumbsDown className={`w-4 h-4 ${(feedbackState[message.id] || message.metadata?.feedback) === 'dislike'
                                                                    ? 'fill-current'
                                                                    : ''
                                                                    }`} />
                                                            </button>

                                                            {onRegenerate && (
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => handleRegenerateClick(e, message.id)}
                                                                    className="p-1.5 hover:bg-[#ececec] dark:hover:bg-[#2f2f2f] active:scale-95 rounded-lg transition-all text-[#666666] dark:text-[#b4b4b4]"
                                                                    title="Regenerate"
                                                                    disabled={isProcessingMessage}
                                                                >
                                                                    <RefreshCw className={`w-4 h-4 ${isProcessingMessage ? 'animate-spin' : ''}`} />
                                                                </button>
                                                            )}

                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setShowShareModal(true);
                                                                }}
                                                                className="p-1.5 hover:bg-[#ececec] dark:hover:bg-[#2f2f2f] active:scale-95 rounded-lg transition-all text-[#666666] dark:text-[#b4b4b4]"
                                                                title="Share conversation"
                                                            >
                                                                <Share2 className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    )}

                                                    {/* Version navigation */}
                                                    {(message.totalVersions || 1) > 1 && (
                                                        <div className="flex items-center gap-0.5 ml-2 text-[#666666] dark:text-[#b4b4b4]">
                                                            <button
                                                                onClick={() => handleSwitchVersion(message.id, 'prev', message.currentVersion || 1, message.totalVersions || 1)}
                                                                disabled={(message.currentVersion || 1) <= 1}
                                                                className="p-1 hover:bg-[#ececec] dark:hover:bg-[#2f2f2f] rounded transition-colors disabled:opacity-30"
                                                            >
                                                                <ChevronLeft className="w-4 h-4" />
                                                            </button>
                                                            <span className="text-xs font-medium">
                                                                {message.currentVersion || 1}/{message.totalVersions || 1}
                                                            </span>
                                                            <button
                                                                onClick={() => handleSwitchVersion(message.id, 'next', message.currentVersion || 1, message.totalVersions || 1)}
                                                                disabled={(message.currentVersion || 1) >= (message.totalVersions || 1)}
                                                                className="p-1 hover:bg-[#ececec] dark:hover:bg-[#2f2f2f] rounded transition-colors disabled:opacity-30"
                                                            >
                                                                <ChevronRight className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Judgment Search sources collapsible (persisted via message.metadata) */}
                                            {message.role === 'assistant' && message.metadata?.judgmentSearch && (
                                                <div className="mt-4">
                                                    <button
                                                        onClick={() => setExpandedSourcesId(expandedSourcesId === message.id ? null : message.id)}
                                                        className="flex items-center gap-2 text-sm font-medium text-[#666666] dark:text-[#b4b4b4] hover:text-[#0d0d0d] dark:hover:text-[#ececec] transition-colors"
                                                    >
                                                        {expandedSourcesId === message.id ? (
                                                            <ChevronUp className="w-4 h-4" />
                                                        ) : (
                                                            <ChevronDown className="w-4 h-4" />
                                                        )}
                                                        View {message.metadata.judgmentSearch.sourcesSearched.length} sources searched
                                                    </button>

                                                    <AnimatePresence>
                                                        {expandedSourcesId === message.id && (
                                                            <motion.div
                                                                initial={{ height: 0, opacity: 0 }}
                                                                animate={{ height: 'auto', opacity: 1 }}
                                                                exit={{ height: 0, opacity: 0 }}
                                                                transition={{ duration: 0.2 }}
                                                                className="overflow-hidden"
                                                            >
                                                                <div className="mt-3 space-y-2">
                                                                    {message.metadata.judgmentSearch.sourcesSearched.map((source, si) => (
                                                                        <div
                                                                            key={si}
                                                                            className="flex items-start gap-3 p-3 rounded-xl bg-[#f9f9f9] dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#2f2f2f]"
                                                                        >
                                                                            <div className="mt-0.5">
                                                                                {getSourceStatusIcon(source.status)}
                                                                            </div>
                                                                            <div className="flex-1 min-w-0">
                                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                                    <span className="text-sm font-medium text-[#0d0d0d] dark:text-[#ececec] truncate">
                                                                                        {source.source_name}
                                                                                    </span>
                                                                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${getSourceStatusBadgeClass(source.status)}`}>
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
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {/* Typing indicator - ChatGPT style */}
                        {(isProcessingMessage && (!messages.length || messages[messages.length - 1].role !== 'assistant')) && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="py-6"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="w-7 h-7 rounded-sm bg-[#10a37f] flex items-center justify-center flex-shrink-0">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-white">
                                            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </div>
                                    <div>
                                        <div className="font-semibold text-sm text-[#0d0d0d] dark:text-[#ececec] mb-1">JudicialGPT</div>
                                        <div className="flex items-center gap-1">
                                            {isWebSearchMode && (
                                                <span className="text-sm text-[#10a37f] mr-2">Searching the web...</span>
                                            )}
                                            <span className="w-2 h-2 bg-[#666666] dark:bg-[#b4b4b4] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <span className="w-2 h-2 bg-[#666666] dark:bg-[#b4b4b4] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <span className="w-2 h-2 bg-[#666666] dark:bg-[#b4b4b4] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>
                </div>
            )
            }

            {/* Scroll to bottom button */}
            <AnimatePresence>
                {showScrollButton && messages.length > 0 && (
                    <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-40">
                        <motion.button
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            onClick={scrollToBottom}
                            className="p-2 bg-white dark:bg-[#2f2f2f] border border-[#e5e5e5] dark:border-[#424242] rounded-full shadow-lg hover:bg-[#f4f4f4] dark:hover:bg-[#424242] transition-colors"
                            title="Scroll to bottom"
                        >
                            <ArrowDown className="w-5 h-5 text-[#666666] dark:text-[#b4b4b4]" />
                        </motion.button>
                    </div>
                )}
            </AnimatePresence>

            {/* Input area - ChatGPT style pill-shaped input */}
            {
                messages.length > 0 && (
                    <div className="p-4">
                        {inputForm}
                    </div>
                )
            }

            {/* Share Modal */}
            <ShareModal
                isOpen={showShareModal}
                onClose={() => setShowShareModal(false)}
                conversationId={conversation?.id || ''}
                conversationTitle={conversation?.title || 'Untitled'}
            />

            {/* Voice Agent Modal */}
            <VoiceAgent
                isOpen={showVoiceAgent}
                onClose={() => setShowVoiceAgent(false)}
                onGetAIResponse={handleVoiceAgentAIResponse}
            />
        </div >
    );
}
