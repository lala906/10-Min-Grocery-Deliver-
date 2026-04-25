const mongoose = require('mongoose');

const fraudFlagSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    type: {
        type: String,
        enum: ['multiple_orders', 'coupon_abuse', 'refund_abuse', 'suspicious_payment', 'fake_account', 'other'],
        required: true
    },
    riskScore: { type: Number, default: 0, min: 0, max: 100 },
    details: { type: String },
    referenceId: { type: String }, // order or coupon ID
    status: { type: String, enum: ['open', 'reviewed', 'dismissed', 'actioned'], default: 'open' },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },
    resolution: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('FraudFlag', fraudFlagSchema);
