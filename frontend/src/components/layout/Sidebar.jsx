import React, { useCallback, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar({ currentPage, setCurrentPage, isMobileOpen = false, onMobileClose }) {
    const { currentUser, userProfile } = useAuth();
    const displayName = userProfile?.fullName || currentUser || 'User';
    const firstInitial = displayName.charAt(0).toUpperCase();

    const closeMobileMenu = useCallback(() => {
        if (isMobileOpen && window.innerWidth <= 640) {
            document.querySelector('.mobile-menu-toggle')?.focus({ preventScroll: true });
        }
        onMobileClose?.();
    }, [isMobileOpen, onMobileClose]);

    useEffect(() => {
        if (!isMobileOpen) return undefined;
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') closeMobileMenu();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isMobileOpen, closeMobileMenu]);

    return (
        <>
        {isMobileOpen && (
            <button
                type="button"
                className="mobile-menu-backdrop"
                aria-label="Close navigation menu"
                onClick={closeMobileMenu}
            />
        )}
        <aside
            id="main-navigation"
            className={`sidebar${isMobileOpen ? ' mobile-open' : ''}`}
            aria-label="Main navigation"
            aria-hidden={window.innerWidth <= 640 && !isMobileOpen}
            inert={window.innerWidth <= 640 && !isMobileOpen}
        >
            <div className="mobile-menu-heading">
                <button type="button" className="mobile-menu-close" onClick={closeMobileMenu}>
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                        <path d="m18 6-12 12M6 6l12 12" />
                    </svg>
                    <span>Close menu</span>
                </button>
            </div>
            {/* Categorized Nav Items */}
            <nav
                className="sidebar-nav"
                style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}
                onClick={(event) => {
                    if (event.target.closest('.side-link')) closeMobileMenu();
                }}
            >
                {/* Section 1: MAIN MENU */}
                <div className="sidebar-section-label">MAIN MENU</div>

                {/* Dashboard */}
                <button
                    className={`side-link ${currentPage === 'dashboard' ? 'active' : ''}`}
                    onClick={() => setCurrentPage('dashboard')}
                >
                    <span className="side-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="7" height="7" rx="1.5"></rect>
                            <rect x="14" y="3" width="7" height="7" rx="1.5"></rect>
                            <rect x="14" y="14" width="7" height="7" rx="1.5"></rect>
                            <rect x="3" y="14" width="7" height="7" rx="1.5"></rect>
                        </svg>
                    </span>
                    <span className="label-text">Dashboard</span>
                </button>

                {/* Expenses */}
                <button
                    className={`side-link ${currentPage === 'expenses' ? 'active' : ''}`}
                    onClick={() => setCurrentPage('expenses')}
                >
                    <span className="side-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                            <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>
                    </span>
                    <span className="label-text">Expenses</span>
                </button>

                {/* Recurring Bills */}
                <button
                    className={`side-link ${currentPage === 'recurring' ? 'active' : ''}`}
                    onClick={() => setCurrentPage('recurring')}
                >
                    <span className="side-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="23 4 23 10 17 10"></polyline>
                            <polyline points="1 20 1 14 7 14"></polyline>
                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                        </svg>
                    </span>
                    <span className="label-text">Recurring Bills</span>
                </button>

                {/* Section 2: FEATURES */}
                <div className="sidebar-section-label" style={{ marginTop: '16px' }}>FEATURES</div>

                {/* Stocks */}
                <button
                    className={`side-link ${currentPage === 'stocks' ? 'active' : ''}`}
                    onClick={() => setCurrentPage('stocks')}
                >
                    <span className="side-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                            <polyline points="17 6 23 6 23 12"></polyline>
                        </svg>
                    </span>
                    <span className="label-text">Stocks</span>
                </button>

                {/* Bonds */}
                <button
                    className={`side-link ${currentPage === 'bonds' ? 'active' : ''}`}
                    onClick={() => setCurrentPage('bonds')}
                >
                    <span className="side-icon" aria-hidden="true">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6M9 10h.01M15 10h.01" />
                        </svg>
                    </span>
                    <span className="label-text">Bond Market</span>
                </button>

                {/* Goals */}
                <button
                    className={`side-link ${currentPage === 'goals' ? 'active' : ''}`}
                    onClick={() => setCurrentPage('goals')}
                >
                    <span className="side-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <circle cx="12" cy="12" r="6"></circle>
                            <circle cx="12" cy="12" r="2"></circle>
                        </svg>
                    </span>
                    <span className="label-text">Goals</span>
                </button>

                {/* Calculators */}
                <button
                    className={`side-link ${currentPage === 'calculators' ? 'active' : ''}`}
                    onClick={() => setCurrentPage('calculators')}
                >
                    <span className="side-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="4" y="2" width="16" height="20" rx="2"></rect>
                            <line x1="8" y1="6" x2="16" y2="6"></line>
                            <line x1="16" y1="14" x2="16" y2="18"></line>
                            <circle cx="8" cy="11" r="1" fill="currentColor"></circle>
                            <circle cx="12" cy="11" r="1" fill="currentColor"></circle>
                            <circle cx="16" cy="11" r="1" fill="currentColor"></circle>
                            <circle cx="8" cy="15" r="1" fill="currentColor"></circle>
                            <circle cx="12" cy="15" r="1" fill="currentColor"></circle>
                        </svg>
                    </span>
                    <span className="label-text">Calculators</span>
                </button>

                {/* Loan Eligibility */}
                <button
                    className={`side-link ${currentPage === 'loan-eligibility' ? 'active' : ''}`}
                    onClick={() => setCurrentPage('loan-eligibility')}
                >
                    <span className="side-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                        </svg>
                    </span>
                    <span className="label-text">Loan &amp; EMI Calculator</span>
                </button>

                {/* Portfolio Risk */}
                <button
                    className={`side-link ${currentPage === 'portfolio-risk' ? 'active' : ''}`}
                    onClick={() => setCurrentPage('portfolio-risk')}
                >
                    <span className="side-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z" />
                            <path d="m9 12 2 2 4-4" />
                        </svg>
                    </span>
                    <span className="label-text">Portfolio Risk</span>
                </button>


                {/* Section 3: INTELLIGENCE */}
                <div className="sidebar-section-label" style={{ marginTop: '16px' }}>INTELLIGENCE</div>

                {/* AI Assistant */}
                <button
                    className={`side-link ${currentPage === 'advisor' ? 'active' : ''}`}
                    onClick={() => setCurrentPage('advisor')}
                >
                    <span className="side-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"></path>
                            <rect x="3" y="8" width="18" height="12" rx="4"></rect>
                            <circle cx="9" cy="13" r="1" fill="currentColor"></circle>
                            <circle cx="15" cy="13" r="1" fill="currentColor"></circle>
                            <path d="M10 17h4"></path>
                        </svg>
                    </span>
                    <span className="label-text">AI Assistant</span>
                    <span className="side-badge-green">AI</span>
                </button>
            </nav>

            {/* User Session Footer */}
            <div className="sidebar-user-footer">
                <div className="user-avatar-circle" style={{ width: '34px', height: '34px', fontSize: '13px', flexShrink: 0 }}>
                    {firstInitial}
                </div>
                <div className="sidebar-user-meta">
                    <span className="sidebar-user-name">{displayName}</span>
                    <span className="sidebar-user-role">Free Member</span>
                </div>
                <button 
                    type="button" 
                    className="sidebar-user-dots-btn"
                    onClick={() => {
                        setCurrentPage('settings');
                        closeMobileMenu();
                    }}
                    title="Account Settings"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="1"></circle>
                        <circle cx="12" cy="5" r="1"></circle>
                        <circle cx="12" cy="19" r="1"></circle>
                    </svg>
                </button>
            </div>
        </aside>
        </>
    );
}
