'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

interface TypewriterEffectProps {
    content: string;
    isTyping: boolean;
    speed?: number; // milliseconds per character
    children: (displayedContent: string) => React.ReactNode;
}

/**
 * TypewriterEffect component
 * Progressively reveals text character by character for a typewriter animation effect.
 * Uses a render prop pattern to allow flexible rendering of the animated content.
 */
export default function TypewriterEffect({
    content,
    isTyping,
    speed = 8,
    children
}: TypewriterEffectProps) {
    const [displayedLength, setDisplayedLength] = useState(0);
    const targetLengthRef = useRef(0);
    const animationFrameRef = useRef<number | null>(null);
    const lastUpdateRef = useRef(0);

    // Update target length when content changes
    useEffect(() => {
        targetLengthRef.current = content.length;
    }, [content]);

    // Animation loop using requestAnimationFrame for smooth animation
    const animate = useCallback((timestamp: number) => {
        if (!isTyping) {
            // If not typing anymore, show full content
            setDisplayedLength(targetLengthRef.current);
            return;
        }

        const elapsed = timestamp - lastUpdateRef.current;

        if (elapsed >= speed) {
            lastUpdateRef.current = timestamp;

            setDisplayedLength(prev => {
                const target = targetLengthRef.current;
                if (prev < target) {
                    // Advance by 1-3 characters depending on how far behind we are
                    const diff = target - prev;
                    const step = diff > 50 ? 3 : diff > 20 ? 2 : 1;
                    return Math.min(prev + step, target);
                }
                return prev;
            });
        }

        // Continue animation if still typing or behind
        animationFrameRef.current = requestAnimationFrame(animate);
    }, [isTyping, speed]);

    // Start/stop animation based on isTyping
    useEffect(() => {
        if (isTyping) {
            lastUpdateRef.current = performance.now();
            animationFrameRef.current = requestAnimationFrame(animate);
        } else {
            // Stop animation and show full content
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            setDisplayedLength(content.length);
        }

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [isTyping, animate, content.length]);

    // Reset when content is cleared (new message)
    useEffect(() => {
        if (content === '') {
            setDisplayedLength(0);
        }
    }, [content]);

    // Get the displayed content
    const displayedContent = isTyping
        ? content.slice(0, displayedLength)
        : content;

    return <>{children(displayedContent)}</>;
}
