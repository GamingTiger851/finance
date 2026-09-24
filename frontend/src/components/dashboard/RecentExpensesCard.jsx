import React from 'react';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';
import { formatAmount } from '../../constants';

export default function RecentExpensesCard({ onOpenAddModal, onViewAll }) {
    const { transactions, clearAllExpenses, showConfirm } = useFinance();
    const { userProfile } = useAuth();
    const currency = userProfile.currency || 'INR';

    // Real user recorded expenses
    const userExpenses = transactions
        .filter(t => t.type === 'expense')
        .map(t => ({
            id: t.id,
            date: t.date,
            name: t.description || t.title || 'Expense',
            category: t.category,
            amount: t.amount,
            icon: t.category?.includes('Food') ? '🍔' :
                  t.category?.includes('Shopping') ? '📦' :
                  t.category?.includes('Transport') || t.category?.includes('Auto') || t.category?.includes('Petrol') ? '🚗' :
                  t.category?.includes('Bill') || t.category?.includes('Utilities') || t.category?.includes('Recharge') ? '⚡' :
                  t.category?.includes('Health') ? '💊' : '🏷️',
            bg: '#F1F5F9',
            color: 'var(--accent)'
        }));

    const displayItems = userExpenses.slice(0, 5);

    const handleClearAll = () => {
        showConfirm(
            'Clear All Expenses?',
            `Are you sure you want to delete all ${userExpenses.length} expense transactions? Your income transactions and goals will remain intact.`,
            clearAllExpenses
        );
    };

    const handleExportExcel = () => {
        if (!userExpenses || userExpenses.length === 0) return;
        const headers = ['Date', 'Description', 'Category', `Amount (${currency})`];
        const rows = userExpenses.map(t => [
            `"${t.date || ''}"`,
            `"${(t.name || '').replace(/"/g, '""')}"`,
            `"${t.category || 'Other'}"`,
            `"${Number(t.amount) || 0}"`
        ]);
        const totalAmt = userExpenses.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
        const csvContent = [
            `"FINTRACKER - RECENT EXPENSES REPORT"`,
            `"Exported: ${new Date().toLocaleString()}"`,
            `"Total Outflow: ${totalAmt} ${currency}"`,
            `""`,
            headers.join(','),
            ...rows.map(r => r.join(',')),
            `"TOTAL","${userExpenses.length} Records","","${totalAmt}"`
        ].join('\r\n');

        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `FinTracker_Expenses_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="operational-card">
            <div className="operational-card-header">
                <div>
                    <h2 className="operational-title">Recent Expenses</h2>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {userExpenses.length > 0 && (
                        <>
                            <button
                                type="button"
                                className="operational-link-btn"
                                onClick={handleExportExcel}
                                title="Download expenses as Excel spreadsheet (.csv)"
                                style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                                <span>📊</span> Excel
                            </button>
                            <button
                                type="button"
                                className="operational-clear-btn"
                                onClick={handleClearAll}
                                title="Clear all recorded expenses"
                                style={{
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    border: '1px solid rgba(239, 68, 68, 0.25)',
                                    color: '#f87171',
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                🗑️ Clear All
                            </button>
                            <button
                                type="button"
                                className="operational-link-btn"
                                onClick={onViewAll}
                            >
                                View All
                            </button>
                        </>
                    )}
                    <button
                        type="button"
                        className="operational-mini-add-btn"
                        onClick={onOpenAddModal}
                        title="Add New Expense"
                    >
                        + New
                    </button>
                </div>
            </div>

            <div className="recent-table-wrap">
                {displayItems.length > 0 ? (
                    <table className="recent-expenses-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Description</th>
                                <th>Category</th>
                                <th style={{ textAlign: 'right' }}>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayItems.map(item => (
                                <tr key={item.id}>
                                    <td className="text-muted" style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                                        {item.date}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span className="brand-emoji-chip" style={{ background: item.bg }}>
                                                {item.icon}
                                            </span>
                                            <span style={{ fontWeight: '600', color: 'var(--text)', fontSize: '13.5px' }}>
                                                {item.name}
                                            </span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="category-pill-subtle">
                                            {item.category}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'right', fontWeight: '700', color: '#ef4444', fontVariantNumeric: 'tabular-nums' }}>
                                        - {formatAmount(item.amount, currency)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div style={{ padding: '36px 16px', textAlign: 'center', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                        <div style={{ fontSize: '32px', marginBottom: '8px' }}>🧾</div>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text)', marginBottom: '4px' }}>
                            All Expenses Cleared
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 16px', maxWidth: '320px', marginLeft: 'auto', marginRight: 'auto' }}>
                            You currently have zero logged expenses. Start fresh by recording your latest spend.
                        </p>
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={onOpenAddModal}
                            style={{ fontSize: '12px', padding: '7px 18px', borderRadius: '8px' }}
                        >
                            + Add New Expense
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
