import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import AppFooter from '../layout/AppFooter';

export default function AuthPage() {
    const { login, register } = useAuth();
    const [isFlipped, setIsFlipped] = useState(false);
    
    // Login form state
    const [loginUser, setLoginUser] = useState('');
    const [loginPass, setLoginPass] = useState('');
    const [loginShowPass, setLoginShowPass] = useState(false);
    const [loginError, setLoginError] = useState('');
    const [loginLoading, setLoginLoading] = useState(false);

    // Forgot password state
    const [showForgot, setShowForgot] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotMsg, setForgotMsg] = useState('');
    const [forgotLoading, setForgotLoading] = useState(false);

    // Register form state
    const [regUser, setRegUser] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regPass, setRegPass] = useState('');
    const [regShowPass, setRegShowPass] = useState(false);
    const [regError, setRegError] = useState('');
    const [regLoading, setRegLoading] = useState(false);

    // Success ripple transition
    const [rippleActive, setRippleActive] = useState(false);

    const loginUserRef = useRef(null);
    const regUserRef = useRef(null);

    const handleFlip = (toRegister) => {
        setIsFlipped(toRegister);
        setLoginError('');
        setRegError('');
        setShowForgot(false);
        setForgotMsg('');
        setTimeout(() => {
            if (toRegister) {
                if (regUserRef.current) regUserRef.current.focus();
            } else {
                if (loginUserRef.current) loginUserRef.current.focus();
            }
        }, 400);
    };

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setLoginError('');

        if (!loginUser.trim() || !loginPass) {
            setLoginError('Invalid email/username or password.');
            return;
        }

        setLoginLoading(true);

        try {
            await login(loginUser, loginPass);
            // Trigger ripple effect
            setRippleActive(true);
            setTimeout(() => {
                setLoginLoading(false);
            }, 600);
        } catch (err) {
            setLoginLoading(false);
            setLoginError(err.message || 'Invalid email/username or password.');
        }
    };

    const handleForgotSubmit = async (e) => {
        e.preventDefault();
        setForgotMsg('');
        
        if (!forgotEmail.trim() || !forgotEmail.includes('@')) {
            setForgotMsg('Please enter a valid email address.');
            return;
        }

        setForgotLoading(true);
        
        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: forgotEmail })
            });
            const data = await res.json();
            
            if (!res.ok) {
                throw new Error(data.error || 'Something went wrong');
            }
            
            setForgotMsg(data.message || 'If an account exists, a reset link has been sent.');
            setForgotEmail('');
        } catch (err) {
            setForgotMsg(err.message);
        } finally {
            setForgotLoading(false);
        }
    };

    const handleRegisterSubmit = (e) => {
        e.preventDefault();
        setRegError('');

        if (!regUser.trim() || !regPass || !regEmail.trim()) {
            setRegError('Please fill in username, email, and password.');
            return;
        }

        if (!regEmail.includes('@') || !regEmail.includes('.')) {
            setRegError('Please provide a valid email address.');
            return;
        }

        setRegLoading(true);

        setTimeout(async () => {
            try {
                await register(regUser, regEmail, regPass);
                setRegLoading(false);
                // Switch to login card with prefilled email/username
                setLoginUser(regEmail.trim() || regUser.trim());
                setLoginPass('');
                setRegPass('');
                setRegEmail('');
                handleFlip(false);
            } catch (err) {
                setRegLoading(false);
                setRegError(err.message || 'Registration failed.');
            }
        }, 450);
    };

    return (
        <div id="loginPage" className="login-wrap">
            {/* Success ripple transition overlay */}
            <div className={`auth-ripple ${rippleActive ? 'is-active' : ''}`} id="authRipple" />

            <div className="auth-perspective">
                <div className={`auth-flipper ${isFlipped ? 'is-flipped' : ''}`} id="authFlipper">

                    {/* FRONT FACE — Login */}
                    <div className="auth-face auth-face--front">
                        <div className="login-card__left">
                            <div style={{ marginBottom: '16px' }} className="anim-stagger">
                                <img src="/logo.png" alt="HAWKS Intelligence" style={{ width: '60px', height: '60px', borderRadius: '14px', objectFit: 'contain', background: '#090D16', padding: '4px', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }} />
                            </div>
                            <h1 className="login-card__hero anim-stagger">HELLO,<br />FRIEND!</h1>
                            <p className="login-card__sub anim-stagger">Enter your personal details to start<br />your journey with us.</p>
                        </div>
                        <div className="login-card__right">
                            {showForgot ? (
                                <>
                                    <h2 className="auth-title anim-stagger">Reset Password</h2>
                                    <p className="tagline anim-stagger">We'll send you a recovery link</p>

                                    <form className="auth-form" onSubmit={handleForgotSubmit} autoComplete="off">
                                        <div className="input-icon-group anim-stagger">
                                            <span className="input-icon">
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                                    <polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                                </svg>
                                            </span>
                                            <input
                                                type="email"
                                                placeholder="Email Address"
                                                value={forgotEmail}
                                                onChange={(e) => setForgotEmail(e.target.value)}
                                                required
                                            />
                                            <span className="input-focus-bar" />
                                        </div>

                                        {forgotMsg && (
                                            <div className="form-error" style={{ display: 'block', color: forgotMsg.includes('sent') ? 'var(--success)' : 'var(--danger)' }}>
                                                {forgotMsg}
                                            </div>
                                        )}

                                        <button
                                            type="submit"
                                            className={`btn btn-login btn-block anim-stagger ${forgotLoading ? 'is-loading' : ''}`}
                                            disabled={forgotLoading}
                                        >
                                            <span className="btn-text">Send Reset Link</span>
                                            <span className="btn-spinner" />
                                        </button>
                                    </form>

                                    <p className="switch-text anim-stagger" style={{ marginTop: '1.5rem' }}>
                                        Remember your password?{' '}
                                        <a href="#login" onClick={(e) => { e.preventDefault(); setShowForgot(false); setForgotMsg(''); }}>
                                            Back to Login
                                        </a>
                                    </p>
                                </>
                            ) : (
                                <>
                                    <h2 className="auth-title anim-stagger">Welcome Back</h2>
                                    <p className="tagline anim-stagger">Login to FinTracker &amp; Investment</p>

                                    
                                    <form className="auth-form" id="loginForm" onSubmit={handleLoginSubmit} autoComplete="off">
                                        <div className="input-icon-group anim-stagger">
                                            <span className="input-icon">
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                                    <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" />
                                                    <path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                                </svg>
                                            </span>
                                            <input
                                                ref={loginUserRef}
                                                type="text"
                                                placeholder="Email or Username"
                                                value={loginUser}
                                                onChange={(e) => setLoginUser(e.target.value)}
                                                required
                                            />
                                            <span className="input-focus-bar" />
                                        </div>

                                        <div className="input-icon-group anim-stagger">
                                            <span className="input-icon">
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                                    <rect x="4" y="10" width="16" height="11" rx="2" stroke="currentColor" strokeWidth="1.8" />
                                                    <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                                    <circle cx="12" cy="16" r="1.5" fill="currentColor" />
                                                </svg>
                                            </span>
                                            <input
                                                type={loginShowPass ? 'text' : 'password'}
                                                placeholder="Password"
                                                value={loginPass}
                                                onChange={(e) => setLoginPass(e.target.value)}
                                                required
                                            />
                                            <span className="input-focus-bar" />
                                            <button
                                                type="button"
                                                className="toggle-pw"
                                                tabIndex="-1"
                                                aria-label="Toggle password visibility"
                                                onClick={() => setLoginShowPass(!loginShowPass)}
                                            >
                                                {loginShowPass ? (
                                                    <svg className="eye-closed" width="18" height="18" viewBox="0 0 24 24" fill="none">
                                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                                        <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                                    </svg>
                                                ) : (
                                                    <svg className="eye-open" width="18" height="18" viewBox="0 0 24 24" fill="none">
                                                        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" stroke="currentColor" strokeWidth="1.8" />
                                                        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
                                                    </svg>
                                                )}
                                            </button>
                                        </div>
                                        
                                        <div className="anim-stagger" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-0.5rem', marginBottom: '1.5rem' }}>
                                            <a href="#forgot" onClick={(e) => { e.preventDefault(); setShowForgot(true); }} style={{ fontSize: '0.85rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: '500' }}>
                                                Forgot Password?
                                            </a>
                                        </div>

                                        {loginError && (
                                            <div className="form-error" style={{ display: 'block' }}>{loginError}</div>
                                        )}

                                        <button
                                            type="submit"
                                            className={`btn btn-login btn-block anim-stagger ${loginLoading ? 'is-loading' : ''}`}
                                            id="loginSubmitBtn"
                                            disabled={loginLoading}
                                        >
                                            <span className="btn-text">Login</span>
                                            <span className="btn-spinner" />
                                        </button>
                                    </form>

                                    <p className="switch-text anim-stagger">
                                        Don't have an account?{' '}
                                        <a href="#register" onClick={(e) => { e.preventDefault(); handleFlip(true); }}>
                                            Register here
                                        </a>
                                    </p>
                                </>
                            )}
                        </div>
                    </div>

                    {/* BACK FACE — Register */}
                    <div className="auth-face auth-face--back">
                        <div className="login-card__left">
                            <div style={{ marginBottom: '16px' }}>
                                <img src="/logo.png" alt="HAWKS Intelligence" style={{ width: '60px', height: '60px', borderRadius: '14px', objectFit: 'contain', background: '#090D16', padding: '4px', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }} />
                            </div>
                            <h1 className="login-card__hero">HELLO,<br />FRIEND!</h1>
                            <p className="login-card__sub">Enter your personal details to start<br />your journey with us.</p>
                        </div>
                        <div className="login-card__right">
                            <h2 className="auth-title">Sign Up</h2>
                            <p className="tagline">Join FinTracker &amp; Investment</p>

                            <form className="auth-form" id="registerForm" onSubmit={handleRegisterSubmit} autoComplete="off">
                                <div className="input-icon-group">
                                    <span className="input-icon">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                            <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" />
                                            <path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                        </svg>
                                    </span>
                                    <input
                                        ref={regUserRef}
                                        type="text"
                                        placeholder="Username"
                                        value={regUser}
                                        onChange={(e) => setRegUser(e.target.value)}
                                        required
                                    />
                                    <span className="input-focus-bar" />
                                </div>

                                <div className="input-icon-group">
                                    <span className="input-icon">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                            <polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                    </span>
                                    <input
                                        type="email"
                                        placeholder="Email Address"
                                        value={regEmail}
                                        onChange={(e) => setRegEmail(e.target.value)}
                                        required
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
                                        type={regShowPass ? 'text' : 'password'}
                                        placeholder="Password"
                                        value={regPass}
                                        onChange={(e) => setRegPass(e.target.value)}
                                        required
                                    />
                                    <span className="input-focus-bar" />
                                    <button
                                        type="button"
                                        className="toggle-pw"
                                        tabIndex="-1"
                                        aria-label="Toggle password visibility"
                                        onClick={() => setRegShowPass(!regShowPass)}
                                    >
                                        {regShowPass ? (
                                            <svg className="eye-closed" width="18" height="18" viewBox="0 0 24 24" fill="none">
                                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                                <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                            </svg>
                                        ) : (
                                            <svg className="eye-open" width="18" height="18" viewBox="0 0 24 24" fill="none">
                                                <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" stroke="currentColor" strokeWidth="1.8" />
                                                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
                                            </svg>
                                        )}
                                    </button>
                                </div>

                                {regError && (
                                    <div className="form-error" style={{ display: 'block' }}>{regError}</div>
                                )}

                                <button
                                    type="submit"
                                    className={`btn btn-register btn-block ${regLoading ? 'is-loading' : ''}`}
                                    id="registerSubmitBtn"
                                    disabled={regLoading}
                                >
                                    <span className="btn-text">Sign Up</span>
                                    <span className="btn-spinner" />
                                </button>
                            </form>

                            <p className="switch-text">
                                Already have an account?{' '}
                                <a href="#login" onClick={(e) => { e.preventDefault(); handleFlip(false); }}>
                                    Login here
                                </a>
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Institutional Project & Team Footer */}
            <AppFooter className="auth-bottom-footer" />
        </div>
    );
}
