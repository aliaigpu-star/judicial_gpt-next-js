'use client';

import React, { useEffect, useState, useRef } from 'react';

interface TypingAnimationProps {
    content: string;
    children: (displayedContent: string) => React.ReactNode;
}

/**
 * Typing Animation Component (Ported from old JudicialGPT project)
 * Animates text display character by character for AI responses
 * Uses 3ms delay per character matching the original implementation
 */
const TypingAnimation: React.FC<TypingAnimationProps> = ({ content, children }) => {
    const [displayedContent, setDisplayedContent] = useState('');
    const [currentIndex, setCurrentIndex] = useState(0);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // Clear any existing timeout when content changes
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        if (currentIndex < content.length) {
            timeoutRef.current = setTimeout(() => {
                const newContent = displayedContent + content[currentIndex];
                setDisplayedContent(newContent);
                setCurrentIndex((prev) => prev + 1);
            }, 3); // 3ms per character matching old project

            return () => {
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                }
            };
        } else if (currentIndex === content.length && displayedContent !== content) {
            // Ensure final content matches
            setDisplayedContent(content);
        }
    }, [currentIndex, content, displayedContent]);

    // Reset when content changes completely (new message)
    useEffect(() => {
        if (content && displayedContent && !content.startsWith(displayedContent.slice(0, Math.min(20, displayedContent.length)))) {
            // Content changed completely, reset
            setDisplayedContent('');
            setCurrentIndex(0);
        }
    }, [content]);

    return <>{children(displayedContent)}</>;
};

export default TypingAnimation;
