import React, { useState } from 'react';
import TransactionTable from '../dashboard/TransactionTable';
import AddTransactionModal from '../dashboard/AddTransactionModal';

export default function ExpensesView() {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    return (
        <div id="expensesPage" className="page-view">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Expenses &amp; Cash Outflow</h1>
                    <p className="page-subtitle">Search, filter, and analyze every transaction across your accounts.</p>
                </div>
            </div>

            <div className="table-section" style={{ marginTop: '20px' }}>
                <TransactionTable onOpenAddModal={() => setIsAddModalOpen(true)} />
            </div>

            <AddTransactionModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
            />
        </div>
    );
}
