import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';
import { getAuthHeaders } from '../../services/authToken';
import { formatAmount } from '../../constants';

export default function DashboardRightRail({ onNavigate }) {
    const { transactions, calculateTotals } = useFinance();
    const { userProfile } = useAuth();
    const [inputPrompt, setInputPrompt] = useState('');
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            text: "Hello! I'm your AI financial assistant. Ask me anything about budgeting, investing, loans, or financial planning."
        }
    ]);
    const [isTyping, setIsTyping] = useState(false);

    const quickPills = [
        'How can I reduce my expenses?',
        'Explain SIP in simple terms',
        'Which stocks are halal?',
        'How much loan can I get?'
    ];

    const handleSendMessage = async (queryText) => {
        const text = (queryText || inputPrompt).trim();
        if (!text) return;

        // Add user message
        const newMsgs = [...messages, { role: 'user', text }];
        setMessages(newMsgs);
        setInputPrompt('');
        setIsTyping(true);

        const totals = calculateTotals();
        const currency = userProfile?.currency || 'INR';
        const categoryTotals = {};
        transactions.filter(transaction => transaction.type === 'expense').forEach(transaction => {
            const category = transaction.category || 'Other';
            categoryTotals[category] = (categoryTotals[category] || 0) + (Number(transaction.amount) || 0);
        });
        const topCategories = Object.entries(categoryTotals)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([name, amount]) => ({ name, amount }));

        let reply = '';

        try {
            const res = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                body: JSON.stringify({
                    question: text,
                    history: newMsgs.slice(-8).map(message => ({
                        role: message.role === 'user' ? 'user' : 'model',
                        text: message.text,
                    })),
                    context: {
                        currency,
                        income: totals.income,
                        expenses: totals.expense,
                        balance: totals.balance,
                        topCategories,
                    },
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data.text) reply = data.text;
            else console.warn('Gemini assistant unavailable; using the built-in finance responses:', data.error || res.status);
        } catch (error) {
            console.warn('Gemini assistant request failed; using the built-in finance responses:', error.message);
        }

        if (!reply) {
            const lower = text.toLowerCase();
            if (lower.includes('reduce') || lower.includes('expense') || lower.includes('cut')) {
                const categoryNote = topCategories.length
                    ? `Your largest recorded expense category is ${topCategories[0].name} (${formatAmount(topCategories[0].amount, currency)}). `
                    : 'You have no recorded expense categories yet. ';
                reply = `You've recorded ${formatAmount(totals.expense, currency)} in expenses. ${categoryNote}Review recent transactions to choose a realistic place to reduce spending.`;
            } else if (lower.includes('sip') || lower.includes('invest')) {
                reply = "A SIP (Systematic Investment Plan) lets you invest small amounts (e.g. ₹1,000/mo) in mutual funds automatically, benefiting from compounding and rupee cost averaging.";
            } else if (lower.includes('halal') || lower.includes('shariah')) {
                reply = "Halal equities screen for zero alcohol/gambling revenue, low debt ratios (<33% of market cap), and compliant cash receivables. Visit the Halal Screen tab for details.";
            } else if (lower.includes('loan')) {
                reply = totals.income > 0
                    ? `Your recorded income is ${formatAmount(totals.income, currency)}. A rough 40% EMI-to-income guideline would be ${formatAmount(totals.income * 0.4, currency)} per month before considering other debts, lender rules, or credit history. This is only an estimate, not an approval.`
                    : 'I do not have any income recorded yet, so I cannot estimate an EMI range. Add your income and existing monthly debt payments, then try again.';
            } else {
                reply = `Your recorded net balance is ${formatAmount(totals.balance, currency)}. I can help with budgeting, savings, SIP basics, or loan estimates based on your recorded transactions.`;
            }
        }

        setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
        setIsTyping(false);
    };

    return (
        <aside className="dashboard-right-rail">
            {/* 1. News & Market Insights Card */}
            <div className="rail-card news-insights-card">
                <div className="rail-card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="rail-icon-square" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
                            📰
                        </span>
                        <h3 className="rail-title">News &amp; Insights</h3>
                    </div>
                    <span className="live-dot-badge">Today</span>
                </div>

                <div className="news-items-list">
                    <div className="news-bullet">
                        <div className="news-headline">
                            Retail inflation drops to 3.6%, market sentiment rallies
                        </div>
                        <div className="news-meta">Consumer Price Index • 2h ago</div>
                    </div>
                    <div className="news-bullet">
                        <div className="news-headline">
                            RBI maintains repo rate; favorable window for Fixed Deposits
                        </div>
                        <div className="news-meta">Monetary Policy • 4h ago</div>
                    </div>
                </div>
            </div>

            {/* 2. Embedded AI Financial Assistant (Beta) */}
            <div className="rail-card ai-assistant-widget">
                <div className="rail-card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="rail-icon-square" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
                            🤖
                        </span>
                        <h3 className="rail-title">AI Financial Assistant</h3>
                    </div>
                    <span className="beta-badge">Beta</span>
                </div>

                {/* Chat Stream */}
                <div className="ai-widget-chat-stream">
                    {messages.map((m, i) => (
                        <div key={i} className={`ai-mini-msg ${m.role}`}>
                            {m.role === 'assistant' && (
                                <div className="ai-mini-avatar">🤖</div>
                            )}
                            <div className="ai-mini-bubble">
                                {m.text}
                            </div>
                        </div>
                    ))}
                    {isTyping && (
                        <div className="ai-mini-msg assistant">
                            <div className="ai-mini-avatar">🤖</div>
                            <div className="ai-mini-bubble ai-mini-typing">
                                <span/><span/><span/>
                            </div>
                        </div>
                    )}
                </div>

                {/* Quick Prompts */}
                <div className="ai-widget-pills">
                    {quickPills.map((pill, idx) => (
                        <button
                            key={idx}
                            type="button"
                            className="ai-widget-pill-btn"
                            onClick={() => handleSendMessage(pill)}
                        >
                            {pill}
                        </button>
                    ))}
                </div>

                {/* Input Bar */}
                <form
                    className="ai-widget-input-row"
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSendMessage();
                    }}
                >
                    <input
                        type="text"
                        placeholder="Type your question..."
                        value={inputPrompt}
                        onChange={(e) => setInputPrompt(e.target.value)}
                        className="ai-widget-input"
                    />
                    <button
                        type="submit"
                        className="ai-widget-send-btn"
                        disabled={!inputPrompt.trim()}
                        title="Send"
                    >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="22" y1="2" x2="11" y2="13"/>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                        </svg>
                    </button>
                </form>
            </div>

            {/* 3. Live Market Data Ticker */}
            <div className="rail-card live-market-widget">
                <div className="rail-card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="rail-icon-square" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                            📈
                        </span>
                        <h3 className="rail-title">Live Market Data</h3>
                    </div>
                    <span className="pulse-live-badge">
                        <span className="pulse-green-dot" /> Live
                    </span>
                </div>

                <div className="market-indices-row">
                    <div className="index-block">
                        <div className="index-name">NIFTY 50</div>
                        <div className="index-value">25,216.05</div>
                        <div className="index-change up">
                            ↑ 1.24%
                        </div>
                    </div>
                    <div className="index-block">
                        <div className="index-name">SENSEX</div>
                        <div className="index-value">82,432.17</div>
                        <div className="index-change up">
                            ↑ 1.18%
                        </div>
                    </div>
                </div>

                <button
                    type="button"
                    className="view-market-link"
                    onClick={() => onNavigate('stocks')}
                >
                    <span>Explore All Stocks</span>
                    <span>→</span>
                </button>
            </div>
        </aside>
    );
}
