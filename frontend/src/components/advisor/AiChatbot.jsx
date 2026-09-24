import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useFinance } from '../../context/FinanceContext';
import { formatAmount } from '../../constants';
import { getAuthHeaders } from '../../services/authToken';

const QUICK_PROMPTS = [
    'How can I reduce my expenses?',
    'Analyze my monthly spending by category',
    'How much did I save this month?',
    'Create a simple monthly budget for me',
    'How can I build an emergency fund?',
    'Which recurring bills could I review?',
    'How much should I save each month?',
    'Explain SIP investing in simple terms',
    'What should I know before taking a loan?',
    'How can I reach my savings goal faster?',
    'What is the difference between income and cash flow?',
    'Explain investment risk and diversification'
];

export default function AiChatbot() {
    const { userProfile, currentUser } = useAuth();
    const { transactions, calculateTotals } = useFinance();
    const currency = userProfile.currency || 'USD';
    const userName = userProfile.fullName || currentUser || 'Friend';

    const [messages, setMessages] = useState([
        {
            id: 'init-1',
            sender: 'bot',
            time: 'Just now',
            text: `Hello ${userName}! 👋 I'm your AI Financial Assistant. Ask me anything about budgeting, investing, loans, or financial planning.`
        }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [geminiConfigured, setGeminiConfigured] = useState(false);
    const chatBodyRef = useRef(null);

    useEffect(() => {
        let active = true;
        fetch('/api/ai/status', { headers: getAuthHeaders() })
            .then(response => response.ok ? response.json() : { configured: false })
            .then(data => { if (active) setGeminiConfigured(Boolean(data.configured)); })
            .catch(() => { if (active) setGeminiConfigured(false); });
        return () => { active = false; };
    }, []);

    const scrollToBottom = () => {
        const body = chatBodyRef.current;
        if (body) body.scrollTo({ top: body.scrollHeight, behavior: 'smooth' });
    };

    useEffect(() => {
        const body = chatBodyRef.current;
        if (!body) return;

        // Keep the one-message welcome/reset state pinned to the top. Calling
        // scrollIntoView here used to scroll the page as well as the chat pane,
        // leaving the greeting tucked underneath the header.
        if (messages.length <= 1 && !isTyping) {
            body.scrollTop = 0;
            return;
        }
        scrollToBottom();
    }, [messages, isTyping]);

    // Financial intelligence engine with context grounding
    const generateAiResponse = async (query, history = []) => {
        const lower = query.toLowerCase().trim();
        const totals = calculateTotals();
        const now = new Date();
        const monthTransactions = transactions.filter(transaction => {
            const date = new Date(transaction.date);
            return !Number.isNaN(date.getTime()) && date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
        });
        const monthIncome = monthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount || 0), 0);
        const monthExpenses = monthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount || 0), 0);
        const monthBalance = monthIncome - monthExpenses;
        const savingsRate = monthIncome > 0 ? ((monthBalance / monthIncome) * 100).toFixed(1) : '0';

        // Compute category breakdown from actual transactions
        const categoryMap = {};
        monthTransactions.filter(t => t.type === 'expense').forEach(t => {
            categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
        });
        const topCategories = Object.entries(categoryMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);

        try {
            const res = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                body: JSON.stringify({
                    question: query,
                    history: history.slice(-8),
                    context: {
                        currency,
                        income: totals.income,
                        expenses: totals.expense,
                        balance: totals.balance,
                        savingsRate: Number(savingsRate),
                        period: now.toLocaleString(undefined, { month: 'long', year: 'numeric' }),
                        periodIncome: monthIncome,
                        periodExpenses: monthExpenses,
                        periodBalance: monthBalance,
                        topCategories: topCategories.map(([name, amount]) => ({ name, amount })),
                    },
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data.text) return data.text;
            console.warn('Gemini assistant unavailable; using the built-in finance responses:', data.error || res.status);
        } catch (error) {
            console.warn('Gemini assistant request failed; using the built-in finance responses:', error.message);
        }

        // Domain-specific intelligent financial responses
        if (lower.includes('reduce') && (lower.includes('expense') || lower.includes('spend'))) {
            let catSummary = topCategories.length
                ? `Your top spending categories are:\n${topCategories.map(([cat, amt]) => `• **${cat}**: ${formatAmount(amt, currency)}`).join('\n')}\n\n`
                : '';

            return `Here is a personalized expense reduction strategy for you, **${userName}**:\n\n` +
                catSummary +
                `💡 **Actionable Recommendations**:\n` +
                `1. **Apply the 50/30/20 Rule**: Aim for 50% Needs, 30% Wants, and 20% Savings. Right now your savings rate is **${savingsRate}%**.\n` +
                `2. **Audit Subscriptions**: Cancel streaming or app services not used in the past 30 days.\n` +
                `3. **Micro-Expense Buffer**: Set a weekly discretionary cash cap for dining out and impulse shopping.\n` +
                `4. **Smart Automation**: Automate transfers of at least 15% of income to your savings account on the day you receive it!`;
        }

        if (lower.includes('sip') || lower.includes('systematic investment')) {
            return `**SIP (Systematic Investment Plan)** means investing a fixed amount at regular intervals, often monthly. 📈\n\n` +
                `• **What it is**: Instead of investing a large lump sum at once, you invest a fixed amount regularly (e.g., $100 or ₹2,000 every month).\n` +
                `• Your regular contribution buys more units when prices are lower and fewer when they are higher; this does not prevent investment losses.\n` +
                `• Returns are uncertain and are not guaranteed. The outcome depends on contribution, fees, investment choice, and market performance. Use the Investment Planner to compare assumptions, not as a promise of results.`;
        }

        if (lower.includes('halal') || lower.includes('shariah') || lower.includes('islamic')) {
            return `Shariah-compliant investing usually screens both a company's business activities and financial ratios, but the exact rules and thresholds vary by standard and may change.\n\n` +
                `I can't verify a stock's current status without up-to-date company data and the screening standard you follow. Check a current Shariah screening service or qualified scholar, and review any purification guidance before investing.`;
        }

        if (lower.includes('loan') || lower.includes('borrow') || lower.includes('credit')) {
            return `**Loan Eligibility Assessment for ${userName}** 💳\n\n` +
                `I can't estimate an approval amount from the transaction totals alone. Lenders also consider your country, verified monthly income, existing debt payments, credit history, loan term, and interest rate.\n\n` +
                `Share your monthly take-home income, current monthly debt payments, requested term, and expected rate, and I can calculate an illustrative payment. A lender makes the actual approval decision.`;
        }

        if (lower.includes('analyze') || lower.includes('budget') || lower.includes('habit') || lower.includes('financial status') || lower.includes('this month') || lower.includes('monthly spending') || lower.includes('how much did i save')) {
            return `📊 **Your Financial Snapshot**:\n\n` +
                `• **${now.toLocaleString(undefined, { month: 'long', year: 'numeric' })} income recorded**: ${formatAmount(monthIncome, currency)}\n` +
                `• **Expenses recorded**: ${formatAmount(monthExpenses, currency)}\n` +
                `• **Net for the month**: ${formatAmount(monthBalance, currency)}\n` +
                (topCategories.length ? `• **Top expense categories this month**: ${topCategories.map(([cat, amt]) => `${cat} (${formatAmount(amt, currency)})`).join(', ')}\n` : '') +
                `• **Savings rate**: ${monthIncome > 0 ? `${savingsRate}%` : 'not available because no income is recorded for this month'}\n\n` +
                (Number(savingsRate) >= 20
                    ? `🌟 *Outstanding job! Your savings rate is above the recommended 20% baseline.*`
                    : `⚠️ *Consider trimming discretionary expenses to push your savings rate to at least 20%.*`);
        }

        // General smart finance fallback
        return `Here are some key financial insights regarding **"${query}"**:\n\n` +
            `• **Prudent Capital Allocation**: Always maintain a 3 to 6-month liquid emergency fund before taking aggressive equity risks.\n` +
            `• **Diversification**: Spread allocations across broad index funds, defensive assets, and fixed income to dampen drawdown shocks.\n` +
            `• **Inflation Hedging**: High-quality equities, dividend growers, and real assets have historically outpaced inflation over 5+ year horizons.\n\n` +
            `Would you like me to analyze your specific budget, calculate a loan payment, or evaluate an investment strategy?`;
    };

    const handleSend = async (textToSend) => {
        const query = (textToSend || inputValue).trim();
        if (!query) return;

        // Check if user specifically requests a reset
        const lowerQ = query.toLowerCase();
        if (lowerQ === 'reset' || lowerQ === 'reset chat' || lowerQ === 'clear' || lowerQ === 'clear chat' || lowerQ === 'restart') {
            setInputValue('');
            handleClearChat();
            return;
        }

        const userMsg = {
            id: 'msg-' + Date.now(),
            sender: 'user',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            text: query
        };

        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsTyping(true);

        const history = messages
            .filter(message => !String(message.id).startsWith('init'))
            .slice(-8)
            .map(message => ({ role: message.sender === 'user' ? 'user' : 'model', text: message.text }));
        const replyText = await generateAiResponse(query, history);
        const botMsg = {
            id: 'bot-' + Date.now(),
            sender: 'bot',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            text: replyText
        };
        setMessages(prev => [...prev, botMsg]);
        setIsTyping(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleClearChat = () => {
        setMessages([
            {
                id: 'init-fresh',
                sender: 'bot',
                time: 'Just now',
                text: `Chat cleared. Hello ${userName}! How can I assist with your finances today?`
            }
        ]);
    };

    return (
        <div className="ai-chatbot-card">
            {/* Header */}
            <div className="ai-chat-header">
                <div className="ai-chat-brand">
                    <div className="ai-chat-avatar" style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: '#090D16',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        padding: '3px',
                        flexShrink: 0,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                        border: '1px solid #E2E8F0'
                    }}>
                        <img src="/logo.png" alt="HAWKS AI" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: '#0F172A' }}>AI Financial Assistant</h3>
                            <span className="badge" style={{ background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', padding: '2px 8px', fontSize: '11px', fontWeight: '600', borderRadius: '6px' }}>
                                Beta
                            </span>
                            <span className="badge" title={geminiConfigured ? 'Gemini is configured on the server' : 'Configure GEMINI_API_KEY in the server .env to enable Gemini'} style={{ background: geminiConfigured ? '#ECFDF5' : '#F1F5F9', color: geminiConfigured ? '#047857' : '#64748B', border: `1px solid ${geminiConfigured ? '#A7F3D0' : '#CBD5E1'}`, padding: '2px 8px', fontSize: '11px', fontWeight: '600', borderRadius: '6px' }}>
                                {geminiConfigured ? 'Gemini enabled' : 'Local fallback'}
                            </span>
                        </div>
                        <span style={{ fontSize: '12px', color: '#64748B' }}>
                            Personalized intelligent financial advisor
                        </span>
                    </div>
                </div>

                <button
                    className="btn btn-sm"
                    onClick={handleClearChat}
                    title="Reset Conversation"
                    style={{
                        background: '#F1F5F9',
                        border: '1px solid #CBD5E1',
                        color: '#334155',
                        borderRadius: '8px',
                        padding: '6px 14px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease'
                    }}
                >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                        <path d="M3 3v5h5" />
                    </svg>
                    Reset Chat
                </button>
            </div>

            {/* Messages Body */}
            <div className="ai-chat-body" ref={chatBodyRef}>
                {messages.map((msg) => (
                    <div key={msg.id} className={`ai-chat-msg ${msg.sender}`}>
                        {msg.sender === 'bot' && (
                            <div className="bot-bubble-avatar" style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '8px',
                                background: '#090D16',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                                padding: '2px',
                                flexShrink: 0
                            }}>
                                <img src="/logo.png" alt="HAWKS" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
                            </div>
                        )}
                        <div className="ai-bubble-content">
                            <div className="ai-bubble-text">
                                {msg.text.split('\n').map((line, idx) => (
                                    <p key={idx} style={{ margin: line === '' ? '6px 0' : '2px 0' }}>
                                        {line}
                                    </p>
                                ))}
                            </div>
                            <span className="ai-msg-time">{msg.time}</span>
                        </div>
                    </div>
                ))}

                {isTyping && (
                    <div className="ai-chat-msg bot">
                        <div className="bot-bubble-avatar" style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '8px',
                            background: '#090D16',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            padding: '2px',
                            flexShrink: 0
                        }}>
                            <img src="/logo.png" alt="HAWKS" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
                        </div>
                        <div className="ai-typing-indicator">
                            <span />
                            <span />
                            <span />
                        </div>
                    </div>
                )}
            </div>

            {/* Quick Prompts Bar */}
            <div className="ai-quick-prompts">
                <span style={{ fontSize: '11px', color: '#64748B', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Suggested Prompts:
                </span>
                <div className="prompts-list">
                    <button
                        type="button"
                        className="ai-prompt-pill"
                        onClick={handleClearChat}
                        style={{ border: '1px dashed #CBD5E1', color: '#64748B', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                        title="Reset conversation"
                    >
                        ↺ Reset Chat
                    </button>
                    {QUICK_PROMPTS.map((prompt) => (
                        <button
                            key={prompt}
                            className="ai-prompt-pill"
                            onClick={() => handleSend(prompt)}
                        >
                            {prompt}
                        </button>
                    ))}
                </div>
            </div>

            {/* Input Footer */}
            <div className="ai-chat-footer">
                <input
                    type="text"
                    className="ai-chat-input"
                    placeholder="Type your financial question (e.g. How can I invest $500?)..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                <button
                    className="ai-send-btn"
                    onClick={() => handleSend()}
                    disabled={!inputValue.trim() || isTyping}
                    aria-label="Send Message"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
