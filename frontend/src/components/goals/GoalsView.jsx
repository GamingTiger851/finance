import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useFinance } from '../../context/FinanceContext';
import { formatAmount } from '../../constants';

const GOAL_TEMPLATES = [
    {
        id: 't_emergency',
        title: 'Emergency Reserve Shield',
        category: 'Security',
        target: 300000,
        initial: 50000,
        monthsAhead: 12,
        color: '#10b981',
        icon: '🛡️',
        tag: 'Essential Priority',
        description: 'Build 3 to 6 months of living expenses in liquid deposits for security against shocks.'
    },
    {
        id: 't_debt',
        title: 'Debt Freedom Snowball',
        category: 'Personal',
        target: 150000,
        initial: 25000,
        monthsAhead: 8,
        color: '#ef4444',
        icon: '⚡',
        tag: 'High ROI',
        description: 'Pay down high-interest liabilities and credit lines to eliminate interest bleed.'
    },
    {
        id: 't_home',
        title: 'First Home Down Payment',
        category: 'Real Estate',
        target: 1500000,
        initial: 150000,
        monthsAhead: 36,
        color: '#14b8a6',
        icon: '🏠',
        tag: 'Wealth Milestone',
        description: 'Accumulate a 20% down payment buffer to secure tier-1 home loan interest rates.'
    },
    {
        id: 't_retirement',
        title: 'Retirement Freedom Corpus',
        category: 'Investment',
        target: 2500000,
        initial: 100000,
        monthsAhead: 60,
        color: '#3b82f6',
        icon: '📈',
        tag: 'Long-Term Compounding',
        description: 'Disciplined monthly mutual fund / equity SIP to build multi-year financial independence.'
    },
    {
        id: 't_tax',
        title: 'Section 80C Tax-Saving Fund',
        category: 'Investment',
        target: 150000,
        initial: 30000,
        monthsAhead: 6,
        color: '#8b5cf6',
        icon: '📑',
        tag: 'Annual Tax Shield',
        description: 'Systematically fund ELSS / PPF up to the 1.5 Lakh ceiling before fiscal year-end.'
    },
    {
        id: 't_pilgrimage',
        title: 'Hajj / Umrah Pilgrimage',
        category: 'Lifestyle',
        target: 400000,
        initial: 50000,
        monthsAhead: 18,
        color: '#06b6d4',
        icon: '🕋',
        tag: 'Spiritual Goal',
        description: 'Earmark blessed, dedicated savings for pilgrimage flights, visa, and accommodation.'
    }
];

function getFutureMonthYear(monthsAhead) {
    const d = new Date();
    d.setMonth(d.getMonth() + monthsAhead);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
}

export default function GoalsView() {
    const { userProfile } = useAuth();
    const { goals, addGoal, contributeToGoal, deleteGoal, clearAllGoals, showToast, showConfirm } = useFinance();
    const currency = userProfile.currency || 'INR';

    const [newTitle, setNewTitle] = useState('');
    const [newTarget, setNewTarget] = useState('');
    const [newInitial, setNewInitial] = useState('');
    const [newCategory, setNewCategory] = useState('Personal');
    const [newDate, setNewDate] = useState(getFutureMonthYear(12));
    const [newColor, setNewColor] = useState('#3b82f6');
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(true);
    const [contributionGoalId, setContributionGoalId] = useState(null);
    const [contributionAmount, setContributionAmount] = useState('');

    const handleAddContribution = (event, goalId) => {
        event.preventDefault();
        if (contributeToGoal(goalId, contributionAmount)) {
            setContributionGoalId(null);
            setContributionAmount('');
        }
    };

    // Calculate monthly savings feasibility
    const feasibility = useMemo(() => {
        const targetVal = parseFloat(newTarget) || 0;
        const initialVal = parseFloat(newInitial) || 0;
        const deficit = Math.max(0, targetVal - initialVal);

        if (!newDate || deficit <= 0) {
            return { months: 0, monthlyNeeded: 0 };
        }

        const [yStr, mStr] = newDate.split('-');
        const targetYear = parseInt(yStr, 10);
        const targetMonth = parseInt(mStr, 10) - 1;

        const now = new Date();
        const diffMonths = (targetYear - now.getFullYear()) * 12 + (targetMonth - now.getMonth());
        const months = Math.max(1, diffMonths);
        const monthlyNeeded = Math.round(deficit / months);

        return { months, monthlyNeeded };
    }, [newTarget, newInitial, newDate]);

    const handleApplyTemplate = (tpl) => {
        setNewTitle(tpl.title);
        setNewTarget(tpl.target.toString());
        setNewInitial(tpl.initial.toString());
        setNewCategory(tpl.category);
        setNewDate(getFutureMonthYear(tpl.monthsAhead));
        setNewColor(tpl.color);
        setIsAddOpen(true);
        showToast(`Template "${tpl.title}" loaded into creator!`);
    };

    const handleCreateGoal = (e) => {
        e.preventDefault();
        const targetVal = parseFloat(newTarget);
        const initialVal = parseFloat(newInitial) || 0;
        if (!newTitle.trim() || isNaN(targetVal) || targetVal <= 0) {
            showToast('Please enter a valid goal name and target amount.');
            return;
        }

        addGoal({
            title: newTitle.trim(),
            current: initialVal,
            target: targetVal,
            date: newDate,
            color: newColor || '#3b82f6',
            category: newCategory
        });

        setNewTitle('');
        setNewTarget('');
        setNewInitial('');
        setIsAddOpen(false);
    };

    return (
        <div id="goalsPage" className="page-view">
            {/* Header */}
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h1 className="page-title">Financial Goals &amp; Milestone Planner</h1>
                    <p className="page-subtitle">Formulate, track, and achieve life milestones with smart calculators and savings roadmaps.</p>
                </div>
                <div className="goals-header-actions" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setShowSuggestions(!showSuggestions)}
                        style={{ fontSize: '13px' }}
                    >
                        💡 {showSuggestions ? 'Hide Suggestions' : 'Show Suggestions'}
                    </button>
                    {goals && goals.length > 0 && (
                        <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ borderColor: 'rgba(239, 68, 68, 0.4)', color: '#ef4444' }}
                            onClick={() => {
                                showConfirm(
                                    'Clear All Goals',
                                    'Are you sure you want to clear all goals? All goal values and milestones will be reset.',
                                    () => clearAllGoals()
                                );
                            }}
                        >
                            🗑️ Clear All Goals
                        </button>
                    )}
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => {
                            setNewTitle('');
                            setNewTarget('');
                            setNewInitial('');
                            setNewDate(getFutureMonthYear(12));
                            setNewColor('#3b82f6');
                            setIsAddOpen(true);
                        }}
                    >
                        + Add Custom Goal
                    </button>
                </div>
            </div>

            {/* Smart Suggestions & Blueprint Templates */}
            {showSuggestions && (
                <div className="table-card" style={{ padding: '22px', marginTop: '20px', border: '1px solid rgba(59, 130, 246, 0.25)', background: 'linear-gradient(180deg, rgba(37, 99, 235, 0.04) 0%, rgba(15, 23, 42, 0.4) 100%)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                            <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#60a5fa' }}>
                                💡 Financial Architect Recommendations
                            </span>
                            <h3 style={{ fontSize: '17px', fontWeight: '700', color: 'var(--text-primary)', margin: '4px 0 0 0' }}>
                                Recommended Goal Blueprints &amp; Strategy
                            </h3>
                        </div>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            Click "Use Blueprint" to automatically configure targets &amp; timelines
                        </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
                        {GOAL_TEMPLATES.map(tpl => (
                            <div
                                key={tpl.id}
                                style={{
                                    background: 'var(--card-bg, #0f172a)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '10px',
                                    padding: '16px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    transition: 'transform 0.15s ease, border-color 0.15s ease'
                                }}
                            >
                                <div>
                                    <div className="goal-blueprint-header">
                                        <span className="goal-blueprint-icon" aria-hidden="true">{tpl.icon}</span>
                                        <div className="goal-blueprint-heading">
                                            <span className="goal-blueprint-title">{tpl.title}</span>
                                            <span className="goal-blueprint-tag" style={{ background: `${tpl.color}18`, color: tpl.color }}>
                                            {tpl.tag}
                                            </span>
                                        </div>
                                    </div>
                                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.45', margin: '0 0 12px 0' }}>
                                        {tpl.description}
                                    </p>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', marginBottom: '14px' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Suggested Target:</span>
                                        <strong style={{ color: tpl.color }}>{formatAmount(tpl.target, currency)}</strong>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => handleApplyTemplate(tpl)}
                                    style={{ width: '100%', fontSize: '12px', padding: '7px 12px', justifyContent: 'center' }}
                                >
                                    Use Blueprint ➔
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Modal for adding goal */}
            {isAddOpen && (
                <div className="modal-overlay" onClick={() => setIsAddOpen(false)}>
                    <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '490px' }}>
                        <div className="modal-header">
                            <h3>Configure Financial Goal</h3>
                            <button type="button" className="close-btn" onClick={() => setIsAddOpen(false)}>✕</button>
                        </div>
                        <form onSubmit={handleCreateGoal}>
                            <div className="form-group">
                                <label>Goal Title</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Emergency Fund, New Laptop, Home Down Payment"
                                    value={newTitle}
                                    onChange={e => setNewTitle(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Category</label>
                                <select
                                    value={newCategory}
                                    onChange={e => setNewCategory(e.target.value)}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                                >
                                    <option value="Security">Security &amp; Emergency</option>
                                    <option value="Personal">Personal &amp; Debt</option>
                                    <option value="Real Estate">Real Estate &amp; Home</option>
                                    <option value="Investment">Investment &amp; Retirement</option>
                                    <option value="Lifestyle">Lifestyle &amp; Pilgrimage</option>
                                    <option value="Gadgets">Gadgets &amp; Tech</option>
                                </select>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div className="form-group">
                                    <label>Target Amount ({currency})</label>
                                    <input
                                        type="number"
                                        placeholder="500000"
                                        value={newTarget}
                                        onChange={e => setNewTarget(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Already Saved ({currency})</label>
                                    <input
                                        type="number"
                                        placeholder="50000"
                                        value={newInitial}
                                        onChange={e => setNewInitial(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px' }}>
                                <div className="form-group">
                                    <label>Target Maturity Date</label>
                                    <input
                                        type="month"
                                        value={newDate}
                                        onChange={e => setNewDate(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Theme Color</label>
                                    <input
                                        type="color"
                                        value={newColor}
                                        onChange={e => setNewColor(e.target.value)}
                                        style={{ width: '100%', height: '40px', padding: '2px', borderRadius: '8px', cursor: 'pointer', background: 'transparent' }}
                                    />
                                </div>
                            </div>

                            {/* Live Monthly Savings Feasibility Callout */}
                            {feasibility.monthlyNeeded > 0 && (
                                <div style={{
                                    marginTop: '12px',
                                    padding: '14px',
                                    borderRadius: '8px',
                                    background: 'rgba(16, 185, 129, 0.08)',
                                    border: '1px solid rgba(16, 185, 129, 0.25)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <div>
                                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                            Required Monthly Allocation
                                        </div>
                                        <div style={{ fontSize: '18px', fontWeight: '800', color: '#10b981', marginTop: '2px' }}>
                                            {formatAmount(feasibility.monthlyNeeded, currency)} / month
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right', fontSize: '12px', color: 'var(--text-muted)' }}>
                                        <span>Horizon: <strong>{feasibility.months} Months</strong></span>
                                    </div>
                                </div>
                            )}

                            <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: '18px', height: '44px', fontWeight: '700' }}>
                                Save &amp; Activate Goal
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Goals Cards Grid or Empty State */}
            {(!goals || goals.length === 0) ? (
                <div className="table-card" style={{ padding: '48px 24px', textAlign: 'center', marginTop: '20px' }}>
                    <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(59, 130, 246, 0.12)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '26px',
                        margin: '0 auto 16px'
                    }}>
                        🎯
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-primary)' }}>
                        Goal Settings Ready &amp; Cleared
                    </h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '460px', margin: '0 auto 20px', lineHeight: 1.5 }}>
                        All previous mock values are cleared. Choose a recommended blueprint from above or click "+ Add Custom Goal" to start tracking tailored milestone achievements!
                    </p>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => {
                            setNewTitle('');
                            setNewTarget('');
                            setNewInitial('');
                            setNewDate(getFutureMonthYear(12));
                            setIsAddOpen(true);
                        }}
                    >
                        + Create Your First Goal
                    </button>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '18px', marginTop: '20px' }}>
                    {goals.map(g => {
                        const targetAmt = Number(g.target) || 1;
                        const currentAmt = Number(g.current) || 0;
                        const percent = Math.min(100, Math.round((currentAmt / targetAmt) * 100));
                        const themeColor = g.color || '#3b82f6';

                        return (
                            <div key={g.id} className="table-card" style={{ padding: '22px', position: 'relative' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                    <span className="category-pill-subtle">{g.category || 'Personal'}</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Target: {g.date}</span>
                                        <button
                                            type="button"
                                            title="Delete Goal"
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: '#ef4444',
                                                cursor: 'pointer',
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                fontSize: '14px',
                                                opacity: 0.8
                                            }}
                                            onClick={() => {
                                                showConfirm(
                                                    'Delete Goal',
                                                    `Are you sure you want to delete "${g.title}"?`,
                                                    () => deleteGoal(g.id)
                                                );
                                            }}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </div>
                                <div style={{ fontSize: '17px', fontWeight: '700', color: 'var(--text)', lineHeight: 1.4, overflowWrap: 'anywhere', marginBottom: '8px' }}>
                                    {g.title}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                                    <span>Saved: <strong style={{ color: 'var(--text)' }}>{formatAmount(currentAmt, currency)}</strong></span>
                                    <span>Target: <strong style={{ color: 'var(--text)' }}>{formatAmount(targetAmt, currency)}</strong></span>
                                </div>
                                <div className="goal-progress-track" style={{ height: '8px', marginBottom: '10px' }}>
                                    <div
                                        className="goal-progress-fill"
                                        style={{ width: `${percent}%`, backgroundColor: themeColor }}
                                    />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                                    <span style={{ fontWeight: '700', color: themeColor }}>{percent}% Completed</span>
                                    <span style={{ color: 'var(--text-muted)' }}>
                                        Remaining: {formatAmount(Math.max(0, targetAmt - currentAmt), currency)}
                                    </span>
                                </div>
                                <div style={{ marginTop: '14px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                                    {contributionGoalId === g.id ? (
                                        <form onSubmit={event => handleAddContribution(event, g.id)} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <input
                                                type="number"
                                                min="0.01"
                                                step="0.01"
                                                required
                                                autoFocus
                                                aria-label={`Contribution amount for ${g.title}`}
                                                placeholder={`Amount (${currency})`}
                                                value={contributionAmount}
                                                onChange={event => setContributionAmount(event.target.value)}
                                                style={{ minWidth: 0, flex: 1, padding: '8px 10px' }}
                                            />
                                            <button type="submit" className="btn btn-primary btn-sm" style={{ whiteSpace: 'nowrap' }}>Save</button>
                                            <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setContributionGoalId(null); setContributionAmount(''); }}>Cancel</button>
                                        </form>
                                    ) : (
                                        <button
                                            type="button"
                                            className="btn btn-secondary btn-sm"
                                            aria-label={`Add money to ${g.title}`}
                                            onClick={() => { setContributionGoalId(g.id); setContributionAmount(''); }}
                                            style={{ color: 'var(--accent)', borderColor: 'var(--accent)', fontWeight: 700 }}
                                        >
                                            + Add money
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
