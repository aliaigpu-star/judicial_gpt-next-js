'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { motion } from 'framer-motion';
import { Shield, Loader2, Menu, X } from 'lucide-react';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, loading, signOut } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [authorized, setAuthorized] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Keyboard shortcuts
    useKeyboardShortcuts([
        {
            key: 'd',
            ctrl: true,
            action: () => router.push('/admin'),
            description: 'Go to Dashboard'
        },
        {
            key: 'u',
            ctrl: true,
            action: () => router.push('/admin/users'),
            description: 'Go to Users'
        },
        {
            key: 'c',
            ctrl: true,
            action: () => router.push('/admin/conversations'),
            description: 'Go to Conversations'
        },
        {
            key: 'a',
            ctrl: true,
            action: () => router.push('/admin/analytics'),
            description: 'Go to Analytics'
        },
        {
            key: 'l',
            ctrl: true,
            action: () => router.push('/admin/logs'),
            description: 'Go to Logs'
        },
        {
            key: 's',
            ctrl: true,
            action: () => router.push('/admin/settings'),
            description: 'Go to Settings'
        },
        {
            key: 'b',
            ctrl: true,
            action: () => router.push('/chat'),
            description: 'Back to App'
        }
    ]);

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push('/login');
            } else if (user.role !== 'admin') {
                // Not an admin, redirect to chat
                router.push('/chat');
            } else {
                setAuthorized(true);
            }
        }
    }, [user, loading, router]);

    const handleLogout = async () => {
        await signOut();
        router.push('/login');
    };

    if (loading || !authorized) {
        return (
            <div className="min-h-screen bg-[#000000] flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center"
                >
                    <div className="w-16 h-16 bg-gradient-to-br from-[#0c9344] to-[#0c9344] rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Shield className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex items-center justify-center gap-2 text-gray-400">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Verifying access...</span>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="h-screen bg-[#000000] flex overflow-hidden">
            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div className={`fixed lg:static inset-y-0 left-0 z-50 transition-transform duration-300 ${
                sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
            }`}>
                <AdminSidebar user={user} onLogout={handleLogout} onClose={() => setSidebarOpen(false)} />
            </div>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto overflow-x-hidden lg:ml-64">
                {/* Mobile Header */}
                <div className="lg:hidden sticky top-0 z-30 bg-[#0a0a0a] border-b border-gray-800 p-4 flex items-center justify-between">
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        {sidebarOpen ? (
                            <X className="w-5 h-5 text-gray-300" />
                        ) : (
                            <Menu className="w-5 h-5 text-gray-300" />
                        )}
                    </button>
                    <div className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-[#0c9344]" />
                        <span className="text-white font-semibold">Admin</span>
                    </div>
                </div>
                <div className="min-h-full">
                    {children}
                </div>
            </main>
        </div>
    );
}
