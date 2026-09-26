import React from 'react';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';
import { formatAmount } from '../../constants';

export default function StatCards() {
    const { calculateTotals, transactions } = useFinance();
    const { userProfile } = useAuth();
    const currency = userProfile.currency || 'INR';
    const totals = calculateTotals();

    // Compute savings rate
    const savingsRate = totals.income > 0
        ? Math.max(0, ((totals.income - totals.expense) / totals.income) * 100).toFixed(1)
        : '0.0';

    // Display actual tracked figures
    const displayIncome = totals.income;
    const displayExpense = totals.expense;
    const displayBalance = totals.balance;

    // Track actual savings (income - expense)
    const displaySavings = Math.max(0, displayIncome - displayExpense);

    // Track actual investment portfolio from categorized transactions
    const displayInvestment = transactions
        ? transactions
            .filter(t => t.category && (
                t.category.toLowerCase().includes('invest') || 
                t.category.toLowerCase().includes('stock') || 
                t.category.toLowerCase().includes('sip') ||
                t.category.toLowerCase().includes('mutual')
            ))
            .reduce((sum, t) => sum + Number(t.amount || 0), 0)
        : 0;

    return (
        <div className="oripio-kpi-grid">
            {/* 1. Hero Card: My Balance (Emerald Gradient) */}
            <div className="oripio-card oripio-hero-card">
                <div className="oripio-card-top">
                    <div className="oripio-card-header-left">
                        <div className="oripio-hero-icon-wrap">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="4" width="20" height="16" rx="3" />
                                <line x1="2" y1="10" x2="22" y2="10" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="oripio-card-title">My balance</h2>
                            <span className="oripio-card-sub">Wallet Overview & Spending</span>
                        </div>
                    </div>
                    <button type="button" className="oripio-dots-btn" aria-label="Options">•••</button>
                </div>

                <div className="oripio-hero-body">
                    <div className="oripio-hero-amount">
                        {formatAmount(displayBalance, currency)}
                    </div>
                    <span className="oripio-hero-badge">
                        {displayBalance > 0 ? '+1.5% ↑' : '0.0%'}
                    </span>
                </div>

                <div className="oripio-hero-footer">
                    <span>See details</span>
                    <span className="oripio-arrow">→</span>
                </div>
            </div>

            {/* 2. White Card: Savings Account */}
            <div className="oripio-card oripio-white-card">
                <div className="oripio-card-top">
                    <div className="oripio-card-header-left">
                        <div className="oripio-white-icon-wrap">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h1l1-3c0-1-1-2-2-2h-1c-.3-.8-.9-1.5-1.6-2l.6-.6A2 2 0 0 0 19 5z" />
                                <circle cx="16" cy="11" r="1" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="oripio-white-title">Savings account</h2>
                            <span className="oripio-white-sub">Steady Growth Savings ({savingsRate}%)</span>
                        </div>
                    </div>
                    <button type="button" className="oripio-dots-btn" aria-label="Options">•••</button>
                </div>

                <div className="oripio-white-body">
                    <div className="oripio-white-amount">
                        {formatAmount(displaySavings, currency)}
                    </div>
                    <span className="oripio-white-badge">
                        {Number(savingsRate) > 0 ? `+${savingsRate}% ↑` : '0.0%'}
                    </span>
                </div>

                <div className="oripio-white-footer">
                    <span>View summary</span>
                    <span className="oripio-arrow">→</span>
                </div>
            </div>

            {/* 3. White Card: Investment Portfolio */}
            <div className="oripio-card oripio-white-card">
                <div className="oripio-card-top">
                    <div className="oripio-card-header-left">
                        <div className="oripio-white-icon-wrap">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="20" x2="18" y2="10" />
                                <line x1="12" y1="20" x2="12" y2="4" />
                                <line x1="6" y1="20" x2="6" y2="14" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="oripio-white-title">Investment portfolio</h2>
                            <span className="oripio-white-sub">Track Your Wealth Growth</span>
                        </div>
                    </div>
                    <button type="button" className="oripio-dots-btn" aria-label="Options">•••</button>
                </div>

                <div className="oripio-white-body">
                    <div className="oripio-white-amount">
                        {formatAmount(displayInvestment, currency)}
                    </div>
                    <span className="oripio-white-badge">
                        {displayInvestment > 0 ? '+4.7% ↑' : '0.0%'}
                    </span>
                </div>

                <div className="oripio-white-footer">
                    <span>Analyze performance</span>
                    <span className="oripio-arrow">→</span>
                </div>
            </div>
        </div>
    );
}
