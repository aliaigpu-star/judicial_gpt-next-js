/**
 * Voice Agent Component
 * Provides continuous voice-to-voice conversation with AI
 * Uses existing voice-to-text and adds text-to-speech for responses
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, X, Volume2, VolumeX, PhoneOff, Phone, Loader2, Square, Settings, MessageCircle, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';

interface VoiceAgentProps {
    onClose: () => void;
    onGetAIResponse?: (content: string) => Promise<string>;
    isOpen: boolean;
}

interface VoiceState {
    status: 'idle' | 'listening' | 'processing' | 'speaking' | 'error';
    message: string;
}

interface ConversationMessage {
    role: 'user' | 'assistant';
    text: string;
}

const VOICE_OPTIONS = [
    { id: 'en-US-JennyNeural', name: 'Jenny (US Female)', flag: '🇺🇸' },
    { id: 'en-US-GuyNeural', name: 'Guy (US Male)', flag: '🇺🇸' },
    { id: 'en-GB-SoniaNeural', name: 'Sonia (UK Female)', flag: '🇬🇧' },
    { id: 'en-GB-RyanNeural', name: 'Ryan (UK Male)', flag: '🇬🇧' },
    { id: 'en-AU-NatashaNeural', name: 'Natasha (AU Female)', flag: '🇦🇺' },
    { id: 'en-IN-NeerjaNeural', name: 'Neerja (IN Female)', flag: '🇮🇳' },
];

export default function VoiceAgent({ onClose, onGetAIResponse, isOpen }: VoiceAgentProps) {
    const [voiceState, setVoiceState] = useState<VoiceState>({ status: 'idle', message: 'Tap to speak' });
    const [isMuted, setIsMuted] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
    const [selectedVoice, setSelectedVoice] = useState('en-US-JennyNeural');
    const [showVoiceSelector, setShowVoiceSelector] = useState(false);
    const [conversationTurn, setConversationTurn] = useState(0);
    
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            cleanup();
        };
    }, []);

    // Clear history when modal closes
    useEffect(() => {
        if (!isOpen) {
            setConversationHistory([]);
            cleanup();
        }
    }, [isOpen]);

    const cleanup = () => {
        // Stop any ongoing recording
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        // Stop any playing audio
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            audioRef.current = null;
        }
        setIsSpeaking(false);
        // Abort any pending requests
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
    };

    // Stop audio playback
    const stopSpeaking = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            audioRef.current = null;
        }
        setIsSpeaking(false);
        setVoiceState({ status: 'idle', message: 'Tap to speak' });
    };

    // Text-to-Speech function
    const speakText = async (text: string): Promise<void> => {
        if (isMuted) {
            setIsSpeaking(false);
            setVoiceState({ status: 'idle', message: 'Tap to speak' });
            return;
        }

        try {
            setVoiceState({ status: 'speaking', message: 'Speaking...' });
            
            // Use api.textToSpeech which properly adds auth headers
            const audioBlob = await api.textToSpeech(text, selectedVoice);
            const audioUrl = URL.createObjectURL(audioBlob);
            
            audioRef.current = new Audio(audioUrl);
            
            return new Promise((resolve, reject) => {
                if (!audioRef.current) {
                    setIsSpeaking(false);
                    return resolve();
                }
                
                audioRef.current.onended = () => {
                    URL.revokeObjectURL(audioUrl);
                    setIsSpeaking(false);
                    setVoiceState({ status: 'idle', message: 'Tap to speak' });
                    resolve();
                };
                
                audioRef.current.onerror = () => {
                    URL.revokeObjectURL(audioUrl);
                    setIsSpeaking(false);
                    reject(new Error('Audio playback failed'));
                };
                
                audioRef.current.play().catch((err) => {
                    setIsSpeaking(false);
                    reject(err);
                });
            });
        } catch (error) {
            console.error('TTS Error:', error);
            setIsSpeaking(false);
            setVoiceState({ status: 'idle', message: 'Tap to speak' });
        }
    };

    // Start voice recording
    const startListening = async () => {
        try {
            // Check if browser supports getUserMedia
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                setVoiceState({ status: 'error', message: 'Browser does not support microphone access' });
                return;
            }

            // Check if running in secure context (HTTPS or localhost)
            if (window.isSecureContext === false) {
                setVoiceState({ status: 'error', message: 'Microphone requires HTTPS or localhost' });
                return;
            }

            setVoiceState({ status: 'listening', message: 'Listening...' });
            audioChunksRef.current = [];

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : 'audio/webm';

            const recorder = new MediaRecorder(stream, { mimeType });
            
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    audioChunksRef.current.push(e.data);
                }
            };

            recorder.onstop = async () => {
                stream.getTracks().forEach(track => track.stop());
                
                if (audioChunksRef.current.length === 0) {
                    setVoiceState({ status: 'idle', message: 'Tap to speak' });
                    return;
                }

                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                await processVoiceInput(audioBlob);
            };

            recorder.start();
            mediaRecorderRef.current = recorder;

            // Auto-stop after 30 seconds to prevent long recordings
            setTimeout(() => {
                if (recorder.state === 'recording') {
                    recorder.stop();
                }
            }, 30000);

        } catch (err: any) {
            console.error('Microphone access error:', err);
            if (err.name === 'NotAllowedError') {
                setVoiceState({ status: 'error', message: 'Microphone permission denied' });
            } else if (err.name === 'NotFoundError') {
                setVoiceState({ status: 'error', message: 'No microphone found' });
            } else if (err.name === 'NotSupportedError') {
                setVoiceState({ status: 'error', message: 'Microphone not supported' });
            } else {
                setVoiceState({ status: 'error', message: 'Microphone access failed' });
            }
        }
    };

    // Stop voice recording
    const stopListening = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
    };

    // Process voice input: transcribe -> send to AI -> speak response
    const processVoiceInput = async (audioBlob: Blob) => {
        abortControllerRef.current = new AbortController();
        
        try {
            setVoiceState({ status: 'processing', message: 'Transcribing...' });

            // Step 1: Transcribe audio
            const transcribeResult = await api.transcribeAudio(audioBlob);
            
            // Check for authentication errors
            if (transcribeResult.error) {
                if (transcribeResult.code === 'NO_TOKEN' || transcribeResult.code === 'TOKEN_EXPIRED' || transcribeResult.code === 'INVALID_TOKEN') {
                    setVoiceState({ status: 'error', message: 'Please log in again' });
                    return;
                }
                setVoiceState({ status: 'error', message: transcribeResult.error });
                return;
            }
            
            if (!transcribeResult.text || transcribeResult.text.trim() === '') {
                setVoiceState({ status: 'idle', message: 'No speech detected. Tap to try again.' });
                return;
            }

            const userText = transcribeResult.text.trim();
            // Store in voice-only history (not saved to chat)
            setConversationHistory(prev => [...prev, { role: 'user', text: userText }]);

            setVoiceState({ status: 'processing', message: 'Thinking...' });

            // Step 2: Get AI response directly (without saving to chat)
            let aiResponse: string;
            try {
                if (onGetAIResponse) {
                    aiResponse = await onGetAIResponse(userText);
                } else {
                    // Fallback: call API directly - use openai/gpt-oss-120b (Groq supported model)
                    const result = await api.sendChatMessage(
                        [...conversationHistory.map(m => ({ role: m.role, content: m.text })), { role: 'user', content: userText }],
                        { model: 'openai/gpt-oss-120b' }
                    );
                    aiResponse = result.message?.content || result.message || 'Sorry, I could not understand.';
                }
            } catch (aiError: any) {
                console.error('AI response error:', aiError);
                setVoiceState({ status: 'error', message: aiError.message || 'AI service error' });
                setIsSpeaking(false);
                return;
            }
            
            if (abortControllerRef.current?.signal.aborted) return;

            // Store response in voice-only history (not saved to chat)
            setConversationHistory(prev => [...prev, { role: 'assistant', text: aiResponse }]);
            setConversationTurn(prev => prev + 1);

            // Step 3: Speak the response (auto-play, no text shown)
            setIsSpeaking(true);
            await speakText(aiResponse);

        } catch (error: any) {
            if (error.name === 'AbortError') return;
            
            console.error('Voice processing error:', error);
            // Show more detailed error message
            const errorMessage = error.message || 'Unknown error';
            setVoiceState({ status: 'error', message: `Error: ${errorMessage.substring(0, 50)}` });
            setIsSpeaking(false);
        }
    };

    // Toggle mute
    const toggleMute = () => {
        setIsMuted(!isMuted);
        if (!isMuted && audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
    };

    const status = voiceState.status;
    const busy = status === 'processing';
    const lastUser = [...conversationHistory].reverse().find(m => m.role === 'user');
    const lastAssistant = [...conversationHistory].reverse().find(m => m.role === 'assistant');
    const currentVoice = VOICE_OPTIONS.find(v => v.id === selectedVoice) ?? VOICE_OPTIONS[0];

    // Orb colours per state (green idle/speaking, red listening, amber thinking).
    const orbGradient = {
        idle: 'from-[#00c26a] via-[#00a859] to-[#007a40]',
        listening: 'from-[#ff6b6b] via-[#ef4444] to-[#b91c1c]',
        processing: 'from-[#fcd34d] via-[#f59e0b] to-[#d97706]',
        speaking: 'from-[#00c26a] via-[#00a859] to-[#0e7490]',
        error: 'from-[#f87171] via-[#dc2626] to-[#991b1b]',
    }[status];
    const ringColor = status === 'listening' ? 'bg-red-500' : status === 'processing' ? 'bg-amber-400' : 'bg-[#00a859]';

    const statusLabel = {
        idle: conversationTurn > 0 ? 'Tap the mic to continue' : 'Tap the mic and ask your question',
        listening: 'Listening… tap to send',
        processing: 'Thinking…',
        speaking: 'Speaking… tap to stop',
        error: voiceState.message,
    }[status];

    const onMainButton = () => {
        if (status === 'listening') stopListening();
        else if (status === 'speaking') stopSpeaking();
        else if (status === 'idle' || status === 'error') startListening();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 16 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 16 }}
                        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
                        className="relative w-full max-w-md overflow-hidden rounded-[28px] bg-white dark:bg-[#1c1c1c] border border-[#e5e5e5] dark:border-[#333333] shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Soft background glow that follows the state colour */}
                        <div className={`pointer-events-none absolute left-1/2 top-24 h-72 w-72 -translate-x-1/2 rounded-full bg-gradient-to-br ${orbGradient} opacity-[0.12] blur-3xl transition-all duration-700`} />

                        {/* Header */}
                        <div className="relative flex items-center justify-between px-5 pt-5">
                            <div>
                                <h3 className="text-lg font-semibold text-[#0d0d0d] dark:text-white">Voice Agent</h3>
                                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-[#666666] dark:text-[#b4b4b4]">
                                    <span className="relative flex h-2 w-2">
                                        <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${ringColor}`} />
                                        <span className={`relative inline-flex h-2 w-2 rounded-full ${ringColor}`} />
                                    </span>
                                    {conversationTurn > 0 ? `${conversationTurn} ${conversationTurn === 1 ? 'reply' : 'replies'}` : 'Ready'}
                                </div>
                            </div>

                            {/* Voice selector pill */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowVoiceSelector(!showVoiceSelector)}
                                    className="flex items-center gap-2 rounded-full border border-[#e5e5e5] dark:border-[#424242] bg-[#f7f7f7] dark:bg-[#2a2a2a] px-3 py-1.5 text-sm text-[#0d0d0d] dark:text-[#ececec] hover:bg-[#efefef] dark:hover:bg-[#333333] transition-colors"
                                    title="Change voice"
                                >
                                    <span>{currentVoice.flag}</span>
                                    <span className="font-medium">{currentVoice.name.split(' ')[0]}</span>
                                    <Settings className="h-3.5 w-3.5 text-[#999999]" />
                                </button>
                                <AnimatePresence>
                                    {showVoiceSelector && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 6, scale: 0.97 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 6, scale: 0.97 }}
                                            className="absolute right-0 top-full z-50 mt-2 w-60 rounded-2xl border border-[#e5e5e5] dark:border-[#424242] bg-white dark:bg-[#2a2a2a] p-1.5 shadow-xl"
                                        >
                                            {VOICE_OPTIONS.map((voice) => (
                                                <button
                                                    key={voice.id}
                                                    onClick={() => {
                                                        setSelectedVoice(voice.id);
                                                        setShowVoiceSelector(false);
                                                    }}
                                                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors ${selectedVoice === voice.id
                                                        ? 'bg-[#00a859]/10 text-[#00a859]'
                                                        : 'text-[#0d0d0d] dark:text-[#ececec] hover:bg-[#f4f4f4] dark:hover:bg-[#333333]'
                                                        }`}
                                                >
                                                    <span className="text-base">{voice.flag}</span>
                                                    <span className="flex-1">{voice.name}</span>
                                                    {selectedVoice === voice.id && <Sparkles className="h-4 w-4" />}
                                                </button>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Orb */}
                        <div className="relative flex flex-col items-center px-6 pt-10 pb-6">
                            <div className="relative flex h-48 w-48 items-center justify-center">
                                {(status === 'listening' || status === 'speaking') && [0, 1].map(i => (
                                    <motion.span
                                        key={i}
                                        className={`absolute h-36 w-36 rounded-full ${ringColor}`}
                                        initial={{ opacity: 0.35, scale: 1 }}
                                        animate={{ opacity: 0, scale: 1.45 }}
                                        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut', delay: i * 0.9 }}
                                    />
                                ))}
                                <motion.div
                                    className={`relative flex h-36 w-36 items-center justify-center rounded-full bg-gradient-to-br ${orbGradient} shadow-2xl transition-colors duration-500`}
                                    animate={status === 'idle' ? { scale: [1, 1.04, 1] } : { scale: 1 }}
                                    transition={{ duration: 3, repeat: status === 'idle' ? Infinity : 0, ease: 'easeInOut' }}
                                >
                                    <div className="absolute inset-2 rounded-full bg-white/10" />
                                    {status === 'processing' ? (
                                        <Loader2 className="h-10 w-10 animate-spin text-white" />
                                    ) : status === 'listening' || status === 'speaking' ? (
                                        <div className="flex h-12 items-center gap-1.5">
                                            {[0, 1, 2, 3, 4].map(i => (
                                                <motion.span
                                                    key={i}
                                                    className="w-1.5 rounded-full bg-white"
                                                    animate={{ height: [10, 40 - Math.abs(2 - i) * 8, 14, 32, 10] }}
                                                    transition={{ duration: 1 + i * 0.12, repeat: Infinity, ease: 'easeInOut' }}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <Mic className="h-10 w-10 text-white" />
                                    )}
                                </motion.div>
                            </div>

                            <motion.p
                                key={status}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`mt-6 text-center text-base font-medium ${status === 'error' ? 'text-red-500' : 'text-[#0d0d0d] dark:text-[#ececec]'}`}
                            >
                                {statusLabel}
                            </motion.p>

                            {/* Latest exchange */}
                            {(lastUser || lastAssistant) && (
                                <div className="mt-5 w-full space-y-2">
                                    {lastUser && (
                                        <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-[#f4f4f4] dark:bg-[#2f2f2f] px-3.5 py-2 text-sm text-[#0d0d0d] dark:text-[#ececec] line-clamp-2">
                                            {lastUser.text}
                                        </p>
                                    )}
                                    {lastAssistant && (
                                        <p className="w-fit max-w-[85%] rounded-2xl rounded-bl-md bg-[#00a859]/10 px-3.5 py-2 text-sm text-[#0d0d0d] dark:text-[#ececec] line-clamp-3">
                                            {lastAssistant.text}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Controls */}
                        <div className="relative flex items-center justify-center gap-6 border-t border-[#f0f0f0] dark:border-[#2c2c2c] px-6 py-5">
                            <motion.button
                                whileTap={{ scale: 0.92 }}
                                onClick={toggleMute}
                                className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${isMuted
                                    ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                                    : 'bg-[#f4f4f4] text-[#444444] hover:bg-[#ebebeb] dark:bg-[#2f2f2f] dark:text-[#d4d4d4] dark:hover:bg-[#3a3a3a]'
                                    }`}
                                title={isMuted ? 'Unmute replies' : 'Mute replies'}
                            >
                                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                            </motion.button>

                            <motion.button
                                whileHover={busy ? {} : { scale: 1.05 }}
                                whileTap={busy ? {} : { scale: 0.93 }}
                                onClick={onMainButton}
                                disabled={busy}
                                className={`flex h-16 w-16 items-center justify-center rounded-full text-white shadow-lg transition-colors ${status === 'listening'
                                    ? 'bg-red-500 shadow-red-500/40'
                                    : status === 'speaking'
                                        ? 'bg-[#0d0d0d] dark:bg-white dark:text-[#0d0d0d]'
                                        : 'bg-[#00a859] shadow-[#00a859]/40'
                                    } ${busy ? 'opacity-60 cursor-not-allowed' : ''}`}
                                title={status === 'listening' ? 'Send' : status === 'speaking' ? 'Stop speaking' : 'Speak'}
                            >
                                {status === 'listening' ? (
                                    <Square className="h-6 w-6 fill-current" />
                                ) : status === 'speaking' ? (
                                    <Square className="h-5 w-5 fill-current" />
                                ) : busy ? (
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                ) : (
                                    <Mic className="h-7 w-7" />
                                )}
                            </motion.button>

                            <motion.button
                                whileTap={{ scale: 0.92 }}
                                onClick={onClose}
                                className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500 text-white shadow-lg shadow-red-500/30 hover:bg-red-600 transition-colors"
                                title="End conversation"
                            >
                                <X className="h-5 w-5" />
                            </motion.button>
                        </div>

                        {/* Click outside to close voice selector */}
                        {showVoiceSelector && (
                            <div className="fixed inset-0 z-40" onClick={() => setShowVoiceSelector(false)} />
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
