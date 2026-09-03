'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    Users,
    MessageSquare,
    Activity,
    Clock,
    RefreshCw,
    UserPlus,
    Search
} from 'lucide-react';
import StatCard from '@/components/admin/StatCard';
import SystemStatus from '@/components/admin/SystemStatus';
import ActivityFeed from '@/components/admin/ActivityFeed';
import { adminApi, type DashboardStats, type SystemStatus as SystemStatusType, type ActivityItem } from '@/lib/adminApi';
import Link from 'next/link';

export default function AdminDashboard() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [systemStatus, setSystemStatus] = useState<SystemStatusType | null>(null);
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        try {
            const [statsRes, statusRes, activityRes] = await Promise.all([
                adminApi.getDashboardStats(),
                adminApi.getSystemStatus(),
                adminApi.getActivity(10)
            ]);
            setStats(statsRes.stats);
            setSystemStatus(statusRes);
            setActivities(activityRes.activity);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Failed to load dashboard data');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadData();

        // Auto-refresh every 30 seconds
        const interval = setInterval(loadData, 30000);
        return () => clearInterval(interval);
    }, [loadData]);

    const handleRefresh = () => {
        setRefreshing(true);
        loadData();
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
                        Dashboard
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-gray-400 mt-1"
                    >
                        Overview of your JudicialGPT system
                    </motion.p>
                </div>
                <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3"
                >
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-xl transition-all disabled:opacity-50"
                    >
                        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </motion.div>
            </div>

            {/* Error Display */}
            {error && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl mb-6"
                >
                    {error}
                </motion.div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
                <StatCard
                    icon={Users}
                    title="Total Users"
                    value={stats?.totalUsers ?? '-'}
                    trend={stats?.newUsersWeek ? `+${stats.newUsersWeek} this week` : undefined}
                    color="blue"
                    delay={0}
                />
                <StatCard
                    icon={MessageSquare}
                    title="Conversations"
                    value={stats?.totalConversations ?? '-'}
                    color="emerald"
                    delay={0.1}
                />
                <StatCard
                    icon={Activity}
                    title="Total Messages"
                    value={stats?.totalMessages ?? '-'}
                    trend={stats?.messagesToday !== undefined && stats?.messagesYesterday !== undefined
                        ? `${stats.messagesToday >= stats.messagesYesterday ? '+' : ''}${stats.messagesYesterday > 0 
                            ? Math.round(((stats.messagesToday - stats.messagesYesterday) / stats.messagesYesterday) * 100) 
                            : 0}% vs yesterday`
                        : undefined
                    }
                    color="purple"
                    delay={0.2}
                />
                <StatCard
                    icon={Clock}
                    title="Active Users (24h)"
                    value={stats?.activeUsers ?? '-'}
                    trend={stats?.activeUsersToday !== undefined && stats?.activeUsersYesterday !== undefined
                        ? `${stats.activeUsersToday >= stats.activeUsersYesterday ? '+' : ''}${stats.activeUsersYesterday > 0 
                            ? Math.round(((stats.activeUsersToday - stats.activeUsersYesterday) / stats.activeUsersYesterday) * 100) 
                            : 0}% vs yesterday`
                        : 'Real-time'
                    }
                    color="orange"
                    delay={0.3}
                />
            </div>

            {/* Quick Actions */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 md:mb-8"
            >
                <Link href="/admin/users">
                    <div className="flex items-center gap-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl hover:border-blue-500/40 transition-all cursor-pointer group">
                        <div className="p-3 bg-blue-500/20 rounded-lg group-hover:bg-blue-500/30 transition-all">
                            <UserPlus className="h-5 w-5 text-blue-400" />
                        </div>
                        <div>
                            <h3 className="text-white font-medium">Manage Users</h3>
                            <p className="text-gray-400 text-sm">View and edit user accounts</p>
                        </div>
                    </div>
                </Link>

                <Link href="/admin/conversations">
                    <div className="flex items-center gap-4 p-4 bg-[#00a859]/10 border border-[#00a859]/20 rounded-xl hover:border-[#00a859]/40 transition-all cursor-pointer group">
                        <div className="p-3 bg-[#00a859]/20 rounded-lg group-hover:bg-[#00a859]/30 transition-all">
                            <MessageSquare className="h-5 w-5 text-[#00a859]" />
                        </div>
                        <div>
                            <h3 className="text-white font-medium">View Conversations</h3>
                            <p className="text-gray-400 text-sm">Browse all chat sessions</p>
                        </div>
                    </div>
                </Link>

                <Link href="/admin/analytics">
                    <div className="flex items-center gap-4 p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl hover:border-purple-500/40 transition-all cursor-pointer group">
                        <div className="p-3 bg-purple-500/20 rounded-lg group-hover:bg-purple-500/30 transition-all">
                            <Search className="h-5 w-5 text-purple-400" />
                        </div>
                        <div>
                            <h3 className="text-white font-medium">Analytics</h3>
                            <p className="text-gray-400 text-sm">View detailed statistics</p>
                        </div>
                    </div>
                </Link>
            </motion.div>

            {/* Activity & System Status */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                <div className="lg:col-span-2">
                    <ActivityFeed activities={activities} loading={loading} />
                </div>
                <div>
                    <SystemStatus status={systemStatus} loading={loading} />
                </div>
            </div>
        </div>
    );
}
