const mongoose = require('mongoose');
module.exports = mongoose.model('Watchlist', new mongoose.Schema({ user: { type: mongoose.Schema.Types.ObjectId, unique: true }, symbols: [{ type: String, uppercase: true }] }));
