'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    FileText,
    RefreshCw,
    Search,
    Filter,
    X,
    Activity,
    Code,
    AlertCircle,
    CheckCircle,
    Clock,
    User,
    Globe,
    Server,
    Download,
    FileJson,
    List,
    GitBranch
} from 'lucide-react';
import { adminApi } from '@/lib/adminApi';
import { exportToCSV, exportToJSON } from '@/utils/export';
import ActivityTimeline from '@/components/admin/ActivityTimeline';

type LogType = 'activity' | 'api-requests';

interface ActivityLog {
    id: number;
    userId?: string;
    userName?: string;
    userEmail?: string;
    action: string;
    entityType?: string;
    entityId?: string;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
    timestamp: string;
}

interface ApiRequestLog {
    id: string;
    timestamp: string;
    apiKeyId?: string;
    userId?: string;
    userName?: string;
    userEmail?: string;
    sessionId?: string;
    requestType?: string;
    endpoint?: string;
    method?: string;
    model?: string;
    status: string;
    responseTime?: number;
    tokensUsed?: number;
    statusCode?: number;
    errorMessage?: string;
    ipAddress?: string;
    userAgent?: string;
    country?: string;
    completedAt?: string;
}

function formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

function formatRelativeTime(timestamp: string): string {
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
    return formatTimestamp(timestamp);
}

export default function LogsPage() {
    const [logType, setLogType] = useState<LogType>('activity');
    const [viewMode, setViewMode] = useState<'table' | 'timeline'>('table');
    const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
    const [apiRequestLogs, setApiRequestLogs] = useState<ApiRequestLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [actionFilter, setActionFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [expandedLog, setExpandedLog] = useState<string | null>(null);

    const loadLogs = useCallback(async () => {
        try {
            if (logType === 'activity') {
                const result = await adminApi.getActivityLogs(100, 0, actionFilter !== 'all' ? actionFilter : undefined);
                setActivityLogs(result.logs);
            } else {
                const result = await adminApi.getApiRequestLogs(100, 0, statusFilter !== 'all' ? statusFilter : undefined);
                setApiRequestLogs(result.logs);
            }
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Failed to load logs');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [logType, actionFilter, statusFilter]);

    useEffect(() => {
        setLoading(true);
        loadLogs();
    }, [loadLogs]);

    const handleRefresh = () => {
        setRefreshing(true);
        loadLogs();
    };

    const filteredActivityLogs = activityLogs.filter(log => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            log.action?.toLowerCase().includes(query) ||
            log.userName?.toLowerCase().includes(query) ||
            log.userEmail?.toLowerCase().includes(query) ||
            log.ipAddress?.toLowerCase().includes(query) ||
            log.entityType?.toLowerCase().includes(query)
        );
    });

    const filteredApiRequestLogs = apiRequestLogs.filter(log => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            log.endpoint?.toLowerCase().includes(query) ||
            log.userName?.toLowerCase().includes(query) ||
            log.userEmail?.toLowerCase().includes(query) ||
            log.ipAddress?.toLowerCase().includes(query) ||
            log.model?.toLowerCase().includes(query) ||
            log.method?.toLowerCase().includes(query)
        );
    });

    // Export functions - defined after filtered arrays
    const handleExportCSV = () => {
        if (logType === 'activity') {
            const exportData = filteredActivityLogs.map(log => ({
                Action: log.action,
                'User Name': log.userName || 'System',
                'User Email': log.userEmail || 'N/A',
                'Entity Type': log.entityType || 'N/A',
                'Entity ID': log.entityId || 'N/A',
                'IP Address': log.ipAddress || 'N/A',
                'User Agent': log.userAgent || 'N/A',
                Timestamp: formatTimestamp(log.timestamp)
            }));
            exportToCSV(exportData, `activity_logs_${new Date().toISOString().split('T')[0]}`);
        } else {
            const exportData = filteredApiRequestLogs.map(log => ({
                Method: log.method || 'N/A',
                Endpoint: log.endpoint || 'N/A',
                'User Name': log.userName || 'Anonymous',
                'User Email': log.userEmail || 'N/A',
                Status: log.status,
                'Response Time (ms)': log.responseTime || 'N/A',
                'Tokens Used': log.tokensUsed || 'N/A',
                'Status Code': log.statusCode || 'N/A',
                Model: log.model || 'N/A',
                'IP Address': log.ipAddress || 'N/A',
                Timestamp: formatTimestamp(log.timestamp)
            }));
            exportToCSV(exportData, `api_requests_${new Date().toISOString().split('T')[0]}`);
        }
    };

    const handleExportJSON = () => {
        if (logType === 'activity') {
            exportToJSON(filteredActivityLogs, `activity_logs_${new Date().toISOString().split('T')[0]}`);
        } else {
            exportToJSON(filteredApiRequestLogs, `api_requests_${new Date().toISOString().split('T')[0]}`);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'success':
                return 'bg-[#00a859]/10 text-[#00a859] border-[#00a859]/20';
            case 'failed':
                return 'bg-red-500/10 text-red-400 border-red-500/20';
            case 'pending':
                return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
            default:
                return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
        }
    };

    const getActionIcon = (action: string) => {
        if (action.toLowerCase().includes('login')) return User;
        if (action.toLowerCase().includes('create') || action.toLowerCase().includes('register')) return CheckCircle;
        if (action.toLowerCase().includes('delete')) return X;
        if (action.toLowerCase().includes('update') || action.toLowerCase().includes('edit')) return RefreshCw;
        return Activity;
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
                        System Logs
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-gray-400 mt-1"
                    >
                        View activity logs and API request logs
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

            {/* Log Type Tabs and View Mode */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-2 bg-gray-900/50 border border-gray-800 rounded-xl p-1 flex-1"
                >
                    <button
                        onClick={() => setLogType('activity')}
                        className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all ${
                            logType === 'activity'
                                ? 'bg-[#00a859]/10 text-[#00a859] border border-[#00a859]/30'
                                : 'text-gray-400 hover:text-gray-200'
                        }`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <Activity className="w-4 h-4" />
                            <span className="hidden sm:inline">Activity Logs</span>
                            <span className="sm:hidden">Activity</span>
                        </div>
                    </button>
                    <button
                        onClick={() => setLogType('api-requests')}
                        className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all ${
                            logType === 'api-requests'
                                ? 'bg-[#00a859]/10 text-[#00a859] border border-[#00a859]/30'
                                : 'text-gray-400 hover:text-gray-200'
                        }`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <Code className="w-4 h-4" />
                            <span className="hidden sm:inline">API Requests</span>
                            <span className="sm:hidden">API</span>
                        </div>
                    </button>
                </motion.div>

                {/* View Mode Toggle (only for activity logs) */}
                {logType === 'activity' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex gap-2 bg-gray-900/50 border border-gray-800 rounded-xl p-1"
                    >
                        <button
                            onClick={() => setViewMode('table')}
                            className={`px-4 py-2.5 rounded-lg font-medium transition-all ${
                                viewMode === 'table'
                                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                                    : 'text-gray-400 hover:text-gray-200'
                            }`}
                            title="Table View"
                        >
                            <List className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('timeline')}
                            className={`px-4 py-2.5 rounded-lg font-medium transition-all ${
                                viewMode === 'timeline'
                                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                                    : 'text-gray-400 hover:text-gray-200'
                            }`}
                            title="Timeline View"
                        >
                            <GitBranch className="w-4 h-4" />
                        </button>
                    </motion.div>
                )}
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
                                placeholder="Search logs..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-11 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-[#00a859]/50 focus:border-[#00a859]/50 transition-all"
                            />
                        </div>
                    </div>

                    {/* Action Filter (for activity logs) */}
                    {logType === 'activity' && (
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-gray-400" />
                            <select
                                value={actionFilter}
                                onChange={(e) => setActionFilter(e.target.value)}
                                className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-[#00a859]/50 focus:border-[#00a859]/50 cursor-pointer"
                            >
                                <option value="all">All Actions</option>
                                <option value="user_login">User Login</option>
                                <option value="user_register">User Register</option>
                                <option value="conversation_create">Create Conversation</option>
                                <option value="conversation_delete">Delete Conversation</option>
                                <option value="user_update">Update User</option>
                                <option value="user_delete">Delete User</option>
                                <option value="admin_user_update">Admin: Update User</option>
                                <option value="admin_user_delete">Admin: Delete User</option>
                            </select>
                        </div>
                    )}

                    {/* Status Filter (for API requests) */}
                    {logType === 'api-requests' && (
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-[#00a859]/50 focus:border-[#00a859]/50 cursor-pointer"
                        >
                            <option value="all">All Status</option>
                            <option value="success">Success</option>
                            <option value="failed">Failed</option>
                            <option value="pending">Pending</option>
                        </select>
                    )}

                    {/* Clear Filters */}
                    {(searchQuery || actionFilter !== 'all' || statusFilter !== 'all') && (
                        <button
                            onClick={() => {
                                setSearchQuery('');
                                setActionFilter('all');
                                setStatusFilter('all');
                            }}
                            className="px-4 py-2.5 text-gray-400 hover:text-gray-300 transition-all"
                        >
                            Clear filters
                        </button>
                    )}
                </div>

                {/* Results count */}
                <div className="mt-4 flex items-center gap-2 text-sm">
                    <FileText className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-400">
                        Showing <span className="text-white font-medium">
                            {logType === 'activity' ? filteredActivityLogs.length : filteredApiRequestLogs.length}
                        </span> logs
                    </span>
                </div>
            </motion.div>

            {/* Activity Logs - Timeline View */}
            {logType === 'activity' && viewMode === 'timeline' && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <ActivityTimeline
                        events={filteredActivityLogs.map(log => ({
                            id: log.id.toString(),
                            timestamp: log.timestamp,
                            action: log.action,
                            user: log.userName || log.userEmail || 'System',
                            entityType: log.entityType,
                            entityId: log.entityId,
                            details: log.entityType && log.entityId 
                                ? `${log.entityType}: ${log.entityId.slice(0, 8)}...`
                                : undefined
                        }))}
                        loading={loading}
                    />
                </motion.div>
            )}

            {/* Activity Logs Table */}
            {logType === 'activity' && viewMode === 'table' && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden"
                >
                    {loading ? (
                        <div className="animate-pulse p-12">
                            <div className="h-12 bg-gray-800/50 mb-4" />
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="h-16 bg-gray-800/30 mb-2" />
                            ))}
                        </div>
                    ) : filteredActivityLogs.length === 0 ? (
                        <div className="text-center py-12">
                            <FileText className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                            <p className="text-gray-400 font-medium">No activity logs found</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-800 bg-gray-800/30">
                                        <th className="text-left py-4 px-6 text-gray-400 font-semibold text-sm">Time</th>
                                        <th className="text-left py-4 px-6 text-gray-400 font-semibold text-sm">Action</th>
                                        <th className="text-left py-4 px-6 text-gray-400 font-semibold text-sm">User</th>
                                        <th className="text-left py-4 px-6 text-gray-400 font-semibold text-sm">IP Address</th>
                                        <th className="text-left py-4 px-6 text-gray-400 font-semibold text-sm">Details</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredActivityLogs.map((log, index) => {
                                        const ActionIcon = getActionIcon(log.action);
                                        return (
                                            <motion.tr
                                                key={log.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index * 0.03 }}
                                                className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors cursor-pointer"
                                                onClick={() => setExpandedLog(expandedLog === `activity-${log.id}` ? null : `activity-${log.id}`)}
                                            >
                                                <td className="py-4 px-6">
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="w-4 h-4 text-gray-500" />
                                                        <span className="text-gray-400 text-sm">{formatRelativeTime(log.timestamp)}</span>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <div className="flex items-center gap-2">
                                                        <ActionIcon className="w-4 h-4 text-[#00a859]" />
                                                        <span className="text-white font-medium">{log.action}</span>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <div className="flex items-center gap-2">
                                                        <User className="w-4 h-4 text-gray-500" />
                                                        <span className="text-gray-300 text-sm">
                                                            {log.userName || log.userEmail || 'System'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6 text-gray-400 text-sm font-mono">
                                                    {log.ipAddress || 'N/A'}
                                                </td>
                                                <td className="py-4 px-6">
                                                    <span className="text-gray-400 text-sm">
                                                        {log.entityType ? `${log.entityType}: ${log.entityId?.slice(0, 8)}...` : 'N/A'}
                                                    </span>
                                                </td>
                                            </motion.tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </motion.div>
            )}

            {/* API Request Logs Table */}
            {logType === 'api-requests' && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden"
                >
                    {loading ? (
                        <div className="animate-pulse p-12">
                            <div className="h-12 bg-gray-800/50 mb-4" />
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="h-16 bg-gray-800/30 mb-2" />
                            ))}
                        </div>
                    ) : filteredApiRequestLogs.length === 0 ? (
                        <div className="text-center py-12">
                            <Code className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                            <p className="text-gray-400 font-medium">No API request logs found</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-800 bg-gray-800/30">
                                        <th className="text-left py-4 px-6 text-gray-400 font-semibold text-sm">Time</th>
                                        <th className="text-left py-4 px-6 text-gray-400 font-semibold text-sm">Method</th>
                                        <th className="text-left py-4 px-6 text-gray-400 font-semibold text-sm">Endpoint</th>
                                        <th className="text-left py-4 px-6 text-gray-400 font-semibold text-sm">User</th>
                                        <th className="text-center py-4 px-6 text-gray-400 font-semibold text-sm">Status</th>
                                        <th className="text-center py-4 px-6 text-gray-400 font-semibold text-sm">Response Time</th>
                                        <th className="text-center py-4 px-6 text-gray-400 font-semibold text-sm">Tokens</th>
                                        <th className="text-left py-4 px-6 text-gray-400 font-semibold text-sm">IP</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredApiRequestLogs.map((log, index) => (
                                        <motion.tr
                                            key={log.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.03 }}
                                            className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors cursor-pointer"
                                            onClick={() => setExpandedLog(expandedLog === `api-${log.id}` ? null : `api-${log.id}`)}
                                        >
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-2">
                                                    <Clock className="w-4 h-4 text-gray-500" />
                                                    <span className="text-gray-400 text-sm">{formatRelativeTime(log.timestamp)}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className={`px-2 py-1 rounded text-xs font-mono ${
                                                    log.method === 'GET' ? 'bg-blue-500/10 text-blue-400' :
                                                    log.method === 'POST' ? 'bg-[#00a859]/10 text-[#00a859]' :
                                                    log.method === 'PUT' ? 'bg-yellow-500/10 text-yellow-400' :
                                                    log.method === 'DELETE' ? 'bg-red-500/10 text-red-400' :
                                                    'bg-gray-500/10 text-gray-400'
                                                }`}>
                                                    {log.method || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className="text-gray-300 text-sm font-mono truncate max-w-[200px]">
                                                    {log.endpoint || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className="text-gray-300 text-sm">
                                                    {log.userName || log.userEmail || 'Anonymous'}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border ${getStatusColor(log.status)}`}>
                                                    {log.status === 'success' ? (
                                                        <CheckCircle className="w-3 h-3" />
                                                    ) : log.status === 'failed' ? (
                                                        <AlertCircle className="w-3 h-3" />
                                                    ) : (
                                                        <Clock className="w-3 h-3" />
                                                    )}
                                                    {log.status}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                <span className="text-gray-400 text-sm">
                                                    {log.responseTime ? `${log.responseTime}ms` : 'N/A'}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                <span className="text-gray-400 text-sm">
                                                    {log.tokensUsed ? log.tokensUsed.toLocaleString() : 'N/A'}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-gray-400 text-sm font-mono">
                                                {log.ipAddress || 'N/A'}
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </motion.div>
            )}

            {/* Expanded Log Details Modal */}
            {expandedLog && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                    onClick={() => setExpandedLog(null)}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-6 border-b border-gray-800">
                            <h3 className="text-lg font-bold text-white">Log Details</h3>
                            <button
                                onClick={() => setExpandedLog(null)}
                                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                            >
                                <X className="h-5 w-5 text-gray-400" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto max-h-[60vh]">
                            {expandedLog.startsWith('activity-') && (() => {
                                const log = activityLogs.find(l => `activity-${l.id}` === expandedLog);
                                if (!log) return null;
                                return (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-gray-500 text-sm">Action</label>
                                            <p className="text-white font-medium">{log.action}</p>
                                        </div>
                                        <div>
                                            <label className="text-gray-500 text-sm">User</label>
                                            <p className="text-white">{log.userName || log.userEmail || 'System'}</p>
                                        </div>
                                        <div>
                                            <label className="text-gray-500 text-sm">Timestamp</label>
                                            <p className="text-white">{formatTimestamp(log.timestamp)}</p>
                                        </div>
                                        {log.entityType && (
                                            <div>
                                                <label className="text-gray-500 text-sm">Entity</label>
                                                <p className="text-white">{log.entityType}: {log.entityId}</p>
                                            </div>
                                        )}
                                        {log.ipAddress && (
                                            <div>
                                                <label className="text-gray-500 text-sm">IP Address</label>
                                                <p className="text-white font-mono">{log.ipAddress}</p>
                                            </div>
                                        )}
                                        {log.userAgent && (
                                            <div>
                                                <label className="text-gray-500 text-sm">User Agent</label>
                                                <p className="text-white text-sm">{log.userAgent}</p>
                                            </div>
                                        )}
                                        {log.details && (
                                            <div>
                                                <label className="text-gray-500 text-sm">Details</label>
                                                <pre className="text-white text-sm bg-gray-800 p-3 rounded-lg overflow-x-auto">
                                                    {JSON.stringify(log.details, null, 2)}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                            {expandedLog.startsWith('api-') && (() => {
                                const log = apiRequestLogs.find(l => `api-${l.id}` === expandedLog);
                                if (!log) return null;
                                return (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-gray-500 text-sm">Method</label>
                                                <p className="text-white font-medium">{log.method || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <label className="text-gray-500 text-sm">Status</label>
                                                <p className="text-white">{log.status}</p>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-gray-500 text-sm">Endpoint</label>
                                            <p className="text-white font-mono text-sm">{log.endpoint || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <label className="text-gray-500 text-sm">User</label>
                                            <p className="text-white">{log.userName || log.userEmail || 'Anonymous'}</p>
                                        </div>
                                        <div>
                                            <label className="text-gray-500 text-sm">Timestamp</label>
                                            <p className="text-white">{formatTimestamp(log.timestamp)}</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-gray-500 text-sm">Response Time</label>
                                                <p className="text-white">{log.responseTime ? `${log.responseTime}ms` : 'N/A'}</p>
                                            </div>
                                            <div>
                                                <label className="text-gray-500 text-sm">Tokens Used</label>
                                                <p className="text-white">{log.tokensUsed ? log.tokensUsed.toLocaleString() : 'N/A'}</p>
                                            </div>
                                        </div>
                                        {log.model && (
                                            <div>
                                                <label className="text-gray-500 text-sm">Model</label>
                                                <p className="text-white">{log.model}</p>
                                            </div>
                                        )}
                                        {log.ipAddress && (
                                            <div>
                                                <label className="text-gray-500 text-sm">IP Address</label>
                                                <p className="text-white font-mono">{log.ipAddress}</p>
                                            </div>
                                        )}
                                        {log.errorMessage && (
                                            <div>
                                                <label className="text-gray-500 text-sm">Error</label>
                                                <p className="text-red-400 text-sm">{log.errorMessage}</p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </div>
    );
}
