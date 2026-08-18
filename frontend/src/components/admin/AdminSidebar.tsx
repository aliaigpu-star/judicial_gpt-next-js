'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    LayoutDashboard,
    Users,
    MessageSquare,
    BarChart3,
    Settings,
    Shield,
    LogOut,
    ChevronLeft,
    FileText,
    Sun,
    Moon
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

interface AdminSidebarProps {
    user: {
        name?: string;
        email?: string;
        avatarUrl?: string;
    } | null;
    onLogout: () => void;
    onClose?: () => void;
}

const navItems = [
    { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/admin/users', icon: Users, label: 'Users' },
    { href: '/admin/conversations', icon: MessageSquare, label: 'Conversations' },
    { href: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
    { href: '/admin/logs', icon: FileText, label: 'Logs' },
    { href: '/admin/settings', icon: Settings, label: 'Settings' },
];

export default function AdminSidebar({ user, onLogout, onClose }: AdminSidebarProps) {
    const pathname = usePathname();
    const { resolvedTheme, toggleTheme } = useTheme();

    const isActive = (href: string) => {
        if (href === '/admin') {
            return pathname === '/admin';
        }
        return pathname.startsWith(href);
    };

    return (
        <div className="h-screen flex flex-col bg-[#0a0a0a] border-r border-gray-800 w-64 fixed left-0 top-0">
            {/* Header */}
            <div className="p-4 border-b border-gray-800">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#0c9344] to-[#0c9344] rounded-xl flex items-center justify-center">
                        <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-white">Admin Panel</h1>
                        <p className="text-xs text-gray-500">JudicialGPT</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                    const active = isActive(item.href);
                    return (
                        <Link key={item.href} href={item.href}>
                            <motion.div
                                whileHover={{ x: 4 }}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer ${
                                    active
                                        ? 'bg-[#0c9344]/10 text-[#0c9344] border border-[#0c9344]/30'
                                        : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
                                }`}
                            >
                                <item.icon className="w-5 h-5" />
                                <span className="font-medium">{item.label}</span>
                                {active && (
                                    <motion.div
                                        layoutId="activeIndicator"
                                        className="ml-auto w-1.5 h-1.5 bg-[#0c9344] rounded-full"
                                    />
                                )}
                            </motion.div>
                        </Link>
                    );
                })}
            </nav>

            {/* Back to App */}
            <div className="p-3 border-t border-gray-800 space-y-2">
                <Link href="/chat" onClick={onClose}>
                    <motion.div
                        whileHover={{ x: 4 }}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-gray-800/50 hover:text-gray-200 transition-all cursor-pointer"
                    >
                        <ChevronLeft className="w-5 h-5" />
                        <span className="font-medium">Back to App</span>
                    </motion.div>
                </Link>
                
                {/* Theme Toggle */}
                <motion.button
                    whileHover={{ x: 4 }}
                    onClick={toggleTheme}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-gray-800/50 hover:text-gray-200 transition-all"
                    title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
                >
                    {resolvedTheme === 'dark' ? (
                        <Sun className="w-5 h-5" />
                    ) : (
                        <Moon className="w-5 h-5" />
                    )}
                    <span className="font-medium">
                        {resolvedTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                    </span>
                </motion.button>
            </div>

            {/* User Section */}
            <div className="p-3 border-t border-gray-800">
                <div className="flex items-center gap-3 px-3 py-2 mb-2">
                    {user?.avatarUrl ? (
                        <img
                            src={user.avatarUrl}
                            alt=""
                            className="w-10 h-10 rounded-full object-cover"
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0c9344] to-[#0c9344] flex items-center justify-center text-white font-semibold">
                            {user?.name?.[0] || user?.email?.[0] || 'A'}
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                            {user?.name || 'Admin'}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                    </div>
                </div>
                <button
                    onClick={onLogout}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl transition-all"
                >
                    <LogOut className="w-4 h-4" />
                    <span className="font-medium">Sign Out</span>
                </button>
            </div>
        </div>
    );
}
