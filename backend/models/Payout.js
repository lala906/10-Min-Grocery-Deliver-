const mongoose = require('mongoose');

const payoutLineItemSchema = new mongoose.Schema({
    assignment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment' },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    deliveryFee: Number,
    commissionRate: Number,
    commissionAmount: Number,
    riderEarning: Number,
    deliveredAt: Date,
});

const payoutSchema = new mongoose.Schema(
    {
        rider: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Rider',
            required: true,
            index: true
        },

        // Period
        periodStart: { type: Date, required: true },
        periodEnd: { type: Date, required: true },
        periodLabel: { type: String }, // e.g. "Week 12 - 2026"

        // Summary
        totalDeliveries: { type: Number, default: 0 },
        grossEarnings: { type: Number, default: 0 },
        totalCommission: { type: Number, default: 0 },
        netPayout: { type: Number, default: 0 },
        bonuses: { type: Number, default: 0 },
        deductions: { type: Number, default: 0 },

        // Line items
        lineItems: [payoutLineItemSchema],

        // Payment
        status: {
            type: String,
            enum: ['pending', 'processing', 'paid', 'failed'],
            default: 'pending'
        },
        paidAt: Date,
        paymentRef: String,
        paymentMethod: {
            type: String,
            enum: ['bank_transfer', 'upi', 'cash', 'wallet'],
            default: 'bank_transfer'
        },

        // Admin who processed
        processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

        notes: String,
    },
    { timestamps: true }
);

module.exports = mongoose.model('Payout', payoutSchema);
