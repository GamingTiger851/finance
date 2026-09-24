/**
 * upstoxService.js — Frontend service for Upstox API proxy
 *
 * Calls our backend (/api/upstox/*) which safely holds the Upstox API token.
 */

import { getAuthHeaders } from './authToken';

const BASE = '/api/upstox';

async function apiFetch(path, options = {}) {
    const res = await fetch(BASE + path, {
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders(), ...(options.headers || {}) },
        ...options,
    });
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, ...json };
}

// Check if Upstox is connected
export async function checkUpstoxStatus() {
    try {
        return await apiFetch('/status');
    } catch {
        return { connected: false };
    }
}

// Fetch Full Quotes for multiple instruments
export async function fetchQuotes(instrumentKeys) {
    if (!instrumentKeys || instrumentKeys.length === 0) return {};
    try {
        const keys = Array.isArray(instrumentKeys) ? instrumentKeys.join(',') : instrumentKeys;
        const result = await apiFetch(`/quotes?instrument_keys=${encodeURIComponent(keys)}`);
        if (!result.ok) throw new Error(result.error || 'Failed to fetch quotes');
        if (result.success && result.data) return result.data;
        return {};
    } catch (e) {
        throw e;
    }
}

// Opens the authenticated server-side Upstox V3 WebSocket as an SSE stream.
// The broker access token is never exposed to browser code.
export function openMarketDataStream(instrumentKeys, onEvent) {
    const controller = new AbortController();
    const keys = [...new Set(instrumentKeys || [])];
    const url = `${BASE}/stream?instrument_keys=${encodeURIComponent(keys.join(','))}`;

    const readStream = async response => {
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `Market stream returned HTTP ${response.status}`);
        }
        if (!response.body) throw new Error('Streaming is not supported by this browser.');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            let boundary;
            while ((boundary = buffer.indexOf('\n\n')) !== -1) {
                const frame = buffer.slice(0, boundary);
                buffer = buffer.slice(boundary + 2);
                const event = frame.match(/^event:\s*(.+)$/m)?.[1]?.trim();
                const data = frame.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trim()).join('\n');
                if (event && data) {
                    try { onEvent(event, JSON.parse(data)); }
                    catch (error) { console.warn('Invalid Upstox stream event:', error); }
                }
            }
        }
    };

    fetch(url, {
        headers: { ...getAuthHeaders(), Accept: 'text/event-stream' },
        signal: controller.signal
    }).then(readStream).catch(error => {
        if (error.name !== 'AbortError') onEvent('status', { status: 'error', message: error.message });
    });

    return () => controller.abort();
}

// Fetch LTP for multiple instruments
export async function fetchLtp(instrumentKeys) {
    if (!instrumentKeys || instrumentKeys.length === 0) return {};
    try {
        const keys = Array.isArray(instrumentKeys) ? instrumentKeys.join(',') : instrumentKeys;
        const result = await apiFetch(`/ltp?instrument_keys=${encodeURIComponent(keys)}`);
        if (!result.ok) throw new Error(result.error || result.errors?.[0]?.message || result.message || 'Failed to fetch Upstox LTP quotes');
        if (result.status === 'success' && result.data) return result.data;
        return {};
    } catch (e) {
        throw e;
    }
}

// Fetch Historical Candles
export async function fetchCandles(instrumentKey, interval = '1d', fromDate = null, toDate = null) {
    try {
        const params = new URLSearchParams({ instrumentKey, interval });
        if (fromDate) params.set('from_date', fromDate);
        if (toDate) params.set('to_date', toDate);
        
        const result = await apiFetch(`/candles?${params.toString()}`);
        if (result.status === 'success' && result.data) return result.data.candles;
        return [];
    } catch {
        return [];
    }
}

import FULL_UPSTOX_MAP from '../data/upstoxInstrumentMap.json';

// Helper: map standard symbols to Upstox instrument keys
export const UPSTOX_INSTRUMENT_MAP = {
    'NIFTY50':   'NSE_INDEX|Nifty 50',
    'BANKNIFTY': 'NSE_INDEX|Nifty Bank',
    'SENSEX':    'BSE_INDEX|SENSEX',
    ...FULL_UPSTOX_MAP
};

export function getInstrumentKey(symbol) {
    return UPSTOX_INSTRUMENT_MAP[symbol.toUpperCase()] || `NSE_EQ|${symbol.toUpperCase()}`; // fallback
}

// Upstox quote responses key entries as EXCHANGE:SYMBOL, while instrument
// mappings use EXCHANGE|ISIN. Match the response key or its instrument token.
export function getQuoteForInstrument(quotes, instrumentKey) {
    if (!quotes || !instrumentKey) return null;
    if (quotes[instrumentKey]) return quotes[instrumentKey];
    const normalizedKey = instrumentKey.replace('|', ':').toUpperCase();
    for (const [responseKey, quote] of Object.entries(quotes)) {
        if (responseKey.toUpperCase() === normalizedKey || quote?.instrument_token === instrumentKey) return quote;
    }
    return null;
}
