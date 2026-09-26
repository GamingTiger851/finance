import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FinanceProvider } from './context/FinanceContext';
import Fireflies from './components/layout/Fireflies';
import TopNavbar from './components/layout/TopNavbar';
import Sidebar from './components/layout/Sidebar';
import AuthPage from './components/auth/AuthPage';
import DashboardView from './components/dashboard/DashboardView';
import ExpensesView from './components/expenses/ExpensesView';
import GoalsView from './components/goals/GoalsView';
import StocksView from './components/stocks/StocksView';
import BondMarketView from './components/stocks/BondMarketView';
import AdvisorView from './components/advisor/AdvisorView';
import CalculatorsView from './components/calculators/CalculatorsView';
import LoanEligibilityView from './components/loans/LoanEligibilityView';
import SettingsView from './components/settings/SettingsView';
import BudgetPlannerView from './components/budget/BudgetPlannerView';
import AnalyticsView from './components/analytics/AnalyticsView';
import RecurringTransactionsView from './components/recurring/RecurringTransactionsView';
import ReportsView from './components/reports/ReportsView';
import AdminDashboard from './components/admin/AdminDashboard';
import AppFooter from './components/layout/AppFooter';
import { ConfirmModal, Toast } from './components/common/FeedbackModals';

import ResetPasswordPage from './components/auth/ResetPasswordPage';

function MainLayout() {
    const { isAuthenticated, authLoading } = useAuth();
    const [currentPage, setCurrentPage] = useState('dashboard');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        window.scrollTo(0, 0);
        document.querySelector('.main-area')?.scrollTo(0, 0);
    }, [currentPage]);

    useEffect(() => {
        document.body.classList.toggle('mobile-menu-open', isMobileMenuOpen);
        return () => document.body.classList.remove('mobile-menu-open');
    }, [isMobileMenuOpen]);

    const handleGlobalSearch = (query) => {
        const q = query.toLowerCase().trim();
        if (q.includes('dashboard') || q.includes('home')) setCurrentPage('dashboard');
        else if (q.includes('expense') || q.includes('transaction')) setCurrentPage('expenses');
        else if (q.includes('budget') || q.includes('plan')) setCurrentPage('budget');
        else if (q.includes('analytic') || q.includes('chart')) setCurrentPage('analytics');
        else if (q.includes('recurring') || q.includes('subscription')) setCurrentPage('recurring');
        else if (q.includes('report') || q.includes('summary')) setCurrentPage('reports');
        else if (q.includes('goal') || q.includes('target')) setCurrentPage('goals');
        else if (q.includes('bond') || q.includes('g-sec') || q.includes('treasury bill')) setCurrentPage('bonds');
        else if (q.includes('stock') || q.includes('market') || q.includes('invest')) setCurrentPage('stocks');
        else if (q.includes('advisor') || q.includes('ai') || q.includes('chat')) setCurrentPage('advisor');
        else if (q.includes('calculator') || q.includes('calc') || q.includes('sip')) setCurrentPage('calculators');
        else if (q.includes('loan') || q.includes('emi') || q.includes('borrow')) setCurrentPage('loan-eligibility');
        else if (q.includes('setting') || q.includes('profile')) setCurrentPage('settings');
        else if (q.includes('admin') || q.includes('manage')) setCurrentPage('admin');
        // If no match, we just let the toast show that it was searched.
    };

    if (authLoading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#080808', color: '#fff' }}>
                <div className="btn-spinner" style={{ display: 'inline-block', width: '32px', height: '32px' }} />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <AuthPage />;
    }

    return (
        <div id="appWrap" className="app-layout">
            <div className="top-strip" />
            <TopNavbar
                onNavigate={setCurrentPage}
                onMenuToggle={() => setIsMobileMenuOpen(open => !open)}
                isMobileMenuOpen={isMobileMenuOpen}
                onSearch={handleGlobalSearch}
            />
            <Sidebar
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                isMobileOpen={isMobileMenuOpen}
                onMobileClose={() => setIsMobileMenuOpen(false)}
            />
            <main className="main-area">
                {currentPage === 'dashboard' && <DashboardView onNavigate={setCurrentPage} />}
                {currentPage === 'expenses' && <ExpensesView />}
                {currentPage === 'budget' && <BudgetPlannerView onNavigate={setCurrentPage} />}
                {currentPage === 'analytics' && <AnalyticsView onNavigate={setCurrentPage} />}
                {currentPage === 'recurring' && <RecurringTransactionsView />}
                {currentPage === 'reports' && <ReportsView />}
                {currentPage === 'goals' && <GoalsView />}
                {(currentPage === 'stocks' || currentPage === 'markets') && <StocksView />}
                {currentPage === 'bonds' && <BondMarketView />}
                {(currentPage === 'advisor' || currentPage === 'portfolio-risk') && (
                    <AdvisorView initialTab={currentPage === 'portfolio-risk' ? 'risk' : 'chatbot'} />
                )}
                {currentPage === 'calculators' && <CalculatorsView />}
                {currentPage === 'loan-eligibility' && <LoanEligibilityView />}
                {currentPage === 'settings' && <SettingsView />}
                {currentPage === 'admin' && <AdminDashboard />}

                <AppFooter />
            </main>
            <ConfirmModal />
            <Toast />
        </div>
    );
}

export default function App() {
    if (window.location.pathname === '/reset-password') {
        return <ResetPasswordPage />;
    }

    return (
        <AuthProvider>
            <FinanceProvider>
                <Fireflies count={35} />
                <MainLayout />
            </FinanceProvider>
        </AuthProvider>
    );
}
