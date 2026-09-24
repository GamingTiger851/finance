import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { CURRENCY_LOCALES } from '../../constants';
import LoanEligibilityView from '../loans/LoanEligibilityView';

export default function CalculatorsView({ defaultTab = 'sip' }) {
    const { userProfile } = useAuth();
    const currency = userProfile?.currency || 'INR';
    const [calcType, setCalcType] = useState(defaultTab); // 'sip' | 'swp' | 'fd' | 'rd' | 'mf' | 'loan'
    const [showGrowthTable, setShowGrowthTable] = useState(false);

    // --- Clean Integer Currency Formatter (No awkward .00 / .54 decimals) ---
    const formatCalcAmount = (amount, curr = currency) => {
        const locale = CURRENCY_LOCALES[curr] || 'en-IN';
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: curr,
            maximumFractionDigits: 0,
            minimumFractionDigits: 0
        }).format(Math.round(amount || 0));
    };

    // --- SIP State --- (Default ₹5,000/mo, realistic max 2,00,000)
    const [sipMonthly, setSipMonthly] = useState(5000);
    const [sipRate, setSipRate] = useState(12);
    const [sipYears, setSipYears] = useState(10);

    // --- SWP State --- (Default ₹10,00,000 corpus, ₹10,000/mo withdrawal)
    const [swpInitial, setSwpInitial] = useState(1000000);
    const [swpMonthly, setSwpMonthly] = useState(10000);
    const [swpRate, setSwpRate] = useState(9);
    const [swpYears, setSwpYears] = useState(10);

    // --- FD State --- (Default ₹1,00,000, 7.1%, 5 yrs)
    const [fdPrincipal, setFdPrincipal] = useState(100000);
    const [fdRate, setFdRate] = useState(7.1);
    const [fdYears, setFdYears] = useState(5);
    const [fdFrequency, setFdFrequency] = useState(4); // 4 = quarterly, 1 = annually, 12 = monthly

    // --- RD State --- (Default ₹5,000/mo, 6.8%, 5 yrs)
    const [rdMonthly, setRdMonthly] = useState(5000);
    const [rdRate, setRdRate] = useState(6.8);
    const [rdYears, setRdYears] = useState(5);

    // --- Mutual Fund Lumpsum State --- (Default ₹50,000, 14%, 10 yrs)
    const [mfPrincipal, setMfPrincipal] = useState(50000);
    const [mfRate, setMfRate] = useState(14);
    const [mfYears, setMfYears] = useState(10);

    // Progressive slider track fill
    const getSliderFill = (val, min, max, color = '#059669') => {
        const pct = Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
        return {
            background: `linear-gradient(to right, ${color} ${pct}%, #E2E8F0 ${pct}%)`,
            height: '8px',
            borderRadius: '999px',
            width: '100%',
            accentColor: color,
            cursor: 'pointer',
            margin: '8px 0',
            outline: 'none'
        };
    };

    // --- Reset Helper Functions ---
    const resetSip = () => {
        setSipMonthly(5000);
        setSipRate(12);
        setSipYears(10);
    };

    const resetSwp = () => {
        setSwpInitial(1000000);
        setSwpMonthly(10000);
        setSwpRate(9);
        setSwpYears(10);
    };

    const resetFd = () => {
        setFdPrincipal(100000);
        setFdRate(7.1);
        setFdYears(5);
        setFdFrequency(4);
    };

    const resetRd = () => {
        setRdMonthly(5000);
        setRdRate(6.8);
        setRdYears(5);
    };

    const resetMf = () => {
        setMfPrincipal(50000);
        setMfRate(14);
        setMfYears(10);
    };

    // ================= CALCULATIONS ================= //

    // 1. SIP Calculation (Standard Indian Fintech Formula: FV = P * (((1+i)^n - 1)/i) * (1+i))
    const sipResult = useMemo(() => {
        const i = (sipRate / 100) / 12;
        const n = sipYears * 12;
        const invested = Math.round(sipMonthly * n);
        const rawMaturity = i > 0 ? sipMonthly * (((Math.pow(1 + i, n) - 1) / i) * (1 + i)) : invested;
        const maturity = Math.round(rawMaturity);
        const returns = Math.max(0, maturity - invested);
        const absReturnPct = invested > 0 ? ((returns / invested) * 100).toFixed(1) : '0.0';

        // Yearly schedule
        const yearly = [];
        for (let y = 1; y <= sipYears; y++) {
            const months = y * 12;
            const yInvested = Math.round(sipMonthly * months);
            const yMaturity = i > 0 ? Math.round(sipMonthly * (((Math.pow(1 + i, months) - 1) / i) * (1 + i))) : yInvested;
            yearly.push({ year: y, invested: yInvested, value: yMaturity, gain: yMaturity - yInvested });
        }

        return { invested, returns, maturity, absReturnPct, yearly };
    }, [sipMonthly, sipRate, sipYears]);

    // 2. SWP Calculation
    const swpResult = useMemo(() => {
        const monthlyRate = (swpRate / 100) / 12;
        const n = swpYears * 12;
        let balance = swpInitial;
        let totalWithdrawn = 0;
        const yearly = [];

        for (let m = 1; m <= n; m++) {
            const interest = balance * monthlyRate;
            balance = Math.max(0, balance + interest - swpMonthly);
            totalWithdrawn += swpMonthly;

            if (m % 12 === 0) {
                yearly.push({
                    year: m / 12,
                    withdrawn: Math.round(totalWithdrawn),
                    balance: Math.round(balance)
                });
            }
        }

        return {
            initial: Math.round(swpInitial),
            totalWithdrawn: Math.round(totalWithdrawn),
            finalBalance: Math.round(balance),
            yearly
        };
    }, [swpInitial, swpMonthly, swpRate, swpYears]);

    // 3. FD Calculation (Compound Interest A = P * (1 + r/n)^(n*t))
    const fdResult = useMemo(() => {
        const n = fdFrequency;
        const r = fdRate / 100;
        const maturity = Math.round(fdPrincipal * Math.pow(1 + (r / n), n * fdYears));
        const interest = Math.max(0, maturity - fdPrincipal);
        const absReturnPct = fdPrincipal > 0 ? ((interest / fdPrincipal) * 100).toFixed(1) : '0.0';

        const yearly = [];
        for (let y = 1; y <= fdYears; y++) {
            const yMaturity = Math.round(fdPrincipal * Math.pow(1 + (r / n), n * y));
            yearly.push({ year: y, principal: fdPrincipal, value: yMaturity, interest: yMaturity - fdPrincipal });
        }

        return { principal: fdPrincipal, interest, maturity, absReturnPct, yearly };
    }, [fdPrincipal, fdRate, fdYears, fdFrequency]);

    // 4. RD Calculation (Quarterly Compounding Formula)
    const rdResult = useMemo(() => {
        const n = rdYears * 12;
        const invested = Math.round(rdMonthly * n);
        const r = rdRate / 100;
        let rawMaturity = 0;
        for (let m = 1; m <= n; m++) {
            const monthsRemaining = n - m + 1;
            rawMaturity += rdMonthly * Math.pow(1 + (r / 4), (4 * monthsRemaining) / 12);
        }
        const maturity = Math.round(rawMaturity);
        const interest = Math.max(0, maturity - invested);
        const absReturnPct = invested > 0 ? ((interest / invested) * 100).toFixed(1) : '0.0';

        const yearly = [];
        for (let y = 1; y <= rdYears; y++) {
            const yMonths = y * 12;
            let yMat = 0;
            for (let m = 1; m <= yMonths; m++) {
                const rem = yMonths - m + 1;
                yMat += rdMonthly * Math.pow(1 + (r / 4), (4 * rem) / 12);
            }
            const yVal = Math.round(yMat);
            const yInv = Math.round(rdMonthly * yMonths);
            yearly.push({ year: y, invested: yInv, value: yVal, interest: yVal - yInv });
        }

        return { invested, interest, maturity, absReturnPct, yearly };
    }, [rdMonthly, rdRate, rdYears]);

    // 5. Mutual Fund (Lumpsum) Calculation
    const mfResult = useMemo(() => {
        const r = mfRate / 100;
        const maturity = Math.round(mfPrincipal * Math.pow(1 + r, mfYears));
        const gain = Math.max(0, maturity - mfPrincipal);
        const absReturnPct = mfPrincipal > 0 ? ((gain / mfPrincipal) * 100).toFixed(1) : '0.0';

        const yearly = [];
        for (let y = 1; y <= mfYears; y++) {
            const yMaturity = Math.round(mfPrincipal * Math.pow(1 + r, y));
            yearly.push({ year: y, invested: mfPrincipal, value: yMaturity, gain: yMaturity - mfPrincipal });
        }

        return { invested: mfPrincipal, gain, maturity, absReturnPct, yearly };
    }, [mfPrincipal, mfRate, mfYears]);

    // Progress bar ratios (Share of total portfolio)
    const getRatio = (invested, total) => {
        if (!total || total <= 0) return '50';
        const pct = Math.min(100, Math.max(0, (invested / total) * 100));
        return pct.toFixed(1);
    };

    return (
        <div id="calculatorsPage" className="page-view" style={{ maxWidth: '1240px', margin: '0 auto', paddingBottom: '24px' }}>
            <div className="page-header" style={{ marginBottom: '20px' }}>
                <div>
                    <h1 className="page-title" style={{ fontSize: '26px', fontWeight: '800', color: '#0F172A', letterSpacing: '-0.02em', margin: '0 0 4px' }}>
                        Financial Calculators
                    </h1>
                    <p className="page-subtitle" style={{ color: '#64748B', fontSize: '14px', margin: 0 }}>
                        Accurate investment, wealth compounding, and deposit projection tools.
                    </p>
                </div>
            </div>

            {/* Quick Switcher Tabs */}
            <div className="filter-pills calc-type-switcher" style={{ margin: '0 0 24px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                    className={`pill ${calcType === 'sip' ? 'active' : ''}`}
                    onClick={() => setCalcType('sip')}
                >
                    📊 SIP Calculator
                </button>
                <button
                    className={`pill ${calcType === 'swp' ? 'active' : ''}`}
                    onClick={() => setCalcType('swp')}
                >
                    💸 SWP Calculator
                </button>
                <button
                    className={`pill ${calcType === 'fd' ? 'active' : ''}`}
                    onClick={() => setCalcType('fd')}
                >
                    🏦 FD Calculator
                </button>
                <button
                    className={`pill ${calcType === 'rd' ? 'active' : ''}`}
                    onClick={() => setCalcType('rd')}
                >
                    🔄 RD Calculator
                </button>
                <button
                    className={`pill ${calcType === 'mf' ? 'active' : ''}`}
                    onClick={() => setCalcType('mf')}
                >
                    📈 Mutual Fund (Lumpsum)
                </button>
                <button
                    className={`pill ${calcType === 'loan' ? 'active' : ''}`}
                    onClick={() => setCalcType('loan')}
                >
                    💳 Loan Eligibility &amp; EMI
                </button>
            </div>

            {calcType === 'loan' ? (
                <LoanEligibilityView embedded={true} />
            ) : (
                <>
                    <div className="calculator-workspace-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '24px', alignItems: 'start' }}>

                        {/* LEFT: Inputs & Sliders */}
                        <div className="oripio-card oripio-white-card" style={{ padding: '24px', minHeight: 'auto' }}>

                            {/* 1. SIP */}
                            {calcType === 'sip' && (
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                                        <div>
                                            <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: '700', color: '#0F172A' }}>
                                                Systematic Investment Plan (SIP)
                                            </h3>
                                            <p style={{ color: '#64748B', fontSize: '13px', margin: 0, lineHeight: '1.4' }}>
                                                Calculate long-term compound wealth created by investing monthly.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={resetSip}
                                            title="Reset SIP to default values"
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '5px',
                                                padding: '5px 12px',
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                color: '#475569',
                                                background: '#F1F5F9',
                                                border: '1px solid #CBD5E1',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            ↺ Reset
                                        </button>
                                    </div>

                                    {/* Monthly Investment */}
                                    <div className="calc-slider-group">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                            <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>MONTHLY INVESTMENT</label>
                                            <span style={{ fontWeight: '700', color: '#059669', fontSize: '17px' }}>
                                                {formatCalcAmount(sipMonthly, currency)}
                                            </span>
                                        </div>
                                        <input
                                            type="range"
                                            min="500"
                                            max="200000"
                                            step="500"
                                            value={sipMonthly}
                                            onChange={(e) => setSipMonthly(Number(e.target.value))}
                                            style={getSliderFill(sipMonthly, 500, 200000, '#059669')}
                                        />
                                        {/* Quick Amount Presets */}
                                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                                            {[500, 1000, 2500, 5000, 10000, 25000, 50000, 100000].map(amt => (
                                                <button
                                                    key={amt}
                                                    type="button"
                                                    onClick={() => setSipMonthly(amt)}
                                                    style={{
                                                        background: sipMonthly === amt ? '#059669' : '#F1F5F9',
                                                        color: sipMonthly === amt ? '#FFFFFF' : '#475569',
                                                        border: '1px solid ' + (sipMonthly === amt ? '#059669' : '#E2E8F0'),
                                                        borderRadius: '6px',
                                                        padding: '4px 9px',
                                                        fontSize: '11px',
                                                        fontWeight: sipMonthly === amt ? '700' : '600',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.15s ease'
                                                    }}
                                                >
                                                    {formatCalcAmount(amt, currency)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Expected Annual Return */}
                                    <div className="calc-slider-group" style={{ marginTop: '20px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                            <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>EXPECTED ANNUAL RETURN (%)</label>
                                            <span style={{ fontWeight: '700', color: '#059669', fontSize: '17px' }}>{sipRate}%</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="1"
                                            max="30"
                                            step="0.5"
                                            value={sipRate}
                                            onChange={(e) => setSipRate(Number(e.target.value))}
                                            style={getSliderFill(sipRate, 1, 30, '#059669')}
                                        />
                                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                                            {[8, 10, 12, 15, 18].map(rt => (
                                                <button
                                                    key={rt}
                                                    type="button"
                                                    onClick={() => setSipRate(rt)}
                                                    style={{
                                                        background: sipRate === rt ? '#059669' : '#F1F5F9',
                                                        color: sipRate === rt ? '#FFFFFF' : '#475569',
                                                        border: '1px solid ' + (sipRate === rt ? '#059669' : '#E2E8F0'),
                                                        borderRadius: '6px',
                                                        padding: '4px 9px',
                                                        fontSize: '11px',
                                                        fontWeight: sipRate === rt ? '700' : '600',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    {rt}%
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Investment Horizon */}
                                    <div className="calc-slider-group" style={{ marginTop: '20px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                            <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>INVESTMENT HORIZON (YEARS)</label>
                                            <span style={{ fontWeight: '700', color: '#D97706', fontSize: '17px' }}>{sipYears} Years</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="1"
                                            max="35"
                                            step="1"
                                            value={sipYears}
                                            onChange={(e) => setSipYears(Number(e.target.value))}
                                            style={getSliderFill(sipYears, 1, 35, '#D97706')}
                                        />
                                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                                            {[3, 5, 10, 15, 20, 25].map(yr => (
                                                <button
                                                    key={yr}
                                                    type="button"
                                                    onClick={() => setSipYears(yr)}
                                                    style={{
                                                        background: sipYears === yr ? '#D97706' : '#F1F5F9',
                                                        color: sipYears === yr ? '#FFFFFF' : '#475569',
                                                        border: '1px solid ' + (sipYears === yr ? '#D97706' : '#E2E8F0'),
                                                        borderRadius: '6px',
                                                        padding: '4px 9px',
                                                        fontSize: '11px',
                                                        fontWeight: sipYears === yr ? '700' : '600',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    {yr} Yrs
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 2. SWP */}
                            {calcType === 'swp' && (
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                                        <div>
                                            <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: '700', color: '#0F172A' }}>
                                                Systematic Withdrawal Plan (SWP)
                                            </h3>
                                            <p style={{ color: '#64748B', fontSize: '13px', margin: 0, lineHeight: '1.4' }}>
                                                Plan regular monthly cash flow from your lump sum corpus.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={resetSwp}
                                            title="Reset SWP to default values"
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '5px',
                                                padding: '5px 12px',
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                color: '#475569',
                                                background: '#F1F5F9',
                                                border: '1px solid #CBD5E1',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            ↺ Reset
                                        </button>
                                    </div>

                                    <div className="calc-slider-group">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                            <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>TOTAL INITIAL CORPUS</label>
                                            <span style={{ fontWeight: '700', color: '#2563EB', fontSize: '17px' }}>{formatCalcAmount(swpInitial, currency)}</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="50000"
                                            max="5000000"
                                            step="10000"
                                            value={swpInitial}
                                            onChange={(e) => setSwpInitial(Number(e.target.value))}
                                            style={getSliderFill(swpInitial, 50000, 5000000, '#2563EB')}
                                        />
                                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                                            {[250000, 500000, 1000000, 2500000, 5000000].map(amt => (
                                                <button
                                                    key={amt}
                                                    type="button"
                                                    onClick={() => setSwpInitial(amt)}
                                                    style={{
                                                        background: swpInitial === amt ? '#2563EB' : '#F1F5F9',
                                                        color: swpInitial === amt ? '#FFFFFF' : '#475569',
                                                        border: '1px solid ' + (swpInitial === amt ? '#2563EB' : '#E2E8F0'),
                                                        borderRadius: '6px',
                                                        padding: '4px 9px',
                                                        fontSize: '11px',
                                                        fontWeight: swpInitial === amt ? '700' : '600',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    {formatCalcAmount(amt, currency)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="calc-slider-group" style={{ marginTop: '20px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                            <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>MONTHLY WITHDRAWAL</label>
                                            <span style={{ fontWeight: '700', color: '#DC2626', fontSize: '17px' }}>{formatCalcAmount(swpMonthly, currency)}</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="500"
                                            max="100000"
                                            step="500"
                                            value={swpMonthly}
                                            onChange={(e) => setSwpMonthly(Number(e.target.value))}
                                            style={getSliderFill(swpMonthly, 500, 100000, '#DC2626')}
                                        />
                                    </div>

                                    <div className="calc-slider-group" style={{ marginTop: '20px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                            <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>EXPECTED ANNUAL RETURN (%)</label>
                                            <span style={{ fontWeight: '700', color: '#059669', fontSize: '17px' }}>{swpRate}%</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="1"
                                            max="25"
                                            step="0.5"
                                            value={swpRate}
                                            onChange={(e) => setSwpRate(Number(e.target.value))}
                                            style={getSliderFill(swpRate, 1, 25, '#059669')}
                                        />
                                    </div>

                                    <div className="calc-slider-group" style={{ marginTop: '20px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                            <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>WITHDRAWAL PERIOD (YEARS)</label>
                                            <span style={{ fontWeight: '700', color: '#D97706', fontSize: '17px' }}>{swpYears} Years</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="1"
                                            max="30"
                                            step="1"
                                            value={swpYears}
                                            onChange={(e) => setSwpYears(Number(e.target.value))}
                                            style={getSliderFill(swpYears, 1, 30, '#D97706')}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* 3. FD */}
                            {calcType === 'fd' && (
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                                        <div>
                                            <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: '700', color: '#0F172A' }}>
                                                Fixed Deposit (FD) Calculator
                                            </h3>
                                            <p style={{ color: '#64748B', fontSize: '13px', margin: 0, lineHeight: '1.4' }}>
                                                Calculate guaranteed returns on term deposit accounts.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={resetFd}
                                            title="Reset FD to default values"
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '5px',
                                                padding: '5px 12px',
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                color: '#475569',
                                                background: '#F1F5F9',
                                                border: '1px solid #CBD5E1',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            ↺ Reset
                                        </button>
                                    </div>

                                    <div className="calc-slider-group">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                            <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>TOTAL DEPOSIT (PRINCIPAL)</label>
                                            <span style={{ fontWeight: '700', color: '#2563EB', fontSize: '17px' }}>{formatCalcAmount(fdPrincipal, currency)}</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="1000"
                                            max="2500000"
                                            step="1000"
                                            value={fdPrincipal}
                                            onChange={(e) => setFdPrincipal(Number(e.target.value))}
                                            style={getSliderFill(fdPrincipal, 1000, 2500000, '#2563EB')}
                                        />
                                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                                            {[25000, 50000, 100000, 500000, 1000000].map(amt => (
                                                <button
                                                    key={amt}
                                                    type="button"
                                                    onClick={() => setFdPrincipal(amt)}
                                                    style={{
                                                        background: fdPrincipal === amt ? '#2563EB' : '#F1F5F9',
                                                        color: fdPrincipal === amt ? '#FFFFFF' : '#475569',
                                                        border: '1px solid ' + (fdPrincipal === amt ? '#2563EB' : '#E2E8F0'),
                                                        borderRadius: '6px',
                                                        padding: '4px 9px',
                                                        fontSize: '11px',
                                                        fontWeight: fdPrincipal === amt ? '700' : '600',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    {formatCalcAmount(amt, currency)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="calc-slider-group" style={{ marginTop: '20px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                            <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>INTEREST RATE (% P.A.)</label>
                                            <span style={{ fontWeight: '700', color: '#059669', fontSize: '17px' }}>{fdRate}%</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="2"
                                            max="15"
                                            step="0.1"
                                            value={fdRate}
                                            onChange={(e) => setFdRate(Number(e.target.value))}
                                            style={getSliderFill(fdRate, 2, 15, '#059669')}
                                        />
                                    </div>

                                    <div className="calc-slider-group" style={{ marginTop: '20px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                            <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>TENURE (YEARS)</label>
                                            <span style={{ fontWeight: '700', color: '#D97706', fontSize: '17px' }}>{fdYears} Years</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="1"
                                            max="15"
                                            step="1"
                                            value={fdYears}
                                            onChange={(e) => setFdYears(Number(e.target.value))}
                                            style={getSliderFill(fdYears, 1, 15, '#D97706')}
                                        />
                                    </div>

                                    <div className="form-group" style={{ marginTop: '20px' }}>
                                        <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px', display: 'block' }}>
                                            COMPOUNDING FREQUENCY
                                        </label>
                                        <select
                                            value={fdFrequency}
                                            onChange={(e) => setFdFrequency(Number(e.target.value))}
                                            style={{
                                                width: '100%',
                                                padding: '9px 12px',
                                                borderRadius: '8px',
                                                border: '1px solid #CBD5E1',
                                                background: '#FFFFFF',
                                                color: '#0F172A',
                                                fontSize: '13px',
                                                fontWeight: '500'
                                            }}
                                        >
                                            <option value={4}>Quarterly (Standard Bank Compounding)</option>
                                            <option value={12}>Monthly</option>
                                            <option value={2}>Half-Yearly</option>
                                            <option value={1}>Annually</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* 4. RD */}
                            {calcType === 'rd' && (
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                                        <div>
                                            <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: '700', color: '#0F172A' }}>
                                                Recurring Deposit (RD) Calculator
                                            </h3>
                                            <p style={{ color: '#64748B', fontSize: '13px', margin: 0, lineHeight: '1.4' }}>
                                                Estimate maturity proceeds from monthly bank recurring savings.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={resetRd}
                                            title="Reset RD to default values"
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '5px',
                                                padding: '5px 12px',
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                color: '#475569',
                                                background: '#F1F5F9',
                                                border: '1px solid #CBD5E1',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            ↺ Reset
                                        </button>
                                    </div>

                                    <div className="calc-slider-group">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                            <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>MONTHLY DEPOSIT</label>
                                            <span style={{ fontWeight: '700', color: '#2563EB', fontSize: '17px' }}>{formatCalcAmount(rdMonthly, currency)}</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="500"
                                            max="100000"
                                            step="500"
                                            value={rdMonthly}
                                            onChange={(e) => setRdMonthly(Number(e.target.value))}
                                            style={getSliderFill(rdMonthly, 500, 100000, '#2563EB')}
                                        />
                                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                                            {[500, 1000, 2500, 5000, 10000, 25000].map(amt => (
                                                <button
                                                    key={amt}
                                                    type="button"
                                                    onClick={() => setRdMonthly(amt)}
                                                    style={{
                                                        background: rdMonthly === amt ? '#2563EB' : '#F1F5F9',
                                                        color: rdMonthly === amt ? '#FFFFFF' : '#475569',
                                                        border: '1px solid ' + (rdMonthly === amt ? '#2563EB' : '#E2E8F0'),
                                                        borderRadius: '6px',
                                                        padding: '4px 9px',
                                                        fontSize: '11px',
                                                        fontWeight: rdMonthly === amt ? '700' : '600',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    {formatCalcAmount(amt, currency)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="calc-slider-group" style={{ marginTop: '20px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                            <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>INTEREST RATE (% P.A.)</label>
                                            <span style={{ fontWeight: '700', color: '#059669', fontSize: '17px' }}>{rdRate}%</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="2"
                                            max="14"
                                            step="0.1"
                                            value={rdRate}
                                            onChange={(e) => setRdRate(Number(e.target.value))}
                                            style={getSliderFill(rdRate, 2, 14, '#059669')}
                                        />
                                    </div>

                                    <div className="calc-slider-group" style={{ marginTop: '20px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                            <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>TENURE (YEARS)</label>
                                            <span style={{ fontWeight: '700', color: '#D97706', fontSize: '17px' }}>{rdYears} Years</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="1"
                                            max="10"
                                            step="1"
                                            value={rdYears}
                                            onChange={(e) => setRdYears(Number(e.target.value))}
                                            style={getSliderFill(rdYears, 1, 10, '#D97706')}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* 5. Mutual Fund Lumpsum */}
                            {calcType === 'mf' && (
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                                        <div>
                                            <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: '700', color: '#0F172A' }}>
                                                Mutual Fund Lumpsum Calculator
                                            </h3>
                                            <p style={{ color: '#64748B', fontSize: '13px', margin: 0, lineHeight: '1.4' }}>
                                                Calculate long-term equity compound growth on one-time investments.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={resetMf}
                                            title="Reset Mutual Fund to default values"
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '5px',
                                                padding: '5px 12px',
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                color: '#475569',
                                                background: '#F1F5F9',
                                                border: '1px solid #CBD5E1',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            ↺ Reset
                                        </button>
                                    </div>

                                    <div className="calc-slider-group">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                            <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>TOTAL ONE-TIME INVESTMENT</label>
                                            <span style={{ fontWeight: '700', color: '#2563EB', fontSize: '17px' }}>{formatCalcAmount(mfPrincipal, currency)}</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="1000"
                                            max="2500000"
                                            step="1000"
                                            value={mfPrincipal}
                                            onChange={(e) => setMfPrincipal(Number(e.target.value))}
                                            style={getSliderFill(mfPrincipal, 1000, 2500000, '#2563EB')}
                                        />
                                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                                            {[5000, 10000, 25000, 50000, 100000, 500000].map(amt => (
                                                <button
                                                    key={amt}
                                                    type="button"
                                                    onClick={() => setMfPrincipal(amt)}
                                                    style={{
                                                        background: mfPrincipal === amt ? '#2563EB' : '#F1F5F9',
                                                        color: mfPrincipal === amt ? '#FFFFFF' : '#475569',
                                                        border: '1px solid ' + (mfPrincipal === amt ? '#2563EB' : '#E2E8F0'),
                                                        borderRadius: '6px',
                                                        padding: '4px 9px',
                                                        fontSize: '11px',
                                                        fontWeight: mfPrincipal === amt ? '700' : '600',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    {formatCalcAmount(amt, currency)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="calc-slider-group" style={{ marginTop: '20px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                            <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>EXPECTED ANNUAL RETURN (%)</label>
                                            <span style={{ fontWeight: '700', color: '#059669', fontSize: '17px' }}>{mfRate}%</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="2"
                                            max="30"
                                            step="0.5"
                                            value={mfRate}
                                            onChange={(e) => setMfRate(Number(e.target.value))}
                                            style={getSliderFill(mfRate, 2, 30, '#059669')}
                                        />
                                    </div>

                                    <div className="calc-slider-group" style={{ marginTop: '20px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                            <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>HORIZON (YEARS)</label>
                                            <span style={{ fontWeight: '700', color: '#D97706', fontSize: '17px' }}>{mfYears} Years</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="1"
                                            max="30"
                                            step="1"
                                            value={mfYears}
                                            onChange={(e) => setMfYears(Number(e.target.value))}
                                            style={getSliderFill(mfYears, 1, 30, '#D97706')}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* RIGHT: Results Card & Visualization */}
                        <div className="oripio-card oripio-white-card" style={{ padding: '24px', minHeight: 'auto', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                                    <span style={{
                                        fontSize: '12px',
                                        fontWeight: '700',
                                        padding: '4px 12px',
                                        borderRadius: '20px',
                                        background: '#ECFDF5',
                                        color: '#059669',
                                        letterSpacing: '0.04em'
                                    }}>
                                        {calcType.toUpperCase()} SUMMARY
                                    </span>
                                    <span style={{ fontSize: '13px', fontWeight: '500', color: '#64748B' }}>
                                        Currency: <strong style={{ color: '#0F172A' }}>{currency}</strong>
                                    </span>
                                </div>

                                {/* SIP Outcome */}
                                {calcType === 'sip' && (
                                    <div style={{ display: 'grid', gap: '16px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: '12px', borderBottom: '1px solid #F1F5F9' }}>
                                            <div>
                                                <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748B', display: 'block', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                                    Invested Amount
                                                </span>
                                                <div style={{ fontSize: '24px', fontWeight: '700', color: '#0F172A' }}>
                                                    {formatCalcAmount(sipResult.invested, currency)}
                                                </div>
                                            </div>
                                            <span style={{ fontSize: '12px', color: '#64748B', fontWeight: '500', background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '3px 8px', borderRadius: '6px' }}>
                                                {sipYears * 12} payments of {formatCalcAmount(sipMonthly, currency)}
                                            </span>
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: '12px', borderBottom: '1px solid #F1F5F9' }}>
                                            <div>
                                                <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748B', display: 'block', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                                    Estimated Returns
                                                </span>
                                                <div style={{ fontSize: '26px', fontWeight: '700', color: '#059669' }}>
                                                    +{formatCalcAmount(sipResult.returns, currency)}
                                                </div>
                                            </div>
                                            <span style={{ fontSize: '12px', color: '#059669', fontWeight: '700', background: '#ECFDF5', padding: '3px 8px', borderRadius: '6px', border: '1px solid #A7F3D0' }}>
                                                +{sipResult.absReturnPct}% Gain
                                            </span>
                                        </div>

                                        <div style={{ paddingTop: '4px' }}>
                                            <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748B', display: 'block', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                                Total Maturity Value
                                            </span>
                                            <div style={{ fontSize: '36px', fontWeight: '800', color: '#0F172A', fontFamily: 'Space Grotesk, sans-serif' }}>
                                                {formatCalcAmount(sipResult.maturity, currency)}
                                            </div>
                                        </div>

                                        {/* Ratio Visualizer */}
                                        <div style={{ marginTop: '6px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px', fontWeight: '600' }}>
                                                <span style={{ color: '#2563EB', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2563EB', display: 'inline-block' }}></span>
                                                    Invested ({getRatio(sipResult.invested, sipResult.maturity)}%)
                                                </span>
                                                <span style={{ color: '#059669', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#059669', display: 'inline-block' }}></span>
                                                    Wealth Gain ({(100 - Number(getRatio(sipResult.invested, sipResult.maturity))).toFixed(1)}%)
                                                </span>
                                            </div>
                                            <div style={{ height: '10px', width: '100%', background: '#059669', borderRadius: '999px', overflow: 'hidden', display: 'flex' }}>
                                                <div style={{ height: '100%', width: `${getRatio(sipResult.invested, sipResult.maturity)}%`, background: '#2563EB', transition: 'width 0.3s ease' }} />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* SWP Outcome */}
                                {calcType === 'swp' && (
                                    <div style={{ display: 'grid', gap: '16px' }}>
                                        <div style={{ paddingBottom: '12px', borderBottom: '1px solid #F1F5F9' }}>
                                            <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748B', display: 'block', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                                Total Amount Withdrawn
                                            </span>
                                            <div style={{ fontSize: '24px', fontWeight: '700', color: '#DC2626' }}>
                                                {formatCalcAmount(swpResult.totalWithdrawn, currency)}
                                            </div>
                                        </div>
                                        <div style={{ paddingBottom: '12px', borderBottom: '1px solid #F1F5F9' }}>
                                            <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748B', display: 'block', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                                Remaining Final Portfolio
                                            </span>
                                            <div style={{ fontSize: '28px', fontWeight: '800', color: swpResult.finalBalance > 0 ? '#059669' : '#DC2626' }}>
                                                {formatCalcAmount(swpResult.finalBalance, currency)}
                                            </div>
                                        </div>
                                        <div style={{ paddingTop: '4px' }}>
                                            <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748B', display: 'block', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                                Initial Capital Deployed
                                            </span>
                                            <div style={{ fontSize: '20px', fontWeight: '700', color: '#0F172A' }}>
                                                {formatCalcAmount(swpResult.initial, currency)}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* FD Outcome */}
                                {calcType === 'fd' && (
                                    <div style={{ display: 'grid', gap: '16px' }}>
                                        <div style={{ paddingBottom: '12px', borderBottom: '1px solid #F1F5F9' }}>
                                            <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748B', display: 'block', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                                Principal Amount
                                            </span>
                                            <div style={{ fontSize: '24px', fontWeight: '700', color: '#0F172A' }}>
                                                {formatCalcAmount(fdResult.principal, currency)}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: '12px', borderBottom: '1px solid #F1F5F9' }}>
                                            <div>
                                                <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748B', display: 'block', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                                    Total Interest Earned
                                                </span>
                                                <div style={{ fontSize: '26px', fontWeight: '700', color: '#059669' }}>
                                                    +{formatCalcAmount(fdResult.interest, currency)}
                                                </div>
                                            </div>
                                            <span style={{ fontSize: '12px', color: '#059669', fontWeight: '700', background: '#ECFDF5', padding: '3px 8px', borderRadius: '6px', border: '1px solid #A7F3D0' }}>
                                                +{fdResult.absReturnPct}%
                                            </span>
                                        </div>
                                        <div style={{ paddingTop: '4px' }}>
                                            <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748B', display: 'block', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                                Maturity Proceeds
                                            </span>
                                            <div style={{ fontSize: '36px', fontWeight: '800', color: '#0F172A', fontFamily: 'Space Grotesk, sans-serif' }}>
                                                {formatCalcAmount(fdResult.maturity, currency)}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* RD Outcome */}
                                {calcType === 'rd' && (
                                    <div style={{ display: 'grid', gap: '16px' }}>
                                        <div style={{ paddingBottom: '12px', borderBottom: '1px solid #F1F5F9' }}>
                                            <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748B', display: 'block', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                                Total Deposited
                                            </span>
                                            <div style={{ fontSize: '24px', fontWeight: '700', color: '#0F172A' }}>
                                                {formatCalcAmount(rdResult.invested, currency)}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: '12px', borderBottom: '1px solid #F1F5F9' }}>
                                            <div>
                                                <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748B', display: 'block', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                                    Compound Interest Earned
                                                </span>
                                                <div style={{ fontSize: '26px', fontWeight: '700', color: '#059669' }}>
                                                    +{formatCalcAmount(rdResult.interest, currency)}
                                                </div>
                                            </div>
                                            <span style={{ fontSize: '12px', color: '#059669', fontWeight: '700', background: '#ECFDF5', padding: '3px 8px', borderRadius: '6px', border: '1px solid #A7F3D0' }}>
                                                +{rdResult.absReturnPct}%
                                            </span>
                                        </div>
                                        <div style={{ paddingTop: '4px' }}>
                                            <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748B', display: 'block', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                                Total Maturity Amount
                                            </span>
                                            <div style={{ fontSize: '36px', fontWeight: '800', color: '#0F172A', fontFamily: 'Space Grotesk, sans-serif' }}>
                                                {formatCalcAmount(rdResult.maturity, currency)}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Mutual Fund Lumpsum Outcome */}
                                {calcType === 'mf' && (
                                    <div style={{ display: 'grid', gap: '16px' }}>
                                        <div style={{ paddingBottom: '12px', borderBottom: '1px solid #F1F5F9' }}>
                                            <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748B', display: 'block', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                                One-Time Capital
                                            </span>
                                            <div style={{ fontSize: '24px', fontWeight: '700', color: '#0F172A' }}>
                                                {formatCalcAmount(mfResult.invested, currency)}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: '12px', borderBottom: '1px solid #F1F5F9' }}>
                                            <div>
                                                <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748B', display: 'block', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                                    Estimated Capital Gain
                                                </span>
                                                <div style={{ fontSize: '26px', fontWeight: '700', color: '#059669' }}>
                                                    +{formatCalcAmount(mfResult.gain, currency)}
                                                </div>
                                            </div>
                                            <span style={{ fontSize: '12px', color: '#059669', fontWeight: '700', background: '#ECFDF5', padding: '3px 8px', borderRadius: '6px', border: '1px solid #A7F3D0' }}>
                                                +{mfResult.absReturnPct}%
                                            </span>
                                        </div>
                                        <div style={{ paddingTop: '4px' }}>
                                            <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748B', display: 'block', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                                Total Expected Value
                                            </span>
                                            <div style={{ fontSize: '36px', fontWeight: '800', color: '#0F172A', fontFamily: 'Space Grotesk, sans-serif' }}>
                                                {formatCalcAmount(mfResult.maturity, currency)}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button
                                type="button"
                                className="btn btn-sm"
                                style={{
                                    marginTop: '20px',
                                    background: '#F8FAFC',
                                    border: '1px solid #CBD5E1',
                                    color: '#0F172A',
                                    borderRadius: '10px',
                                    padding: '11px 16px',
                                    fontWeight: '600',
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    transition: 'all 0.15s ease'
                                }}
                                onClick={() => setShowGrowthTable(!showGrowthTable)}
                            >
                                {showGrowthTable ? '▲ Hide Yearly Schedule' : '▼ View Year-by-Year Growth Table'}
                            </button>
                        </div>
                    </div>

                    {/* Expandable Year-by-Year Growth Schedule */}
                    {showGrowthTable && (
                        <div className="oripio-card oripio-white-card yearly-growth-card" style={{ marginTop: '24px', padding: '24px', minHeight: 'auto' }}>
                            <h3 style={{ margin: '0 0 16px', fontSize: '17px', fontWeight: '700', color: '#0F172A' }}>
                                Yearly Compounding Breakdown
                            </h3>
                            <div className="table-responsive yearly-growth-table-wrap">
                                <table className="yearly-growth-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontSize: '12px', fontWeight: '600' }}>Year</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontSize: '12px', fontWeight: '600' }}>Deposited / Invested</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontSize: '12px', fontWeight: '600' }}>Gains / Interest</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontSize: '12px', fontWeight: '600' }}>Closing Balance</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(calcType === 'sip' ? sipResult.yearly :
                                            calcType === 'fd' ? fdResult.yearly :
                                                calcType === 'rd' ? rdResult.yearly :
                                                    calcType === 'mf' ? mfResult.yearly :
                                                        swpResult.yearly).map(row => (
                                                            <tr key={row.year} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                                                <td style={{ padding: '12px 16px', color: '#0F172A', fontWeight: '600' }} data-label="Year">Year {row.year}</td>
                                                                <td style={{ padding: '12px 16px', color: '#334155' }} data-label="Deposited">
                                                                    {formatCalcAmount(row.invested || row.principal || swpResult.initial, currency)}
                                                                </td>
                                                                <td style={{ padding: '12px 16px', color: '#059669', fontWeight: '600' }} data-label="Gain">
                                                                    +{formatCalcAmount(row.gain || row.interest || (row.withdrawn || 0), currency)}
                                                                </td>
                                                                <td style={{ padding: '12px 16px', fontWeight: '700', color: '#0F172A' }} data-label="Balance">
                                                                    {formatCalcAmount(row.value || row.balance, currency)}
                                                                </td>
                                                            </tr>
                                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
