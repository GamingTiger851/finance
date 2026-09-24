import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useFinance } from '../../context/FinanceContext';
import { formatAmount } from '../../constants';
import { getAuthHeaders } from '../../services/authToken';

const QUICK_PROMPTS = [
    'How can I reduce my expenses?',
    'Explain SIP in simple terms',
    'Which stocks are halal?',
    'How much loan can I get?',
    'Analyze my current spending habits'
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
    const messagesEndRef = useRef(null);

    useEffect(() => {
        let active = true;
        fetch('/api/ai/status', { headers: getAuthHeaders() })
            .then(response => response.ok ? response.json() : { configured: false })
            .then(data => { if (active) setGeminiConfigured(Boolean(data.configured)); })
            .catch(() => { if (active) setGeminiConfigured(false); });
        return () => { active = false; };
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    // Financial intelligence engine with context grounding
    const generateAiResponse = async (query, history = []) => {
        const lower = query.toLowerCase().trim();
        const totals = calculateTotals();
        const savingsRate = totals.income > 0 ? ((totals.balance / totals.income) * 100).toFixed(1) : '0';

        // Compute category breakdown from actual transactions
        const categoryMap = {};
        transactions.filter(t => t.type === 'expense').forEach(t => {
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
            return `**SIP (Systematic Investment Plan)** is one of the most effective ways to build long-term wealth! 📈\n\n` +
                `• **What it is**: Instead of investing a large lump sum at once, you invest a fixed amount regularly (e.g., $100 or ₹2,000 every month).\n` +
                `• **Rupee/Dollar Cost Averaging**: When markets fall, your fixed amount buys more units. When markets rise, your portfolio appreciates.\n` +
                `• **Compounding Power**: An investment of $200/month at a 12% expected annual return grows to over **$20,000 in 5 years** and **$60,000 in 10 years**!\n\n` +
                `👉 *Tip: Head to our **Investment Planner** tab right here to calculate your optimal allocation across equities and funds.*`;
        }

        if (lower.includes('halal') || lower.includes('shariah') || lower.includes('islamic')) {
            return `**Halal Stock & Investment Guidelines** 🕌\n\n` +
                `To qualify as Shariah-compliant under **AAOIFI** and **MSCI Islamic** standards, a company must pass two essential screens:\n\n` +
                `1. **Business Activity Screen**: The company must NOT operate in restricted sectors (conventional banking/interest, alcohol, gambling, adult entertainment, tobacco, defense).\n` +
                `2. **Financial Ratio Screen**:\n` +
                `   • Total Debt / Market Cap: **< 30%** (or 33.3% for MSCI)\n` +
                `   • Interest-Bearing Cash & Securities: **< 30%**\n` +
                `   • Non-Permissible Revenue: **< 5%**\n\n` +
                `🔍 *Tip: You can use our interactive **Halal Screen** tab on the left sidebar to audit any stock symbol with detailed purification calculations!*`;
        }

        if (lower.includes('loan') || lower.includes('borrow') || lower.includes('credit')) {
            const maxPayment = totals.income > 0 ? totals.income * 0.4 : 2000;
            return `**Loan Eligibility Assessment for ${userName}** 💳\n\n` +
                `Based on your recorded monthly income of **${formatAmount(totals.income, currency)}**:\n\n` +
                `• **40% Debt-to-Income (DTI) Guideline**: Financial institutions generally recommend that your total monthly loan EMIs do not exceed **${formatAmount(maxPayment, currency)}**.\n` +
                `• **Credit Score Requirements**: A score of **720+** secures the best interest rates, while 650–719 is considered fair.\n` +
                `• **Key Factors**: Stable employment tenure (2+ years), manageable credit utilization (< 30%), and collateral value.\n\n` +
                `👉 *Test exact amounts and collateral coverage using the **Loan Assessment** tab above!*`;
        }

        if (lower.includes('analyze') || lower.includes('budget') || lower.includes('habit') || lower.includes('financial status')) {
            return `📊 **Your Financial Snapshot**:\n\n` +
                `• **Total Balance**: ${formatAmount(totals.balance, currency)}\n` +
                `• **Total Inflow (Income)**: ${formatAmount(totals.income, currency)}\n` +
                `• **Total Outflow (Expense)**: ${formatAmount(totals.expense, currency)}\n` +
                `• **Net Savings Rate**: **${savingsRate}%**\n\n` +
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
            <div className="ai-chat-body">
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
                <div ref={messagesEndRef} />
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
