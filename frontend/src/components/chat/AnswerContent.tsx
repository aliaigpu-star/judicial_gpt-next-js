import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { isJudgmentDocument, renderJudgmentText } from '@/lib/judgmentText';

interface AnswerContentProps {
    content: string;
    /** Adds the "●" cursor shown while the answer is still being written. */
    streaming?: boolean;
}

/**
 * An assistant answer, formatted exactly as the main chat shows it. The chat
 * and every agent use this, so an answer looks the same while it is typed and
 * after the page is reloaded.
 */
export default function AnswerContent({ content, streaming }: AnswerContentProps) {
    const text = content.replace(/^Answer:\s*/i, '').replace(/^Answer\s*/i, '') + (streaming ? ' ●' : '');

    if (isJudgmentDocument(content)) {
        return (
            <div className="message-content font-serif text-[#0d0d0d] dark:text-[#ececec]">
                {renderJudgmentText(text)}
            </div>
        );
    }

    return (
        <div className="message-content text-[#0d0d0d] dark:text-[#ececec]">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={{
                    table: ({ children, ...props }) => (
                        <div style={{ overflowX: 'auto', margin: '1rem 0' }}>
                            <table {...props}>{children}</table>
                        </div>
                    ),
                }}
            >
                {text}
            </ReactMarkdown>
        </div>
    );
}
