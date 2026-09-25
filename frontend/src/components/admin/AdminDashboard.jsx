import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import './admin.css';

export default function AdminDashboard() {
    const { userRole } = useAuth();
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [settings, setSettings] = useState(null);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState('');

    const headers = {
        'Authorization': `Bearer ${localStorage.getItem('fintrack_jwt_access')}`,
        'Content-Type': 'application/json'
    };

    const fetchAdminData = async () => {
        try {
            const [statsRes, usersRes, settingsRes, logsRes] = await Promise.all([
                fetch('/api/admin/stats', { headers }),
                fetch('/api/admin/users', { headers }),
                fetch('/api/admin/settings', { headers }),
                fetch('/api/admin/logs', { headers })
            ]);

            if (!statsRes.ok || !usersRes.ok || !settingsRes.ok || !logsRes.ok) 
                throw new Error('Failed to fetch admin data');

            setStats(await statsRes.json());
            setUsers(await usersRes.json());
            setSettings(await settingsRes.json());
            setLogs(await logsRes.json());
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (userRole === 'admin') fetchAdminData();
        else {
            setError('Access Denied. Admins only.');
            setLoading(false);
        }
    }, [userRole]);

    const handleRoleChange = async (id, newRole) => {
        try {
            const res = await fetch(`/api/admin/users/${id}/role`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ role: newRole })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setMessage(data.message);
            fetchAdminData();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDeleteUser = async (id) => {
        if (!window.confirm('Are you sure you want to delete this user?')) return;
        try {
            const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE', headers });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setMessage(data.message);
            fetchAdminData();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleClearCache = async () => {
        try {
            const res = await fetch('/api/admin/clear-cache', { method: 'POST', headers });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setMessage(data.message);
        } catch (err) {
            setError(err.message);
        }
    };

    const handleSaveSettings = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/admin/settings', {
                method: 'PATCH',
                headers,
                body: JSON.stringify(settings)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setMessage('Settings saved successfully');
        } catch (err) {
            setError(err.message);
        }
    };

    if (loading) return <div className="admin-loading"><div className="btn-spinner" /> Loading Admin Panel...</div>;
    
    if (error && userRole !== 'admin') return (
        <div className="admin-dashboard container-card">
            <h2>Admin Panel</h2>
            <div className="alert-box error">{error}</div>
        </div>
    );

    return (
        <div className="admin-dashboard container-card animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <h2 className="admin-title">Admin Dashboard</h2>
            {message && <div className="alert-box success" onClick={() => setMessage('')}>{message}</div>}
            {error && <div className="alert-box error" onClick={() => setError('')}>{error}</div>}
            
            {/* 6. Platform Analytics */}
            <h3 className="section-title">Platform Analytics</h3>
            <div className="admin-stats-grid">
                <div className="stat-card">
                    <div className="stat-label">Total Users</div>
                    <div className="stat-value">{stats?.totalUsers || 0}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Total Portfolios</div>
                    <div className="stat-value">{stats?.totalPortfolios || 0}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Total Transactions</div>
                    <div className="stat-value">{stats?.totalTransactions || 0}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Admins</div>
                    <div className="stat-value">{stats?.totalAdmins || 0}</div>
                </div>
            </div>

            {/* 2. API & Integration Monitoring */}
            <h3 className="section-title" style={{ marginTop: '2rem' }}>API Quotas & Cache</h3>
            <div className="admin-stats-grid">
                <div className="stat-card">
                    <div className="stat-label">Upstox API Usage</div>
                    <div className="stat-value">{stats?.apiQuotas?.upstox?.used} / {stats?.apiQuotas?.upstox?.limit}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Yahoo Finance Usage</div>
                    <div className="stat-value">{stats?.apiQuotas?.yahooFinance?.used} / {stats?.apiQuotas?.yahooFinance?.limit}</div>
                </div>
                <div className="stat-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <button className="btn btn-danger" onClick={handleClearCache}>Clear Market Cache</button>
                </div>
            </div>

            {/* 3. & 4. Global Application Controls & Halal Management */}
            <h3 className="section-title" style={{ marginTop: '2rem' }}>Global Settings</h3>
            <form onSubmit={handleSaveSettings} className="form-group" style={{ background: 'var(--card-bg)', padding: '1rem', borderRadius: '8px' }}>
                <label>
                    <input 
                        type="checkbox" 
                        checked={settings?.maintenanceMode || false} 
                        onChange={e => setSettings({...settings, maintenanceMode: e.target.checked})} 
                    /> Enable Maintenance Mode
                </label>
                <div style={{ marginTop: '1rem' }}>
                    <label>Global Announcement Banner</label>
                    <input 
                        type="text" 
                        value={settings?.globalAnnouncement || ''} 
                        onChange={e => setSettings({...settings, globalAnnouncement: e.target.value})}
                        className="form-control"
                        placeholder="e.g. Scheduled maintenance this weekend"
                    />
                </div>
                <div style={{ marginTop: '1rem' }}>
                    <label>Halal Debt-to-Asset Threshold (%)</label>
                    <input 
                        type="number" 
                        value={settings?.halalDebtThreshold || 33} 
                        onChange={e => setSettings({...settings, halalDebtThreshold: Number(e.target.value)})}
                        className="form-control"
                    />
                </div>
                <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>Save Settings</button>
            </form>

            {/* 1. User Management */}
            <h3 className="section-title" style={{ marginTop: '2rem' }}>User Management</h3>
            <div className="admin-users-table-container">
                <table className="admin-users-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Joined</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u._id}>
                                <td>{u.name || 'N/A'}</td>
                                <td>{u.email}</td>
                                <td><span className={`role-badge ${u.role}`}>{u.role}</span></td>
                                <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                                <td>
                                    <select 
                                        value={u.role} 
                                        onChange={(e) => handleRoleChange(u._id, e.target.value)}
                                        style={{ padding: '0.25rem', marginRight: '0.5rem', borderRadius: '4px', background: 'var(--bg-color)', color: 'var(--text-color)', border: '1px solid var(--border-color)' }}
                                    >
                                        <option value="user">User</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                    <button onClick={() => handleDeleteUser(u._id)} className="btn btn-danger" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* 5. Security & Audit Logging */}
            <h3 className="section-title" style={{ marginTop: '2rem' }}>Audit Logs</h3>
            <div className="admin-users-table-container">
                <table className="admin-users-table">
                    <thead>
                        <tr>
                            <th>Timestamp</th>
                            <th>Action</th>
                            <th>User</th>
                            <th>Risk</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map(log => (
                            <tr key={log.id} style={{ color: log.risk === 'high' ? 'red' : 'inherit' }}>
                                <td>{new Date(log.timestamp).toLocaleString()}</td>
                                <td>{log.action}</td>
                                <td>{log.user}</td>
                                <td>{log.risk || 'low'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
