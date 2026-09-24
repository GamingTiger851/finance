import React, { useState, useEffect } from 'react';
import AppFooter from '../layout/AppFooter';

export default function ResetPasswordPage() {
    const [token, setToken] = useState(null);

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const urlToken = urlParams.get('token');
        if (!urlToken) {
            setError('No reset token found in URL.');
        } else {
            setToken(urlToken);
        }
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (password.length < 8) {
            setError('Password must be at least 8 characters long.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);

        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password })
            });
            const data = await res.json();
            
            if (!res.ok) {
                throw new Error(data.error || 'Failed to reset password');
            }

            setSuccess(data.message || 'Password successfully reset.');
            setTimeout(() => {
                window.location.href = '/';
            }, 3000);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-wrap">
            <div className="auth-perspective" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', zIndex: 1 }}>
                <div className="auth-face auth-face--front" style={{ position: 'relative', width: '100%', maxWidth: '450px', transform: 'none', transition: 'none' }}>
                    <div className="login-card__right" style={{ width: '100%' }}>
                        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                            <img src="/logo.png" alt="HAWKS Intelligence" style={{ width: '60px', height: '60px', borderRadius: '14px', objectFit: 'contain', background: '#090D16', padding: '4px', border: '1px solid #E2E8F0', margin: '0 auto 16px', display: 'block', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }} />
                            <h2 className="auth-title">Set New Password</h2>
                            <p className="tagline">Enter your new secure password below</p>
                        </div>

                        {error && (
                            <div className="form-error" style={{ display: 'block', marginBottom: '1rem' }}>
                                {error}
                            </div>
                        )}

                        {success ? (
                            <div style={{ textAlign: 'center' }}>
                                <div className="form-error" style={{ display: 'block', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', border: '1px solid rgba(16,185,129,0.3)', marginBottom: '1.5rem', padding: '1rem', borderRadius: '8px' }}>
                                    {success}
                                </div>
                                <button className="btn btn-login btn-block" onClick={() => window.location.href = '/'}>
                                    <span className="btn-text">Return to Login</span>
                                </button>
                            </div>
                        ) : (
                            <form className="auth-form" onSubmit={handleSubmit} autoComplete="off">
                                <div className="input-icon-group">
                                    <span className="input-icon">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                            <rect x="4" y="10" width="16" height="11" rx="2" stroke="currentColor" strokeWidth="1.8" />
                                            <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                            <circle cx="12" cy="16" r="1.5" fill="currentColor" />
                                        </svg>
                                    </span>
                                    <input
                                        type="password"
                                        placeholder="New Password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        disabled={!token || loading}
                                    />
                                    <span className="input-focus-bar" />
                                </div>

                                <div className="input-icon-group">
                                    <span className="input-icon">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                            <rect x="4" y="10" width="16" height="11" rx="2" stroke="currentColor" strokeWidth="1.8" />
                                            <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                            <circle cx="12" cy="16" r="1.5" fill="currentColor" />
                                        </svg>
                                    </span>
                                    <input
                                        type="password"
                                        placeholder="Confirm New Password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        disabled={!token || loading}
                                    />
                                    <span className="input-focus-bar" />
                                </div>

                                <button
                                    type="submit"
                                    className={`btn btn-login btn-block ${loading ? 'is-loading' : ''}`}
                                    disabled={!token || loading}
                                    style={{ marginTop: '1.5rem' }}
                                >
                                    <span className="btn-text">Reset Password</span>
                                    <span className="btn-spinner" />
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
            <AppFooter className="auth-bottom-footer" />
        </div>
    );
}
