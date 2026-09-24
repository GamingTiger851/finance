import React, { useState } from 'react';
import StatCards from './StatCards';
import DashboardCharts from './DashboardCharts';
import RecentExpensesCard from './RecentExpensesCard';
import GoalsCard from './GoalsCard';
import QuickToolsStrip from './QuickToolsStrip';
import DashboardRightRail from './DashboardRightRail';
import AddTransactionModal from './AddTransactionModal';
import { useAuth } from '../../context/AuthContext';
import { useFinance } from '../../context/FinanceContext';

export default function DashboardView({ onNavigate }) {
    const { currentUser, userProfile } = useAuth();
    const { clearAllTransactions, showConfirm } = useFinance();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [modalDefaultType, setModalDefaultType] = useState('expense');

    // Dynamic greeting based on current time
    const hour = new Date().getHours();
    const greetingTime = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
    const userName = userProfile.fullName || currentUser || 'Amit';
    const firstName = userName.split(' ')[0];

    // Formatted current date
    const currentDateStr = new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    }).format(new Date());

    return (
        <div id="dashboardPage" className="professional-dashboard-view">
            {/* Top Greeting Header */}
            <div className="dashboard-executive-header">
                <div>
                    <h1 className="executive-greeting">
                        {greetingTime}, {firstName}! <span className="wave-hand">👋</span>
                    </h1>
                    <p className="executive-subtitle">
                        Here's your financial overview for this month.
                    </p>
                </div>
                <div className="dashboard-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                        type="button"
                        onClick={() => showConfirm(
                            'Reset dashboard values?',
                            'This permanently deletes all income and expense transactions for this account and resets dashboard totals to zero. This cannot be undone.',
                            clearAllTransactions
                        )}
                        title="Clear transaction history and reset dashboard totals"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: 'var(--card-bg)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-muted)',
                            fontSize: '12.5px',
                            fontWeight: '700',
                            padding: '8px 12px',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M3 12a9 9 0 1 0 2.64-6.36L3 8" />
                            <path d="M3 3v5h5" />
                        </svg>
                        Reset
                    </button>
                    <div className="executive-date-badge">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        <span>{currentDateStr}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            setModalDefaultType('expense');
                            setIsAddModalOpen(true);
                        }}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: 'var(--accent-gradient)',
                            border: 'none',
                            color: '#fff',
                            fontSize: '12.5px',
                            fontWeight: '700',
                            padding: '8px 15px',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            boxShadow: '0 4px 14px var(--accent-glow)',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <span>+</span> New Expense
                    </button>
                </div>
            </div>

            {/* Dashboard Layout: Left Command Center + Right Intelligence Rail */}
            <div className="dashboard-main-grid">
                {/* Left Command Center */}
                <div className="dashboard-primary-column">
                    {/* 1. 4 Executive KPI Delta Cards */}
                    <StatCards />

                    {/* 2. Triple Visual Chart Matrix */}
                    <div style={{ marginTop: '22px' }}>
                        <DashboardCharts />
                    </div>

                    {/* 3. Operational Hub: Recent Expenses + Your Goals */}
                    <div className="operational-two-col-grid" style={{ marginTop: '22px' }}>
                        <RecentExpensesCard
                            onOpenAddModal={() => {
                                setModalDefaultType('expense');
                                setIsAddModalOpen(true);
                            }}
                            onViewAll={() => onNavigate && onNavigate('expenses')}
                        />
                        <GoalsCard
                            onViewAll={() => onNavigate && onNavigate('goals')}
                        />
                    </div>

                    {/* 4. Bottom Quick Tools Strip */}
                    <div style={{ marginTop: '22px' }}>
                        <QuickToolsStrip
                            onSelectTool={(targetPage, subTool) => {
                                if (onNavigate) onNavigate(targetPage);
                            }}
                        />
                    </div>
                </div>

                {/* Right Intelligence Column */}
                <div className="dashboard-secondary-column">
                    <DashboardRightRail
                        onNavigate={(targetPage) => {
                            if (onNavigate) onNavigate(targetPage);
                        }}
                    />
                </div>
            </div>

            {/* Quick Add Transaction Modal */}
            <AddTransactionModal
                isOpen={isAddModalOpen}
                defaultType={modalDefaultType}
                onClose={() => setIsAddModalOpen(false)}
            />
        </div>
    );
}
