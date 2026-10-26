'use client';

import { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';

interface EnhanceButtonProps {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
}

/** Rewrites the text in a question field into a clearer prompt when clicked. Hidden while the field is empty. */
export default function EnhanceButton({ value, onChange, disabled }: EnhanceButtonProps) {
    const [busy, setBusy] = useState(false);
    const [failed, setFailed] = useState(false);

    if (!value.trim()) return null;

    const handleClick = async () => {
        setBusy(true);
        setFailed(false);
        try {
            const { enhanced } = await api.enhancePrompt(value);
            onChange(enhanced);
        } catch (error) {
            console.error('Prompt enhancement failed:', error);
            setFailed(true);
        } finally {
            setBusy(false);
        }
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={busy || disabled}
            className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 hover:bg-[#e5e5e5] dark:hover:bg-[#424242] ${failed ? 'text-red-500' : 'text-[#666666] dark:text-[#b4b4b4] hover:text-[#00a859]'}`}
            title={failed ? 'Could not enhance. Click to retry' : 'Enhance prompt'}
            aria-label="Enhance prompt"
        >
            {busy ? <Loader2 className="w-5 h-5 animate-spin text-[#00a859]" /> : <Sparkles className="w-5 h-5" />}
        </button>
    );
}
