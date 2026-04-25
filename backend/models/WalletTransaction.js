const mongoose = require('mongoose');

const walletTransactionSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['credit', 'debit'], required: true },
    amount: { type: Number, required: true },
    description: { type: String, required: true },
    referenceId: { type: String }, // order ID, refund ID, etc.
    referenceType: { type: String, enum: ['order', 'refund', 'cashback', 'topup', 'subscription', 'other'], default: 'other' },
    balanceAfter: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'completed' }
}, { timestamps: true });

module.exports = mongoose.model('WalletTransaction', walletTransactionSchema);
