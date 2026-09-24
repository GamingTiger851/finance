// localStorage keys
const USERS_KEY = 'fintrack_users';
const SESSION_KEY = 'fintrack_session';
const DARKMODE_KEY = 'fintrack_darkmode';
const MARKET_CACHE_TTL_MS = 60000;
const MARKET_REFRESH_MS = 15000;
const MARKET_WATCHLIST_KEY = 'fintrack_market_watchlist_';
const MARKET_ALERTS_KEY = 'fintrack_market_alerts_';
const ADVISOR_AUDIT_KEY = 'fintrack_advisor_audit_';
const ADVISOR_DOCS_KEY = 'fintrack_advisor_docs_';
const HALAL_SCREEN_KEY = 'fintrack_halal_screen_';
const MARKET_CATALOG = [
    { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', sector: 'Technology', fallback: 227.16 },
    { symbol: 'MSFT', name: 'Microsoft Corp.', exchange: 'NASDAQ', sector: 'Technology', fallback: 511.46 },
    { symbol: 'NVDA', name: 'NVIDIA Corp.', exchange: 'NASDAQ', sector: 'Semiconductors', fallback: 177.80 },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', exchange: 'NASDAQ', sector: 'Consumer Cyclical', fallback: 231.20 },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', exchange: 'NASDAQ', sector: 'Communication Services', fallback: 254.43 },
    { symbol: 'JPM', name: 'JPMorgan Chase & Co.', exchange: 'NYSE', sector: 'Financial Services', fallback: 311.44 },
    { symbol: 'KO', name: 'Coca-Cola Co.', exchange: 'NYSE', sector: 'Consumer Defensive', fallback: 71.38 },
    { symbol: 'WMT', name: 'Walmart Inc.', exchange: 'NYSE', sector: 'Consumer Defensive', fallback: 101.33 }
];

const FIREFLY_DEFAULT_COUNT = 35;
const FIREFLY_MIN_SIZE = 2;
const FIREFLY_MAX_SIZE = 5;
const FIREFLY_MIN_DURATION = 8;
const FIREFLY_MAX_DURATION = 18;
const FIREFLY_MIN_DELAY = 0;
const FIREFLY_MAX_DELAY = 8;
const FIREFLY_DEFAULT_WAYPOINT_COUNT = 5;
const FIREFLY_MIN_VIEWPORT_PERCENT = 5;
const FIREFLY_MAX_VIEWPORT_PERCENT = 95;
const FIREFLY_RESIZE_DEBOUNCE_MS = 200;
const FIREFLY_RESIZE_THRESHOLD = 0.1;

let createdFireflies = [];
let fireflyResizeHandler = null;
let fireflyResizeTimeout = null;
let fireflyViewport = null;
let fireflyOptions = null;

function randomBetween(min, max) {
    return Math.random() * (max - min) + min;
}

function finiteOrDefault(value, fallback) {
    if (typeof value !== 'number' && typeof value !== 'string') {
        return fallback;
    }
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

/**
 * Creates animated fireflies inside the `#fireflies` container.
 *
 * @param {Object} [options={}] Customization for the generated fireflies.
 * @param {number} [options.count=35] Number of fireflies to create.
 * @param {number} [options.minSize=2] Minimum firefly diameter in pixels.
 * @param {number} [options.maxSize=5] Maximum firefly diameter in pixels.
 * @param {number} [options.minDuration=8] Minimum animation duration in seconds.
 * @param {number} [options.maxDuration=18] Maximum animation duration in seconds.
 * @param {number} [options.minDelay=0] Minimum animation delay in seconds.
 * @param {number} [options.maxDelay=8] Maximum animation delay in seconds.
 * @param {number} [options.waypointCount=5] Number of movement waypoints (1-5).
 * @returns {HTMLElement[]} References to the generated firefly elements.
 *
 * Each element receives `--duration` and `--delay` for animation timing,
 * plus `--x1` through `--x5` and `--y1` through `--y5` for its movement
 * waypoints. The five-property naming convention is kept for existing
 * keyframe animations; unused waypoints remain valid CSS custom properties.
 */
function createFireflies(options = {}) {
    destroyFireflies();
    const container = document.getElementById('fireflies');
    if (!container) {
        console.warn('Unable to create fireflies: #fireflies container not found.');
        return [];
    }

    fireflyOptions = {
        count: Math.max(0, Math.floor(finiteOrDefault(options.count, FIREFLY_DEFAULT_COUNT))),
        minSize: Math.max(0, finiteOrDefault(options.minSize, FIREFLY_MIN_SIZE)),
        maxSize: Math.max(0, finiteOrDefault(options.maxSize, FIREFLY_MAX_SIZE)),
        minDuration: Math.max(0, finiteOrDefault(options.minDuration, FIREFLY_MIN_DURATION)),
        maxDuration: Math.max(0, finiteOrDefault(options.maxDuration, FIREFLY_MAX_DURATION)),
        minDelay: Math.max(0, finiteOrDefault(options.minDelay, FIREFLY_MIN_DELAY)),
        maxDelay: Math.max(0, finiteOrDefault(options.maxDelay, FIREFLY_MAX_DELAY)),
        waypointCount: Math.min(5, Math.max(1, Math.floor(finiteOrDefault(options.waypointCount, FIREFLY_DEFAULT_WAYPOINT_COUNT))))
    };

    const minSize = Math.min(fireflyOptions.minSize, fireflyOptions.maxSize);
    const maxSize = Math.max(fireflyOptions.minSize, fireflyOptions.maxSize);
    const minDuration = Math.min(fireflyOptions.minDuration, fireflyOptions.maxDuration);
    const maxDuration = Math.max(fireflyOptions.minDuration, fireflyOptions.maxDuration);
    const minDelay = Math.min(fireflyOptions.minDelay, fireflyOptions.maxDelay);
    const maxDelay = Math.max(fireflyOptions.minDelay, fireflyOptions.maxDelay);
    const fragment = document.createDocumentFragment();

    for (let index = 0; index < fireflyOptions.count; index += 1) {
        const firefly = document.createElement('span');
        firefly.className = 'firefly';
        firefly.setAttribute('aria-hidden', 'true');
        firefly.style.setProperty('--duration', `${randomBetween(minDuration, maxDuration)}s`);
        firefly.style.setProperty('--delay', `${randomBetween(minDelay, maxDelay)}s`);
        firefly.style.setProperty('--size', `${randomBetween(minSize, maxSize)}px`);

        for (let waypoint = 1; waypoint <= 5; waypoint += 1) {
            const x = waypoint <= fireflyOptions.waypointCount
                ? randomBetween(FIREFLY_MIN_VIEWPORT_PERCENT, FIREFLY_MAX_VIEWPORT_PERCENT)
                : FIREFLY_MIN_VIEWPORT_PERCENT;
            const y = waypoint <= fireflyOptions.waypointCount
                ? randomBetween(FIREFLY_MIN_VIEWPORT_PERCENT, FIREFLY_MAX_VIEWPORT_PERCENT)
                : FIREFLY_MIN_VIEWPORT_PERCENT;
            firefly.style.setProperty(`--x${waypoint}`, `${x}%`);
            firefly.style.setProperty(`--y${waypoint}`, `${y}%`);
        }

        fragment.appendChild(firefly);
        createdFireflies.push(firefly);
    }
    container.appendChild(fragment);

    fireflyViewport = {
        width: window.innerWidth,
        height: window.innerHeight
    };
    fireflyResizeHandler = () => {
        clearTimeout(fireflyResizeTimeout);
        fireflyResizeTimeout = setTimeout(() => {
            const widthChanged = Math.abs(window.innerWidth - fireflyViewport.width) / fireflyViewport.width;
            const heightChanged = Math.abs(window.innerHeight - fireflyViewport.height) / fireflyViewport.height;
            if (Math.max(widthChanged, heightChanged) >= FIREFLY_RESIZE_THRESHOLD) {
                createFireflies(fireflyOptions);
            }
        }, FIREFLY_RESIZE_DEBOUNCE_MS);
    };
    window.addEventListener('resize', fireflyResizeHandler, { passive: true });

    return [...createdFireflies];
}

/**
 * Removes generated fireflies and their resize listener.
 *
 * This is safe to call repeatedly and should be used before SPA navigation
 * or whenever the firefly container is removed from the document.
 *
 * @returns {void}
 */
function destroyFireflies() {
    clearTimeout(fireflyResizeTimeout);
    fireflyResizeTimeout = null;
    if (fireflyResizeHandler) {
        window.removeEventListener('resize', fireflyResizeHandler);
        fireflyResizeHandler = null;
    }
    createdFireflies.forEach(firefly => firefly.remove());
    createdFireflies = [];
    fireflyViewport = null;
    fireflyOptions = null;
}

// currency format ke liye
const CURRENCY_LOCALES = {
    INR: 'en-IN',
    USD: 'en-US',
    EUR: 'de-DE',
    GBP: 'en-GB',
    JPY: 'ja-JP'
};

// app state
let currentUser = null;
let userProfile = { fullName: '', currency: 'USD' };
let transactions = [];
let currentFilter = 'all';
let searchQuery = '';
let selectedType = 'income';
let cashFlowChart = null;
let categoryPieChart = null;
let investmentChart = null;
let investmentPieChart = null;
let selectedChartPeriod = 'month';
let lastCalculation = null;
let marketQuotes = {};
let marketWatchlist = [];
let marketAlerts = [];
let marketHistoryChart = null;
let marketRefreshTimer = null;
let marketRange = '1d';
let advisorActiveTab = 'investment';
let advisorAudit = [];
let advisorDocuments = [];
let halalLastScreen = null;

// har user ka transaction data alag save hoga
function getTransactionKey(username) {
    return `fintrack_transactions_${username}`;
}

// localStorage functions
function loadUsers() {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : [];
}

function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function findUser(username) {
    return loadUsers().find(u => u.username.toLowerCase() === username.toLowerCase());
}

function loadTransactions(username) {
    const raw = localStorage.getItem(getTransactionKey(username));
    return raw ? JSON.parse(raw) : [];
}

function saveTransactions() {
    localStorage.setItem(getTransactionKey(currentUser), JSON.stringify(transactions));
    // console.log(transactions);
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
}

function showConfirm(title, message, onConfirm) {
    const modal = document.getElementById('confirmModal');
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    modal.classList.remove('hidden');

    const okBtn = document.getElementById('confirmOkBtn');
    const cancelBtn = document.getElementById('confirmCancelBtn');

    const cleanup = () => {
        modal.classList.add('hidden');
        okBtn.removeEventListener('click', onOk);
        cancelBtn.removeEventListener('click', onCancel);
    };
    const onOk = () => { cleanup(); onConfirm(); };
    const onCancel = () => cleanup();

    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
}

// login / register (3D flip card & animations)
function showAuthPage(page) {
    const flipper = document.getElementById('authFlipper');
    const loginError = document.getElementById('loginError');
    const registerError = document.getElementById('registerError');
    if (loginError) loginError.style.display = 'none';
    if (registerError) registerError.style.display = 'none';

    if (page === 'register') {
        if (flipper) flipper.classList.add('is-flipped');
        setTimeout(() => {
            const regUser = document.getElementById('registerUsername');
            if (regUser) regUser.focus();
        }, 400);
    } else {
        if (flipper) flipper.classList.remove('is-flipped');
        setTimeout(() => {
            const logUser = document.getElementById('loginUsername');
            if (logUser) logUser.focus();
        }, 400);
    }
}

function registerUser() {
    const username = document.getElementById('registerUsername').value.trim();
    const password = document.getElementById('registerPassword').value;
    const errorEl = document.getElementById('registerError');
    const submitBtn = document.getElementById('registerSubmitBtn');

    if (!username || !password) {
        errorEl.textContent = 'Please fill both fields.';
        errorEl.style.display = 'block';
        return;
    }

    const users = loadUsers();
    if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
        errorEl.textContent = 'That username is already taken.';
        errorEl.style.display = 'block';
        return;
    }

    errorEl.style.display = 'none';
    if (submitBtn) submitBtn.classList.add('is-loading');

    setTimeout(() => {
        users.push({
            username,
            password,
            profile: {
                fullName: username,
                currency: 'USD'
            }
        });
        saveUsers(users);

        if (submitBtn) submitBtn.classList.remove('is-loading');
        showAuthPage('login');
        document.getElementById('loginUsername').value = username;
        document.getElementById('loginPassword').value = '';
        document.getElementById('registerPassword').value = '';
    }, 450);
}

function loginUser() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');
    const submitBtn = document.getElementById('loginSubmitBtn');
    const ripple = document.getElementById('authRipple');

    const user = findUser(username);
    if (!user || user.password !== password) {
        errorEl.textContent = 'Invalid username or password.';
        errorEl.style.display = 'block';
        return;
    }
    errorEl.style.display = 'none';

    // loading state + ripple burst animation
    if (submitBtn) submitBtn.classList.add('is-loading');
    if (ripple) ripple.classList.add('is-active');

    setTimeout(() => {
        localStorage.setItem(SESSION_KEY, user.username);
        document.getElementById('loginPage').classList.add('hidden');
        if (ripple) ripple.classList.remove('is-active');
        if (submitBtn) submitBtn.classList.remove('is-loading');
        document.getElementById('appWrap').classList.remove('hidden');
        bootApp(user.username);
    }, 550);
}

function logoutUser() {
    localStorage.removeItem(SESSION_KEY);
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
    showAuthPage('login');
    document.getElementById('appWrap').classList.add('hidden');
    document.getElementById('loginPage').classList.remove('hidden');
}

// refresh ke baad session check
function checkSession() {
    const username = localStorage.getItem(SESSION_KEY);
    if (username && findUser(username)) {
        document.getElementById('loginPage').classList.add('hidden');
        document.getElementById('appWrap').classList.remove('hidden');
        bootApp(username);
    }
}

function getMarketStorageKey(key) {
    return `${key}${currentUser}`;
}

function loadMarketPreferences() {
    let storedWatchlist;
    let storedAlerts;
    try {
        storedWatchlist = JSON.parse(localStorage.getItem(getMarketStorageKey(MARKET_WATCHLIST_KEY)) || 'null');
        storedAlerts = JSON.parse(localStorage.getItem(getMarketStorageKey(MARKET_ALERTS_KEY)) || '[]');
    } catch (error) {
        console.warn('Unable to read saved market preferences; using defaults.', error);
    }
    marketWatchlist = Array.isArray(storedWatchlist) && storedWatchlist.length ? storedWatchlist : MARKET_CATALOG.map(item => item.symbol);
    marketAlerts = Array.isArray(storedAlerts) ? storedAlerts : [];
}

function saveMarketPreferences() {
    localStorage.setItem(getMarketStorageKey(MARKET_WATCHLIST_KEY), JSON.stringify(marketWatchlist));
    localStorage.setItem(getMarketStorageKey(MARKET_ALERTS_KEY), JSON.stringify(marketAlerts));
}

function marketCatalogItem(symbol) {
    return MARKET_CATALOG.find(item => item.symbol === symbol);
}

function formatMarketNumber(value, options = {}) {
    if (!Number.isFinite(value)) return '—';
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: options.maximumFractionDigits || 2, notation: options.notation || 'standard' }).format(value);
}

function formatMarketPrice(value) {
    return Number.isFinite(value) ? `$${formatMarketNumber(value, { maximumFractionDigits: 2 })}` : '—';
}

function marketStatus(message, state = '') {
    const status = document.getElementById('marketStatus');
    if (!status) return;
    status.className = `market-status ${state}`;
    status.innerHTML = `<span class="status-dot"></span>${message}`;
}

function marketCacheKey(symbol, range) {
    return `fintrack_market_cache_${symbol}_${range}`;
}

function readMarketCache(symbol, range) {
    try {
        const cached = JSON.parse(localStorage.getItem(marketCacheKey(symbol, range)) || 'null');
        return cached && Date.now() - cached.savedAt < MARKET_CACHE_TTL_MS ? cached.data : null;
    } catch (error) {
        console.warn('Unable to read market cache.', error);
        return null;
    }
}

function writeMarketCache(symbol, range, data) {
    try {
        localStorage.setItem(marketCacheKey(symbol, range), JSON.stringify({ savedAt: Date.now(), data }));
    } catch (error) {
        console.warn('Unable to write market cache.', error);
    }
}

async function fetchMarketData(symbol, range = '1d') {
    const cached = readMarketCache(symbol, range);
    if (cached) return { ...cached, fromCache: true };

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${range === '1d' ? '5m' : range === '5d' ? '15m' : '1d'}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error(`Market provider returned HTTP ${response.status}.`);
        const payload = await response.json();
        const result = payload.chart && payload.chart.result && payload.chart.result[0];
        if (!result || !result.meta) throw new Error('Market provider returned an empty quote.');
        const meta = result.meta;
        const quote = result.indicators && result.indicators.quote && result.indicators.quote[0];
        const timestamps = result.timestamp || [];
        const points = timestamps.map((timestamp, index) => ({ timestamp: timestamp * 1000, close: quote && quote.close ? quote.close[index] : null })).filter(point => Number.isFinite(point.close));
        const data = {
            symbol,
            price: Number(meta.regularMarketPrice),
            previousClose: Number(meta.previousClose || meta.chartPreviousClose),
            volume: Number(meta.regularMarketVolume),
            high52: Number(meta.fiftyTwoWeekHigh),
            low52: Number(meta.fiftyTwoWeekLow),
            premarket: Number(meta.preMarketPrice),
            afterHours: Number(meta.postMarketPrice),
            currency: meta.currency || 'USD',
            points,
            source: 'Yahoo Finance'
        };
        writeMarketCache(symbol, range, data);
        return data;
    } finally {
        clearTimeout(timeout);
    }
}

function fallbackMarketData(item, range = '1d') {
    const price = item.fallback;
    const previousClose = price * (1 - (item.symbol.charCodeAt(0) % 7 - 3) / 100);
    const count = range === '1d' ? 78 : range === '5d' ? 30 : range === '1mo' ? 30 : 52;
    const points = Array.from({ length: count }, (_, index) => ({
        timestamp: Date.now() - (count - index) * (range === '1y' ? 7 : 1) * 86400000,
        close: price * (0.96 + (index / count) * 0.04) * (1 + Math.sin(index / 3) * 0.008)
    }));
    return { symbol: item.symbol, price, previousClose, volume: 0, high52: price * 1.18, low52: price * 0.71, premarket: NaN, afterHours: NaN, points, source: 'Demo fallback' };
}

async function loadMarketQuote(symbol, range = '1d') {
    const item = marketCatalogItem(symbol);
    if (!item) return null;
    try {
        const data = await fetchMarketData(symbol, range);
        marketQuotes[symbol] = { ...(marketQuotes[symbol] || {}), ...data };
        return data;
    } catch (error) {
        console.warn(`Unable to load ${symbol} market data.`, error);
        const fallback = fallbackMarketData(item, range);
        marketQuotes[symbol] = { ...(marketQuotes[symbol] || {}), ...fallback };
        return fallback;
    }
}

function renderMarketAlerts() {
    const container = document.getElementById('marketAlerts');
    const count = document.getElementById('alertCount');
    if (!container || !count) return;
    count.textContent = `${marketAlerts.length} active`;
    container.replaceChildren();
    marketAlerts.forEach(alert => {
        const item = document.createElement('div');
        item.className = 'market-alert-item';
        item.innerHTML = `<span><strong>${alert.symbol}</strong> ${alert.condition} ${formatMarketPrice(alert.price)}</span><button class="market-alert-remove" type="button" data-alert-id="${alert.id}" aria-label="Remove ${alert.symbol} alert">Remove</button>`;
        container.appendChild(item);
    });
}

function checkMarketAlerts() {
    marketAlerts.forEach(alert => {
        const quote = marketQuotes[alert.symbol];
        if (!quote || !Number.isFinite(quote.price)) return;
        const triggered = alert.condition === 'above' ? quote.price >= alert.price : quote.price <= alert.price;
        if (!triggered || alert.triggered) return;
        alert.triggered = true;
        showToast(`${alert.symbol} crossed your ${alert.condition} ${formatMarketPrice(alert.price)} alert`);
        if ('Notification' in window && Notification.permission === 'granted') new Notification(`${alert.symbol} price alert`, { body: `Price is ${formatMarketPrice(quote.price)}.` });
    });
    saveMarketPreferences();
    renderMarketAlerts();
}

function renderMarketTable() {
    const body = document.getElementById('marketTableBody');
    const empty = document.getElementById('marketEmptyState');
    if (!body || !empty) return;
    const query = document.getElementById('marketSearch').value.trim().toLowerCase();
    const exchange = document.getElementById('marketExchangeFilter').value;
    const rows = marketWatchlist.map(marketCatalogItem).filter(item => item && (!exchange || exchange === 'all' || item.exchange === exchange)).filter(item => `${item.symbol} ${item.name} ${item.sector}`.toLowerCase().includes(query));
    body.replaceChildren();
    rows.forEach(item => {
        const quote = marketQuotes[item.symbol] || {};
        const change = Number.isFinite(quote.price) && Number.isFinite(quote.previousClose) ? quote.price - quote.previousClose : NaN;
        const changePercent = Number.isFinite(change) && quote.previousClose ? (change / quote.previousClose) * 100 : NaN;
        const tr = document.createElement('tr');
        tr.dataset.symbol = item.symbol;
        tr.innerHTML = `<td><button class="market-symbol" type="button">${item.symbol}</button><span>${item.name} · ${item.exchange}</span></td><td class="market-number">${formatMarketPrice(quote.price)}</td><td class="market-change ${change >= 0 ? 'positive' : 'negative'}">${Number.isFinite(change) ? `${change >= 0 ? '+' : ''}${formatMarketPrice(change)} (${changePercent >= 0 ? '+' : ''}${formatMarketNumber(changePercent)}%)` : '—'}</td><td>${formatMarketPrice(quote.bid)} / ${formatMarketPrice(quote.ask)}</td><td>${quote.volume ? formatMarketNumber(quote.volume, { notation: 'compact', maximumFractionDigits: 1 }) : '—'}</td><td>${quote.marketCap ? `$${formatMarketNumber(quote.marketCap, { notation: 'compact', maximumFractionDigits: 1 })}` : '—'}</td><td>${formatMarketPrice(quote.low52)} – ${formatMarketPrice(quote.high52)}</td><td><button class="market-remove" type="button" data-symbol="${item.symbol}" aria-label="Remove ${item.symbol} from watchlist">×</button></td>`;
        body.appendChild(tr);
    });
    empty.classList.toggle('hidden', rows.length > 0);
    renderAlertSymbolOptions();
}

function renderAlertSymbolOptions() {
    const select = document.getElementById('alertSymbol');
    if (!select) return;
    const selected = select.value;
    select.replaceChildren();
    marketWatchlist.forEach(symbol => {
        const option = document.createElement('option');
        option.value = symbol;
        option.textContent = symbol;
        select.appendChild(option);
    });
    if (marketWatchlist.includes(selected)) select.value = selected;
}

async function renderMarketHistory(symbol, range = marketRange) {
    const item = marketCatalogItem(symbol);
    if (!item) return;
    const data = await loadMarketQuote(symbol, range);
    document.getElementById('marketDetailTitle').textContent = `${item.name} (${symbol})`;
    document.getElementById('marketDetailMeta').textContent = `${item.exchange} · ${item.sector} · ${data.source === 'Demo fallback' ? 'Demo fallback data' : 'Delayed quote'}`;
    document.getElementById('marketDetailStats').innerHTML = `<div><span>Last price</span><strong>${formatMarketPrice(data.price)}</strong></div><div><span>Previous close</span><strong>${formatMarketPrice(data.previousClose)}</strong></div><div><span>Premarket / after-hours</span><strong>${formatMarketPrice(data.premarket)} / ${formatMarketPrice(data.afterHours)}</strong></div><div><span>Session volume</span><strong>${data.volume ? formatMarketNumber(data.volume, { notation: 'compact', maximumFractionDigits: 1 }) : '—'}</strong></div>`;
    const canvas = document.getElementById('marketHistoryChart');
    if (typeof Chart === 'undefined' || !canvas) return;
    const labels = data.points.map(point => new Date(point.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
    const values = data.points.map(point => point.close);
    if (marketHistoryChart) {
        marketHistoryChart.data.labels = labels;
        marketHistoryChart.data.datasets[0].data = values;
        marketHistoryChart.update();
    } else {
        marketHistoryChart = new Chart(canvas, { type: 'line', data: { labels, datasets: [{ label: `${symbol} price`, data: values, borderColor: '#159447', backgroundColor: 'rgba(21,148,71,.14)', fill: true, pointRadius: 0, tension: .25 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: false } } } });
    }
}

async function refreshMarkets() {
    if (!currentUser || document.getElementById('marketsPage').classList.contains('hidden')) return;
    marketStatus('Refreshing quotes', 'loading');
    await Promise.all(marketWatchlist.map(symbol => loadMarketQuote(symbol)));
    renderMarketTable();
    checkMarketAlerts();
    document.getElementById('marketUpdated').textContent = `Updated ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
    marketStatus('Delayed feed connected', 'connected');
    const selected = document.querySelector('#marketTableBody tr.selected')?.dataset.symbol || marketWatchlist[0];
    if (selected) renderMarketHistory(selected);
}

function startMarketRefresh() {
    clearInterval(marketRefreshTimer);
    refreshMarkets();
    marketRefreshTimer = setInterval(refreshMarkets, MARKET_REFRESH_MS);
}

function stopMarketRefresh() {
    clearInterval(marketRefreshTimer);
    marketRefreshTimer = null;
}

function advisorKey(key) {
    return `${key}${currentUser}`;
}

function loadAdvisorState() {
    try {
        advisorAudit = JSON.parse(localStorage.getItem(advisorKey(ADVISOR_AUDIT_KEY)) || '[]');
        advisorDocuments = JSON.parse(localStorage.getItem(advisorKey(ADVISOR_DOCS_KEY)) || '[]');
    } catch (error) {
        console.warn('Unable to load advisor state; using empty state.', error);
        advisorAudit = [];
        advisorDocuments = [];
    }
    renderAdvisorAudit();
    renderAdvisorDocuments();
}

function saveAdvisorState() {
    localStorage.setItem(advisorKey(ADVISOR_AUDIT_KEY), JSON.stringify(advisorAudit.slice(-50)));
    localStorage.setItem(advisorKey(ADVISOR_DOCS_KEY), JSON.stringify(advisorDocuments.slice(-20)));
}

function logAdvisorEvent(type, input, outcome, confidence = 'medium') {
    advisorAudit.push({ id: Date.now(), timestamp: new Date().toISOString(), type, input, outcome, confidence });
    saveAdvisorState();
    renderAdvisorAudit();
}

function renderAdvisorAudit() {
    const container = document.getElementById('advisorAuditTrail');
    const count = document.getElementById('advisorAuditCount');
    if (!container || !count) return;
    count.textContent = `${advisorAudit.length} events`;
    container.replaceChildren();
    advisorAudit.slice(-5).reverse().forEach(event => {
        const item = document.createElement('div');
        item.className = 'advisor-audit-item';
        item.innerHTML = `<strong>${event.type}</strong><span>${new Date(event.timestamp).toLocaleString()} · ${event.confidence} confidence</span><small>${event.outcome}</small>`;
        container.appendChild(item);
    });
}

function renderAdvisorDocuments() {
    const container = document.getElementById('advisorDocuments');
    if (!container) return;
    container.replaceChildren();
    advisorDocuments.forEach(documentItem => {
        const item = document.createElement('div');
        item.className = 'advisor-document-item';
        item.innerHTML = `<span>${documentItem.name}</span><small>${formatMarketNumber(documentItem.size, { maximumFractionDigits: 0 })} bytes · ${new Date(documentItem.addedAt).toLocaleDateString()}</small>`;
        container.appendChild(item);
    });
}

function advisorNumber(id) {
    const value = Number(document.getElementById(id).value);
    return Number.isFinite(value) ? value : 0;
}

function setAdvisorTab(tab) {
    advisorActiveTab = tab;
    document.querySelectorAll('[data-advisor-tab]').forEach(button => {
        const active = button.dataset.advisorTab === tab;
        button.classList.toggle('active', active);
        button.setAttribute('aria-selected', String(active));
    });
    document.querySelectorAll('[data-advisor-panel]').forEach(panel => panel.classList.toggle('hidden', panel.dataset.advisorPanel !== tab));
}

function advisorChatMessage(title, message, kind = 'assistant') {
    const chat = document.getElementById('advisorChat');
    const item = document.createElement('div');
    item.className = `advisor-message ${kind}`;
    item.innerHTML = `<strong>${title}</strong><span>${message}</span>`;
    chat.appendChild(item);
    chat.scrollTop = chat.scrollHeight;
}

function answerAdvisorQuestion() {
    const input = document.getElementById('advisorQuestion');
    const question = input.value.trim();
    if (!question) return;
    advisorChatMessage('You', question, 'user');
    const normalized = question.toLowerCase();
    let answer = 'I can explain the inputs, allocation, DTI, volatility, VaR, stress scenarios, notifications, or human-review process. Choose a service tab and run an assessment for a case-specific answer.';
    if (normalized.includes('dti') || normalized.includes('loan')) answer = 'DTI is monthly debt divided by monthly income. This demo also adds an estimated loan payment and flags projected DTI above 40% for review.';
    else if (normalized.includes('var')) answer = 'VaR estimates a loss threshold at a confidence level. This demo uses volatility × 1.65 for a transparent 95% proxy and explicitly does not treat it as a guaranteed maximum loss.';
    else if (normalized.includes('human') || normalized.includes('review')) answer = 'Ambiguous, adverse, incomplete, or high-concentration cases should be escalated. Use Request human review to record an auditable escalation event.';
    else if (normalized.includes('suitable') || normalized.includes('allocation')) answer = 'Suitability uses income, savings rate, investable assets, goal, horizon, and stated risk tolerance. The recommendation is an explainable starting point, not a trade instruction.';
    advisorChatMessage('FinTracker AI', answer);
}

function renderAdvisorResponse(title, summary, sections, escalation = '') {
    const response = document.getElementById('advisorResponse');
    response.classList.remove('hidden');
    response.innerHTML = `<div class="advisor-response-header"><div><h2>${title}</h2><p>${summary}</p></div>${escalation ? '<span class="advisor-escalation">Human review recommended</span>' : ''}</div><div class="advisor-result-grid">${sections.map(section => `<div class="advisor-result-card"><span>${section.label}</span><strong>${section.value}</strong><small>${section.explanation}</small></div>`).join('')}</div>${escalation ? `<div class="advisor-escalation-note">${escalation}</div>` : ''}`;
    advisorChatMessage('FinTracker AI', summary);
}

function runInvestmentAdvice() {
    const income = advisorNumber('advisorIncome');
    const savings = advisorNumber('advisorSavings');
    const investable = advisorNumber('advisorInvestable');
    const horizon = advisorNumber('advisorHorizon');
    const goal = document.getElementById('advisorGoal').value;
    const tolerance = document.getElementById('advisorTolerance').value;
    const savingsRate = income > 0 ? savings / income : 0;
    const emergencyMonths = income > 0 ? investable / income : 0;
    const riskBase = { conservative: 0, moderate: 15, aggressive: 30 }[tolerance];
    const horizonBoost = horizon >= 10 ? 10 : horizon >= 5 ? 5 : 0;
    const score = Math.min(100, Math.max(0, 45 + riskBase + horizonBoost + (savingsRate >= .2 ? 5 : -5)));
    const equity = Math.round(Math.min(75, Math.max(20, score)));
    const bonds = Math.round((100 - equity) * .5);
    const funds = Math.round((100 - equity) * .35);
    const alternatives = 100 - equity - bonds - funds;
    const escalation = income <= 0 || investable <= 0 || emergencyMonths < 3 ? 'Income, investable assets, or a three-month emergency reserve is missing. A licensed adviser should validate affordability before implementation.' : '';
    const recommendation = `${equity}% diversified stocks, ${bonds}% bonds, ${funds}% ETFs/mutual funds, and ${alternatives}% alternatives/cash.`;
    renderAdvisorResponse('Personalized investment plan', recommendation, [
        { label: 'Suitability score', value: `${score}/100`, explanation: `Based on ${tolerance} tolerance, ${horizon}-year horizon, and a ${(savingsRate * 100).toFixed(0)}% savings rate.` },
        { label: 'Emergency reserve', value: `${emergencyMonths.toFixed(1)} months`, explanation: 'Investable amount divided by monthly income; build the reserve before taking market risk.' },
        { label: 'Primary goal', value: document.getElementById('advisorGoal').selectedOptions[0].textContent, explanation: `The allocation favors ${goal === 'income' ? 'income-producing bonds and funds' : 'long-term diversified growth'}.` },
        { label: 'Suggested allocation', value: `${equity}/${bonds}/${funds}/${alternatives}`, explanation: 'Stocks / bonds / ETFs & mutual funds / alternatives & cash.' }
    ], escalation);
    logAdvisorEvent('Investment recommendation', { income, savings, investable, horizon, goal, tolerance }, recommendation, escalation ? 'low' : 'medium');
}

function runLoanAssessment() {
    const amount = advisorNumber('loanAmount');
    const income = advisorNumber('loanIncome');
    const debt = advisorNumber('loanDebt');
    const score = advisorNumber('loanCreditScore');
    const employment = advisorNumber('loanEmployment');
    const collateral = advisorNumber('loanCollateral');
    const term = advisorNumber('loanTerm');
    const dti = income > 0 ? debt / income : 1;
    const estimatedPayment = amount > 0 ? amount / (term * 12) * 1.12 : 0;
    const postLoanDti = income > 0 ? (debt + estimatedPayment) / income : 1;
    const factors = [
        score >= 720,
        postLoanDti <= .4,
        employment >= 2,
        amount > 0 && collateral >= amount
    ];
    const passed = factors.filter(Boolean).length;
    const decision = passed === 4 ? 'Eligible' : passed >= 2 ? 'Conditional approval' : 'Not eligible';
    const escalation = score <= 0 || income <= 0 || (decision !== 'Eligible' && decision !== 'Not eligible') ? 'Credit bureau verification, income documents, and a compliance officer review are required before a final adverse-action decision.' : '';
    const explanation = `Credit score ${score || 'not supplied'}, projected DTI ${(postLoanDti * 100).toFixed(1)}%, employment tenure ${employment} years, and collateral coverage ${(amount ? collateral / amount * 100 : 0).toFixed(0)}% were evaluated.`;
    renderAdvisorResponse(`Loan assessment: ${decision}`, explanation, [
        { label: 'Debt-to-income', value: `${(postLoanDti * 100).toFixed(1)}%`, explanation: `Existing DTI is ${(dti * 100).toFixed(1)}%; projected payment is ${formatAmount(estimatedPayment)}. Target is at or below 40%.` },
        { label: 'Credit analysis', value: score ? `${score} · ${score >= 720 ? 'strong' : score >= 620 ? 'review' : 'weak'}` : 'Missing', explanation: 'A production credit-bureau adapter must verify score, report date, consent, and adverse factors.' },
        { label: 'Affordability checks', value: `${passed}/4 passed`, explanation: 'Score, projected DTI, stable employment, and collateral coverage are weighted equally in this demo.' },
        { label: 'Regulatory status', value: 'Human validation', explanation: 'Final lending decisions require fair-lending, identity, AML/KYC, notices, and jurisdiction-specific review.' }
    ], escalation);
    logAdvisorEvent('Loan eligibility assessment', { amount, income, debt, score, employment, collateral, term }, decision, escalation ? 'low' : 'medium');
}

function runRiskAssessment() {
    const stocks = advisorNumber('riskStocks');
    const bonds = advisorNumber('riskBonds');
    const funds = advisorNumber('riskFunds');
    const alternatives = advisorNumber('riskAlternatives');
    const largestHolding = advisorNumber('riskLargestHolding');
    const horizon = document.getElementById('riskHorizon').value;
    const total = stocks + bonds + funds + alternatives;
    const volatility = total ? (stocks * 0.22 + bonds * 0.06 + funds * 0.16 + alternatives * 0.12) / total * 100 : 0;
    const var95 = volatility * 1.65;
    const concentration = largestHolding > 25 ? 'High' : largestHolding > 15 ? 'Moderate' : 'Low';
    const riskScore = Math.min(100, Math.round(volatility * 2 + (concentration === 'High' ? 20 : concentration === 'Moderate' ? 10 : 0) + (horizon === 'short' ? 15 : horizon === 'long' ? -5 : 5)));
    const scenario = stocks >= 60 ? 'A 2008-style equity drawdown could reduce portfolio value by roughly 25–35%.' : 'A diversified mix may reduce, but not eliminate, losses in a 2008 or 2020-style shock.';
    const escalation = total !== 100 || largestHolding > 40 ? 'The portfolio weights need reconciliation or concentration exceeds the review threshold. A human adviser should validate holdings and suitability.' : '';
    renderAdvisorResponse('Portfolio risk evaluation', `Dynamic risk score ${riskScore}/100. ${scenario}`, [
        { label: 'Annualized volatility', value: `${volatility.toFixed(1)}%`, explanation: 'A transparent weighted proxy using asset-class volatility assumptions; replace with return history in production.' },
        { label: '95% one-period VaR', value: `${var95.toFixed(1)}%`, explanation: 'Parametric proxy: volatility × 1.65. It is an estimate, not a maximum-loss guarantee.' },
        { label: 'Stress test', value: stocks >= 60 ? 'Severe' : 'Moderate', explanation: scenario },
        { label: 'Concentration risk', value: concentration, explanation: `Largest holding is ${largestHolding}%; review above 15% and escalate above 25%.` }
    ], escalation);
    logAdvisorEvent('Investment risk assessment', { stocks, bonds, funds, alternatives, largestHolding, horizon, total }, `Risk score ${riskScore}/100`, escalation ? 'low' : 'medium');
}

const HALAL_METHODS = {
    aaoifi: { label: 'AAOIFI-style', debt: 30, cash: 30, interest: 5, revenue: 5, illiquid: 30, denominator: 'market cap / methodology-specific' },
    msci: { label: 'MSCI Islamic', debt: 33.33, cash: 33.33, interest: 5, revenue: 5, illiquid: 0, denominator: 'total assets for balance-sheet tests' },
    sp: { label: 'S&P DJI Islamic', debt: 33, cash: 33, interest: 5, revenue: 5, illiquid: 0, denominator: 'total assets for balance-sheet tests' },
    ftse: { label: 'FTSE Russell Shariah', debt: 33, cash: 33, interest: 5, revenue: 5, illiquid: 0, denominator: 'total assets for balance-sheet tests' }
};

function runHalalScreen() {
    const methodKey = document.getElementById('halalMethodology').value;
    const method = HALAL_METHODS[methodKey];
    const ticker = document.getElementById('halalTicker').value.trim().toUpperCase() || 'Untitled company';
    const activity = document.getElementById('halalActivity').value;
    const debt = Number(document.getElementById('halalDebt').value) || 0;
    const cash = Number(document.getElementById('halalCash').value) || 0;
    const interest = Number(document.getElementById('halalInterestIncome').value) || 0;
    const revenue = Number(document.getElementById('halalRevenue').value) || 0;
    const illiquid = Number(document.getElementById('halalIlliquid').value) || 0;
    const activityPass = activity === 'permissible';
    const ratios = [
        { label: 'Debt ratio', value: debt, limit: method.debt, pass: debt < method.debt, explanation: `Entered ${debt.toFixed(2)}%; selected method limit is below ${method.debt}%.` },
        { label: 'Interest-bearing cash', value: cash, limit: method.cash, pass: cash < method.cash, explanation: `Entered ${cash.toFixed(2)}%; selected method limit is below ${method.cash}%.` },
        { label: 'Interest income', value: interest, limit: method.interest, pass: interest < method.interest, explanation: `Entered ${interest.toFixed(2)}%; incidental income threshold is below ${method.interest}%.` },
        { label: 'Non-compliant revenue', value: revenue, limit: method.revenue, pass: revenue < method.revenue, explanation: `Entered ${revenue.toFixed(2)}%; activity-income threshold is below ${method.revenue}%.` }
    ];
    if (method.illiquid) ratios.push({ label: 'Illiquid assets', value: illiquid, limit: method.illiquid, pass: illiquid >= method.illiquid, explanation: `Entered ${illiquid.toFixed(2)}%; this educational AAOIFI-style check expects at least ${method.illiquid}%.` });
    const failed = ratios.filter(item => !item.pass);
    const needsReview = activity === 'mixed' || activity === 'weapons' || activity === 'permissible' && failed.length === 0 && illiquid === 0 && Boolean(method.illiquid);
    const result = failed.length ? 'Fails selected screen' : needsReview ? 'Scholar / data review' : 'Passes selected screen';
    const resultClass = failed.length ? 'fail' : needsReview ? 'review' : 'pass';
    const purityRate = Math.min(100, Math.max(0, interest + revenue));
    const output = document.getElementById('halalScreenResult');
    output.className = `halal-result ${resultClass}`;
    output.classList.remove('hidden');
    output.innerHTML = `<div class="halal-result-heading"><div><span>${method.label}</span><h2>${ticker}: ${result}</h2></div><strong>${failed.length ? '✕' : needsReview ? '!' : '✓'}</strong></div><p>Business activity: ${activityPass ? 'permissible category selected' : 'restricted, mixed, or unclear category selected'}. Tests use ${method.denominator}; confirm the current provider methodology before acting.</p><div class="halal-check-list">${ratios.map(item => `<div><span>${item.label}</span><strong class="${item.pass ? 'check-pass' : 'check-fail'}">${item.value.toFixed(2)}% / ${item.limit ? `${item.limit}% limit` : 'provider-specific'}</strong><small>${item.explanation}</small></div>`).join('')}</div><div class="halal-purification">Indicative purification flag: ${purityRate.toFixed(2)}% of relevant income. Use the provider’s formula and a qualified scholar; this is not a donation calculation.</div>`;
    halalLastScreen = { ticker, method: method.label, result, screenedAt: new Date().toISOString() };
    localStorage.setItem(`${HALAL_SCREEN_KEY}${currentUser}`, JSON.stringify(halalLastScreen));
    document.getElementById('halalLastScreen').textContent = `${ticker} · ${result} · ${new Date(halalLastScreen.screenedAt).toLocaleDateString()}`;
}

function loadHalalScreen() {
    try {
        halalLastScreen = JSON.parse(localStorage.getItem(`${HALAL_SCREEN_KEY}${currentUser}`) || 'null');
    } catch (error) {
        console.warn('Unable to load halal screen history.', error);
        halalLastScreen = null;
    }
    const label = document.getElementById('halalLastScreen');
    if (label && halalLastScreen) label.textContent = `${halalLastScreen.ticker} · ${halalLastScreen.result} · ${new Date(halalLastScreen.screenedAt).toLocaleDateString()}`;
}

function showPage(page) {
    const dashboard = document.getElementById('dashboardPage');
    const settingsPage = document.getElementById('settingsPage');
    const marketsPage = document.getElementById('marketsPage');
    const advisorPage = document.getElementById('advisorPage');
    const halalPage = document.getElementById('halalPage');
    const navDashboard = document.getElementById('navDashboard');
    const navSettings = document.getElementById('navSettings');
    const navMarkets = document.getElementById('navMarkets');
    const navAdvisor = document.getElementById('navAdvisor');
    const navHalal = document.getElementById('navHalal');

    const isDashboard = page === 'dashboard';
    const isSettings = page === 'settings';
    const isMarkets = page === 'markets';
    const isAdvisor = page === 'advisor';
    const isHalal = page === 'halal';
    dashboard.classList.toggle('hidden', !isDashboard);
    settingsPage.classList.toggle('hidden', !isSettings);
    marketsPage.classList.toggle('hidden', !isMarkets);
    advisorPage.classList.toggle('hidden', !isAdvisor);
    halalPage.classList.toggle('hidden', !isHalal);
    navDashboard.classList.toggle('active', isDashboard);
    navSettings.classList.toggle('active', isSettings);
    navMarkets.classList.toggle('active', isMarkets);
    navAdvisor.classList.toggle('active', isAdvisor);
    navHalal.classList.toggle('active', isHalal);
    if (isMarkets) startMarketRefresh();
    else stopMarketRefresh();
}

// dashboard calculations
function calculateTotals() {
    let income = 0;
    let expense = 0;
    transactions.forEach(t => {
        if (t.type === 'income') income += t.amount;
        else expense += t.amount;
    });
    return { income, expense, balance: income - expense };
}

function formatAmount(amount) {
    const currency = userProfile.currency || 'USD';
    const locale = CURRENCY_LOCALES[currency] || 'en-US';
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
}

// number ko chhote se count-up animation ke saath set karta hai
function animateValue(el, from, to, formatter, duration = 550) {
    const start = performance.now();
    const step = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = formatter(from + (to - from) * eased);
        if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
}

function renderCards() {
    const totals = calculateTotals();
    const prevCount = Number(document.getElementById('cardCount').textContent) || 0;

    animateValue(document.getElementById('cardBalance'), 0, totals.balance, formatAmount);
    animateValue(document.getElementById('cardIncome'), 0, totals.income, formatAmount);
    animateValue(document.getElementById('cardExpense'), 0, totals.expense, formatAmount);
    animateValue(document.getElementById('cardCount'), prevCount, transactions.length, v => Math.round(v).toString());
}

// search aur filter
function getFilteredTransactions() {
    let list = transactions;
    if (currentFilter !== 'all') {
        list = list.filter(t => t.type === currentFilter);
    }
    if (searchQuery.trim() !== '') {
        const q = searchQuery.trim().toLowerCase();
        list = list.filter(t => t.description.toLowerCase().includes(q) || t.category.toLowerCase().includes(q));
    }
    return list;
}

function renderTable() {
    const tbody = document.getElementById('transactionTableBody');
    tbody.innerHTML = '';

    const list = getFilteredTransactions().slice().sort((a, b) => new Date(b.date) - new Date(a.date));

    if (list.length === 0) {
        const row = document.createElement('tr');
        row.className = 'empty-row';
        row.innerHTML = '<td colspan="5">No transactions to show yet. Click "Add Transaction" to get started.</td>';
        tbody.appendChild(row);
        return;
    }

    list.forEach(t => {
        const row = document.createElement('tr');
        const sign = t.type === 'income' ? '+' : '-';

        const dateCell = document.createElement('td');
        dateCell.dataset.label = 'Date';
        dateCell.textContent = formatDate(t.date);

        const descCell = document.createElement('td');
        descCell.dataset.label = 'Description';
        descCell.textContent = t.description;

        const catCell = document.createElement('td');
        catCell.dataset.label = 'Category';
        const pill = document.createElement('span');
        
        pill.className = 'category-pill';
        pill.textContent = t.category;
        catCell.appendChild(pill);

        const amountCell = document.createElement('td');
        amountCell.dataset.label = 'Amount';
        amountCell.className = `amount-cell ${t.type}`;
        amountCell.textContent = `${sign} ${formatAmount(t.amount)}`;

        const actionCell = document.createElement('td');
        actionCell.dataset.label = '';
        const delBtn = document.createElement('button');

        delBtn.className = 'delete-btn';
        delBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 7H20M9 7V4.5A1.5 1.5 0 0 1 10.5 3H13.5A1.5 1.5 0 0 1 15 4.5V7M18 7L17.3 19A2 2 0 0 1 15.3 21H8.7A2 2 0 0 1 6.7 19L6 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg> Delete';
        delBtn.dataset.id = t.id;
        actionCell.appendChild(delBtn);

        row.append(dateCell, descCell, catCell, amountCell, actionCell);
        tbody.appendChild(row);
    });
}

function formatDate(dateStr) {
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}

// same date ki transactions chart ke liye combine
function buildDailyTotals() {
    const byDate = new Map();
    transactions.forEach(t => {
        if (!byDate.has(t.date)) byDate.set(t.date, { income: 0, expense: 0 });
        byDate.get(t.date)[t.type] += t.amount;
    });
    return [...byDate.entries()].sort((a, b) => new Date(a[0]) - new Date(b[0]));
}

// chart create ya update
function updateChart() {
    const ctx = document.getElementById('cashFlowChart').getContext('2d');
    const daily = buildDailyTotals();
    const labels = daily.map(([date]) => formatDate(date));
    const incomeData = daily.map(([, totals]) => totals.income);
    const expenseData = daily.map(([, totals]) => totals.expense);
    const isDark = document.body.classList.contains('dark');
    // console.log(daily);

    if (cashFlowChart) {
        cashFlowChart.data.labels = labels.length ? labels : ['No data'];
        cashFlowChart.data.datasets[0].data = incomeData.length ? incomeData : [0];
        cashFlowChart.data.datasets[1].data = expenseData.length ? expenseData : [0];

        cashFlowChart.options.plugins.legend.labels.color = isDark ? '#e2e8f0' : '#1e2130';
        cashFlowChart.options.scales.x.ticks.color = isDark ? '#94a3b8' : '#6b7280';
        cashFlowChart.options.scales.x.grid.color = isDark ? '#334155' : '#e5e7eb';
        cashFlowChart.options.scales.y.ticks.color = isDark ? '#94a3b8' : '#6b7280';
        cashFlowChart.options.scales.y.grid.color = isDark ? '#334155' : '#e5e7eb';
        cashFlowChart.update();
        return;
    }

    cashFlowChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels.length ? labels : ['No data'],
            datasets: [
                {
                    label: 'Income',
                    data: incomeData.length ? incomeData : [0],
                    backgroundColor: '#16a34a',
                    borderRadius: 4
                },
                {
                    label: 'Expenses',
                    data: expenseData.length ? expenseData : [0],
                    backgroundColor: '#8b0000',
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: isDark ? '#e2e8f0' : '#1e2130' } } },
            scales: {
                x: { ticks: { color: isDark ? '#94a3b8' : '#6b7280' }, grid: { color: isDark ? '#334155' : '#e5e7eb' } },
                y: { ticks: { color: isDark ? '#94a3b8' : '#6b7280' }, grid: { color: isDark ? '#334155' : '#e5e7eb' } }
            }
        }
    });
}

function renderDashboard() {
    renderCards();
    renderTable();
    updateChart();
    renderCategoryFilter();
    updateCategoryPie();
    updateExpenseSummary();
}

function periodKey(date, period) {
    return period === 'year' ? date.slice(0, 4) : date.slice(0, 7);
}

function expenseTransactions() {
    const from = document.getElementById('expenseFrom').value;
    const to = document.getElementById('expenseTo').value;
    const category = document.getElementById('expenseCategoryFilter').value;
    const period = document.getElementById('expensePeriod').value;
    const currentMonth = new Date().toISOString().slice(0, 7);
    const currentYear = currentMonth.slice(0, 4);
    return transactions.filter(t => t.type === 'expense' &&
        (period === 'all' || (period === 'month' ? t.date.slice(0, 7) === currentMonth : t.date.slice(0, 4) === currentYear)) &&
        (!from || t.date >= from) && (!to || t.date <= to) &&
        (category === 'all' || t.category === category));
}

function renderCategoryFilter() {
    const select = document.getElementById('expenseCategoryFilter');
    if (!select) return;
    const current = select.value || 'all';
    const categories = [...new Set(transactions.filter(t => t.type === 'expense').map(t => t.category))].sort();
    select.innerHTML = '';
    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = 'All categories';
    select.appendChild(allOption);
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        select.appendChild(option);
    });
    select.value = categories.includes(current) ? current : 'all';
}

function updateCategoryPie() {
    const canvas = document.getElementById('categoryPieChart');
    if (!canvas || typeof Chart === 'undefined') return;
    const sums = new Map();
    transactions.filter(t => t.type === 'expense').forEach(t => {
        const key = periodKey(t.date, selectedChartPeriod);
        if (!sums.has(key)) sums.set(key, new Map());
        const map = sums.get(key);
        map.set(t.category, (map.get(t.category) || 0) + Number(t.amount));
    });
    const target = selectedChartPeriod === 'year' ? new Date().getFullYear().toString() : new Date().toISOString().slice(0, 7);
    const dataMap = sums.get(target) || new Map();
    const labels = [...dataMap.keys()];
    const data = [...dataMap.values()];
    const colors = ['#159447', '#42d978', '#087a3d', '#7bcf9a', '#ad3b34', '#d78b43', '#6b7d72', '#315c45'];
    const isDark = document.body.classList.contains('dark');
    if (!categoryPieChart) {
        categoryPieChart = new Chart(canvas, { type: 'doughnut', data: { labels: labels.length ? labels : ['No expenses'], datasets: [{ data: data.length ? data : [1], backgroundColor: data.length ? colors : ['#b9cdbf'], borderWidth: 2, borderColor: isDark ? '#0b1510' : '#fff' }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: isDark ? '#e5f4e9' : '#0b1710' } } } } });
    } else {
        categoryPieChart.data.labels = labels.length ? labels : ['No expenses'];
        categoryPieChart.data.datasets[0].data = data.length ? data : [1];
        categoryPieChart.data.datasets[0].backgroundColor = data.length ? colors : ['#b9cdbf'];
        categoryPieChart.options.plugins.legend.labels.color = isDark ? '#e5f4e9' : '#0b1710';
        categoryPieChart.update();
    }
}

function updateExpenseSummary() {
    const total = expenseTransactions().reduce((sum, t) => sum + Number(t.amount), 0);
    const el = document.getElementById('filteredExpenseTotal');
    if (el) el.textContent = formatAmount(total);
}

function exportExpenseCsv() {
    const rows = [['Date', 'Description', 'Category', 'Amount'], ...expenseTransactions().map(t => [t.date, t.description, t.category, t.amount])];
    downloadBlob(rows.map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n'), 'expenses.csv', 'text/csv');
}

function downloadBlob(content, filename, type) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([content], { type }));
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function exportExpensePng() {
    const chart = categoryPieChart || cashFlowChart;
    if (!chart) { showToast('Chart is not ready yet'); return; }
    const link = document.createElement('a');
    link.download = 'expense-chart.png';
    link.href = chart.toBase64Image();
    link.click();
}

function setCalculatorFields() {
    const type = document.getElementById('calculatorType').value;
    const mf = type === 'mutual-fund';
    document.querySelectorAll('.calc-field').forEach(el => {
        const isMf = el.classList.contains('mf-field');
        const isCompare = el.classList.contains('mf-compare-field');
        el.classList.toggle('hidden', isCompare ? !mf || !document.getElementById('mfCompare').checked :
            isMf ? !mf : (el.dataset.calc === 'lump' && !['fd', 'swp'].includes(type)) ||
            (el.dataset.calc === 'recurring' && !['sip', 'rd'].includes(type)) || (el.dataset.calc === 'swp' && type !== 'swp'));
    });
    document.getElementById('calcRate').value = type === 'fd' || type === 'rd' ? 7 : 12;
    const mode = document.getElementById('mfReturnMode');
    document.getElementById('calcRate').disabled = mf && mode.value === 'historical';
}

function numberInput(id, fallback = 0) {
    const value = Number(document.getElementById(id).value);
    return Number.isFinite(value) ? value : fallback;
}

function addResult(container, label, value) {
    const box = document.createElement('div');
    const caption = document.createElement('span');
    caption.textContent = label;
    const strong = document.createElement('strong');
    strong.textContent = formatAmount(value);
    box.append(caption, strong);
    container.appendChild(box);
}

function validateMutualFund() {
    const fields = ['mfLumpSum', 'mfSip', 'calcYears', 'calcRate', 'mfExpense', 'mfExitLoad', 'mfInflation', 'mfStepUp'];
    if (!document.getElementById('mfStartDate').value || fields.some(id => numberInput(id) < 0) || !Number.isInteger(numberInput('calcYears')) ||
        numberInput('calcYears') < 1 || numberInput('calcYears') > 100 || numberInput('mfLumpSum') + numberInput('mfSip') <= 0 ||
        numberInput('calcRate') > 100 || numberInput('mfExpense') > 20 || numberInput('mfExitLoad') > 20) return false;
    if (document.getElementById('mfCompare').checked &&
        (numberInput('mfRate2') < 0 || numberInput('mfRate2') > 100 || numberInput('mfExpense2') < 0 || numberInput('mfExpense2') > 20 || numberInput('mfExitLoad2') < 0 || numberInput('mfExitLoad2') > 20)) return false;
    return true;
}

function projectMutualFund(rate, expense, exitLoad) {
    const years = numberInput('calcYears');
    const months = years * 12;
    const lump = numberInput('mfLumpSum');
    const sip = numberInput('mfSip');
    const step = numberInput('mfStepUp') / 100;
    const monthlyRate = Math.pow(1 + (rate - expense) / 100, 1 / 12) - 1;
    let balance = lump, invested = lump, totalFees = 0, previousYear = { opening: lump, contributions: 0, returns: 0, fees: 0 };
    const schedule = [];
    for (let month = 1; month <= months; month += 1) {
        const contribution = sip * Math.pow(1 + step, Math.floor((month - 1) / 12));
        const opening = balance;
        balance += contribution;
        const grossReturn = balance * (Math.pow(1 + rate / 100, 1 / 12) - 1);
        const fee = balance * (expense / 100) / 12;
        balance += grossReturn - fee;
        invested += contribution;
        totalFees += fee;
        const year = Math.ceil(month / 12);
        previousYear.contributions += contribution;
        previousYear.returns += grossReturn;
        previousYear.fees += fee;
        if (month % 12 === 0) {
            schedule.push({ year, opening: previousYear.opening, contributions: previousYear.contributions, returns: previousYear.returns, fees: previousYear.fees, closing: balance });
            previousYear = { opening: balance, contributions: 0, returns: 0, fees: 0 };
        }
    }
    const exitValue = balance * (1 - exitLoad / 100);
    const inflation = document.getElementById('mfInflationEnabled').checked ? numberInput('mfInflation') : 0;
    return { schedule, balance, invested, totalFees, exitValue, realValue: exitValue / Math.pow(1 + inflation / 100, years) };
}

function runCalculator() {
    const type = document.getElementById('calculatorType').value;
    if (type === 'mutual-fund') return runMutualFundCalculator();
    if (investmentPieChart) { investmentPieChart.destroy(); investmentPieChart = null; }
    document.getElementById('scheduleBody').replaceChildren();
    const amount = Number(document.getElementById('calcAmount').value);
    const principal = Number(document.getElementById('calcPrincipal').value);
    const rate = Number(document.getElementById('calcRate').value);
    const years = Number(document.getElementById('calcYears').value);
    const withdrawal = Number(document.getElementById('calcWithdrawal').value);
    const recurring = ['sip', 'rd'].includes(type);
    if ((!recurring && (!principal || principal <= 0)) || (recurring && (!amount || amount <= 0)) || !Number.isFinite(rate) || rate < 0 || rate > 100 || !Number.isInteger(years) || years < 1 || years > 100 || (type === 'swp' && (!withdrawal || withdrawal <= 0))) {
        showToast('Enter valid positive values (tenure must be 1–100 years)'); return;
    }
    const months = years * 12, monthlyRate = rate / 1200;
    let balance = recurring ? 0 : principal, invested = recurring ? amount * months : principal;
    const schedule = [];
    for (let month = 1; month <= months; month += 1) {
        if (recurring) balance += amount;
        const interest = balance * monthlyRate;
        balance += interest;
        if (type === 'swp') balance = Math.max(0, balance - withdrawal);
        schedule.push({ month, balance: Math.max(0, balance), interest });
    }
    const finalValue = balance;
    lastCalculation = { type, schedule };
    const result = document.getElementById('calcResults');
    result.innerHTML = `<div><span>Estimated value</span><strong>${formatAmount(finalValue)}</strong></div><div><span>Total invested</span><strong>${formatAmount(invested)}</strong></div><div><span>Estimated growth</span><strong>${formatAmount(finalValue - invested)}</strong></div>`;
    updateInvestmentChart(schedule);
}

function runMutualFundCalculator() {
    if (!validateMutualFund()) { showToast('Enter valid mutual fund values'); return; }
    const mode = document.getElementById('mfReturnMode').value;
    const rate = mode === 'historical' ? 12 : numberInput('calcRate');
    const primary = projectMutualFund(rate, numberInput('mfExpense'), numberInput('mfExitLoad'));
    const compare = document.getElementById('mfCompare').checked ? projectMutualFund(numberInput('mfRate2'), numberInput('mfExpense2'), numberInput('mfExitLoad2')) : null;
    lastCalculation = { type: 'mutual-fund', schedule: primary.schedule, detailed: primary };
    const result = document.getElementById('calcResults');
    result.replaceChildren();
    addResult(result, 'Corpus', primary.balance);
    addResult(result, 'Total invested', primary.invested);
    addResult(result, 'Estimated returns', primary.balance - primary.invested);
    addResult(result, 'Net exit value', primary.exitValue);
    if (document.getElementById('mfInflationEnabled').checked) addResult(result, 'Real value', primary.realValue);
    if (compare) addResult(result, 'Fund 2 net exit', compare.exitValue);
    renderSchedule(primary.schedule);
    updateInvestmentChart(primary.schedule, compare && compare.schedule);
    updateInvestmentPie(primary.invested, primary.balance - primary.invested);
}

function renderSchedule(schedule) {
    const body = document.getElementById('scheduleBody');
    body.replaceChildren();
    schedule.forEach(row => {
        const tr = document.createElement('tr');
        [row.year, row.opening, row.contributions, row.returns, row.fees, row.closing].forEach((value, index) => {
            const td = document.createElement('td');
            td.textContent = index ? formatAmount(value) : String(value);
            tr.appendChild(td);
        });
        body.appendChild(tr);
    });
}

function updateInvestmentChart(schedule, compareSchedule) {
    const canvas = document.getElementById('investmentChart');
    if (!canvas || typeof Chart === 'undefined') return;
    if (!schedule.length || !Object.prototype.hasOwnProperty.call(schedule[0], 'closing')) {
        const labels = schedule.map(s => `M${s.month}`);
        const values = schedule.map(s => s.balance);
        const datasets = [{ label: 'Projected balance', data: values, borderColor: '#159447', backgroundColor: 'rgba(21,148,71,.16)', fill: true, tension: .25 }];
        if (investmentChart) { investmentChart.data.labels = labels; investmentChart.data.datasets = datasets; investmentChart.update(); return; }
        investmentChart = new Chart(canvas, { type: 'line', data: { labels, datasets }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } } });
        return;
    }
    const labels = schedule.map(s => `Year ${s.year}`);
    const values = schedule.map(s => s.closing);
    const investedSeries = schedule.map((s, i) => schedule.slice(0, i + 1).reduce((sum, row) => sum + row.contributions, schedule[0].opening));
    const datasets = [{ label: 'Invested', data: investedSeries, borderColor: '#52645a', tension: .25 }, { label: 'Corpus', data: values, borderColor: '#159447', backgroundColor: 'rgba(21,148,71,.16)', fill: true, tension: .25 }];
    if (compareSchedule) datasets.push({ label: 'Fund 2 corpus', data: compareSchedule.map(s => s.closing), borderColor: '#d78b43', tension: .25 });
    if (investmentChart) { investmentChart.data.labels = labels; investmentChart.data.datasets = datasets; investmentChart.update(); return; }
    investmentChart = new Chart(canvas, { type: 'line', data: { labels, datasets }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } } });
}

function updateInvestmentPie(principal, returns) {
    const canvas = document.getElementById('investmentPieChart');
    if (!canvas || typeof Chart === 'undefined') return;
    const data = [principal, Math.max(0, returns)];
    if (investmentPieChart) { investmentPieChart.data.datasets[0].data = data; investmentPieChart.update(); return; }
    investmentPieChart = new Chart(canvas, { type: 'doughnut', data: { labels: ['Principal', 'Returns'], datasets: [{ data, backgroundColor: ['#52645a', '#159447'] }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } } });
}

function exportSchedule() {
    if (!lastCalculation) { showToast('Calculate a result first'); return; }
    const header = lastCalculation.type === 'mutual-fund' ? 'Year,Opening balance,Contributions,Returns,Fees,Closing balance\n' : 'Month,Balance,Interest\n';
    const rows = lastCalculation.type === 'mutual-fund' ? lastCalculation.schedule.map(s => [s.year, s.opening, s.contributions, s.returns, s.fees, s.closing].join(',')) : lastCalculation.schedule.map(s => `${s.month},${s.balance.toFixed(2)},${s.interest.toFixed(2)}`);
    downloadBlob(header + rows.join('\n'), `${lastCalculation.type}-schedule.csv`, 'text/csv');
}

// transaction modal
function openTransactionModal() {
    document.getElementById('addModal').classList.remove('hidden');
    document.getElementById('txnDescription').value = '';
    document.getElementById('txnAmount').value = '';

    document.getElementById('txnDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('txnCategory').selectedIndex = 0;

    document.getElementById('formError').style.display = 'none';
    setTransactionType('income');
}

function closeTransactionModal() {
    document.getElementById('addModal').classList.add('hidden');
}

function handleModalBackdropClick(e) {
    if (e.target.id === 'addModal') closeTransactionModal();
}

function setTransactionType(type) {
    selectedType = type;

    document.getElementById('typeIncomeBtn').classList.toggle('active-income', type === 'income');
    document.getElementById('typeExpenseBtn').classList.toggle('active-expense', type === 'expense');
}

function addTransaction() {
    const description = document.getElementById('txnDescription').value.trim();
    const amount = parseFloat(document.getElementById('txnAmount').value);
    const date = document.getElementById('txnDate').value;
    const category = document.getElementById('txnCategory').value;
    const errorEl = document.getElementById('formError');

    if (!description || !amount || amount <= 0 || !date || !category) {
        errorEl.style.display = 'block';
        return;
    }
    errorEl.style.display = 'none';

    transactions.push({
        id: Date.now(),
        type: selectedType,
        description,
        amount,
        date,
        category
    });
    saveTransactions();
    closeTransactionModal();
    renderDashboard();
    showToast('Transaction added');
}

function removeTransaction(id) {
    transactions = transactions.filter(t => t.id !== id);
    saveTransactions();
    renderDashboard();
}

// profile and theme settings
function saveProfile() {
    userProfile.fullName = document.getElementById('settingsName').value.trim();
    userProfile.currency = document.getElementById('settingsCurrency').value;

    const users = loadUsers();
    const user = users.find(u => u.username === currentUser);
    if (user) {
        user.profile = userProfile;
        saveUsers(users);
    }

    document.getElementById('userChip').textContent = userProfile.fullName || currentUser;
    renderDashboard();
    showToast('Profile updated successfully');
}

function toggleDarkMode() {
    const checked = document.getElementById('darkModeToggle').checked;
    document.body.classList.toggle('dark', checked);

    localStorage.setItem(DARKMODE_KEY, checked ? 'true' : 'false');
    updateChart();
    updateCategoryPie();
}

function resetTransactions() {
    showConfirm(
        'Reset all data?',
        'This will permanently delete all your transactions. This cannot be undone.',
        () => {
            transactions = [];
            saveTransactions();
            renderDashboard();
            showToast('All transactions cleared');
        }
    );
}

function handleSearchInput() {
    searchQuery = document.getElementById('searchInput').value;
    renderTable();
}

function handleTypeFilterChange() {
    currentFilter = document.getElementById('typeFilterSelect').value;
    renderTable();
}

// login ke baad user data load
function bootApp(username) {
    currentUser = username;
    const user = findUser(username);
    userProfile = user.profile || { fullName: username, currency: 'USD' };

    transactions = loadTransactions(username);
    loadMarketPreferences();
    loadAdvisorState();
    loadHalalScreen();

    document.getElementById('settingsName').value = userProfile.fullName || '';
    document.getElementById('settingsCurrency').value = userProfile.currency || 'USD';
    document.getElementById('userChip').textContent = userProfile.fullName || username;

    const darkMode = localStorage.getItem(DARKMODE_KEY) === 'true';
    document.getElementById('darkModeToggle').checked = darkMode;
    document.body.classList.toggle('dark', darkMode);

    showPage('dashboard');
    renderDashboard();
}

// event listeners
function bindEvents() {
    document.getElementById('loginSubmitBtn').addEventListener('click', loginUser);
    document.getElementById('registerSubmitBtn').addEventListener('click', registerUser);

    document.getElementById('goToRegisterLink').addEventListener('click', e => { e.preventDefault(); showAuthPage('register'); });
    document.getElementById('goToLoginLink').addEventListener('click', e => { e.preventDefault(); showAuthPage('login'); });

    // password visibility toggles
    document.querySelectorAll('.toggle-pw').forEach(btn => {
        btn.addEventListener('click', () => {
            const group = btn.closest('.input-icon-group');
            const input = group.querySelector('input');
            const eyeOpen = btn.querySelector('.eye-open');
            const eyeClosed = btn.querySelector('.eye-closed');
            if (input.type === 'password') {
                input.type = 'text';
                eyeOpen.style.display = 'none';
                eyeClosed.style.display = '';
            } else {
                input.type = 'password';
                eyeOpen.style.display = '';
                eyeClosed.style.display = 'none';
            }
        });
    });

    // enter key & form submit handler
    const loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.addEventListener('submit', e => { e.preventDefault(); loginUser(); });
    const registerForm = document.getElementById('registerForm');
    if (registerForm) registerForm.addEventListener('submit', e => { e.preventDefault(); registerUser(); });

    document.getElementById('loginPassword').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); loginUser(); } });
    document.getElementById('loginUsername').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); loginUser(); } });
    document.getElementById('registerPassword').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); registerUser(); } });
    document.getElementById('registerUsername').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); registerUser(); } });

    document.getElementById('navDashboard').addEventListener('click', () => showPage('dashboard'));
    document.getElementById('navMarkets').addEventListener('click', () => showPage('markets'));
    document.getElementById('navAdvisor').addEventListener('click', () => showPage('advisor'));
    document.getElementById('navHalal').addEventListener('click', () => showPage('halal'));
    document.getElementById('navSettings').addEventListener('click', () => showPage('settings'));

    document.getElementById('logoutBtn').addEventListener('click', logoutUser);

    document.getElementById('openAddTransactionBtn').addEventListener('click', openTransactionModal);
    document.getElementById('closeModalBtn').addEventListener('click', closeTransactionModal);
    document.getElementById('addModal').addEventListener('click', handleModalBackdropClick);
    document.getElementById('typeIncomeBtn').addEventListener('click', () => setTransactionType('income'));

    document.getElementById('typeExpenseBtn').addEventListener('click', () => setTransactionType('expense'));
    document.getElementById('saveTransactionBtn').addEventListener('click', addTransaction);

    document.getElementById('transactionTableBody').addEventListener('click', e => {
        const btn = e.target.closest('.delete-btn');
        if (btn) removeTransaction(Number(btn.dataset.id));
    });

    document.getElementById('searchInput').addEventListener('input', handleSearchInput);
    document.getElementById('typeFilterSelect').addEventListener('change', handleTypeFilterChange);

    document.getElementById('darkModeToggle').addEventListener('change', toggleDarkMode);
    document.getElementById('resetDataBtn').addEventListener('click', resetTransactions);
    document.getElementById('saveProfileBtn').addEventListener('click', saveProfile);
    document.querySelectorAll('[data-period]').forEach(button => button.addEventListener('click', () => {
        selectedChartPeriod = button.dataset.period;
        document.querySelectorAll('[data-period]').forEach(b => b.classList.toggle('active', b === button));
        updateCategoryPie();
    }));
    ['expensePeriod', 'expenseFrom', 'expenseTo', 'expenseCategoryFilter'].forEach(id => document.getElementById(id).addEventListener('change', updateExpenseSummary));
    document.getElementById('exportExpenseCsvBtn').addEventListener('click', exportExpenseCsv);
    document.getElementById('exportExpensePngBtn').addEventListener('click', exportExpensePng);
    document.getElementById('calculatorType').addEventListener('change', setCalculatorFields);
    document.getElementById('mfCompare').addEventListener('change', setCalculatorFields);
    document.getElementById('mfReturnMode').addEventListener('change', setCalculatorFields);
    document.getElementById('runCalculatorBtn').addEventListener('click', runCalculator);
    document.getElementById('exportScheduleBtn').addEventListener('click', exportSchedule);
    document.querySelectorAll('[data-advisor-tab]').forEach(button => button.addEventListener('click', () => setAdvisorTab(button.dataset.advisorTab)));
    document.getElementById('runInvestmentAdviceBtn').addEventListener('click', runInvestmentAdvice);
    document.getElementById('runLoanAssessmentBtn').addEventListener('click', runLoanAssessment);
    document.getElementById('runRiskAssessmentBtn').addEventListener('click', runRiskAssessment);
    document.getElementById('runHalalScreenBtn').addEventListener('click', runHalalScreen);
    document.getElementById('sendAdvisorQuestionBtn').addEventListener('click', answerAdvisorQuestion);
    document.getElementById('advisorQuestion').addEventListener('keydown', event => {
        if (event.key === 'Enter') answerAdvisorQuestion();
    });
    document.getElementById('advisorDocument').addEventListener('change', event => {
        const file = event.target.files[0];
        if (!file) return;
        advisorDocuments.push({ name: file.name, size: file.size, type: file.type, addedAt: new Date().toISOString() });
        saveAdvisorState();
        renderAdvisorDocuments();
        logAdvisorEvent('Document received', { name: file.name, type: file.type }, 'Metadata stored locally; manual verification required', 'low');
        showToast('Document added for review');
        event.target.value = '';
    });
    document.getElementById('requestAdvisorReviewBtn').addEventListener('click', () => {
        logAdvisorEvent('Human review requested', { module: advisorActiveTab }, 'Escalation queued for a licensed financial professional', 'high');
        advisorChatMessage('FinTracker AI', 'Your case has been marked for human review. In production, this would create a consented advisor case and notify the assigned reviewer.');
        showToast('Human review request recorded');
    });
    document.getElementById('enableAdvisorNotificationsBtn').addEventListener('click', async () => {
        if (!('Notification' in window)) {
            document.getElementById('advisorNotificationStatus').textContent = 'Browser notifications unavailable';
            return;
        }
        const permission = await Notification.requestPermission();
        document.getElementById('advisorNotificationStatus').textContent = permission === 'granted' ? 'Notifications enabled' : 'Notifications not granted';
    });
    document.getElementById('marketSearch').addEventListener('input', renderMarketTable);
    document.getElementById('marketExchangeFilter').addEventListener('change', renderMarketTable);
    document.getElementById('refreshMarketBtn').addEventListener('click', refreshMarkets);
    document.getElementById('marketTableBody').addEventListener('click', event => {
        const removeButton = event.target.closest('.market-remove');
        if (removeButton) {
            marketWatchlist = marketWatchlist.filter(symbol => symbol !== removeButton.dataset.symbol);
            saveMarketPreferences();
            renderMarketTable();
            return;
        }
        const row = event.target.closest('tr');
        if (row) {
            document.querySelectorAll('#marketTableBody tr').forEach(item => item.classList.toggle('selected', item === row));
            renderMarketHistory(row.dataset.symbol);
        }
    });
    document.querySelectorAll('[data-market-range]').forEach(button => button.addEventListener('click', () => {
        marketRange = button.dataset.marketRange;
        document.querySelectorAll('[data-market-range]').forEach(item => item.classList.toggle('active', item === button));
        const selected = document.querySelector('#marketTableBody tr.selected')?.dataset.symbol || marketWatchlist[0];
        if (selected) renderMarketHistory(selected, marketRange);
    }));
    document.getElementById('addAlertBtn').addEventListener('click', () => {
        const symbol = document.getElementById('alertSymbol').value;
        const price = Number(document.getElementById('alertPrice').value);
        if (!symbol || !Number.isFinite(price) || price <= 0) {
            showToast('Enter a valid alert price');
            return;
        }
        marketAlerts.push({ id: Date.now(), symbol, condition: document.getElementById('alertCondition').value, price, triggered: false });
        saveMarketPreferences();
        renderMarketAlerts();
        document.getElementById('alertPrice').value = '';
        if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
        showToast(`${symbol} price alert added`);
    });
    document.getElementById('marketAlerts').addEventListener('click', event => {
        const button = event.target.closest('.market-alert-remove');
        if (!button) return;
        marketAlerts = marketAlerts.filter(alert => String(alert.id) !== button.dataset.alertId);
        saveMarketPreferences();
        renderMarketAlerts();
    });
    document.getElementById('mfStartDate').value = new Date().toISOString().slice(0, 10);
    setCalculatorFields();
}

document.addEventListener('DOMContentLoaded', () => {
    createFireflies();
    window.addEventListener('pagehide', destroyFireflies, { once: true });
    bindEvents();
    checkSession();
});