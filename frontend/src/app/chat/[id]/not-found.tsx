'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MessageSquare, Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center p-4">
            <div className="text-center max-w-md">
                <MessageSquare className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                    Conversation Not Found
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                    The conversation you're looking for doesn't exist or may have been deleted.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                        onClick={() => router.back()}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Go Back
                    </button>
                    <Link
                        href="/chat"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                        <Home className="w-4 h-4" />
                        New Chat
                    </Link>
                </div>
            </div>
        </div>
    );
}
