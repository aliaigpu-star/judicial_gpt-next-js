'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
    isLoading?: boolean;
}

export default function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'danger',
    isLoading = false
}: ConfirmModalProps) {
    if (!isOpen) return null;

    const colors = {
        danger: {
            bg: 'bg-red-50 dark:bg-red-500/10',
            icon: 'text-red-600 dark:text-red-400',
            button: 'bg-red-600 hover:bg-red-700 text-white'
        },
        warning: {
            bg: 'bg-yellow-50 dark:bg-yellow-500/10',
            icon: 'text-yellow-600 dark:text-yellow-400',
            button: 'bg-[#0d0d0d] dark:bg-[#ececec] text-white dark:text-[#0d0d0d] hover:opacity-80'
        },
        info: {
            bg: 'bg-blue-50 dark:bg-blue-500/10',
            icon: 'text-blue-600 dark:text-blue-400',
            button: 'bg-[#0d0d0d] dark:bg-[#ececec] text-white dark:text-[#0d0d0d] hover:opacity-80'
        }
    };

    const colorScheme = colors[type];

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ duration: 0.15 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white dark:bg-[#2f2f2f] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-[#e5e5e5] dark:border-[#424242]"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-5 border-b border-[#e5e5e5] dark:border-[#424242]">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${colorScheme.bg}`}>
                                <AlertTriangle className={`w-5 h-5 ${colorScheme.icon}`} />
                            </div>
                            <h2 className="text-lg font-semibold text-[#0d0d0d] dark:text-[#ececec]">{title}</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-[#ececec] dark:hover:bg-[#424242] rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5 text-[#666666] dark:text-[#b4b4b4]" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-5">
                        <p className="text-[#666666] dark:text-[#b4b4b4] text-base leading-relaxed">{message}</p>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 p-5 border-t border-[#e5e5e5] dark:border-[#424242] bg-[#f9f9f9] dark:bg-[#171717]">
                        <button
                            onClick={onClose}
                            disabled={isLoading}
                            className="px-4 py-2.5 text-[#0d0d0d] dark:text-[#ececec] hover:bg-[#ececec] dark:hover:bg-[#424242] rounded-lg transition-colors font-medium text-sm disabled:opacity-50"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            disabled={isLoading}
                            className={`px-4 py-2.5 rounded-lg font-medium text-sm transition-all disabled:opacity-50 ${colorScheme.button}`}
                        >
                            {isLoading ? 'Processing...' : confirmText}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
