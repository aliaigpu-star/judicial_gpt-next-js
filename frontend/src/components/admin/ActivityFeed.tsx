'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
    MessageSquare,
    CheckCircle,
    Clock,
    Loader2
} from 'lucide-react';
import type { ActivityItem } from '@/lib/adminApi';

interface ActivityFeedProps {
    activities: ActivityItem[];
    loading: boolean;
}

function formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
}

export default function ActivityFeed({ activities, loading }: ActivityFeedProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6"
        >
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <h2 className="text-lg font-bold text-white">Recent Activity</h2>
                    {!loading && (
                        <span className="text-sm text-gray-400">
                            ({activities.length} items)
                        </span>
                    )}
                </div>
                <Clock className="h-5 w-5 text-gray-400" />
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 text-[#00a859] animate-spin" />
                </div>
            ) : activities.length === 0 ? (
                <div className="text-center py-12">
                    <MessageSquare className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400">No recent activity</p>
                    <p className="text-gray-500 text-sm mt-1">
                        Activity will appear here when users interact
                    </p>
                </div>
            ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto scrollbar-hide">
                    {activities.map((activity, index) => (
                        <motion.div
                            key={activity.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="flex items-start gap-4 p-4 bg-gray-800/50 rounded-xl border border-gray-700/50 hover:border-gray-600 transition-all"
                        >
                            <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-[#00a859] to-[#00a859] rounded-full flex items-center justify-center text-white font-semibold text-sm">
                                {activity.user[0]?.toUpperCase() || 'U'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-white font-medium truncate">
                                    {activity.title || 'New Conversation'}
                                </p>
                                <p className="text-gray-400 text-sm">{activity.user}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <span className="text-gray-500 text-xs">
                                    {formatTime(activity.timestamp)}
                                </span>
                                <CheckCircle className="h-4 w-4 text-[#00a859]" />
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </motion.div>
    );
}
