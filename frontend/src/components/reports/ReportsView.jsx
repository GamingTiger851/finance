import React, { useState, useMemo } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';

export default function ReportsView() {
    const { transactions, showToast } = useFinance();
    const { currentUser } = useAuth();
    const [period, setPeriod] = useState('month'); // 'month', 'last-month', 'quarter', 'all'

    const now = new Date();

    const filteredData = useMemo(() => {
        return transactions.filter(t => {
            const d = new Date(t.date || Date.now());
            if (period === 'month') {
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            }
            if (period === 'last-month') {
                const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
                const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
                return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
            }
            if (period === 'quarter') {
                const diffDays = Math.ceil(Math.abs(now - d) / (1000 * 60 * 60 * 24));
                return diffDays <= 90;
            }
            return true;
        });
    }, [transactions, period, now]);

    // Financial summaries
    const incomeTotal = filteredData.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount || 0), 0);
    const expenseTotal = filteredData.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount || 0), 0);
    const netCashflow = incomeTotal - expenseTotal;
    const savingsRate = incomeTotal > 0 ? Math.max(0, Math.round((netCashflow / incomeTotal) * 100)) : 0;

    // Export to Excel CSV
    const handleExportExcel = () => {
        const headers = ['Transaction ID', 'Date', 'Type', 'Category', 'Description', 'Amount (INR)'];
        const rows = filteredData.map(t => [
            `"${t.id || 'TXN-' + Math.random().toString(36).substr(2, 6)}"`,
            `"${t.date || new Date().toISOString().split('T')[0]}"`,
            `"${t.type.toUpperCase()}"`,
            `"${t.category || 'General'}"`,
            `"${(t.description || '').replace(/"/g, '""')}"`,
            `"${Number(t.amount || 0).toFixed(2)}"`
        ]);

        const csvContent = [
            `"FINTRACKER FINANCIAL STATEMENT REPORT"`,
            `"Account Holder: ${currentUser || 'Registered User'}"`,
            `"Reporting Period: ${period.toUpperCase()}"`,
            `"Generated Date: ${new Date().toLocaleString()}"`,
            `""`,
            `"SUMMARY METRICS"`,
            `"Total Income Received","₹${incomeTotal.toFixed(2)}"`,
            `"Total Expenses Incurred","₹${expenseTotal.toFixed(2)}"`,
            `"Net Financial Surplus","₹${netCashflow.toFixed(2)}"`,
            `"Savings Efficiency Rate","${savingsRate}%"`,
            `""`,
            headers.join(','),
            ...rows.map(r => r.join(','))
        ].join('\r\n');

        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `FinTracker_Statement_${period}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showToast('Financial Statement exported in Excel format!');
    };

    // Export to Official Bank-Style PDF Statement
    const handleExportPDF = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            showToast('Pop-up blocked. Please allow pop-ups to print PDF.');
            return;
        }

        const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

        const rowsHtml = filteredData.map(t => `
            <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 10px 8px; font-size: 12px; color: #4b5563;">${t.date || dateStr}</td>
                <td style="padding: 10px 8px; font-size: 13px; font-weight: 600; color: #111827;">${t.description || 'Transaction'}</td>
                <td style="padding: 10px 8px; font-size: 12px; color: #6b7280;">${t.category || 'General'}</td>
                <td style="padding: 10px 8px; font-size: 12px; font-weight: 700; color: ${t.type === 'income' ? '#059669' : '#dc2626'}; text-align: right;">
                    ${t.type === 'income' ? '+' : '-'}₹${Number(t.amount || 0).toLocaleString('en-IN')}
                </td>
            </tr>
        `).join('');

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>FinTracker Official Financial Statement</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 40px; color: #111827; }
                    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #014D3E; padding-bottom: 20px; }
                    .logo-brand { font-size: 26px; font-weight: 800; color: #014D3E; letter-spacing: -0.5px; }
                    .badge { background: #ADFF41; color: #000; font-size: 11px; font-weight: 800; padding: 3px 8px; border-radius: 4px; display: inline-block; margin-top: 4px; }
                    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin: 24px 0; }
                    .kpi-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; }
                    .kpi-title { font-size: 11px; text-transform: uppercase; color: #6b7280; font-weight: 700; }
                    .kpi-value { font-size: 20px; font-weight: 800; color: #111827; margin-top: 4px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th { text-align: left; padding: 10px 8px; background: #f3f4f6; font-size: 11.5px; color: #4b5563; text-transform: uppercase; border-bottom: 1px solid #d1d5db; }
                    .footer { margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 16px; font-size: 11px; color: #9ca3af; text-align: center; }
                    @media print { body { margin: 20px; } button { display: none; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 6px;">
                            <img src="/logo.png" alt="HAWKS" style="width: 36px; height: 36px; border-radius: 8px; object-fit: contain; background: #090D16; padding: 2px;" />
                            <div class="logo-brand">FINTRACKER &amp; INVESTMENT</div>
                        </div>
                        <div class="badge">AUDITED FINANCIAL STATEMENT • HAWKS INTELLIGENCE</div>
                        <div style="font-size: 13px; color: #6b7280; margin-top: 8px;">
                            Account Holder: <strong>${currentUser || 'Primary Account'}</strong>
                        </div>
                    </div>
                    <div style="text-align: right; font-size: 12.5px; color: #4b5563;">
                        <div>Statement Date: <strong>${dateStr}</strong></div>
                        <div>Reporting Cycle: <strong>${period.toUpperCase()}</strong></div>
                        <div>Status: <strong>Verified</strong></div>
                    </div>
                </div>

                <div class="kpi-grid">
                    <div class="kpi-card">
                        <div class="kpi-title">Total Inflows</div>
                        <div class="kpi-value" style="color: #059669;">₹${incomeTotal.toLocaleString('en-IN')}</div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-title">Total Outflows</div>
                        <div class="kpi-value" style="color: #dc2626;">₹${expenseTotal.toLocaleString('en-IN')}</div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-title">Net Surplus</div>
                        <div class="kpi-value">₹${netCashflow.toLocaleString('en-IN')}</div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-title">Savings Rate</div>
                        <div class="kpi-value">${savingsRate}%</div>
                    </div>
                </div>

                <h3 style="margin: 24px 0 8px 0; font-size: 15px; color: #111827;">Itemized Transactions Ledger</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Description</th>
                            <th>Category</th>
                            <th style="text-align: right;">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml || '<tr><td colspan="4" style="text-align: center; padding: 24px; color: #9ca3af;">No records found for this period.</td></tr>'}
                    </tbody>
                </table>

                <div class="footer">
                    FinTracker Automated Wealth Engine · Certified Record · Generated on ${new Date().toUTCString()}
                </div>

                <script>
                    window.onload = function() {
                        window.print();
                    };
                </script>
            </body>
            </html>
        `;

        printWindow.document.open();
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        showToast('PDF Print dialog initiated!');
    };

    return (
        <div id="reportsPage" className="page-view">
            {/* Header */}
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '24px' }}>📑</span>
                        <h1 className="page-title" style={{ margin: 0 }}>Reports &amp; Financial Statements</h1>
                    </div>
                    <p className="page-subtitle">
                        Generate official bank-grade PDF statements and complete Excel workbooks.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleExportExcel}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <span>📊</span> Download Excel (.csv)
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleExportPDF}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700' }}
                    >
                        <span>📄</span> Download Official PDF
                    </button>
                </div>
            </div>

            {/* Period Filter Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '18px', overflowX: 'auto' }}>
                {[
                    { id: 'month', label: 'Current Month' },
                    { id: 'last-month', label: 'Previous Month' },
                    { id: 'quarter', label: 'Past 90 Days (Quarter)' },
                    { id: 'all', label: 'All-Time Financial History' }
                ].map(p => (
                    <button
                        key={p.id}
                        type="button"
                        className={`pill ${period === p.id ? 'active' : ''}`}
                        onClick={() => setPeriod(p.id)}
                        style={{ fontSize: '13px', padding: '8px 16px' }}
                    >
                        {p.label}
                    </button>
                ))}
            </div>

            {/* Financial Health Summary Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                gap: '14px',
                marginTop: '18px'
            }}>
                <div className="table-card" style={{ padding: '18px 20px', background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Total Inflows</div>
                    <div style={{ fontSize: '22px', fontWeight: '800', color: '#10b981', marginTop: '4px' }}>₹{incomeTotal.toLocaleString('en-IN')}</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>Verified credits</div>
                </div>

                <div className="table-card" style={{ padding: '18px 20px', background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Total Outflows</div>
                    <div style={{ fontSize: '22px', fontWeight: '800', color: '#ef4444', marginTop: '4px' }}>₹{expenseTotal.toLocaleString('en-IN')}</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>Verified debits</div>
                </div>

                <div className="table-card" style={{ padding: '18px 20px', background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Net Cash Surplus</div>
                    <div style={{ fontSize: '22px', fontWeight: '800', color: netCashflow >= 0 ? '#ADFF41' : '#ef4444', marginTop: '4px' }}>
                        {netCashflow >= 0 ? `+₹${netCashflow.toLocaleString('en-IN')}` : `-₹${Math.abs(netCashflow).toLocaleString('en-IN')}`}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>Cash flow position</div>
                </div>

                <div className="table-card" style={{ padding: '18px 20px', background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Savings Efficiency</div>
                    <div style={{ fontSize: '22px', fontWeight: '800', color: '#60a5fa', marginTop: '4px' }}>{savingsRate}%</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>Of total income saved</div>
                </div>
            </div>

            {/* Statement Preview Table */}
            <div className="table-card" style={{ marginTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <h3 style={{ margin: 0, fontSize: '16px' }}>Statement Ledger Preview ({filteredData.length} entries)</h3>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Click Download PDF above for full formatted print</span>
                </div>

                <div className="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Description</th>
                                <th>Category</th>
                                <th>Type</th>
                                <th style={{ textAlign: 'right' }}>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                                        No records found in this reporting window.
                                    </td>
                                </tr>
                            ) : (
                                filteredData.slice(0, 15).map(t => (
                                    <tr key={t.id || Math.random()}>
                                        <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t.date || 'Today'}</td>
                                        <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{t.description || 'Transaction'}</td>
                                        <td style={{ fontSize: '12.5px' }}>{t.category || 'General'}</td>
                                        <td>
                                            <span style={{
                                                fontSize: '10.5px',
                                                padding: '2px 6px',
                                                borderRadius: '3px',
                                                fontWeight: '700',
                                                background: t.type === 'income' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                                color: t.type === 'income' ? '#10b981' : '#ef4444'
                                            }}>
                                                {t.type.toUpperCase()}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: '700', color: t.type === 'income' ? '#10b981' : '#ef4444' }}>
                                            {t.type === 'income' ? '+' : '-'}₹{Number(t.amount || 0).toLocaleString('en-IN')}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
