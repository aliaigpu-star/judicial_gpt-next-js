/**
 * Skeleton Loading Component
 * Simple skeleton loader for loading states
 */

import React from 'react';

interface SkeletonProps {
    className?: string;
    width?: string;
    height?: string;
    rounded?: boolean;
}

export function Skeleton({ className = '', width, height, rounded = false }: SkeletonProps) {
    const style: React.CSSProperties = {};
    if (width) style.width = width;
    if (height) style.height = height;

    return (
        <div
            className={`bg-gray-800/50 animate-pulse ${rounded ? 'rounded-full' : 'rounded'} ${className}`}
            style={style}
        />
    );
}

export function SkeletonTable({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
    return (
        <div className="space-y-2">
            {/* Header */}
            <div className="flex gap-2">
                {Array.from({ length: columns }).map((_, i) => (
                    <Skeleton key={i} height="40px" className="flex-1" />
                ))}
            </div>
            {/* Rows */}
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="flex gap-2">
                    {Array.from({ length: columns }).map((_, j) => (
                        <Skeleton key={j} height="60px" className="flex-1" />
                    ))}
                </div>
            ))}
        </div>
    );
}

export function SkeletonCard() {
    return (
        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
            <Skeleton height="24px" width="60%" className="mb-4" />
            <Skeleton height="40px" width="100%" className="mb-2" />
            <Skeleton height="16px" width="80%" />
        </div>
    );
}
