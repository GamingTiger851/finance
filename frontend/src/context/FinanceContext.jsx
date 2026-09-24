import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const FinanceContext = createContext(null);

function getTransactionKey(username) {
    return `fintrack_transactions_${username}`;
}

function getGoalsKey(username) {
    return `fintrack_goals_${username}`;
}

export function FinanceProvider({ children }) {
    const { currentUser } = useAuth();
    const [transactions, setTransactions] = useState([]);
    const [goals, setGoals] = useState([]);
    const [currentFilter, setCurrentFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    
    // Toast notification state
    const [toastMessage, setToastMessage] = useState(null);
    const [toastVisible, setToastVisible] = useState(false);

    // Confirm dialog state
    const [confirmState, setConfirmState] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: null
    });

    // Load user's transactions and goals
    useEffect(() => {
        if (!currentUser) {
            setTransactions([]);
            setGoals([]);
            return;
        }

        try {
            const raw = localStorage.getItem(getTransactionKey(currentUser));
            const list = raw ? JSON.parse(raw) : [];
            setTransactions(Array.isArray(list) ? list : []);
        } catch (e) {
            console.error('Failed to load transactions:', e);
            setTransactions([]);
        }

        try {
            const rawGoals = localStorage.getItem(getGoalsKey(currentUser));
            const goalList = rawGoals ? JSON.parse(rawGoals) : [];
            setGoals(Array.isArray(goalList) ? goalList : []);
        } catch (e) {
            console.error('Failed to load goals:', e);
            setGoals([]);
        }
    }, [currentUser]);

    // Save transactions helper
    const saveList = (newList) => {
        if (!currentUser) return;
        setTransactions(newList);
        localStorage.setItem(getTransactionKey(currentUser), JSON.stringify(newList));
    };

    // Save goals helper
    const saveGoals = (newList) => {
        if (!currentUser) return;
        setGoals(newList);
        localStorage.setItem(getGoalsKey(currentUser), JSON.stringify(newList));
    };

    const addGoal = (goalData) => {
        const newGoal = {
            id: 'goal_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            title: goalData.title.trim(),
            current: parseFloat(goalData.current) || 0,
            target: parseFloat(goalData.target) || 0,
            date: goalData.date || 'Dec 2026',
            category: goalData.category || 'Personal',
            color: goalData.color || '#10b981'
        };
        const updated = [newGoal, ...goals];
        saveGoals(updated);
        showToast(`Goal "${newGoal.title}" created successfully!`);
        return newGoal;
    };

    const contributeToGoal = (goalId, amount) => {
        const contribution = Number(amount);
        if (!Number.isFinite(contribution) || contribution <= 0) {
            showToast('Enter a contribution greater than zero.');
            return false;
        }
        if (!goals.some(goal => goal.id === goalId)) {
            showToast('That goal could not be found. Refresh and try again.');
            return false;
        }
        const updated = goals.map(goal => goal.id === goalId
            ? { ...goal, current: (Number(goal.current) || 0) + contribution }
            : goal);
        saveGoals(updated);
        showToast('Goal contribution saved.');
        return true;
    };

    const deleteGoal = (id) => {
        const updated = goals.filter(g => g.id !== id);
        saveGoals(updated);
        showToast('Goal deleted.');
    };

    const clearAllGoals = () => {
        saveGoals([]);
        showToast('All financial goals cleared.');
    };

    const addTransaction = (txnData) => {
        const type = txnData.type === 'income' ? 'income' : 'expense';
        const newTxn = {
            id: 'txn_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
            description: txnData.description.trim(),
            amount: parseFloat(txnData.amount) || 0,
            type,
            category: txnData.category || 'Other',
            date: txnData.date || new Date().toISOString().split('T')[0]
        };

        const updated = [newTxn, ...transactions];
        saveList(updated);
        // Keep the new record visible even when the table was filtered to the other type.
        setCurrentFilter(type);
        showToast(`${type === 'income' ? 'Income' : 'Expense'} added successfully!`);
        return newTxn;
    };

    const deleteTransaction = (id) => {
        const updated = transactions.filter(t => t.id !== id);
        saveList(updated);
        showToast('Transaction deleted.');
    };

    const clearAllExpenses = () => {
        const remaining = transactions.filter(t => t.type !== 'expense');
        saveList(remaining);
        showToast('All expenses cleared successfully.');
    };

    const clearAllTransactions = () => {
        saveList([]);
        showToast('All transaction history cleared.');
    };

    const resetToDemoData = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();

        const makeDate = (monthsAgo, day) => {
            const d = new Date(year, month - monthsAgo, day);
            return d.toISOString().split('T')[0];
        };

        const demoList = [
            // Current month (0 months ago)
            { id: 'd1', description: 'Salary Credit', amount: 75000, type: 'income', category: 'Salary', date: makeDate(0, 1) },
            { id: 'd2', description: 'Zomato Food Delivery', amount: 1450, type: 'expense', category: 'Food & Dining', date: makeDate(0, 18) },
            { id: 'd3', description: 'Uber Rides', amount: 820, type: 'expense', category: 'Transport', date: makeDate(0, 15) },
            { id: 'd4', description: 'Electricity & Wifi Bill', amount: 2400, type: 'expense', category: 'Bills & Utilities', date: makeDate(0, 12) },
            { id: 'd5', description: 'Amazon Shopping', amount: 3200, type: 'expense', category: 'Shopping', date: makeDate(0, 10) },
            { id: 'd6', description: 'Medicines & Health', amount: 850, type: 'expense', category: 'Health', date: makeDate(0, 8) },
            { id: 'd7', description: 'House Maintenance', amount: 1500, type: 'expense', category: 'Other', date: makeDate(0, 5) },
            // 1 month ago
            { id: 'd8', description: 'Salary Credit', amount: 75000, type: 'income', category: 'Salary', date: makeDate(1, 1) },
            { id: 'd9', description: 'Home Renovation & Utilities', amount: 45000, type: 'expense', category: 'Bills & Utilities', date: makeDate(1, 15) },
            // 2 months ago
            { id: 'd10', description: 'Salary Credit', amount: 70000, type: 'income', category: 'Salary', date: makeDate(2, 1) },
            { id: 'd11', description: 'Travel & Vacation', amount: 36000, type: 'expense', category: 'Transport', date: makeDate(2, 15) },
            // 3 months ago
            { id: 'd12', description: 'Salary Credit', amount: 70000, type: 'income', category: 'Salary', date: makeDate(3, 1) },
            { id: 'd13', description: 'Quarterly Bills & Shopping', amount: 33000, type: 'expense', category: 'Shopping', date: makeDate(3, 15) },
            // 4 months ago
            { id: 'd14', description: 'Salary Credit', amount: 68000, type: 'income', category: 'Salary', date: makeDate(4, 1) },
            { id: 'd15', description: 'Living Expenses', amount: 31000, type: 'expense', category: 'Food & Dining', date: makeDate(4, 15) },
            // 5 months ago
            { id: 'd16', description: 'Salary Credit', amount: 68000, type: 'income', category: 'Salary', date: makeDate(5, 1) },
            { id: 'd17', description: 'Household Setup', amount: 26000, type: 'expense', category: 'Bills & Utilities', date: makeDate(5, 15) }
        ];

        saveList(demoList);
        showToast('Reset to demo data successfully.');
    };

    const calculateTotals = () => {
        let income = 0;
        let expense = 0;
        transactions.forEach(t => {
            if (t.type === 'income') income += t.amount;
            else expense += t.amount;
        });
        return { income, expense, balance: income - expense };
    };

    const filteredTransactions = transactions.filter(t => {
        if (currentFilter !== 'all' && t.type !== currentFilter) return false;
        if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase();
            return t.description.toLowerCase().includes(q) || t.category.toLowerCase().includes(q);
        }
        return true;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));

    const showToast = (message) => {
        setToastMessage(message);
        setToastVisible(true);
        setTimeout(() => {
            setToastVisible(false);
        }, 2600);
    };

    const showConfirm = (title, message, onConfirm) => {
        setConfirmState({
            isOpen: true,
            title,
            message,
            onConfirm: () => {
                setConfirmState(prev => ({ ...prev, isOpen: false }));
                if (onConfirm) onConfirm();
            }
        });
    };

    const closeConfirm = () => {
        setConfirmState(prev => ({ ...prev, isOpen: false }));
    };

    return (
        <FinanceContext.Provider value={{
            transactions,
            filteredTransactions,
            currentFilter,
            setCurrentFilter,
            searchQuery,
            setSearchQuery,
            addTransaction,
            deleteTransaction,
            clearAllExpenses,
            clearAllTransactions,
            resetToDemoData,
            goals,
            addGoal,
            contributeToGoal,
            deleteGoal,
            clearAllGoals,
            calculateTotals,
            showToast,
            toastMessage,
            toastVisible,
            showConfirm,
            closeConfirm,
            confirmState
        }}>
            {children}
        </FinanceContext.Provider>
    );
}

export function useFinance() {
    const context = useContext(FinanceContext);
    if (!context) throw new Error('useFinance must be used within a FinanceProvider');
    return context;
}
