'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    RefreshCw,
    UserPlus,
    Users,
    Filter,
    X,
    Download,
    Trash2,
    CheckCircle,
    FileText,
    FileJson
} from 'lucide-react';
import UserTable from '@/components/admin/UserTable';
import UserModal from '@/components/admin/UserModal';
import { adminApi, type AdminUser } from '@/lib/adminApi';
import { exportToCSV, exportToJSON } from '@/utils/export';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

export default function UsersPage() {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState<'view' | 'edit' | 'create'>('view');
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [bulkAction, setBulkAction] = useState<'delete' | 'status' | null>(null);
    const [bulkStatus, setBulkStatus] = useState<string>('active');

    const loadUsers = useCallback(async () => {
        try {
            const { users } = await adminApi.getUsers();
            setUsers(users);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Failed to load users');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    // Filter users based on search and filters
    useEffect(() => {
        let filtered = users;

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(
                user =>
                    user.name?.toLowerCase().includes(query) ||
                    user.email.toLowerCase().includes(query)
            );
        }

        // Role filter
        if (roleFilter !== 'all') {
            filtered = filtered.filter(user => user.role === roleFilter);
        }

        // Status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(user => user.status === statusFilter);
        }

        setFilteredUsers(filtered);
    }, [users, searchQuery, roleFilter, statusFilter]);

    const handleRefresh = () => {
        setRefreshing(true);
        loadUsers();
    };

    const handleEdit = (user: AdminUser) => {
        setSelectedUser(user);
        setModalMode('edit');
        setShowModal(true);
    };

    const handleCreate = () => {
        setSelectedUser(null);
        setModalMode('create');
        setShowModal(true);
    };

    const handleDelete = async (userId: string) => {
        if (deleteConfirm !== userId) {
            setDeleteConfirm(userId);
            return;
        }

        try {
            await adminApi.deleteUser(userId);
            setUsers(users.filter(u => u.id !== userId));
            setDeleteConfirm(null);
        } catch (err: any) {
            setError(err.message || 'Failed to delete user');
        }
    };

    const handleUserUpdated = (updatedUser: AdminUser) => {
        setUsers(users.map(u => (u.id === updatedUser.id ? updatedUser : u)));
        setShowModal(false);
    };

    const handleUserCreated = (newUser: AdminUser) => {
        setUsers([newUser, ...users]);
        setShowModal(false);
    };

    const clearFilters = () => {
        setSearchQuery('');
        setRoleFilter('all');
        setStatusFilter('all');
    };

    const hasFilters = searchQuery || roleFilter !== 'all' || statusFilter !== 'all';

    // Keyboard shortcuts
    useKeyboardShortcuts([
        {
            key: 'n',
            ctrl: true,
            action: handleCreate,
            description: 'Create new user'
        },
        {
            key: 'e',
            ctrl: true,
            action: () => {
                if (selectedUsers.length === 1) {
                    const user = users.find(u => u.id === selectedUsers[0]);
                    if (user) handleEdit(user);
                }
            },
            description: 'Edit selected user'
        },
        {
            key: 'f',
            ctrl: true,
            action: () => {
                const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
                searchInput?.focus();
            },
            description: 'Focus search'
        }
    ]);

    // Handle user selection
    const handleSelectUser = (userId: string) => {
        setSelectedUsers(prev => 
            prev.includes(userId) 
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const handleSelectAll = (selected: boolean) => {
        setSelectedUsers(selected ? filteredUsers.map(u => u.id) : []);
    };

    // Export functions
    const handleExportCSV = () => {
        const exportData = filteredUsers.map(user => ({
            Name: user.name || 'N/A',
            Email: user.email,
            Role: user.role,
            Status: user.status,
            'Email Verified': user.emailVerified ? 'Yes' : 'No',
            Conversations: user.conversationCount,
            Messages: user.messageCount,
            'Last Active': user.lastActivity || 'Never',
            'Created At': user.createdAt
        }));
        exportToCSV(exportData, `users_${new Date().toISOString().split('T')[0]}`);
    };

    const handleExportJSON = () => {
        exportToJSON(filteredUsers, `users_${new Date().toISOString().split('T')[0]}`);
    };

    // Bulk operations
    const handleBulkDelete = async () => {
        if (!confirm(`Are you sure you want to delete ${selectedUsers.length} user(s)? This cannot be undone.`)) {
            return;
        }

        try {
            await Promise.all(selectedUsers.map(id => adminApi.deleteUser(id)));
            setUsers(users.filter(u => !selectedUsers.includes(u.id)));
            setSelectedUsers([]);
            setBulkAction(null);
        } catch (err: any) {
            setError(err.message || 'Failed to delete users');
        }
    };

    const handleBulkStatusUpdate = async () => {
        try {
            await Promise.all(
                selectedUsers.map(id => 
                    adminApi.updateUser(id, { status: bulkStatus })
                )
            );
            setUsers(users.map(u => 
                selectedUsers.includes(u.id) 
                    ? { ...u, status: bulkStatus as any }
                    : u
            ));
            setSelectedUsers([]);
            setBulkAction(null);
        } catch (err: any) {
            setError(err.message || 'Failed to update user status');
        }
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
                        User Management
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-gray-400 mt-1"
                    >
                        Manage all registered users
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
                    <button
                        onClick={handleCreate}
                        className="flex items-center gap-2 px-4 py-2.5 bg-[#0c9344] hover:bg-[#0c9344] text-white rounded-xl transition-all"
                    >
                        <UserPlus className="h-4 w-4" />
                        <span className="hidden sm:inline">Create User</span>
                        <span className="sm:hidden">Create</span>
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
                <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 sm:gap-4">
                    {/* Search */}
                    <div className="flex-1 w-full sm:min-w-[280px]">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search users by name or email..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-11 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-[#0c9344]/50 focus:border-[#0c9344]/50 transition-all"
                            />
                        </div>
                    </div>

                    {/* Role Filter */}
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-gray-400" />
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-[#0c9344]/50 focus:border-[#0c9344]/50 cursor-pointer"
                        >
                            <option value="all">All Roles</option>
                            <option value="admin">Admin</option>
                            <option value="moderator">Moderator</option>
                            <option value="user">User</option>
                        </select>
                    </div>

                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-[#0c9344]/50 focus:border-[#0c9344]/50 cursor-pointer"
                    >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="suspended">Suspended</option>
                        <option value="banned">Banned</option>
                    </select>

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
                    <Users className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-400">
                        Showing <span className="text-white font-medium">{filteredUsers.length}</span> of{' '}
                        <span className="text-white font-medium">{users.length}</span> users
                    </span>
                </div>
            </motion.div>

            {/* Bulk Actions Bar */}
            {selectedUsers.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-[#0c9344]/10 border border-[#0c9344]/30 rounded-xl p-4 mb-6"
                >
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-[#0c9344]" />
                            <span className="text-[#0c9344] font-medium">
                                {selectedUsers.length} user{selectedUsers.length > 1 ? 's' : ''} selected
                            </span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <button
                                onClick={() => setBulkAction('status')}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all text-sm"
                            >
                                <CheckCircle className="h-4 w-4" />
                                Update Status
                            </button>
                            <button
                                onClick={() => setBulkAction('delete')}
                                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-all text-sm"
                            >
                                <Trash2 className="h-4 w-4" />
                                Delete
                            </button>
                            <button
                                onClick={() => setSelectedUsers([])}
                                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all text-sm"
                            >
                                Clear
                            </button>
                        </div>
                    </div>

                    {/* Bulk Status Update */}
                    {bulkAction === 'status' && (
                        <div className="mt-4 pt-4 border-t border-[#0c9344]/20 flex items-center gap-4 flex-wrap">
                            <span className="text-[#0c9344] text-sm">Update status to:</span>
                            <select
                                value={bulkStatus}
                                onChange={(e) => setBulkStatus(e.target.value)}
                                className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white outline-none focus:ring-2 focus:ring-[#0c9344]/50"
                            >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                                <option value="suspended">Suspended</option>
                                <option value="banned">Banned</option>
                            </select>
                            <button
                                onClick={handleBulkStatusUpdate}
                                className="px-4 py-2 bg-[#0c9344] hover:bg-[#0c9344] text-white rounded-lg transition-all text-sm"
                            >
                                Apply
                            </button>
                            <button
                                onClick={() => setBulkAction(null)}
                                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all text-sm"
                            >
                                Cancel
                            </button>
                        </div>
                    )}

                    {/* Bulk Delete Confirmation */}
                    {bulkAction === 'delete' && (
                        <div className="mt-4 pt-4 border-t border-red-500/20 flex items-center gap-4 flex-wrap">
                            <span className="text-red-400 text-sm">
                                Are you sure you want to delete {selectedUsers.length} user(s)? This cannot be undone.
                            </span>
                            <button
                                onClick={handleBulkDelete}
                                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-all text-sm"
                            >
                                Confirm Delete
                            </button>
                            <button
                                onClick={() => setBulkAction(null)}
                                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all text-sm"
                            >
                                Cancel
                            </button>
                        </div>
                    )}
                </motion.div>
            )}

            {/* Delete Confirmation */}
            <AnimatePresence>
                {deleteConfirm && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl mb-6 flex items-center justify-between flex-wrap gap-4"
                    >
                        <span>Are you sure you want to delete this user? This action cannot be undone.</span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handleDelete(deleteConfirm)}
                                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-all text-sm"
                            >
                                Delete
                            </button>
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all text-sm"
                            >
                                Cancel
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Users Table */}
            <UserTable
                users={filteredUsers}
                onEdit={handleEdit}
                onDelete={handleDelete}
                loading={loading}
                selectedUsers={selectedUsers}
                onSelectUser={handleSelectUser}
                onSelectAll={handleSelectAll}
            />

            {/* User Modal */}
            <AnimatePresence>
                {showModal && (
                    <UserModal
                        user={selectedUser}
                        mode={modalMode}
                        onClose={() => setShowModal(false)}
                        onUserUpdated={handleUserUpdated}
                        onUserCreated={handleUserCreated}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
