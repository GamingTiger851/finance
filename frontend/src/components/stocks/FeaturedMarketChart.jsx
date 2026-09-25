import React, { useEffect, useMemo, useState } from 'react';
import { fetchQuote, fetchCandles } from '../../services/growwService';

const FEATURED_ITEMS = [
    { id: 'NIFTY50', name: 'NIFTY 50', type: 'index', symbol: '^NSEI' },
    { id: 'SENSEX', name: 'SENSEX', type: 'index', symbol: '^BSESN' },
    { id: 'BANKNIFTY', name: 'BANK NIFTY', type: 'index', symbol: '^NSEBANK' },
    { id: 'NIFTY IT', name: 'NIFTY IT', type: 'index', symbol: '^CNXIT' },
    { id: 'RELIANCE', name: 'Reliance Ind.', type: 'stock', symbol: 'RELIANCE.NS' },
    { id: 'TCS', name: 'Tata Consultancy', type: 'stock', symbol: 'TCS.NS' },
    { id: 'HDFCBANK', name: 'HDFC Bank', type: 'stock', symbol: 'HDFCBANK.NS' },
];

const TIMEFRAMES = {
    '1D': { interval: '5m', range: '1d' },
    '1W': { interval: '30m', range: '5d' },
    '1M': { interval: '1d', range: '1mo' },
    '1Y': { interval: '1d', range: '1y' },
};

function normalizeCandles(result) {
    // The API may return { candles: [...] }, or a candle directly as an
    // array [timestamp, open, high, low, close, volume].
    const rows = Array.isArray(result) ? result : result?.candles;
    if (!Array.isArray(rows)) return [];

    return rows.map(candle => {
        const timestamp = Array.isArray(candle)
            ? candle[0]
            : candle.timestamp ?? candle.date ?? candle.time ?? candle.t;
        const close = Array.isArray(candle)
            ? candle[4]
            : candle.close ?? candle.value ?? candle.c;
        const high = Array.isArray(candle) ? candle[2] : candle.high ?? candle.h;
        const low = Array.isArray(candle) ? candle[3] : candle.low ?? candle.l;
        const numericTime = Number(timestamp);

        return {
            time: Number.isFinite(numericTime) ? numericTime : timestamp,
            c: Number(close),
            h: Number(high),
            l: Number(low),
        };
    }).filter(candle => Number.isFinite(candle.c));
}

export default function FeaturedMarketChart() {
    const [selectedId, setSelectedId] = useState(FEATURED_ITEMS[0].id);
    const [timeframe, setTimeframe] = useState('1D');
    const [quote, setQuote] = useState(null);
    const [candles, setCandles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('Loading live market data…');
    const [lastUpdated, setLastUpdated] = useState(null);
    const selectedItem = FEATURED_ITEMS.find(item => item.id === selectedId) || FEATURED_ITEMS[0];

    useEffect(() => {
        let active = true;
        let inFlight = false;
        setQuote(null);
        setCandles([]);
        setLastUpdated(null);

        const refresh = async () => {
            if (inFlight) return;
            inFlight = true;
            setLoading(true);
            setError('Loading live market data…');
            try {
                const range = TIMEFRAMES[timeframe];

                const [liveQuote, candleResult] = await Promise.all([
                    fetchQuote(selectedItem.symbol),
                    fetchCandles(selectedItem.symbol, { 
                        interval: range.interval, 
                        range: range.range,
                    }).catch(() => null)
                ]);

                if (!active) return;

                if (!liveQuote || !liveQuote.ltp) {
                    setQuote(null);
                    setCandles([]);
                    setLastUpdated(null);
                    setError('Unable to fetch live quote for this instrument.');
                    return;
                }

                setQuote({
                    price: liveQuote.ltp,
                    change: liveQuote.change,
                    changePercent: liveQuote.changePct,
                    high: liveQuote.high,
                    low: liveQuote.low,
                });

                const parsedCandles = normalizeCandles(candleResult);
                setCandles(parsedCandles);
                if (!parsedCandles.length) setError('No chart history returned for this instrument.');
                
                setLastUpdated(new Date());
                setError('');
            } catch (err) {
                if (active) {
                    setQuote(null);
                    setCandles([]);
                    setLastUpdated(null);
                    setError(`Market data error: ${err.message}`);
                }
            } finally {
                inFlight = false;
                if (active) setLoading(false);
            }
        };

        refresh();
        const timer = setInterval(refresh, 30000); // 30s refresh
        return () => {
            active = false;
            clearInterval(timer);
        };
    }, [selectedItem, timeframe]);

    const chart = useMemo(() => {
        if (!candles.length) return null;
        const values = candles.map(candle => candle.c);
        const dataLow = Math.min(...candles.map(candle => Number.isFinite(candle.l) ? candle.l : candle.c));
        const dataHigh = Math.max(...candles.map(candle => Number.isFinite(candle.h) ? candle.h : candle.c));
        const padding = (dataHigh - dataLow) * 0.05 || 1;
        const minVal = dataLow - padding;
        const maxVal = dataHigh + padding;
        const range = maxVal - minVal;

        const coordinates = candles.map((candle, i) => {
            const x = candles.length === 1 ? 50 : (i / (candles.length - 1)) * 100;
            const y = 100 - ((candle.c - minVal) / range) * 100;
            return [x, y];
        });
        const points = coordinates.map(([x, y]) => `${x},${y}`).join(' ');
        const linePath = coordinates.length < 3
            ? `M ${coordinates.map(point => point.join(' ')).join(' L ')}`
            : coordinates.slice(1).reduce((path, point, index) => {
                const previous = coordinates[index];
                const midpointX = (previous[0] + point[0]) / 2;
                const midpointY = (previous[1] + point[1]) / 2;
                return `${path} Q ${previous[0]} ${previous[1]} ${midpointX} ${midpointY}`;
            }, `M ${coordinates[0][0]} ${coordinates[0][1]}`) + ` L ${coordinates.at(-1)[0]} ${coordinates.at(-1)[1]}`;

        const fillPoints = `0,100 ${points} 100,100`;
        const isUp = quote ? quote.change >= 0 : values[values.length - 1] >= values[0];
        const color = isUp ? '#10b981' : '#ef4444';

        const safeId = selectedId.replace(/[^a-zA-Z0-9-]/g, '-');

        return (
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                <defs>
                    <linearGradient id={`gradient-${safeId}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.12" />
                        <stop offset="100%" stopColor={color} stopOpacity="0.0" />
                    </linearGradient>
                </defs>
                <polygon points={fillPoints} fill={`url(#gradient-${safeId})`} />
                <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            </svg>
        );
    }, [candles, quote, selectedId]);

    const handleWheel = (e) => {
        const container = e.currentTarget;
        container.scrollLeft += e.deltaY;
        e.preventDefault();
    };

    return (
        <div className="table-card" style={{ marginTop: '20px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
                <div style={{ padding: '20px', flex: 1 }}>
                    <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '8px' }} onWheel={handleWheel}>
                        {FEATURED_ITEMS.map(item => (
                            <button
                                key={item.id}
                                onClick={() => setSelectedId(item.id)}
                                style={{
                                    background: selectedId === item.id ? 'var(--bg-secondary)' : 'transparent',
                                    border: 'none',
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    color: selectedId === item.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                                    fontWeight: selectedId === item.id ? '600' : '400',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {item.name}
                            </button>
                        ))}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '16px' }}>
                        <div>
                            <h2 style={{ margin: '0 0 4px 0', fontSize: '24px', fontWeight: '700' }}>{selectedItem.name}</h2>
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{selectedItem.type === 'index' ? 'Market Index' : 'Featured Equity'} · {selectedItem.symbol}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            {quote ? (
                                <>
                                    <div style={{ fontSize: '28px', fontWeight: '800', fontFamily: 'monospace', letterSpacing: '-0.5px' }}>
                                        ₹{quote.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </div>
                                    <div style={{
                                        fontSize: '15px',
                                        fontWeight: '600',
                                        color: quote.change >= 0 ? '#10b981' : '#ef4444',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'flex-end',
                                        gap: '4px'
                                    }}>
                                        {quote.change >= 0 ? '▲' : '▼'}
                                        {Math.abs(quote.change).toFixed(2)} ({Math.abs(quote.changePercent).toFixed(2)}%)
                                    </div>
                                </>
                            ) : (
                                <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-muted)' }}>--</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ position: 'relative', height: '280px', padding: '0 20px' }}>
                {loading && !candles.length && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.02)', zIndex: 10 }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: '500' }}>Loading chart data…</div>
                    </div>
                )}
                {error && !candles.length && !loading && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.02)', zIndex: 10 }}>
                        <div style={{ color: '#ef4444', fontSize: '14px', fontWeight: '500', background: 'rgba(239, 68, 68, 0.1)', padding: '8px 16px', borderRadius: '8px' }}>
                            {error}
                        </div>
                    </div>
                )}
                <div style={{ width: '100%', height: '100%', padding: '16px 0 12px' }}>
                    {chart}
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {Object.keys(TIMEFRAMES).map(tf => (
                        <button
                            key={tf}
                            onClick={() => setTimeframe(tf)}
                            style={{
                                background: timeframe === tf ? 'var(--text-primary)' : 'transparent',
                                color: timeframe === tf ? 'var(--bg-primary)' : 'var(--text-secondary)',
                                border: '1px solid',
                                borderColor: timeframe === tf ? 'var(--text-primary)' : 'var(--border)',
                                borderRadius: '4px',
                                padding: '4px 12px',
                                fontSize: '12px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            {tf}
                        </button>
                    ))}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {lastUpdated ? `Live data • Last updated ${lastUpdated.toLocaleTimeString()}` : 'Connecting to data feed…'}
                </div>
            </div>
        </div>
    );
}
