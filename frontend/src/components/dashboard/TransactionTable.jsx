import React from 'react';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';
import { formatAmount, formatDate } from '../../constants';

export default function TransactionTable({ onOpenAddModal }) {
    const {
        transactions,
        filteredTransactions,
        currentFilter,
        setCurrentFilter,
        searchQuery,
        setSearchQuery,
        deleteTransaction,
        clearAllExpenses,
        clearAllTransactions,
        showConfirm,
        showToast
    } = useFinance();
    const { userProfile } = useAuth();
    const currency = userProfile.currency || 'USD';

    const handleExportExcel = () => {
        const itemsToExport = currentFilter === 'income'
            ? filteredTransactions
            : (currentFilter === 'expense' ? filteredTransactions : transactions.filter(t => t.type === 'expense'));

        if (!itemsToExport || itemsToExport.length === 0) {
            showToast('No expense records available to export.');
            return;
        }

        const headers = ['Transaction ID', 'Date', 'Description', 'Category', 'Type', `Amount (${currency})`];
        const rows = itemsToExport.map(t => [
            `"${t.id || ''}"`,
            `"${t.date || ''}"`,
            `"${(t.description || '').replace(/"/g, '""')}"`,
            `"${t.category || 'Other'}"`,
            `"${(t.type || 'expense').toUpperCase()}"`,
            `"${Number(t.amount) || 0}"`
        ]);

        const totalAmt = itemsToExport.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
        const summaryRow = [`"TOTAL"`, `""`, `""`, `""`, `"${itemsToExport.length} Transactions"`, `"${totalAmt}"`];

        const csvContent = [
            `"FINTRACKER - EXPENSES & OUTFLOW REPORT"`,
            `"Export Date: ${new Date().toLocaleString()}"`,
            `"Currency: ${currency}"`,
            `"Total Outflow Amount: ${totalAmt}"`,
            `""`,
            headers.join(','),
            ...rows.map(r => r.join(',')),
            summaryRow.join(',')
        ].join('\r\n');

        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const dateStr = new Date().toISOString().split('T')[0];
        link.setAttribute('download', `FinTracker_Expenses_${dateStr}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showToast(`Exported ${itemsToExport.length} records to Excel successfully!`);
    };

    const handleDelete = (id, description) => {
        showConfirm(
            'Delete Transaction',
            `Are you sure you want to delete "${description}"?`,
            () => deleteTransaction(id)
        );
    };

    return (
        <div className="table-card">
            <div className="txn-toolbar">
                <div className="toolbar-left">
                    <div className="search-box">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
                            <path d="M16 16L21 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search transactions..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="filter-pills">
                        <button
                            className={`pill ${currentFilter === 'all' ? 'active' : ''}`}
                            onClick={() => setCurrentFilter('all')}
                        >
                            All
                        </button>
                        <button
                            className={`pill ${currentFilter === 'income' ? 'active' : ''}`}
                            onClick={() => setCurrentFilter('income')}
                        >
                            Income
                        </button>
                        <button
                            className={`pill ${currentFilter === 'expense' ? 'active' : ''}`}
                            onClick={() => setCurrentFilter('expense')}
                        >
                            Expense
                        </button>
                    </div>
                </div>

                <div className="toolbar-right" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleExportExcel}
                        title="Download expenses into Microsoft Excel / CSV spreadsheet"
                        style={{
                            fontSize: '12px',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontWeight: '600'
                        }}
                    >
                        <span>📊</span> Download Excel
                    </button>
                    {filteredTransactions.length > 0 && (
                        <button
                            type="button"
                            className="btn btn-secondary-dark"
                            onClick={() => {
                                showConfirm(
                                    currentFilter === 'expense' ? 'Clear All Expenses?' : 'Clear All Filtered Transactions?',
                                    `Are you sure you want to delete ${filteredTransactions.length} transaction(s)?`,
                                    currentFilter === 'expense' ? clearAllExpenses : clearAllTransactions
                                );
                            }}
                            style={{
                                color: '#f87171',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                background: 'rgba(239, 68, 68, 0.1)',
                                fontSize: '12px',
                                padding: '8px 12px',
                                borderRadius: '8px'
                            }}
                        >
                            🗑️ Clear {currentFilter === 'expense' ? 'Expenses' : 'All'}
                        </button>
                    )}
                    <button className="btn btn-primary" onClick={onOpenAddModal}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        Add Transaction
                    </button>
                </div>
            </div>

            <div className="table-responsive">
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Description</th>
                            <th>Category</th>
                            <th>Amount</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody id="transactionTableBody">
                        {filteredTransactions.length === 0 ? (
                            <tr className="empty-row">
                                <td colSpan="5">
                                    No transactions found. Click "Add Transaction" to create one.
                                </td>
                            </tr>
                        ) : (
                            filteredTransactions.map((t) => {
                                const isIncome = t.type === 'income';
                                return (
                                    <tr key={t.id}>
                                        <td data-label="Date">{formatDate(t.date)}</td>
                                        <td data-label="Description">{t.description}</td>
                                        <td data-label="Category">
                                            <span className="category-pill">{t.category}</span>
                                        </td>
                                        <td data-label="Amount" className={`amount-cell ${t.type}`}>
                                            {isIncome ? '+' : '-'} {formatAmount(t.amount, currency)}
                                        </td>
                                        <td data-label="">
                                            <button
                                                className="delete-btn"
                                                onClick={() => handleDelete(t.id, t.description)}
                                                title="Delete transaction"
                                            >
                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M4 7H20M9 7V4.5A1.5 1.5 0 0 1 10.5 3H13.5A1.5 1.5 0 0 1 15 4.5V7M18 7L17.3 19A2 2 0 0 1 15.3 21H8.7A2 2 0 0 1 6.7 19L6 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
