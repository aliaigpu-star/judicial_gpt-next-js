'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

/**
 * Hook to automatically log out user after inactivity
 * @param timeout - Inactivity timeout in milliseconds (default: 1 hour)
 */
export function useInactivityLogout(timeout = 60 * 60 * 1000) {
    const router = useRouter();
    const { user, signOut } = useAuth();
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const clearTimeouts = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        if (warningTimeoutRef.current) {
            clearTimeout(warningTimeoutRef.current);
            warningTimeoutRef.current = null;
        }
    }, []);

    const handleLogout = useCallback(async () => {
        clearTimeouts();
        await signOut();
        router.push('/login');
    }, [signOut, router, clearTimeouts]);

    const resetTimer = useCallback(() => {
        clearTimeouts();

        if (!user) return;

        // Set warning 5 minutes before logout
        const warningTime = timeout - 5 * 60 * 1000;
        if (warningTime > 0) {
            warningTimeoutRef.current = setTimeout(() => {
                // Dispatch event for warning modal
                window.dispatchEvent(new CustomEvent('inactivity-warning'));
            }, warningTime);
        }

        // Set logout timer
        timeoutRef.current = setTimeout(handleLogout, timeout);
    }, [user, timeout, handleLogout, clearTimeouts]);

    useEffect(() => {
        if (!user) return;

        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];

        const handleActivity = () => {
            resetTimer();
        };

        // Add event listeners
        events.forEach(event => {
            document.addEventListener(event, handleActivity);
        });

        // Start initial timer
        resetTimer();

        // Cleanup
        return () => {
            events.forEach(event => {
                document.removeEventListener(event, handleActivity);
            });
            clearTimeouts();
        };
    }, [user, resetTimer, clearTimeouts]);

    return { resetTimer };
}
