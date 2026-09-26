import React, { useEffect, useMemo, useState } from 'react';
import { fetchIndices } from '../../services/growwService';

const BENCHMARKS = ['NIFTY 50', 'SENSEX', 'BANK NIFTY', 'NIFTY IT', 'NIFTY MID 50'];
const number = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value))
    ? Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '—';

function MiniTrend({ points = [], positive = true }) {
    if (points.length < 2) return <span className="equity-trend-pending">Collecting trend</span>;
    const values = points.map(Number);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const coords = values.map((value, index) => `${(index / (values.length - 1)) * 100},${25 - ((value - min) / range) * 19}`).join(' ');
    const color = positive ? '#059669' : '#ef4444';
    return <svg className="equity-trend" viewBox="0 0 100 30" role="img" aria-label="Recent quote trend">
        <defs><linearGradient id={`equity-fill-${positive ? 'up' : 'down'}`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".2" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
        <polyline points={`0,30 ${coords} 100,30`} fill={`url(#equity-fill-${positive ? 'up' : 'down'})`} stroke="none" />
        <polyline points={coords} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle className="equity-trend-dot" cx={coords.split(' ').at(-1)?.split(',')[0]} cy={coords.split(' ').at(-1)?.split(',')[1]} r="2.6" fill={color} />
    </svg>;
}

export default function EquityMarketView() {
    const [indices, setIndices] = useState([]);
    const [trends, setTrends] = useState({});
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState('All');
    const [updatedAt, setUpdatedAt] = useState(null);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let active = true;
        const refresh = async () => {
            try {
                const result = await fetchIndices();
                if (!active) return;
                const quotes = (result || []).filter(item => item && Number.isFinite(Number(item.rawValue)));
                setIndices(quotes);
                setTrends(previous => Object.fromEntries(quotes.map(item => {
                    const history = previous[item.name] || [];
                    return [item.name, [...history, Number(item.rawValue)].slice(-24)];
                })));
                setUpdatedAt(Date.now());
                setFailed(quotes.length === 0);
            } catch {
                if (active) setFailed(true);
            } finally {
                if (active) setLoading(false);
            }
        };
        refresh();
        const timer = window.setInterval(refresh, 30000);
        return () => { active = false; window.clearInterval(timer); };
    }, []);

    const benchmarks = useMemo(() => indices.filter(item => BENCHMARKS.includes(item.name)), [indices]);
    const sectors = useMemo(() => indices.filter(item => !BENCHMARKS.includes(item.name)), [indices]);
    const groups = useMemo(() => ['All', ...new Set(sectors.map(item => item.group).filter(Boolean))], [sectors]);
    const visibleSectors = useMemo(() => sectors.filter(item =>
        (filter === 'All' || item.group === filter) && `${item.name} ${item.symbol} ${item.group}`.toLowerCase().includes(query.toLowerCase().trim())
    ), [sectors, filter, query]);
    const visibleBenchmarks = useMemo(() => benchmarks.filter(item => `${item.name} ${item.symbol}`.toLowerCase().includes(query.toLowerCase().trim())), [benchmarks, query]);

    const renderRow = item => {
        const positive = Number(item.change) >= 0;
        return <tr key={item.symbol}>
            <td><div className="equity-symbol"><strong>{item.symbol}</strong><span>{item.name}</span></div></td>
            <td>{item.group}</td>
            <td><MiniTrend points={trends[item.name]} positive={positive} /></td>
            <td className="equity-number"><strong>{number(item.rawValue)}</strong></td>
            <td className={positive ? 'equity-positive' : 'equity-negative'}>{item.percent}</td>
            <td className="equity-number">{number(item.previousClose)}</td>
            <td className="equity-number">{number(item.open)}</td>
            <td className="equity-number">{number(item.high)}</td>
            <td className="equity-number">{number(item.low)}</td>
            <td className="equity-number">{Number.isFinite(Number(item.volume)) && Number(item.volume) > 0 ? Number(item.volume).toLocaleString('en-IN') : '—'}</td>
        </tr>;
    };

    return <section className="page-view equity-market-page" aria-labelledby="equity-market-title">
        <header className="page-header equity-market-header">
            <div><span className="equity-eyebrow">INDIAN MARKETS</span><h1 className="page-title" id="equity-market-title">Equity Market</h1><p className="page-subtitle">Indian benchmark and sector index quotes, refreshed automatically.</p></div>
            <div className={`equity-feed-status${failed ? ' is-error' : ''}`} role="status" aria-live="polite"><span className="equity-status-dot" />{failed ? 'Market feed unavailable' : loading ? 'Connecting to market feed' : 'Quote feed connected'}</div>
        </header>

        {failed && <div className="equity-feed-notice">Quotes are temporarily unavailable. The page will retry automatically; no sample prices are shown.</div>}

        <section className="equity-watchlist" aria-labelledby="equity-watchlist-title">
            <div className="equity-section-heading"><div><h2 id="equity-watchlist-title">Market watch</h2><p>Major Indian equity benchmarks</p></div><span>{updatedAt ? `Updated ${new Date(updatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : 'Waiting for quotes'}</span></div>
            <div className="equity-benchmark-grid">
                {visibleBenchmarks.length ? visibleBenchmarks.map(item => <article className="equity-benchmark-card" key={item.symbol}>
                    <div className="equity-benchmark-top"><strong>{item.name}</strong><span className="equity-live-badge">● QUOTE</span></div>
                    <div className="equity-benchmark-main"><div><strong>{number(item.rawValue)}</strong><span className={Number(item.change) >= 0 ? 'equity-positive' : 'equity-negative'}>{item.change} ({item.percent})</span></div><MiniTrend points={trends[item.name]} positive={Number(item.change) >= 0} /></div>
                </article>) : <div className="equity-empty">{loading ? 'Loading benchmark quotes…' : 'No matching benchmark quotes are available.'}</div>}
            </div>
        </section>

        <section className="equity-sector-section" aria-labelledby="equity-sectors-title">
            <div className="equity-section-heading equity-table-heading"><div><h2 id="equity-sectors-title">Equity sectors</h2><p>Sector indices · updates automatically every 30 seconds</p></div><label className="equity-search"><span className="equity-visually-hidden">Search equity indices</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search indices…" /></label></div>
            <div className="equity-filters" role="group" aria-label="Filter sectors">{groups.map(group => <button key={group} type="button" className={filter === group ? 'active' : ''} onClick={() => setFilter(group)} aria-pressed={filter === group}>{group}</button>)}</div>
            <div className="equity-table-wrap"><table className="equity-table"><thead><tr><th>Symbol</th><th>Sector</th><th>Trend</th><th>Price</th><th>Change</th><th>Prev close</th><th>Open</th><th>High</th><th>Low</th><th>Volume</th></tr></thead><tbody>{visibleSectors.map(renderRow)}</tbody></table>
                {!visibleSectors.length && <div className="equity-empty">{loading ? 'Loading sector quotes…' : 'No sector quotes match your search.'}</div>}
            </div>
        </section>
        <p className="equity-disclaimer">Quotes are sourced through Yahoo Finance and refresh every 30 seconds. Yahoo market prices can be delayed by around 15 minutes during trading hours. This page is informational and does not place trades.</p>
    </section>;
}
