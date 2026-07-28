/**
 * Activity Timeline Component
 * Visual timeline showing activity logs in chronological order
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
    User,
    MessageSquare,
    Trash2,
    Edit,
    CheckCircle,
    XCircle,
    Clock,
    Activity
} from 'lucide-react';

interface TimelineEvent {
    id: string;
    timestamp: string;
    action: string;
    user?: string;
    entityType?: string;
    entityId?: string;
    details?: string;
}

interface ActivityTimelineProps {
    events: TimelineEvent[];
    loading?: boolean;
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
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getActionIcon(action: string) {
    if (action.toLowerCase().includes('login')) return User;
    if (action.toLowerCase().includes('create') || action.toLowerCase().includes('register')) return CheckCircle;
    if (action.toLowerCase().includes('delete')) return Trash2;
    if (action.toLowerCase().includes('update') || action.toLowerCase().includes('edit')) return Edit;
    return Activity;
}

function getActionColor(action: string): string {
    if (action.toLowerCase().includes('login')) return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    if (action.toLowerCase().includes('create') || action.toLowerCase().includes('register')) return 'bg-emerald-700/10 text-emerald-700 border-emerald-700/20';
    if (action.toLowerCase().includes('delete')) return 'bg-red-500/10 text-red-400 border-red-500/20';
    if (action.toLowerCase().includes('update') || action.toLowerCase().includes('edit')) return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
}

export default function ActivityTimeline({ events, loading }: ActivityTimelineProps) {
    if (loading) {
        return (
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
                <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex gap-4">
                            <div className="w-10 h-10 bg-gray-800/50 rounded-full animate-pulse" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-gray-800/50 rounded animate-pulse w-3/4" />
                                <div className="h-3 bg-gray-800/30 rounded animate-pulse w-1/2" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (events.length === 0) {
        return (
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-12 text-center">
                <Activity className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 font-medium">No activity to display</p>
            </div>
        );
    }

    return (
        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-emerald-700/10 rounded-lg">
                    <Clock className="h-5 w-5 text-emerald-700" />
                </div>
                <h3 className="text-lg font-semibold text-white">Activity Timeline</h3>
            </div>

            <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-800" />

                <div className="space-y-6">
                    {events.map((event, index) => {
                        const Icon = getActionIcon(event.action);
                        const colorClass = getActionColor(event.action);

                        return (
                            <motion.div
                                key={event.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="relative flex gap-4 items-start"
                            >
                                {/* Timeline dot */}
                                <div className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 ${colorClass}`}>
                                    <Icon className="w-4 h-4" />
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0 pb-6">
                                    <div className="flex items-start justify-between gap-4 flex-wrap">
                                        <div className="flex-1 min-w-0">
                                            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-medium border ${colorClass} mb-2`}>
                                                <span>{event.action}</span>
                                            </div>
                                            {event.user && (
                                                <p className="text-gray-300 text-sm mt-1">
                                                    by <span className="font-medium">{event.user}</span>
                                                </p>
                                            )}
                                            {event.details && (
                                                <p className="text-gray-400 text-sm mt-1">{event.details}</p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1 text-gray-500 text-xs whitespace-nowrap">
                                            <Clock className="w-3 h-3" />
                                            {formatTime(event.timestamp)}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
