const logger = require('../utils/logger');
const { getRedis } = require('../config/redis');
const User = require('../models/User');
const cache = new Map();
const circuits = new Map();
const yahoo = process.env.MARKET_DATA_FALLBACK_URL || 'https://query1.finance.yahoo.com';

async function request(url) {
  let last;
  for (let attempt = 0; attempt < 3; attempt++) {
    try { const response = await fetch(url); if (!response.ok) throw new Error(`provider HTTP ${response.status}`); return response; }
    catch (error) { last = error; await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1))); }
  }
  throw last;
}
function providers() {
  const configured = (process.env.MARKET_DATA_PROVIDERS || process.env.MARKET_DATA_PROVIDER || 'upstox,alpha_vantage')
    .split(',').map(item => item.trim().toLowerCase()).filter(Boolean);
  return [...new Set([...configured, 'yahoo'])];
}
async function fetchProvider(provider, symbol) {
  if (provider === 'alpha_vantage' && process.env.ALPHA_VANTAGE_API_KEY) {
    const r = await request(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${process.env.ALPHA_VANTAGE_API_KEY}`);
    const q = (await r.json())['Global Quote'] || {}; if (!q['05. price']) throw new Error('Alpha Vantage returned no quote');
    return { symbol, price: Number(q['05. price']), change: Number(q['09. change']) || 0, source: provider };
  }
  if (provider === 'finnhub' && process.env.FINNHUB_API_KEY) {
    const r = await request(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${process.env.FINNHUB_API_KEY}`);
    const q = await r.json(); if (!q.c) throw new Error('Finnhub returned no quote');
    return { symbol, price: Number(q.c), change: Number(q.dp) || 0, source: provider };
  }
  if (provider === 'crypto_compare' && process.env.CRYPTO_COMPARE_API_KEY) {
    const r = await request(`https://min-api.cryptocompare.com/data/price?fsym=${encodeURIComponent(symbol)}&tsyms=USD&api_key=${process.env.CRYPTO_COMPARE_API_KEY}`);
    const q = await r.json(); if (!q.USD) throw new Error('CryptoCompare returned no quote');
    return { symbol, price: Number(q.USD), change: 0, source: provider };
  }
  if (provider === 'upstox') {
    const userWithToken = await User.findOne({ upstoxAccessToken: { $exists: true, $ne: null } });
    if (!userWithToken) throw new Error('Upstox is not connected');

    const UPSTOX_INSTRUMENT_MAP = {
      'NIFTY50':   'NSE_INDEX|Nifty 50',
      'BANKNIFTY': 'NSE_INDEX|Nifty Bank',
      'SENSEX':    'BSE_INDEX|SENSEX',
      'RELIANCE':  'NSE_EQ|INE002A01018',
      'TCS':       'NSE_EQ|INE467B01029',
      'INFY':      'NSE_EQ|INE009A01021',
      'HDFCBANK':  'NSE_EQ|INE040A01034',
      'ICICIBANK': 'NSE_EQ|INE090A01021',
      'TATAMOTORS':'NSE_EQ|INE155A01022',
      'ITC':       'NSE_EQ|INE154A01025'
    };
    const instrumentKey = UPSTOX_INSTRUMENT_MAP[symbol.toUpperCase()] || `NSE_EQ|${symbol.toUpperCase()}`;
    
    let lastError;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(`https://api.upstox.com/v2/market-quote/quotes?instrument_key=${encodeURIComponent(instrumentKey)}`, {
          headers: { 'Authorization': `Bearer ${userWithToken.upstoxAccessToken}`, 'Accept': 'application/json' }
        });
        if (!response.ok) {
            if (response.status === 401) throw new Error('Upstox token expired');
            throw new Error(`Upstox HTTP ${response.status}`);
        }
        const json = await response.json();
        if (json.status === 'success' && json.data && json.data[instrumentKey]) {
            const data = json.data[instrumentKey];
            return { symbol, price: data.last_price, change: (data.last_price - data.ohlc.close) || 0, source: provider };
        }
        throw new Error('Upstox returned no quote');
      } catch (error) { lastError = error; await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1))); }
    }
    throw lastError;
  }
  if (provider === 'yahoo') {
    const r = await request(`${yahoo}/v8/finance/chart/${encodeURIComponent(symbol)}`);
    const meta = (await r.json()).chart.result[0].meta;
    return { symbol, price: meta.regularMarketPrice, change: meta.regularMarketChangePercent || 0, source: provider };
  }
  throw new Error(`${provider} is not configured`);
}
async function quote(input) {
  const symbol = input.toUpperCase();
  const cached = cache.get(symbol);
  if (cached && cached.expires > Date.now()) return cached.value;
  const redis = getRedis();
  if (redis) {
    try { const remote = await redis.get(`quote:${symbol}`); if (remote) return JSON.parse(remote); }
    catch (error) { logger.warn(`Redis read failed for ${symbol}: ${error.message}`); }
  }
  const state = circuits.get(symbol) || { failures: 0, openedAt: 0 };
  if (state.openedAt && Date.now() - state.openedAt < 30000) return { symbol, price: null, source: 'circuit-open' };
  for (const provider of providers()) {
    try {
      const value = await fetchProvider(provider, symbol);
      state.failures = 0; state.openedAt = 0; circuits.set(symbol, state);
      cache.set(symbol, { value, expires: Date.now() + 60000 });
      if (redis) { try { await redis.set(`quote:${symbol}`, JSON.stringify(value), 'EX', 60); } catch (error) { logger.warn(`Redis write failed for ${symbol}: ${error.message}`); } }
      return value;
    } catch (error) { logger.warn(`Market provider ${provider} failed for ${symbol}: ${error.message}`); }
  }
  state.failures += 1; if (state.failures >= 3) state.openedAt = Date.now(); circuits.set(symbol, state);
  return { symbol, price: null, source: 'unavailable' };
}
module.exports = { quote };
