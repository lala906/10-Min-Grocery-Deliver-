const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    title: { type: String },
    description: { type: String },
    discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
    discountValue: { type: Number, required: true },
    maxDiscountAmount: { type: Number }, // cap for percentage discounts

    expiryDate: { type: Date, required: true },
    usageLimit: { type: Number, required: true, default: 100 },
    usedCount: { type: Number, default: 0 },
    usersUsed: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // track per-user usage

    isActive: { type: Boolean, default: true },

    // ─── Advanced Rules ────────────────────────────────────────────
    minOrderValue: { type: Number, default: 0 },
    maxOrderValue: { type: Number }, // optional upper limit

    // User type restriction
    userType: {
        type: String,
        enum: ['all', 'first_time', 'subscribed', 'specific'],
        default: 'all'
    },

    // Category restrictions
    categoryRestrictions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],

    // Product restrictions
    productRestrictions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],

    // Per-user usage limit (in addition to total)
    perUserLimit: { type: Number, default: 1 },

    // Auto-apply
    isAutoApply: { type: Boolean, default: false }

}, { timestamps: true });

module.exports = mongoose.model('Coupon', couponSchema);
