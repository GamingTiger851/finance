import React, { useState, useEffect } from 'react';
import { useFinance } from '../../context/FinanceContext';

const DEFAULT_RECURRING = [];

export default function RecurringTransactionsView() {
    const { addTransaction, showToast } = useFinance();
    const [recurringList, setRecurringList] = useState(() => {
        try {
            const saved = localStorage.getItem('fintrack_recurring_bills');
            return saved ? JSON.parse(saved) : DEFAULT_RECURRING;
        } catch {
            return DEFAULT_RECURRING;
        }
    });

    const [showAddModal, setShowAddModal] = useState(false);
    const [newBill, setNewBill] = useState({
        name: '',
        category: 'Utilities & Bills',
        amount: '',
        frequency: 'Monthly',
        nextDue: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        autoPay: false
    });

    useEffect(() => {
        localStorage.setItem('fintrack_recurring_bills', JSON.stringify(recurringList));
    }, [recurringList]);

    // Summary calculations
    const activeBills = recurringList.filter(b => b.active);
    const monthlyCommitment = activeBills.reduce((sum, b) => {
        let mult = 1;
        if (b.frequency === 'Weekly') mult = 4.33;
        else if (b.frequency === 'Quarterly') mult = 1 / 3;
        else if (b.frequency === 'Yearly') mult = 1 / 12;
        return sum + Math.round(b.amount * mult);
    }, 0);

    const now = new Date();
    const upcomingNext7Days = activeBills.filter(b => {
        const dueDate = new Date(b.nextDue);
        const diffDays = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 7;
    });

    const upcomingTotal = upcomingNext7Days.reduce((sum, b) => sum + Number(b.amount), 0);

    const handleAddRecurring = (e) => {
        e.preventDefault();
        if (!newBill.name.trim() || !newBill.amount) return;

        const bill = {
            id: `rec-${Date.now()}`,
            name: newBill.name.trim(),
            category: newBill.category,
            amount: Number(newBill.amount),
            frequency: newBill.frequency,
            nextDue: newBill.nextDue,
            autoPay: newBill.autoPay,
            active: true
        };

        setRecurringList([bill, ...recurringList]);
        setShowAddModal(false);
        setNewBill({
            name: '',
            category: 'Utilities & Bills',
            amount: '',
            frequency: 'Monthly',
            nextDue: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
            autoPay: false
        });
        showToast(`Scheduled recurring bill "${bill.name}" added!`);
    };

    const handleDelete = (id) => {
        setRecurringList(recurringList.filter(b => b.id !== id));
        showToast('Recurring bill removed');
    };

    const handleToggleActive = (id) => {
        setRecurringList(recurringList.map(b => b.id === id ? { ...b, active: !b.active } : b));
    };

    // Pay and immediately post to ledger
    const handlePayAndRecord = (bill) => {
        addTransaction({
            description: `${bill.name} (Recurring Payment)`,
            amount: Number(bill.amount),
            type: 'expense',
            category: bill.category,
            date: new Date().toISOString().split('T')[0]
        });

        // Advance next due date by 1 month (or frequency)
        const nextDate = new Date(bill.nextDue);
        if (bill.frequency === 'Weekly') nextDate.setDate(nextDate.getDate() + 7);
        else if (bill.frequency === 'Quarterly') nextDate.setMonth(nextDate.getMonth() + 3);
        else if (bill.frequency === 'Yearly') nextDate.setFullYear(nextDate.getFullYear() + 1);
        else nextDate.setMonth(nextDate.getMonth() + 1);

        setRecurringList(recurringList.map(b => b.id === bill.id ? { ...b, nextDue: nextDate.toISOString().split('T')[0] } : b));
        showToast(`Recorded ₹${bill.amount} to your expenses ledger! Next due: ${nextDate.toISOString().split('T')[0]}`);
    };

    return (
        <div id="recurringPage" className="page-view">
            {/* Header */}
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '24px' }}>🔄</span>
                        <h1 className="page-title" style={{ margin: 0 }}>Recurring Transactions &amp; Subscriptions</h1>
                    </div>
                    <p className="page-subtitle">
                        Manage automated bills, SIP investments, and ongoing subscriptions with one-click payment logging.
                    </p>
                </div>
                <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setShowAddModal(true)}
                    style={{ fontWeight: '700' }}
                >
                    + Add Recurring Bill
                </button>
            </div>

            {/* KPI Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                gap: '14px',
                marginTop: '18px'
            }}>
                <div className="table-card" style={{ padding: '18px 20px', background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Monthly Outflow Commitments</div>
                    <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', marginTop: '4px' }}>₹{monthlyCommitment.toLocaleString('en-IN')}/mo</div>
                    <div style={{ fontSize: '11.5px', color: '#60a5fa', marginTop: '4px' }}>Across {activeBills.length} active recurring items</div>
                </div>

                <div className="table-card" style={{ padding: '18px 20px', background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Due in Next 7 Days</div>
                    <div style={{ fontSize: '22px', fontWeight: '800', color: upcomingTotal > 0 ? '#f59e0b' : '#10b981', marginTop: '4px' }}>
                        ₹{upcomingTotal.toLocaleString('en-IN')}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>{upcomingNext7Days.length} payments pending this week</div>
                </div>

                <div className="table-card" style={{ padding: '18px 20px', background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Active Subscriptions</div>
                    <div style={{ fontSize: '22px', fontWeight: '800', color: '#ADFF41', marginTop: '4px' }}>{activeBills.length} / {recurringList.length}</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>{recurringList.length - activeBills.length} paused</div>
                </div>
            </div>

            {/* Recurring Items Table */}
            <div className="table-card" style={{ marginTop: '20px' }}>
                <div className="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Subscription / Bill Name</th>
                                <th>Category</th>
                                <th>Amount</th>
                                <th>Cycle</th>
                                <th>Next Due Date</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recurringList.length === 0 ? (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                                        No recurring transactions configured. Click "+ Add Recurring Bill" above to get started!
                                    </td>
                                </tr>
                            ) : (
                                recurringList.map(bill => {
                                    const dueDate = new Date(bill.nextDue);
                                    const diffDays = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
                                    const isDueSoon = diffDays >= 0 && diffDays <= 5;
                                    const isOverdue = diffDays < 0;

                                    return (
                                        <tr key={bill.id} style={{ opacity: bill.active ? 1 : 0.6 }}>
                                            <td>
                                                <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{bill.name}</div>
                                                {bill.autoPay && (
                                                    <span style={{ fontSize: '10.5px', color: '#60a5fa', fontWeight: '600' }}>⚡ Auto-Debit Enabled</span>
                                                )}
                                            </td>
                                            <td style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>{bill.category}</td>
                                            <td style={{ fontWeight: '800', color: '#ef4444' }}>₹{Number(bill.amount).toLocaleString('en-IN')}</td>
                                            <td style={{ fontSize: '12px' }}>{bill.frequency}</td>
                                            <td>
                                                <div style={{ fontSize: '12.5px', fontWeight: '600' }}>{bill.nextDue}</div>
                                                <span style={{
                                                    fontSize: '10.5px',
                                                    padding: '1px 6px',
                                                    borderRadius: '4px',
                                                    fontWeight: '700',
                                                    background: isOverdue ? 'rgba(239, 68, 68, 0.15)' : (isDueSoon ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255,255,255,0.06)'),
                                                    color: isOverdue ? '#ef4444' : (isDueSoon ? '#f59e0b' : 'var(--text-muted)')
                                                }}>
                                                    {isOverdue ? '⚠️ Overdue' : (isDueSoon ? `Due in ${diffDays}d` : `${diffDays} days away`)}
                                                </span>
                                            </td>
                                            <td>
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleActive(bill.id)}
                                                    style={{
                                                        background: bill.active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.06)',
                                                        color: bill.active ? '#10b981' : 'var(--text-muted)',
                                                        border: 'none',
                                                        padding: '3px 8px',
                                                        borderRadius: '12px',
                                                        fontSize: '11px',
                                                        fontWeight: '700',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    {bill.active ? '● Active' : '○ Paused'}
                                                </button>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '6px' }}>
                                                    <button
                                                        type="button"
                                                        className="btn btn-primary btn-sm"
                                                        onClick={() => handlePayAndRecord(bill)}
                                                        style={{ fontSize: '11px', padding: '4px 8px', fontWeight: '700' }}
                                                        title="Log this bill to your current month's expenses ledger"
                                                    >
                                                        💳 Pay &amp; Log
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn btn-secondary btn-sm"
                                                        onClick={() => handleDelete(bill.id)}
                                                        style={{ fontSize: '11px', padding: '4px 8px', color: '#ef4444' }}
                                                        title="Delete subscription"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Recurring Bill Modal */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
                        <div className="modal-header">
                            <h3 style={{ margin: 0, fontSize: '17px' }}>+ New Recurring Bill or Subscription</h3>
                            <button type="button" className="close-btn" onClick={() => setShowAddModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleAddRecurring} style={{ marginTop: '16px' }}>
                            <div className="form-group">
                                <label>Service / Bill Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Netflix, Rent, Mobile Postpaid, SIP"
                                    value={newBill.name}
                                    onChange={(e) => setNewBill({ ...newBill, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div className="form-group">
                                    <label>Amount (INR)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        step="1"
                                        placeholder="Amount"
                                        value={newBill.amount}
                                        onChange={(e) => setNewBill({ ...newBill, amount: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Frequency</label>
                                    <select
                                        value={newBill.frequency}
                                        onChange={(e) => setNewBill({ ...newBill, frequency: e.target.value })}
                                    >
                                        <option value="Weekly">Weekly</option>
                                        <option value="Monthly">Monthly</option>
                                        <option value="Quarterly">Quarterly</option>
                                        <option value="Yearly">Yearly</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div className="form-group">
                                    <label>Category</label>
                                    <select
                                        value={newBill.category}
                                        onChange={(e) => setNewBill({ ...newBill, category: e.target.value })}
                                    >
                                        <option value="Utilities & Bills">Utilities &amp; Bills</option>
                                        <option value="Housing & Rent">Housing &amp; Rent</option>
                                        <option value="Savings & Investments">Savings &amp; Investments</option>
                                        <option value="Entertainment">Entertainment</option>
                                        <option value="Transportation">Transportation</option>
                                        <option value="Healthcare">Healthcare</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Next Due Date</label>
                                    <input
                                        type="date"
                                        value={newBill.nextDue}
                                        onChange={(e) => setNewBill({ ...newBill, nextDue: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '14px 0' }}>
                                <input
                                    type="checkbox"
                                    id="autoPayCheckbox"
                                    checked={newBill.autoPay}
                                    onChange={(e) => setNewBill({ ...newBill, autoPay: e.target.checked })}
                                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                />
                                <label htmlFor="autoPayCheckbox" style={{ fontSize: '13px', cursor: 'pointer', margin: 0 }}>
                                    Bank Auto-Debit / Auto-Pay enabled
                                </label>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" style={{ fontWeight: '700' }}>
                                    Save Recurring Bill
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
