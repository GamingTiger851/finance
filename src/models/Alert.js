const mongoose = require('mongoose');
module.exports = mongoose.model('Alert', new mongoose.Schema({ user: mongoose.Schema.Types.ObjectId, symbol: String, condition: { type: String, enum: ['above','below'] }, target: Number, active: { type: Boolean, default: true } }, { timestamps: true }));
