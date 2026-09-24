import React, { useState, useEffect, useMemo, useRef } from 'react';

/**
 * Interactive Live Stock Chart Modal with Real-time Tick Updates,
 * Multi-timeframe Selection (1D, 1W, 1M, 1Y, 5Y, ALL),
 * Area/Line Graph and Candlestick modes, Crosshair Tooltip, Volume Bars, and Market Depth.
 */
export default function LiveStockChartModal({ stock, onClose, onDownloadBalanceSheet }) {
    if (!stock) return null;

    const [timeframe, setTimeframe] = useState('1D'); // '1D', '1W', '1M', '1Y', '5Y', 'ALL'
    const [chartType, setChartType] = useState('area'); // 'area' or 'candles'
    const [livePrice, setLivePrice] = useState(stock.price);
    const [priceTickFlash, setPriceTickFlash] = useState(null); // 'up' or 'down'
    const [hoverIndex, setHoverIndex] = useState(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const graphSvgRef = useRef(null);

    // Live micro-tick simulation: every 2.2s, small realistic market fluctuation
    useEffect(() => {
        setLivePrice(stock.price);
        const interval = setInterval(() => {
            const deltaPercent = (Math.random() - 0.48) * 0.18; // slight upward or downward drift
            const delta = (stock.price * deltaPercent) / 100;
            const updated = Math.max(stock.price * 0.8, +(stock.price + delta).toFixed(2));
            setPriceTickFlash(delta >= 0 ? 'up' : 'down');
            setLivePrice(updated);

            setTimeout(() => setPriceTickFlash(null), 600);
        }, 2200);

        return () => clearInterval(interval);
    }, [stock]);

    // Timeframe dataset generator
    const chartData = useMemo(() => {
        let count = 40;
        let volatility = 0.015;
        let baseTrend = stock.isUp ? 0.02 : -0.015;
        let labelFormat = 'time';

        if (timeframe === '1D') {
            count = 42; // 09:15 to 15:30 (Indian trading hours)
            volatility = 0.012;
            baseTrend = stock.changePercent / 100;
            labelFormat = 'time';
        } else if (timeframe === '1W') {
            count = 35;
            volatility = 0.025;
            baseTrend = stock.isUp ? 0.03 : -0.02;
            labelFormat = 'weekday';
        } else if (timeframe === '1M') {
            count = 30;
            volatility = 0.045;
            baseTrend = stock.isUp ? 0.06 : -0.04;
            labelFormat = 'day';
        } else if (timeframe === '1Y') {
            count = 52;
            volatility = 0.08;
            baseTrend = stock.isUp ? 0.18 : -0.10;
            labelFormat = 'month';
        } else if (timeframe === '5Y') {
            count = 60;
            volatility = 0.15;
            baseTrend = 0.65;
            labelFormat = 'year';
        } else {
            // ALL
            count = 70;
            volatility = 0.22;
            baseTrend = 1.40;
            labelFormat = 'year';
        }

        // Generate synthetic historical candles & curve seeded by stock symbol
        let hash = 0;
        for (let i = 0; i < stock.symbol.length; i++) {
            hash = (hash << 5) - hash + stock.symbol.charCodeAt(i);
            hash |= 0;
        }

        const startPrice = stock.price / (1 + baseTrend);
        let curr = startPrice;
        const dataPoints = [];

        for (let i = 0; i < count; i++) {
            const progress = i / (count - 1);
            const trendFactor = (stock.price - startPrice) * progress;
            const noise = Math.sin((i + hash) * 1.3) * (stock.price * volatility * 0.4);
            const noise2 = Math.cos((i * 2 + hash) * 0.8) * (stock.price * volatility * 0.3);
            
            curr = Math.max(stock.price * 0.4, startPrice + trendFactor + noise + noise2);
            if (i === count - 1) curr = livePrice; // anchor to current live price

            const open = curr * (1 + (Math.sin(i * 3 + hash) * 0.004));
            const close = curr;
            const high = Math.max(open, close) * (1 + Math.abs(Math.sin(i * 5)) * 0.006);
            const low = Math.min(open, close) * (1 - Math.abs(Math.cos(i * 7)) * 0.006);
            const volume = Math.floor(15000 + Math.abs(Math.sin(i * 4 + hash)) * 140000);

            let label = '';
            if (labelFormat === 'time') {
                const totalMinutes = 9 * 60 + 15 + Math.floor(progress * 375); // 9:15 to 15:30
                const hh = Math.floor(totalMinutes / 60);
                const mm = totalMinutes % 60;
                label = `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
            } else if (labelFormat === 'weekday') {
                const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
                label = days[i % days.length];
            } else if (labelFormat === 'day') {
                label = `Day ${i + 1}`;
            } else if (labelFormat === 'month') {
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                label = months[i % 12];
            } else {
                label = `'${20 + Math.floor(i / 12)}`;
            }

            dataPoints.push({
                index: i,
                label,
                open: +open.toFixed(2),
                high: +high.toFixed(2),
                low: +low.toFixed(2),
                close: +close.toFixed(2),
                price: +close.toFixed(2),
                volume,
                isBullish: close >= open
            });
        }

        const prices = dataPoints.map(d => d.close);
        const minPrice = Math.min(...dataPoints.map(d => d.low));
        const maxPrice = Math.max(...dataPoints.map(d => d.high));
        const maxVol = Math.max(...dataPoints.map(d => d.volume));
        const firstPrice = dataPoints[0].open;
        const lastPrice = dataPoints[dataPoints.length - 1].close;
        const totalReturn = lastPrice - firstPrice;
        const returnPercent = (totalReturn / firstPrice) * 100;

        return {
            points: dataPoints,
            minPrice,
            maxPrice,
            maxVol,
            firstPrice,
            lastPrice,
            totalReturn,
            returnPercent,
            isPeriodUp: returnPercent >= 0
        };
    }, [stock, timeframe, livePrice]);

    // Dimensions
    const svgWidth = 720;
    const svgHeight = 280;
    const padding = { top: 20, right: 20, bottom: 40, left: 10 };
    const chartW = svgWidth - padding.left - padding.right;
    const chartH = svgHeight - padding.top - padding.bottom;

    // SVG coordinates computation
    const priceRange = (chartData.maxPrice - chartData.minPrice) || 1;
    const getY = (val) => padding.top + chartH - ((val - chartData.minPrice) / priceRange) * chartH;
    const getX = (idx) => padding.left + (idx / (chartData.points.length - 1)) * chartW;

    // Build area polyline
    const linePoints = chartData.points.map((p, i) => `${getX(i).toFixed(1)},${getY(p.close).toFixed(1)}`).join(' ');
    const areaPoints = `${linePoints} ${padding.left + chartW},${padding.top + chartH} ${padding.left},${padding.top + chartH}`;

    // Handle mouse move for interactive crosshair
    const handleMouseMove = (e) => {
        if (!graphSvgRef.current) return;
        const rect = graphSvgRef.current.getBoundingClientRect();
        const clientX = e.clientX - rect.left;
        const clientY = e.clientY - rect.top;

        // Ratio in chart area
        const ratio = (clientX - padding.left) / chartW;
        const clampedRatio = Math.max(0, Math.min(1, ratio));
        const index = Math.round(clampedRatio * (chartData.points.length - 1));

        setHoverIndex(index);
        setMousePos({ x: clientX, y: clientY });
    };

    const handleMouseLeave = () => {
        setHoverIndex(null);
    };

    const activePoint = hoverIndex !== null ? chartData.points[hoverIndex] : chartData.points[chartData.points.length - 1];
    const strokeColor = chartData.isPeriodUp ? '#10b981' : '#ef4444';

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
            <div
                className="modal-box"
                onClick={e => e.stopPropagation()}
                style={{
                    maxWidth: '820px',
                    width: '94%',
                    background: 'var(--card-bg, #0d1512)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '16px',
                    padding: '24px',
                    maxHeight: '92vh',
                    overflowY: 'auto',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.7)'
                }}
            >
                {/* Header: Company, Symbol, Live Status, Close */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '12px',
                            background: stock.logoBg || '#2563eb',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '800',
                            fontSize: '15px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                        }}>
                            {stock.symbol.slice(0, 3)}
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)' }}>
                                    {stock.name}
                                </h2>
                                <span style={{
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    padding: '2px 8px',
                                    borderRadius: '5px',
                                    background: 'rgba(255,255,255,0.08)',
                                    color: 'var(--text-muted)'
                                }}>
                                    {stock.symbol}
                                </span>
                                {stock.isHalal && (
                                    <span style={{
                                        fontSize: '11px',
                                        padding: '2px 8px',
                                        borderRadius: '5px',
                                        background: 'rgba(16, 185, 129, 0.15)',
                                        color: '#10b981',
                                        fontWeight: '700'
                                    }}>
                                        🕌 Halal
                                    </span>
                                )}
                            </div>
                            <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                NSE: <strong>{stock.symbol}</strong> · {stock.sector} · {stock.capCategory}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {/* Live Market Badge */}
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            background: 'rgba(16, 185, 129, 0.12)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            fontSize: '12px',
                            fontWeight: '700',
                            color: '#10b981'
                        }}>
                            <span style={{
                                width: '7px',
                                height: '7px',
                                borderRadius: '50%',
                                background: '#10b981',
                                boxShadow: '0 0 8px #10b981',
                                animation: 'pulse 1.5s infinite'
                            }} />
                            LIVE MARKET
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                background: 'rgba(255,255,255,0.06)',
                                border: '1px solid var(--border)',
                                color: 'var(--text-primary)',
                                width: '32px',
                                height: '32px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '15px'
                            }}
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Price Display and Selected Point Return */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-end',
                    flexWrap: 'wrap',
                    gap: '12px',
                    padding: '14px 18px',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.06)',
                    marginBottom: '16px'
                }}>
                    <div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>
                            CURRENT MARKET PRICE
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '2px' }}>
                            <span style={{
                                fontSize: '28px',
                                fontWeight: '900',
                                color: priceTickFlash === 'up' ? '#10b981' : (priceTickFlash === 'down' ? '#ef4444' : 'var(--text-primary)'),
                                transition: 'color 0.3s ease'
                            }}>
                                ₹{(activePoint ? activePoint.price : livePrice).toFixed(2)}
                            </span>
                            <span style={{
                                fontSize: '14px',
                                fontWeight: '700',
                                color: chartData.isPeriodUp ? '#10b981' : '#ef4444'
                            }}>
                                {chartData.isPeriodUp ? '+' : ''}₹{chartData.totalReturn.toFixed(2)} ({chartData.isPeriodUp ? '+' : ''}{chartData.returnPercent.toFixed(2)}%)
                                <span style={{ marginLeft: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>{timeframe}</span>
                            </span>
                        </div>
                    </div>

                    {/* Chart Controls: Timeframes & Type */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {/* Timeframe Buttons */}
                        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '3px' }}>
                            {['1D', '1W', '1M', '1Y', '5Y', 'ALL'].map(tf => (
                                <button
                                    key={tf}
                                    type="button"
                                    onClick={() => setTimeframe(tf)}
                                    style={{
                                        background: timeframe === tf ? 'var(--accent, #10b981)' : 'transparent',
                                        color: timeframe === tf ? '#000' : 'var(--text-muted)',
                                        border: 'none',
                                        padding: '5px 11px',
                                        fontSize: '12px',
                                        fontWeight: '700',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    {tf}
                                </button>
                            ))}
                        </div>

                        {/* Chart Type Toggle */}
                        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '3px' }}>
                            <button
                                type="button"
                                onClick={() => setChartType('area')}
                                style={{
                                    background: chartType === 'area' ? 'rgba(255,255,255,0.14)' : 'transparent',
                                    color: chartType === 'area' ? '#fff' : 'var(--text-muted)',
                                    border: 'none',
                                    padding: '5px 9px',
                                    fontSize: '12px',
                                    borderRadius: '6px',
                                    cursor: 'pointer'
                                }}
                                title="Area Graph"
                            >
                                📈 Area
                            </button>
                            <button
                                type="button"
                                onClick={() => setChartType('candles')}
                                style={{
                                    background: chartType === 'candles' ? 'rgba(255,255,255,0.14)' : 'transparent',
                                    color: chartType === 'candles' ? '#fff' : 'var(--text-muted)',
                                    border: 'none',
                                    padding: '5px 9px',
                                    fontSize: '12px',
                                    borderRadius: '6px',
                                    cursor: 'pointer'
                                }}
                                title="Candlestick Chart"
                            >
                                🕯️ Candles
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Interactive Live SVG Chart Viewport */}
                <div style={{ position: 'relative', width: '100%', userSelect: 'none' }}>
                    <svg
                        ref={graphSvgRef}
                        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                        style={{ width: '100%', height: 'auto', display: 'block', cursor: 'crosshair' }}
                        onMouseMove={handleMouseMove}
                        onMouseLeave={handleMouseLeave}
                    >
                        <defs>
                            <linearGradient id="stockAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor={strokeColor} stopOpacity="0.32" />
                                <stop offset="60%" stopColor={strokeColor} stopOpacity="0.08" />
                                <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
                            </linearGradient>
                        </defs>

                        {/* Grid lines */}
                        {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                            const y = padding.top + chartH * pct;
                            const priceVal = chartData.maxPrice - pct * (chartData.maxPrice - chartData.minPrice);
                            return (
                                <g key={idx}>
                                    <line
                                        x1={padding.left}
                                        y1={y}
                                        x2={padding.left + chartW}
                                        y2={y}
                                        stroke="rgba(255,255,255,0.06)"
                                        strokeDasharray="3 3"
                                    />
                                    <text
                                        x={padding.left + chartW - 4}
                                        y={y - 4}
                                        fill="var(--text-muted)"
                                        fontSize="9.5"
                                        textAnchor="end"
                                    >
                                        ₹{priceVal.toFixed(1)}
                                    </text>
                                </g>
                            );
                        })}

                        {/* Volume Histogram Bars (rendered along bottom 18% of chart) */}
                        {chartData.points.map((p, i) => {
                            const x = getX(i);
                            const barH = (p.volume / chartData.maxVol) * (chartH * 0.22);
                            const barY = padding.top + chartH - barH;
                            return (
                                <rect
                                    key={`vol-${i}`}
                                    x={x - 2}
                                    y={barY}
                                    width="4"
                                    height={barH}
                                    fill={p.isBullish ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}
                                    rx="1"
                                />
                            );
                        })}

                        {/* Chart Render: Area Mode */}
                        {chartType === 'area' && (
                            <>
                                <polygon points={areaPoints} fill="url(#stockAreaGrad)" />
                                <polyline
                                    fill="none"
                                    stroke={strokeColor}
                                    strokeWidth="2.2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    points={linePoints}
                                />
                            </>
                        )}

                        {/* Chart Render: Candlestick Mode */}
                        {chartType === 'candles' && (
                            <g>
                                {chartData.points.map((c, i) => {
                                    const cx = getX(i);
                                    const yOpen = getY(c.open);
                                    const yClose = getY(c.close);
                                    const yHigh = getY(c.high);
                                    const yLow = getY(c.low);
                                    const isUp = c.close >= c.open;
                                    const candleColor = isUp ? '#10b981' : '#ef4444';
                                    const bodyTop = Math.min(yOpen, yClose);
                                    const bodyH = Math.max(2, Math.abs(yClose - yOpen));

                                    return (
                                        <g key={`candle-${i}`}>
                                            {/* Wick line */}
                                            <line
                                                x1={cx}
                                                y1={yHigh}
                                                x2={cx}
                                                y2={yLow}
                                                stroke={candleColor}
                                                strokeWidth="1.2"
                                            />
                                            {/* Candle body */}
                                            <rect
                                                x={cx - 3.5}
                                                y={bodyTop}
                                                width="7"
                                                height={bodyH}
                                                fill={candleColor}
                                                rx="1"
                                            />
                                        </g>
                                    );
                                })}
                            </g>
                        )}

                        {/* Interactive Crosshair & Hover Tooltip */}
                        {hoverIndex !== null && activePoint && (
                            <g>
                                {/* Vertical crosshair line */}
                                <line
                                    x1={getX(hoverIndex)}
                                    y1={padding.top}
                                    x2={getX(hoverIndex)}
                                    y2={padding.top + chartH}
                                    stroke="rgba(255,255,255,0.4)"
                                    strokeDasharray="4 4"
                                    strokeWidth="1"
                                />

                                {/* Horizontal crosshair line */}
                                <line
                                    x1={padding.left}
                                    y1={getY(activePoint.close)}
                                    x2={padding.left + chartW}
                                    y2={getY(activePoint.close)}
                                    stroke="rgba(255,255,255,0.25)"
                                    strokeDasharray="4 4"
                                    strokeWidth="1"
                                />

                                {/* Highlight Circle */}
                                <circle
                                    cx={getX(hoverIndex)}
                                    cy={getY(activePoint.close)}
                                    r="5"
                                    fill={strokeColor}
                                    stroke="#fff"
                                    strokeWidth="2"
                                />

                                {/* Timestamp at Bottom */}
                                <rect
                                    x={Math.max(padding.left, Math.min(padding.left + chartW - 55, getX(hoverIndex) - 25))}
                                    y={padding.top + chartH + 8}
                                    width="50"
                                    height="18"
                                    rx="4"
                                    fill="#1e293b"
                                />
                                <text
                                    x={Math.max(padding.left + 25, Math.min(padding.left + chartW - 30, getX(hoverIndex)))}
                                    y={padding.top + chartH + 21}
                                    fill="#fff"
                                    fontSize="10"
                                    fontWeight="700"
                                    textAnchor="middle"
                                >
                                    {activePoint.label}
                                </text>
                            </g>
                        )}

                        {/* Horizontal X Axis Labels */}
                        {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                            const index = Math.floor(pct * (chartData.points.length - 1));
                            const pt = chartData.points[index];
                            if (!pt) return null;
                            return (
                                <text
                                    key={idx}
                                    x={getX(index)}
                                    y={padding.top + chartH + 22}
                                    fill="var(--text-muted)"
                                    fontSize="10"
                                    textAnchor="middle"
                                >
                                    {pt.label}
                                </text>
                            );
                        })}
                    </svg>

                    {/* Tooltip Overlay Box */}
                    {hoverIndex !== null && activePoint && (
                        <div style={{
                            position: 'absolute',
                            left: `${Math.max(10, Math.min(svgWidth - 170, (getX(hoverIndex) / svgWidth) * 100))}%`,
                            top: '12px',
                            background: 'rgba(15, 23, 42, 0.92)',
                            backdropFilter: 'blur(8px)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            borderRadius: '8px',
                            padding: '8px 12px',
                            color: '#fff',
                            fontSize: '11.5px',
                            pointerEvents: 'none',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                            minWidth: '150px'
                        }}>
                            <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{activePoint.label}</div>
                            <div style={{ fontSize: '14px', fontWeight: '800', margin: '2px 0' }}>
                                ₹{activePoint.close.toFixed(2)}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '10px', color: '#94a3b8' }}>
                                <span>Vol: {(activePoint.volume / 1000).toFixed(1)}k</span>
                                <span>H: ₹{activePoint.high.toFixed(1)}</span>
                                <span>L: ₹{activePoint.low.toFixed(1)}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Key Day Statistics Strip */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                    gap: '10px',
                    padding: '14px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    marginTop: '16px',
                    textAlign: 'center'
                }}>
                    <div>
                        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: '600' }}>DAY LOW</div>
                        <div style={{ fontSize: '13.5px', fontWeight: '800', marginTop: '3px', color: '#ef4444' }}>₹{chartData.minPrice.toFixed(2)}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: '600' }}>DAY HIGH</div>
                        <div style={{ fontSize: '13.5px', fontWeight: '800', marginTop: '3px', color: '#10b981' }}>₹{chartData.maxPrice.toFixed(2)}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: '600' }}>52W LOW</div>
                        <div style={{ fontSize: '13.5px', fontWeight: '800', marginTop: '3px' }}>₹{stock.low52.toFixed(2)}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: '600' }}>52W HIGH</div>
                        <div style={{ fontSize: '13.5px', fontWeight: '800', marginTop: '3px', color: '#60a5fa' }}>₹{stock.high52.toFixed(2)}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: '600' }}>MARKET CAP</div>
                        <div style={{ fontSize: '13.5px', fontWeight: '800', marginTop: '3px' }}>{stock.marketCap}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: '600' }}>P/E RATIO</div>
                        <div style={{ fontSize: '13.5px', fontWeight: '800', marginTop: '3px' }}>{stock.peRatio}</div>
                    </div>
                </div>

                {/* Market Depth / Order Book Indicator */}
                <div style={{
                    marginTop: '14px',
                    padding: '12px 14px',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: '10px',
                    border: '1px solid var(--border)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: '700', marginBottom: '6px' }}>
                        <span style={{ color: '#10b981' }}>BUY ORDERS (56%)</span>
                        <span style={{ color: 'var(--text-muted)' }}>MARKET DEPTH</span>
                        <span style={{ color: '#ef4444' }}>SELL ORDERS (44%)</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', borderRadius: '4px', display: 'flex', overflow: 'hidden' }}>
                        <div style={{ width: '56%', background: '#10b981' }} />
                        <div style={{ width: '44%', background: '#ef4444' }} />
                    </div>
                </div>

                {/* Modal Footer Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '18px', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                        Exchange: NSE / BSE · Real-time Tick Engine Active
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={onClose}
                        >
                            Close Chart
                        </button>
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => {
                                if (onDownloadBalanceSheet) onDownloadBalanceSheet(stock);
                            }}
                        >
                            📥 Download Balance Sheet
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
