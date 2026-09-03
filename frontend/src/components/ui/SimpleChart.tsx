/**
 * Simple Chart Component
 * Lightweight chart component using SVG (no external dependencies)
 */

import React from 'react';

interface ChartDataPoint {
    label: string;
    value: number;
    color?: string;
}

interface SimpleChartProps {
    data: ChartDataPoint[];
    height?: number;
    type?: 'bar' | 'line';
    showGrid?: boolean;
}

export function SimpleChart({ data, height = 200, type = 'bar', showGrid = true }: SimpleChartProps) {
    if (data.length === 0) {
        return (
            <div className="h-full flex items-center justify-center text-gray-500">
                No data available
            </div>
        );
    }

    const maxValue = Math.max(...data.map(d => d.value), 1);
    const padding = 40;
    const chartWidth = 100;
    const chartHeight = height - padding * 2;
    const barWidth = chartWidth / data.length * 0.8;
    const spacing = chartWidth / data.length * 0.2;

    return (
        <div className="w-full" style={{ height: `${height}px` }}>
            <svg viewBox={`0 0 100 ${height}`} className="w-full h-full">
                {/* Grid lines */}
                {showGrid && (
                    <g>
                        {[0, 25, 50, 75, 100].map((y) => (
                            <line
                                key={y}
                                x1="0"
                                y1={padding + (chartHeight * (100 - y) / 100)}
                                x2="100"
                                y2={padding + (chartHeight * (100 - y) / 100)}
                                stroke="currentColor"
                                strokeWidth="0.5"
                                className="text-gray-800"
                                opacity="0.3"
                            />
                        ))}
                    </g>
                )}

                {/* Chart bars or line */}
                {type === 'bar' ? (
                    <g>
                        {data.map((point, index) => {
                            const barHeight = (point.value / maxValue) * chartHeight;
                            const x = (index * (chartWidth / data.length)) + spacing / 2;
                            const y = padding + chartHeight - barHeight;
                            const color = point.color || '#00a859';

                            return (
                                <g key={index}>
                                    <rect
                                        x={x}
                                        y={y}
                                        width={barWidth}
                                        height={barHeight}
                                        fill={color}
                                        opacity="0.8"
                                        rx="1"
                                    />
                                    {/* Value label on top */}
                                    {barHeight > 5 && (
                                        <text
                                            x={x + barWidth / 2}
                                            y={y - 2}
                                            textAnchor="middle"
                                            fontSize="2"
                                            fill="currentColor"
                                            className="text-gray-300"
                                        >
                                            {point.value}
                                        </text>
                                    )}
                                    {/* X-axis label */}
                                    <text
                                        x={x + barWidth / 2}
                                        y={height - padding / 2}
                                        textAnchor="middle"
                                        fontSize="2.5"
                                        fill="currentColor"
                                        className="text-gray-400"
                                    >
                                        {point.label.length > 6 ? point.label.substring(0, 6) : point.label}
                                    </text>
                                </g>
                            );
                        })}
                    </g>
                ) : (
                    <g>
                        <polyline
                            points={data.map((point, index) => {
                                const x = (index * (chartWidth / data.length)) + barWidth / 2;
                                const y = padding + chartHeight - (point.value / maxValue) * chartHeight;
                                return `${x},${y}`;
                            }).join(' ')}
                            fill="none"
                            stroke={data[0]?.color || '#00a859'}
                            strokeWidth="1.5"
                            opacity="0.8"
                        />
                        {data.map((point, index) => {
                            const x = (index * (chartWidth / data.length)) + barWidth / 2;
                            const y = padding + chartHeight - (point.value / maxValue) * chartHeight;
                            return (
                                <g key={index}>
                                    <circle
                                        cx={x}
                                        cy={y}
                                        r="1.5"
                                        fill={point.color || '#00a859'}
                                    />
                                    <text
                                        x={x}
                                        y={height - padding / 2}
                                        textAnchor="middle"
                                        fontSize="2.5"
                                        fill="currentColor"
                                        className="text-gray-400"
                                    >
                                        {point.label.length > 6 ? point.label.substring(0, 6) : point.label}
                                    </text>
                                </g>
                            );
                        })}
                    </g>
                )}
            </svg>
        </div>
    );
}
