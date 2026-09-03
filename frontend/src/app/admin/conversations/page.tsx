'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    RefreshCw,
    MessageSquare,
    Filter,
    X,
    FileText,
    FileJson
} from 'lucide-react';
import ConversationTable from '@/components/admin/ConversationTable';
import ConversationModal from '@/components/admin/ConversationModal';
import { adminApi, type AdminConversation } from '@/lib/adminApi';
import { exportToCSV, exportToJSON } from '@/utils/export';

export default function ConversationsPage() {
    const [conversations, setConversations] = useState<AdminConversation[]>([]);
    const [filteredConversations, setFilteredConversations] = useState<AdminConversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    const loadConversations = useCallback(async () => {
        try {
            const { conversations } = await adminApi.getConversations(200);
            setConversations(conversations);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Failed to load conversations');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadConversations();
    }, [loadConversations]);

    // Filter conversations
    useEffect(() => {
        let filtered = conversations;

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(
                conv =>
                    conv.title?.toLowerCase().includes(query) ||
                    conv.userName?.toLowerCase().includes(query) ||
                    conv.userEmail?.toLowerCase().includes(query)
            );
        }

        // Status filter
        if (statusFilter !== 'all') {
            if (statusFilter === 'pinned') {
                filtered = filtered.filter(conv => conv.isPinned);
            } else if (statusFilter === 'archived') {
                filtered = filtered.filter(conv => conv.isArchived);
            } else if (statusFilter === 'active') {
                filtered = filtered.filter(conv => !conv.isPinned && !conv.isArchived);
            }
        }

        setFilteredConversations(filtered);
    }, [conversations, searchQuery, statusFilter]);

    const handleRefresh = () => {
        setRefreshing(true);
        loadConversations();
    };

    const handleView = (conversation: AdminConversation) => {
        setSelectedConversationId(conversation.id);
    };

    const handleDelete = async (conversationId: string) => {
        if (deleteConfirm !== conversationId) {
            setDeleteConfirm(conversationId);
            return;
        }

        try {
            await adminApi.deleteConversation(conversationId);
            setConversations(conversations.filter(c => c.id !== conversationId));
            setDeleteConfirm(null);
        } catch (err: any) {
            setError(err.message || 'Failed to delete conversation');
        }
    };

    const clearFilters = () => {
        setSearchQuery('');
        setStatusFilter('all');
    };

    const hasFilters = searchQuery || statusFilter !== 'all';

    // Export functions
    const handleExportCSV = () => {
        const exportData = filteredConversations.map(conv => ({
            Title: conv.title || 'Untitled',
            'User Name': conv.userName || 'N/A',
            'User Email': conv.userEmail || 'N/A',
            'Message Count': conv.messageCount,
            'Is Pinned': conv.isPinned ? 'Yes' : 'No',
            'Is Archived': conv.isArchived ? 'Yes' : 'No',
            'Created At': conv.createdAt,
            'Updated At': conv.updatedAt
        }));
        exportToCSV(exportData, `conversations_${new Date().toISOString().split('T')[0]}`);
    };

    const handleExportJSON = () => {
        exportToJSON(filteredConversations, `conversations_${new Date().toISOString().split('T')[0]}`);
    };

    return (
        <div className="p-4 md:p-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 md:mb-8">
                <div>
                    <motion.h1
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-2xl font-bold text-white"
                    >
                        Conversations
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-gray-400 mt-1"
                    >
                        Browse and manage all chat conversations
                    </motion.p>
                </div>
                <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 flex-wrap"
                >
                    {/* Export buttons */}
                    <div className="flex items-center gap-2 border-r border-gray-700 pr-2">
                        <button
                            onClick={handleExportCSV}
                            className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-lg transition-all text-sm"
                            title="Export as CSV"
                        >
                            <FileText className="h-4 w-4" />
                            <span className="hidden sm:inline">CSV</span>
                        </button>
                        <button
                            onClick={handleExportJSON}
                            className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-lg transition-all text-sm"
                            title="Export as JSON"
                        >
                            <FileJson className="h-4 w-4" />
                            <span className="hidden sm:inline">JSON</span>
                        </button>
                    </div>
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-xl transition-all disabled:opacity-50"
                    >
                        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">Refresh</span>
                    </button>
                </motion.div>
            </div>

            {/* Error Display */}
            {error && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl mb-6 flex items-center justify-between"
                >
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
                        <X className="h-4 w-4" />
                    </button>
                </motion.div>
            )}

            {/* Filters */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-900/50 border border-gray-800 rounded-2xl p-4 mb-6"
            >
                <div className="flex flex-wrap items-center gap-4">
                    {/* Search */}
                    <div className="flex-1 min-w-[280px]">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by title, user name, or email..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-11 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-[#00a859]/50 focus:border-[#00a859]/50 transition-all"
                            />
                        </div>
                    </div>

                    {/* Status Filter */}
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-gray-400" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-[#00a859]/50 focus:border-[#00a859]/50 cursor-pointer"
                        >
                            <option value="all">All Conversations</option>
                            <option value="active">Active</option>
                            <option value="pinned">Pinned</option>
                            <option value="archived">Archived</option>
                        </select>
                    </div>

                    {/* Clear Filters */}
                    {hasFilters && (
                        <button
                            onClick={clearFilters}
                            className="px-4 py-2.5 text-gray-400 hover:text-gray-300 transition-all"
                        >
                            Clear filters
                        </button>
                    )}
                </div>

                {/* Results count */}
                <div className="mt-4 flex items-center gap-2 text-sm">
                    <MessageSquare className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-400">
                        Showing <span className="text-white font-medium">{filteredConversations.length}</span> of{' '}
                        <span className="text-white font-medium">{conversations.length}</span> conversations
                    </span>
                </div>
            </motion.div>

            {/* Delete Confirmation */}
            <AnimatePresence>
                {deleteConfirm && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl mb-6 flex items-center justify-between"
                    >
                        <span>Are you sure you want to delete this conversation? This action cannot be undone.</span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handleDelete(deleteConfirm)}
                                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-all"
                            >
                                Delete
                            </button>
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Conversations Table */}
            <ConversationTable
                conversations={filteredConversations}
                onView={handleView}
                onDelete={handleDelete}
                loading={loading}
            />

            {/* Conversation Modal */}
            <AnimatePresence>
                {selectedConversationId && (
                    <ConversationModal
                        conversationId={selectedConversationId}
                        onClose={() => setSelectedConversationId(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
