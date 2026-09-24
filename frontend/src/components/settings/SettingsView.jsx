import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useFinance } from '../../context/FinanceContext';
import { CURRENCY_LOCALES } from '../../constants';
import { getAccessToken, getAuthHeaders } from '../../services/authToken';

export default function SettingsView() {
    const { currentUser, userProfile, updateProfile, logout } = useAuth();
    const { showToast } = useFinance();

    const [fullName, setFullName] = useState(userProfile.fullName || currentUser || '');
    const [currency, setCurrency] = useState(userProfile.currency || 'USD');
    const [upstoxConnected, setUpstoxConnected] = useState(false);
    const [connectingUpstox, setConnectingUpstox] = useState(false);
    const oauthExchangeStarted = useRef(false);

    useEffect(() => {
        // Check for Upstox OAuth callback code
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state');
        const oauthError = params.get('error_description') || params.get('error');

        const connectUpstox = async (authCode, authState) => {
            if (!authState) {
                showToast('Upstox callback is missing its security state. Start the connection again.', 'error');
                window.history.replaceState({}, document.title, window.location.pathname);
                setConnectingUpstox(false);
                return;
            }
            const accessToken = getAccessToken();
            if (!accessToken) {
                showToast('Sign in to your FinTracker API account below before connecting Upstox.', 'error');
                setConnectingUpstox(false);
                return;
            }
            setConnectingUpstox(true);
            try {
                const res = await fetch('/api/upstox/connect', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken}`
                    },
                    body: JSON.stringify({ code: authCode, state: authState })
                });

                const data = await res.json();
                if (res.ok) {
                    showToast('Successfully connected to Upstox!');
                    setUpstoxConnected(true);
                } else {
                    const statusRes = await fetch('/api/upstox/status', {
                        headers: getAuthHeaders()
                    }).catch(() => null);
                    const status = statusRes?.ok ? await statusRes.json().catch(() => ({})) : {};
                    if (status.connected) {
                        setUpstoxConnected(true);
                        showToast('Upstox is connected.');
                    } else {
                        const message = /invalid.*auth.*code|auth.*code.*invalid/i.test(data.error || '')
                            ? 'Upstox authorization code expired or was already used. Please connect again and complete the login once.'
                            : `Upstox connection failed: ${data.error || 'Token exchange failed'}`;
                        showToast(message, 'error');
                    }
                }
            } catch (err) {
                console.error('Error connecting to Upstox:', err);
                showToast('Upstox connection failed. Server offline?', 'error');
            } finally {
                setConnectingUpstox(false);
                // Clean up URL to remove code
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        };

        if (code) {
            // Authorization codes are single-use. React StrictMode replays mount
            // effects in development, so guard the callback against a duplicate exchange.
            if (oauthExchangeStarted.current) return;
            oauthExchangeStarted.current = true;
            window.history.replaceState({}, document.title, window.location.pathname);
            connectUpstox(code, state);
        } else if (oauthError) {
            window.history.replaceState({}, document.title, window.location.pathname);
            showToast(`Upstox authorization failed: ${oauthError}`, 'error');
        } else {
            const accessToken = getAccessToken();
            if (!accessToken) return;
            // Check current connection status and confirm the API session is still valid.
            fetch('/api/upstox/status', { headers: getAuthHeaders() })
                .then(r => r.json())
                .then(data => {
                    if (data.connected) setUpstoxConnected(true);
                })
                .catch(e => console.error(e));
        }
    }, [showToast]);

    const handleConnectUpstox = () => {
        if (!getAccessToken()) {
            showToast('Your FinTracker API session is unavailable. Sign in again, then retry Upstox.', 'error');
            return;
        }
        setConnectingUpstox(true);
        fetch('/api/upstox/auth-url', { headers: getAuthHeaders() })
            .then(async response => {
                const data = await response.json().catch(() => ({}));
                if (!response.ok || !data.authorizationUrl) throw new Error(data.error || 'Backend could not start Upstox authorization.');
                window.location.assign(data.authorizationUrl);
            })
            .catch(error => {
                setConnectingUpstox(false);
                showToast(`Upstox connection failed: ${error.message}`, 'error');
            });
    };

    const handleSave = (e) => {
        e.preventDefault();
        updateProfile(fullName.trim(), currency);
        showToast('Settings saved successfully!');
    };

    return (
        <div id="settingsPage" className="page-view" style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '60px' }}>
            <div className="page-header" style={{ marginBottom: '24px' }}>
                <div>
                    <h1 className="page-title" style={{ color: '#0F172A', fontSize: '26px', fontWeight: 800 }}>Account &amp; Preferences</h1>
                    <p className="page-subtitle" style={{ color: '#64748B', fontSize: '14px', marginTop: '4px' }}>
                        Configure your financial profile, base reporting currency, and trading integrations.
                    </p>
                </div>
            </div>

            <div style={{ maxWidth: '680px' }}>
                <div style={{ 
                    background: '#FFFFFF', 
                    border: '1px solid #E2E8F0', 
                    borderRadius: '18px', 
                    padding: '32px', 
                    boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.04)' 
                }}>
                    <form onSubmit={handleSave}>
                        <div className="form-group" style={{ marginBottom: '18px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
                                Username
                            </label>
                            <input
                                type="text"
                                value={currentUser || ''}
                                disabled
                                style={{ 
                                    width: '100%', 
                                    padding: '11px 14px', 
                                    background: '#F1F5F9', 
                                    border: '1px solid #E2E8F0', 
                                    borderRadius: '10px', 
                                    color: '#64748B', 
                                    fontSize: '14px',
                                    cursor: 'not-allowed' 
                                }}
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: '18px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
                                Display / Full Name
                            </label>
                            <input
                                type="text"
                                placeholder="Your Name"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                style={{ 
                                    width: '100%', 
                                    padding: '11px 14px', 
                                    background: '#F8FAFC', 
                                    border: '1px solid #E2E8F0', 
                                    borderRadius: '10px', 
                                    color: '#0F172A', 
                                    fontSize: '14px' 
                                }}
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
                                Base Currency
                            </label>
                            <select 
                                value={currency} 
                                onChange={(e) => setCurrency(e.target.value)}
                                style={{ 
                                    width: '100%', 
                                    padding: '11px 14px', 
                                    background: '#F8FAFC', 
                                    border: '1px solid #E2E8F0', 
                                    borderRadius: '10px', 
                                    color: '#0F172A', 
                                    fontSize: '14px',
                                    cursor: 'pointer' 
                                }}
                            >
                                {Object.keys(CURRENCY_LOCALES).map(curr => (
                                    <option key={curr} value={curr}>{curr}</option>
                                ))}
                            </select>
                        </div>

                        <button 
                            type="submit" 
                            className="btn btn-primary" 
                            style={{ 
                                width: '100%', 
                                padding: '12px', 
                                borderRadius: '10px', 
                                fontSize: '14px', 
                                fontWeight: 700,
                                background: '#059669',
                                color: '#FFFFFF',
                                border: 'none',
                                cursor: 'pointer',
                                boxShadow: '0 4px 14px rgba(5, 150, 105, 0.25)'
                            }}
                        >
                            Save Preferences
                        </button>
                    </form>

                    {/* Brokerage Integrations */}
                    <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #E2E8F0' }}>
                        <div style={{ fontWeight: 700, fontSize: '15px', color: '#0F172A', marginBottom: '4px' }}>Brokerage Integrations</div>
                        <div style={{ fontSize: '12.5px', color: '#64748B', marginBottom: '16px' }}>Connect external broker accounts to sync live trading data.</div>

                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '16px',
                            background: '#F8FAFC',
                            border: '1px solid #E2E8F0',
                            borderRadius: '12px',
                            marginBottom: '16px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '10px',
                                    background: '#53228a',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#fff',
                                    fontWeight: 'bold',
                                    fontSize: '18px'
                                }}>
                                    U
                                </div>
                                <div>
                                    <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '14px' }}>Upstox Brokerage</div>
                                    <div style={{ fontSize: '12px', color: upstoxConnected ? '#059669' : '#64748B' }}>
                                        {upstoxConnected ? 'Connected via OAuth' : 'Not connected'}
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '8px' }}>
                                {upstoxConnected && (
                                    <button
                                        type="button"
                                        className="btn"
                                        onClick={async () => {
                                            try {
                                                await fetch('/api/upstox/disconnect', { 
                                                    method: 'POST',
                                                    headers: getAuthHeaders()
                                                });
                                                setUpstoxConnected(false);
                                                showToast('Disconnected from Upstox');
                                            } catch (e) {
                                                console.error(e);
                                            }
                                        }}
                                        style={{
                                            background: '#FEF2F2',
                                            color: '#DC2626',
                                            border: '1px solid #FECACA',
                                            padding: '8px 16px',
                                            borderRadius: '8px',
                                            fontWeight: 700,
                                            fontSize: '12.5px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Disconnect
                                    </button>
                                )}
                                <button
                                    type="button"
                                    className="btn"
                                    onClick={handleConnectUpstox}
                                    disabled={connectingUpstox}
                                    style={{
                                        background: upstoxConnected ? '#ECFDF5' : '#FFFFFF',
                                        color: upstoxConnected ? '#059669' : '#53228a',
                                        border: `1px solid ${upstoxConnected ? '#A7F3D0' : '#E2E8F0'}`,
                                        padding: '8px 16px',
                                        borderRadius: '8px',
                                        fontWeight: 700,
                                        fontSize: '12.5px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {connectingUpstox ? 'Connecting...' : upstoxConnected ? 'Reconnect' : 'Connect'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Session Management */}
                    <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #E2E8F0' }}>
                        <button
                            type="button"
                            className="btn"
                            style={{ 
                                width: '100%',
                                background: '#FEF2F2',
                                color: '#DC2626', 
                                border: '1px solid #FECACA',
                                padding: '11px',
                                borderRadius: '10px',
                                fontWeight: 700,
                                fontSize: '13px',
                                cursor: 'pointer'
                            }}
                            onClick={logout}
                        >
                            Sign Out of Session
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
