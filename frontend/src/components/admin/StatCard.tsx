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
        bg: 'bg-[#00a859]/10',
        border: 'border-[#00a859]/20',
        icon: 'text-[#00a859]',
        trend: 'text-[#00a859]',
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
    const negative = trend?.trim().startsWith('-');

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay }}
            className="relative overflow-hidden rounded-2xl border border-gray-800 bg-[#0a0a0a] p-5 transition-colors hover:border-gray-700"
        >
            <div className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full ${colors.bg} blur-2xl`} />
            <div className="relative flex items-center justify-between">
                <p className="text-sm font-medium text-gray-400">{title}</p>
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${colors.bg} border ${colors.border}`}>
                    <Icon className={`h-[18px] w-[18px] ${colors.icon}`} />
                </div>
            </div>
            <h3 className="relative mt-3 text-3xl font-bold tracking-tight text-white">
                {typeof value === 'number' ? value.toLocaleString() : value}
            </h3>
            {trend && (
                <div className={`relative mt-1.5 flex items-center gap-1 text-xs font-medium ${negative ? 'text-red-400' : colors.trend}`}>
                    <TrendingUp className={`h-3.5 w-3.5 ${negative ? 'rotate-180' : ''}`} />
                    <span>{trend}</span>
                </div>
            )}
        </motion.div>
    );
}
