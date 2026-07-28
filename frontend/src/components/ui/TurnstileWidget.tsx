'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

// Cloudflare Turnstile Site Key
// For development/localhost, use Cloudflare's test keys:
// - Always passes: 1x00000000000000000000AA
// - Always fails: 2x00000000000000000000AB  
// - Forces interactive: 3x00000000000000000000FF
const isDevelopment = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.includes('192.168.') ||
    window.location.hostname.includes('10.')
);

// Production site key from environment or default test key
const PRODUCTION_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '0x4AAAAAACFiq70vyt7aj5oV';

// Use test key for development, production key otherwise
const TURNSTILE_SITE_KEY = isDevelopment
    ? '1x00000000000000000000AA'  // Cloudflare's always-pass test key for development
    : PRODUCTION_SITE_KEY;        // Your production site key from env or default

// Extend Window interface for turnstile
declare global {
    interface Window {
        turnstile?: {
            render: (container: HTMLElement, options: any) => string;
            remove: (widgetId: string) => void;
            reset: (widgetId: string) => void;
        };
    }
}

// Load Turnstile script dynamically if not already loaded
const loadTurnstileScript = (): Promise<typeof window.turnstile> => {
    return new Promise((resolve, reject) => {
        // Check if already loaded
        if (window.turnstile) {
            resolve(window.turnstile);
            return;
        }

        // Check if script tag already exists
        const existingScript = document.querySelector('script[src*="challenges.cloudflare.com/turnstile"]');
        if (existingScript) {
            // Script exists but turnstile not ready, wait for it
            let attempts = 0;
            const checkReady = setInterval(() => {
                attempts++;
                if (window.turnstile) {
                    clearInterval(checkReady);
                    resolve(window.turnstile);
                } else if (attempts > 100) {
                    clearInterval(checkReady);
                    reject(new Error('Turnstile script loaded but API not available'));
                }
            }, 100);
            return;
        }

        // Create and load script
        const script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
        script.async = true;
        script.defer = true;

        script.onload = () => {
            // Wait for turnstile object to be available
            let attempts = 0;
            const checkReady = setInterval(() => {
                attempts++;
                if (window.turnstile) {
                    clearInterval(checkReady);
                    resolve(window.turnstile);
                } else if (attempts > 50) {
                    clearInterval(checkReady);
                    reject(new Error('Turnstile API not available after script load'));
                }
            }, 100);
        };

        script.onerror = () => {
            reject(new Error('Failed to load Turnstile script. Check your network connection.'));
        };

        document.head.appendChild(script);
    });
};

interface TurnstileWidgetProps {
    onVerify: (token: string) => void;
    onExpire?: () => void;
    onError?: (error: string) => void;
    theme?: 'light' | 'dark' | 'auto';
    size?: 'normal' | 'compact';
}

/**
 * Cloudflare Turnstile CAPTCHA Component
 * This component renders the Turnstile widget and manages the captcha token.
 */
export default function TurnstileWidget({
    onVerify,
    onExpire,
    onError,
    theme = 'light',
    size = 'normal'
}: TurnstileWidgetProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Store callbacks in refs to avoid re-renders
    const onVerifyRef = useRef(onVerify);
    const onExpireRef = useRef(onExpire);
    const onErrorRef = useRef(onError);

    // Update refs when props change
    useEffect(() => {
        onVerifyRef.current = onVerify;
        onExpireRef.current = onExpire;
        onErrorRef.current = onError;
    }, [onVerify, onExpire, onError]);

    useEffect(() => {
        let isMounted = true;

        const initTurnstile = async () => {
            if (!isMounted || !containerRef.current) return;

            try {
                setIsLoading(true);
                setError(null);

                // Load the script
                await loadTurnstileScript();

                if (!isMounted || !containerRef.current) return;

                // Remove existing widget if any
                if (widgetIdRef.current !== null && window.turnstile) {
                    try {
                        window.turnstile.remove(widgetIdRef.current);
                    } catch (e) {
                        // Ignore
                    }
                    widgetIdRef.current = null;
                }

                // Clear container
                if (containerRef.current) {
                    containerRef.current.innerHTML = '';
                }

                // Render the widget
                if (window.turnstile) {
                    widgetIdRef.current = window.turnstile.render(containerRef.current, {
                        sitekey: TURNSTILE_SITE_KEY,
                        theme: theme,
                        size: size,
                        callback: (token: string) => {
                            if (onVerifyRef.current) {
                                onVerifyRef.current(token);
                            }
                        },
                        'expired-callback': () => {
                            if (onExpireRef.current) {
                                onExpireRef.current();
                            }
                        },
                        'error-callback': (errorCode: string) => {
                            let errorMessage = 'CAPTCHA error. Please try again.';
                            if (errorCode === '110200') {
                                errorMessage = 'Invalid site key. Contact support.';
                            } else if (errorCode === '110500') {
                                errorMessage = 'Network error. Please check your connection.';
                            } else if (errorCode === '110600') {
                                errorMessage = 'Challenge failed. Please try again.';
                            }
                            setError(errorMessage);
                            if (onErrorRef.current) {
                                onErrorRef.current(errorCode);
                            }
                        },
                    });
                }

                setIsLoading(false);
                setError(null);

            } catch (err: any) {
                if (isMounted) {
                    setError(err.message || 'CAPTCHA failed to load. Please refresh the page.');
                    setIsLoading(false);
                }
            }
        };

        initTurnstile();

        // Cleanup function
        return () => {
            isMounted = false;
            if (widgetIdRef.current !== null && window.turnstile) {
                try {
                    window.turnstile.remove(widgetIdRef.current);
                } catch (e) {
                    // Ignore
                }
                widgetIdRef.current = null;
            }
        };
    }, [theme, size]);

    // Retry handler
    const handleRetry = useCallback(() => {
        setError(null);
        setIsLoading(true);
        // Force re-render by updating container
        if (containerRef.current) {
            containerRef.current.innerHTML = '';
        }
        // Re-initialize
        loadTurnstileScript()
            .then(() => {
                if (containerRef.current && window.turnstile) {
                    widgetIdRef.current = window.turnstile.render(containerRef.current, {
                        sitekey: TURNSTILE_SITE_KEY,
                        theme: theme,
                        size: size,
                        callback: (token: string) => {
                            if (onVerifyRef.current) onVerifyRef.current(token);
                        },
                        'expired-callback': () => {
                            if (onExpireRef.current) onExpireRef.current();
                        },
                        'error-callback': (err: string) => {
                            setError('CAPTCHA error. Please try again.');
                            if (onErrorRef.current) onErrorRef.current(err);
                        },
                    });
                    setIsLoading(false);
                }
            })
            .catch((err) => {
                setError(err.message);
                setIsLoading(false);
            });
    }, [theme, size]);

    return (
        <div className="flex flex-col items-center my-3">
            {isLoading && (
                <div className="flex items-center justify-center py-3 text-gray-500 text-sm">
                    <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading security check...
                </div>
            )}
            {error && (
                <div className="flex flex-col items-center gap-2 py-2">
                    <span className="text-red-500 text-sm">{error}</span>
                    <button
                        type="button"
                        onClick={handleRetry}
                        className="text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                        Click to retry
                    </button>
                </div>
            )}
            <div
                ref={containerRef}
                className="flex justify-center"
                style={{ minHeight: isLoading ? '0' : '65px' }}
            />
        </div>
    );
}

// Export the site key for use elsewhere if needed
export { TURNSTILE_SITE_KEY };
