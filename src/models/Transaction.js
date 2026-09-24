const mongoose = require('mongoose');
const schema = new mongoose.Schema({ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, portfolio: { type: mongoose.Schema.Types.ObjectId, ref: 'Portfolio' }, type: { type: String, enum: ['buy','sell','income','expense','dividend','deposit','withdrawal'], required: true }, symbol: { type: String, uppercase: true, trim: true, match: /^[A-Z0-9._-]{1,12}$/ }, quantity: { type: Number, min: 0 }, price: { type: Number, min: 0 }, amount: { type: Number, required: true, min: 0 }, date: { type: Date, default: Date.now }, notes: { type: String, maxlength: 1000 } }, { timestamps: true });
schema.index({ user: 1, date: -1 });
schema.index({ user: 1, portfolio: 1, date: -1 });
module.exports = mongoose.model('Transaction', schema);
