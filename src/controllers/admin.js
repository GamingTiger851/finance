const User = require('../models/User');

exports.getStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalAdmins = await User.countDocuments({ role: 'admin' });
        
        res.json({
            totalUsers,
            totalAdmins
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
