import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../constants';

export default function FinanceChart() {
    const { transactions } = useFinance();
    const { darkMode } = useAuth();
    const canvasRef = useRef(null);
    const chartInstanceRef = useRef(null);

    useEffect(() => {
        if (!canvasRef.current) return;

        // Group transactions by date
        const byDate = new Map();
        transactions.forEach(t => {
            if (!byDate.has(t.date)) byDate.set(t.date, { income: 0, expense: 0 });
            byDate.get(t.date)[t.type] += t.amount;
        });

        const sorted = [...byDate.entries()].sort((a, b) => new Date(a[0]) - new Date(b[0]));
        const labels = sorted.map(([date]) => formatDate(date));
        const incomeData = sorted.map(([, totals]) => totals.income);
        const expenseData = sorted.map(([, totals]) => totals.expense);

        const textColor = darkMode ? '#e2e8f0' : '#1e2130';
        const gridColor = darkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';

        if (chartInstanceRef.current) {
            chartInstanceRef.current.destroy();
        }

        const ctx = canvasRef.current.getContext('2d');
        chartInstanceRef.current = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels.length ? labels : ['No data'],
                datasets: [
                    {
                        label: 'Income',
                        data: incomeData.length ? incomeData : [0],
                        backgroundColor: '#16a34a',
                        borderRadius: 4
                    },
                    {
                        label: 'Expenses',
                        data: expenseData.length ? expenseData : [0],
                        backgroundColor: '#dc2626',
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: textColor,
                            font: { family: 'Inter', size: 12 }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: textColor, font: { family: 'Inter' } },
                        grid: { color: gridColor }
                    },
                    y: {
                        ticks: { color: textColor, font: { family: 'Inter' } },
                        grid: { color: gridColor }
                    }
                }
            }
        });

        return () => {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
            }
        };
    }, [transactions, darkMode]);

    return (
        <div className="chart-card">
            <div className="chart-header">
                <h3>Cash Flow Analytics</h3>
                <span className="badge">Daily In vs Out</span>
            </div>
            <div className="chart-wrap" style={{ position: 'relative', height: '240px', width: '100%' }}>
                <canvas ref={canvasRef} />
            </div>
        </div>
    );
}
