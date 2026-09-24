import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { CURRENCY_LOCALES } from '../../constants';

// Standard banking presets for different loan categories
const LOAN_TYPES = [
    {
        id: 'home',
        name: 'Home Loan',
        icon: '🏠',
        desc: 'Purchase or construct property',
        defaultRate: 8.5,
        defaultTenure: 20,
        maxTenure: 30,
        foir: 50,
        defaultAmount: 4000000,
        maxAmount: 25000000,
        step: 50000,
        color: '#2563eb',
        bg: '#eff6ff'
    },
    {
        id: 'personal',
        name: 'Personal Loan',
        icon: '👤',
        desc: 'Unsecured instant funds',
        defaultRate: 11.5,
        defaultTenure: 5,
        maxTenure: 7,
        foir: 40,
        defaultAmount: 500000,
        maxAmount: 4000000,
        step: 10000,
        color: '#7c3aed',
        bg: '#f5f3ff'
    },
    {
        id: 'car',
        name: 'Car / Vehicle',
        icon: '🚗',
        desc: 'New or used vehicle finance',
        defaultRate: 8.9,
        defaultTenure: 5,
        maxTenure: 8,
        foir: 45,
        defaultAmount: 1000000,
        maxAmount: 6000000,
        step: 25000,
        color: '#059669',
        bg: '#ecfdf5'
    },
    {
        id: 'education',
        name: 'Education Loan',
        icon: '🎓',
        desc: 'Higher studies & living expenses',
        defaultRate: 9.2,
        defaultTenure: 10,
        maxTenure: 15,
        foir: 40,
        defaultAmount: 2000000,
        maxAmount: 10000000,
        step: 25000,
        color: '#d97706',
        bg: '#fffbeb'
    },
    {
        id: 'business',
        name: 'Business Loan',
        icon: '🏢',
        desc: 'Working capital & enterprise expansion',
        defaultRate: 13.0,
        defaultTenure: 5,
        maxTenure: 10,
        foir: 45,
        defaultAmount: 2500000,
        maxAmount: 20000000,
        step: 50000,
        color: '#db2777',
        bg: '#fdf2f8'
    }
];

export default function LoanEligibilityView({ embedded = false }) {
    const { userProfile } = useAuth();
    const currency = userProfile?.currency || 'INR';

    // Helper for clean integer formatting (no .00 paise)
    const formatCalcAmount = (amount, curr = currency) => {
        const locale = curr === 'INR' ? 'en-IN' : (CURRENCY_LOCALES[curr] || 'en-US');
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: curr,
            maximumFractionDigits: 0,
            minimumFractionDigits: 0
        }).format(Math.round(amount || 0));
    };

    // Helper for visible progressive track fill
    const getSliderFill = (val, min, max, color = '#2563eb') => {
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

    // Active loan type preset
    const [loanTypeId, setLoanTypeId] = useState('home');
    const activeLoanType = LOAN_TYPES.find(t => t.id === loanTypeId) || LOAN_TYPES[0];

    // Core financial inputs
    const [monthlyIncome, setMonthlyIncome] = useState(85000);
    const [existingEmi, setExistingEmi] = useState(12000);
    const [desiredAmount, setDesiredAmount] = useState(activeLoanType.defaultAmount);
    const [tenureYears, setTenureYears] = useState(activeLoanType.defaultTenure);
    const [interestRate, setInterestRate] = useState(activeLoanType.defaultRate);
    const [creditScore, setCreditScore] = useState(760);
    const [employmentType, setEmploymentType] = useState('salaried'); // salaried | self_employed | business
    const [customFoir, setCustomFoir] = useState(activeLoanType.foir);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [showAmortization, setShowAmortization] = useState(false);

    // Handle loan type change
    const handleTypeChange = (typeId) => {
        const type = LOAN_TYPES.find(t => t.id === typeId) || LOAN_TYPES[0];
        setLoanTypeId(typeId);
        setInterestRate(type.defaultRate);
        setTenureYears(type.defaultTenure);
        setDesiredAmount(type.defaultAmount);
        setCustomFoir(type.foir);
    };

    // Calculations
    const calculations = useMemo(() => {
        const income = Math.max(0, Number(monthlyIncome) || 0);
        const debt = Math.max(0, Number(existingEmi) || 0);
        const desired = Math.max(0, Number(desiredAmount) || 0);
        const tenure = Math.max(1, Math.min(activeLoanType.maxTenure, Number(tenureYears) || 1));
        const rate = Math.max(0.1, Number(interestRate) || 0.1);
        const foirPct = Math.max(10, Math.min(80, Number(customFoir) || 50));

        // Total allowable monthly obligation
        const maxAllowableEmi = (income * foirPct) / 100;
        // Remaining monthly capacity for the new loan
        const availableEmi = Math.max(0, maxAllowableEmi - debt);

        // Monthly interest rate & total payments
        const monthlyRate = (rate / 100) / 12;
        const totalMonths = tenure * 12;

        // Present Value (Max loan amount bank will disburse based on available EMI capacity)
        let maxEligibleLoan = 0;
        if (availableEmi > 0) {
            if (monthlyRate > 0) {
                maxEligibleLoan = availableEmi * ((1 - Math.pow(1 + monthlyRate, -totalMonths)) / monthlyRate);
            } else {
                maxEligibleLoan = availableEmi * totalMonths;
            }
        }
        maxEligibleLoan = Math.round(maxEligibleLoan);

        // Desired Loan monthly EMI
        let desiredEmi = 0;
        if (desired > 0) {
            if (monthlyRate > 0) {
                const factor = Math.pow(1 + monthlyRate, totalMonths);
                desiredEmi = Math.round((desired * monthlyRate * factor) / (factor - 1));
            } else {
                desiredEmi = Math.round(desired / totalMonths);
            }
        }

        const totalRepayment = desiredEmi * totalMonths;
        const totalInterest = Math.max(0, totalRepayment - desired);

        // Projected debt burden
        const totalPostLoanEmi = debt + desiredEmi;
        const projectedDti = income > 0 ? Math.round((totalPostLoanEmi / income) * 100) : 100;
        const existingDti = income > 0 ? Math.round((debt / income) * 100) : 0;
        const newLoanDti = income > 0 ? Math.round((desiredEmi / income) * 100) : 0;
        const surplusDti = Math.max(0, 100 - existingDti - newLoanDti);

        // Eligibility verdict and score
        let isEligible = false;
        let verdict = 'Not Eligible';
        let verdictType = 'danger'; // 'success' | 'warning' | 'danger'
        let verdictDesc = '';
        let approvalChance = 40;

        const creditPass = creditScore >= 700;
        const creditBorderline = creditScore >= 650 && creditScore < 700;
        const emiAffordable = desiredEmi <= availableEmi && availableEmi > 0;
        const dtiSafe = projectedDti <= foirPct;

        if (income <= 0) {
            verdict = 'Income Required';
            verdictType = 'danger';
            verdictDesc = 'Please enter a valid monthly income to calculate loan affordability.';
            approvalChance = 0;
        } else if (emiAffordable && creditPass && dtiSafe) {
            isEligible = true;
            verdict = 'Pre-Approved Potential';
            verdictType = 'success';
            verdictDesc = `Excellent profile! Your projected DTI is ${projectedDti}% (comfortably below the ${foirPct}% benchmark) and your credit tier is strong.`;
            approvalChance = Math.min(98, 85 + (creditScore >= 750 ? 8 : 4) + (projectedDti <= 35 ? 5 : 0));
        } else if (desiredEmi <= availableEmi * 1.15 && (creditPass || creditBorderline) && projectedDti <= foirPct + 8) {
            isEligible = true;
            verdict = 'Conditional Eligibility';
            verdictType = 'warning';
            verdictDesc = `Your requested loan is slightly close to the maximum FOIR capacity (${projectedDti}%). Lenders may require a co-applicant or slight down payment increase.`;
            approvalChance = 68;
        } else {
            isEligible = false;
            verdict = 'Debt Burden Exceeded';
            verdictType = 'danger';
            if (availableEmi <= 0) {
                verdictDesc = `Your existing liabilities (${formatCalcAmount(debt, currency)}/mo) already consume ${existingDti}% of your income. Clear existing debts first to restore borrowing capacity.`;
                approvalChance = 15;
            } else if (!creditPass) {
                verdictDesc = `Credit score (${creditScore}) is below standard lending criteria (700+). Consider improving your credit profile or offering collateral.`;
                approvalChance = 28;
            } else {
                verdictDesc = `The EMI for your desired loan (${formatCalcAmount(desiredEmi, currency)}) exceeds your available capacity (${formatCalcAmount(availableEmi, currency)}). Consider reducing loan amount or extending tenure.`;
                approvalChance = 35;
            }
        }

        // Amortization table (yearly)
        const yearlySchedule = [];
        let balance = desired;
        for (let y = 1; y <= tenure; y++) {
            let yearlyPrincipal = 0;
            let yearlyInterest = 0;

            for (let m = 1; m <= 12; m++) {
                if (balance <= 0) break;
                const mInterest = balance * monthlyRate;
                const mPrincipal = Math.min(balance, desiredEmi - mInterest);
                yearlyInterest += mInterest;
                yearlyPrincipal += mPrincipal;
                balance = Math.max(0, balance - mPrincipal);
            }

            yearlySchedule.push({
                year: y,
                principalPaid: Math.round(yearlyPrincipal),
                interestPaid: Math.round(yearlyInterest),
                totalPaid: Math.round(yearlyPrincipal + yearlyInterest),
                remainingBalance: Math.round(balance)
            });
        }

        return {
            income,
            debt,
            desired,
            tenure,
            rate,
            foirPct,
            maxAllowableEmi,
            availableEmi,
            maxEligibleLoan,
            desiredEmi,
            totalRepayment,
            totalInterest,
            projectedDti,
            existingDti,
            newLoanDti,
            surplusDti,
            isEligible,
            verdict,
            verdictType,
            verdictDesc,
            approvalChance,
            yearlySchedule
        };
    }, [monthlyIncome, existingEmi, desiredAmount, tenureYears, interestRate, customFoir, creditScore, activeLoanType, currency]);

    // Credit score badge info
    const getCreditTier = (score) => {
        if (score >= 750) return { label: 'Excellent / Prime', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' };
        if (score >= 700) return { label: 'Good', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' };
        if (score >= 650) return { label: 'Fair / Average', color: '#d97706', bg: '#fffbeb', border: '#fde68a' };
        return { label: 'Subprime / High Risk', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' };
    };

    const creditTier = getCreditTier(creditScore);

    return (
        <div id="loanEligibilityPage" className={embedded ? 'loan-eligibility-embedded' : 'page-view'} style={{ maxWidth: '1240px', margin: '0 auto', paddingBottom: '24px' }}>
            {!embedded && (
                <div className="page-header" style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '24px' }}>💳</span>
                                <h1 className="page-title" style={{ margin: 0, fontSize: '26px', fontWeight: '800', color: '#0F172A', letterSpacing: '-0.02em' }}>
                                    Loan Eligibility &amp; EMI Calculator
                                </h1>
                            </div>
                            <p className="page-subtitle" style={{ marginTop: '6px', color: '#64748B', fontSize: '14px' }}>
                                Bank-grade assessment engine using standard FOIR, DTI rules, and credit bureau tiers.
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                type="button"
                                className="btn btn-sm"
                                style={{
                                    fontSize: '12px',
                                    padding: '8px 14px',
                                    borderRadius: '8px',
                                    background: '#FFFFFF',
                                    border: '1px solid #CBD5E1',
                                    color: '#0F172A',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                                onClick={() => {
                                    setMonthlyIncome(85000);
                                    setExistingEmi(12000);
                                    setDesiredAmount(activeLoanType.defaultAmount);
                                    setInterestRate(activeLoanType.defaultRate);
                                    setTenureYears(activeLoanType.defaultTenure);
                                    setCreditScore(760);
                                }}
                            >
                                ↺ Reset Inputs
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 1. Loan Category Selector Chips */}
            <div className="loan-type-chips-row" style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '22px' }}>
                {LOAN_TYPES.map(t => {
                    const isSelected = t.id === loanTypeId;
                    return (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => handleTypeChange(t.id)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '10px 18px',
                                borderRadius: '12px',
                                border: isSelected ? `2px solid ${t.color}` : '1px solid #E2E8F0',
                                background: isSelected ? '#FFFFFF' : '#FFFFFF',
                                color: isSelected ? '#0F172A' : '#475569',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                whiteSpace: 'nowrap',
                                fontWeight: isSelected ? '700' : '500',
                                boxShadow: isSelected ? `0 4px 14px ${t.color}22` : '0 2px 6px rgba(0, 0, 0, 0.03)'
                            }}
                        >
                            <span style={{ fontSize: '20px' }}>{t.icon}</span>
                            <div style={{ textAlign: 'left' }}>
                                <div style={{ fontSize: '13px', lineHeight: '1.2', color: isSelected ? '#0F172A' : '#334155', fontWeight: isSelected ? '700' : '600' }}>
                                    {t.name}
                                </div>
                                <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                                    {t.defaultRate}% p.a. · Up to {t.maxTenure}y
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* 2. Top Hero Metric Highlights */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                {/* Max Eligible Loan */}
                <div className="oripio-card oripio-white-card" style={{ borderLeft: '4px solid #059669', padding: '18px 20px', minHeight: 'auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '12.5px', fontWeight: '600', color: '#64748B' }}>Maximum Eligible Loan</span>
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: '#ECFDF5', color: '#059669', fontWeight: '700', border: '1px solid #A7F3D0' }}>
                            Max Capacity
                        </span>
                    </div>
                    <div style={{ color: '#059669', fontSize: '26px', fontWeight: '800', margin: '8px 0 4px', letterSpacing: '-0.02em' }}>
                        {formatCalcAmount(calculations.maxEligibleLoan, currency)}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748B' }}>
                        Based on {calculations.foirPct}% FOIR &amp; {calculations.tenure} yr tenure
                    </div>
                </div>

                {/* Available Monthly EMI Capacity */}
                <div className="oripio-card oripio-white-card" style={{ borderLeft: '4px solid #2563EB', padding: '18px 20px', minHeight: 'auto' }}>
                    <div style={{ fontSize: '12.5px', fontWeight: '600', color: '#64748B' }}>Max EMI Capacity</div>
                    <div style={{ color: '#2563EB', fontSize: '26px', fontWeight: '800', margin: '8px 0 4px', letterSpacing: '-0.02em' }}>
                        {formatCalcAmount(calculations.availableEmi, currency)}<span style={{ fontSize: '13px', fontWeight: '500', opacity: 0.7 }}>/mo</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748B' }}>
                        Net surplus after {formatCalcAmount(calculations.debt, currency)} existing EMIs
                    </div>
                </div>

                {/* Desired Loan EMI */}
                <div className="oripio-card oripio-white-card" style={{ borderLeft: `4px solid ${calculations.isEligible ? '#7C3AED' : '#DC2626'}`, padding: '18px 20px', minHeight: 'auto' }}>
                    <div style={{ fontSize: '12.5px', fontWeight: '600', color: '#64748B' }}>Desired Loan EMI</div>
                    <div style={{ color: calculations.isEligible ? '#7C3AED' : '#DC2626', fontSize: '26px', fontWeight: '800', margin: '8px 0 4px', letterSpacing: '-0.02em' }}>
                        {formatCalcAmount(calculations.desiredEmi, currency)}<span style={{ fontSize: '13px', fontWeight: '500', opacity: 0.7 }}>/mo</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748B' }}>
                        For requested {formatCalcAmount(calculations.desired, currency)} @ {calculations.rate}%
                    </div>
                </div>

                {/* Total Interest & Cost */}
                <div className="oripio-card oripio-white-card" style={{ borderLeft: '4px solid #D97706', padding: '18px 20px', minHeight: 'auto' }}>
                    <div style={{ fontSize: '12.5px', fontWeight: '600', color: '#64748B' }}>Total Interest Payable</div>
                    <div style={{ color: '#D97706', fontSize: '26px', fontWeight: '800', margin: '8px 0 4px', letterSpacing: '-0.02em' }}>
                        {formatCalcAmount(calculations.totalInterest, currency)}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748B' }}>
                        Total Repayment: {formatCalcAmount(calculations.totalRepayment, currency)}
                    </div>
                </div>
            </div>

            {/* 3. Main Two-Column Interactive Engine */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '24px', marginBottom: '24px', alignItems: 'start' }}>

                {/* LEFT COLUMN: Controls & Sliders */}
                <div className="oripio-card oripio-white-card" style={{ padding: '24px', minHeight: 'auto', display: 'flex', flexDirection: 'column', gap: '22px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F1F5F9', paddingBottom: '14px' }}>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>⚙️</span> Financial &amp; Loan Parameters
                        </h3>
                        <span style={{ fontSize: '12px', color: '#2563EB', fontWeight: '700', background: '#EFF6FF', padding: '3px 10px', borderRadius: '6px', border: '1px solid #BFDBFE' }}>
                            {activeLoanType.name}
                        </span>
                    </div>

                    {/* 1. Monthly Net Income */}
                    <div className="calc-slider-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                                NET MONTHLY IN-HAND INCOME
                            </label>
                            <div style={{ display: 'flex', alignItems: 'center', background: '#F8FAFC', borderRadius: '8px', padding: '4px 10px', border: '1px solid #CBD5E1' }}>
                                <span style={{ fontSize: '13px', color: '#2563EB', marginRight: '6px', fontWeight: '700' }}>{currency}</span>
                                <input
                                    type="number"
                                    min="5000"
                                    max="5000000"
                                    step="1000"
                                    value={monthlyIncome}
                                    onChange={(e) => setMonthlyIncome(Number(e.target.value))}
                                    style={{ background: 'transparent', border: 'none', color: '#0F172A', fontSize: '14px', fontWeight: '700', width: '100px', textAlign: 'right', outline: 'none' }}
                                />
                            </div>
                        </div>
                        <input
                            type="range"
                            min="10000"
                            max="500000"
                            step="2000"
                            value={Math.min(500000, monthlyIncome)}
                            onChange={(e) => setMonthlyIncome(Number(e.target.value))}
                            style={getSliderFill(Math.min(500000, monthlyIncome), 10000, 500000, '#2563eb')}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                            <span>{formatCalcAmount(10000, currency)}</span>
                            <span>{formatCalcAmount(250000, currency)}</span>
                            <span>{formatCalcAmount(500000, currency)}+</span>
                        </div>
                    </div>

                    {/* 2. Existing Monthly EMIs / Liabilities */}
                    <div className="calc-slider-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                                EXISTING MONTHLY EMIS / DEBTS
                            </label>
                            <div style={{ display: 'flex', alignItems: 'center', background: '#F8FAFC', borderRadius: '8px', padding: '4px 10px', border: '1px solid #CBD5E1' }}>
                                <span style={{ fontSize: '13px', color: '#DC2626', marginRight: '6px', fontWeight: '700' }}>{currency}</span>
                                <input
                                    type="number"
                                    min="0"
                                    max="500000"
                                    step="500"
                                    value={existingEmi}
                                    onChange={(e) => setExistingEmi(Number(e.target.value))}
                                    style={{ background: 'transparent', border: 'none', color: '#0F172A', fontSize: '14px', fontWeight: '700', width: '90px', textAlign: 'right', outline: 'none' }}
                                />
                            </div>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="150000"
                            step="1000"
                            value={Math.min(150000, existingEmi)}
                            onChange={(e) => setExistingEmi(Number(e.target.value))}
                            style={getSliderFill(Math.min(150000, existingEmi), 0, 150000, '#DC2626')}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                            <span>{formatCalcAmount(0, currency)}</span>
                            <span>{formatCalcAmount(75000, currency)}</span>
                            <span>{formatCalcAmount(150000, currency)}+</span>
                        </div>
                    </div>

                    {/* 3. Desired Loan Amount */}
                    <div className="calc-slider-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                                DESIRED / REQUESTED LOAN AMOUNT
                            </label>
                            <div style={{ display: 'flex', alignItems: 'center', background: '#F8FAFC', borderRadius: '8px', padding: '4px 10px', border: '1px solid #CBD5E1' }}>
                                <span style={{ fontSize: '13px', color: '#7C3AED', marginRight: '6px', fontWeight: '700' }}>{currency}</span>
                                <input
                                    type="number"
                                    min="50000"
                                    max={activeLoanType.maxAmount}
                                    step={activeLoanType.step}
                                    value={desiredAmount}
                                    onChange={(e) => setDesiredAmount(Number(e.target.value))}
                                    style={{ background: 'transparent', border: 'none', color: '#0F172A', fontSize: '14px', fontWeight: '700', width: '110px', textAlign: 'right', outline: 'none' }}
                                />
                            </div>
                        </div>
                        <input
                            type="range"
                            min="50000"
                            max={activeLoanType.maxAmount}
                            step={activeLoanType.step}
                            value={desiredAmount}
                            onChange={(e) => setDesiredAmount(Number(e.target.value))}
                            style={getSliderFill(desiredAmount, 50000, activeLoanType.maxAmount, '#7C3AED')}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                            <span>{formatCalcAmount(50000, currency)}</span>
                            <span>{formatCalcAmount(activeLoanType.maxAmount / 2, currency)}</span>
                            <span>{formatCalcAmount(activeLoanType.maxAmount, currency)}</span>
                        </div>
                    </div>

                    {/* 4. Loan Tenure & Interest Rate Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        {/* Tenure */}
                        <div className="calc-slider-group">
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <label style={{ fontSize: '12.5px', fontWeight: '600', color: '#334155' }}>TENURE</label>
                                <span style={{ fontWeight: '700', color: '#2563EB', fontSize: '14px' }}>{tenureYears} Years</span>
                            </div>
                            <input
                                type="range"
                                min="1"
                                max={activeLoanType.maxTenure}
                                step="1"
                                value={tenureYears}
                                onChange={(e) => setTenureYears(Number(e.target.value))}
                                style={getSliderFill(tenureYears, 1, activeLoanType.maxTenure, '#2563EB')}
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                                <span>1 yr</span>
                                <span>{activeLoanType.maxTenure} yrs</span>
                            </div>
                        </div>

                        {/* Interest Rate */}
                        <div className="calc-slider-group">
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <label style={{ fontSize: '12.5px', fontWeight: '600', color: '#334155' }}>INTEREST RATE</label>
                                <span style={{ fontWeight: '700', color: '#D97706', fontSize: '14px' }}>{interestRate}% p.a.</span>
                            </div>
                            <input
                                type="range"
                                min="6.0"
                                max="18.0"
                                step="0.1"
                                value={interestRate}
                                onChange={(e) => setInterestRate(Number(e.target.value))}
                                style={getSliderFill(interestRate, 6.0, 18.0, '#D97706')}
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                                <span>6.0%</span>
                                <span>18.0%</span>
                            </div>
                        </div>
                    </div>

                    {/* 5. Credit Score Slider & Rating */}
                    <div className="calc-slider-group" style={{ background: '#F8FAFC', padding: '14px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <div>
                                <label style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A' }}>CREDIT SCORE (CIBIL / EXPERIAN)</label>
                                <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>Affects bank approval and interest rates</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <span style={{ fontSize: '18px', fontWeight: '800', color: creditTier.color }}>{creditScore}</span>
                                <div style={{ fontSize: '11px', fontWeight: '700', color: creditTier.color, background: creditTier.bg, border: `1px solid ${creditTier.border}`, padding: '2px 8px', borderRadius: '6px', marginTop: '2px' }}>
                                    {creditTier.label}
                                </div>
                            </div>
                        </div>
                        <input
                            type="range"
                            min="300"
                            max="900"
                            step="5"
                            value={creditScore}
                            onChange={(e) => setCreditScore(Number(e.target.value))}
                            style={getSliderFill(creditScore, 300, 900, creditTier.color)}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                            <span>300 (Poor)</span>
                            <span>650 (Fair)</span>
                            <span>750 (Prime)</span>
                            <span>900 (Perfect)</span>
                        </div>
                    </div>

                    {/* Advanced Settings Toggle */}
                    <div>
                        <button
                            type="button"
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#2563EB',
                                fontSize: '12.5px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: 0
                            }}
                        >
                            <span>{showAdvanced ? '▲ Hide Advanced Bank Settings' : '▼ Advanced Bank FOIR Settings'}</span>
                        </button>

                        {showAdvanced && (
                            <div style={{ marginTop: '12px', padding: '14px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#334155' }}>Bank FOIR Limit (%)</label>
                                    <span style={{ fontSize: '12.5px', fontWeight: '700', color: '#2563EB' }}>{customFoir}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="30"
                                    max="65"
                                    step="1"
                                    value={customFoir}
                                    onChange={(e) => setCustomFoir(Number(e.target.value))}
                                    style={getSliderFill(customFoir, 30, 65, '#2563EB')}
                                />
                                <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', lineHeight: '1.4' }}>
                                    Standard Indian &amp; Global banking regulation permits 40% to 50% max DTI for individual borrowers.
                                </div>

                                <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                                    {['salaried', 'self_employed', 'business'].map(type => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => setEmploymentType(type)}
                                            style={{
                                                fontSize: '11px',
                                                padding: '5px 12px',
                                                borderRadius: '6px',
                                                border: employmentType === type ? '1px solid #2563EB' : '1px solid #CBD5E1',
                                                background: employmentType === type ? '#2563EB' : '#FFFFFF',
                                                color: employmentType === type ? '#FFFFFF' : '#475569',
                                                fontWeight: employmentType === type ? '700' : '500',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {type === 'salaried' ? 'Salaried' : type === 'self_employed' ? 'Self-Employed' : 'Business'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT COLUMN: Real-Time Assessment & Visual Breakdown */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    {/* 1. Approval Likelihood Verdict Card */}
                    <div
                        className="oripio-card oripio-white-card"
                        style={{
                            padding: '24px',
                            minHeight: 'auto',
                            borderLeft: `4px solid ${
                                calculations.verdictType === 'success' ? '#059669' : calculations.verdictType === 'warning' ? '#D97706' : '#DC2626'
                            }`,
                            background: '#FFFFFF'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                            <div>
                                <span style={{
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.6px',
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                    background: calculations.verdictType === 'success' ? '#ECFDF5' : calculations.verdictType === 'warning' ? '#FFFBEB' : '#FEF2F2',
                                    color: calculations.verdictType === 'success' ? '#059669' : calculations.verdictType === 'warning' ? '#D97706' : '#DC2626',
                                    border: `1px solid ${calculations.verdictType === 'success' ? '#A7F3D0' : calculations.verdictType === 'warning' ? '#FDE68A' : '#FECACA'}`
                                }}>
                                    {calculations.verdict}
                                </span>
                                <h3 style={{ margin: '10px 0 4px', fontSize: '18px', fontWeight: '800', color: '#0F172A' }}>
                                    {calculations.isEligible ? 'Eligible for Loan' : 'Eligibility Review Required'}
                                </h3>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '26px', fontWeight: '800', color: calculations.verdictType === 'success' ? '#059669' : calculations.verdictType === 'warning' ? '#D97706' : '#DC2626' }}>
                                    {calculations.approvalChance}%
                                </div>
                                <div style={{ fontSize: '10px', color: '#64748B', textTransform: 'uppercase', fontWeight: '700' }}>Approval Odds</div>
                            </div>
                        </div>

                        <p style={{ fontSize: '13px', color: '#475569', lineHeight: '1.5', margin: '0 0 16px' }}>
                            {calculations.verdictDesc}
                        </p>

                        {/* Approval probability progress bar */}
                        <div style={{ width: '100%', height: '8px', background: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
                            <div
                                style={{
                                    width: `${calculations.approvalChance}%`,
                                    height: '100%',
                                    background: calculations.verdictType === 'success'
                                        ? 'linear-gradient(90deg, #059669, #10b981)'
                                        : calculations.verdictType === 'warning'
                                        ? 'linear-gradient(90deg, #d97706, #f59e0b)'
                                        : 'linear-gradient(90deg, #dc2626, #ef4444)',
                                    transition: 'width 0.4s ease'
                                }}
                            />
                        </div>
                    </div>

                    {/* 2. FOIR / Monthly Income Utilization Meter */}
                    <div className="oripio-card oripio-white-card" style={{ padding: '24px', minHeight: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#0F172A' }}>
                                📊 Income Allocation &amp; Debt-to-Income (DTI)
                            </h4>
                            <span style={{ fontSize: '12px', fontWeight: '700', color: calculations.projectedDti <= calculations.foirPct ? '#059669' : '#DC2626' }}>
                                {calculations.projectedDti}% Total DTI
                            </span>
                        </div>

                        {/* 3-segment progress bar */}
                        <div style={{ height: '14px', width: '100%', borderRadius: '7px', background: '#E2E8F0', display: 'flex', overflow: 'hidden', marginBottom: '14px' }}>
                            <div
                                style={{
                                    width: `${Math.min(100, calculations.existingDti)}%`,
                                    background: '#EF4444',
                                    transition: 'width 0.3s ease'
                                }}
                                title={`Existing EMIs: ${calculations.existingDti}%`}
                            />
                            <div
                                style={{
                                    width: `${Math.min(100 - calculations.existingDti, calculations.newLoanDti)}%`,
                                    background: calculations.projectedDti <= calculations.foirPct ? '#2563EB' : '#F59E0B',
                                    transition: 'width 0.3s ease'
                                }}
                                title={`New Loan EMI: ${calculations.newLoanDti}%`}
                            />
                            <div
                                style={{
                                    width: `${calculations.surplusDti}%`,
                                    background: '#059669',
                                    transition: 'width 0.3s ease'
                                }}
                                title={`Disposable Surplus: ${calculations.surplusDti}%`}
                            />
                        </div>

                        {/* Legend */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '12px', color: '#334155' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444' }} />
                                <span>Existing: <strong style={{ color: '#0F172A' }}>{calculations.existingDti}%</strong></span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2563EB' }} />
                                <span>New EMI: <strong style={{ color: '#0F172A' }}>{calculations.newLoanDti}%</strong></span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#059669' }} />
                                <span>Surplus: <strong style={{ color: '#0F172A' }}>{calculations.surplusDti}%</strong></span>
                            </div>
                        </div>
                    </div>

                    {/* 3. Actionable Insights to Boost Eligibility */}
                    <div className="oripio-card oripio-white-card" style={{ padding: '24px', minHeight: 'auto' }}>
                        <h4 style={{ margin: '0 0 14px', fontSize: '14px', fontWeight: '700', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>💡</span> AI Financial Insights &amp; Boost Tips
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: '#334155' }}>
                            {calculations.debt > 0 && (
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', background: '#F8FAFC', padding: '12px 14px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                                    <span style={{ color: '#059669', fontWeight: 'bold', fontSize: '16px' }}>✓</span>
                                    <div style={{ lineHeight: '1.4' }}>
                                        <strong style={{ color: '#0F172A' }}>Debt Relief:</strong> Clearing your {formatCalcAmount(calculations.debt, currency)} existing EMI could increase your maximum eligible loan by roughly{' '}
                                        <strong style={{ color: '#059669' }}>
                                            {formatCalcAmount(Math.round(calculations.debt * ((1 - Math.pow(1 + (calculations.rate / 1200), -calculations.tenure * 12)) / (calculations.rate / 1200))), currency)}
                                        </strong>.
                                    </div>
                                </div>
                            )}

                            {calculations.tenure < activeLoanType.maxTenure && (
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', background: '#F8FAFC', padding: '12px 14px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                                    <span style={{ color: '#2563EB', fontWeight: 'bold', fontSize: '16px' }}>✓</span>
                                    <div style={{ lineHeight: '1.4' }}>
                                        <strong style={{ color: '#0F172A' }}>Tenure Extension:</strong> Extending tenure to {activeLoanType.maxTenure} years lowers monthly payment and instantly elevates eligibility.
                                    </div>
                                </div>
                            )}

                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', background: '#F8FAFC', padding: '12px 14px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                                <span style={{ color: '#D97706', fontWeight: 'bold', fontSize: '16px' }}>✓</span>
                                <div style={{ lineHeight: '1.4' }}>
                                    <strong style={{ color: '#0F172A' }}>Co-Borrower Option:</strong> Adding an earning spouse or family member as co-applicant pools income and can raise borrowing ceiling by 40% - 60%.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 4. Amortization / Annual Schedule Toggle Section */}
            <div className="oripio-card oripio-white-card" style={{ padding: '24px', minHeight: 'auto', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                        <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: '700', color: '#0F172A' }}>
                            📅 Annual Repayment &amp; Amortization Schedule
                        </h3>
                        <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>
                            Year-by-year breakdown of principal repayment, accrued interest, and loan balance.
                        </p>
                    </div>
                    <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => setShowAmortization(!showAmortization)}
                        style={{
                            fontSize: '12px',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            background: '#F8FAFC',
                            border: '1px solid #CBD5E1',
                            color: '#0F172A',
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}
                    >
                        {showAmortization ? 'Hide Full Schedule' : 'View Full Schedule'}
                    </button>
                </div>

                {showAmortization && (
                    <div style={{ overflowX: 'auto', marginTop: '18px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                            <thead>
                                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569' }}>
                                    <th style={{ padding: '12px 14px', fontWeight: '600' }}>Year</th>
                                    <th style={{ padding: '12px 14px', fontWeight: '600' }}>Principal Repaid</th>
                                    <th style={{ padding: '12px 14px', fontWeight: '600' }}>Interest Paid</th>
                                    <th style={{ padding: '12px 14px', fontWeight: '600' }}>Total Annual Payment</th>
                                    <th style={{ padding: '12px 14px', fontWeight: '600' }}>Remaining Balance</th>
                                </tr>
                            </thead>
                            <tbody>
                                {calculations.yearlySchedule.map((row) => (
                                    <tr key={row.year} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                        <td style={{ padding: '12px 14px', fontWeight: '700', color: '#0F172A' }}>Year {row.year}</td>
                                        <td style={{ padding: '12px 14px', color: '#2563EB', fontWeight: '600' }}>{formatCalcAmount(row.principalPaid, currency)}</td>
                                        <td style={{ padding: '12px 14px', color: '#D97706', fontWeight: '600' }}>{formatCalcAmount(row.interestPaid, currency)}</td>
                                        <td style={{ padding: '12px 14px', color: '#334155' }}>{formatCalcAmount(row.totalPaid, currency)}</td>
                                        <td style={{ padding: '12px 14px', fontWeight: '700', color: row.remainingBalance === 0 ? '#059669' : '#0F172A' }}>
                                            {formatCalcAmount(row.remainingBalance, currency)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
