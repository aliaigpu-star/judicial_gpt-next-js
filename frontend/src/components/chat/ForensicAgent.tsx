'use client';

import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScanSearch, Upload, X, AlertTriangle, CheckCircle, Loader2, Image as ImageIcon } from 'lucide-react';

const FORENSIC_API = process.env.NEXT_PUBLIC_FORENSIC_AGENT_URL || 'https://forensicsagent-judicial-gpt.in.ngrok.io';

interface DetectionResult {
    is_ai_generated: boolean;
    confidence: number;
    model_results?: Record<string, { prediction: string; confidence: number }>;
    explanation?: string;
}

export default function ForensicAgent() {
    const [image, setImage] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<DetectionResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFile = (file: File) => {
        if (!file.type.startsWith('image/')) {
            setError('Please upload an image file (JPG, PNG, WEBP, etc.)');
            return;
        }
        if (file.size > 15 * 1024 * 1024) {
            setError('Image must be under 15MB.');
            return;
        }
        setImage(file);
        setPreview(URL.createObjectURL(file));
        setResult(null);
        setError(null);
    };

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
    };

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
    }, []);

    const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
    const onDragLeave = () => setIsDragging(false);

    const clearImage = () => {
        setImage(null);
        setPreview(null);
        setResult(null);
        setError(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const analyze = async () => {
        if (!image) return;
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const form = new FormData();
            form.append('file', image);

            const token = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
            const res = await fetch(`${FORENSIC_API}/v1/detect`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: form,
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || `Server error ${res.status}`);
            }

            const data = await res.json();
            setResult(data);
        } catch (err: any) {
            setError(err.message || 'Failed to connect to Forensic Agent. Make sure it is running.');
        } finally {
            setLoading(false);
        }
    };

    const confidencePct = result ? Math.round((result.confidence ?? 0) * 100) : 0;
    const isAI = result?.is_ai_generated;

    return (
        <div className="flex flex-col h-full bg-[#f9f9f9] dark:bg-[#171717] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-[#f9f9f9] dark:bg-[#171717] border-b border-[#e5e5e5] dark:border-[#2f2f2f] px-6 py-4">
                <div className="max-w-2xl mx-auto flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#f97316]/10 flex items-center justify-center">
                        <ScanSearch className="w-5 h-5 text-[#f97316]" />
                    </div>
                    <div>
                        <h1 className="text-base font-semibold text-[#0d0d0d] dark:text-[#ececec]">Forensic Agent</h1>
                        <p className="text-xs text-[#666666] dark:text-[#8e8e8e]">AI Image Detection — Upload an image to check if it's AI-generated</p>
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="flex-1 px-6 py-8">
                <div className="max-w-2xl mx-auto space-y-6">

                    {/* Drop Zone */}
                    {!preview ? (
                        <div
                            onDrop={onDrop}
                            onDragOver={onDragOver}
                            onDragLeave={onDragLeave}
                            onClick={() => fileInputRef.current?.click()}
                            className={`relative border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-200 ${isDragging
                                ? 'border-[#f97316] bg-[#f97316]/5'
                                : 'border-[#d9d9d9] dark:border-[#424242] hover:border-[#f97316] hover:bg-[#f97316]/5 dark:hover:border-[#f97316]'
                                }`}
                        >
                            <div className="w-16 h-16 rounded-2xl bg-[#f97316]/10 flex items-center justify-center">
                                <ImageIcon className="w-8 h-8 text-[#f97316]" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-medium text-[#0d0d0d] dark:text-[#ececec]">Drop an image here or click to upload</p>
                                <p className="text-xs text-[#666666] dark:text-[#8e8e8e] mt-1">JPG, PNG, WEBP, GIF — up to 15MB</p>
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 bg-[#f97316] text-white rounded-lg text-sm font-medium hover:bg-[#ea6a0a] transition-colors">
                                <Upload className="w-4 h-4" />
                                Choose Image
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={onFileChange}
                            />
                        </div>
                    ) : (
                        /* Image Preview */
                        <div className="relative rounded-2xl overflow-hidden border border-[#e5e5e5] dark:border-[#2f2f2f] bg-white dark:bg-[#1f1f1f]">
                            <img
                                src={preview}
                                alt="Uploaded"
                                className="w-full max-h-80 object-contain"
                            />
                            <button
                                onClick={clearImage}
                                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors"
                            >
                                <X className="w-4 h-4 text-white" />
                            </button>
                            <div className="px-4 py-2 border-t border-[#e5e5e5] dark:border-[#2f2f2f] flex items-center justify-between">
                                <span className="text-xs text-[#666666] dark:text-[#8e8e8e] truncate max-w-[70%]">{image?.name}</span>
                                <span className="text-xs text-[#666666] dark:text-[#8e8e8e]">{image ? (image.size / 1024).toFixed(0) + ' KB' : ''}</span>
                            </div>
                        </div>
                    )}

                    {/* Analyze Button */}
                    {preview && (
                        <button
                            onClick={analyze}
                            disabled={loading}
                            className="w-full py-3 bg-[#f97316] hover:bg-[#ea6a0a] disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Analyzing...
                                </>
                            ) : (
                                <>
                                    <ScanSearch className="w-4 h-4" />
                                    Analyze Image
                                </>
                            )}
                        </button>
                    )}

                    {/* Error */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20"
                            >
                                <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Result */}
                    <AnimatePresence>
                        {result && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="space-y-4"
                            >
                                {/* Main verdict */}
                                <div className={`p-5 rounded-2xl border-2 ${isAI
                                    ? 'border-red-300 dark:border-red-500/40 bg-red-50 dark:bg-red-500/10'
                                    : 'border-green-300 dark:border-green-500/40 bg-green-50 dark:bg-green-500/10'
                                    }`}>
                                    <div className="flex items-center gap-3">
                                        {isAI ? (
                                            <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0" />
                                        ) : (
                                            <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
                                        )}
                                        <div>
                                            <p className={`text-lg font-bold ${isAI ? 'text-red-700 dark:text-red-400' : 'text-green-700 dark:text-green-400'}`}>
                                                {isAI ? 'AI-Generated Image Detected' : 'Real / Authentic Image'}
                                            </p>
                                            <p className="text-sm text-[#666666] dark:text-[#8e8e8e] mt-0.5">
                                                {isAI
                                                    ? 'This image appears to be generated by an AI model.'
                                                    : 'This image appears to be a real photograph, not AI-generated.'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Confidence bar */}
                                    <div className="mt-4">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs text-[#666666] dark:text-[#8e8e8e]">Confidence</span>
                                            <span className={`text-sm font-semibold ${isAI ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                                {confidencePct}%
                                            </span>
                                        </div>
                                        <div className="w-full h-2 rounded-full bg-[#e5e5e5] dark:bg-[#2f2f2f] overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${confidencePct}%` }}
                                                transition={{ duration: 0.6, ease: 'easeOut' }}
                                                className={`h-full rounded-full ${isAI ? 'bg-red-500' : 'bg-green-500'}`}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Per-model breakdown */}
                                {result.model_results && Object.keys(result.model_results).length > 0 && (
                                    <div className="p-4 rounded-xl bg-white dark:bg-[#1f1f1f] border border-[#e5e5e5] dark:border-[#2f2f2f]">
                                        <p className="text-xs font-medium uppercase tracking-wide text-[#8e8e8e] mb-3">Model Breakdown</p>
                                        <div className="space-y-2">
                                            {Object.entries(result.model_results).map(([model, info]) => (
                                                <div key={model} className="flex items-center justify-between text-sm">
                                                    <span className="text-[#444444] dark:text-[#b4b4b4] capitalize">{model.replace(/_/g, ' ')}</span>
                                                    <span className={`font-medium text-xs px-2 py-0.5 rounded-full ${info.prediction === 'ai' || info.prediction === 'fake'
                                                        ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'
                                                        : 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400'
                                                        }`}>
                                                        {info.prediction} · {Math.round((info.confidence ?? 0) * 100)}%
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Explanation */}
                                {result.explanation && (
                                    <div className="p-4 rounded-xl bg-white dark:bg-[#1f1f1f] border border-[#e5e5e5] dark:border-[#2f2f2f]">
                                        <p className="text-xs font-medium uppercase tracking-wide text-[#8e8e8e] mb-2">Analysis</p>
                                        <p className="text-sm text-[#444444] dark:text-[#b4b4b4] leading-relaxed">{result.explanation}</p>
                                    </div>
                                )}

                                {/* Analyze another */}
                                <button
                                    onClick={clearImage}
                                    className="w-full py-2.5 border border-[#e5e5e5] dark:border-[#424242] rounded-xl text-sm text-[#666666] dark:text-[#8e8e8e] hover:bg-[#ececec] dark:hover:bg-[#2f2f2f] transition-colors"
                                >
                                    Analyze Another Image
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
