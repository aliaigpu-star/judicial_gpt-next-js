'use client';

import { useState } from 'react';
import { Download, FileText, Loader2 } from 'lucide-react';
import { documentTitle, exportDocument, type DocumentFormat } from '@/lib/documentExport';

const LABELS: Record<DocumentFormat, { type: string; action: string }> = {
    pdf: { type: 'PDF document', action: 'Save as PDF' },
    docx: { type: 'Word document', action: 'Download .docx' },
};

/** Download card shown under a reply the user asked to receive as a document. */
export default function DocumentCard({ markdown, format }: { markdown: string; format: DocumentFormat }) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(false);

    const handleClick = async () => {
        setBusy(true);
        setError(false);
        try {
            await exportDocument(markdown, format);
        } catch (err) {
            console.error('Document export failed:', err);
            setError(true);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-[#e5e5e5] dark:border-[#444444] bg-[#f9f9f9] dark:bg-[#2f2f2f] px-4 py-3 max-w-md">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#00a859]/10 text-[#00a859]">
                <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[#0d0d0d] dark:text-[#ececec]">{documentTitle(markdown)}</p>
                <p className={`text-xs ${error ? 'text-red-500' : 'text-[#666666] dark:text-[#b4b4b4]'}`}>
                    {error ? 'Could not create the file. Try again.' : LABELS[format].type}
                </p>
            </div>
            <button
                type="button"
                onClick={handleClick}
                disabled={busy}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#0d0d0d] dark:bg-[#ececec] px-3 py-2 text-xs font-medium text-white dark:text-[#0d0d0d] transition-opacity hover:opacity-80 disabled:opacity-50"
            >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                {LABELS[format].action}
            </button>
        </div>
    );
}
