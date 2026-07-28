'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon, TrendingUp } from 'lucide-react';

interface StatCardProps {
    icon: LucideIcon;
    title: string;
    value: string | number;
    trend?: string;
    color: 'emerald' | 'blue' | 'purple' | 'orange' | 'red';
    delay?: number;
}

const colorClasses = {
    emerald: {
        bg: 'bg-emerald-700/10',
        border: 'border-emerald-700/20',
        icon: 'text-emerald-700',
        trend: 'text-emerald-700',
    },
    blue: {
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/20',
        icon: 'text-blue-400',
        trend: 'text-blue-400',
    },
    purple: {
        bg: 'bg-purple-500/10',
        border: 'border-purple-500/20',
        icon: 'text-purple-400',
        trend: 'text-purple-400',
    },
    orange: {
        bg: 'bg-orange-500/10',
        border: 'border-orange-500/20',
        icon: 'text-orange-400',
        trend: 'text-orange-400',
    },
    red: {
        bg: 'bg-red-500/10',
        border: 'border-red-500/20',
        icon: 'text-red-400',
        trend: 'text-red-400',
    },
};

export default function StatCard({ icon: Icon, title, value, trend, color, delay = 0 }: StatCardProps) {
    const colors = colorClasses[color];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay }}
            className={`${colors.bg} backdrop-blur-sm border ${colors.border} rounded-2xl p-6 hover:border-opacity-50 transition-all`}
        >
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-gray-400 text-sm font-medium mb-1">{title}</p>
                    <h3 className="text-3xl font-bold text-white mb-2">
                        {typeof value === 'number' ? value.toLocaleString() : value}
                    </h3>
                    {trend && (
                        <div className="flex items-center gap-1 text-sm">
                            <TrendingUp className={`h-4 w-4 ${colors.trend}`} />
                            <span className={colors.trend}>{trend}</span>
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
