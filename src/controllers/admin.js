const User = require('../models/User');
const Portfolio = require('../models/Portfolio');
const Transaction = require('../models/Transaction');

let globalSettings = {
    maintenanceMode: false,
    globalAnnouncement: '',
    halalDebtThreshold: 33
};

exports.getStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalAdmins = await User.countDocuments({ role: 'admin' });
        const totalPortfolios = await Portfolio.countDocuments();
        const totalTransactions = await Transaction.countDocuments();
        
        // Mock API Quotes for Monitoring
        const apiQuotas = {
            upstox: { used: 450, limit: 1000 },
            yahooFinance: { used: 1200, limit: 5000 }
        };

        res.json({
            totalUsers,
            totalAdmins,
            totalPortfolios,
            totalTransactions,
            apiQuotas
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch admin stats' });
    }
};

exports.getUsers = async (req, res) => {
    try {
        const users = await User.find({}, '-passwordHash -refreshTokenHash').sort({ createdAt: -1 });
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

exports.updateUserRole = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        
        // Prevent demoting self
        if (req.user.sub === user._id.toString()) {
            return res.status(400).json({ error: 'Cannot change your own role' });
        }

        user.role = req.body.role;
        await user.save();
        res.json({ message: 'Role updated successfully', user });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update user role' });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        
        if (req.user.sub === user._id.toString()) {
            return res.status(400).json({ error: 'Cannot delete yourself' });
        }

        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete user' });
    }
};

exports.getSettings = (req, res) => {
    res.json(globalSettings);
};

exports.updateSettings = (req, res) => {
    globalSettings = { ...globalSettings, ...req.body };
    res.json({ message: 'Settings updated successfully', settings: globalSettings });
};

exports.getAuditLogs = (req, res) => {
    // Mocking audit logs for demonstration
    const logs = [
        { id: 1, action: 'User Logged In', user: 'admin@fintrack.com', timestamp: new Date().toISOString() },
        { id: 2, action: 'Settings Updated', user: 'admin@fintrack.com', timestamp: new Date(Date.now() - 3600000).toISOString() },
        { id: 3, action: 'Suspicious Login Attempt', user: 'unknown', timestamp: new Date(Date.now() - 7200000).toISOString(), risk: 'high' }
    ];
    res.json(logs);
};

exports.clearCache = (req, res) => {
    // Mock cache clearing
    res.json({ message: 'Market data cache cleared successfully' });
};
