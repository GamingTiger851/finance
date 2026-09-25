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
    const [currentPage, setCurrentPage] = useState('stocks');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        window.scrollTo(0, 0);
        document.querySelector('.main-area')?.scrollTo(0, 0);
    }, [currentPage]);

    useEffect(() => {
        document.body.classList.toggle('mobile-menu-open', isMobileMenuOpen);
        return () => document.body.classList.remove('mobile-menu-open');
    }, [isMobileMenuOpen]);

    if (authLoading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#080808', color: '#fff' }}>
                <div className="btn-spinner" style={{ display: 'inline-block', width: '32px', height: '32px' }} />
            </div>
        );
    }

    if (!isAuthenticated && currentPage !== 'stocks') {
        return <AuthPage />;
    }

    return (
        <div id="appWrap" className="app-layout">
            <div className="top-strip" />
            <TopNavbar
                onNavigate={setCurrentPage}
                onMenuToggle={() => setIsMobileMenuOpen(open => !open)}
                isMobileMenuOpen={isMobileMenuOpen}
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
