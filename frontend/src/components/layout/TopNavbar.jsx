import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useFinance } from '../../context/FinanceContext';

export default function TopNavbar({ onSearch, onNavigate }) {
    const { currentUser, userProfile, userRole, logout } = useAuth();
    const { showToast } = useFinance();
    const [searchQuery, setSearchQuery] = useState('');
    const [hasUnreadNotifications, setHasUnreadNotifications] = useState(true);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

    const displayName = userProfile.fullName || currentUser || 'Amit Sharma';
    const firstInitial = displayName.charAt(0).toUpperCase();

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            showToast(`Searching for "${searchQuery}"...`);
            if (onSearch) onSearch(searchQuery);
        }
    };

    return (
        <header className="fintrack-topbar">
            {/* Left Brand Logo */}
            <div 
                className="topbar-brand" 
                onClick={() => onNavigate && onNavigate('dashboard')} 
                title="FinTracker AI - HAWKS Intelligence"
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
            >
                <div className="brand-logo-icon" style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: '#090D16',
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    padding: '2px',
                    flexShrink: 0
                }}>
                    <img
                        src="/logo.png"
                        alt="HAWKS Intelligence"
                        style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                    />
                </div>
                <div className="brand-logo-text">
                    <span className="logo-main">FinTracker</span><span className="logo-ai">AI</span>
                </div>
                <div style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: '#ECFDF5',
                    color: '#059669',
                    border: '1px solid #A7F3D0',
                    whiteSpace: 'nowrap',
                    marginLeft: '4px'
                }}>
                    HAWKS Intelligence
                </div>
            </div>

            {/* Center Global Search */}
            <form className="topbar-search-form" onSubmit={handleSearchSubmit}>
                <div className="topbar-search-input-wrap">
                    <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search anything..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="topbar-search-input"
                    />
                </div>
            </form>

            {/* Right Actions: Notifications & User Profile */}
            <div className="topbar-actions">
                {/* Notification Bell */}
                <button
                    type="button"
                    className="topbar-icon-btn"
                    title="Notifications"
                    onClick={() => {
                        setHasUnreadNotifications(false);
                        showToast('All notifications are up to date.');
                    }}
                >
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                    {hasUnreadNotifications && <span className="notification-dot" />}
                </button>

                {/* User Profile Pill */}
                <div style={{ position: 'relative' }}>
                    <div className="topbar-user-profile" onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)} style={{ cursor: 'pointer' }}>
                        <div className="user-avatar-circle">
                            {firstInitial}
                        </div>
                        <div className="user-meta-text">
                            <span className="user-name">{displayName}</span>
                            <span className="user-status-sub">Welcome back!</span>
                        </div>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '4px', color: 'var(--text-muted)' }}>
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </div>

                    {isProfileMenuOpen && (
                        <div className="profile-dropdown-menu">
                            <button className="profile-dropdown-item" onClick={() => { setIsProfileMenuOpen(false); if (onNavigate) onNavigate('settings'); }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                                    <circle cx="12" cy="12" r="3"></circle>
                                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                                </svg>
                                Settings
                            </button>
                            {userRole === 'admin' && (
                                <button className="profile-dropdown-item" onClick={() => { setIsProfileMenuOpen(false); if (onNavigate) onNavigate('admin'); }} style={{ color: '#3b82f6' }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                    </svg>
                                    Admin Dashboard
                                </button>
                            )}
                            <button className="profile-dropdown-item" onClick={() => { setIsProfileMenuOpen(false); logout(); }} style={{ color: '#ef4444' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                    <polyline points="16 17 21 12 16 7" />
                                    <line x1="21" y1="12" x2="9" y2="12" />
                                </svg>
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
