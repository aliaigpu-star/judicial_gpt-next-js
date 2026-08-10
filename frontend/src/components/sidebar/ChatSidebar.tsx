'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    Pin,
    Archive,
    Trash2,
    MoreHorizontal,
    Edit3,
    X,
    Check,
    Settings,
    LogOut,
    PanelLeftClose,
    PanelLeft,
    Shield,
    Upload,
    Sparkles,
    HelpCircle,
    User,
    ChevronRight,
    ChevronDown,
    MessageSquare,
    Scale,
    FileText,
    Gavel,
    BookOpen
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

interface Conversation {
    id: string;
    title: string;
    isPinned?: boolean;
    isArchived?: boolean;
    updatedAt?: string;
}

interface ChatSidebarProps {
    conversations: Conversation[];
    currentConversationId: string | null;
    onSelectConversation: (id: string) => void;
    onNewChat: () => void;
    onDeleteConversation: (id: string) => void;
    onRenameConversation: (id: string, newTitle: string) => void;
    onPinConversation: (id: string) => void;
    onArchiveConversation: (id: string) => void;
    onShareConversation: (id: string) => void;
    onClearAll: () => void;
    showArchived: boolean;
    isOpen: boolean;
    onToggle: () => void;
    user: any;
    onLogout: () => void;
    onOpenProfile: () => void;
    onOpenSettings: (tab?: string) => void;
    onToggleArchived: () => void;
    sidebarWidth: number;
}

export default function ChatSidebar({
    conversations,
    currentConversationId,
    onSelectConversation,
    onNewChat,
    onDeleteConversation,
    onRenameConversation,
    onPinConversation,
    onArchiveConversation,
    onShareConversation,
    onClearAll,
    showArchived,
    isOpen,
    onToggle,
    user,
    onLogout,
    onOpenProfile,
    onOpenSettings,
    onToggleArchived,
    sidebarWidth
}: ChatSidebarProps) {
    const router = useRouter();
    const pathname = usePathname();
    const isJudgmentSearchActive = pathname === '/chat/judgment-search';
    const isSummarizeActive = pathname === '/chat/summarize';
    const isCivilJudgmentActive = pathname === '/chat/civil-judgment';
    const isCriminalJudgmentActive = pathname === '/chat/criminal-judgment';
    const isJudgementWritingActive = isCivilJudgmentActive || isCriminalJudgmentActive;
    const isCivilLawActive = pathname === '/chat/civil-law';
    const isCriminalLawActive = pathname === '/chat/criminal-law';
    const isLawAgentsActive = isCivilLawActive || isCriminalLawActive;

    const [searchQuery, setSearchQuery] = useState('');
    const [showSearchInput, setShowSearchInput] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [agentMenu, setAgentMenu] = useState<'judgment' | 'law' | null>(null);

    // Close menus when clicking outside
    useEffect(() => {
        const handleClickOutside = () => {
            setMenuOpenId(null);
            setShowUserMenu(false);
            setAgentMenu(null);
        };

        if (menuOpenId || showUserMenu || agentMenu) {
            document.addEventListener('click', handleClickOutside);
        }

        return () => document.removeEventListener('click', handleClickOutside);
    }, [menuOpenId, showUserMenu, agentMenu]);

    // Filter conversations
    const filteredConversations = conversations.filter(conv => {
        const matchesSearch = conv.title?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesArchive = showArchived ? true : !conv.isArchived;
        return matchesSearch && matchesArchive;
    });

    // Separate pinned and regular conversations
    const pinnedConversations = filteredConversations.filter(c => c.isPinned && !c.isArchived);
    const regularConversations = filteredConversations.filter(c => !c.isPinned && !c.isArchived);
    const archivedConversations = filteredConversations.filter(c => c.isArchived);

    const handleRename = (id: string) => {
        if (editTitle.trim()) {
            onRenameConversation(id, editTitle.trim());
        }
        setEditingId(null);
    };

    const startEditing = (conv: Conversation) => {
        setEditingId(conv.id);
        setEditTitle(conv.title);
        setMenuOpenId(null);
    };

    const ConversationItem = ({ conv }: { conv: Conversation }) => {
        const isActive = conv.id === currentConversationId;
        const isEditing = editingId === conv.id;
        const isMenuOpen = menuOpenId === conv.id;

        return (
            <div
                className={`group relative flex items-center px-3 py-1 rounded-lg cursor-pointer transition-all duration-150 mx-2 ${isActive
                    ? 'bg-[#ececec] dark:bg-[#2f2f2f]'
                    : 'hover:bg-[#ececec] dark:hover:bg-[#212121]'
                    }`}
                onClick={() => !isEditing && onSelectConversation(conv.id)}
            >
                {isEditing ? (
                    <div className="flex-1 flex items-center gap-1">
                        <input
                            type="text"
                            value={editTitle}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditTitle(e.target.value)}
                            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                                if (e.key === 'Enter') handleRename(conv.id);
                                if (e.key === 'Escape') setEditingId(null);
                            }}
                            className="flex-1 bg-white dark:bg-[#2f2f2f] px-2 py-1 rounded-md text-sm outline-none border border-[#e5e5e5] dark:border-[#424242]"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                        />
                        <button
                            onClick={(e) => { e.stopPropagation(); handleRename(conv.id); }}
                            className="p-1 hover:bg-[#d9d9d9] dark:hover:bg-[#424242] rounded"
                        >
                            <Check className="w-4 h-4 text-[#0c9344]" />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); setEditingId(null); }}
                            className="p-1 hover:bg-[#d9d9d9] dark:hover:bg-[#424242] rounded"
                        >
                            <X className="w-4 h-4 text-[#666666] dark:text-[#8e8e8e]" />
                        </button>
                    </div>
                ) : (
                    <>
                        <span className="flex-1 text-sm truncate text-[#0d0d0d] dark:text-[#ececec]">
                            {conv.title || 'New Chat'}
                        </span>

                        {conv.isPinned && (
                            <Pin className="w-3 h-3 text-[#0c9344] flex-shrink-0 opacity-60" />
                        )}

                        {/* Gradient fade effect on right side */}
                        <div className={`absolute right-0 top-0 bottom-0 w-20 pointer-events-none rounded-r-lg ${isActive
                            ? 'bg-gradient-to-l from-[#ececec] dark:from-[#2f2f2f] via-[#ececec]/80 dark:via-[#2f2f2f]/80 to-transparent'
                            : 'bg-gradient-to-l from-[#f9f9f9] dark:from-[#171717] via-[#f9f9f9]/80 dark:via-[#171717]/80 to-transparent group-hover:from-[#ececec] dark:group-hover:from-[#212121] group-hover:via-[#ececec]/80 dark:group-hover:via-[#212121]/80'
                            }`} />

                        <div className="opacity-0 group-hover:opacity-100 transition-opacity relative z-10">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setMenuOpenId(isMenuOpen ? null : conv.id);
                                }}
                                className="p-1 hover:bg-[#d9d9d9] dark:hover:bg-[#424242] rounded"
                            >
                                <MoreHorizontal className="w-4 h-4 text-[#666666] dark:text-[#b4b4b4]" />
                            </button>
                        </div>
                    </>
                )}

                {/* Dropdown menu */}
                <AnimatePresence>
                    {isMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -5 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -5 }}
                            transition={{ duration: 0.1 }}
                            className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-[#2f2f2f] rounded-xl shadow-lg border border-[#e5e5e5] dark:border-[#424242] py-1 min-w-[180px] overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                onClick={() => startEditing(conv)}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-[#f4f4f4] dark:hover:bg-[#424242] flex items-center gap-3 text-[#0d0d0d] dark:text-[#ececec] transition-colors"
                            >
                                <Edit3 className="w-4 h-4 text-[#666666] dark:text-[#b4b4b4]" /> Rename
                            </button>
                            <button
                                onClick={() => { onShareConversation(conv.id); setMenuOpenId(null); }}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-[#f4f4f4] dark:hover:bg-[#424242] flex items-center gap-3 text-[#0d0d0d] dark:text-[#ececec] transition-colors"
                            >
                                <Upload className="w-4 h-4 text-[#666666] dark:text-[#b4b4b4]" /> Share
                            </button>
                            <button
                                onClick={() => { onPinConversation(conv.id); setMenuOpenId(null); }}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-[#f4f4f4] dark:hover:bg-[#424242] flex items-center gap-3 text-[#0d0d0d] dark:text-[#ececec] transition-colors"
                            >
                                <Pin className="w-4 h-4 text-[#666666] dark:text-[#b4b4b4]" /> {conv.isPinned ? 'Unpin' : 'Pin'}
                            </button>
                            <button
                                onClick={() => { onArchiveConversation(conv.id); setMenuOpenId(null); }}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-[#f4f4f4] dark:hover:bg-[#424242] flex items-center gap-3 text-[#0d0d0d] dark:text-[#ececec] transition-colors"
                            >
                                <Archive className="w-4 h-4 text-[#666666] dark:text-[#b4b4b4]" /> {conv.isArchived ? 'Unarchive' : 'Archive'}
                            </button>
                            <div className="my-1 border-t border-[#e5e5e5] dark:border-[#424242]" />
                            <button
                                onClick={() => { onDeleteConversation(conv.id); setMenuOpenId(null); }}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-3 text-red-600 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" /> Delete
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    };

    // Collapsed View Render
    if (!isOpen) {
        return (
            <div className="h-full flex flex-col bg-[#f9f9f9] dark:bg-[#171717] items-center py-2 w-full border-r border-transparent dark:border-[#2f2f2f]">
                {/* Header Icons - ChatGPT style */}
                <div className="flex flex-col gap-0.5 items-center pt-2 pb-1">
                    {/* Toggle/Logo Button */}
                    {/* Toggle/Logo Button */}
                    <button
                        onClick={onToggle}
                        className="w-10 h-10 flex items-center justify-center hover:bg-[#ececec] dark:hover:bg-[#2f2f2f] rounded-xl transition-colors group"
                        title="Open sidebar"
                    >
                        <div className="relative w-6 h-6 flex items-center justify-center">
                            <div className="absolute inset-0 rounded-full overflow-hidden transition-opacity duration-200 group-hover:opacity-0">
                                <img
                                    src="/judicial-logo.png"
                                    alt="Judicial GPT"
                                    className="object-cover w-full h-full"
                                />
                            </div>
                            <PanelLeft className="w-5 h-5 text-[#444444] dark:text-[#b4b4b4] opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute" />
                        </div>
                    </button>

                    {/* New Chat Button */}
                    <button
                        onClick={onNewChat}
                        className="w-10 h-10 flex items-center justify-center hover:bg-[#ececec] dark:hover:bg-[#2f2f2f] rounded-xl transition-colors"
                        title="New chat"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#444444] dark:text-[#b4b4b4]">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                    </button>

                    {/* Judgment Search Button - Collapsed */}
                    <button
                        onClick={() => router.push('/chat/judgment-search')}
                        className={`w-10 h-10 flex items-center justify-center rounded-xl transition-colors ${isJudgmentSearchActive
                            ? 'bg-[#0c9344]/15 dark:bg-[#0c9344]/10'
                            : 'hover:bg-[#ececec] dark:hover:bg-[#2f2f2f]'
                            }`}
                        title="Judgment Search"
                    >
                        <Scale className={`w-5 h-5 ${isJudgmentSearchActive
                            ? 'text-[#0c9344]'
                            : 'text-[#444444] dark:text-[#b4b4b4]'
                            }`} />
                    </button>

                    {/* Judgement Writing Button - Collapsed */}
                    <div className="relative">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setAgentMenu(agentMenu === 'judgment' ? null : 'judgment');
                            }}
                            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-colors ${isJudgementWritingActive || agentMenu === 'judgment'
                                ? 'bg-[#3b82f6]/15 dark:bg-[#3b82f6]/10'
                                : 'hover:bg-[#ececec] dark:hover:bg-[#2f2f2f]'
                                }`}
                            title="Judgement Writing"
                        >
                            <Gavel className={`w-5 h-5 ${isJudgementWritingActive || agentMenu === 'judgment'
                                ? 'text-[#3b82f6]'
                                : 'text-[#444444] dark:text-[#b4b4b4]'
                                }`} />
                        </button>
                        <AnimatePresence>
                            {agentMenu === 'judgment' && (
                                <motion.div
                                    initial={{ opacity: 0, x: -6, scale: 0.96 }}
                                    animate={{ opacity: 1, x: 0, scale: 1 }}
                                    exit={{ opacity: 0, x: -6, scale: 0.96 }}
                                    transition={{ duration: 0.15 }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="absolute left-full top-0 ml-2 z-50 w-56 rounded-xl border border-[#e5e5e5] dark:border-[#424242] bg-white dark:bg-[#2f2f2f] shadow-lg overflow-hidden p-1.5"
                                >
                                    <p className="px-2.5 pt-1.5 pb-2 text-[11px] font-medium uppercase tracking-wide text-[#8e8e8e]">
                                        Judgement Writing
                                    </p>
                                    <button
                                        onClick={() => {
                                            setAgentMenu(null);
                                            router.push('/chat/civil-judgment');
                                        }}
                                        className={`w-full flex items-start gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${isCivilJudgmentActive
                                            ? 'bg-[#3b82f6]/10 text-[#3b82f6]'
                                            : 'text-[#0d0d0d] dark:text-[#ececec] hover:bg-[#f4f4f4] dark:hover:bg-[#3a3a3a]'
                                            }`}
                                    >
                                        <Gavel className="w-4 h-4 mt-0.5 flex-shrink-0 text-[#3b82f6]" />
                                        <span className="min-w-0">
                                            <span className="block text-sm font-medium">Civil Judgement</span>
                                            <span className="block text-[11px] text-[#8e8e8e] mt-0.5 leading-snug">Draft civil court judgments</span>
                                        </span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            setAgentMenu(null);
                                            router.push('/chat/criminal-judgment');
                                        }}
                                        className={`w-full flex items-start gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${isCriminalJudgmentActive
                                            ? 'bg-[#dc2626]/10 text-[#dc2626]'
                                            : 'text-[#0d0d0d] dark:text-[#ececec] hover:bg-[#f4f4f4] dark:hover:bg-[#3a3a3a]'
                                            }`}
                                    >
                                        <Shield className="w-4 h-4 mt-0.5 flex-shrink-0 text-[#dc2626]" />
                                        <span className="min-w-0">
                                            <span className="block text-sm font-medium">Criminal Judgement</span>
                                            <span className="block text-[11px] text-[#8e8e8e] mt-0.5 leading-snug">Draft criminal court judgments</span>
                                        </span>
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Law Agents Button - Collapsed */}
                    <div className="relative">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setAgentMenu(agentMenu === 'law' ? null : 'law');
                            }}
                            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-colors ${isLawAgentsActive || agentMenu === 'law'
                                ? 'bg-[#0ea5e9]/15 dark:bg-[#0ea5e9]/10'
                                : 'hover:bg-[#ececec] dark:hover:bg-[#2f2f2f]'
                                }`}
                            title="Law Agents"
                        >
                            <BookOpen className={`w-5 h-5 ${isLawAgentsActive || agentMenu === 'law'
                                ? 'text-[#0ea5e9]'
                                : 'text-[#444444] dark:text-[#b4b4b4]'
                                }`} />
                        </button>
                        <AnimatePresence>
                            {agentMenu === 'law' && (
                                <motion.div
                                    initial={{ opacity: 0, x: -6, scale: 0.96 }}
                                    animate={{ opacity: 1, x: 0, scale: 1 }}
                                    exit={{ opacity: 0, x: -6, scale: 0.96 }}
                                    transition={{ duration: 0.15 }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="absolute left-full top-0 ml-2 z-50 w-56 rounded-xl border border-[#e5e5e5] dark:border-[#424242] bg-white dark:bg-[#2f2f2f] shadow-lg overflow-hidden p-1.5"
                                >
                                    <p className="px-2.5 pt-1.5 pb-2 text-[11px] font-medium uppercase tracking-wide text-[#8e8e8e]">
                                        Law Agents
                                    </p>
                                    <button
                                        onClick={() => {
                                            setAgentMenu(null);
                                            router.push('/chat/civil-law');
                                        }}
                                        className={`w-full flex items-start gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${isCivilLawActive
                                            ? 'bg-[#0ea5e9]/10 text-[#0ea5e9]'
                                            : 'text-[#0d0d0d] dark:text-[#ececec] hover:bg-[#f4f4f4] dark:hover:bg-[#3a3a3a]'
                                            }`}
                                    >
                                        <Scale className="w-4 h-4 mt-0.5 flex-shrink-0 text-[#0ea5e9]" />
                                        <span className="min-w-0">
                                            <span className="block text-sm font-medium">Civil Law</span>
                                            <span className="block text-[11px] text-[#8e8e8e] mt-0.5 leading-snug">Ask civil law questions</span>
                                        </span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            setAgentMenu(null);
                                            router.push('/chat/criminal-law');
                                        }}
                                        className={`w-full flex items-start gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${isCriminalLawActive
                                            ? 'bg-[#f59e0b]/10 text-[#d97706]'
                                            : 'text-[#0d0d0d] dark:text-[#ececec] hover:bg-[#f4f4f4] dark:hover:bg-[#3a3a3a]'
                                            }`}
                                    >
                                        <BookOpen className="w-4 h-4 mt-0.5 flex-shrink-0 text-[#d97706]" />
                                        <span className="min-w-0">
                                            <span className="block text-sm font-medium">Criminal Law</span>
                                            <span className="block text-[11px] text-[#8e8e8e] mt-0.5 leading-snug">Ask criminal law questions</span>
                                        </span>
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>


                    {/* Summarize Button - Collapsed */}
                    <button
                        onClick={() => router.push('/chat/summarize')}
                        className={`w-10 h-10 flex items-center justify-center rounded-xl transition-colors ${isSummarizeActive
                            ? 'bg-[#7c3aed]/15 dark:bg-[#7c3aed]/10'
                            : 'hover:bg-[#ececec] dark:hover:bg-[#2f2f2f]'
                            }`}
                        title="Summarize Document"
                    >
                        <FileText className={`w-5 h-5 ${isSummarizeActive
                            ? 'text-[#7c3aed]'
                            : 'text-[#444444] dark:text-[#b4b4b4]'
                            }`} />
                    </button>

                    {/* Search Button */}
                    <button
                        onClick={() => {
                            onToggle();
                            setTimeout(() => setShowSearchInput(true), 100);
                        }}
                        className="w-10 h-10 flex items-center justify-center hover:bg-[#ececec] dark:hover:bg-[#2f2f2f] rounded-xl transition-colors"
                        title="Search"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#444444] dark:text-[#b4b4b4]">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                    </button>

                </div>

                {/* Collapsed List */}
                {/* Collapsed List - Removed per user request */}
                <div className="flex-1 w-full" />

                {/* Footer User */}
                <div className="mt-auto pt-4 pb-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowUserMenu(!showUserMenu);
                        }}
                        className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[#ececec] dark:hover:bg-[#2f2f2f] transition-colors overflow-hidden group relative"
                    >
                        {user?.avatarUrl ? (
                            <img src={user.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
                        ) : (
                            <div className="w-6 h-6 rounded-full bg-[#0c9344] flex items-center justify-center text-white text-xs font-medium">
                                {user?.name?.[0] || user?.email?.[0] || 'U'}
                            </div>
                        )}
                    </button>

                    <AnimatePresence>
                        {showUserMenu && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                transition={{ duration: 0.1 }}
                                className="fixed left-[70px] bottom-4 z-50 w-64 bg-white dark:bg-[#2f2f2f] rounded-xl shadow-lg border border-[#e5e5e5] dark:border-[#424242] overflow-hidden"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* User Profile Card */}
                                <div className="p-3 m-2 mb-1 bg-[#f9f9f9] dark:bg-[#171717] rounded-lg flex items-center gap-3">
                                    {user?.avatarUrl ? (
                                        <img src={user.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover" />
                                    ) : (
                                        <div className="w-9 h-9 rounded-full bg-[#a0522d] flex items-center justify-center text-white text-sm font-medium shrink-0">
                                            {user?.name?.[0] || user?.email?.[0] || 'Z'}
                                        </div>
                                    )}
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-sm font-medium text-[#0d0d0d] dark:text-[#ececec] truncate">
                                            {user?.name || 'zubitech'}
                                        </span>
                                        <span className="text-xs text-[#666666] dark:text-[#b4b4b4] truncate">
                                            @{user?.name ? user.name.toLowerCase().replace(/\s+/g, '_') : 'zubitech'}
                                        </span>
                                    </div>
                                </div>

                                {/* Menu Items */}
                                <div className="py-1">
                                    <button className="w-full px-4 py-2.5 text-left text-sm hover:bg-[#f4f4f4] dark:hover:bg-[#424242] flex items-center gap-3 text-[#0d0d0d] dark:text-[#ececec] transition-colors">
                                        <Sparkles className="w-4 h-4" /> Upgrade plan
                                    </button>
                                    <button
                                        onClick={() => { onOpenSettings('Personalization'); setShowUserMenu(false); }}
                                        className="w-full px-4 py-2.5 text-left text-sm hover:bg-[#f4f4f4] dark:hover:bg-[#424242] flex items-center gap-3 text-[#0d0d0d] dark:text-[#ececec] transition-colors"
                                    >
                                        <User className="w-4 h-4" /> Personalization
                                    </button>
                                    <button
                                        onClick={() => { onOpenSettings('General'); setShowUserMenu(false); }}
                                        className="w-full px-4 py-2.5 text-left text-sm hover:bg-[#f4f4f4] dark:hover:bg-[#424242] flex items-center gap-3 text-[#0d0d0d] dark:text-[#ececec] transition-colors"
                                    >
                                        <Settings className="w-4 h-4" /> Settings
                                    </button>

                                    {/* Admin Panel - Only show for admins */}
                                    {user?.role === 'admin' && (
                                        <Link href="/admin" onClick={() => setShowUserMenu(false)}>
                                            <div className="w-full px-4 py-2.5 text-left text-sm hover:bg-[#f4f4f4] dark:hover:bg-[#424242] flex items-center gap-3 text-[#0c9344] transition-colors">
                                                <Shield className="w-4 h-4" /> Admin Panel
                                            </div>
                                        </Link>
                                    )}
                                </div>

                                <div className="mx-4 my-1 border-t border-[#e5e5e5] dark:border-[#424242]" />

                                <div className="py-1">
                                    <button className="w-full px-4 py-2.5 text-left text-sm hover:bg-[#f4f4f4] dark:hover:bg-[#424242] flex items-center justify-between text-[#0d0d0d] dark:text-[#ececec] transition-colors">
                                        <div className="flex items-center gap-3">
                                            <HelpCircle className="w-4 h-4" /> Help
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-[#666666] dark:text-[#b4b4b4]" />
                                    </button>
                                    <button
                                        onClick={() => { onLogout(); setShowUserMenu(false); }}
                                        className="w-full px-4 py-2.5 text-left text-sm hover:bg-[#f4f4f4] dark:hover:bg-[#424242] flex items-center gap-3 text-[#0d0d0d] dark:text-[#ececec] transition-colors"
                                    >
                                        <LogOut className="w-4 h-4" /> Log out
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-[#f9f9f9] dark:bg-[#171717] sidebar-container w-full">
            {/* Header - ChatGPT style */}
            <div className="flex items-center justify-between px-3 pt-3 pb-2">
                {/* Logo */}
                <div className="flex items-center gap-2 pl-2">
                    <button
                        onClick={onNewChat}
                        className="relative w-8 h-8 rounded-full overflow-hidden hover:opacity-80 transition-opacity cursor-pointer"
                        title="New chat"
                    >
                        <img
                            src="/judicial-logo.png"
                            alt="Judicial GPT"
                            className="object-cover w-full h-full"
                        />
                    </button>
                </div>

                {/* Sidebar toggle */}
                <button
                    onClick={onToggle}
                    className="p-2 hover:bg-[#ececec] dark:hover:bg-[#2f2f2f] rounded-lg transition-colors text-[#0d0d0d] dark:text-[#ececec]"
                    title="Close sidebar"
                >
                    <PanelLeftClose className="w-5 h-5" />
                </button>
            </div>

            {/* Actions */}
            <div className="px-3 py-2 space-y-1">
                {/* New Chat Button */}
                <button
                    onClick={onNewChat}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-[#0d0d0d] dark:text-[#ececec] hover:bg-[#ececec] dark:hover:bg-[#2f2f2f] rounded-lg transition-colors"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    New Chat
                </button>

                {/* Judgment Search Button - Expanded */}
                <button
                    onClick={() => router.push('/chat/judgment-search')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all duration-200 ${isJudgmentSearchActive
                        ? 'bg-[#0c9344]/10 dark:bg-[#0c9344]/10 text-[#0c9344]'
                        : 'text-[#0d0d0d] dark:text-[#ececec] hover:bg-[#ececec] dark:hover:bg-[#2f2f2f]'
                        }`}
                >
                    <Scale className={`w-4 h-4 ${isJudgmentSearchActive ? 'text-[#0c9344]' : ''
                        }`} />
                    Judgment Search
                </button>

                {/* Judgement Writing Button - Expanded */}
                <div className="relative">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setAgentMenu(agentMenu === 'judgment' ? null : 'judgment');
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all duration-200 ${isJudgementWritingActive || agentMenu === 'judgment'
                            ? 'bg-[#3b82f6]/10 dark:bg-[#3b82f6]/10 text-[#3b82f6]'
                            : 'text-[#0d0d0d] dark:text-[#ececec] hover:bg-[#ececec] dark:hover:bg-[#2f2f2f]'
                            }`}
                    >
                        <Gavel className={`w-4 h-4 ${isJudgementWritingActive || agentMenu === 'judgment' ? 'text-[#3b82f6]' : ''}`} />
                        <span className="flex-1 text-left">Judgement Writing</span>
                        <ChevronDown className={`w-3.5 h-3.5 opacity-60 transition-transform ${agentMenu === 'judgment' ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                        {agentMenu === 'judgment' && (
                            <motion.div
                                initial={{ opacity: 0, y: -4, height: 0 }}
                                animate={{ opacity: 1, y: 0, height: 'auto' }}
                                exit={{ opacity: 0, y: -4, height: 0 }}
                                transition={{ duration: 0.15 }}
                                onClick={(e) => e.stopPropagation()}
                                className="overflow-hidden"
                            >
                                <div className="mt-1 ml-2 pl-2 border-l border-[#e5e5e5] dark:border-[#424242] space-y-0.5">
                                    <button
                                        onClick={() => {
                                            setAgentMenu(null);
                                            router.push('/chat/civil-judgment');
                                        }}
                                        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-sm transition-colors ${isCivilJudgmentActive
                                            ? 'bg-[#3b82f6]/10 text-[#3b82f6]'
                                            : 'text-[#0d0d0d] dark:text-[#ececec] hover:bg-[#ececec] dark:hover:bg-[#2f2f2f]'
                                            }`}
                                    >
                                        <Gavel className="w-3.5 h-3.5 text-[#3b82f6] flex-shrink-0" />
                                        Civil Judgement
                                    </button>
                                    <button
                                        onClick={() => {
                                            setAgentMenu(null);
                                            router.push('/chat/criminal-judgment');
                                        }}
                                        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-sm transition-colors ${isCriminalJudgmentActive
                                            ? 'bg-[#dc2626]/10 text-[#dc2626]'
                                            : 'text-[#0d0d0d] dark:text-[#ececec] hover:bg-[#ececec] dark:hover:bg-[#2f2f2f]'
                                            }`}
                                    >
                                        <Shield className="w-3.5 h-3.5 text-[#dc2626] flex-shrink-0" />
                                        Criminal Judgement
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Law Agents Button - Expanded */}
                <div className="relative">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setAgentMenu(agentMenu === 'law' ? null : 'law');
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all duration-200 ${isLawAgentsActive || agentMenu === 'law'
                            ? 'bg-[#0ea5e9]/10 dark:bg-[#0ea5e9]/10 text-[#0ea5e9]'
                            : 'text-[#0d0d0d] dark:text-[#ececec] hover:bg-[#ececec] dark:hover:bg-[#2f2f2f]'
                            }`}
                    >
                        <BookOpen className={`w-4 h-4 ${isLawAgentsActive || agentMenu === 'law' ? 'text-[#0ea5e9]' : ''}`} />
                        <span className="flex-1 text-left">Law Agents</span>
                        <ChevronDown className={`w-3.5 h-3.5 opacity-60 transition-transform ${agentMenu === 'law' ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                        {agentMenu === 'law' && (
                            <motion.div
                                initial={{ opacity: 0, y: -4, height: 0 }}
                                animate={{ opacity: 1, y: 0, height: 'auto' }}
                                exit={{ opacity: 0, y: -4, height: 0 }}
                                transition={{ duration: 0.15 }}
                                onClick={(e) => e.stopPropagation()}
                                className="overflow-hidden"
                            >
                                <div className="mt-1 ml-2 pl-2 border-l border-[#e5e5e5] dark:border-[#424242] space-y-0.5">
                                    <button
                                        onClick={() => {
                                            setAgentMenu(null);
                                            router.push('/chat/civil-law');
                                        }}
                                        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-sm transition-colors ${isCivilLawActive
                                            ? 'bg-[#0ea5e9]/10 text-[#0ea5e9]'
                                            : 'text-[#0d0d0d] dark:text-[#ececec] hover:bg-[#ececec] dark:hover:bg-[#2f2f2f]'
                                            }`}
                                    >
                                        <Scale className="w-3.5 h-3.5 text-[#0ea5e9] flex-shrink-0" />
                                        Civil Law
                                    </button>
                                    <button
                                        onClick={() => {
                                            setAgentMenu(null);
                                            router.push('/chat/criminal-law');
                                        }}
                                        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-sm transition-colors ${isCriminalLawActive
                                            ? 'bg-[#f59e0b]/10 text-[#d97706]'
                                            : 'text-[#0d0d0d] dark:text-[#ececec] hover:bg-[#ececec] dark:hover:bg-[#2f2f2f]'
                                            }`}
                                    >
                                        <BookOpen className="w-3.5 h-3.5 text-[#d97706] flex-shrink-0" />
                                        Criminal Law
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Summarize Button - Expanded */}
                <button
                    onClick={() => router.push('/chat/summarize')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all duration-200 ${isSummarizeActive
                        ? 'bg-[#7c3aed]/10 dark:bg-[#7c3aed]/10 text-[#7c3aed]'
                        : 'text-[#0d0d0d] dark:text-[#ececec] hover:bg-[#ececec] dark:hover:bg-[#2f2f2f]'
                        }`}
                >
                    <FileText className={`w-4 h-4 ${isSummarizeActive ? 'text-[#7c3aed]' : ''
                        }`} />
                    Summarize
                </button>

                {/* Search Button */}
                <button
                    onClick={() => setShowSearchInput(!showSearchInput)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-[#666666] dark:text-[#b4b4b4] hover:bg-[#ececec] dark:hover:bg-[#2f2f2f] rounded-lg transition-colors"
                >
                    <Search className="w-4 h-4" />
                    Search
                </button>
            </div>

            {/* Search Input (shown when toggled) */}
            <AnimatePresence>
                {showSearchInput && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-3 overflow-hidden"
                    >
                        <div className="relative pb-2">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666666] dark:text-[#8e8e8e]" />
                            <input
                                id="sidebar-search-input"
                                type="text"
                                placeholder="Search chats..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-8 py-2.5 bg-[#ececec] dark:bg-[#2f2f2f] rounded-lg text-sm outline-none text-[#0d0d0d] dark:text-[#ececec] placeholder-[#666666] dark:placeholder-[#8e8e8e]"
                                autoFocus
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-[#d9d9d9] dark:hover:bg-[#424242] rounded"
                                >
                                    <X className="w-3 h-3 text-[#666666] dark:text-[#8e8e8e]" />
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto pt-2 sidebar-scrollbar">
                {/* Pinned conversations */}
                {pinnedConversations.length > 0 && (
                    <div className="mb-2">
                        <div className="px-5 py-1.5 text-xs font-medium text-[#666666] dark:text-[#8e8e8e]">Pinned</div>
                        {pinnedConversations.map(conv => (
                            <ConversationItem key={conv.id} conv={conv} />
                        ))}
                    </div>
                )}

                {/* Regular conversations */}
                {regularConversations.length > 0 && (
                    <div className="space-y-0.5">
                        {pinnedConversations.length > 0 && (
                            <div className="px-5 py-1.5 text-xs font-medium text-[#666666] dark:text-[#8e8e8e]">Today</div>
                        )}
                        {regularConversations.map(conv => (
                            <ConversationItem key={conv.id} conv={conv} />
                        ))}
                    </div>
                )}

                {/* Archived conversations */}
                {showArchived && archivedConversations.length > 0 && (
                    <div className="mt-4">
                        <div className="px-5 py-1.5 text-xs font-medium text-[#666666] dark:text-[#8e8e8e]">Archived</div>
                        {archivedConversations.map(conv => (
                            <ConversationItem key={conv.id} conv={conv} />
                        ))}
                    </div>
                )}

                {filteredConversations.length === 0 && (
                    <div className="text-center text-[#666666] dark:text-[#8e8e8e] py-8 text-sm">
                        No conversations
                    </div>
                )}
            </div>

            {/* Footer / User menu - ChatGPT style */}
            <div className="p-2">
                <div className="relative">
                    {/* User Profile Button */}
                    <button
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-[#ececec] dark:hover:bg-[#2f2f2f] rounded-lg transition-colors"
                    >
                        {user?.avatarUrl ? (
                            <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-[#0c9344] flex items-center justify-center text-white text-sm font-medium">
                                {user?.name?.[0] || user?.email?.[0] || 'U'}
                            </div>
                        )}
                        <span className="flex-1 text-left text-sm font-medium text-[#0d0d0d] dark:text-[#ececec] truncate">
                            {user?.name || 'User'}
                        </span>
                        <MoreHorizontal className="w-5 h-5 text-[#666666] dark:text-[#b4b4b4]" />
                    </button>

                    <AnimatePresence>
                        {showUserMenu && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                transition={{ duration: 0.1 }}
                                className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-[#2f2f2f] rounded-xl shadow-lg border border-[#e5e5e5] dark:border-[#424242] overflow-hidden"
                            >
                                {/* User Profile Card */}
                                <div className="p-3 m-2 mb-1 bg-[#f9f9f9] dark:bg-[#171717] rounded-lg flex items-center gap-3">
                                    {user?.avatarUrl ? (
                                        <img src={user.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover" />
                                    ) : (
                                        <div className="w-9 h-9 rounded-full bg-[#a0522d] flex items-center justify-center text-white text-sm font-medium shrink-0">
                                            {user?.name?.[0] || user?.email?.[0] || 'Z'}
                                        </div>
                                    )}
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-sm font-medium text-[#0d0d0d] dark:text-[#ececec] truncate">
                                            {user?.name || 'zubitech'}
                                        </span>
                                        <span className="text-xs text-[#666666] dark:text-[#b4b4b4] truncate">
                                            @{user?.name ? user.name.toLowerCase().replace(/\s+/g, '_') : 'zubitech'}
                                        </span>
                                    </div>
                                </div>

                                {/* Menu Items */}
                                <div className="py-1">
                                    <button className="w-full px-4 py-2.5 text-left text-sm hover:bg-[#f4f4f4] dark:hover:bg-[#424242] flex items-center gap-3 text-[#0d0d0d] dark:text-[#ececec] transition-colors">
                                        <Sparkles className="w-4 h-4" /> Upgrade plan
                                    </button>
                                    <button
                                        onClick={() => { onOpenSettings('Personalization'); setShowUserMenu(false); }}
                                        className="w-full px-4 py-2.5 text-left text-sm hover:bg-[#f4f4f4] dark:hover:bg-[#424242] flex items-center gap-3 text-[#0d0d0d] dark:text-[#ececec] transition-colors"
                                    >
                                        <User className="w-4 h-4" /> Personalization
                                    </button>
                                    <button
                                        onClick={() => { onOpenSettings('General'); setShowUserMenu(false); }}
                                        className="w-full px-4 py-2.5 text-left text-sm hover:bg-[#f4f4f4] dark:hover:bg-[#424242] flex items-center gap-3 text-[#0d0d0d] dark:text-[#ececec] transition-colors"
                                    >
                                        <Settings className="w-4 h-4" /> Settings
                                    </button>

                                    {/* Admin Panel - Only show for admins */}
                                    {user?.role === 'admin' && (
                                        <Link href="/admin" onClick={() => setShowUserMenu(false)}>
                                            <div className="w-full px-4 py-2.5 text-left text-sm hover:bg-[#f4f4f4] dark:hover:bg-[#424242] flex items-center gap-3 text-[#0c9344] transition-colors">
                                                <Shield className="w-4 h-4" /> Admin Panel
                                            </div>
                                        </Link>
                                    )}
                                </div>

                                <div className="mx-4 my-1 border-t border-[#e5e5e5] dark:border-[#424242]" />

                                <div className="py-1">
                                    <button className="w-full px-4 py-2.5 text-left text-sm hover:bg-[#f4f4f4] dark:hover:bg-[#424242] flex items-center justify-between text-[#0d0d0d] dark:text-[#ececec] transition-colors">
                                        <div className="flex items-center gap-3">
                                            <HelpCircle className="w-4 h-4" /> Help
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-[#666666] dark:text-[#b4b4b4]" />
                                    </button>
                                    <button
                                        onClick={() => { onLogout(); setShowUserMenu(false); }}
                                        className="w-full px-4 py-2.5 text-left text-sm hover:bg-[#f4f4f4] dark:hover:bg-[#424242] flex items-center gap-3 text-[#0d0d0d] dark:text-[#ececec] transition-colors"
                                    >
                                        <LogOut className="w-4 h-4" /> Log out
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div >
    );
}
