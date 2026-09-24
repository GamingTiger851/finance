import React, { useState } from 'react';
import AiChatbot from './AiChatbot';
import { formatAmount } from '../../constants';
import { useAuth } from '../../context/AuthContext';

export default function AdvisorView() {
    const { userProfile } = useAuth();
    const currency = userProfile.currency || 'USD';
    const [activeTab, setActiveTab] = useState('chatbot');

    // Investment inputs
    const [investIncome, setInvestIncome] = useState(6000);
    const [investSavings, setInvestSavings] = useState(1500);
    const [investInvestable, setInvestInvestable] = useState(25000);
    const [investHorizon, setInvestHorizon] = useState(7);
    const [investGoal, setInvestGoal] = useState('growth');
    const [investTolerance, setInvestTolerance] = useState('moderate');
    const [investResult, setInvestResult] = useState(null);

    // Loan inputs
    const [loanAmount, setLoanAmount] = useState(25000);
    const [loanIncome, setLoanIncome] = useState(5500);
    const [loanDebt, setLoanDebt] = useState(800);
    const [loanScore, setLoanScore] = useState(740);
    const [loanEmployment, setLoanEmployment] = useState(4);
    const [loanCollateral, setLoanCollateral] = useState(30000);
    const [loanTerm, setLoanTerm] = useState(5);
    const [loanResult, setLoanResult] = useState(null);

    // Risk inputs
    const [riskStocks, setRiskStocks] = useState(50);
    const [riskBonds, setRiskBonds] = useState(30);
    const [riskFunds, setRiskFunds] = useState(15);
    const [riskAlts, setRiskAlts] = useState(5);
    const [riskHolding, setRiskHolding] = useState(18);
    const [riskHorizon, setRiskHorizon] = useState('medium');
    const [riskResult, setRiskResult] = useState(null);

    // Handlers
    const runInvestmentAssessment = () => {
        const savingsRate = investIncome > 0 ? investSavings / investIncome : 0;
        const emergencyMonths = investIncome > 0 ? investInvestable / investIncome : 0;
        const riskBase = { conservative: 0, moderate: 15, aggressive: 30 }[investTolerance];
        const horizonBoost = investHorizon >= 10 ? 10 : investHorizon >= 5 ? 5 : 0;
        const score = Math.min(100, Math.max(0, 45 + riskBase + horizonBoost + (savingsRate >= 0.2 ? 5 : -5)));
        const equity = Math.round(Math.min(75, Math.max(20, score)));
        const bonds = Math.round((100 - equity) * 0.5);
        const funds = Math.round((100 - equity) * 0.35);
        const alternatives = 100 - equity - bonds - funds;

        setInvestResult({
            recommendation: `${equity}% Diversified Stocks, ${bonds}% Bonds, ${funds}% ETFs, ${alternatives}% Cash/Alternatives.`,
            metrics: [
                { label: 'Suitability Score', value: `${score}/100`, exp: `Based on ${investTolerance} risk tolerance and ${investHorizon}-year horizon.` },
                { label: 'Emergency Reserve', value: `${emergencyMonths.toFixed(1)} months`, exp: emergencyMonths >= 3 ? 'Adequate reserve ready.' : 'Priority: build 3-6 months buffer first.' },
                { label: 'Savings Rate', value: `${(savingsRate * 100).toFixed(0)}%`, exp: savingsRate >= 0.2 ? 'Strong savings discipline.' : 'Target 20% or higher.' },
                { label: 'Target Ratio', value: `${equity}/${bonds}/${funds}/${alternatives}`, exp: 'Stocks / Bonds / ETFs / Cash' }
            ]
        });
    };

    const runLoanAssessment = () => {
        const dti = loanIncome > 0 ? loanDebt / loanIncome : 1;
        const estimatedPayment = loanAmount > 0 ? (loanAmount / (loanTerm * 12)) * 1.12 : 0;
        const postLoanDti = loanIncome > 0 ? (loanDebt + estimatedPayment) / loanIncome : 1;
        const factors = [
            loanScore >= 720,
            postLoanDti <= 0.4,
            loanEmployment >= 2,
            loanAmount > 0 && loanCollateral >= loanAmount
        ];
        const passed = factors.filter(Boolean).length;
        const decision = passed === 4 ? 'Eligible' : passed >= 2 ? 'Conditional Approval' : 'Not Eligible';

        setLoanResult({
            decision,
            explanation: `Projected DTI ${(postLoanDti * 100).toFixed(1)}%, credit score ${loanScore}, employment tenure ${loanEmployment} yrs, collateral coverage ${(loanAmount ? (loanCollateral / loanAmount) * 100 : 0).toFixed(0)}%.`,
            metrics: [
                { label: 'Debt-to-Income', value: `${(postLoanDti * 100).toFixed(1)}%`, exp: `Projected payment: ${formatAmount(estimatedPayment, currency)}. Target <= 40%.` },
                { label: 'Credit Tier', value: `${loanScore} · ${loanScore >= 720 ? 'Strong' : loanScore >= 620 ? 'Review' : 'Weak'}`, exp: 'Bureau credit verification required.' },
                { label: 'Affordability', value: `${passed}/4 passed`, exp: 'Score, DTI, tenure, and collateral weighted.' }
            ]
        });
    };

    const runRiskAssessment = () => {
        const total = riskStocks + riskBonds + riskFunds + riskAlts;
        const volatility = total ? (riskStocks * 0.22 + riskBonds * 0.06 + riskFunds * 0.16 + riskAlts * 0.12) / total * 100 : 0;
        const var95 = volatility * 1.65;
        const concentration = riskHolding > 25 ? 'High' : riskHolding > 15 ? 'Moderate' : 'Low';
        const riskScore = Math.min(100, Math.round(volatility * 2 + (concentration === 'High' ? 20 : concentration === 'Moderate' ? 10 : 0) + (riskHorizon === 'short' ? 15 : riskHorizon === 'long' ? -5 : 5)));

        setRiskResult({
            score: riskScore,
            scenario: riskStocks >= 60 ? 'A severe equity drawdown could reduce portfolio value by 25–35%.' : 'A diversified mix provides solid resilience in market shock scenarios.',
            metrics: [
                { label: 'Volatility', value: `${volatility.toFixed(1)}%`, exp: 'Weighted annual volatility estimate.' },
                { label: '95% VaR', value: `${var95.toFixed(1)}%`, exp: 'Parametric proxy for 1-period potential drawdown.' },
                { label: 'Concentration', value: concentration, exp: `Largest single holding is ${riskHolding}%.` }
            ]
        });
    };

    const resetInvestment = () => {
        setInvestIncome(6000);
        setInvestSavings(1500);
        setInvestInvestable(25000);
        setInvestHorizon(7);
        setInvestTolerance('moderate');
        setInvestGoal('growth');
        setInvestResult(null);
    };

    const resetLoan = () => {
        setLoanAmount(25000);
        setLoanIncome(5500);
        setLoanDebt(800);
        setLoanScore(740);
        setLoanEmployment(4);
        setLoanCollateral(30000);
        setLoanTerm(5);
        setLoanResult(null);
    };

    const resetRisk = () => {
        setRiskStocks(50);
        setRiskBonds(30);
        setRiskFunds(15);
        setRiskAlts(5);
        setRiskHolding(18);
        setRiskHorizon('medium');
        setRiskResult(null);
    };

    return (
        <div id="advisorPage" className="page-view" style={{ paddingBottom: '24px' }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title">AI Financial Advisor</h1>
                    <p className="page-subtitle">Interactive AI financial chatbot, asset allocation planner, and risk evaluation tools.</p>
                </div>
            </div>

            <div className="filter-pills" style={{ margin: '20px 0 24px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                    className={`pill ${activeTab === 'chatbot' ? 'active' : ''}`}
                    onClick={() => setActiveTab('chatbot')}
                >
                    💬 AI Assistant Chat
                </button>
                <button
                    className={`pill ${activeTab === 'investment' ? 'active' : ''}`}
                    onClick={() => setActiveTab('investment')}
                >
                    📈 Investment Plan
                </button>
                <button
                    className={`pill ${activeTab === 'loan' ? 'active' : ''}`}
                    onClick={() => setActiveTab('loan')}
                >
                    💳 Loan Eligibility
                </button>
                <button
                    className={`pill ${activeTab === 'risk' ? 'active' : ''}`}
                    onClick={() => setActiveTab('risk')}
                >
                    🛡️ Portfolio Risk
                </button>
            </div>

            {/* TAB 1: AI Chatbot */}
            {activeTab === 'chatbot' && (
                <div style={{ maxWidth: '1000px' }}>
                    <AiChatbot />
                </div>
            )}

            {/* TAB 2: Investment Recommendation */}
            {activeTab === 'investment' && (
                <div className="oripio-card oripio-white-card" style={{ padding: '28px', minHeight: 'auto', maxWidth: '1000px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                        <div>
                            <h3 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: '700', color: '#0F172A' }}>Personalized Asset Allocation Engine</h3>
                            <p style={{ color: '#64748B', fontSize: '13px', margin: 0, lineHeight: '1.5' }}>
                                Input your monthly cashflow and horizon to generate a tailored target asset mix.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={resetInvestment}
                            title="Reset to default inputs"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 14px',
                                fontSize: '12px',
                                fontWeight: '600',
                                color: '#475569',
                                background: '#F1F5F9',
                                border: '1px solid #CBD5E1',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            ↺ Reset Inputs
                        </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                        <div className="form-group">
                            <label>Monthly Income</label>
                            <input type="number" value={investIncome} onChange={(e) => setInvestIncome(Number(e.target.value))} />
                        </div>
                        <div className="form-group">
                            <label>Monthly Savings</label>
                            <input type="number" value={investSavings} onChange={(e) => setInvestSavings(Number(e.target.value))} />
                        </div>
                        <div className="form-group">
                            <label>Investable Capital</label>
                            <input type="number" value={investInvestable} onChange={(e) => setInvestInvestable(Number(e.target.value))} />
                        </div>
                        <div className="form-group">
                            <label>Investment Horizon (Years)</label>
                            <input type="number" value={investHorizon} onChange={(e) => setInvestHorizon(Number(e.target.value))} />
                        </div>
                        <div className="form-group">
                            <label>Risk Tolerance</label>
                            <select value={investTolerance} onChange={(e) => setInvestTolerance(e.target.value)}>
                                <option value="conservative">Conservative</option>
                                <option value="moderate">Moderate</option>
                                <option value="aggressive">Aggressive</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', marginTop: '20px', alignItems: 'center' }}>
                        <button className="btn btn-primary" onClick={runInvestmentAssessment}>
                            Generate Investment Strategy
                        </button>
                        <button
                            type="button"
                            onClick={resetInvestment}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '10px 18px',
                                fontSize: '13px',
                                fontWeight: '600',
                                color: '#475569',
                                background: '#F8FAFC',
                                border: '1px solid #CBD5E1',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            ↺ Reset
                        </button>
                    </div>

                    {investResult && (
                        <div className="halal-result pass" style={{ marginTop: '24px' }}>
                            <div className="halal-result-heading">
                                <div>
                                    <span>Allocation Strategy</span>
                                    <h2>{investResult.recommendation}</h2>
                                </div>
                                <strong>✓</strong>
                            </div>
                            <div className="halal-check-list">
                                {investResult.metrics.map(m => (
                                    <div key={m.label}>
                                        <span>{m.label}</span>
                                        <strong className="check-pass">{m.value}</strong>
                                        <small>{m.exp}</small>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* TAB 3: Loan Affordability */}
            {activeTab === 'loan' && (
                <div className="oripio-card oripio-white-card" style={{ padding: '28px', minHeight: 'auto', maxWidth: '1000px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                        <div>
                            <h3 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: '700', color: '#0F172A' }}>Automated Underwriting &amp; DTI Screen</h3>
                            <p style={{ color: '#64748B', fontSize: '13px', margin: 0, lineHeight: '1.5' }}>
                                Evaluates eligibility against debt burden, credit tier, and collateral coverage.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={resetLoan}
                            title="Reset to default inputs"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 14px',
                                fontSize: '12px',
                                fontWeight: '600',
                                color: '#475569',
                                background: '#F1F5F9',
                                border: '1px solid #CBD5E1',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            ↺ Reset Inputs
                        </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                        <div className="form-group">
                            <label>Loan Amount Requested</label>
                            <input type="number" value={loanAmount} onChange={(e) => setLoanAmount(Number(e.target.value))} />
                        </div>
                        <div className="form-group">
                            <label>Gross Monthly Income</label>
                            <input type="number" value={loanIncome} onChange={(e) => setLoanIncome(Number(e.target.value))} />
                        </div>
                        <div className="form-group">
                            <label>Existing Monthly Debt</label>
                            <input type="number" value={loanDebt} onChange={(e) => setLoanDebt(Number(e.target.value))} />
                        </div>
                        <div className="form-group">
                            <label>Credit Score</label>
                            <input type="number" value={loanScore} onChange={(e) => setLoanScore(Number(e.target.value))} />
                        </div>
                        <div className="form-group">
                            <label>Employment Tenure (Years)</label>
                            <input type="number" value={loanEmployment} onChange={(e) => setLoanEmployment(Number(e.target.value))} />
                        </div>
                        <div className="form-group">
                            <label>Collateral Valuation</label>
                            <input type="number" value={loanCollateral} onChange={(e) => setLoanCollateral(Number(e.target.value))} />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', marginTop: '20px', alignItems: 'center' }}>
                        <button className="btn btn-primary" onClick={runLoanAssessment}>
                            Evaluate Loan Eligibility
                        </button>
                        <button
                            type="button"
                            onClick={resetLoan}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '10px 18px',
                                fontSize: '13px',
                                fontWeight: '600',
                                color: '#475569',
                                background: '#F8FAFC',
                                border: '1px solid #CBD5E1',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            ↺ Reset
                        </button>
                    </div>

                    {loanResult && (
                        <div className={`halal-result ${loanResult.decision === 'Eligible' ? 'pass' : loanResult.decision === 'Conditional Approval' ? 'review' : 'fail'}`} style={{ marginTop: '24px' }}>
                            <div className="halal-result-heading">
                                <div>
                                    <span>Decision Outcome</span>
                                    <h2>{loanResult.decision}</h2>
                                </div>
                                <strong>{loanResult.decision === 'Eligible' ? '✓' : loanResult.decision === 'Conditional Approval' ? '!' : '✕'}</strong>
                            </div>
                            <p>{loanResult.explanation}</p>
                            <div className="halal-check-list">
                                {loanResult.metrics.map(m => (
                                    <div key={m.label}>
                                        <span>{m.label}</span>
                                        <strong>{m.value}</strong>
                                        <small>{m.exp}</small>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* TAB 4: Portfolio Risk Evaluation */}
            {activeTab === 'risk' && (
                <div className="oripio-card oripio-white-card" style={{ padding: '28px', minHeight: 'auto', maxWidth: '1000px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                        <div>
                            <h3 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: '700', color: '#0F172A' }}>Portfolio Volatility &amp; Drawdown Analytics</h3>
                            <p style={{ color: '#64748B', fontSize: '13px', margin: 0, lineHeight: '1.5' }}>
                                Tests asset weights for concentration risk, value at risk (VaR), and shock tolerance.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={resetRisk}
                            title="Reset to default inputs"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 14px',
                                fontSize: '12px',
                                fontWeight: '600',
                                color: '#475569',
                                background: '#F1F5F9',
                                border: '1px solid #CBD5E1',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            ↺ Reset Inputs
                        </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                        <div className="form-group">
                            <label>Stocks Weight (%)</label>
                            <input type="number" value={riskStocks} onChange={(e) => setRiskStocks(Number(e.target.value))} />
                        </div>
                        <div className="form-group">
                            <label>Bonds Weight (%)</label>
                            <input type="number" value={riskBonds} onChange={(e) => setRiskBonds(Number(e.target.value))} />
                        </div>
                        <div className="form-group">
                            <label>ETFs/Funds (%)</label>
                            <input type="number" value={riskFunds} onChange={(e) => setRiskFunds(Number(e.target.value))} />
                        </div>
                        <div className="form-group">
                            <label>Alternatives/Cash (%)</label>
                            <input type="number" value={riskAlts} onChange={(e) => setRiskAlts(Number(e.target.value))} />
                        </div>
                        <div className="form-group">
                            <label>Largest Single Holding (%)</label>
                            <input type="number" value={riskHolding} onChange={(e) => setRiskHolding(Number(e.target.value))} />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', marginTop: '20px', alignItems: 'center' }}>
                        <button className="btn btn-primary" onClick={runRiskAssessment}>
                            Run Risk Stress Test
                        </button>
                        <button
                            type="button"
                            onClick={resetRisk}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '10px 18px',
                                fontSize: '13px',
                                fontWeight: '600',
                                color: '#475569',
                                background: '#F8FAFC',
                                border: '1px solid #CBD5E1',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            ↺ Reset
                        </button>
                    </div>

                    {riskResult && (
                        <div className="halal-result pass" style={{ marginTop: '24px' }}>
                            <div className="halal-result-heading">
                                <div>
                                    <span>Stress Test Evaluation</span>
                                    <h2>Dynamic Risk Score: {riskResult.score}/100</h2>
                                </div>
                            </div>
                            <p>{riskResult.scenario}</p>
                            <div className="halal-check-list">
                                {riskResult.metrics.map(m => (
                                    <div key={m.label}>
                                        <span>{m.label}</span>
                                        <strong className="check-pass">{m.value}</strong>
                                        <small>{m.exp}</small>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
