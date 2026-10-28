import React from 'react';

interface PendingQuestionProps {
    text: string;
    color: string;
    icon: React.ElementType;
}

/** The user's question, shown as soon as it is sent while the agent is still working on the answer. */
export default function PendingQuestion({ text, color, icon: Icon }: PendingQuestionProps) {
    return (
        <div className="flex items-start gap-4 flex-row-reverse py-2 mb-2">
            <div className="flex-shrink-0 mt-0.5">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: color }}>
                    <Icon className="w-3.5 h-3.5" />
                </div>
            </div>
            <div className="flex-1 min-w-0 max-w-[85%] flex flex-col items-end">
                <div className="px-4 py-2.5 rounded-2xl bg-[#f4f4f4] dark:bg-[#2f2f2f] text-[#0d0d0d] dark:text-[#ececec]">
                    <p className="text-base whitespace-pre-wrap">{text}</p>
                </div>
            </div>
        </div>
    );
}
