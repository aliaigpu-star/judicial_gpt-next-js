'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
    Activity,
    Database,
    Shield,
    CheckCircle,
    XCircle,
    Loader2
} from 'lucide-react';
import type { SystemStatus as SystemStatusType } from '@/lib/adminApi';

interface SystemStatusProps {
    status: SystemStatusType | null;
    loading: boolean;
}

export default function SystemStatus({ status, loading }: SystemStatusProps) {
    const checks = [
        {
            name: 'Database',
            icon: Database,
            status: status?.checks.database ?? false,
            color: 'blue'
        },
        {
            name: 'API Service',
            icon: Activity,
            status: status?.checks.api ?? false,
            color: 'purple'
        },
        {
            name: 'Auth System',
            icon: Shield,
            status: status ? status.status === 'healthy' : false,
            color: 'emerald'
        }
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6"
        >
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-white">System Status</h2>
                <div className="flex items-center gap-2">
                    {loading ? (
                        <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
                    ) : (
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                            status?.status === 'healthy'
                                ? 'bg-emerald-700/10 text-emerald-700'
                                : 'bg-orange-500/10 text-orange-400'
                        }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                                status?.status === 'healthy' ? 'bg-emerald-700' : 'bg-orange-400'
                            }`} />
                            {status?.status === 'healthy' ? 'All Systems Operational' : 'Degraded'}
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-3">
                {checks.map((check) => (
                    <div
                        key={check.name}
                        className="flex items-center justify-between p-3 bg-gray-800/50 rounded-xl"
                    >
                        <div className="flex items-center gap-3">
                            <check.icon className={`h-4 w-4 ${
                                check.color === 'blue' ? 'text-blue-400' :
                                check.color === 'purple' ? 'text-purple-400' : 'text-emerald-700'
                            }`} />
                            <span className="text-gray-300 text-sm font-medium">{check.name}</span>
                        </div>
                        {loading ? (
                            <Loader2 className="h-4 w-4 text-gray-500 animate-spin" />
                        ) : check.status ? (
                            <CheckCircle className="h-4 w-4 text-emerald-700" />
                        ) : (
                            <XCircle className="h-4 w-4 text-red-400" />
                        )}
                    </div>
                ))}
            </div>

            {status?.timestamp && (
                <p className="mt-4 text-xs text-gray-500 text-center">
                    Last checked: {new Date(status.timestamp).toLocaleTimeString()}
                </p>
            )}
        </motion.div>
    );
}
