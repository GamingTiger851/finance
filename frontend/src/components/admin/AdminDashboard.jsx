import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import './admin.css';

export default function AdminDashboard() {
    const { userRole } = useAuth();
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (userRole !== 'admin') {
            setError('Access Denied. Admins only.');
            setLoading(false);
            return;
        }

        const fetchAdminData = async () => {
            try {
                const headers = {
                    'Authorization': `Bearer ${localStorage.getItem('fintrack_jwt_access')}`
                };

                const [statsRes, usersRes] = await Promise.all([
                    fetch('/api/admin/stats', { headers }),
                    fetch('/api/admin/users', { headers })
                ]);

                if (!statsRes.ok || !usersRes.ok) throw new Error('Failed to fetch admin data');

                const statsData = await statsRes.json();
                const usersData = await usersRes.json();

                setStats(statsData);
                setUsers(usersData);
            } catch (err) {
                console.error(err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchAdminData();
    }, [userRole]);

    if (loading) return <div className="admin-loading"><div className="btn-spinner" /> Loading Admin Panel...</div>;
    
    if (error) return (
        <div className="admin-dashboard container-card">
            <h2>Admin Panel</h2>
            <div className="alert-box error">{error}</div>
        </div>
    );

    return (
        <div className="admin-dashboard container-card animate-fade-in">
            <h2 className="admin-title">Admin Dashboard</h2>
            
            <div className="admin-stats-grid">
                <div className="stat-card">
                    <div className="stat-label">Total Users</div>
                    <div className="stat-value">{stats?.totalUsers || 0}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Total Admins</div>
                    <div className="stat-value">{stats?.totalAdmins || 0}</div>
                </div>
            </div>

            <h3 className="section-title" style={{ marginTop: '2rem' }}>Registered Users</h3>
            <div className="admin-users-table-container">
                <table className="admin-users-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Joined</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u._id}>
                                <td>{u.name || 'N/A'}</td>
                                <td>{u.email}</td>
                                <td><span className={`role-badge ${u.role}`}>{u.role}</span></td>
                                <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
