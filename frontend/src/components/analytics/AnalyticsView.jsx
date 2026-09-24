import React, { useState, useMemo } from 'react';
import { useFinance } from '../../context/FinanceContext';

const CATEGORY_COLORS = {
    'Food & Groceries': '#ADFF41',
    'Housing & Rent': '#059669',
    'Transportation': '#38bdf8',
    'Utilities & Bills': '#f59e0b',
    'Entertainment': '#a855f7',
    'Healthcare': '#ec4899',
    'Shopping': '#6366f1',
    'Other': '#94a3b8'
};

export default function AnalyticsView() {
    const { transactions } = useFinance();
    const [timeframe, setTimeframe] = useState('all'); // 'all', 'month', '30d'

    const now = new Date();

    const filteredExpenses = useMemo(() => {
        return transactions.filter(t => {
            if (t.type !== 'expense') return false;
            const tDate = new Date(t.date || Date.now());

            if (timeframe === 'month') {
                return tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear();
            }
            if (timeframe === '30d') {
                const diffTime = Math.abs(now - tDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return diffDays <= 30;
            }
            return true;
        });
    }, [transactions, timeframe, now]);

    // Aggregate category totals
    const { categoryTotals, totalSpent, maxSingleExpense } = useMemo(() => {
        const totals = {};
        let sum = 0;
        let maxSingle = { description: 'None', amount: 0 };

        filteredExpenses.forEach(t => {
            const cat = t.category || 'Other';
            const amt = Number(t.amount || 0);
            totals[cat] = (totals[cat] || 0) + amt;
            sum += amt;
            if (amt > maxSingle.amount) {
                maxSingle = { description: t.description || 'Expense', amount: amt, category: cat };
            }
        });

        return { categoryTotals: totals, totalSpent: sum, maxSingleExpense: maxSingle };
    }, [filteredExpenses]);

    const sortedCategories = useMemo(() => {
        return Object.entries(categoryTotals)
            .map(([cat, amt]) => ({
                category: cat,
                amount: amt,
                percent: totalSpent > 0 ? ((amt / totalSpent) * 100).toFixed(1) : 0,
                color: CATEGORY_COLORS[cat] || '#64748b'
            }))
            .sort((a, b) => b.amount - a.amount);
    }, [categoryTotals, totalSpent]);

    const avgTransaction = filteredExpenses.length > 0 ? Math.round(totalSpent / filteredExpenses.length) : 0;

    // AI Financial Insights
    const insights = useMemo(() => {
        const list = [];
        const foodSpend = categoryTotals['Food & Groceries'] || 0;
        const entertainmentSpend = categoryTotals['Entertainment'] || 0;
        const shoppingSpend = categoryTotals['Shopping'] || 0;

        if (totalSpent > 0 && ((foodSpend + entertainmentSpend) / totalSpent) > 0.35) {
            list.push({
                type: 'warning',
                icon: '🍔',
                title: 'High Discretionary Food & Dining Outflow',
                text: `Dining and food represent ${Math.round(((foodSpend + entertainmentSpend) / totalSpent) * 100)}% of your expenses. Cooking more at home could unlock an estimated ₹4,000/mo surplus.`
            });
        }

        if (shoppingSpend > totalSpent * 0.25 && totalSpent > 10000) {
            list.push({
                type: 'info',
                icon: '🛍️',
                title: 'Shopping Peaks Detected',
                text: 'Shopping is consuming over a quarter of total expenditure. Introducing a 48-hour delay rule before non-essential purchases often reduces impulse spending by 30%.'
            });
        }

        if (maxSingleExpense.amount > 0) {
            list.push({
                type: 'neutral',
                icon: '📌',
                title: `Largest Outflow: ${maxSingleExpense.description}`,
                text: `Single payment of ₹${maxSingleExpense.amount.toLocaleString('en-IN')} in ${maxSingleExpense.category}.`
            });
        }

        if (list.length === 0) {
            list.push({
                type: 'success',
                icon: '✨',
                title: 'Balanced Outflow Profile',
                text: 'Your spending is well-dispersed across categories without hazardous lifestyle leaks.'
            });
        }

        return list;
    }, [categoryTotals, totalSpent, maxSingleExpense]);

    return (
        <div id="analyticsPage" className="page-view">
            {/* Header */}
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '24px' }}>📊</span>
                        <h1 className="page-title" style={{ margin: 0 }}>Expense Categories Analytics</h1>
                    </div>
                    <p className="page-subtitle">
                        Deep statistical breakdown, concentration metrics, and automated AI spending insights.
                    </p>
                </div>
                {/* Timeframe Filter Pills */}
                <div style={{ display: 'flex', gap: '8px' }}>
                    {[
                        { id: 'all', label: 'All Time' },
                        { id: 'month', label: 'This Month' },
                        { id: '30d', label: 'Past 30 Days' }
                    ].map(t => (
                        <button
                            key={t.id}
                            type="button"
                            className={`pill ${timeframe === t.id ? 'active' : ''}`}
                            onClick={() => setTimeframe(t.id)}
                            style={{ fontSize: '12px', padding: '6px 14px' }}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* 3 Metric Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                gap: '14px',
                marginTop: '18px'
            }}>
                <div className="table-card" style={{ padding: '18px 20px', background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Analyzed Outflow</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', marginTop: '4px' }}>₹{totalSpent.toLocaleString('en-IN')}</div>
                    <div style={{ fontSize: '11.5px', color: '#60a5fa', marginTop: '4px' }}>{filteredExpenses.length} transactions analyzed</div>
                </div>

                <div className="table-card" style={{ padding: '18px 20px', background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Avg Ticket Size</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#ADFF41', marginTop: '4px' }}>₹{avgTransaction.toLocaleString('en-IN')}</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>Per expense purchase</div>
                </div>

                <div className="table-card" style={{ padding: '18px 20px', background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Dominant Category</div>
                    <div style={{ fontSize: '20px', fontWeight: '800', color: '#38bdf8', marginTop: '4px' }}>
                        {sortedCategories[0]?.category || 'None'}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        {sortedCategories[0] ? `${sortedCategories[0].percent}% of total spend` : 'No data'}
                    </div>
                </div>
            </div>

            {/* Main Visual Breakdown: Donut Simulation + Bars */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '18px', marginTop: '20px' }}>
                {/* Category Bars List */}
                <div className="table-card" style={{ padding: '24px' }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>Categorical Distribution</h3>
                    {sortedCategories.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                            No expense records logged in this timeframe.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {sortedCategories.map(item => (
                                <div key={item.category}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontSize: '13px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: item.color }} />
                                            <span style={{ fontWeight: '600' }}>{item.category}</span>
                                        </div>
                                        <div>
                                            <strong style={{ color: 'var(--text-primary)' }}>₹{item.amount.toLocaleString('en-IN')}</strong>
                                            <span style={{ color: 'var(--text-muted)', marginLeft: '6px', fontSize: '11.5px' }}>({item.percent}%)</span>
                                        </div>
                                    </div>
                                    <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div style={{ width: `${item.percent}%`, height: '100%', background: item.color, borderRadius: '4px', transition: 'width 0.3s ease' }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* AI Spending Intelligence & Insights */}
                <div className="table-card" style={{ padding: '24px' }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>💡 AI Spend Intelligence &amp; Observations</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {insights.map((ins, i) => (
                            <div
                                key={i}
                                style={{
                                    padding: '14px',
                                    borderRadius: '10px',
                                    background: 'rgba(255,255,255,0.02)',
                                    border: '1px solid var(--border)',
                                    display: 'flex',
                                    gap: '12px',
                                    alignItems: 'flex-start'
                                }}
                            >
                                <span style={{ fontSize: '22px' }}>{ins.icon}</span>
                                <div>
                                    <div style={{ fontWeight: '700', fontSize: '13.5px', color: 'var(--text-primary)' }}>
                                        {ins.title}
                                    </div>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                                        {ins.text}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
