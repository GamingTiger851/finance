import React, { useState, useEffect, useMemo } from 'react';
import { useFinance } from '../../context/FinanceContext';

const DEFAULT_BUDGETS = {
    'Food & Groceries': 15000,
    'Housing & Rent': 20000,
    'Transportation': 6000,
    'Utilities & Bills': 5000,
    'Entertainment': 4000,
    'Healthcare': 3000,
    'Shopping': 5000,
    'Other': 2000
};

export default function BudgetPlannerView() {
    const { transactions, showToast } = useFinance();
    const [budgets, setBudgets] = useState(() => {
        try {
            const saved = localStorage.getItem('fintrack_monthly_budgets');
            return saved ? JSON.parse(saved) : DEFAULT_BUDGETS;
        } catch {
            return DEFAULT_BUDGETS;
        }
    });

    const [isEditing, setIsEditing] = useState(false);
    const [editValues, setEditValues] = useState({ ...budgets });

    useEffect(() => {
        localStorage.setItem('fintrack_monthly_budgets', JSON.stringify(budgets));
    }, [budgets]);

    // Current date & days remaining in current month
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const currentDay = now.getDate();
    const daysRemaining = Math.max(1, daysInMonth - currentDay);
    const currentMonthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });

    // Compute actual spending in current month grouped by category
    const currentMonthExpenses = useMemo(() => {
        return transactions.filter(t => {
            if (t.type !== 'expense') return false;
            const tDate = new Date(t.date || Date.now());
            return tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear();
        });
    }, [transactions, now]);

    // Category spending map
    const categorySpend = useMemo(() => {
        const map = {};
        Object.keys(budgets).forEach(c => { map[c] = 0; });
        currentMonthExpenses.forEach(t => {
            const cat = t.category || 'Other';
            if (map[cat] !== undefined) {
                map[cat] += Number(t.amount || 0);
            } else {
                map['Other'] = (map['Other'] || 0) + Number(t.amount || 0);
            }
        });
        return map;
    }, [currentMonthExpenses, budgets]);

    const totalBudget = Object.values(budgets).reduce((sum, v) => sum + Number(v || 0), 0);
    const totalSpent = Object.values(categorySpend).reduce((sum, v) => sum + Number(v || 0), 0);
    const totalRemaining = totalBudget - totalSpent;
    const overallProgress = totalBudget > 0 ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 0;
    const dailySafeSpend = totalRemaining > 0 ? Math.round(totalRemaining / daysRemaining) : 0;

    const handleSaveBudgets = (e) => {
        e.preventDefault();
        setBudgets({ ...editValues });
        setIsEditing(false);
        showToast('Monthly budget allocations updated!');
    };

    const handleApply503020 = () => {
        const estimatedMonthlyIncome = 75000;
        const needs = Math.round(estimatedMonthlyIncome * 0.50);
        const wants = Math.round(estimatedMonthlyIncome * 0.30);
        const savings = Math.round(estimatedMonthlyIncome * 0.20);

        const newBudgets = {
            'Housing & Rent': Math.round(needs * 0.55),
            'Food & Groceries': Math.round(needs * 0.30),
            'Utilities & Bills': Math.round(needs * 0.15),
            'Entertainment': Math.round(wants * 0.40),
            'Transportation': Math.round(wants * 0.30),
            'Shopping': Math.round(wants * 0.30),
            'Healthcare': Math.round(savings * 0.40),
            'Other': Math.round(savings * 0.60)
        };

        setBudgets(newBudgets);
        setEditValues(newBudgets);
        setIsEditing(false);
        showToast('Applied standard 50/30/20 budget framework!');
    };

    return (
        <div id="budgetPage" className="page-view">
            {/* Header */}
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '24px' }}>🎯</span>
                        <h1 className="page-title" style={{ margin: 0 }}>Monthly Budget Planner</h1>
                    </div>
                    <p className="page-subtitle">
                        Track, control, and optimize your spending limits for {currentMonthName}.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleApply503020}
                        style={{ fontSize: '13px' }}
                    >
                        ⚖️ 50/30/20 Rule
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => {
                            setEditValues({ ...budgets });
                            setIsEditing(!isEditing);
                        }}
                        style={{ fontWeight: '700' }}
                    >
                        {isEditing ? '✕ Cancel Editing' : '✏️ Set Budgets'}
                    </button>
                </div>
            </div>

            {/* 4 Hero KPI Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                gap: '14px',
                marginTop: '18px'
            }}>
                <div className="table-card" style={{ padding: '18px 20px', background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Total Budget Target</div>
                    <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', marginTop: '4px' }}>₹{totalBudget.toLocaleString('en-IN')}</div>
                    <div style={{ fontSize: '11.5px', color: '#60a5fa', marginTop: '4px' }}>For {currentMonthName}</div>
                </div>

                <div className="table-card" style={{ padding: '18px 20px', background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Spent So Far</div>
                    <div style={{ fontSize: '22px', fontWeight: '800', color: totalSpent > totalBudget ? '#ef4444' : '#ADFF41', marginTop: '4px' }}>
                        ₹{totalSpent.toLocaleString('en-IN')}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>{overallProgress}% of monthly allocation</div>
                </div>

                <div className="table-card" style={{ padding: '18px 20px', background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Remaining Surplus</div>
                    <div style={{ fontSize: '22px', fontWeight: '800', color: totalRemaining >= 0 ? '#10b981' : '#ef4444', marginTop: '4px' }}>
                        {totalRemaining >= 0 ? `₹${totalRemaining.toLocaleString('en-IN')}` : `-₹${Math.abs(totalRemaining).toLocaleString('en-IN')}`}
                    </div>
                    <div style={{ fontSize: '11.5px', color: totalRemaining >= 0 ? '#10b981' : '#ef4444', marginTop: '4px' }}>
                        {totalRemaining >= 0 ? '✓ Within safety threshold' : '⚠️ Over budget'}
                    </div>
                </div>

                <div className="table-card" style={{ padding: '18px 20px', background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Daily Safe Allowance</div>
                    <div style={{ fontSize: '22px', fontWeight: '800', color: '#60a5fa', marginTop: '4px' }}>₹{dailySafeSpend.toLocaleString('en-IN')}/day</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>{daysRemaining} days remaining in month</div>
                </div>
            </div>

            {/* Overall Monthly Budget Progress Bar */}
            <div className="table-card" style={{ padding: '20px', marginTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontWeight: '700', fontSize: '14px' }}>Overall Month Utilization</span>
                    <span style={{ fontWeight: '800', color: overallProgress > 90 ? '#ef4444' : '#ADFF41' }}>
                        ₹{totalSpent.toLocaleString('en-IN')} / ₹{totalBudget.toLocaleString('en-IN')} ({overallProgress}%)
                    </span>
                </div>
                <div style={{ height: '10px', background: 'rgba(255,255,255,0.06)', borderRadius: '5px', overflow: 'hidden' }}>
                    <div style={{
                        width: `${Math.min(100, overallProgress)}%`,
                        height: '100%',
                        background: overallProgress > 100 ? '#ef4444' : (overallProgress > 80 ? '#f59e0b' : 'linear-gradient(90deg, #ADFF41, #059669)'),
                        transition: 'width 0.3s ease'
                    }} />
                </div>
            </div>

            {/* Category Budget Editing Form Modal / Inline */}
            {isEditing && (
                <div className="table-card" style={{ padding: '22px', marginTop: '16px', border: '1px solid var(--accent)' }}>
                    <h3 style={{ margin: '0 0 14px 0', fontSize: '16px' }}>✏️ Adjust Monthly Category Caps (INR)</h3>
                    <form onSubmit={handleSaveBudgets}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                            {Object.keys(budgets).map(cat => (
                                <div key={cat} className="form-group" style={{ marginBottom: 0 }}>
                                    <label style={{ fontSize: '12px' }}>{cat}</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="500"
                                        value={editValues[cat] || 0}
                                        onChange={(e) => setEditValues({ ...editValues, [cat]: Number(e.target.value) })}
                                        required
                                    />
                                </div>
                            ))}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
                            <button type="button" className="btn btn-secondary" onClick={() => setIsEditing(false)}>
                                Cancel
                            </button>
                            <button type="submit" className="btn btn-primary" style={{ fontWeight: '700' }}>
                                Save All Budgets
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Category Budgets Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px', marginTop: '16px' }}>
                {Object.entries(budgets).map(([cat, budgetAmt]) => {
                    const spent = categorySpend[cat] || 0;
                    const pct = budgetAmt > 0 ? Math.round((spent / budgetAmt) * 100) : 0;
                    const isExceeded = spent > budgetAmt;
                    const isWarning = pct >= 80 && !isExceeded;

                    return (
                        <div key={cat} className="table-card" style={{ padding: '18px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                                <div>
                                    <div style={{ fontWeight: '700', fontSize: '15px', color: 'var(--text-primary)' }}>{cat}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                        Spent: <strong>₹{spent.toLocaleString('en-IN')}</strong> of ₹{budgetAmt.toLocaleString('en-IN')}
                                    </div>
                                </div>
                                <span style={{
                                    fontSize: '11px',
                                    padding: '3px 8px',
                                    borderRadius: '4px',
                                    fontWeight: '700',
                                    background: isExceeded ? 'rgba(239, 68, 68, 0.15)' : (isWarning ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)'),
                                    color: isExceeded ? '#ef4444' : (isWarning ? '#f59e0b' : '#10b981')
                                }}>
                                    {isExceeded ? '🚨 Over Limit' : (isWarning ? '⚠️ 80% Spent' : '✓ On Track')}
                                </span>
                            </div>

                            {/* Progress bar */}
                            <div style={{ height: '7px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden', margin: '12px 0 8px 0' }}>
                                <div style={{
                                    width: `${Math.min(100, pct)}%`,
                                    height: '100%',
                                    background: isExceeded ? '#ef4444' : (isWarning ? '#f59e0b' : 'var(--accent)'),
                                    transition: 'width 0.2s ease'
                                }} />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                                <span>{pct}% utilized</span>
                                <span>
                                    {isExceeded
                                        ? `Over by ₹${(spent - budgetAmt).toLocaleString('en-IN')}`
                                        : `₹${(budgetAmt - spent).toLocaleString('en-IN')} left`}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
