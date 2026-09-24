export const USERS_KEY = 'fintrack_users';
export const SESSION_KEY = 'fintrack_session';
export const DARKMODE_KEY = 'fintrack_darkmode';
export const COLOR_THEME_KEY = 'fintrack_color_theme';

export const COLOR_THEMES = [
    {
        id: 'lime',
        name: 'General Sans Lime',
        tagline: 'Electric Lime & Deep Pine (#ADFF41)',
        accent: '#ADFF41',
        bright: '#c4ff75',
        pine: '#014D3E',
        bg: '#04100d',
        gradient: 'linear-gradient(135deg, #ADFF41, #014D3E)'
    },
    {
        id: 'blue',
        name: 'Electric Blue',
        tagline: 'Neo-Fintech & Clean',
        accent: '#2563eb',
        bright: '#60a5fa',
        bg: '#0b1120',
        gradient: 'linear-gradient(135deg, #2563eb, #1d4ed8)'
    },
    {
        id: 'emerald',
        name: 'Emerald Gold',
        tagline: 'Wealth & Prosperity',
        accent: '#059669',
        bright: '#34d399',
        bg: '#061412',
        gradient: 'linear-gradient(135deg, #059669, #047857)'
    },
    {
        id: 'crimson',
        name: 'Obsidian Crimson',
        tagline: 'High-Impact Bold',
        accent: '#dc2626',
        bright: '#ef4444',
        bg: '#08080a',
        gradient: 'linear-gradient(135deg, #dc2626, #b91c1c)'
    },
    {
        id: 'violet',
        name: 'Cyberpunk Violet',
        tagline: 'Neon Purple Glow',
        accent: '#7c3aed',
        bright: '#a78bfa',
        bg: '#0b0914',
        gradient: 'linear-gradient(135deg, #7c3aed, #5b21b6)'
    }
];
export const MARKET_CACHE_TTL_MS = 60000;
export const MARKET_REFRESH_MS = 15000;
export const MARKET_WATCHLIST_KEY = 'fintrack_market_watchlist_';
export const MARKET_ALERTS_KEY = 'fintrack_market_alerts_';
export const ADVISOR_AUDIT_KEY = 'fintrack_advisor_audit_';
export const ADVISOR_DOCS_KEY = 'fintrack_advisor_docs_';
export const HALAL_SCREEN_KEY = 'fintrack_halal_screen_';

export const CURRENCY_LOCALES = {
    USD: 'en-US',
    EUR: 'de-DE',
    GBP: 'en-GB',
    INR: 'en-IN',
    CAD: 'en-CA',
    AUD: 'en-AU',
    JPY: 'ja-JP',
    CHF: 'de-CH',
    CNY: 'zh-CN',
    SAR: 'ar-SA',
    AED: 'ar-AE',
    PKR: 'ur-PK'
};

export const MARKET_CATALOG = [
    { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', sector: 'Technology', fallback: 227.16 },
    { symbol: 'MSFT', name: 'Microsoft Corp.', exchange: 'NASDAQ', sector: 'Technology', fallback: 511.46 },
    { symbol: 'NVDA', name: 'NVIDIA Corp.', exchange: 'NASDAQ', sector: 'Semiconductors', fallback: 177.80 },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', exchange: 'NASDAQ', sector: 'Consumer Cyclical', fallback: 231.20 },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', exchange: 'NASDAQ', sector: 'Communication Services', fallback: 254.43 },
    { symbol: 'JPM', name: 'JPMorgan Chase & Co.', exchange: 'NYSE', sector: 'Financial Services', fallback: 311.44 },
    { symbol: 'KO', name: 'Coca-Cola Co.', exchange: 'NYSE', sector: 'Consumer Defensive', fallback: 71.38 },
    { symbol: 'WMT', name: 'Walmart Inc.', exchange: 'NYSE', sector: 'Consumer Defensive', fallback: 101.33 }
];

export const CATEGORIES = [
    'Food & Drinks',
    'Rent & Housing',
    'Shopping',
    'Recharge & Bills',
    'Petrol & Auto',
    'Utilities',
    'Salary',
    'Entertainment',
    'Other'
];

export const HALAL_METHODS = {
    aaoifi: { label: 'AAOIFI-style', debt: 30, cash: 30, interest: 5, revenue: 5, illiquid: 30, denominator: 'market cap / methodology-specific' },
    msci: { label: 'MSCI Islamic', debt: 33.33, cash: 33.33, interest: 5, revenue: 5, illiquid: 0, denominator: 'total assets for balance-sheet tests' },
    sp: { label: 'S&P DJI Islamic', debt: 33, cash: 33, interest: 5, revenue: 5, illiquid: 0, denominator: 'total assets for balance-sheet tests' },
    ftse: { label: 'FTSE Russell Shariah', debt: 33, cash: 33, interest: 5, revenue: 5, illiquid: 0, denominator: 'total assets for balance-sheet tests' }
};

export function formatAmount(amount, currency = 'USD') {
    const locale = CURRENCY_LOCALES[currency] || 'en-US';
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount || 0);
}

export function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatMarketNumber(value, options = {}) {
    if (!Number.isFinite(value)) return '—';
    return new Intl.NumberFormat('en-US', {
        maximumFractionDigits: options.maximumFractionDigits || 2,
        notation: options.notation || 'standard'
    }).format(value);
}

export function formatMarketPrice(value) {
    return Number.isFinite(value) ? `$${formatMarketNumber(value, { maximumFractionDigits: 2 })}` : '—';
}
