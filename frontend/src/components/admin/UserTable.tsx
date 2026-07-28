'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
    Edit,
    Trash2,
    MoreHorizontal,
    MessageSquare,
    Mail,
    Shield,
    User,
    Ban,
    CheckCircle,
    XCircle,
    Crown,
    CheckSquare,
    Square
} from 'lucide-react';
import type { AdminUser } from '@/lib/adminApi';
import { Skeleton } from '@/components/ui/Skeleton';

interface UserTableProps {
    users: AdminUser[];
    onEdit: (user: AdminUser) => void;
    onDelete: (userId: string) => void;
    loading?: boolean;
    selectedUsers?: string[];
    onSelectUser?: (userId: string) => void;
    onSelectAll?: (selected: boolean) => void;
}

const roleIcons: Record<string, React.ElementType> = {
    admin: Crown,
    moderator: Shield,
    user: User
};

const roleColors: Record<string, string> = {
    admin: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    moderator: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    user: 'bg-gray-500/10 text-gray-400 border-gray-500/30'
};

const statusColors: Record<string, string> = {
    active: 'bg-emerald-700/10 text-emerald-700',
    inactive: 'bg-gray-500/10 text-gray-400',
    suspended: 'bg-orange-500/10 text-orange-400',
    banned: 'bg-red-500/10 text-red-400'
};

const statusIcons: Record<string, React.ElementType> = {
    active: CheckCircle,
    inactive: XCircle,
    suspended: Ban,
    banned: Ban
};

function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatActivity(dateString?: string): string {
    if (!dateString) return 'Never';
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

export default function UserTable({ 
    users, 
    onEdit, 
    onDelete, 
    loading,
    selectedUsers = [],
    onSelectUser,
    onSelectAll
}: UserTableProps) {
    const allSelected = users.length > 0 && selectedUsers.length === users.length;
    const someSelected = selectedUsers.length > 0 && selectedUsers.length < users.length;
    if (loading) {
        return (
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden">
                <div className="animate-pulse">
                    <div className="h-12 bg-gray-800/50" />
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-16 bg-gray-800/30 border-t border-gray-800" />
                    ))}
                </div>
            </div>
        );
    }

    if (users.length === 0) {
        return (
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-12 text-center">
                <User className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 font-medium">No users found</p>
                <p className="text-gray-500 text-sm mt-1">Users will appear here once they register</p>
            </div>
        );
    }

    return (
        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                    <thead>
                        <tr className="border-b border-gray-800 bg-gray-800/30">
                            {onSelectUser && (
                                <th className="text-center py-4 px-6 w-12">
                                    <button
                                        onClick={() => onSelectAll?.(!allSelected)}
                                        className="p-1 hover:bg-gray-700/50 rounded transition-colors"
                                        title={allSelected ? 'Deselect all' : 'Select all'}
                                    >
                                        {allSelected ? (
                                            <CheckSquare className="w-4 h-4 text-emerald-700" />
                                        ) : someSelected ? (
                                            <div className="w-4 h-4 border-2 border-emerald-700 rounded bg-emerald-700/20" />
                                        ) : (
                                            <Square className="w-4 h-4 text-gray-500" />
                                        )}
                                    </button>
                                </th>
                            )}
                            <th className="text-left py-4 px-6 text-gray-400 font-semibold text-sm">User</th>
                            <th className="text-left py-4 px-6 text-gray-400 font-semibold text-sm">Role</th>
                            <th className="text-left py-4 px-6 text-gray-400 font-semibold text-sm">Status</th>
                            <th className="text-center py-4 px-6 text-gray-400 font-semibold text-sm">Conversations</th>
                            <th className="text-center py-4 px-6 text-gray-400 font-semibold text-sm">Messages</th>
                            <th className="text-left py-4 px-6 text-gray-400 font-semibold text-sm">Last Active</th>
                            <th className="text-left py-4 px-6 text-gray-400 font-semibold text-sm">Joined</th>
                            <th className="text-center py-4 px-6 text-gray-400 font-semibold text-sm">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user, index) => {
                            const RoleIcon = roleIcons[user.role] || User;
                            const StatusIcon = statusIcons[user.status] || CheckCircle;

                            return (
                                <motion.tr
                                    key={user.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.03 }}
                                    className={`border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors ${
                                        selectedUsers.includes(user.id) ? 'bg-emerald-700/5' : ''
                                    }`}
                                >
                                    {onSelectUser && (
                                        <td className="py-4 px-6 text-center">
                                            <button
                                                onClick={() => onSelectUser(user.id)}
                                                className="p-1 hover:bg-gray-700/50 rounded transition-colors"
                                            >
                                                {selectedUsers.includes(user.id) ? (
                                                    <CheckSquare className="w-4 h-4 text-emerald-700" />
                                                ) : (
                                                    <Square className="w-4 h-4 text-gray-500" />
                                                )}
                                            </button>
                                        </td>
                                    )}
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-3">
                                            {user.avatarUrl ? (
                                                <img
                                                    src={user.avatarUrl}
                                                    alt=""
                                                    className="w-10 h-10 rounded-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 bg-gradient-to-br from-emerald-700 to-emerald-800 rounded-full flex items-center justify-center text-white font-semibold">
                                                    {(user.name || user.email || 'U')[0].toUpperCase()}
                                                </div>
                                            )}
                                            <div>
                                                <p className="text-white font-medium">{user.name || 'No Name'}</p>
                                                <div className="flex items-center gap-1 text-gray-400 text-sm">
                                                    <Mail className="h-3 w-3" />
                                                    {user.email}
                                                    {user.emailVerified && (
                                                        <CheckCircle className="h-3 w-3 text-emerald-700 ml-1" />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${roleColors[user.role]}`}>
                                            <RoleIcon className="h-3 w-3" />
                                            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${statusColors[user.status]}`}>
                                            <StatusIcon className="h-3 w-3" />
                                            {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 text-center">
                                        <span className="inline-flex items-center justify-center gap-1 px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg text-sm font-medium">
                                            <MessageSquare className="h-3 w-3" />
                                            {user.conversationCount}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 text-center">
                                        <span className="inline-flex items-center justify-center px-3 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-lg text-sm font-medium">
                                            {user.messageCount}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 text-gray-400 text-sm">
                                        {formatActivity(user.lastActivity)}
                                    </td>
                                    <td className="py-4 px-6 text-gray-400 text-sm">
                                        {formatDate(user.createdAt)}
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => onEdit(user)}
                                                className="p-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-lg transition-all"
                                                title="Edit user"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => onDelete(user.id)}
                                                className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg transition-all"
                                                title="Delete user"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </motion.tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
