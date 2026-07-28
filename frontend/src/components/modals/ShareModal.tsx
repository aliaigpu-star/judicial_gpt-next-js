'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Link2, Copy, Check, Eye, Shield, AlertTriangle, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    conversationId: string;
    conversationTitle: string;
}

export default function ShareModal({ isOpen, onClose, conversationId, conversationTitle }: ShareModalProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [isShared, setIsShared] = useState(false);
    const [shareUrl, setShareUrl] = useState('');
    const [viewCount, setViewCount] = useState(0);
    const [copied, setCopied] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [isRevoking, setIsRevoking] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && conversationId) {
            loadShareStatus();
        }
    }, [isOpen, conversationId]);

    const loadShareStatus = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const status = await api.getShareStatus(conversationId);
            setIsShared(status.isShared);
            setShareUrl(status.shareUrl || '');
            setViewCount(status.viewCount || 0);
        } catch (error: any) {
            console.error('Failed to load share status:', error);
            setError(error.message || 'Failed to load share status');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateLink = async () => {
        setIsCreating(true);
        setError(null);
        try {
            const result = await api.createShareLink(conversationId);
            setIsShared(true);
            setShareUrl(result.shareUrl);
            setViewCount(0);
        } catch (error: any) {
            console.error('Failed to create share link:', error);
            setError(error.message || 'Failed to create share link');
        } finally {
            setIsCreating(false);
        }
    };

    const handleRevokeLink = async () => {
        setIsRevoking(true);
        try {
            await api.revokeShare(conversationId);
            setIsShared(false);
            setShareUrl('');
            setViewCount(0);
        } catch (error) {
            console.error('Failed to revoke share link:', error);
        } finally {
            setIsRevoking(false);
        }
    };

    const handleCopy = async () => {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(shareUrl);
            } else {
                // Fallback for non-secure contexts (like HTTP on VPS)
                const textArea = document.createElement("textarea");
                textArea.value = shareUrl;
                textArea.style.position = "fixed";
                textArea.style.left = "-999999px";
                textArea.style.top = "-999999px";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                try {
                    document.execCommand('copy');
                } catch (err) {
                    console.error('Fallback copy failed', err);
                }
                textArea.remove();
            }
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('Failed to copy:', error);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
                        <div className="flex items-center gap-2">
                            <Link2 className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Share Chat
                            </h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-4 space-y-4">
                        {isLoading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
                            </div>
                        ) : (
                            <>
                                {/* Conversation title */}
                                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Sharing:</p>
                                    <p className="font-medium text-gray-900 dark:text-white truncate">
                                        {conversationTitle || 'Untitled Conversation'}
                                    </p>
                                </div>

                                {/* Error display */}
                                {error && (
                                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4" />
                                        {error}
                                    </div>
                                )}

                                {isShared ? (
                                    <>
                                        {/* Share URL */}
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Share Link
                                            </label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={shareUrl}
                                                    readOnly
                                                    className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
                                                />
                                                <button
                                                    onClick={handleCopy}
                                                    className="px-3 py-2 bg-[#0d0d0d] dark:bg-[#ececec] text-white dark:text-[#0d0d0d] rounded-lg hover:opacity-90 transition-opacity flex items-center gap-1 font-medium"
                                                >
                                                    {copied ? (
                                                        <>
                                                            <Check className="w-4 h-4" />
                                                            Copied
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Copy className="w-4 h-4" />
                                                            Copy
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        {/* View count */}
                                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                            <Eye className="w-4 h-4" />
                                            <span>{viewCount} view{viewCount !== 1 ? 's' : ''}</span>
                                        </div>

                                        {/* Revoke button */}
                                        <button
                                            onClick={handleRevokeLink}
                                            disabled={isRevoking}
                                            className="w-full px-4 py-2 border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                                        >
                                            {isRevoking ? 'Revoking...' : 'Revoke Share Link'}
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={handleCreateLink}
                                        disabled={isCreating}
                                        className="w-full px-4 py-3 bg-[#0d0d0d] dark:bg-[#ececec] text-white dark:text-[#0d0d0d] rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
                                    >
                                        {isCreating ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Creating Link...
                                            </>
                                        ) : (
                                            <>
                                                <Link2 className="w-4 h-4" />
                                                Create Share Link
                                            </>
                                        )}
                                    </button>
                                )}

                                {/* Security Info - Simplified */}
                                <div className="mt-2 text-center">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Anyone with the URL will be able to view this shared chat.
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
