import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useFinance } from '../../context/FinanceContext';
import { formatAmount } from '../../constants';

const getGoalIcon = (category) => {
    const cat = (category || '').toLowerCase();
    if (cat.includes('security') || cat.includes('emergency')) {
        return (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <polyline points="9 12 11 14 15 10"/>
            </svg>
        );
    }
    if (cat.includes('laptop') || cat.includes('gadget') || cat.includes('tech')) {
        return (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                <line x1="8" y1="21" x2="16" y2="21"/>
                <line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
        );
    }
    if (cat.includes('travel') || cat.includes('trip') || cat.includes('vacation')) {
        return (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>
            </svg>
        );
    }
    if (cat.includes('home') || cat.includes('house') || cat.includes('real estate')) {
        return (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
        );
    }
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" />
        </svg>
    );
};

export default function GoalsCard({ onViewAll }) {
    const { userProfile } = useAuth();
    const { goals } = useFinance();
    const currency = userProfile.currency || 'INR';

    return (
        <div className="operational-card">
            <div className="operational-card-header">
                <div>
                    <h2 className="operational-title">Your Goals</h2>
                </div>
                {goals && goals.length > 0 && (
                    <button
                        type="button"
                        className="operational-link-btn"
                        onClick={onViewAll}
                    >
                        View All
                    </button>
                )}
            </div>

            {(!goals || goals.length === 0) ? (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '36px 16px',
                    textAlign: 'center'
                }}>
                    <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--accent-bg)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px',
                        marginBottom: '12px'
                    }}>
                        🎯
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
                        No Goals Configured
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px', maxWidth: '240px' }}>
                        Values are cleared. Create a target to track your milestone progress.
                    </div>
                    <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '12px', padding: '6px 14px' }}
                        onClick={onViewAll}
                    >
                        + Create First Goal
                    </button>
                </div>
            ) : (
                <div className="goals-stack">
                    {goals.map(goal => {
                        const targetAmt = Number(goal.target) || 1;
                        const currentAmt = Number(goal.current) || 0;
                        const percent = Math.min(100, Math.round((currentAmt / targetAmt) * 100));
                        const themeColor = goal.color || '#10b981';

                        return (
                            <div key={goal.id} className="goal-item-row">
                                <div className="goal-icon-badge" style={{ backgroundColor: `${themeColor}18`, color: themeColor }}>
                                    {getGoalIcon(goal.category || goal.title)}
                                </div>

                                <div className="goal-info-col">
                                    <div className="goal-headline">
                                        <span className="goal-name">{goal.title}</span>
                                        <span className="goal-amounts">
                                            {formatAmount(currentAmt, currency)} <span style={{ opacity: 0.5 }}>/</span> {formatAmount(targetAmt, currency)}
                                        </span>
                                    </div>

                                    {/* Progress bar */}
                                    <div className="goal-progress-track">
                                        <div
                                            className="goal-progress-fill"
                                            style={{
                                                width: `${percent}%`,
                                                backgroundColor: themeColor
                                            }}
                                        />
                                    </div>

                                    <div className="goal-meta-foot">
                                        <span className="goal-percent-text">{percent}%</span>
                                        <span className="goal-date-badge">{goal.date || 'In Progress'}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
