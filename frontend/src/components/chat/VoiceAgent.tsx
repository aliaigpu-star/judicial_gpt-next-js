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
                    // Fallback: call API directly - use llama-3.3-70b-versatile (Groq supported model)
                    const result = await api.sendChatMessage(
                        [...conversationHistory.map(m => ({ role: m.role, content: m.text })), { role: 'user', content: userText }],
                        { model: 'llama-3.3-70b-versatile' }
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

    // Get status color with gradients
    const getStatusColor = () => {
        switch (voiceState.status) {
            case 'listening': return 'bg-gradient-to-br from-red-500 to-red-600 animate-pulse shadow-red-500/50';
            case 'processing': return 'bg-gradient-to-br from-amber-400 to-amber-500 shadow-amber-400/50';
            case 'speaking': return 'bg-gradient-to-br from-emerald-400 to-emerald-500 shadow-emerald-400/50';
            case 'error': return 'bg-gradient-to-br from-red-600 to-red-700';
            default: return 'bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500';
        }
    };

    // Get status glow effect
    const getStatusGlow = () => {
        switch (voiceState.status) {
            case 'listening': return 'shadow-[0_0_40px_rgba(239,68,68,0.5)]';
            case 'processing': return 'shadow-[0_0_40px_rgba(251,191,36,0.4)]';
            case 'speaking': return 'shadow-[0_0_40px_rgba(52,211,153,0.5)]';
            default: return 'shadow-[0_0_30px_rgba(16,185,129,0.3)]';
        }
    };

    // Get status icon
    const getStatusIcon = () => {
        switch (voiceState.status) {
            case 'listening': return <Mic className="w-8 h-8" />;
            case 'processing': return <Loader2 className="w-8 h-8 animate-spin" />;
            case 'speaking': return <Volume2 className="w-8 h-8 animate-pulse" />;
            case 'error': return <Mic className="w-8 h-8" />;
            default: return <Mic className="w-8 h-8" />;
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="relative bg-white/95 dark:bg-[#1f1f1f]/95 rounded-[2rem] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] border border-white/20 dark:border-white/10 p-8 max-w-md w-full mx-4 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Background gradient effects */}
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-blue-500/5 pointer-events-none" />
                        <div className="absolute -top-32 -right-32 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

                        {/* Header */}
                        <div className="relative flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <motion.div 
                                    className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center relative shadow-lg shadow-emerald-500/30"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <Phone className="w-6 h-6 text-white" />
                                    {/* Online indicator with ping animation */}
                                    <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500 border-2 border-white dark:border-[#1f1f1f]"></span>
                                    </span>
                                </motion.div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                        Voice Agent
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                                            Online
                                        </p>
                                        {conversationTurn > 0 && (
                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                • {conversationTurn} turn{conversationTurn !== 1 ? 's' : ''}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {/* Voice Selector Toggle */}
                                <div className="relative">
                                    <motion.button
                                        onClick={() => setShowVoiceSelector(!showVoiceSelector)}
                                        className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        title="Change voice"
                                    >
                                        <Settings className="w-5 h-5" />
                                    </motion.button>
                                    
                                    {/* Voice Selector Dropdown */}
                                    <AnimatePresence>
                                        {showVoiceSelector && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-[#2f2f2f] rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-2 z-50"
                                            >
                                                <p className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                    Select Voice
                                                </p>
                                                {VOICE_OPTIONS.map((voice) => (
                                                    <button
                                                        key={voice.id}
                                                        onClick={() => {
                                                            setSelectedVoice(voice.id);
                                                            setShowVoiceSelector(false);
                                                        }}
                                                        className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 transition-colors ${
                                                            selectedVoice === voice.id
                                                                ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                                                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                                                        }`}
                                                    >
                                                        <span className="text-lg">{voice.flag}</span>
                                                        <span>{voice.name}</span>
                                                        {selectedVoice === voice.id && (
                                                            <Sparkles className="w-4 h-4 ml-auto" />
                                                        )}
                                                    </button>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Stop speaking button - only show when speaking */}
                                <AnimatePresence>
                                    {voiceState.status === 'speaking' && (
                                        <motion.button
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.8 }}
                                            onClick={stopSpeaking}
                                            className="p-2.5 rounded-xl bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-200 transition-colors"
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            title="Stop speaking"
                                        >
                                            <Square className="w-5 h-5 fill-current" />
                                        </motion.button>
                                    )}
                                </AnimatePresence>

                                {/* Mute button */}
                                <motion.button
                                    onClick={toggleMute}
                                    className={`p-2.5 rounded-xl transition-colors ${
                                        isMuted 
                                            ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' 
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                                    }`}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    title={isMuted ? 'Unmute' : 'Mute'}
                                >
                                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                                </motion.button>

                                {/* End Call button */}
                                <motion.button
                                    onClick={onClose}
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 transition-all font-medium shadow-lg shadow-red-500/30"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <PhoneOff className="w-5 h-5" />
                                    <span>End</span>
                                </motion.button>
                            </div>
                        </div>

                        {/* Main Voice Button Area */}
                        <div className="relative flex flex-col items-center gap-6 py-4">
                            {/* Pulsing rings for listening state */}
                            <AnimatePresence>
                                {voiceState.status === 'listening' && (
                                    <>
                                        <motion.div
                                            initial={{ opacity: 0, scale: 1 }}
                                            animate={{ opacity: [0, 0.3, 0], scale: [1, 1.5, 2] }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                                            className="absolute w-32 h-32 rounded-full bg-red-500/30"
                                        />
                                        <motion.div
                                            initial={{ opacity: 0, scale: 1 }}
                                            animate={{ opacity: [0, 0.2, 0], scale: [1, 1.8, 2.5] }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
                                            className="absolute w-32 h-32 rounded-full bg-red-400/20"
                                        />
                                    </>
                                )}
                                {voiceState.status === 'speaking' && (
                                    <>
                                        <motion.div
                                            initial={{ opacity: 0, scale: 1 }}
                                            animate={{ opacity: [0, 0.3, 0], scale: [1, 1.3, 1.6] }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                                            className="absolute w-32 h-32 rounded-full bg-emerald-500/30"
                                        />
                                    </>
                                )}
                            </AnimatePresence>

                            {/* Main button with glow effect */}
                            <motion.button
                                onClick={voiceState.status === 'listening' ? stopListening : startListening}
                                disabled={voiceState.status === 'processing' || voiceState.status === 'speaking'}
                                whileHover={voiceState.status === 'idle' || voiceState.status === 'error' ? { scale: 1.08 } : {}}
                                whileTap={voiceState.status === 'idle' || voiceState.status === 'error' ? { scale: 0.92 } : {}}
                                className={`relative w-28 h-28 rounded-full flex items-center justify-center text-white shadow-2xl transition-all duration-300 ${getStatusColor()} ${getStatusGlow()} ${
                                    (voiceState.status === 'processing' || voiceState.status === 'speaking') 
                                        ? 'opacity-60 cursor-not-allowed' 
                                        : 'cursor-pointer'
                                }`}
                            >
                                <div className="relative z-10">
                                    {getStatusIcon()}
                                </div>
                            </motion.button>

                            {/* Status Text with icon */}
                            <div className="text-center space-y-1">
                                <motion.p 
                                    key={voiceState.status}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-xl font-semibold text-gray-900 dark:text-white"
                                >
                                    {voiceState.message}
                                </motion.p>
                                <AnimatePresence mode="wait">
                                    {voiceState.status === 'idle' && (
                                        <motion.p 
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="text-sm text-gray-500 dark:text-gray-400"
                                        >
                                            Tap to start conversation
                                        </motion.p>
                                    )}
                                    {voiceState.status === 'listening' && (
                                        <motion.p 
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="text-sm text-red-500 dark:text-red-400 font-medium"
                                        >
                                            Recording... tap to stop
                                        </motion.p>
                                    )}
                                    {voiceState.status === 'processing' && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="flex items-center justify-center gap-2 text-sm text-amber-600 dark:text-amber-400"
                                        >
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>AI is thinking...</span>
                                        </motion.div>
                                    )}
                                    {voiceState.status === 'speaking' && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="flex items-center justify-center gap-2 text-sm text-emerald-600 dark:text-emerald-400"
                                        >
                                            <Volume2 className="w-4 h-4 animate-pulse" />
                                            <span>Speaking response...</span>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Enhanced Waveform Animation */}
                        <AnimatePresence>
                            {voiceState.status === 'listening' && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 20 }}
                                    className="flex justify-center items-end gap-1 h-16 mt-4"
                                >
                                    {[...Array(9)].map((_, i) => (
                                        <motion.div
                                            key={i}
                                            className="w-1.5 bg-gradient-to-t from-red-500 to-red-400 rounded-full"
                                            animate={{
                                                height: [12, 48, 16, 56, 20, 40, 12],
                                                opacity: [0.5, 1, 0.6, 1, 0.5, 0.9, 0.5],
                                            }}
                                            transition={{
                                                duration: 0.8 + i * 0.1,
                                                repeat: Infinity,
                                                ease: "easeInOut",
                                                delay: i * 0.05,
                                            }}
                                        />
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Conversation Activity Indicator */}
                        <AnimatePresence>
                            {conversationTurn > 0 && voiceState.status === 'idle' && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400"
                                >
                                    <MessageCircle className="w-4 h-4" />
                                    <span>Conversation in progress</span>
                                    <motion.span
                                        animate={{ opacity: [0.3, 1, 0.3] }}
                                        transition={{ duration: 1.5, repeat: Infinity }}
                                    >
                                        •
                                    </motion.span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Click outside to close voice selector */}
                        {showVoiceSelector && (
                            <div 
                                className="fixed inset-0 z-40"
                                onClick={() => setShowVoiceSelector(false)}
                            />
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
