import React from 'react';

export default function QuickToolsStrip({ onSelectTool }) {
    const calcTools = [
        { id: 'sip', name: 'SIP Calculator', desc: 'Plan your SIP investments', icon: '📈', bg: '#fff7ed', color: '#ea580c' },
        { id: 'fd', name: 'FD Calculator', desc: 'Calculate FD returns', icon: '🏦', bg: '#eff6ff', color: '#2563eb' },
        { id: 'rd', name: 'RD Calculator', desc: 'Plan recurring deposits', icon: '🗓️', bg: '#f0fdf4', color: '#16a34a' },
        { id: 'swp', name: 'SWP Calculator', desc: 'Withdraw from investments', icon: '💳', bg: '#faf5ff', color: '#9333ea' },
    ];

    return (
        <div className="quick-tools-row">
            {/* Calculators Cluster */}
            <div className="tools-card-cluster">
                <div className="cluster-header-label">Financial Calculators</div>
                <div className="cluster-pills-row">
                    {calcTools.map(t => (
                        <div
                            key={t.id}
                            className="tool-pill-card"
                            onClick={() => onSelectTool('calculators', t.id)}
                        >
                            <span className="tool-pill-emoji" style={{ background: t.bg }}>
                                {t.icon}
                            </span>
                            <div className="tool-pill-text">
                                <div className="tool-pill-title">{t.name}</div>
                                <div className="tool-pill-sub">{t.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Stocks & Equities Explorer CTA Card */}
            <div className="planner-cta-card">
                <div className="cta-icon-badge">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                        <polyline points="17 6 23 6 23 12"></polyline>
                    </svg>
                </div>
                <div className="cta-card-content">
                    <div className="cta-card-title">Stocks &amp; Equities</div>
                    <div className="cta-card-sub">Explore live prices, P/E ratios &amp; company fundamentals</div>
                    <button
                        type="button"
                        className="cta-action-btn"
                        onClick={() => onSelectTool('stocks')}
                    >
                        Explore Now
                    </button>
                </div>
            </div>

            {/* Loan Eligibility CTA Card */}
            <div className="loan-cta-card">
                <div className="cta-icon-badge">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                        <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                </div>
                <div className="cta-card-content">
                    <div className="cta-card-title">Loan Eligibility</div>
                    <div className="cta-card-sub">Check your loan eligibility and EMI</div>
                    <button
                        type="button"
                        className="cta-action-btn loan-btn"
                        onClick={() => onSelectTool('loan-eligibility')}
                    >
                        Check Now
                    </button>
                </div>
            </div>
        </div>
    );
}
