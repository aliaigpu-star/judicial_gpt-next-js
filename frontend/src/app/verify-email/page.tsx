'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react';
import { api } from '@/lib/api';

function VerifyEmailContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [loading, setLoading] = useState(true);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Define verifyEmail inside component to avoid dependency issues or move out if pure
    const verifyEmail = async () => {
        if (!token) return;

        setLoading(true);
        setError(null);

        try {
            await api.verifyEmail(token);
            setSuccess(true);
        } catch (err: any) {
            setError(err.message || 'Failed to verify email');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) {
            verifyEmail();
        } else {
            setError('Invalid or missing verification token');
            setLoading(false);
        }
    }, [token]);


    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md"
            >
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 text-center">
                    {loading ? (
                        <div className="py-12">
                            <Loader2 className="w-16 h-16 text-[#00a859] dark:text-[#00a859] animate-spin mx-auto mb-4" />
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                                Verifying Email...
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400">
                                Please wait while we verify your email address
                            </p>
                        </div>
                    ) : success ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                        >
                            <div className="w-16 h-16 bg-[#00a859]/15 dark:bg-[#00a859]/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="w-8 h-8 text-[#00a859] dark:text-[#00a859]" />
                            </div>
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                                Email Verified!
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400 mb-6">
                                Your email has been successfully verified. You can now access all features.
                            </p>
                            <Link
                                href="/login"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-[#00a859] hover:bg-[#00a859] text-white rounded-lg transition-colors"
                            >
                                Go to Login
                            </Link>
                        </motion.div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                        >
                            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                            </div>
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                                Verification Failed
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400 mb-6">
                                {error || 'Invalid or expired verification token'}
                            </p>
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={verifyEmail}
                                    className="px-6 py-3 bg-[#00a859] hover:bg-[#00a859] text-white rounded-lg transition-colors"
                                >
                                    Try Again
                                </button>
                                <Link
                                    href="/login"
                                    className="px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                                >
                                    Go to Login
                                </Link>
                            </div>
                        </motion.div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-black">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#00a859]" />
            </div>
        }>
            <VerifyEmailContent />
        </Suspense>
    );
}
