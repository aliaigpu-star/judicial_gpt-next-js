'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Users,
    MessageSquare,
    BarChart3,
    Settings,
    LogOut,
    ArrowLeft,
    FileText,
    Sun,
    Moon,
    ThumbsUp,
    Scale
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

const navGroups = [
    {
        label: 'Overview',
        items: [
            { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
            { href: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
        ],
    },
    {
        label: 'Manage',
        items: [
            { href: '/admin/users', icon: Users, label: 'Users' },
            { href: '/admin/conversations', icon: MessageSquare, label: 'Conversations' },
        ],
    },
    {
        label: 'AI Quality',
        items: [
            { href: '/admin/feedback', icon: ThumbsUp, label: 'Feedback' },
        ],
    },
    {
        label: 'System',
        items: [
            { href: '/admin/logs', icon: FileText, label: 'Logs' },
            { href: '/admin/settings', icon: Settings, label: 'Settings' },
        ],
    },
];

export default function AdminSidebar({ user, onLogout, onClose }: AdminSidebarProps) {
    const pathname = usePathname();
    const { resolvedTheme, toggleTheme } = useTheme();

    const isActive = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname.startsWith(href));

    return (
        <div className="h-screen w-64 fixed left-0 top-0 flex flex-col bg-[#0a0a0a] border-r border-gray-800/80">
            {/* Brand */}
            <div className="h-16 px-5 flex items-center gap-3 border-b border-gray-800/80">
                <div className="w-9 h-9 rounded-[10px] bg-[#0c7a4b] flex items-center justify-center shadow-sm shadow-[#0c7a4b]/40">
                    <Scale className="w-[18px] h-[18px] text-white stroke-[2.2]" />
                </div>
                <div className="leading-tight">
                    <p className="text-[15px] font-black tracking-tight text-white">
                        Judicial<span className="text-[#00a859]">GPT</span>
                    </p>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-gray-500">Admin console</p>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
                {navGroups.map(group => (
                    <div key={group.label}>
                        <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">{group.label}</p>
                        <div className="space-y-0.5">
                            {group.items.map(item => {
                                const active = isActive(item.href);
                                return (
                                    <Link key={item.href} href={item.href} onClick={onClose}>
                                        <div
                                            className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${active
                                                ? 'bg-[#00a859]/10 text-white font-medium'
                                                : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                                                }`}
                                        >
                                            {active && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-[#00a859]" />}
                                            <item.icon className={`w-[18px] h-[18px] ${active ? 'text-[#00a859]' : ''}`} />
                                            <span>{item.label}</span>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Footer */}
            <div className="p-3 border-t border-gray-800/80 space-y-1">
                <Link href="/chat" onClick={onClose}>
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:bg-white/5 hover:text-gray-200 transition-colors">
                        <ArrowLeft className="w-[18px] h-[18px]" />
                        Back to app
                    </div>
                </Link>
                <button
                    onClick={toggleTheme}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:bg-white/5 hover:text-gray-200 transition-colors"
                    title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
                >
                    {resolvedTheme === 'dark' ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
                    {resolvedTheme === 'dark' ? 'Light mode' : 'Dark mode'}
                </button>

                <div className="mt-2 flex items-center gap-3 rounded-xl bg-white/[0.03] border border-gray-800/80 px-3 py-2.5">
                    {user?.avatarUrl ? (
                        <img src={user.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover" />
                    ) : (
                        <div className="w-9 h-9 rounded-full bg-[#0c7a4b] flex items-center justify-center text-white text-sm font-semibold">
                            {(user?.name?.[0] || user?.email?.[0] || 'A').toUpperCase()}
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{user?.name || 'Admin'}</p>
                        <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                    </div>
                    <button
                        onClick={onLogout}
                        className="p-2 rounded-lg text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                        title="Sign out"
                    >
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
