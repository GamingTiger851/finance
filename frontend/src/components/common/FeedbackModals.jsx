import React from 'react';
import { useFinance } from '../../context/FinanceContext';

export function ConfirmModal() {
    const { confirmState, closeConfirm } = useFinance();
    if (!confirmState.isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-box confirm-box">
                <h3>{confirmState.title || 'Are you sure?'}</h3>
                <p>{confirmState.message || 'This action cannot be undone.'}</p>
                <div className="confirm-actions">
                    <button className="btn btn-cancel" onClick={closeConfirm}>Cancel</button>
                    <button className="btn btn-danger" onClick={confirmState.onConfirm}>Confirm</button>
                </div>
            </div>
        </div>
    );
}

export function Toast() {
    const { toastMessage, toastVisible } = useFinance();
    return (
        <div className={`toast ${toastVisible ? 'show' : ''}`} id="toast">
            {toastMessage}
        </div>
    );
}
