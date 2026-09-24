const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: { type: String, unique: true, lowercase: true, required: true },
    passwordHash: { type: String, required: true },
    name: String,
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    refreshTokenHash: String,
    tokenVersion: { type: Number, default: 0 },
    upstoxAccessToken: String,
    upstoxOAuthStateHash: String,
    upstoxOAuthStateExpiresAt: Date,
    resetPasswordToken: String,
    resetPasswordExpires: Date
}, { timestamps: true });

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
