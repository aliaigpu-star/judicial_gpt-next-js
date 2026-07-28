'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    X,
    User,
    Mail,
    Shield,
    Crown,
    MessageSquare,
    Calendar,
    Clock,
    Save,
    Loader2,
    Eye,
    EyeOff
} from 'lucide-react';
import { adminApi, type AdminUser } from '@/lib/adminApi';

interface UserModalProps {
    user: AdminUser | null;
    mode: 'view' | 'edit' | 'create';
    onClose: () => void;
    onUserUpdated: (user: AdminUser) => void;
    onUserCreated: (user: AdminUser) => void;
}

export default function UserModal({ user, mode, onClose, onUserUpdated, onUserCreated }: UserModalProps) {
    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        password: '',
        role: user?.role || 'user',
        status: user?.status || 'active'
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || '',
                email: user.email,
                password: '',
                role: user.role,
                status: user.status
            });
        }
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (mode === 'create') {
                if (!formData.email || !formData.password) {
                    throw new Error('Email and password are required');
                }
                const result = await adminApi.createUser({
                    email: formData.email,
                    password: formData.password,
                    name: formData.name,
                    role: formData.role,
                    status: formData.status
                });
                // Fetch the created user details
                const { users } = await adminApi.getUsers();
                const newUser = users.find(u => u.id === result.user.id);
                if (newUser) {
                    onUserCreated(newUser);
                }
            } else if (mode === 'edit' && user) {
                const result = await adminApi.updateUser(user.id, {
                    name: formData.name,
                    role: formData.role,
                    status: formData.status
                });
                onUserUpdated({
                    ...user,
                    name: formData.name,
                    role: formData.role as AdminUser['role'],
                    status: formData.status as AdminUser['status']
                });
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const isCreateMode = mode === 'create';
    const isViewMode = mode === 'view';
    const title = isCreateMode ? 'Create New User' : isViewMode ? 'User Details' : 'Edit User';

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-700/10 rounded-lg">
                            <User className="h-5 w-5 text-emerald-700" />
                        </div>
                        <h2 className="text-lg font-bold text-white">{title}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <X className="h-5 w-5 text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">
                            {error}
                        </div>
                    )}

                    {/* User Avatar (view/edit mode) */}
                    {!isCreateMode && user && (
                        <div className="flex items-center gap-4">
                            {user.avatarUrl ? (
                                <img
                                    src={user.avatarUrl}
                                    alt=""
                                    className="w-16 h-16 rounded-full object-cover"
                                />
                            ) : (
                                <div className="w-16 h-16 bg-gradient-to-br from-emerald-700 to-emerald-800 rounded-full flex items-center justify-center text-white text-xl font-bold">
                                    {(user.name || user.email || 'U')[0].toUpperCase()}
                                </div>
                            )}
                            <div>
                                <p className="text-white font-semibold">{user.name || 'No Name'}</p>
                                <p className="text-gray-400 text-sm">{user.email}</p>
                            </div>
                        </div>
                    )}

                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            Name
                        </label>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                disabled={isViewMode}
                                placeholder="Enter name"
                                className="w-full pl-11 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-emerald-700/50 focus:border-emerald-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            />
                        </div>
                    </div>

                    {/* Email (only for create mode) */}
                    {isCreateMode && (
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                Email <span className="text-red-400">*</span>
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="Enter email"
                                    required
                                    className="w-full pl-11 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-emerald-700/50 focus:border-emerald-700/50 transition-all"
                                />
                            </div>
                        </div>
                    )}

                    {/* Password (only for create mode) */}
                    {isCreateMode && (
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                Password <span className="text-red-400">*</span>
                            </label>
                            <div className="relative">
                                <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    placeholder="Enter password"
                                    required
                                    className="w-full pl-11 pr-12 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Role */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            Role
                        </label>
                        <div className="relative">
                            <Crown className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <select
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                                disabled={isViewMode}
                                className="w-full pl-11 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all appearance-none"
                            >
                                <option value="user">User</option>
                                <option value="moderator">Moderator</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                    </div>

                    {/* Status */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            Status
                        </label>
                        <select
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                            disabled={isViewMode}
                            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all appearance-none"
                        >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="suspended">Suspended</option>
                            <option value="banned">Banned</option>
                        </select>
                    </div>

                    {/* Stats (view mode) */}
                    {!isCreateMode && user && (
                        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-800/50 rounded-xl">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                    <MessageSquare className="h-4 w-4 text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Conversations</p>
                                    <p className="text-white font-semibold">{user.conversationCount}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-500/10 rounded-lg">
                                    <Mail className="h-4 w-4 text-purple-400" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Messages</p>
                                    <p className="text-white font-semibold">{user.messageCount}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-700/10 rounded-lg">
                                    <Calendar className="h-4 w-4 text-emerald-700" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Joined</p>
                                    <p className="text-white font-semibold text-sm">
                                        {new Date(user.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-orange-500/10 rounded-lg">
                                    <Clock className="h-4 w-4 text-orange-400" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Last Active</p>
                                    <p className="text-white font-semibold text-sm">
                                        {user.lastActivity
                                            ? new Date(user.lastActivity).toLocaleDateString()
                                            : 'Never'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    {!isViewMode && (
                        <div className="flex items-center gap-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-xl transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl transition-all disabled:opacity-50"
                            >
                                {loading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Save className="h-4 w-4" />
                                )}
                                {isCreateMode ? 'Create User' : 'Save Changes'}
                            </button>
                        </div>
                    )}
                </form>
            </motion.div>
        </motion.div>
    );
}
