import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, ExternalLink, Radio, Search, Wifi, WifiOff } from 'lucide-react';

const BINANCE_REST = 'https://data-api.binance.vision/api/v3';
const BINANCE_STREAM = 'wss://stream.binance.com:9443/stream';
const ASSETS = [
    { symbol: 'BTCUSDT', ticker: 'BTC', name: 'Bitcoin', mark: '₿', color: '#f7931a' },
    { symbol: 'ETHUSDT', ticker: 'ETH', name: 'Ethereum', mark: '◆', color: '#627eea' },
    { symbol: 'BNBUSDT', ticker: 'BNB', name: 'BNB', mark: '◆', color: '#f3ba2f' },
    { symbol: 'XRPUSDT', ticker: 'XRP', name: 'XRP', mark: '✕', color: '#303846' },
    { symbol: 'SOLUSDT', ticker: 'SOL', name: 'Solana', mark: '≋', color: '#8155e8' },
    { symbol: 'TRXUSDT', ticker: 'TRX', name: 'TRON', mark: '◇', color: '#e91b44' },
    { symbol: 'DOGEUSDT', ticker: 'DOGE', name: 'Dogecoin', mark: 'Ð', color: '#c3a634' },
    { symbol: 'ADAUSDT', ticker: 'ADA', name: 'Cardano', mark: '●', color: '#3468d4' },
    { symbol: 'LINKUSDT', ticker: 'LINK', name: 'Chainlink', mark: '⬡', color: '#2a5ada' },
    { symbol: 'AVAXUSDT', ticker: 'AVAX', name: 'Avalanche', mark: '▲', color: '#e84142' },
    { symbol: 'LTCUSDT', ticker: 'LTC', name: 'Litecoin', mark: 'Ł', color: '#8492a6' },
    { symbol: 'DOTUSDT', ticker: 'DOT', name: 'Polkadot', mark: '●', color: '#e6007a' },
];
const ASSET_BY_SYMBOL = Object.fromEntries(ASSETS.map(asset => [asset.symbol, asset]));

function money(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return '—';
    return new Intl.NumberFormat('en-US', {
        style: 'currency', currency: 'USD',
        minimumFractionDigits: number < 1 ? 4 : 2,
        maximumFractionDigits: number < 1 ? 6 : 2,
    }).format(number);
}

function compactMoney(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return '—';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 2 }).format(number);
}

function binanceMarketUrl(asset) {
    const pair = `${asset.ticker}_USDT`;
    return `https://www.binance.com/en/trade/${pair}?type=spot`;
}

function Sparkline({ values, positive }) {
    if (!values?.length) return <span className="crypto-chart-empty">Loading chart…</span>;
    const width = 720;
    const height = 104;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const points = values.map((value, index) => ({
        x: 5 + (index / Math.max(values.length - 1, 1)) * (width - 10),
        y: height - 9 - ((value - min) / range) * (height - 20),
    }));
    const linePath = points.reduce((path, point, index) => {
        if (index === 0) return `M ${point.x} ${point.y}`;
        const previous = points[index - 1];
        const before = points[Math.max(0, index - 2)];
        const after = points[Math.min(points.length - 1, index + 1)];
        const controlOne = { x: previous.x + (point.x - before.x) / 6, y: previous.y + (point.y - before.y) / 6 };
        const controlTwo = { x: point.x - (after.x - previous.x) / 6, y: point.y - (after.y - previous.y) / 6 };
        return `${path} C ${controlOne.x} ${controlOne.y}, ${controlTwo.x} ${controlTwo.y}, ${point.x} ${point.y}`;
    }, '');
    const first = points[0];
    const last = points[points.length - 1];
    const areaPath = `${linePath} L ${last.x} ${height} L ${first.x} ${height} Z`;
    const color = positive ? '#059669' : '#ef4444';
    return (
        <svg className="crypto-sparkline" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="24-hour price trend">
            <defs>
                <linearGradient id={`crypto-fill-${positive ? 'up' : 'down'}`} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity=".2" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
                <filter id={`crypto-glow-${positive ? 'up' : 'down'}`} x="-30%" y="-80%" width="160%" height="260%">
                    <feGaussianBlur stdDeviation="3.5" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
            </defs>
            <path d={areaPath} fill={`url(#crypto-fill-${positive ? 'up' : 'down'})`} />
            <path d={linePath} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" opacity=".16" filter={`url(#crypto-glow-${positive ? 'up' : 'down'})`} />
            <path d={linePath} fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle className="crypto-chart-endpoint-halo" cx={last.x} cy={last.y} r="9" fill={color} opacity=".18" />
            <circle className="crypto-chart-endpoint" cx={last.x} cy={last.y} r="4.5" fill={color} />
        </svg>
    );
}

export default function CryptoMarketView() {
    const [quotes, setQuotes] = useState({});
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');
    const [sort, setSort] = useState('volume');
    const [connection, setConnection] = useState('connecting');
    const [error, setError] = useState('');
    const [selectedAsset, setSelectedAsset] = useState(ASSETS[0]);
    const [chartValues, setChartValues] = useState([]);
    const [chartLoading, setChartLoading] = useState(true);

    const loadSnapshot = useCallback(async (signal) => {
        try {
            const symbols = encodeURIComponent(JSON.stringify(ASSETS.map(asset => asset.symbol)));
            const response = await fetch(`${BINANCE_REST}/ticker/24hr?symbols=${symbols}`, { signal });
            if (!response.ok) throw new Error(`Market snapshot returned ${response.status}`);
            const data = await response.json();
            const snapshot = Object.fromEntries(data.map(item => [item.symbol, {
                price: Number(item.lastPrice), change: Number(item.priceChangePercent),
                high: Number(item.highPrice), low: Number(item.lowPrice),
                volume: Number(item.quoteVolume), updatedAt: Number(item.closeTime),
            }]));
            setQuotes(previous => ({ ...snapshot, ...previous }));
            setError('');
        } catch (requestError) {
            if (requestError.name !== 'AbortError') setError('Could not load the Binance market snapshot. Live prices will appear when the connection is available.');
        }
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        loadSnapshot(controller.signal);
        return () => controller.abort();
    }, [loadSnapshot]);

    useEffect(() => {
        let socket;
        let retryTimer;
        let retryDelay = 1000;
        let disposed = false;
        const streams = ASSETS.map(asset => `${asset.symbol.toLowerCase()}@ticker`).join('/');

        const connect = () => {
            if (disposed) return;
            setConnection('connecting');
            try {
                socket = new WebSocket(`${BINANCE_STREAM}?streams=${streams}`);
            } catch {
                setConnection('offline');
                retryTimer = window.setTimeout(connect, retryDelay);
                retryDelay = Math.min(retryDelay * 2, 30000);
                return;
            }
            socket.onopen = () => {
                retryDelay = 1000;
                setConnection('live');
                setError('');
            };
            socket.onmessage = event => {
                try {
                    const { data } = JSON.parse(event.data);
                    if (!ASSET_BY_SYMBOL[data.s]) return;
                    setQuotes(previous => ({
                        ...previous,
                        [data.s]: {
                            ...previous[data.s],
                            price: Number(data.c), change: Number(data.P),
                            high: Number(data.h), low: Number(data.l),
                            volume: Number(data.q), updatedAt: Number(data.E),
                        },
                    }));
                } catch {
                    // Ignore malformed stream frames and keep the connection alive.
                }
            };
            socket.onerror = () => socket?.close();
            socket.onclose = () => {
                if (disposed) return;
                setConnection('reconnecting');
                retryTimer = window.setTimeout(connect, retryDelay);
                retryDelay = Math.min(retryDelay * 2, 30000);
            };
        };

        connect();
        return () => {
            disposed = true;
            window.clearTimeout(retryTimer);
            socket?.close();
        };
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        setChartLoading(true);
        const params = new URLSearchParams({ symbol: selectedAsset.symbol, interval: '1h', limit: '24' });
        fetch(`${BINANCE_REST}/klines?${params}`, { signal: controller.signal })
            .then(response => {
                if (!response.ok) throw new Error('Chart data unavailable');
                return response.json();
            })
            .then(candles => setChartValues(candles.map(candle => Number(candle[4]))))
            .catch(requestError => {
                if (requestError.name !== 'AbortError') setChartValues([]);
            })
            .finally(() => {
                if (!controller.signal.aborted) setChartLoading(false);
            });
        return () => controller.abort();
    }, [selectedAsset]);

    const visibleAssets = useMemo(() => ASSETS
        .filter(asset => {
            const query = search.trim().toLowerCase();
            const quote = quotes[asset.symbol];
            return (!query || asset.name.toLowerCase().includes(query) || asset.ticker.toLowerCase().includes(query))
                && (filter === 'all' || (filter === 'gainers' ? (quote?.change ?? 0) >= 0 : (quote?.change ?? 0) < 0));
        })
        .sort((a, b) => {
            const quoteA = quotes[a.symbol] || {};
            const quoteB = quotes[b.symbol] || {};
            if (sort === 'price') return (quoteB.price || 0) - (quoteA.price || 0);
            if (sort === 'change') return (quoteB.change || 0) - (quoteA.change || 0);
            return (quoteB.volume || 0) - (quoteA.volume || 0);
        }), [search, filter, sort, quotes]);

    const latestQuote = quotes[selectedAsset.symbol];
    const statusLabel = connection === 'live' ? 'Live prices' : connection === 'reconnecting' ? 'Reconnecting…' : connection === 'offline' ? 'Offline' : 'Connecting…';

    return (
        <section className="page-view crypto-market-page" aria-labelledby="crypto-market-title">
            <header className="page-header crypto-market-header">
                <div>
                    <span className="crypto-eyebrow"><span className="crypto-eyebrow-mark">₿</span> BINANCE SPOT MARKET</span>
                    <h1 className="page-title" id="crypto-market-title">Crypto Market</h1>
                    <p className="page-subtitle">Live cryptocurrency prices, 24-hour market stats, and charts.</p>
                </div>
                <div className={`crypto-connection crypto-connection-${connection}`} role="status">
                    {connection === 'live' ? <Wifi size={15} aria-hidden="true" /> : connection === 'offline' ? <WifiOff size={15} aria-hidden="true" /> : <Radio size={15} aria-hidden="true" />}
                    <span>{statusLabel}</span>
                </div>
            </header>

            {error && <div className="crypto-market-notice" role="status">{error}</div>}

            <article className="crypto-featured-card" aria-label={`${selectedAsset.name} market chart`}>
                <div className="crypto-featured-top">
                    <div className="crypto-featured-identity">
                        <span className="crypto-coin-mark crypto-coin-mark-large" style={{ '--coin-color': selectedAsset.color }} aria-hidden="true">{selectedAsset.mark}</span>
                        <div><span className="crypto-symbol">{selectedAsset.ticker}<span>/ USDT</span></span><span className="crypto-asset-name">{selectedAsset.name} · Binance Spot</span></div>
                    </div>
                    <div className="crypto-featured-quote">
                        <strong>{money(latestQuote?.price)}</strong>
                        <span className={(latestQuote?.change ?? 0) >= 0 ? 'crypto-positive' : 'crypto-negative'}>
                            {(latestQuote?.change ?? 0) >= 0 ? <ArrowUpRight size={16} aria-hidden="true" /> : <ArrowDownRight size={16} aria-hidden="true" />}
                            {Number.isFinite(latestQuote?.change) ? `${latestQuote.change >= 0 ? '+' : ''}${latestQuote.change.toFixed(2)}% (24h)` : 'Waiting for price'}
                        </span>
                    </div>
                </div>
                <div className="crypto-chart-area">
                    {chartLoading ? <div className="crypto-chart-loading" aria-live="polite">Loading 24-hour chart…</div> : <Sparkline values={chartValues} positive={(latestQuote?.change ?? 0) >= 0} />}
                </div>
                <div className="crypto-featured-stats">
                    <div><span>24h High</span><strong>{money(latestQuote?.high)}</strong></div>
                    <div><span>24h Low</span><strong>{money(latestQuote?.low)}</strong></div>
                    <div><span>24h Volume</span><strong>{compactMoney(latestQuote?.volume)}</strong></div>
                    <a href={binanceMarketUrl(selectedAsset)} target="_blank" rel="noopener noreferrer" className="crypto-open-binance">Open on Binance <ExternalLink size={14} aria-hidden="true" /></a>
                </div>
            </article>

            <div className="crypto-market-toolbar">
                <label className="crypto-search">
                    <Search size={17} aria-hidden="true" />
                    <span className="crypto-sr-only">Search cryptocurrencies</span>
                    <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search coins…" />
                </label>
                <div className="crypto-market-filters" role="group" aria-label="Filter cryptocurrencies">
                    {[['all', 'All coins'], ['gainers', 'Gainers'], ['losers', 'Losers']].map(([id, label]) => (
                        <button key={id} type="button" className={`crypto-filter${filter === id ? ' active' : ''}`} aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>
                    ))}
                </div>
                <label className="crypto-sort-label">Sort by
                    <select value={sort} onChange={event => setSort(event.target.value)}>
                        <option value="volume">24h volume</option><option value="change">24h change</option><option value="price">Price</option>
                    </select>
                </label>
            </div>

            <div className="crypto-table-wrap">
                <table className="crypto-market-table">
                    <thead><tr><th scope="col">Asset</th><th scope="col">Price</th><th scope="col">24h Change</th><th scope="col">24h High / Low</th><th scope="col">24h Volume</th><th scope="col">Trade</th></tr></thead>
                    <tbody>
                        {visibleAssets.map(asset => {
                            const quote = quotes[asset.symbol];
                            const positive = (quote?.change ?? 0) >= 0;
                            return (
                                <tr key={asset.symbol} className={selectedAsset.symbol === asset.symbol ? 'selected' : ''}>
                                    <td data-label="Asset">
                                        <button type="button" className="crypto-asset-select" onClick={() => setSelectedAsset(asset)} aria-label={`View ${asset.name} chart`} aria-pressed={selectedAsset.symbol === asset.symbol}>
                                            <span className="crypto-coin-mark" style={{ '--coin-color': asset.color }} aria-hidden="true">{asset.mark}</span>
                                            <span><strong>{asset.ticker}</strong><small>{asset.name}</small></span>
                                        </button>
                                    </td>
                                    <td data-label="Price" className="crypto-price-cell">{money(quote?.price)}</td>
                                    <td data-label="24h Change"><span className={`crypto-change-pill ${positive ? 'up' : 'down'}`}>{Number.isFinite(quote?.change) ? `${positive ? '+' : ''}${quote.change.toFixed(2)}%` : '—'}</span></td>
                                    <td data-label="24h High / Low"><span className="crypto-range"><strong>{money(quote?.high)}</strong><small>{money(quote?.low)}</small></span></td>
                                    <td data-label="24h Volume" className="crypto-volume-cell">{compactMoney(quote?.volume)}</td>
                                    <td data-label="Trade"><div className="crypto-trade-actions">
                                        <a className="crypto-trade-buy" href={binanceMarketUrl(asset)} target="_blank" rel="noopener noreferrer" aria-label={`Open ${asset.ticker} market on Binance to buy`}>Buy</a>
                                        <a className="crypto-trade-sell" href={binanceMarketUrl(asset)} target="_blank" rel="noopener noreferrer" aria-label={`Open ${asset.ticker} market on Binance to sell`}>Sell</a>
                                    </div></td>
                                </tr>
                            );
                        })}
                        {visibleAssets.length === 0 && <tr><td className="crypto-no-results" colSpan="6">No coins match “{search}”.</td></tr>}
                    </tbody>
                </table>
            </div>
            <p className="crypto-market-disclaimer">Prices and statistics are public Binance Spot market data. Buy and Sell open Binance’s selected trading pair; you must review and place any order on Binance. Market availability may vary by region.</p>
        </section>
    );
}
