'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createStreamBuffer } from '@/lib/streamBuffer';

interface TypedRevealProps {
    /** The complete text to show. */
    text: string;
    /** When true the text is typed out; otherwise it is shown at once. */
    animate: boolean;
    /** Called once the whole text is on screen. */
    onDone?: () => void;
    /** Renders the part of the text revealed so far. */
    children: (shown: string) => React.ReactNode;
}

/**
 * Types out an already-complete answer with the same pacing as the general
 * chat's streaming (it reuses the chat's stream buffer), for agents that
 * return their whole answer at once.
 */
export default function TypedReveal({ text, animate, onDone, children }: TypedRevealProps) {
    const [shown, setShown] = useState(animate ? '' : text);
    const onDoneRef = useRef(onDone);
    onDoneRef.current = onDone;

    useEffect(() => {
        if (!animate) {
            setShown(text);
            return;
        }
        let cancelled = false;
        const buffer = createStreamBuffer(content => !cancelled && setShown(content), 15);
        buffer.push(text);
        buffer.waitForComplete().then(() => {
            if (!cancelled) onDoneRef.current?.();
        });
        return () => {
            cancelled = true;
            buffer.destroy();
        };
    }, [text, animate]);

    return <>{children(animate ? shown : text)}</>;
}
