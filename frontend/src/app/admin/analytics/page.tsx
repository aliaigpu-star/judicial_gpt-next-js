'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    BarChart3,
    TrendingUp,
    Users,
    MessageSquare,
    Activity,
    Calendar,
    RefreshCw,
    ArrowUpRight,
    ArrowDownRight,
    Download,
    FileText,
    FileJson,
    Clock
} from 'lucide-react';
import { adminApi, type DashboardStats, type AdminUser } from '@/lib/adminApi';
import { exportToCSV, exportToJSON } from '@/utils/export';
import { SkeletonCard } from '@/components/ui/Skeleton';

interface AnalyticsCardProps {
    title: string;
    value: string | number;
    change?: number;
    icon: React.ElementType;
    color: string;
    delay?: number;
}

function AnalyticsCard({ title, value, change, icon: Icon, color, delay = 0 }: AnalyticsCardProps) {
    const isPositive = change && change > 0;
    const colorClasses: Record<string, { bg: string; icon: string; border: string }> = {
        emerald: { bg: 'bg-emerald-700/10', icon: 'text-emerald-700', border: 'border-emerald-700/20' },
        blue: { bg: 'bg-blue-500/10', icon: 'text-blue-400', border: 'border-blue-500/20' },
        purple: { bg: 'bg-purple-500/10', icon: 'text-purple-400', border: 'border-purple-500/20' },
        orange: { bg: 'bg-orange-500/10', icon: 'text-orange-400', border: 'border-orange-500/20' }
    };

    const colors = colorClasses[color] || colorClasses.emerald;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
            className={`${colors.bg} border ${colors.border} rounded-2xl p-6`}
        >
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-gray-400 text-sm mb-1">{title}</p>
                    <h3 className="text-3xl font-bold text-white">
                        {typeof value === 'number' ? value.toLocaleString() : value}
                    </h3>
                    {change !== undefined && (
                        <div className={`flex items-center gap-1 mt-2 text-sm ${
                            isPositive ? 'text-emerald-700' : 'text-red-400'
                        }`}>
                            {isPositive ? (
                                <ArrowUpRight className="h-4 w-4" />
                            ) : (
                                <ArrowDownRight className="h-4 w-4" />
                            )}
                            <span>{Math.abs(change)}% from last week</span>
                        </div>
                    )}
                </div>
                <div className={`p-3 rounded-xl ${colors.bg}`}>
                    <Icon className={`h-6 w-6 ${colors.icon}`} />
                </div>
            </div>
        </motion.div>
    );
}

interface TopUser {
    id: string;
    name: string;
    email: string;
    messageCount: number;
    conversationCount: number;
}

export default function AnalyticsPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [topUsers, setTopUsers] = useState<TopUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadData = useCallback(async () => {
        try {
            const [statsRes, usersRes] = await Promise.all([
                adminApi.getDashboardStats(),
                adminApi.getUsers()
            ]);
            setStats(statsRes.stats);
            
            // Get top users by message count
            const sorted = usersRes.users
                .sort((a, b) => b.messageCount - a.messageCount)
                .slice(0, 10);
            setTopUsers(sorted);
        } catch (err) {
            console.error('Failed to load analytics:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    // Export functions
    const handleExportReport = () => {
        const report = {
            generatedAt: new Date().toISOString(),
            statistics: stats,
            topUsers: topUsers
        };
        exportToJSON(report, `analytics_report_${new Date().toISOString().split('T')[0]}`);
    };

    // Calculate some analytics metrics
    const avgMessagesPerUser = stats && stats.totalUsers > 0
        ? Math.round(stats.totalMessages / stats.totalUsers)
        : 0;

    const avgConversationsPerUser = stats && stats.totalUsers > 0
        ? Math.round(stats.totalConversations / stats.totalUsers * 10) / 10
        : 0;

    const avgMessagesPerConversation = stats && stats.totalConversations > 0
        ? Math.round(stats.totalMessages / stats.totalConversations * 10) / 10
        : 0;

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
                        Analytics
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-gray-400 mt-1"
                    >
                        System usage statistics and insights
                    </motion.p>
                </div>
                <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 flex-wrap"
                >
                    <button
                        onClick={handleExportReport}
                        className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-lg transition-all text-sm"
                        title="Export Report"
                    >
                        <Download className="h-4 w-4" />
                        <span className="hidden sm:inline">Export</span>
                    </button>
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

            {/* Overview Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
                <AnalyticsCard
                    title="Total Users"
                    value={stats?.totalUsers ?? '-'}
                    change={stats?.newUsersWeek ? Math.round((stats.newUsersWeek / (stats.totalUsers || 1)) * 100) : undefined}
                    icon={Users}
                    color="blue"
                    delay={0}
                />
                <AnalyticsCard
                    title="Total Conversations"
                    value={stats?.totalConversations ?? '-'}
                    icon={MessageSquare}
                    color="emerald"
                    delay={0.1}
                />
                <AnalyticsCard
                    title="Total Messages"
                    value={stats?.totalMessages ?? '-'}
                    icon={Activity}
                    color="purple"
                    delay={0.2}
                />
                <AnalyticsCard
                    title="Active Today"
                    value={stats?.activeUsers ?? '-'}
                    icon={TrendingUp}
                    color="orange"
                    delay={0.3}
                />
            </div>

            {/* Secondary Stats */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8"
            >
                <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                            <BarChart3 className="h-5 w-5 text-blue-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-white">Avg. Messages/User</h3>
                    </div>
                    <p className="text-4xl font-bold text-white">{avgMessagesPerUser}</p>
                    <p className="text-gray-500 text-sm mt-2">Messages sent per registered user</p>
                </div>

                <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-emerald-700/10 rounded-lg">
                            <MessageSquare className="h-5 w-5 text-emerald-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-white">Avg. Conversations/User</h3>
                    </div>
                    <p className="text-4xl font-bold text-white">{avgConversationsPerUser}</p>
                    <p className="text-gray-500 text-sm mt-2">Conversations started per user</p>
                </div>

                <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-purple-500/10 rounded-lg">
                            <Activity className="h-5 w-5 text-purple-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-white">Avg. Messages/Conversation</h3>
                    </div>
                    <p className="text-4xl font-bold text-white">{avgMessagesPerConversation}</p>
                    <p className="text-gray-500 text-sm mt-2">Average conversation length</p>
                </div>
            </motion.div>

            {/* Usage Tracking & Traffic Stats */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 md:mb-8"
            >
                {/* User Activity Track */}
                <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-6 border-b border-gray-800/60 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/10 rounded-lg">
                                <Users className="h-5 w-5 text-blue-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-white">Active Users Tracking</h3>
                        </div>
                        <span className="text-xs text-gray-500 bg-gray-800 px-2.5 py-1 rounded-full font-medium">Interval-based</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-800/20 border border-gray-800/40 p-4 rounded-xl relative overflow-hidden group">
                            <p className="text-gray-400 text-xs font-medium">TODAY (LAST 24H)</p>
                            <p className="text-2xl font-bold text-white mt-1">
                                {stats?.activeUsersToday !== undefined ? stats.activeUsersToday.toLocaleString() : '-'}
                            </p>
                            {stats?.activeUsersToday !== undefined && stats?.activeUsersYesterday !== undefined && (
                                <div className={`flex items-center gap-1 mt-1 text-xs ${
                                    stats.activeUsersToday >= stats.activeUsersYesterday ? 'text-emerald-400' : 'text-red-400'
                                }`}>
                                    {stats.activeUsersToday >= stats.activeUsersYesterday ? '+' : ''}
                                    {stats.activeUsersYesterday > 0 
                                        ? Math.round(((stats.activeUsersToday - stats.activeUsersYesterday) / stats.activeUsersYesterday) * 100) 
                                        : 0}% vs yesterday
                                </div>
                            )}
                        </div>

                        <div className="bg-gray-800/20 border border-gray-800/40 p-4 rounded-xl">
                            <p className="text-gray-400 text-xs font-medium">YESTERDAY</p>
                            <p className="text-2xl font-bold text-gray-300 mt-1">
                                {stats?.activeUsersYesterday !== undefined ? stats.activeUsersYesterday.toLocaleString() : '-'}
                            </p>
                            <span className="text-[10px] text-gray-500 block mt-1">Previous 24h window</span>
                        </div>

                        <div className="bg-gray-800/20 border border-gray-800/40 p-4 rounded-xl">
                            <p className="text-gray-400 text-xs font-medium">WEEKLY (7 DAYS)</p>
                            <p className="text-2xl font-bold text-white mt-1">
                                {stats?.activeUsersWeekly !== undefined ? stats.activeUsersWeekly.toLocaleString() : '-'}
                            </p>
                            <span className="text-[10px] text-gray-500 block mt-1">Active users in past 7d</span>
                        </div>

                        <div className="bg-gray-800/20 border border-gray-800/40 p-4 rounded-xl">
                            <p className="text-gray-400 text-xs font-medium">MONTHLY (30 DAYS)</p>
                            <p className="text-2xl font-bold text-white mt-1">
                                {stats?.activeUsersMonthly !== undefined ? stats.activeUsersMonthly.toLocaleString() : '-'}
                            </p>
                            <span className="text-[10px] text-gray-500 block mt-1">Active users in past 30d</span>
                        </div>
                    </div>
                </div>

                {/* Message Volume Track */}
                <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-6 border-b border-gray-800/60 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-500/10 rounded-lg">
                                <Activity className="h-5 w-5 text-purple-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-white">Message Volumes Tracking</h3>
                        </div>
                        <span className="text-xs text-gray-500 bg-gray-800 px-2.5 py-1 rounded-full font-medium">Interaction Logs</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-800/20 border border-gray-800/40 p-4 rounded-xl relative overflow-hidden group">
                            <p className="text-gray-400 text-xs font-medium">TODAY (LAST 24H)</p>
                            <p className="text-2xl font-bold text-white mt-1">
                                {stats?.messagesToday !== undefined ? stats.messagesToday.toLocaleString() : '-'}
                            </p>
                            {stats?.messagesToday !== undefined && stats?.messagesYesterday !== undefined && (
                                <div className={`flex items-center gap-1 mt-1 text-xs ${
                                    stats.messagesToday >= stats.messagesYesterday ? 'text-emerald-400' : 'text-red-400'
                                }`}>
                                    {stats.messagesToday >= stats.messagesYesterday ? '+' : ''}
                                    {stats.messagesYesterday > 0 
                                        ? Math.round(((stats.messagesToday - stats.messagesYesterday) / stats.messagesYesterday) * 100) 
                                        : 0}% vs yesterday
                                </div>
                            )}
                        </div>

                        <div className="bg-gray-800/20 border border-gray-800/40 p-4 rounded-xl">
                            <p className="text-gray-400 text-xs font-medium">YESTERDAY</p>
                            <p className="text-2xl font-bold text-gray-300 mt-1">
                                {stats?.messagesYesterday !== undefined ? stats.messagesYesterday.toLocaleString() : '-'}
                            </p>
                            <span className="text-[10px] text-gray-500 block mt-1">Previous 24h window</span>
                        </div>

                        <div className="bg-gray-800/20 border border-gray-800/40 p-4 rounded-xl">
                            <p className="text-gray-400 text-xs font-medium">WEEKLY (7 DAYS)</p>
                            <p className="text-2xl font-bold text-white mt-1">
                                {stats?.messagesWeekly !== undefined ? stats.messagesWeekly.toLocaleString() : '-'}
                            </p>
                            <span className="text-[10px] text-gray-500 block mt-1">Messages sent in past 7d</span>
                        </div>

                        <div className="bg-gray-800/20 border border-gray-800/40 p-4 rounded-xl">
                            <p className="text-gray-400 text-xs font-medium">MONTHLY (30 DAYS)</p>
                            <p className="text-2xl font-bold text-white mt-1">
                                {stats?.messagesMonthly !== undefined ? stats.messagesMonthly.toLocaleString() : '-'}
                            </p>
                            <span className="text-[10px] text-gray-500 block mt-1">Messages sent in past 30d</span>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Top Users */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6"
            >
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-500/10 rounded-lg">
                            <TrendingUp className="h-5 w-5 text-orange-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-white">Most Active Users</h3>
                    </div>
                    <span className="text-sm text-gray-500">Top 10 by message count</span>
                </div>

                {loading ? (
                    <div className="animate-pulse space-y-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="h-16 bg-gray-800/50 rounded-xl" />
                        ))}
                    </div>
                ) : topUsers.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        No user data available
                    </div>
                ) : (
                    <div className="space-y-3">
                        {topUsers.map((user, index) => (
                            <motion.div
                                key={user.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.5 + index * 0.05 }}
                                className="flex items-center gap-4 p-4 bg-gray-800/30 rounded-xl hover:bg-gray-800/50 transition-colors"
                            >
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-700 text-gray-300 font-bold text-sm">
                                    {index + 1}
                                </div>
                                <div className="w-10 h-10 bg-gradient-to-br from-emerald-700 to-emerald-800 rounded-full flex items-center justify-center text-white font-semibold">
                                    {(user.name || user.email || 'U')[0].toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-white font-medium truncate">
                                        {user.name || 'Unnamed User'}
                                    </p>
                                    <p className="text-gray-500 text-sm truncate">{user.email}</p>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="text-center">
                                        <p className="text-white font-semibold">{user.messageCount}</p>
                                        <p className="text-gray-500 text-xs">Messages</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-white font-semibold">{user.conversationCount}</p>
                                        <p className="text-gray-500 text-xs">Chats</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </motion.div>

        </div>
    );
}
