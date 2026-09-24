/**
 * Groww Trading API - Backend Proxy Controller
 * Keeps GROWW_API_TOKEN server-side; forwards requests to api.groww.in
 */

const https = require('https');
const http = require('http');

const GROWW_BASE = 'https://api.groww.in';
const TOKEN = process.env.GROWW_API_TOKEN || '';

// ── Tiny HTTP helper (no extra deps) ──────────────────────────────────────────
function growwFetch(path, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(GROWW_BASE + path);
        const options = {
            hostname: url.hostname,
            port: 443,
            path: url.pathname + url.search,
            method,
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        };

        if (body) {
            const bodyStr = JSON.stringify(body);
            options.headers['Content-Length'] = Buffer.byteLength(bodyStr);
        }

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch {
                    resolve({ status: res.statusCode, data: { raw: data } });
                }
            });
        });

        req.on('error', reject);
        req.setTimeout(8000, () => { req.destroy(new Error('Groww API timeout')); });
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

// ── Normalise a Groww LTP response into our standard shape ──────────────────
function normaliseLtp(symbol, exchange, raw) {
    if (!raw || raw.status === 'FAILURE') return null;
    // Groww returns different shapes for different endpoint versions
    const d = raw.payload || raw.data || raw;
    if (!d) return null;
    const ltp  = d.ltp  ?? d.last_price  ?? d.lastPrice  ?? null;
    const open  = d.open ?? d.ohlc?.open ?? null;
    const high  = d.high ?? d.ohlc?.high ?? null;
    const low   = d.low  ?? d.ohlc?.low  ?? null;
    const close = d.previousClose ?? d.prev_close ?? d.close ?? null;
    const change = d.netChange ?? d.change ?? (ltp && close ? ltp - close : null);
    const changePct = d.percentChange ?? d.pChange ?? (ltp && close ? ((ltp - close) / close) * 100 : null);
    const volume = d.volume ?? d.tradedVolume ?? null;
    return { symbol, exchange, ltp, open, high, low, close, change, changePct, volume, ts: Date.now() };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/groww/quote/:symbol?exchange=NSE
// Returns LTP + OHLC for a single equity
// ─────────────────────────────────────────────────────────────────────────────
exports.quote = async (req, res) => {
    const symbol   = (req.params.symbol || '').toUpperCase();
    const exchange = (req.query.exchange || 'NSE').toUpperCase();

    if (!symbol) return res.status(400).json({ error: 'symbol is required' });
    if (!TOKEN)  return res.status(503).json({ error: 'Groww API token not configured' });

    try {
        // Try the live-data quote endpoint (requires live-data plan)
        const result = await growwFetch(
            `/v1/live-data/quote?exchange=${exchange}&tradingsymbol=${symbol}`
        );

        if (result.status === 200) {
            const normalised = normaliseLtp(symbol, exchange, result.data);
            if (normalised) return res.json({ success: true, data: normalised, source: 'groww-live' });
        }

        // Fallback: try OHLC endpoint
        const ohlcResult = await growwFetch(
            `/v1/live-data/ohlc?exchange=${exchange}&tradingsymbol=${symbol}`
        );
        if (ohlcResult.status === 200) {
            const normalised = normaliseLtp(symbol, exchange, ohlcResult.data);
            if (normalised) return res.json({ success: true, data: normalised, source: 'groww-ohlc' });
        }

        // Return the raw API response so the client knows what happened
        return res.status(result.status).json({
            success: false,
            error: result.data?.error?.message || 'Groww API error',
            rawStatus: result.status,
            hint: result.status === 403
                ? 'IP not whitelisted for Groww live-data. Register your static IP on groww.in/trade-api/api-keys'
                : undefined
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/groww/ltp-batch
// Body: { symbols: [{symbol, exchange}] }   (max 100 per call)
// Returns live LTP for multiple symbols at once
// ─────────────────────────────────────────────────────────────────────────────
exports.ltpBatch = async (req, res) => {
    const { symbols } = req.body || {};
    if (!Array.isArray(symbols) || symbols.length === 0) {
        return res.status(400).json({ error: 'symbols array required' });
    }
    if (!TOKEN) return res.status(503).json({ error: 'Groww API token not configured' });

    // Groww batch LTP endpoint accepts an array of instruments
    try {
        const instruments = symbols.slice(0, 100).map(s => ({
            exchange: (s.exchange || 'NSE').toUpperCase(),
            tradingsymbol: (s.symbol || s.tradingsymbol || '').toUpperCase(),
        }));

        const result = await growwFetch('/v1/live-data/ltp', 'POST', { instruments });

        if (result.status === 200) {
            const payload = result.data?.payload || result.data?.data || [];
            const mapped = Array.isArray(payload)
                ? payload.map(item => normaliseLtp(item.tradingsymbol || item.symbol, item.exchange, item))
                : [];
            return res.json({ success: true, data: mapped.filter(Boolean), source: 'groww-batch-ltp' });
        }

        return res.status(result.status).json({
            success: false,
            error: result.data?.error?.message || 'Groww batch LTP failed',
            rawStatus: result.status,
            hint: result.status === 403
                ? 'IP not whitelisted — register static IP on groww.in/trade-api/api-keys'
                : undefined
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/groww/indices
// Returns Nifty 50, Sensex, Bank Nifty, NIFTY IT, BSE Midcap live data
// ─────────────────────────────────────────────────────────────────────────────
const INDEX_INSTRUMENTS = [
    { symbol: 'NIFTY', exchange: 'NSE', display: 'NIFTY 50' },
    { symbol: 'SENSEX', exchange: 'BSE', display: 'SENSEX' },
    { symbol: 'BANKNIFTY', exchange: 'NSE', display: 'BANK NIFTY' },
    { symbol: 'NIFTYIT', exchange: 'NSE', display: 'NIFTY IT' },
    { symbol: 'BSEMIDCAP', exchange: 'BSE', display: 'BSE MIDCAP' },
];

exports.indices = async (req, res) => {
    if (!TOKEN) return res.status(503).json({ error: 'Groww API token not configured' });

    try {
        const results = await Promise.allSettled(
            INDEX_INSTRUMENTS.map(idx =>
                growwFetch(`/v1/live-data/quote?exchange=${idx.exchange}&tradingsymbol=${idx.symbol}`)
            )
        );

        const indices = results.map((r, i) => {
            const idx = INDEX_INSTRUMENTS[i];
            if (r.status === 'fulfilled' && r.value.status === 200) {
                const n = normaliseLtp(idx.symbol, idx.exchange, r.value.data);
                if (n && n.ltp) {
                    const isUp = (n.change ?? 0) >= 0;
                    return {
                        name: idx.display,
                        value: n.ltp.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
                        change: (isUp ? '+' : '') + (n.change ?? 0).toFixed(2),
                        percent: (isUp ? '+' : '') + (n.changePct ?? 0).toFixed(2) + '%',
                        isUp,
                        live: true,
                    };
                }
            }
            return null;
        });

        const liveCount = indices.filter(Boolean).length;
        return res.json({ success: true, data: indices, liveCount, total: indices.length });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/groww/candles/:symbol?exchange=NSE&interval=1d&from=YYYY-MM-DD&to=YYYY-MM-DD
// Historical candle data for a stock
// ─────────────────────────────────────────────────────────────────────────────
exports.candles = async (req, res) => {
    const symbol   = (req.params.symbol || '').toUpperCase();
    const exchange = (req.query.exchange || 'NSE').toUpperCase();
    const interval = req.query.interval || '1d';
    const from     = req.query.from || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
    const to       = req.query.to   || new Date().toISOString().split('T')[0];

    if (!symbol) return res.status(400).json({ error: 'symbol is required' });
    if (!TOKEN)  return res.status(503).json({ error: 'Groww API token not configured' });

    try {
        const result = await growwFetch(
            `/v1/historical-data/candles?exchange=${exchange}&tradingsymbol=${symbol}&interval=${interval}&from=${from}&to=${to}`
        );

        if (result.status === 200) {
            return res.json({ success: true, data: result.data, source: 'groww-historical' });
        }
        return res.status(result.status).json({
            success: false,
            error: result.data?.error?.message || 'Groww historical data failed',
            rawStatus: result.status,
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/groww/status
// Health check — confirms token is present and API is reachable
// ─────────────────────────────────────────────────────────────────────────────
exports.status = async (req, res) => {
    const hasToken = Boolean(TOKEN);
    if (!hasToken) {
        return res.json({ configured: false, message: 'GROWW_API_TOKEN not set in environment' });
    }

    try {
        const ping = await growwFetch('/v1/live-data/quote?exchange=NSE&tradingsymbol=RELIANCE');
        return res.json({
            configured: true,
            apiStatus: ping.status,
            reachable: ping.status !== 0,
            ipWhitelisted: ping.status === 200,
            message: ping.status === 200
                ? 'Groww API is live and this IP is whitelisted ✅'
                : ping.status === 403
                    ? 'Token is valid but this server IP is not whitelisted for live data. Register it on groww.in/trade-api/api-keys'
                    : `Groww API responded with HTTP ${ping.status}`,
        });
    } catch (err) {
        return res.json({ configured: true, reachable: false, error: err.message });
    }
};
