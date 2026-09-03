'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    PanelLeft, MoreHorizontal, Pin, Archive, Trash2, Upload, ChevronDown, Edit3, Check, X, RotateCcw
} from 'lucide-react';

interface ChatHeaderProps {
    sidebarOpen: boolean;
    onToggleSidebar: () => void;
    conversationId: string | null;
    conversationTitle: string;
    isPinned?: boolean;
    isArchived?: boolean;
    onRenameConversation?: (id: string, newTitle: string) => void;
    onPinConversation?: (id: string) => void;
    onArchiveConversation?: (id: string) => void;
    onDeleteConversation?: (id: string) => void;
    onShareConversation?: (id: string) => void;
    isTemporaryMode?: boolean;
    onToggleTemporaryMode?: () => void;
    showTemporaryToggle?: boolean;
}

export default function ChatHeader({
    sidebarOpen,
    onToggleSidebar,
    conversationId,
    conversationTitle,
    isPinned,
    isArchived,
    onRenameConversation,
    onPinConversation,
    onArchiveConversation,
    onDeleteConversation,
    onShareConversation,
    isTemporaryMode,
    onToggleTemporaryMode,
    showTemporaryToggle
}: ChatHeaderProps) {
    const [showOptionsMenu, setShowOptionsMenu] = useState(false);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [titleEditValue, setTitleEditValue] = useState('');
    const optionsMenuRef = useRef<HTMLDivElement>(null);

    // Close options menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (optionsMenuRef.current && !optionsMenuRef.current.contains(e.target as Node)) {
                setShowOptionsMenu(false);
            }
        };
        if (showOptionsMenu) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [showOptionsMenu]);

    const handleRenameSubmit = () => {
        if (conversationId && titleEditValue.trim() && onRenameConversation) {
            onRenameConversation(conversationId, titleEditValue.trim());
            setIsEditingTitle(false);
        }
    };

    const isValidConversation = conversationId && !conversationId.startsWith('temp_') && conversationId !== 'new';

    return (
        <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 bg-white/80 dark:bg-[#212121]/80 backdrop-blur-md">
            <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Sidebar toggle and New Chat removed from header per user request */}

                {/* Model selector - ChatGPT style */}
                {isEditingTitle ? (
                    <div className="flex items-center gap-2 flex-1 max-w-md">
                        <input
                            type="text"
                            value={titleEditValue}
                            onChange={(e) => setTitleEditValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRenameSubmit();
                                if (e.key === 'Escape') setIsEditingTitle(false);
                            }}
                            className="flex-1 bg-[#f4f4f4] dark:bg-[#2f2f2f] px-3 py-1.5 rounded-lg text-sm outline-none text-[#0d0d0d] dark:text-[#ececec]"
                            autoFocus
                        />
                        <button onClick={handleRenameSubmit} className="p-1.5 hover:bg-[#ececec] dark:hover:bg-[#2f2f2f] text-[#00a859] rounded-lg">
                            <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => setIsEditingTitle(false)} className="p-1.5 hover:bg-[#ececec] dark:hover:bg-[#2f2f2f] text-[#666666] rounded-lg">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    <button className="flex items-center gap-1.5 font-semibold text-[#0d0d0d] dark:text-[#ececec] hover:bg-[#ececec] dark:hover:bg-[#2f2f2f] px-3 py-1.5 rounded-lg transition-colors">
                        <span className="text-lg">JudicialGPT</span>
                        <ChevronDown className="w-4 h-4 text-[#666666] dark:text-[#b4b4b4]" />
                    </button>
                )}
            </div>

            <div className="flex items-center gap-1">
                {/* Temporary Chat Toggle - ChatGPT style circular button */}
                {showTemporaryToggle && onToggleTemporaryMode && (
                    <button
                        onClick={onToggleTemporaryMode}
                        className={`p-2 rounded-full transition-all duration-200 ${isTemporaryMode
                            ? 'text-[#0d0d0d] dark:text-[#ececec] bg-transparent hover:bg-[#ececec] dark:hover:bg-[#2f2f2f]'
                            : 'text-[#666666] dark:text-[#b4b4b4] hover:bg-[#ececec] dark:hover:bg-[#2f2f2f]'
                            }`}
                        title={isTemporaryMode ? "Turn off temporary chat" : "Turn on temporary chat"}
                    >
                        {isTemporaryMode ? (
                            // Active Icon (Dashed circle with check)
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6">
                                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 4" />
                                <path d="M8 12L11 15L16 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        ) : (
                            // Inactive Icon (Dashed circle)
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6">
                                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 4" />
                            </svg>
                        )}
                    </button>
                )}

                {/* Share button - ChatGPT style */}
                {isValidConversation && onShareConversation && (
                    <button
                        onClick={() => onShareConversation(conversationId)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#ececec] dark:hover:bg-[#2f2f2f] transition-colors text-[#0d0d0d] dark:text-[#ececec]"
                    >
                        <Upload className="w-4 h-4" />
                        <span className="text-sm font-medium">Share</span>
                    </button>
                )}

                {/* 3-dot Menu */}
                {isValidConversation && (
                    <div className="relative" ref={optionsMenuRef}>
                        <button
                            onClick={() => setShowOptionsMenu(!showOptionsMenu)}
                            className="p-2 rounded-lg hover:bg-[#ececec] dark:hover:bg-[#2f2f2f] transition-colors text-[#666666] dark:text-[#b4b4b4]"
                        >
                            <MoreHorizontal className="w-5 h-5" />
                        </button>

                        <AnimatePresence>
                            {showOptionsMenu && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                    transition={{ duration: 0.1 }}
                                    className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-[#2f2f2f] rounded-xl shadow-lg border border-[#e5e5e5] dark:border-[#424242] py-1 z-50 origin-top-right overflow-hidden"
                                >
                                    <button
                                        onClick={() => {
                                            setTitleEditValue(conversationTitle);
                                            setIsEditingTitle(true);
                                            setShowOptionsMenu(false);
                                        }}
                                        className="w-full px-3 py-2.5 text-left text-sm hover:bg-[#f4f4f4] dark:hover:bg-[#424242] flex items-center gap-3 text-[#0d0d0d] dark:text-[#ececec] transition-colors"
                                    >
                                        <Edit3 className="w-4 h-4 text-[#666666] dark:text-[#b4b4b4]" /> Rename
                                    </button>
                                    <button
                                        onClick={() => {
                                            onPinConversation?.(conversationId);
                                            setShowOptionsMenu(false);
                                        }}
                                        className="w-full px-3 py-2.5 text-left text-sm hover:bg-[#f4f4f4] dark:hover:bg-[#424242] flex items-center gap-3 text-[#0d0d0d] dark:text-[#ececec] transition-colors"
                                    >
                                        <Pin className="w-4 h-4 text-[#666666] dark:text-[#b4b4b4]" /> {isPinned ? 'Unpin' : 'Pin'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            onArchiveConversation?.(conversationId);
                                            setShowOptionsMenu(false);
                                        }}
                                        className="w-full px-3 py-2.5 text-left text-sm hover:bg-[#f4f4f4] dark:hover:bg-[#424242] flex items-center gap-3 text-[#0d0d0d] dark:text-[#ececec] transition-colors"
                                    >
                                        <Archive className="w-4 h-4 text-[#666666] dark:text-[#b4b4b4]" /> {isArchived ? 'Unarchive' : 'Archive'}
                                    </button>
                                    <div className="my-1 border-t border-[#e5e5e5] dark:border-[#424242]" />
                                    <button
                                        onClick={() => {
                                            onDeleteConversation?.(conversationId);
                                            setShowOptionsMenu(false);
                                        }}
                                        className="w-full px-3 py-2.5 text-left text-sm hover:bg-red-50 dark:hover:bg-red-500/10 text-red-600 flex items-center gap-3 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" /> Delete chat
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </header>
    );
}
