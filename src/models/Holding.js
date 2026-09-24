const mongoose = require('mongoose');
const schema = new mongoose.Schema({ portfolio: { type: mongoose.Schema.Types.ObjectId, ref: 'Portfolio', required: true }, user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, symbol: { type: String, uppercase: true, trim: true, required: true, match: /^[A-Z0-9._-]{1,12}$/ }, quantity: { type: Number, min: 0, required: true }, averageCost: { type: Number, min: 0, required: true } }, { timestamps: true });
schema.index({ portfolio: 1, symbol: 1 }, { unique: true });
schema.index({ user: 1, portfolio: 1 });
module.exports = mongoose.model('Holding', schema);
