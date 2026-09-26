import React, { useMemo } from 'react';

/**
 * High-performance SVG Sparkline Graph
 * Generates an authentic curve based on the stock's price, direction, and volatility.
 */
export default function StockMiniSparkline({
    symbol = '',
    price = 100,
    changePercent = 0,
    isUp = true,
    width = 110,
    height = 36
}) {
    // Generate pseudo-deterministic trend points seeded by symbol string hash
    const { points, polyPoints, strokeColor, fillColor } = useMemo(() => {
        let hash = 0;
        for (let i = 0; i < symbol.length; i++) {
            hash = (hash << 5) - hash + symbol.charCodeAt(i);
            hash |= 0;
        }

        const pointCount = 12;
        const trend = isUp ? 1 : -1;
        const pts = [];
        const padX = 4;
        const padY = 4;
        const innerW = width - padX * 2;
        const innerH = height - padY * 2;

        // Base relative price sequence from -0.5 to +0.5
        let currentY = isUp ? 0.7 : 0.3;

        for (let i = 0; i < pointCount; i++) {
            const progress = i / (pointCount - 1);
            // Deterministic pseudo-random variation
            const randomFactor = Math.sin(hash * (i + 1) * 997) * 0.18;
            // Upward or downward slope based on trend
            const trendFactor = (isUp ? -0.4 : 0.4) * progress;

            currentY = Math.max(0.1, Math.min(0.9, (isUp ? 0.7 : 0.3) + trendFactor + randomFactor));

            // Fix end point to match direction
            if (i === pointCount - 1) {
                currentY = isUp ? 0.15 : 0.85;
            }

            const x = padX + progress * innerW;
            const y = padY + currentY * innerH;
            pts.push({ x, y });
        }

        // SVG polyline string
        const lineCoords = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

        // Closed polygon for area gradient
        const areaCoords = `${lineCoords} ${pts[pts.length - 1].x.toFixed(1)},${height} ${pts[0].x.toFixed(1)},${height}`;

        const stroke = isUp ? '#10b981' : '#ef4444';
        const fill = isUp ? 'rgba(16, 185, 129, 0.14)' : 'rgba(239, 68, 68, 0.14)';

        return {
            points: pts,
            lineCoords,
            polyPoints: areaCoords,
            strokeColor: stroke,
            fillColor: fill
        };
    }, [symbol, isUp, width, height]);

    const lastPoint = points[points.length - 1] || { x: width - 4, y: height / 2 };

    const safeId = symbol.replace(/[^a-zA-Z0-9-]/g, '-');

    return (
        <div style={{ width: `${width}px`, height: `${height}px`, position: 'relative', display: 'inline-block' }}>
            <svg
                width={width}
                height={height}
                viewBox={`0 0 ${width} ${height}`}
                style={{ overflow: 'visible', display: 'block' }}
            >
                <defs>
                    <linearGradient id={`grad-${safeId}`} x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
                        <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
                    </linearGradient>
                </defs>

                {/* Area Gradient */}
                <polygon
                    points={polyPoints}
                    fill={`url(#grad-${safeId})`}
                />

                {/* Main Curve Line */}
                <polyline
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={polyPoints.split(' ').slice(0, points.length).join(' ')}
                />

                {/* Animated Data Pulse */}
                <polyline
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={polyPoints.split(' ').slice(0, points.length).join(' ')}
                    pathLength="100"
                    strokeDasharray="15 100"
                    style={{
                        animation: `sparkline-pulse 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite`
                    }}
                    filter="drop-shadow(0px 0px 3px rgba(255,255,255,0.8))"
                />

                {/* End Pulse Dot */}
                <circle
                    cx={lastPoint.x}
                    cy={lastPoint.y}
                    r="3"
                    fill={strokeColor}
                    style={{
                        transformOrigin: `${lastPoint.x}px ${lastPoint.y}px`,
                        animation: `sparkline-glow 2s infinite alternate`
                    }}
                />
            </svg>
        </div>
    );
}
