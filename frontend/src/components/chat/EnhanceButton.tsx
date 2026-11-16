'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

interface EnhanceButtonProps {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
}

export default function EnhanceButton({ value, onChange, disabled }: EnhanceButtonProps) {
    const [busy, setBusy] = useState(false);
    const [failed, setFailed] = useState(false);

    const isEmpty = !value.trim();

    const handleClick = async () => {
        if (isEmpty) return;
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
            disabled={busy || disabled || isEmpty}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors border
                ${isEmpty
                    ? 'opacity-40 cursor-default border-[#d9d9d9] dark:border-[#424242] text-[#999999] dark:text-[#666666] bg-transparent'
                    : failed
                        ? 'border-red-300 text-red-500 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30'
                        : 'border-[#d9d9d9] dark:border-[#424242] text-[#555555] dark:text-[#aaaaaa] bg-white dark:bg-[#2f2f2f] hover:border-[#00a859] hover:text-[#00a859] hover:bg-[#00a859]/5'
                }`}
            title={failed ? 'Could not enhance. Click to retry' : isEmpty ? 'Type something to optimize your prompt' : 'Optimize prompt'}
            aria-label="Optimize prompt"
        >
            {busy
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <span className="text-[11px] leading-none">✦</span>
            }
            <span>{failed ? 'Retry enhance' : 'Optimize prompt'}</span>
        </button>
    );
}
