import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { CATEGORIES } from '../../constants';

export default function AddTransactionModal({ isOpen, onClose, defaultType = 'expense' }) {
    const { addTransaction } = useFinance();
    const [type, setType] = useState(defaultType);
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState(CATEGORIES[0]);
    const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [error, setError] = useState('');

    React.useEffect(() => {
        if (isOpen) {
            setType(defaultType);
        }
    }, [isOpen, defaultType]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        if (!description.trim() || !amount || parseFloat(amount) <= 0) {
            setError('Please fill in all fields with valid values before saving.');
            return;
        }

        addTransaction({
            description,
            amount: parseFloat(amount),
            type,
            category,
            date
        });

        // Reset and close
        setDescription('');
        setAmount('');
        setType('expense');
        setCategory(CATEGORIES[0]);
        setDate(new Date().toISOString().split('T')[0]);
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="modal-box">
                <div className="modal-header">
                    <h2>Add Transaction</h2>
                    <button className="btn-icon" onClick={onClose} aria-label="Close modal">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="type-toggle">
                        <button
                            type="button"
                            className={`toggle-btn ${type === 'income' ? 'active-income' : ''}`}
                            onClick={() => setType('income')}
                        >
                            Income
                        </button>
                        <button
                            type="button"
                            className={`toggle-btn ${type === 'expense' ? 'active-expense' : ''}`}
                            onClick={() => setType('expense')}
                        >
                            Expense
                        </button>
                    </div>

                    <div className="form-group">
                        <label>Description</label>
                        <input
                            type="text"
                            placeholder="e.g. Salary, Groceries, Rent"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Amount</label>
                        <input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Date</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Category</label>
                        <select value={category} onChange={(e) => setCategory(e.target.value)}>
                            {CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    {error && <div className="form-error" style={{ display: 'block' }}>{error}</div>}

                    <button type="submit" className="btn btn-save-dark btn-block">
                        Save Transaction
                    </button>
                </form>
            </div>
        </div>
    );
}
