/**
 * Creates a buffered stream handler that releases text character-by-character
 * at a controlled speed, giving a smooth typing animation effect.
 * 
 * The server sends chunks in bursts, but this buffer releases them
 * at a steady pace so the user sees a natural typing effect.
 */
export function createStreamBuffer(
    onUpdate: (content: string) => void,
    charDelay: number = 12 // milliseconds per character (adjust for speed)
) {
    let targetContent = '';
    let displayedContent = '';
    let timerRef: NodeJS.Timeout | null = null;
    let resolveComplete: (() => void) | null = null;

    // Helper to immediately flush the buffer when the tab is hidden
    const handleVisibilityChange = () => {
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
            flushBuffer();
        }
    };

    // Register visibility change listener
    if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    function flushBuffer() {
        displayedContent = targetContent;
        onUpdate(displayedContent);
        if (timerRef) {
            clearTimeout(timerRef);
            timerRef = null;
        }
        if (resolveComplete) {
            resolveComplete();
            resolveComplete = null;
        }
    }

    function processQueue() {
        // If the tab is hidden, bypass queue and flush immediately
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
            flushBuffer();
            return;
        }

        if (displayedContent.length < targetContent.length) {
            // Release characters in small batches for smoother rendering
            const remaining = targetContent.length - displayedContent.length;
            const batchSize = Math.max(1, Math.min(3, Math.ceil(remaining / 20)));
            
            displayedContent = targetContent.slice(0, displayedContent.length + batchSize);
            onUpdate(displayedContent);
            
            timerRef = setTimeout(processQueue, charDelay);
        } else if (resolveComplete) {
            // All characters displayed, resolve the completion promise
            resolveComplete();
            resolveComplete = null;
        }
    }

    return {
        /** Call this when a new chunk arrives from the server */
        push(content: string) {
            targetContent = content;
            
            // If the tab is hidden, bypass typing queue and update instantly
            if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
                flushBuffer();
                return;
            }

            // Start the timer if not already running
            if (!timerRef) {
                processQueue();
            }
        },

        /** Returns a promise that resolves when all buffered text is displayed */
        waitForComplete(): Promise<void> {
            return new Promise((resolve) => {
                if (displayedContent.length >= targetContent.length) {
                    resolve();
                } else {
                    resolveComplete = resolve;
                }
            });
        },

        /** Get the full content (for saving to database) */
        getFullContent(): string {
            return targetContent;
        },

        /** Clean up timer and event listeners */
        destroy() {
            if (timerRef) {
                clearTimeout(timerRef);
                timerRef = null;
            }
            if (typeof document !== 'undefined') {
                document.removeEventListener('visibilitychange', handleVisibilityChange);
            }
        }
    };
}
