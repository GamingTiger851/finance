import React, { useEffect, useMemo, useState } from 'react';
import { checkUpstoxStatus, fetchCandles, fetchQuotes, getInstrumentKey, getQuoteForInstrument } from '../../services/upstoxService';

const FEATURED_ITEMS = [
    { id: 'NIFTY50', name: 'NIFTY 50', type: 'index', key: 'NSE_INDEX|Nifty 50' },
    { id: 'SENSEX', name: 'SENSEX', type: 'index', key: 'BSE_INDEX|SENSEX' },
    { id: 'BANKNIFTY', name: 'BANK NIFTY', type: 'index', key: 'NSE_INDEX|Nifty Bank' },
    { id: 'NIFTY IT', name: 'NIFTY IT', type: 'index', key: 'NSE_INDEX|Nifty IT' },
    { id: 'RELIANCE', name: 'Reliance Ind.', type: 'stock', symbol: 'RELIANCE', key: getInstrumentKey('RELIANCE') },
    { id: 'TCS', name: 'Tata Consultancy', type: 'stock', symbol: 'TCS', key: getInstrumentKey('TCS') },
    { id: 'HDFCBANK', name: 'HDFC Bank', type: 'stock', symbol: 'HDFCBANK', key: getInstrumentKey('HDFCBANK') },
];

const TIMEFRAMES = {
    '1D': { interval: '1minute', days: 0 },
    '1W': { interval: '30minute', days: 7 },
    '1M': { interval: 'day', days: 30 },
    '1Y': { interval: 'day', days: 365 },
};

function upstoxDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}-${month}-${date.getFullYear()}`;
}

function candleValues(candles = []) {
    return candles
        .filter(candle => Array.isArray(candle) && Number.isFinite(Number(candle[4])))
        .map(candle => ({ time: candle[0], value: Number(candle[4]), high: Number(candle[2]), low: Number(candle[3]) }))
        .sort((a, b) => new Date(a.time) - new Date(b.time));
}

export default function FeaturedMarketChart() {
    const [selectedId, setSelectedId] = useState(FEATURED_ITEMS[0].id);
    const [timeframe, setTimeframe] = useState('1D');
    const [quote, setQuote] = useState(null);
    const [candles, setCandles] = useState([]);
    const [connected, setConnected] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('Checking Upstox connection…');
    const [lastUpdated, setLastUpdated] = useState(null);
    const selectedItem = FEATURED_ITEMS.find(item => item.id === selectedId) || FEATURED_ITEMS[0];

    useEffect(() => {
        let active = true;
        checkUpstoxStatus()
            .then(result => {
                if (!active) return;
                const isConnected = Boolean(result.connected);
                setConnected(isConnected);
                if (!isConnected) {
                    setError(result.reason === 'expired' ? 'Upstox session expired · reconnect in Settings' : 'Connect Upstox in Settings for live market data');
                    setLoading(false);
                }
            })
            .catch(() => {
                if (active) {
                    setConnected(false);
                    setError('Unable to verify Upstox connection');
                    setLoading(false);
                }
            });
        return () => { active = false; };
    }, []);

    useEffect(() => {
        if (!connected) return undefined;
        let active = true;
        let inFlight = false;

        const refresh = async () => {
            if (inFlight) return;
            inFlight = true;
            setLoading(true);
            setError('Loading live Upstox data…');
            try {
                const [quoteData, candleData] = await Promise.all([
                    fetchQuotes([selectedItem.key]),
                    (async () => {
                        const range = TIMEFRAMES[timeframe];
                        if (!range.days) return fetchCandles(selectedItem.key, range.interval);
                        const to = new Date();
                        const from = new Date(to);
                        from.setDate(from.getDate() - range.days);
                        return fetchCandles(selectedItem.key, range.interval, upstoxDate(from), upstoxDate(to));
                    })(),
                ]);
                if (!active) return;

                const liveQuote = getQuoteForInstrument(quoteData, selectedItem.key);
                const lastPrice = Number(liveQuote?.last_price);
                if (!Number.isFinite(lastPrice) || lastPrice <= 0) {
                    setQuote(null);
                    setCandles([]);
                    setLastUpdated(null);
                    setError('Upstox did not return a current quote for this instrument');
                    return;
                }

                const close = Number(liveQuote?.ohlc?.close ?? liveQuote?.cp);
                const change = Number.isFinite(close) && close > 0 ? lastPrice - close : Number(liveQuote?.net_change);
                const changePercent = Number.isFinite(change) && Number.isFinite(close) && close > 0
                    ? (change / close) * 100
                    : null;
                setQuote({
                    price: lastPrice,
                    change: Number.isFinite(change) ? change : null,
                    changePercent,
                    high: Number(liveQuote?.ohlc?.high),
                    low: Number(liveQuote?.ohlc?.low),
                });
                setCandles(candleValues(candleData));
                setLastUpdated(new Date());
                setError(candleData?.length ? '' : 'Live quote received · chart candles are unavailable');
            } catch (err) {
                if (active) {
                    setQuote(null);
                    setCandles([]);
                    setLastUpdated(null);
                    setError(`Upstox market data error: ${err.message}`);
                }
            } finally {
                inFlight = false;
                if (active) setLoading(false);
            }
        };

        refresh();
        const timer = setInterval(refresh, 15000);
        return () => {
            active = false;
            clearInterval(timer);
        };
    }, [connected, selectedItem, timeframe]);

    const chart = useMemo(() => {
        if (!candles.length) return null;
        const values = candles.map(candle => candle.value);
        const low = Math.min(...candles.map(candle => Number.isFinite(candle.low) ? candle.low : candle.value));
        const high = Math.max(...candles.map(candle => Number.isFinite(candle.high) ? candle.high : candle.value));
        const width = 600;
        const height = 150;
        const padX = 10;
        const padY = 15;
        const span = high - low || 1;
        const points = candles.map((candle, index) => {
            const x = padX + (index / Math.max(1, candles.length - 1)) * (width - 2 * padX);
            const y = padY + (height - 2 * padY) - ((candle.value - low) / span) * (height - 2 * padY);
            return { x, y, candle };
        });
        return {
            low,
            high,
            points: points.map(point => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' '),
            area: `${points.map(point => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ')} ${width - padX},${height - padY} ${padX},${height - padY}`,
            lastPoint: points.at(-1),
            values,
        };
    }, [candles]);

    const isUp = quote?.change != null && quote.change >= 0;
    const color = quote?.change == null ? '#64748b' : isUp ? '#10b981' : '#ef4444';
    const gradId = `featuredGrad-${selectedItem.id.replace(/[^a-z0-9]/gi, '')}`;
    const formatPrice = value => Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
        <div className="table-card" style={{ padding: '18px 22px', marginTop: '16px', borderRadius: '14px', background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '2px' }}>
                    {FEATURED_ITEMS.map(item => (
                        <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} style={{
                            background: selectedItem.id === item.id ? 'var(--accent-bg)' : 'var(--chrome-bg-soft)',
                            color: selectedItem.id === item.id ? 'var(--accent)' : 'var(--text-muted)',
                            border: `1px solid ${selectedItem.id === item.id ? 'var(--accent)' : 'var(--border)'}`,
                            padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                        }}>{item.name}</button>
                    ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: connected && quote ? '#059669' : 'var(--text-muted)', background: connected && quote ? 'var(--income-bg)' : 'var(--chrome-bg-soft)', padding: '3px 8px', borderRadius: '12px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: connected && quote ? '#10b981' : '#94a3b8' }} />
                        {connected && quote ? 'UPSTOX DATA' : 'NO LIVE DATA'}
                    </div>
                    <div style={{ display: 'flex', background: 'var(--chrome-bg-soft)', borderRadius: '6px', padding: '2px' }}>
                        {Object.keys(TIMEFRAMES).map(tf => (
                            <button key={tf} type="button" onClick={() => setTimeframe(tf)} style={{ background: timeframe === tf ? 'var(--card-bg)' : 'transparent', color: 'var(--text)', border: 'none', padding: '3px 8px', fontSize: '11px', fontWeight: 700, borderRadius: '4px', cursor: 'pointer' }}>{tf}</button>
                        ))}
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) 2fr', gap: '20px', alignItems: 'center' }}>
                <div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>{selectedItem.name} {selectedItem.symbol ? `(${selectedItem.symbol})` : 'Index'}</div>
                    {quote ? <>
                        <div style={{ fontSize: '32px', fontWeight: 900, color: 'var(--text)', marginTop: '4px', letterSpacing: '-0.02em' }}>{selectedItem.type === 'index' ? formatPrice(quote.price) : `₹${formatPrice(quote.price)}`}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', fontSize: '13px', fontWeight: 700, color }}>
                            <span>{quote.change == null ? 'Change unavailable' : `${isUp ? '▲ +' : '▼ '}${formatPrice(Math.abs(quote.change))}${quote.changePercent == null ? '' : ` (${isUp ? '+' : ''}${quote.changePercent.toFixed(2)}%)`}`}</span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>Today</span>
                        </div>
                        <div style={{ marginTop: '16px', display: 'flex', gap: '14px', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                            <div>Low: <strong style={{ color: Number.isFinite(quote.low) ? '#ef4444' : 'var(--text-muted)' }}>{Number.isFinite(quote.low) ? `${selectedItem.type === 'stock' ? '₹' : ''}${formatPrice(quote.low)}` : 'Unavailable'}</strong></div>
                            <div>High: <strong style={{ color: Number.isFinite(quote.high) ? '#059669' : 'var(--text-muted)' }}>{Number.isFinite(quote.high) ? `${selectedItem.type === 'stock' ? '₹' : ''}${formatPrice(quote.high)}` : 'Unavailable'}</strong></div>
                        </div>
                    </> : <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-muted)', marginTop: '10px' }}>{loading ? 'Loading live quote…' : 'Live quote unavailable'}</div>}
                    <div role="status" style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>{error || (lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : '')}</div>
                </div>

                <div style={{ width: '100%', position: 'relative' }}>
                    {chart ? <>
                        <svg viewBox="0 0 600 150" style={{ width: '100%', height: '140px', overflow: 'visible', display: 'block' }} aria-label={`${selectedItem.name} price chart based on Upstox candles`}>
                            <defs><linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor={color} stopOpacity="0.28" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
                            <line x1="10" y1="15" x2="590" y2="15" stroke="var(--border)" strokeDasharray="3 3" />
                            <line x1="10" y1="75" x2="590" y2="75" stroke="var(--border)" strokeDasharray="3 3" />
                            <line x1="10" y1="135" x2="590" y2="135" stroke="var(--border)" strokeDasharray="3 3" />
                            <polygon points={chart.area} fill={`url(#${gradId})`} />
                            <polyline fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" points={chart.points} />
                            {chart.lastPoint && <circle cx={chart.lastPoint.x} cy={chart.lastPoint.y} r="4" fill={color} stroke="var(--card-bg)" strokeWidth="1.5" />}
                        </svg>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 8px', fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            <span>{chart.lastPoint?.candle.time ? new Date(chart.lastPoint.candle.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                            <span>{timeframe} · {candles.length} Upstox candles</span>
                            <span>{lastUpdated ? lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                        </div>
                    </> : <div style={{ height: '140px', display: 'grid', placeItems: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: '8px', fontSize: '13px' }}>{connected ? 'No historical candles available for this range' : 'Connect Upstox to view verified prices and chart'}</div>}
                </div>
            </div>
        </div>
    );
}
