const { getRedis } = require('../config/redis');
const logger = require('../utils/logger');

const CACHE_KEY = 'news:marketaux:india:en';
const CACHE_TTL_SECONDS = 20 * 60;
const STALE_TTL_SECONDS = 24 * 60 * 60;
let memoryCache = null;
let refreshInFlight = null;

async function readCache() {
  if (memoryCache) return memoryCache;
  try {
    const redis = getRedis();
    if (redis) {
      const cached = await redis.get(CACHE_KEY);
      if (cached) {
        memoryCache = JSON.parse(cached);
        return memoryCache;
      }
    }
  } catch (error) {
    logger.warn(`News cache read failed: ${error.message}`);
  }
  return null;
}

async function writeCache(value) {
  memoryCache = value;
  try {
    const redis = getRedis();
    if (redis) await redis.set(CACHE_KEY, JSON.stringify(value), 'EX', STALE_TTL_SECONDS);
  } catch (error) {
    logger.warn(`News cache write failed: ${error.message}`);
  }
}

function safeArticle(article) {
  if (!article || typeof article.title !== 'string' || typeof article.url !== 'string') return null;
  try {
    const url = new URL(article.url);
    if (url.protocol !== 'https:') return null;
    return {
      id: String(article.uuid || article.url),
      title: article.title.trim(),
      url: url.toString(),
      source: typeof article.source === 'string' ? article.source : 'News source',
      publishedAt: article.published_at || null,
      symbols: Array.isArray(article.entities)
        ? article.entities.map(entity => entity?.symbol).filter(Boolean).slice(0, 3)
        : [],
    };
  } catch {
    return null;
  }
}

async function fetchMarketauxNews() {
  const token = process.env.MARKETAUX_API_TOKEN;
  if (!token) return { configured: false, articles: [], updatedAt: null };

  const url = new URL('https://api.marketaux.com/v1/news/all');
  url.search = new URLSearchParams({
    api_token: token,
    countries: 'in',
    language: 'en',
    must_have_entities: 'true',
    filter_entities: 'true',
    group_similar: 'true',
    limit: '3',
  }).toString();

  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.error) {
    const providerCode = payload?.error?.code || `http_${response.status}`;
    throw new Error(`Marketaux request failed (${providerCode})`);
  }

  const articles = Array.isArray(payload?.data)
    ? payload.data.map(safeArticle).filter(Boolean).slice(0, 3)
    : [];
  return { configured: true, articles, updatedAt: new Date().toISOString() };
}

exports.getNews = async (_req, res) => {
  const cached = await readCache();
  const now = Date.now();
  if (cached?.configured && now - Date.parse(cached.updatedAt) < CACHE_TTL_SECONDS * 1000) {
    res.set('Cache-Control', `public, s-maxage=${CACHE_TTL_SECONDS}, stale-while-revalidate=300`);
    return res.json({ success: true, ...cached, cached: true });
  }

  if (!process.env.MARKETAUX_API_TOKEN) {
    res.set('Cache-Control', 'no-store');
    return res.json({ success: true, configured: false, articles: [], updatedAt: null });
  }

  try {
    if (!refreshInFlight) {
      refreshInFlight = fetchMarketauxNews()
        .then(async data => {
          if (data.configured) await writeCache(data);
          return data;
        })
        .finally(() => { refreshInFlight = null; });
    }
    const data = await refreshInFlight;
    res.set('Cache-Control', `public, s-maxage=${CACHE_TTL_SECONDS}, stale-while-revalidate=300`);
    return res.json({ success: true, ...data, cached: false });
  } catch (error) {
    logger.warn(`Market news refresh failed: ${error.message}`);
    if (cached?.configured && Array.isArray(cached.articles)) {
      res.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
      return res.json({ success: true, ...cached, cached: true, stale: true });
    }
    return res.status(502).json({ success: false, error: 'Market news is temporarily unavailable.' });
  }
};
