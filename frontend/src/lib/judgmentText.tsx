import React from 'react';

// Judgment Writer (Civil/Criminal) responses are plain, whitespace-aligned
// legal documents, not markdown — running them through ReactMarkdown collapses
// the alignment spacing and turns deeply-indented lines (e.g. "VERSUS") into
// code blocks. Detect that format by its distinctive markers and render it
// as preserved plain text instead, while leaving genuine markdown (from the
// general chat / Law Agent / other flows sharing this component) untouched.
export const isJudgmentDocument = (text: string) => text.includes('IN THE COURT OF') || text.includes('─────');

// Strip stray lone-underscore artifact lines the model occasionally emits
// around section separators, without touching the real "─────" dividers.
const cleanJudgmentText = (text: string) =>
    text.split('\n').filter(line => !/^\s*_+\s*$/.test(line)).join('\n');

// Judgment documents are rendered as plain text (see isJudgmentDocument
// above) to preserve literal spacing/alignment, but the model still
// sometimes emits inline markdown (**bold**, *italic*) and "#"-style
// headings within that plain-text layout. Parse just those inline/heading
// bits by hand rather than handing the whole thing to ReactMarkdown, which
// would collapse the alignment spacing again.
const INLINE_MD_RE = /(\*\*\*.+?\*\*\*|\*\*.+?\*\*|\*.+?\*)/g;

const renderInlineMarkdown = (text: string, keyPrefix: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let pos = 0;
    let idx = 0;
    let match: RegExpExecArray | null;
    const re = new RegExp(INLINE_MD_RE);
    while ((match = re.exec(text)) !== null) {
        if (match.index > pos) parts.push(text.slice(pos, match.index));
        const token = match[0];
        if (token.startsWith('***') && token.endsWith('***')) {
            parts.push(<strong key={`${keyPrefix}-${idx}`}><em>{token.slice(3, -3)}</em></strong>);
        } else if (token.startsWith('**') && token.endsWith('**')) {
            parts.push(<strong key={`${keyPrefix}-${idx}`}>{token.slice(2, -2)}</strong>);
        } else {
            parts.push(<em key={`${keyPrefix}-${idx}`}>{token.slice(1, -1)}</em>);
        }
        idx++;
        pos = re.lastIndex;
    }
    if (pos < text.length) parts.push(text.slice(pos));
    return parts;
};

// Render the long "─────" separator lines as a real <hr> instead of raw
// repeated dash characters — as plain text they have no spaces to wrap at,
// so `.message-content`'s word-wrap:break-word forces a mid-run break that
// strands 1-2 dashes on their own line, looking like a stray underscore.
export const renderJudgmentText = (text: string) =>
    cleanJudgmentText(text).split('\n').map((line, i) => {
        const trimmed = line.trim();
        if (/^[─\-]{5,}$/.test(trimmed)) {
            return <hr key={i} className="my-2 border-t border-current opacity-20" />;
        }
        const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
        if (headingMatch) {
            const level = headingMatch[1].length;
            return (
                <div key={i} className={`whitespace-pre-wrap font-semibold ${level <= 2 ? 'text-lg mt-3' : 'text-base mt-2'}`}>
                    {renderInlineMarkdown(headingMatch[2], `h${i}`)}
                </div>
            );
        }
        return <div key={i} className="whitespace-pre-wrap">{renderInlineMarkdown(line, `l${i}`)}</div>;
    });
