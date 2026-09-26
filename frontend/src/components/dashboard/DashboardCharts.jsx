import React, { useEffect, useRef, useMemo } from 'react';
import Chart from 'chart.js/auto';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';

const CATEGORY_COLOR_MAP = {
    'Food & Dining': '#3b82f6',
    'Transport': '#10b981',
    'Bills & Utilities': '#f59e0b',
    'Shopping': '#8b5cf6',
    'Health': '#ef4444',
    'Salary': '#10b981',
    'Freelance': '#06b6d4',
    'Rent': '#ec4899',
    'Entertainment': '#14b8a6',
    'Other': '#64748b',
    'Others': '#64748b'
};

const DEFAULT_PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#14b8a6'];

function createBalanceGlowPlugin() {
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    return {
        id: 'balanceTrendGlow',
        beforeDatasetDraw(chart, args) {
            if (args.index !== 0) return;
            const ctx = chart.ctx;
            const pulse = reducedMotion ? 3 : 4 + (Math.sin(performance.now() / 850) + 1) * 1.5;
            ctx.save();
            ctx.shadowColor = 'rgba(5, 150, 105, 0.42)';
            ctx.shadowBlur = pulse;
        },
        afterDatasetDraw(chart, args) {
            if (args.index !== 0) return;
            chart.ctx.restore();

            const points = chart.getDatasetMeta(0).data;
            const latestPoint = points[points.length - 1];
            if (!latestPoint) return;

            const { x, y } = latestPoint.getProps(['x', 'y'], true);
            const radius = reducedMotion ? 8 : 7 + (Math.sin(performance.now() / 850) + 1) * 2;
            const glow = chart.ctx.createRadialGradient(x, y, 1, x, y, radius);
            glow.addColorStop(0, 'rgba(5, 150, 105, 0.24)');
            glow.addColorStop(0.45, 'rgba(5, 150, 105, 0.13)');
            glow.addColorStop(1, 'rgba(5, 150, 105, 0)');

            chart.ctx.save();
            chart.ctx.fillStyle = glow;
            chart.ctx.beginPath();
            chart.ctx.arc(x, y, radius, 0, Math.PI * 2);
            chart.ctx.fill();
            chart.ctx.restore();
        },
        afterDraw(chart) {
            if (reducedMotion || chart.$balanceGlowFrame) return;
            chart.$balanceGlowFrame = requestAnimationFrame(() => {
                chart.$balanceGlowFrame = null;
                if (!chart._destroyed) chart.draw();
            });
        },
        beforeDestroy(chart) {
            if (chart.$balanceGlowFrame) cancelAnimationFrame(chart.$balanceGlowFrame);
            chart.$balanceGlowFrame = null;
        }
    };
}

export default function DashboardCharts() {
    const { transactions } = useFinance();
    const { darkMode } = useAuth();

    const donutRef = useRef(null);
    const barRef = useRef(null);
    const lineRef = useRef(null);

    const donutInstance = useRef(null);
    const barInstance = useRef(null);
    const lineInstance = useRef(null);

    const textColor = darkMode ? '#94a3b8' : '#64748b';
    const gridColor = darkMode ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';

    // Filter real expenses
    const expenseTxns = useMemo(() => {
        return transactions.filter(t => t.type === 'expense');
    }, [transactions]);

    // 1. Dynamic Donut Data
    const donutData = useMemo(() => {
        if (expenseTxns.length === 0) {
            return {
                labels: ['No Expenses'],
                data: [1],
                colors: [darkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'],
                categories: [],
                isEmpty: true
            };
        }

        const catTotals = {};
        let total = 0;
        expenseTxns.forEach(t => {
            const cat = t.category || 'Other';
            const amt = Number(t.amount) || 0;
            catTotals[cat] = (catTotals[cat] || 0) + amt;
            total += amt;
        });

        const sortedCats = Object.keys(catTotals).sort((a, b) => catTotals[b] - catTotals[a]);
        const labels = sortedCats;
        const data = sortedCats.map(c => catTotals[c]);
        const colors = sortedCats.map((c, i) => CATEGORY_COLOR_MAP[c] || DEFAULT_PALETTE[i % DEFAULT_PALETTE.length]);
        const categories = sortedCats.map((c, i) => ({
            name: c,
            percent: total > 0 ? `${Math.round((catTotals[c] / total) * 100)}%` : '0%',
            color: colors[i]
        }));

        return { labels, data, colors, categories, isEmpty: false };
    }, [expenseTxns, darkMode]);

    // Generate last 6 months timeline
    const timeline = useMemo(() => {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const now = new Date();
        const list = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            list.push({
                year: d.getFullYear(),
                month: d.getMonth() + 1,
                key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
                label: monthNames[d.getMonth()]
            });
        }
        return list;
    }, []);

    // 2. Dynamic Monthly Expenses Data
    const monthlyBarData = useMemo(() => {
        const labels = timeline.map(t => t.label);
        if (expenseTxns.length === 0) {
            return { labels, data: [0, 0, 0, 0, 0, 0], isEmpty: true };
        }

        const data = timeline.map(m => {
            const sum = expenseTxns
                .filter(t => t.date && t.date.startsWith(m.key))
                .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
            return Math.round(sum / 1000 * 10) / 10; // in thousands (K)
        });

        const hasAnyValue = data.some(v => v > 0);
        return { labels, data, isEmpty: !hasAnyValue };
    }, [expenseTxns, timeline]);

    // 3. Dynamic Balance Trend Data
    const balanceTrendData = useMemo(() => {
        const labels = timeline.map(t => t.label);
        if (transactions.length === 0) {
            return { labels, data: [0, 0, 0, 0, 0, 0], isEmpty: true };
        }

        const data = timeline.map(m => {
            const endOfMonth = `${m.key}-31`;
            let bal = 0;
            transactions.forEach(t => {
                if (t.date && t.date <= endOfMonth) {
                    if (t.type === 'income') bal += (Number(t.amount) || 0);
                    else bal -= (Number(t.amount) || 0);
                }
            });
            return Math.round(bal / 1000 * 10) / 10; // in thousands (K)
        });

        return { labels, data, isEmpty: transactions.length === 0 };
    }, [transactions, timeline]);

    useEffect(() => {
        // --- 1. Expense Donut Chart ---
        if (donutRef.current) {
            if (donutInstance.current) donutInstance.current.destroy();

            const ctx = donutRef.current.getContext('2d');
            donutInstance.current = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: donutData.labels,
                    datasets: [{
                        data: donutData.data,
                        backgroundColor: donutData.colors,
                        borderWidth: donutData.isEmpty ? 0 : 2,
                        borderColor: darkMode ? '#111a2e' : '#ffffff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '72%',
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            enabled: !donutData.isEmpty
                        }
                    }
                }
            });
        }

        // --- 2. Monthly Expenses Bar Chart ---
        if (barRef.current) {
            if (barInstance.current) barInstance.current.destroy();

            const ctx = barRef.current.getContext('2d');
            barInstance.current = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: monthlyBarData.labels,
                    datasets: [{
                        label: 'Expenses',
                        data: monthlyBarData.data,
                        backgroundColor: '#059669',
                        hoverBackgroundColor: '#047857',
                        borderRadius: 8,
                        borderSkipped: false
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: (ctx) => `Expenses: ${ctx.parsed.y}K`
                            }
                        }
                    },
                    scales: {
                        x: {
                            ticks: { color: textColor, font: { family: 'Inter', size: 11 } },
                            grid: { display: false }
                        },
                        y: {
                            beginAtZero: true,
                            ticks: {
                                color: textColor,
                                font: { family: 'Inter', size: 10 },
                                callback: (val) => `${val}K`
                            },
                            grid: { color: gridColor },
                            suggestedMax: monthlyBarData.isEmpty ? 10 : undefined
                        }
                    }
                }
            });
        }

        // --- 3. Balance Trend Line Chart ---
        if (lineRef.current) {
            if (lineInstance.current) lineInstance.current.destroy();

            const ctx = lineRef.current.getContext('2d');
            lineInstance.current = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: balanceTrendData.labels,
                    datasets: [{
                        label: 'Balance',
                        data: balanceTrendData.data,
                        borderColor: '#059669',
                        backgroundColor: (context) => {
                            const { chart } = context;
                            const { ctx, chartArea } = chart;
                            if (!chartArea) return 'rgba(5, 150, 105, 0.10)';
                            const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                            gradient.addColorStop(0, 'rgba(5, 150, 105, 0.16)');
                            gradient.addColorStop(1, 'rgba(5, 150, 105, 0)');
                            return gradient;
                        },
                        borderWidth: 2.5,
                        fill: true,
                        tension: 0.35,
                        pointBackgroundColor: '#059669',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: (context) => context.dataIndex === context.dataset.data.length - 1 ? 4 : 0,
                        pointHoverRadius: (context) => context.dataIndex === context.dataset.data.length - 1 ? 6 : 3
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: (ctx) => `Balance: ${ctx.parsed.y}K`
                            }
                        }
                    },
                    scales: {
                        x: {
                            ticks: { color: textColor, font: { family: 'Inter', size: 11 } },
                            grid: { display: false }
                        },
                        y: {
                            ticks: {
                                color: textColor,
                                font: { family: 'Inter', size: 10 },
                                callback: (val) => `${val}K`
                            },
                            grid: { color: gridColor },
                            suggestedMax: balanceTrendData.isEmpty ? 10 : undefined
                        }
                    }
                },
                plugins: [createBalanceGlowPlugin()]
            });
        }

        return () => {
            if (donutInstance.current) donutInstance.current.destroy();
            if (barInstance.current) barInstance.current.destroy();
            if (lineInstance.current) lineInstance.current.destroy();
        };
    }, [donutData, monthlyBarData, balanceTrendData, darkMode, textColor, gridColor]);

    return (
        <div className="triple-chart-grid">
                {/* 1. Expense Overview Donut */}
                <div className="chart-panel-card">
                    <div className="panel-card-title">Expense Overview</div>
                    <div className="donut-chart-row">
                        <div className="donut-canvas-wrap">
                            <canvas ref={donutRef} />
                        </div>
                        <div className="donut-legend">
                            {!donutData.isEmpty ? (
                                donutData.categories.map((cat, idx) => (
                                    <div key={idx} className="donut-legend-item">
                                        <span className="legend-dot" style={{ backgroundColor: cat.color }} />
                                        <span className="legend-label">{cat.name}</span>
                                        <span className="legend-val">{cat.percent}</span>
                                    </div>
                                ))
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '16px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    <span style={{ fontSize: '20px', marginBottom: '4px' }}>📊</span>
                                    <span style={{ fontSize: '11.5px', fontWeight: '600', color: 'var(--text)' }}>No Expenses</span>
                                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Cleared to 0%</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 2. Monthly Expenses Bar */}
                <div className="chart-panel-card">
                    <div className="panel-card-title">Monthly Expenses</div>
                    <div className="chart-canvas-wrap">
                        <canvas ref={barRef} />
                    </div>
                    <div className="chart-sub-legend">
                        <span className="legend-dot" style={{ backgroundColor: '#059669' }} />
                        <span>{monthlyBarData.isEmpty ? 'No expenses recorded' : 'Expenses'}</span>
                    </div>
                </div>

                {/* 3. Balance Trend Line */}
                <div className="chart-panel-card">
                    <div className="panel-card-title">Balance Trend</div>
                    <div className="chart-canvas-wrap">
                        <canvas ref={lineRef} />
                    </div>
                    <div className="chart-sub-legend">
                        <span className="legend-dot" style={{ backgroundColor: '#059669' }} />
                        <span>{balanceTrendData.isEmpty ? '0 Balance' : 'Balance'}</span>
                    </div>
                </div>
            </div>
    );
}
