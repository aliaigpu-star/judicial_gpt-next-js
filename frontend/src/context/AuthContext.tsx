'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { api, getFullAvatarUrl } from '@/lib/api';

interface User {
    id: string;
    email: string;
    name: string;
    firstName?: string;
    lastName?: string;
    role: string;
    status: string;
    emailVerified: boolean;
    avatarUrl?: string;
    phoneNumber?: string;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    error: string | null;
    signIn: (email: string, password: string, captchaToken?: string) => Promise<any>;
    signUp: (email: string, password: string, userData: any) => Promise<any>;
    signOut: () => Promise<void>;
    updateProfile: (updates: { name?: string; avatarUrl?: string }) => Promise<void>;
    refreshUser: () => Promise<void>;
    clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Helper to transform user object with full avatar URL
    const transformUser = (userData: any): User => ({
        ...userData,
        avatarUrl: getFullAvatarUrl(userData.avatarUrl)
    });

    // Check for existing session on mount
    useEffect(() => {
        const initAuth = async () => {
            // API client auto-loads token from localStorage
            const token = api.getToken();
            if (token) {
                try {
                    const { user } = await api.getSession();
                    setUser(transformUser(user));
                } catch (err) {
                    // Token invalid, clear it
                    api.setToken(null);
                }
            }
            setLoading(false);
        };

        initAuth();
    }, []);

    const signIn = useCallback(async (email: string, password: string, captchaToken?: string) => {
        setLoading(true);
        setError(null);
        try {
            const { token, user } = await api.login(email, password, captchaToken);
            // api.login already sets the token, but ensure it's set
            api.setToken(token);
            const transformedUser = transformUser(user);
            setUser(transformedUser);
            // Ensure state is fully updated before resolving
            await new Promise(resolve => setTimeout(resolve, 100));
            return { user: transformedUser };
        } catch (err: any) {
            const errorMessage = err.message || (err.code === 'NETWORK_ERROR' ? 'Network error. Please check your connection and try again.' : 'Login failed');
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const signUp = useCallback(async (email: string, password: string, userData: any) => {
        setLoading(true);
        setError(null);
        try {
            const result = await api.register(email, password, userData);
            return result;
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const signOut = useCallback(async () => {
        setLoading(true);
        try {
            await api.logout();
        } catch (err) {
            // Ignore errors on logout
        } finally {
            api.setToken(null); // This handles localStorage removal
            setUser(null);
            setLoading(false);
        }
    }, []);

    const refreshUser = useCallback(async () => {
        try {
            const { user } = await api.getSession();
            setUser(transformUser(user));
        } catch (err) {
            // Session expired
        }
    }, []);

    const updateProfile = useCallback(async (updates: { name?: string; avatarUrl?: string }) => {
        try {
            await api.updateProfile(updates);
            await refreshUser();
        } catch (err: any) {
            setError(err.message);
            throw err;
        }
    }, [refreshUser]);

    const clearError = useCallback(() => setError(null), []);

    const value = useMemo(() => ({
        user,
        loading,
        error,
        signIn,
        signUp,
        signOut,
        updateProfile,
        refreshUser,
        clearError
    }), [user, loading, error, signIn, signUp, signOut, updateProfile, refreshUser, clearError]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}
