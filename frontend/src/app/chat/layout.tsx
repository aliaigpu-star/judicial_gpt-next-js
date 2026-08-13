'use client';

import React, { useEffect, useState, useCallback, createContext, useContext } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import ChatSidebar from '@/components/sidebar/ChatSidebar';
import ChatHeader from '@/components/chat/ChatHeader';
import ConfirmModal from '@/components/modals/ConfirmModal';
import ProfileSettingsModal from '@/components/modals/ProfileSettingsModal';
import SettingsModal from '@/components/modals/SettingsModal';
import ShareModal from '@/components/modals/ShareModal';

interface Conversation {
    id: string;
    title: string;
    model?: string;
    isPinned?: boolean;
    isArchived?: boolean;
    messages: any[];
    isTemporary?: boolean;
}

interface ChatLayoutContextType {
    conversations: Conversation[];
    setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
    currentConversationId: string | null;
    sidebarOpen: boolean;
    setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
    sidebarWidth: number;
    showArchived: boolean;
    setShowArchived: React.Dispatch<React.SetStateAction<boolean>>;
    isTemporaryMode: boolean;
    setIsTemporaryMode: React.Dispatch<React.SetStateAction<boolean>>;
    handleSelectConversation: (id: string) => void;
    handleNewChat: () => void;
    handleDeleteConversation: (id: string) => void;
    handleRenameConversation: (id: string, newTitle: string) => void;
    handlePinConversation: (id: string) => void;
    handleArchiveConversation: (id: string) => void;
    handleShareConversation: (id: string) => void;
    handleClearAll: () => void;
    loadConversations: () => Promise<void>;
    user: any;
    newChatTrigger: number;
}

const ChatLayoutContext = createContext<ChatLayoutContextType | null>(null);

export function useChatLayout() {
    const context = useContext(ChatLayoutContext);
    if (!context) {
        throw new Error('useChatLayout must be used within ChatLayout');
    }
    return context;
}

export default function ChatLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, loading, signOut } = useAuth();

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [sidebarWidth] = useState(230);
    const [isLoading, setIsLoading] = useState(true);
    const [showArchived, setShowArchived] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('showArchived') === 'true';
        }
        return false;
    });

    // Modal states
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showClearAllModal, setShowClearAllModal] = useState(false);
    const [deleteConversationId, setDeleteConversationId] = useState<string | null>(null);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [shareConversationId, setShareConversationId] = useState<string | null>(null);
    const [shareConversationTitle, setShareConversationTitle] = useState('');
    const [settingsInitialTab, setSettingsInitialTab] = useState('General');
    const [isTemporaryMode, setIsTemporaryMode] = useState(false);
    const [newChatTrigger, setNewChatTrigger] = useState(0);

    // Get current conversation ID from pathname
    const pathSegment = pathname?.startsWith('/chat/')
        ? pathname.split('/chat/')[1] || null
        : null;
    const isJudgmentSearchPage = pathSegment === 'judgment-search';
    const isSummarizePage = pathSegment === 'summarize';
    const isCivilJudgmentPage = pathSegment === 'civil-judgment';
    const isCriminalJudgmentPage = pathSegment === 'criminal-judgment';
    const isCivilLawPage = pathSegment === 'civil-law';
    const isCriminalLawPage = pathSegment === 'criminal-law';
    const isSpecialAgentPage =
        isJudgmentSearchPage ||
        isSummarizePage ||
        isCivilJudgmentPage ||
        isCriminalJudgmentPage ||
        isCivilLawPage ||
        isCriminalLawPage;
    const currentConversationId = isSpecialAgentPage ? null : pathSegment;

    // Get current conversation object for header
    const currentConversation = conversations.find(c => c.id === currentConversationId);

    // Redirect if not authenticated
    useEffect(() => {
        if (loading) return;
        if (!user) {
            const timer = setTimeout(() => {
                router.push('/login');
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [user, loading, router]);

    // Persist showArchived setting
    useEffect(() => {
        localStorage.setItem('showArchived', String(showArchived));
    }, [showArchived]);

    // Load conversations
    const loadConversations = useCallback(async () => {
        if (!user) return;
        try {
            const { conversations: convData } = await api.getConversations(showArchived);
            setConversations(convData.map((c: any) => ({ ...c, messages: [] })));
        } catch (error) {
            console.error('Failed to load conversations:', error);
        } finally {
            setIsLoading(false);
        }
    }, [user, showArchived]);

    useEffect(() => {
        if (user) {
            loadConversations();
        }
    }, [user, showArchived, loadConversations]);

    const handleNewChat = useCallback(() => {
        setNewChatTrigger(prev => prev + 1);
        router.push('/chat');
    }, [router]);

    const handleSelectConversation = useCallback((id: string) => {
        router.push(`/chat/${id}`);
    }, [router]);

    const handleDeleteConversation = useCallback((id: string) => {
        setDeleteConversationId(id);
        setShowDeleteModal(true);
    }, []);

    const confirmDeleteConversation = useCallback(async () => {
        if (!deleteConversationId) return;
        try {
            if (!deleteConversationId.startsWith('temp_')) {
                await api.deleteConversation(deleteConversationId);
            }
            setConversations(prev => prev.filter(c => c.id !== deleteConversationId));
            if (deleteConversationId === currentConversationId) {
                router.push('/chat');
            }
        } catch (error) {
            console.error('Failed to delete:', error);
        }
        setDeleteConversationId(null);
    }, [deleteConversationId, currentConversationId, router]);

    const handleRenameConversation = useCallback(async (id: string, newTitle: string) => {
        try {
            if (!id.startsWith('temp_')) {
                await api.renameConversation(id, newTitle);
            }
            setConversations(prev => prev.map(c =>
                c.id === id ? { ...c, title: newTitle } : c
            ));
        } catch (error) {
            console.error('Failed to rename:', error);
        }
    }, []);

    const handlePinConversation = useCallback(async (id: string) => {
        try {
            if (!id.startsWith('temp_')) {
                await api.togglePin(id);
            }
            setConversations(prev => prev.map(c =>
                c.id === id ? { ...c, isPinned: !c.isPinned } : c
            ));
        } catch (error) {
            console.error('Failed to pin:', error);
        }
    }, []);

    const handleArchiveConversation = useCallback(async (id: string) => {
        try {
            if (!id.startsWith('temp_')) {
                await api.toggleArchive(id);
            }
            setConversations(prev => prev.map(c =>
                c.id === id ? { ...c, isArchived: !c.isArchived, isPinned: false } : c
            ));
        } catch (error) {
            console.error('Failed to archive:', error);
        }
    }, []);

    const handleClearAll = useCallback(() => {
        setShowClearAllModal(true);
    }, []);

    const confirmClearAll = useCallback(async () => {
        try {
            await api.deleteAllConversations();
            setConversations([]);
            router.push('/chat');
        } catch (error) {
            console.error('Failed to clear:', error);
        }
    }, [router]);

    const handleShareConversation = useCallback((id: string) => {
        const conversation = conversations.find(c => c.id === id);
        if (conversation) {
            setShareConversationId(id);
            setShareConversationTitle(conversation.title);
            setShowShareModal(true);
        }
    }, [conversations]);

    const handleLogout = useCallback(() => {
        setShowLogoutModal(true);
    }, []);

    const confirmLogout = useCallback(async () => {
        await signOut();
        router.push('/login');
    }, [signOut, router]);

    const handleOpenSettings = useCallback((tab: string = 'General') => {
        setSettingsInitialTab(tab);
        setShowSettingsModal(true);
    }, []);

    // Show loading while auth is initializing
    if (loading || (isLoading && !user)) {
        return (
            <div className="flex items-center justify-center h-screen bg-white dark:bg-[#212121]">
                <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#0c9344]" />
                    <p className="mt-3 text-[#666666] dark:text-[#b4b4b4] text-sm">Loading...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex items-center justify-center h-screen bg-white dark:bg-[#212121]">
                <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#0c9344]" />
                    <p className="mt-3 text-[#666666] dark:text-[#b4b4b4] text-sm">Redirecting...</p>
                </div>
            </div>
        );
    }

    const contextValue: ChatLayoutContextType = {
        conversations,
        setConversations,
        currentConversationId,
        sidebarOpen,
        setSidebarOpen,
        sidebarWidth,
        showArchived,
        setShowArchived,
        isTemporaryMode,
        setIsTemporaryMode,
        handleSelectConversation,
        handleNewChat,
        handleDeleteConversation,
        handleRenameConversation,
        handlePinConversation,
        handleArchiveConversation,
        handleShareConversation,
        handleClearAll,
        loadConversations,
        user,
        newChatTrigger,
    };

    return (
        <ChatLayoutContext.Provider value={contextValue}>
            <div className="flex h-screen bg-white dark:bg-[#212121]">
                {/* Persistent Sidebar */}
                <div
                    className="transition-all duration-200 ease-out overflow-hidden h-full flex-shrink-0 bg-[#f9f9f9] dark:bg-[#171717] border-r border-transparent dark:border-[#2f2f2f]"
                    style={{ width: sidebarOpen ? 230 : 54 }}
                >
                    <ChatSidebar
                        conversations={conversations}
                        currentConversationId={currentConversationId}
                        onSelectConversation={handleSelectConversation}
                        onNewChat={handleNewChat}
                        onDeleteConversation={handleDeleteConversation}
                        onRenameConversation={handleRenameConversation}
                        onPinConversation={handlePinConversation}
                        onArchiveConversation={handleArchiveConversation}
                        onShareConversation={handleShareConversation}
                        onClearAll={handleClearAll}
                        showArchived={showArchived}
                        isOpen={sidebarOpen}
                        onToggle={() => setSidebarOpen(!sidebarOpen)}
                        user={user}
                        onLogout={handleLogout}
                        onOpenProfile={() => setShowProfileModal(true)}
                        onOpenSettings={handleOpenSettings}
                        onToggleArchived={() => setShowArchived(!showArchived)}
                        sidebarWidth={sidebarWidth}
                    />
                </div>

                {/* Main content area with persistent header */}
                <main className="flex-1 h-full flex flex-col min-w-0 overflow-hidden">
                    {/* Persistent Header - never re-renders */}
                    <ChatHeader
                        sidebarOpen={sidebarOpen}
                        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                        conversationId={currentConversationId}
                        conversationTitle={
                            isJudgmentSearchPage ? 'Judgment Search' :
                            isSummarizePage ? 'Summarize Document' :
                            isCivilJudgmentPage ? 'Civil Judgment Writing' :
                            isCriminalJudgmentPage ? 'Criminal Judgment Writing' :
                            isCivilLawPage ? 'Civil Law Agent' :
                            isCriminalLawPage ? 'Criminal Law Agent' :
                            currentConversation?.title || 'New Chat'
                        }
                        isPinned={currentConversation?.isPinned}
                        isArchived={currentConversation?.isArchived}
                        onRenameConversation={handleRenameConversation}
                        onPinConversation={handlePinConversation}
                        onArchiveConversation={handleArchiveConversation}
                        onDeleteConversation={handleDeleteConversation}
                        onShareConversation={handleShareConversation}
                        isTemporaryMode={isTemporaryMode}
                        onToggleTemporaryMode={() => setIsTemporaryMode(!isTemporaryMode)}
                        showTemporaryToggle={!currentConversationId}
                    />

                    {/* Content area - no transition to prevent blink */}
                    <div className="flex-1 overflow-hidden relative">
                        <div className="h-full w-full">
                            {children}
                        </div>
                    </div>
                </main>

                {/* Modals */}
                <ConfirmModal
                    isOpen={showLogoutModal}
                    onClose={() => setShowLogoutModal(false)}
                    onConfirm={confirmLogout}
                    title="Sign Out"
                    message="Are you sure you want to sign out of your account?"
                    confirmText="Sign Out"
                    type="warning"
                />

                <ConfirmModal
                    isOpen={showDeleteModal}
                    onClose={() => setShowDeleteModal(false)}
                    onConfirm={confirmDeleteConversation}
                    title="Delete Conversation"
                    message="Are you sure you want to delete this conversation? This action cannot be undone."
                    confirmText="Delete"
                    type="danger"
                />

                <ConfirmModal
                    isOpen={showClearAllModal}
                    onClose={() => setShowClearAllModal(false)}
                    onConfirm={confirmClearAll}
                    title="Delete All Conversations"
                    message="Are you sure you want to delete ALL conversations? This action cannot be undone."
                    confirmText="Delete All"
                    type="danger"
                />

                <ProfileSettingsModal
                    isOpen={showProfileModal}
                    onClose={() => setShowProfileModal(false)}
                />

                <SettingsModal
                    isOpen={showSettingsModal}
                    onClose={() => setShowSettingsModal(false)}
                    showArchived={showArchived}
                    onToggleArchived={() => setShowArchived(!showArchived)}
                    initialTab={settingsInitialTab}
                />

                {shareConversationId && (
                    <ShareModal
                        isOpen={showShareModal}
                        onClose={() => setShowShareModal(false)}
                        conversationId={shareConversationId}
                        conversationTitle={shareConversationTitle}
                    />
                )}
            </div>
        </ChatLayoutContext.Provider>
    );
}
