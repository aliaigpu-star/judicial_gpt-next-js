'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type AccentColor = 'default' | 'blue' | 'green' | 'yellow' | 'pink' | 'orange';

interface AccentColorContextType {
    accentColor: AccentColor;
    setAccentColor: (color: AccentColor) => void;
    getAccentClasses: () => string;
    getAccentBgClass: () => string;
    getAccentHoverClass: () => string;
}

const AccentColorContext = createContext<AccentColorContextType | undefined>(undefined);

// Default is Emerald/Green
const accentColorMap: Record<AccentColor, { bg: string; hover: string; dot: string }> = {
    default: {
        bg: 'bg-[#00a859]',
        hover: 'hover:bg-[#00a859]',
        dot: 'bg-[#00a859]'
    },
    blue: {
        bg: 'bg-blue-600',
        hover: 'hover:bg-blue-700',
        dot: 'bg-blue-500'
    },
    green: {
        bg: 'bg-green-600',
        hover: 'hover:bg-green-700',
        dot: 'bg-green-500'
    },
    yellow: {
        bg: 'bg-yellow-500',
        hover: 'hover:bg-yellow-600',
        dot: 'bg-yellow-500'
    },
    pink: {
        bg: 'bg-pink-500',
        hover: 'hover:bg-pink-600',
        dot: 'bg-pink-500'
    },
    orange: {
        bg: 'bg-orange-500',
        hover: 'hover:bg-orange-600',
        dot: 'bg-orange-500'
    }
};

export function AccentColorProvider({ children }: { children: ReactNode }) {
    const [accentColor, setAccentColorState] = useState<AccentColor>('default');

    useEffect(() => {
        const stored = localStorage.getItem('accentColor') as AccentColor | null;
        if (stored && accentColorMap[stored]) {
            setAccentColorState(stored);
        }
    }, []);

    const setAccentColor = (color: AccentColor) => {
        setAccentColorState(color);
        localStorage.setItem('accentColor', color);
    };

    const getAccentClasses = () => {
        const config = accentColorMap[accentColor];
        return `${config.bg} ${config.hover}`;
    };

    const getAccentBgClass = () => accentColorMap[accentColor].bg;
    const getAccentHoverClass = () => accentColorMap[accentColor].hover;

    return (
        <AccentColorContext.Provider value={{
            accentColor,
            setAccentColor,
            getAccentClasses,
            getAccentBgClass,
            getAccentHoverClass
        }}>
            {children}
        </AccentColorContext.Provider>
    );
}

export function useAccentColor() {
    const context = useContext(AccentColorContext);
    if (!context) {
        throw new Error('useAccentColor must be used within an AccentColorProvider');
    }
    return context;
}

export { accentColorMap };
