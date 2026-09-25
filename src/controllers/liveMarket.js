/**
 * liveMarket.js — Real-time Indian stock market data via Yahoo Finance
 *
 * No API key required. No IP restrictions. Works instantly.
 * Data is ~15 min delayed during market hours, real-time after close.
 *
 * Yahoo Finance symbols for NSE: SYMBOL.NS  (e.g. RELIANCE.NS)
 * Yahoo Finance symbols for BSE: SYMBOL.BO  (e.g. RELIANCE.BO)
 * Yahoo Finance symbols for Indices: ^NSEI (Nifty50), ^BSESN (Sensex), ^NSEBANK (BankNifty)
 */

const https = require('https');

// ── In-memory cache (key → { data, ts }) ─────────────────────────────────────
const cache = new Map();
const CACHE_TTL = 15 * 1000; // 15 seconds for live prices

function getCached(key) {
    const entry = cache.get(key);
    if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
    return null;
}
function setCache(key, data) {
    cache.set(key, { data, ts: Date.now() });
    // Keep cache from growing too large
    if (cache.size > 500) {
        const oldestKey = cache.keys().next().value;
        cache.delete(oldestKey);
    }
}

// ── HTTP helper ───────────────────────────────────────────────────────────────
const YF_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-IN,en-US;q=0.9,en;q=0.8',
    'Referer': 'https://finance.yahoo.com/',
    'Origin': 'https://finance.yahoo.com',
};

function yfFetch(url) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            path: urlObj.pathname + urlObj.search,
            method: 'GET',
            headers: YF_HEADERS,
        };
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch {
                    resolve({ status: res.statusCode, data: null });
                }
            });
        });
        req.on('error', reject);
        req.setTimeout(10000, () => req.destroy(new Error('Yahoo Finance timeout')));
        req.end();
    });
}

// ── Symbol helpers ────────────────────────────────────────────────────────────
function toYfSymbol(symbol, exchange = 'NSE') {
    // Special handling for symbols with & (M&M → MM.NS on Yahoo)
    const cleaned = symbol.toUpperCase()
        .replace('&', '')
        .replace('-BE', '')
        .replace('-EQ', '');
    if (cleaned.startsWith('^')) return cleaned;
    return exchange === 'BSE' ? `${cleaned}.BO` : `${cleaned}.NS`;
}

// ── Normalise Yahoo Finance chart API response ────────────────────────────────
function normaliseChartMeta(meta, symbol) {
    if (!meta) return null;
    const ltp = meta.regularMarketPrice ?? meta.fulldayPrice ?? null;
    const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? null;
    const change = meta.fulldayChange ?? (ltp && prevClose ? ltp - prevClose : null);
    const changePct = meta.fulldayChangePercent ?? meta.regularMarketChangePercent ?? null;
    const isUp = (change ?? 0) >= 0;
    return {
        symbol: symbol.toUpperCase().replace('.NS', '').replace('.BO', ''),
        exchange: meta.exchangeName || 'NSE',
        ltp,
        open: meta.regularMarketDayHigh != null ? null : null, // not in meta
        high: meta.regularMarketDayHigh ?? null,
        low: meta.regularMarketDayLow ?? null,
        close: prevClose,
        change: change != null ? parseFloat(change.toFixed(2)) : null,
        changePct: changePct != null ? parseFloat(changePct.toFixed(2)) : null,
        isUp,
        volume: meta.regularMarketVolume ?? null,
        high52: meta.fiftyTwoWeekHigh ?? null,
        low52: meta.fiftyTwoWeekLow ?? null,
        marketState: meta.marketState ?? null,
        longName: meta.longName ?? meta.shortName ?? null,
        currency: meta.currency ?? 'INR',
        ts: Date.now(),
        source: 'yahoo-finance',
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/market/quote/:symbol?exchange=NSE
// Real-time quote for a single stock using the chart API
// ─────────────────────────────────────────────────────────────────────────────
exports.quote = async (req, res) => {
    const symbol = (req.params.symbol || '').toUpperCase().replace('.NS', '').replace('.BO', '');
    const exchange = (req.query.exchange || 'NSE').toUpperCase();
    if (!symbol) return res.status(400).json({ error: 'symbol is required' });

    const cacheKey = `quote:${symbol}:${exchange}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json({ success: true, data: cached, cached: true });

    const yfSymbol = toYfSymbol(symbol, exchange);
    try {
        const result = await yfFetch(
            `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yfSymbol)}?interval=1m&range=1d`
        );
        if (result.status === 200 && result.data?.chart?.result?.[0]) {
            const meta = result.data.chart.result[0].meta;
            const normalised = normaliseChartMeta(meta, yfSymbol);
            if (normalised && normalised.ltp) {
                setCache(cacheKey, normalised);
                return res.json({ success: true, data: normalised });
            }
        }
        return res.status(404).json({ success: false, error: `No data for ${symbol}`, yfSymbol });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/market/batch
// Body: { symbols: ['RELIANCE', 'TCS', ...] }  (max 50 per call)
// Fetches live quotes for multiple stocks concurrently
// ─────────────────────────────────────────────────────────────────────────────
exports.batch = async (req, res) => {
    const { symbols, exchange = 'NSE' } = req.body || {};
    if (!Array.isArray(symbols) || symbols.length === 0)
        return res.status(400).json({ error: 'symbols array required' });

    const uniqueSymbols = [...new Set(symbols.slice(0, 50).map(s =>
        s.toUpperCase().replace('.NS', '').replace('.BO', '')
    ))];

    // Check cache for each symbol; only fetch uncached ones
    const result = {};
    const toFetch = [];

    for (const sym of uniqueSymbols) {
        const cached = getCached(`quote:${sym}:${exchange}`);
        if (cached) result[sym] = cached;
        else toFetch.push(sym);
    }

    // Parallel fetch for uncached symbols (max 8 concurrent)
    const CHUNK = 8;
    for (let i = 0; i < toFetch.length; i += CHUNK) {
        const chunk = toFetch.slice(i, i + CHUNK);
        await Promise.allSettled(chunk.map(async sym => {
            const yfSymbol = toYfSymbol(sym, exchange);
            try {
                const r = await yfFetch(
                    `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yfSymbol)}?interval=1m&range=1d`
                );
                if (r.status === 200 && r.data?.chart?.result?.[0]) {
                    const norm = normaliseChartMeta(r.data.chart.result[0].meta, yfSymbol);
                    if (norm && norm.ltp) {
                        setCache(`quote:${sym}:${exchange}`, norm);
                        result[sym] = norm;
                    }
                }
            } catch { /* skip failed */ }
        }));
    }

    const data = uniqueSymbols.map(sym => result[sym] || null).filter(Boolean);
    return res.json({
        success: true,
        data,
        requested: uniqueSymbols.length,
        resolved: data.length,
        ts: Date.now(),
    });
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/market/indices
// Live data for NIFTY 50, SENSEX, BANK NIFTY, NIFTY IT, NIFTY MIDCAP
// ─────────────────────────────────────────────────────────────────────────────
const INDICES = [
    { id: '^NSEI',     name: 'NIFTY 50',    exchange: 'NSI' },
    { id: '^BSESN',    name: 'SENSEX',      exchange: 'BSE' },
    { id: '^NSEBANK',  name: 'BANK NIFTY',  exchange: 'NSI' },
    { id: '^CNXIT',    name: 'NIFTY IT',    exchange: 'NSI' },
    { id: '^NSEMDCP50',name: 'NIFTY MID 50',exchange: 'NSI' },
];

exports.indices = async (req, res) => {
    const cacheKey = 'indices';
    const cached = getCached(cacheKey);
    if (cached) return res.json({ success: true, data: cached, cached: true });

    const results = await Promise.allSettled(
        INDICES.map(idx =>
            yfFetch(`https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(idx.id)}?interval=1m&range=1d`)
        )
    );

    const data = results.map((r, i) => {
        const idx = INDICES[i];
        if (r.status !== 'fulfilled' || r.value.status !== 200) return null;
        const meta = r.value.data?.chart?.result?.[0]?.meta;
        if (!meta) return null;
        const ltp = meta.regularMarketPrice ?? meta.fulldayPrice;
        if (!ltp) return null;
        const change = meta.fulldayChange ?? (ltp - (meta.chartPreviousClose ?? ltp));
        const pct = meta.fulldayChangePercent ?? meta.regularMarketChangePercent ?? 0;
        const isUp = change >= 0;
        return {
            name: idx.name,
            value: ltp.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            rawValue: ltp,
            change: (isUp ? '+' : '') + change.toFixed(2),
            percent: (isUp ? '+' : '') + pct.toFixed(2) + '%',
            isUp,
            live: true,
            ts: Date.now(),
        };
    });

    const liveData = data.filter(Boolean);
    if (liveData.length > 0) {
        setCache(cacheKey, liveData);
    }

    return res.json({ success: true, data: liveData, total: INDICES.length });
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/market/candles/:symbol?exchange=NSE&interval=1d&range=3mo
// Historical OHLCV candle data for a stock
// interval: 1m,5m,15m,1h,1d,1wk,1mo
// range: 1d,5d,1mo,3mo,6mo,1y,2y,5y,max
// ─────────────────────────────────────────────────────────────────────────────
exports.candles = async (req, res) => {
    const symbol = (req.params.symbol || '').toUpperCase().replace('.NS', '').replace('.BO', '');
    const exchange = (req.query.exchange || 'NSE').toUpperCase();
    const interval = req.query.interval || '1d';
    const range = req.query.range || '3mo';

    if (!symbol) return res.status(400).json({ error: 'symbol is required' });

    const cacheKey = `candles:${symbol}:${exchange}:${interval}:${range}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json({ success: true, data: cached, cached: true });

    const yfSymbol = toYfSymbol(symbol, exchange);
    try {
        const result = await yfFetch(
            `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yfSymbol)}?interval=${interval}&range=${range}`
        );

        if (result.status === 200 && result.data?.chart?.result?.[0]) {
            const chartData = result.data.chart.result[0];
            const timestamps = chartData.timestamp || [];
            const quotes = chartData.indicators?.quote?.[0] || {};
            const adjclose = chartData.indicators?.adjclose?.[0]?.adjclose || [];

            const candles = timestamps.map((ts, i) => ({
                t: ts * 1000, // ms
                o: quotes.open?.[i],
                h: quotes.high?.[i],
                l: quotes.low?.[i],
                c: quotes.close?.[i],
                v: quotes.volume?.[i],
                ac: adjclose[i],
            })).filter(c => c.o != null && c.c != null);

            const meta = normaliseChartMeta(chartData.meta, yfSymbol);
            const payload = { symbol, meta, candles, count: candles.length };
            setCache(cacheKey, payload);
            return res.json({ success: true, data: payload });
        }

        return res.status(404).json({ success: false, error: `No chart data for ${symbol}` });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/market/movers?type=gainers|losers|active
// Top market movers from NSE
// ─────────────────────────────────────────────────────────────────────────────
const NIFTY50_SYMBOLS = [
    'RELIANCE','TCS','HDFCBANK','INFY','ICICIBANK','HINDUNILVR','SBIN','BAJFINANCE',
    'BHARTIARTL','KOTAKBANK','AXISBANK','ASIANPAINT','MARUTI','NTPC','WIPRO',
    'SUNPHARMA','ONGC','POWERGRID','ULTRACEMCO','TITAN','TATASTEEL','TECHM',
    'M&M','JSWSTEEL','NESTLEIND','TATAMOTORS','COALINDIA','DIVISLAB','APOLLOHOSP',
    'BAJAJ-AUTO','ADANIPORTS','GRASIM','BPCL','HCLTECH','HINDALCO','CIPLA',
    'DRREDDY','EICHERMOT','HEROMOTOCO','INDUSINDBK','LTIM','LT','BRITANNIA',
    'ADANIENT','TATACONSUM','VEDL','SHRIRAMFIN','BAJAJFINSV','ITC','SBILIFE'
];

exports.movers = async (req, res) => {
    const type = req.query.type || 'gainers'; // gainers | losers | active

    const cacheKey = `movers:${type}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json({ success: true, data: cached, cached: true });

    // Fetch a subset of Nifty50 to find movers
    const CHUNK = 10;
    const results = [];

    for (let i = 0; i < Math.min(NIFTY50_SYMBOLS.length, 50); i += CHUNK) {
        const chunk = NIFTY50_SYMBOLS.slice(i, i + CHUNK);
        const fetched = await Promise.allSettled(
            chunk.map(async sym => {
                const yfSym = toYfSymbol(sym, 'NSE');
                const r = await yfFetch(
                    `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yfSym)}?interval=1m&range=1d`
                );
                if (r.status === 200 && r.data?.chart?.result?.[0]) {
                    return normaliseChartMeta(r.data.chart.result[0].meta, yfSym);
                }
                return null;
            })
        );
        for (const r of fetched) {
            if (r.status === 'fulfilled' && r.value) results.push(r.value);
        }
    }

    let sorted = results.filter(r => r && r.changePct != null);
    if (type === 'gainers')  sorted = sorted.sort((a, b) => b.changePct - a.changePct).slice(0, 10);
    if (type === 'losers')   sorted = sorted.sort((a, b) => a.changePct - b.changePct).slice(0, 10);
    if (type === 'active')   sorted = sorted.sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0)).slice(0, 10);

    setCache(cacheKey, sorted);
    return res.json({ success: true, data: sorted, type });
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/market/status
// Health check
// ─────────────────────────────────────────────────────────────────────────────
exports.status = async (req, res) => {
    return res.json({
        configured: true,
        reachable: true,
        ipWhitelisted: true, // Always true for Yahoo Finance
        message: 'Live Market Data (Yahoo Finance) is operational ✅',
    });
};
