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
    '1D': { interval: '5m', days: 1 },
    '1W': { interval: '30m', days: 7 },
    '1M': { interval: '1d', days: 30 },
    '1Y': { interval: '1d', days: 365 },
};

function formatDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
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
                const toDate = new Date();
                const fromDate = new Date();
                fromDate.setDate(fromDate.getDate() - range.days);

                const [liveQuote, candleResult] = await Promise.all([
                    fetchQuote(selectedItem.symbol),
                    fetchCandles(selectedItem.symbol, { 
                        interval: range.interval, 
                        from: range.days > 0 ? formatDate(fromDate) : undefined,
                        to: range.days > 0 ? formatDate(toDate) : undefined 
                    }).catch(() => null)
                ]);

                if (!active) return;

                if (!liveQuote || !liveQuote.price) {
                    setQuote(null);
                    setCandles([]);
                    setLastUpdated(null);
                    setError('Unable to fetch live quote for this instrument.');
                    return;
                }

                setQuote({
                    price: liveQuote.price,
                    change: liveQuote.change,
                    changePercent: liveQuote.changePercent,
                    high: liveQuote.dayHigh,
                    low: liveQuote.dayLow,
                });

                if (Array.isArray(candleResult)) {
                    const parsedCandles = candleResult.map(c => ({
                        time: c.timestamp || c.date || c.time,
                        value: Number(c.close || c.value),
                        high: Number(c.high),
                        low: Number(c.low)
                    })).filter(c => Number.isFinite(c.value));
                    setCandles(parsedCandles);
                } else {
                    setCandles([]);
                }
                
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
        const values = candles.map(candle => candle.value);
        const dataLow = Math.min(...candles.map(candle => Number.isFinite(candle.low) ? candle.low : candle.value));
        const dataHigh = Math.max(...candles.map(candle => Number.isFinite(candle.high) ? candle.high : candle.value));
        const padding = (dataHigh - dataLow) * 0.05 || 1;
        const minVal = dataLow - padding;
        const maxVal = dataHigh + padding;
        const range = maxVal - minVal;

        const points = candles.map((candle, i) => {
            const x = (i / (candles.length - 1)) * 100;
            const y = 100 - ((candle.value - minVal) / range) * 100;
            return `${x},${y}`;
        }).join(' ');

        const fillPoints = `0,100 ${points} 100,100`;
        const isUp = quote ? quote.change >= 0 : values[values.length - 1] >= values[0];
        const color = isUp ? '#10b981' : '#ef4444';

        return (
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                <defs>
                    <linearGradient id={`gradient-${selectedId}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.25" />
                        <stop offset="100%" stopColor={color} stopOpacity="0.0" />
                    </linearGradient>
                </defs>
                <polygon points={fillPoints} fill={`url(#gradient-${selectedId})`} />
                <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
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

            <div style={{ position: 'relative', height: '280px', padding: '0 0' }}>
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
                <div style={{ width: '100%', height: '100%', padding: '20px 0 0 0' }}>
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
