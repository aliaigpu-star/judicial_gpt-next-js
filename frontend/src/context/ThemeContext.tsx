'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

type ThemeMode = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

interface ThemeContextType {
    themeMode: ThemeMode;
    resolvedTheme: ResolvedTheme;
    setThemeMode: (mode: ThemeMode) => void;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

function getSystemTheme(): ResolvedTheme {
    if (typeof window !== 'undefined') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
}

function getInitialTheme(): { mode: ThemeMode; resolved: ResolvedTheme } {
    if (typeof window === 'undefined') {
        return { mode: 'system', resolved: 'dark' };
    }
    const savedMode = localStorage.getItem('themeMode') as ThemeMode | null;
    const mode = savedMode || 'system';
    const resolved = mode === 'system' ? getSystemTheme() : mode;
    return { mode, resolved };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    // Initialize with correct values immediately to prevent flash
    const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
        if (typeof window === 'undefined') return 'system';
        return (localStorage.getItem('themeMode') as ThemeMode) || 'system';
    });

    const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
        if (typeof window === 'undefined') return 'dark';
        const mode = (localStorage.getItem('themeMode') as ThemeMode) || 'system';
        return mode === 'system' ? getSystemTheme() : mode;
    });

    // Apply theme to document
    const applyTheme = useCallback((resolved: ResolvedTheme) => {
        setResolvedTheme(resolved);
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(resolved);
    }, []);

    // Apply theme on mount (sync with localStorage)
    useEffect(() => {
        const { mode, resolved } = getInitialTheme();
        setThemeModeState(mode);
        applyTheme(resolved);
    }, [applyTheme]);

    // Listen for system theme changes
    useEffect(() => {
        if (themeMode !== 'system') return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e: MediaQueryListEvent) => {
            applyTheme(e.matches ? 'dark' : 'light');
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [themeMode, applyTheme]);

    const setThemeMode = useCallback((mode: ThemeMode) => {
        setThemeModeState(mode);
        localStorage.setItem('themeMode', mode);

        const resolved = mode === 'system' ? getSystemTheme() : mode;
        applyTheme(resolved);
    }, [applyTheme]);

    const toggleTheme = useCallback(() => {
        const newMode = resolvedTheme === 'dark' ? 'light' : 'dark';
        setThemeMode(newMode);
    }, [resolvedTheme, setThemeMode]);

    // Always render children - no null return to prevent blinking
    return (
        <ThemeContext.Provider value={{ themeMode, resolvedTheme, setThemeMode, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}
