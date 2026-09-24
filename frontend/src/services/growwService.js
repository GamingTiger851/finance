/**
 * growwService.js — Frontend service for the Groww Trading API proxy
 *
 * All calls go through our own backend (/api/groww/*) which holds the
 * API token server-side. Callers receive normalised data objects with
 * clean fallback behaviour when the API is unavailable.
 */

const BASE = '/api/live';

// ── Auth header helper ────────────────────────────────────────────────────────
function authHeader() {
    const token = localStorage.getItem('fintrack_session')
        ? JSON.parse(localStorage.getItem('fintrack_session')).accessToken
        : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch(path, options = {}) {
    const res = await fetch(BASE + path, {
        headers: { 'Content-Type': 'application/json', ...authHeader(), ...(options.headers || {}) },
        ...options,
    });
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, ...json };
}

// ─────────────────────────────────────────────────────────────────────────────
// checkStatus()
// Returns API health info including whether the IP is whitelisted
// ─────────────────────────────────────────────────────────────────────────────
export async function checkGrowwStatus() {
    try {
        return await apiFetch('/status');
    } catch {
        return { configured: false, reachable: false };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// fetchIndices()
// Returns live Nifty50, Sensex, BankNifty etc. from Groww
// Falls back to null entries that the caller can replace with static data
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchIndices() {
    try {
        const result = await apiFetch('/indices');
        if (result.success && Array.isArray(result.data)) {
            return result.data; // may contain nulls for unavailable indices
        }
        return null;
    } catch {
        return null;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// fetchQuote(symbol, exchange?)
// Returns live quote for a single stock
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchQuote(symbol, exchange = 'NSE') {
    try {
        const result = await apiFetch(`/quote/${encodeURIComponent(symbol)}?exchange=${exchange}`);
        if (result.success && result.data) return result.data;
        return null;
    } catch {
        return null;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// fetchLtpBatch(symbols)
// symbols: [{symbol, exchange}]
// Returns array of live LTP data; gracefully returns [] on error
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchLtpBatch(symbols) {
    if (!symbols || symbols.length === 0) return [];
    try {
        const result = await apiFetch('/batch', {
            method: 'POST',
            body: JSON.stringify({ symbols: symbols.map(s => s.symbol) }),
        });
        if (result.success && Array.isArray(result.data)) return result.data;
        return [];
    } catch {
        return [];
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// fetchCandles(symbol, { exchange, interval, from, to })
// Returns historical OHLCV candle data
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchCandles(symbol, { exchange = 'NSE', interval = '1d', from, to } = {}) {
    const params = new URLSearchParams({ exchange, interval });
    if (from) params.set('from', from);
    if (to)   params.set('to', to);
    try {
        const result = await apiFetch(`/candles/${encodeURIComponent(symbol)}?${params}`);
        if (result.success) return result.data;
        return null;
    } catch {
        return null;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// mergeWithStaticData(staticStocks, liveData)
// Takes static stock objects + live LTP batch results,
// returns a new array with live price/change fields overlaid
// ─────────────────────────────────────────────────────────────────────────────
export function mergeWithStaticData(staticStocks, liveData) {
    if (!liveData || liveData.length === 0) return staticStocks;

    const liveMap = new Map();
    for (const item of liveData) {
        if (item && item.symbol) liveMap.set(item.symbol.toUpperCase(), item);
    }

    return staticStocks.map(stock => {
        const live = liveMap.get(stock.symbol.toUpperCase());
        if (!live || live.ltp == null) return stock;

        const ltp         = live.ltp;
        const close       = live.close;
        const hasChange   = Number.isFinite(live.change);
        const hasChangePct = Number.isFinite(live.changePct);
        const change      = hasChange ? live.change : null;
        const changePct   = hasChangePct ? live.changePct : null;
        const isUp        = hasChange ? change >= 0 : null;

        return {
            ...stock,
            price:         ltp,
            change:        change == null ? null : Math.abs(change),
            changePercent: changePct == null ? null : Math.abs(changePct),
            isUp,
            livePrice:     true,  // flag so UI can show a "LIVE" badge
            high52:        live.high != null ? Math.max(stock.high52, live.high) : stock.high52,
            low52:         live.low  != null ? Math.min(stock.low52,  live.low)  : stock.low52,
        };
    });
}
