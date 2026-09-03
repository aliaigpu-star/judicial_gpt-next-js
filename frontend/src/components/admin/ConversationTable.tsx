'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
    Eye,
    Trash2,
    MessageSquare,
    User,
    Pin,
    Archive,
    Calendar
} from 'lucide-react';
import type { AdminConversation } from '@/lib/adminApi';
import { Skeleton } from '@/components/ui/Skeleton';

interface ConversationTableProps {
    conversations: AdminConversation[];
    onView: (conversation: AdminConversation) => void;
    onDelete: (conversationId: string) => void;
    loading?: boolean;
}

function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateString);
}

export default function ConversationTable({ conversations, onView, onDelete, loading }: ConversationTableProps) {
    if (loading) {
        return (
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden p-6">
                <div className="space-y-4">
                    {/* Header skeleton */}
                    <div className="flex gap-4 pb-4 border-b border-gray-800">
                        <Skeleton width="200px" height="20px" />
                        <Skeleton width="150px" height="20px" />
                        <Skeleton width="80px" height="20px" />
                        <Skeleton width="100px" height="20px" />
                        <Skeleton width="120px" height="20px" />
                        <Skeleton width="100px" height="20px" />
                        <Skeleton width="80px" height="20px" />
                    </div>
                    {/* Row skeletons */}
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex gap-4 items-center py-3">
                            <Skeleton width="40px" height="40px" rounded />
                            <div className="flex-1 space-y-2">
                                <Skeleton width="200px" height="16px" />
                                <Skeleton width="100px" height="14px" />
                            </div>
                            <Skeleton width="80px" height="24px" />
                            <Skeleton width="60px" height="20px" />
                            <Skeleton width="100px" height="20px" />
                            <Skeleton width="100px" height="20px" />
                            <div className="flex gap-2">
                                <Skeleton width="32px" height="32px" />
                                <Skeleton width="32px" height="32px" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (conversations.length === 0) {
        return (
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-12 text-center">
                <MessageSquare className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 font-medium">No conversations found</p>
                <p className="text-gray-500 text-sm mt-1">Conversations will appear here as users chat</p>
            </div>
        );
    }

    return (
        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                    <thead>
                        <tr className="border-b border-gray-800 bg-gray-800/30">
                            <th className="text-left py-4 px-6 text-gray-400 font-semibold text-sm">Conversation</th>
                            <th className="text-left py-4 px-6 text-gray-400 font-semibold text-sm">User</th>
                            <th className="text-center py-4 px-6 text-gray-400 font-semibold text-sm">Messages</th>
                            <th className="text-center py-4 px-6 text-gray-400 font-semibold text-sm">Status</th>
                            <th className="text-left py-4 px-6 text-gray-400 font-semibold text-sm">Last Updated</th>
                            <th className="text-left py-4 px-6 text-gray-400 font-semibold text-sm">Created</th>
                            <th className="text-center py-4 px-6 text-gray-400 font-semibold text-sm">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {conversations.map((conversation, index) => (
                            <motion.tr
                                key={conversation.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.03 }}
                                className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                            >
                                <td className="py-4 px-6">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-[#00a859]/10 rounded-lg">
                                            <MessageSquare className="h-4 w-4 text-[#00a859]" />
                                        </div>
                                        <div className="max-w-xs">
                                            <p className="text-white font-medium truncate">
                                                {conversation.title || 'Untitled Conversation'}
                                            </p>
                                            <p className="text-gray-500 text-xs font-mono truncate">
                                                {conversation.id.slice(0, 8)}...
                                            </p>
                                        </div>
                                    </div>
                                </td>
                                <td className="py-4 px-6">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                                            {(conversation.userName || conversation.userEmail || 'U')[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-gray-300 text-sm font-medium">
                                                {conversation.userName || 'Unknown'}
                                            </p>
                                            <p className="text-gray-500 text-xs truncate max-w-[150px]">
                                                {conversation.userEmail || 'No email'}
                                            </p>
                                        </div>
                                    </div>
                                </td>
                                <td className="py-4 px-6 text-center">
                                    <span className="inline-flex items-center justify-center gap-1 px-3 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-lg text-sm font-medium">
                                        {conversation.messageCount}
                                    </span>
                                </td>
                                <td className="py-4 px-6">
                                    <div className="flex items-center justify-center gap-2">
                                        {conversation.isPinned && (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-500/10 text-yellow-400 rounded text-xs">
                                                <Pin className="h-3 w-3" />
                                                Pinned
                                            </span>
                                        )}
                                        {conversation.isArchived && (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-500/10 text-gray-400 rounded text-xs">
                                                <Archive className="h-3 w-3" />
                                                Archived
                                            </span>
                                        )}
                                        {!conversation.isPinned && !conversation.isArchived && (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#00a859]/10 text-[#00a859] rounded text-xs">
                                                Active
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="py-4 px-6 text-gray-400 text-sm">
                                    {formatRelativeTime(conversation.updatedAt)}
                                </td>
                                <td className="py-4 px-6 text-gray-400 text-sm">
                                    <div className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        {new Date(conversation.createdAt).toLocaleDateString()}
                                    </div>
                                </td>
                                <td className="py-4 px-6">
                                    <div className="flex items-center justify-center gap-2">
                                        <button
                                            onClick={() => onView(conversation)}
                                            className="p-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-lg transition-all"
                                            title="View conversation"
                                        >
                                            <Eye className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => onDelete(conversation.id)}
                                            className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg transition-all"
                                            title="Delete conversation"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </td>
                            </motion.tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
