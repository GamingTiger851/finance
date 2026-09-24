const User = require('../models/User');
const UpstoxClient = require('upstox-js-sdk');
const crypto = require('crypto');

const UPSTOX_AUTHORIZE_URL = 'https://api.upstox.com/v2/login/authorization/dialog';
const UPSTOX_TOKEN_URL = 'https://api.upstox.com/v2/login/authorization/token';

function getUpstoxConfig() {
    const { UPSTOX_CLIENT_ID: clientId, UPSTOX_CLIENT_SECRET: clientSecret, UPSTOX_REDIRECT_URI: redirectUri } = process.env;
    return { clientId, clientSecret, redirectUri };
}

function configIsReady(config, { needSecret = false } = {}) {
    return Boolean(config.clientId && config.redirectUri && (!needSecret || config.clientSecret));
}

async function parseResponse(response) {
    return response.json().catch(() => ({}));
}

exports.authUrl = async (req, res) => {
    try {
        const config = getUpstoxConfig();
        if (!configIsReady(config)) {
            return res.status(503).json({ error: 'Upstox OAuth is not configured on the server. Set UPSTOX_CLIENT_ID and UPSTOX_REDIRECT_URI.' });
        }
        const user = await User.findById(req.user.sub);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const state = crypto.randomBytes(32).toString('base64url');
        user.upstoxOAuthStateHash = crypto.createHash('sha256').update(state).digest('hex');
        user.upstoxOAuthStateExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await user.save();

        const url = new URL(UPSTOX_AUTHORIZE_URL);
        url.searchParams.set('response_type', 'code');
        url.searchParams.set('client_id', config.clientId);
        url.searchParams.set('redirect_uri', config.redirectUri);
        url.searchParams.set('state', state);
        res.json({ authorizationUrl: url.toString() });
    } catch (error) {
        console.error('Upstox auth URL error:', error.message);
        res.status(500).json({ error: 'Unable to start Upstox authorization.' });
    }
};

exports.connect = async (req, res) => {
    try {
        const { code, state } = req.body;
        if (!code || !state) {
            return res.status(400).json({ error: 'Authorization code and state are required. Restart the Upstox connection flow.' });
        }

        const config = getUpstoxConfig();

        if (!configIsReady(config, { needSecret: true })) {
            return res.status(503).json({ error: 'Upstox OAuth is not configured on the server. Set UPSTOX_CLIENT_ID, UPSTOX_CLIENT_SECRET, and UPSTOX_REDIRECT_URI.' });
        }

        const user = await User.findById(req.user.sub);
        if (!user) return res.status(404).json({ error: 'User not found' });
        const receivedHash = crypto.createHash('sha256').update(String(state)).digest();
        const savedHash = user.upstoxOAuthStateHash ? Buffer.from(user.upstoxOAuthStateHash, 'hex') : Buffer.alloc(0);
        const stateIsValid = savedHash.length === receivedHash.length && crypto.timingSafeEqual(savedHash, receivedHash);
        if (!stateIsValid || !user.upstoxOAuthStateExpiresAt || user.upstoxOAuthStateExpiresAt.getTime() < Date.now()) {
            user.upstoxOAuthStateHash = undefined;
            user.upstoxOAuthStateExpiresAt = undefined;
            await user.save();
            return res.status(400).json({ error: 'Upstox authorization state is invalid or expired. Start the connection again.' });
        }

        // OAuth codes are single-use: clear state before exchanging to reject replayed requests.
        user.upstoxOAuthStateHash = undefined;
        user.upstoxOAuthStateExpiresAt = undefined;
        await user.save();

        // Exchange code for access token
        const tokenResponse = await fetch(UPSTOX_TOKEN_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            body: new URLSearchParams({
                code,
                client_id: config.clientId,
                client_secret: config.clientSecret,
                redirect_uri: config.redirectUri,
                grant_type: 'authorization_code'
            })
        });

        const data = await parseResponse(tokenResponse);

        if (!tokenResponse.ok) {
            const message = data.errors?.[0]?.message || data.message || 'Failed to exchange authorization code';
            console.error('Upstox token exchange failed:', tokenResponse.status, message);
            return res.status(tokenResponse.status).json({ error: message });
        }

        const accessToken = data.access_token;
        if (!accessToken) {
            return res.status(500).json({ error: 'Access token not received from Upstox' });
        }

        // The broker access token is stored only in the backend database.
        user.upstoxAccessToken = accessToken;
        await user.save();

        res.json({ success: true, message: 'Successfully connected to Upstox' });

    } catch (err) {
        console.error('Upstox connection error:', err);
        res.status(500).json({ error: 'Internal server error during connection' });
    }
};

exports.disconnect = async (req, res) => {
    try {
        const user = await User.findById(req.user.sub);
        if (!user) return res.status(404).json({ error: 'User not found' });
        
        user.upstoxAccessToken = undefined;
        user.upstoxOAuthStateHash = undefined;
        user.upstoxOAuthStateExpiresAt = undefined;
        await user.save();
        
        res.json({ success: true, message: 'Disconnected from Upstox' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to disconnect' });
    }
};

exports.status = async (req, res) => {
    try {
        const user = await User.findById(req.user.sub);
        if (!user || !user.upstoxAccessToken) return res.json({ connected: false });
        const response = await fetch('https://api.upstox.com/v2/user/profile', {
            headers: { Accept: 'application/json', Authorization: `Bearer ${user.upstoxAccessToken}` },
            signal: AbortSignal.timeout(8000)
        });
        if (response.status === 401) {
            user.upstoxAccessToken = undefined;
            await user.save();
            return res.json({ connected: false, reason: 'expired' });
        }
        if (!response.ok) return res.status(502).json({ connected: false, error: 'Unable to verify the Upstox session right now.' });
        res.json({ connected: true });
    } catch (err) {
        console.error('Upstox status error:', err.message);
        res.status(500).json({ error: 'Failed to fetch status' });
    }
};

exports.profile = async (req, res) => {
    try {
        const user = await User.findById(req.user.sub);
        if (!user || !user.upstoxAccessToken) {
            return res.status(400).json({ error: 'Upstox not connected' });
        }

        const profileRes = await fetch('https://api.upstox.com/v2/user/profile', {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${user.upstoxAccessToken}`
            }
        });

        const data = await profileRes.json();
        
        if (!profileRes.ok) {
            // Token might be expired or invalid
            if (profileRes.status === 401) {
                user.upstoxAccessToken = undefined;
                await user.save();
            }
            return res.status(profileRes.status).json({ error: data.errors?.[0]?.message || 'Failed to fetch Upstox profile' });
        }

        res.json(data);
    } catch (err) {
        console.error('Upstox profile error:', err);
        res.status(500).json({ error: 'Internal server error fetching profile' });
    }
};

// 1. Fetch live quotes for multiple instrument keys (comma-separated)
exports.getQuotes = async (req, res) => {
    try {
        const user = await User.findById(req.user.sub);
        if (!user || !user.upstoxAccessToken) {
            return res.status(401).json({ error: 'Upstox not connected. Please authorize in Settings.' });
        }

        const { instrument_keys } = req.query;
        if (!instrument_keys) {
            return res.status(400).json({ error: 'instrument_keys query parameter is required' });
        }

        const encodedKeys = instrument_keys.split(',').map(encodeURIComponent).join(',');
        const response = await fetch(`https://api.upstox.com/v2/market-quote/quotes?instrument_key=${encodedKeys}`, {
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${user.upstoxAccessToken}`
            }
        });

        const data = await response.json();
        if (!response.ok) {
            if (response.status === 401) {
                user.upstoxAccessToken = undefined;
                await user.save();
            }
            return res.status(response.status).json(data);
        }

        res.json({ success: true, data: data.data });
    } catch (err) {
        console.error('Upstox Quotes error:', err);
        res.status(500).json({ error: 'Failed to fetch Upstox live quotes' });
    }
};

// Stream live market data to the authenticated browser over SSE. The Upstox
// bearer token stays on the server; only decoded feed messages reach the UI.
exports.stream = async (req, res) => {
    let streamer;
    let reconnectTimer;
    let heartbeatTimer;
    let closed = false;
    let retryDelay = 1000;

    const send = (event, payload) => {
        if (!closed && !res.writableEnded) {
            res.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
            if (typeof res.flush === 'function') res.flush();
        }
    };

    try {
        const user = await User.findById(req.user.sub);
        if (!user || !user.upstoxAccessToken) {
            return res.status(401).json({ error: 'Upstox not connected. Connect Upstox in Settings first.' });
        }

        const keys = [...new Set(String(req.query.instrument_keys || '').split(',').filter(Boolean))];
        const validKey = /^(NSE_EQ|BSE_EQ|NSE_INDEX|BSE_INDEX)\|[A-Za-z0-9 .:_-]+$/i;
        if (!keys.length || keys.length > 123 || keys.some(key => !validKey.test(key))) {
            return res.status(400).json({ error: 'Provide 1–123 valid Upstox instrument keys.' });
        }

        res.status(200);
        res.set({
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no'
        });
        res.flushHeaders();
        send('status', { status: 'connecting' });

        const connect = () => {
            if (closed) return;
            try {
                const client = new UpstoxClient.ApiClient();
                client.authentications.OAUTH2.accessToken = user.upstoxAccessToken;
                streamer = new UpstoxClient.MarketDataStreamerV3(keys, 'full');
                streamer.autoReconnect(false);
                streamer.on('open', () => {
                    retryDelay = 1000;
                    send('status', { status: 'connected' });
                });
                streamer.on('message', data => {
                    try {
                        const message = JSON.parse(data.toString());
                        if (message && message.feeds) send('feed', message);
                    } catch (error) {
                        console.warn('Unable to decode Upstox stream message:', error.message);
                    }
                });
                streamer.on('error', () => send('status', { status: 'reconnecting' }));
                streamer.on('close', () => {
                    if (closed) return;
                    send('status', { status: 'reconnecting' });
                    reconnectTimer = setTimeout(connect, retryDelay);
                    retryDelay = Math.min(retryDelay * 2, 30000);
                });
                streamer.connect().catch(() => {
                    if (closed) return;
                    send('status', { status: 'reconnecting' });
                    reconnectTimer = setTimeout(connect, retryDelay);
                    retryDelay = Math.min(retryDelay * 2, 30000);
                });
            } catch (error) {
                send('status', { status: 'error', message: 'Unable to start the Upstox market feed.' });
            }
        };

        heartbeatTimer = setInterval(() => {
            if (!closed) {
                res.write(': keep-alive\n\n');
                if (typeof res.flush === 'function') res.flush();
            }
        }, 20000);
        res.on('close', () => {
            closed = true;
            clearInterval(heartbeatTimer);
            clearTimeout(reconnectTimer);
            if (streamer) {
                try { streamer.disconnect(); } catch { /* socket already closed */ }
            }
        });
        connect();
    } catch (error) {
        if (!res.headersSent) res.status(500).json({ error: 'Failed to start Upstox market feed.' });
        else send('status', { status: 'error', message: 'Failed to start Upstox market feed.' });
    }
};

// 2. Fetch Last Traded Price (LTP)
exports.getLtp = async (req, res) => {
    try {
        const user = await User.findById(req.user.sub);
        if (!user || !user.upstoxAccessToken) {
            return res.status(401).json({ error: 'Upstox not connected.' });
        }

        const { instrument_keys } = req.query;
        if (!instrument_keys) {
            return res.status(400).json({ error: 'instrument_keys query parameter is required' });
        }
        const keys = [...new Set(String(instrument_keys).split(',').filter(Boolean))];
        if (!keys.length || keys.length > 500 || keys.some(key => !/^(NSE_EQ|BSE_EQ|NSE_INDEX|BSE_INDEX)\|[A-Za-z0-9 .:_-]+$/i.test(key))) {
            return res.status(400).json({ error: 'Provide 1–500 valid Upstox instrument keys.' });
        }
        const encodedKeys = keys.map(encodeURIComponent).join(',');
        const response = await fetch(`https://api.upstox.com/v3/market-quote/ltp?instrument_key=${encodedKeys}`, {
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${user.upstoxAccessToken}`
            }
        });

        const data = await parseResponse(response);
        if (!response.ok) {
            if (response.status === 401) {
                user.upstoxAccessToken = undefined;
                await user.save();
            }
            return res.status(response.status).json(data);
        }
        res.json(data);
    } catch (err) {
        console.error('Upstox LTP error:', err.message);
        res.status(500).json({ error: 'Failed to fetch Upstox market prices.' });
    }
};

// 3. Historical Candle Data for charts
exports.getCandles = async (req, res) => {
    try {
        const user = await User.findById(req.user.sub);
        if (!user || !user.upstoxAccessToken) {
            return res.status(401).json({ error: 'Upstox is not connected. Reconnect it in Settings.' });
        }

        const { instrumentKey, interval = 'day', to_date, from_date } = req.query;
        if (typeof instrumentKey !== 'string' || !/^(NSE_EQ|BSE_EQ|NSE_INDEX|BSE_INDEX)\|[A-Za-z0-9 .:_-]+$/i.test(instrumentKey)) {
            return res.status(400).json({ error: 'A valid Upstox instrumentKey is required.' });
        }

        // Upstox v3 replaces the deprecated v2 candle endpoints and represents
        // the candle size as a unit plus a numeric interval.
        const intervals = {
            '1minute': { unit: 'minutes', value: '1' },
            '30minute': { unit: 'minutes', value: '30' },
            day: { unit: 'days', value: '1' },
        };
        const candleInterval = intervals[interval];
        if (!candleInterval) {
            return res.status(400).json({ error: 'Supported candle intervals are 1minute, 30minute, and day.' });
        }

        const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
        const endDate = to_date || new Date().toISOString().slice(0, 10);
        if (from_date && (!validDate(from_date) || !validDate(endDate) || from_date > endDate)) {
            return res.status(400).json({ error: 'Candle dates must be valid YYYY-MM-DD dates with from_date on or before to_date.' });
        }

        const instrument = encodeURIComponent(instrumentKey);
        const path = from_date
            ? `/v3/historical-candle/${instrument}/${candleInterval.unit}/${candleInterval.value}/${endDate}/${from_date}`
            : `/v3/historical-candle/intraday/${instrument}/${candleInterval.unit}/${candleInterval.value}`;
        const response = await fetch(`https://api.upstox.com${path}`, {
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${user.upstoxAccessToken}`
            }
        });

        const data = await parseResponse(response);
        if (!response.ok) {
            const message = data.errors?.[0]?.message || data.message || 'Upstox could not return historical candles.';
            if (response.status === 401) {
                user.upstoxAccessToken = undefined;
                await user.save();
            }
            return res.status(response.status).json({ error: message });
        }
        res.status(response.status).json(data);
    } catch (err) {
        console.error('Upstox candles error:', err.message);
        res.status(500).json({ error: 'Failed to fetch candles' });
    }
};
