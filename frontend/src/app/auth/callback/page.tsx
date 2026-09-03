'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

function AuthCallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { refreshUser } = useAuth();

    useEffect(() => {
        const token = searchParams.get('token');
        const error = searchParams.get('error');

        if (error) {
            router.push(`/login?error=${error}`);
            return;
        }

        if (token) {
            // Save token
            api.setToken(token);

            // Refresh user and redirect
            refreshUser().then(() => {
                router.push('/chat');
            }).catch(() => {
                router.push('/login?error=session_init_failed');
            });
        } else {
            router.push('/login');
        }
    }, [searchParams, router, refreshUser]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-black">
            <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#00a859]" />
                <p className="text-gray-400 text-sm">Completing sign in...</p>
            </div>
        </div>
    );
}

export default function AuthCallbackPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-black">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#00a859]" />
            </div>
        }>
            <AuthCallbackContent />
        </Suspense>
    );
}
