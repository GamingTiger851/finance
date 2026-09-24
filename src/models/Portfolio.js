const mongoose = require('mongoose');
const schema = new mongoose.Schema({ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, name: { type: String, required: true, trim: true, minlength: 1, maxlength: 100 }, baseCurrency: { type: String, default: 'USD', uppercase: true, match: /^[A-Z]{3}$/ } }, { timestamps: true });
schema.index({ user: 1, name: 1 }, { unique: true });
module.exports = mongoose.model('Portfolio', schema);
