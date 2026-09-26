import React, { useEffect, useMemo, useState } from 'react';
import { fetchCandles, fetchIndices, fetchQuote } from '../../services/growwService';

const BENCHMARKS = new Set(['NIFTY 50', 'SENSEX', 'BANK NIFTY', 'NIFTY IT', 'NIFTY MID 50']);
const RANGES = {
    '1D': { interval: '5m', range: '1d' }, '5D': { interval: '30m', range: '5d' },
    '1M': { interval: '1d', range: '1mo' }, '6M': { interval: '1d', range: '6mo' },
    YTD: { interval: '1d', range: 'ytd' }, '1Y': { interval: '1d', range: '1y' },
    '5Y': { interval: '1wk', range: '5y' }, MAX: { interval: '1mo', range: 'max' },
};
const DISPLAY_SYMBOLS = {
    CNXAUTO: 'NIFTY_AUTO', CNXENERGY: 'NIFTY_ENERGY', CNXFINANCE: 'NIFTY_FIN_SERVICE',
    CNXFMCG: 'NIFTY_FMCG', CNXINFRA: 'NIFTY_INFRA', CNXMEDIA: 'NIFTY_MEDIA',
    CNXMETAL: 'NIFTY_METAL', CNXPHARMA: 'NIFTY_PHARMA', CNXPSUBANK: 'NIFTY_PSU_BANK',
    CNXREALTY: 'NIFTY_REALTY', CNXIT: 'NIFTY_IT', NSEI: 'NIFTY_50', BSESN: 'SENSEX',
    NSEBANK: 'NIFTY_BANK', NSEMDCP50: 'NIFTY_MID_50',
};
const INDEX_TITLES = {
    CNXAUTO: 'Nifty Auto', CNXENERGY: 'Nifty Energy', CNXFINANCE: 'Nifty Financial Services',
    CNXFMCG: 'Nifty FMCG', CNXINFRA: 'Nifty Infrastructure', CNXMEDIA: 'Nifty Media',
    CNXMETAL: 'Nifty Metal', CNXPHARMA: 'Nifty Pharma', CNXPSUBANK: 'Nifty PSU Bank',
    CNXREALTY: 'Nifty Realty', CNXIT: 'Nifty IT', NSEI: 'Nifty 50', BSESN: 'Sensex',
    NSEBANK: 'Nifty Bank', NSEMDCP50: 'Nifty Mid 50',
};
const WATCHLIST_ALIASES = { NIFTY_AUTO: 'CNXAUTO', NIFTY_ENERGY: 'CNXENERGY', NIFTY_FINANCE: 'CNXFINANCE', NIFTY_FIN_SERVICE: 'CNXFINANCE', NIFTY_FMCG: 'CNXFMCG' };
const fmt = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value))
    ? Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';
const changeValue = value => Number.parseFloat(value) || 0;

function Sparkline({ values = [], positive = true }) {
    if (values.length < 2) return <span className="equity-mini-wait">···</span>;
    const min = Math.min(...values); const max = Math.max(...values); const spread = max - min || 1;
    const points = values.map((value, index) => `${(index / (values.length - 1)) * 100},${26 - ((value - min) / spread) * 20}`).join(' ');
    return <svg className="equity-mini-chart" viewBox="0 0 100 30" aria-hidden="true"><polyline points={points} fill="none" className={positive ? 'up' : 'down'} /><circle cx={points.split(' ').at(-1).split(',')[0]} cy={points.split(' ').at(-1).split(',')[1]} r="2.5" className={positive ? 'up' : 'down'} /></svg>;
}

function PriceChart({ candles, previousClose, positive, style }) {
    if (!candles.length) return <div className="equity-chart-message">No chart history is available for this index right now.</div>;
    const values = candles.map(item => item.c);
    const lows = candles.map(item => item.l).filter(Number.isFinite);
    const highs = candles.map(item => item.h).filter(Number.isFinite);
    const low = Math.min(...values, ...lows, Number(previousClose) || Infinity);
    const high = Math.max(...values, ...highs, Number(previousClose) || -Infinity);
    const padding = (high - low) * .12 || Math.abs(high || 1) * .002;
    const min = low - padding; const max = high + padding; const span = max - min || 1;
    const points = values.map((value, index) => `${(index / Math.max(values.length - 1, 1)) * 100},${96 - ((value - min) / span) * 88}`);
    const path = points.map((point, index) => `${index ? 'L' : 'M'} ${point.replace(',', ' ')}`).join(' ');
    const fill = `${path} L 100 100 L 0 100 Z`;
    const colorClass = positive ? 'positive' : 'negative';
    const closeY = Number.isFinite(Number(previousClose)) ? 96 - ((Number(previousClose) - min) / span) * 88 : null;
    return <svg className={`equity-main-chart ${style}`} viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Selected equity index price chart">
        <defs><linearGradient id="equity-chart-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0" className={`${colorClass} stop-strong`} /><stop offset="1" className={`${colorClass} stop-clear`} /></linearGradient></defs>
        {[12, 34, 56, 78, 98].map(y => <line key={y} x1="0" x2="100" y1={y} y2={y} className="equity-grid-line" />)}
        {closeY !== null && <line x1="0" x2="100" y1={closeY} y2={closeY} className="equity-close-line" />}
        {style === 'area' && <path d={fill} className={`${colorClass} equity-area-fill`} />}
        <path d={path} className={`${colorClass} equity-price-path`} />
        <circle cx={points.at(-1).split(',')[0]} cy={points.at(-1).split(',')[1]} r="1.1" className={`${colorClass} equity-current-dot`} />
    </svg>;
}

export default function EquityMarketView() {
    const [indices, setIndices] = useState([]);
    const [indexHistory, setIndexHistory] = useState({});
    const [selectedSymbol, setSelectedSymbol] = useState('^CNXAUTO');
    const [range, setRange] = useState('1D');
    const [chartStyle, setChartStyle] = useState('area');
    const [watchlist, setWatchlist] = useState(() => {
        try {
            const saved = JSON.parse(localStorage.getItem('fintracker-equity-watchlist'));
            return Array.isArray(saved) ? saved.map(symbol => WATCHLIST_ALIASES[symbol] || symbol) : ['CNXAUTO', 'CNXENERGY', 'CNXFINANCE', 'CNXFMCG'];
        } catch { return ['CNXAUTO', 'CNXENERGY', 'CNXFINANCE', 'CNXFMCG']; }
    });
    const [search, setSearch] = useState('');
    const [quote, setQuote] = useState(null);
    const [candles, setCandles] = useState([]);
    const [chartLoading, setChartLoading] = useState(true);
    const [updatedAt, setUpdatedAt] = useState(null);
    const [feedError, setFeedError] = useState(false);

    useEffect(() => {
        let active = true;
        const refresh = async () => {
            try {
                const result = await fetchIndices();
                if (!active) return;
                const valid = (result || []).filter(item => item && Number.isFinite(Number(item.rawValue)));
                setIndices(valid);
                setIndexHistory(previous => Object.fromEntries(valid.map(item => [item.symbol, [...(previous[item.symbol] || []), Number(item.rawValue)].slice(-24)])));
                setUpdatedAt(Date.now());
                setFeedError(valid.length === 0);
            } catch { if (active) setFeedError(true); }
        };
        refresh(); const timer = window.setInterval(refresh, 30000);
        return () => { active = false; window.clearInterval(timer); };
    }, []);

    const selected = useMemo(() => indices.find(item => item.symbol === selectedSymbol) || null, [indices, selectedSymbol]);
    useEffect(() => {
        let active = true;
        const ticker = selectedSymbol.replace(/^\^/, '');
        const refresh = async () => {
            setChartLoading(true);
            const timeframe = RANGES[range];
            const [quoteResult, candleResult] = await Promise.all([
                fetchQuote(selectedSymbol),
                fetchCandles(selectedSymbol, { interval: timeframe.interval, range: timeframe.range }),
            ]);
            if (!active) return;
            setQuote(quoteResult);
            const rows = Array.isArray(candleResult?.candles) ? candleResult.candles : Array.isArray(candleResult) ? candleResult : [];
            setCandles(rows.map(row => ({
                t: Number(row.t ?? row.timestamp ?? row.date),
                o: Number(row.o ?? row.open), h: Number(row.h ?? row.high),
                l: Number(row.l ?? row.low), c: Number(row.c ?? row.close),
            })).filter(row => Number.isFinite(row.c)));
            setChartLoading(false);
        };
        refresh(); const timer = window.setInterval(refresh, 60000);
        return () => { active = false; window.clearInterval(timer); };
    }, [selectedSymbol, range]);

    useEffect(() => { localStorage.setItem('fintracker-equity-watchlist', JSON.stringify(watchlist)); }, [watchlist]);

    const sectors = useMemo(() => indices.filter(item => !BENCHMARKS.has(item.name)), [indices]);
    const listed = useMemo(() => sectors.filter(item => `${item.name} ${item.symbol} ${item.group}`.toLowerCase().includes(search.toLowerCase().trim())), [sectors, search]);
    const price = quote?.ltp ?? selected?.rawValue;
    const change = quote?.change ?? changeValue(selected?.change);
    const percent = quote?.changePct ?? Number.parseFloat(selected?.percent) ?? null;
    const positive = Number(change) >= 0;
    const chartValues = candles.flatMap(item => [item.c, item.h, item.l].filter(Number.isFinite));
    const previousClose = quote?.close ?? selected?.previousClose;
    const chartLow = Math.min(...chartValues, Number(previousClose) || Infinity);
    const chartHigh = Math.max(...chartValues, Number(previousClose) || -Infinity);
    const pinned = watchlist.includes(selectedSymbol.replace(/^\^/, ''));
    const toggleWatchlist = () => setWatchlist(previous => pinned ? previous.filter(symbol => symbol !== selectedSymbol.replace(/^\^/, '')) : [...previous, selectedSymbol.replace(/^\^/, '')]);
    const choose = item => { setSelectedSymbol(item.symbol.startsWith('^') ? item.symbol : `^${item.symbol}`); setRange('1D'); };
    const displayName = selected ? (INDEX_TITLES[selected.symbol] || selected.name) : (INDEX_TITLES[selectedSymbol.replace(/^\^/, '')] || selectedSymbol.replace(/^\^/, '').replaceAll('_', ' '));
    const selectedLabel = selected ? (DISPLAY_SYMBOLS[selected.symbol] || selected.symbol) : selectedSymbol.replace(/^\^/, '');
    const quoteTimestamp = quote?.ts || selected?.ts || updatedAt;
    const favourites = watchlist.map(symbol => indices.find(item => item.symbol === symbol)).filter(Boolean);

    return <section className="page-view equity-market-page" aria-label="FinTracker equity market">
        <aside className="equity-left-rail">
            <div className="equity-rail-title"><span>FinTracker lists</span><button type="button" aria-label="Search indices" onClick={() => document.querySelector('.equity-list-search')?.focus()}>⌕</button></div>
            <label className="equity-list-search-wrap"><span aria-hidden="true">⌕</span><input className="equity-list-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search indices" /></label>
            <section className="equity-rail-section"><h2>Market watch <span>{favourites.length}</span></h2>
                {favourites.length ? favourites.map(item => <button type="button" className={`equity-watch-row${selectedSymbol.replace(/^\^/, '') === item.symbol ? ' selected' : ''}`} key={item.symbol} onClick={() => choose(item)}>
                    <span className="equity-watch-copy"><strong>{DISPLAY_SYMBOLS[item.symbol] || item.symbol}</strong><small>{item.group || item.name}</small></span><Sparkline values={indexHistory[item.symbol]} positive={Number(item.change) >= 0} /><span className="equity-watch-price"><strong>{fmt(item.rawValue)}</strong><small className={Number(item.change) >= 0 ? 'positive-text' : 'negative-text'}>{item.percent}</small></span>
                </button>) : <p className="equity-rail-empty">Select an index to add it to your watchlist.</p>}
            </section>
            <section className="equity-rail-section equity-sector-list"><h2>Equity sectors <span>{sectors.length}</span></h2>
                {listed.map(item => <button type="button" className={`equity-watch-row${selectedSymbol.replace(/^\^/, '') === item.symbol ? ' selected' : ''}`} key={item.symbol} onClick={() => choose(item)}>
                    <span className="equity-watch-copy"><strong>{DISPLAY_SYMBOLS[item.symbol] || item.symbol}</strong><small>{item.group}</small></span><Sparkline values={indexHistory[item.symbol]} positive={Number(item.change) >= 0} /><span className="equity-watch-price"><strong>{fmt(item.rawValue)}</strong><small className={Number(item.change) >= 0 ? 'positive-text' : 'negative-text'}>{item.percent}</small></span>
                </button>)}
                {!listed.length && <p className="equity-rail-empty">{feedError ? 'Sector quotes unavailable.' : 'Loading sector indices…'}</p>}
            </section>
        </aside>

        <main className="equity-center-column">
            <nav className="equity-breadcrumb" aria-label="Breadcrumb"><span>Markets</span><span aria-hidden="true">/</span><span>{selectedLabel}: INDEXNSE</span></nav>
            <div className="equity-quote-heading"><div><h1>{displayName}</h1><div className="equity-price-line"><strong>{fmt(price)}</strong><span className={positive ? 'positive-text' : 'negative-text'}>{positive ? '▲' : '▼'} {Math.abs(Number(change) || 0).toFixed(2)} ({Math.abs(Number(percent) || 0).toFixed(2)}%) Today</span></div><p>{quoteTimestamp ? `Last refreshed ${new Date(quoteTimestamp).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', second: '2-digit' })}` : 'Waiting for market quote'} · Provider prices may be delayed</p></div><button type="button" className={`equity-add-button${pinned ? ' is-added' : ''}`} onClick={toggleWatchlist} aria-pressed={pinned}>{pinned ? '✓ Added' : '+ Add to watchlist'} <span>⌄</span></button></div>

            <section className="equity-chart-card" aria-label={`${displayName} price chart`}>
                <div className="equity-chart-toolbar"><label>Chart <select value={chartStyle} onChange={event => setChartStyle(event.target.value)}><option value="area">Area</option><option value="line">Line</option></select></label><span className="equity-chart-toolbar-note">{range === '1D' ? 'Intraday' : `${range} price history`}</span></div>
                <div className="equity-chart-plot">
                    <div className="equity-y-axis">{[chartHigh, chartHigh - (chartHigh - chartLow) / 3, chartHigh - (chartHigh - chartLow) * 2 / 3, chartLow].map((value, index) => <span key={index}>{fmt(value)}</span>)}</div>
                    <div className="equity-chart-inner">{chartLoading && !candles.length ? <div className="equity-chart-message">Loading market chart…</div> : <PriceChart candles={candles} previousClose={previousClose} positive={positive} style={chartStyle} />}<div className="equity-x-axis"><span>{candles[0]?.t ? new Date(candles[0].t).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : 'Start'}</span><span>{candles[Math.floor(candles.length / 2)]?.t ? new Date(candles[Math.floor(candles.length / 2)].t).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : range}</span><span>{candles.at(-1)?.t ? new Date(candles.at(-1).t).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : 'Today'}</span></div></div>
                    {Number.isFinite(Number(previousClose)) && <span className="equity-prev-close">Prev. close <strong>{fmt(previousClose)}</strong></span>}
                </div>
                <div className="equity-range-bar">{Object.keys(RANGES).map(label => <button type="button" key={label} className={range === label ? 'active' : ''} aria-pressed={range === label} onClick={() => setRange(label)}>{label}</button>)}</div>
            </section>

            <section className="equity-overview"><h2>Overview</h2><div className="equity-overview-grid">
                {[['Open', quote?.open ?? selected?.open ?? candles[0]?.o], ['Low', quote?.low ?? selected?.low ?? Math.min(...candles.map(candle => candle.l).filter(Number.isFinite))], ['52-week low', quote?.low52], ['High', quote?.high ?? selected?.high ?? Math.max(...candles.map(candle => candle.h).filter(Number.isFinite))], ['Previous close', quote?.close ?? selected?.previousClose], ['52-week high', quote?.high52]].map(([label, value]) => <div className="equity-overview-item" key={label}><span>{label}</span><strong>{fmt(value)}</strong></div>)}
            </div></section>
            <p className="equity-data-note">Yahoo Finance quotes refresh automatically. Market prices may be delayed by around 15 minutes during trading hours.</p>
        </main>

        <aside className="equity-research-rail"><div className="equity-research-heading"><h2>Research</h2><span aria-hidden="true">⋯</span></div><div className="equity-research-intro"><span>FinTracker Research</span><h3>Explore what’s moving</h3><p>Choose a prompt to focus the market view.</p></div>
            <div className="equity-research-prompts"><button type="button" onClick={() => { const auto = indices.find(item => item.symbol === 'CNXAUTO'); if (auto) choose(auto); }}>What’s happening with Nifty Auto today? <span>↗</span></button><button type="button" onClick={() => { const leader = [...sectors].sort((a, b) => changeValue(b.change) - changeValue(a.change))[0]; if (leader) choose(leader); }}>Which equity sector is leading? <span>↗</span></button><button type="button" onClick={() => { const nifty = indices.find(item => item.name === 'NIFTY 50'); if (nifty) choose(nifty); }}>View the Nifty 50 market trend <span>↗</span></button></div>
            <div className="equity-research-foot"><strong>Market data</strong><p>Quotes from Yahoo Finance. Refresh and availability follow the provider’s feed.</p><span>{feedError ? 'Feed unavailable' : updatedAt ? `Updated ${new Date(updatedAt).toLocaleTimeString('en-IN')}` : 'Connecting…'}</span></div>
        </aside>
    </section>;
}
