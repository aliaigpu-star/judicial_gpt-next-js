'use client';

import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { AccentColorProvider } from "@/context/AccentColorContext";

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider>
            <AccentColorProvider>
                <AuthProvider>
                    {children}
                </AuthProvider>
            </AccentColorProvider>
        </ThemeProvider>
    );
}

