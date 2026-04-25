const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    plan: { type: String, enum: ['monthly', 'yearly'], required: true },
    status: { type: String, enum: ['active', 'cancelled', 'expired'], default: 'active' },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date, required: true },
    price: { type: Number, required: true },
    features: {
        freeDelivery: { type: Boolean, default: true },
        exclusiveOffers: { type: Boolean, default: true },
        prioritySupport: { type: Boolean, default: false },
        cashbackPercent: { type: Number, default: 5 }
    },
    autoRenew: { type: Boolean, default: false },
    paymentMethod: { type: String },
    cancelledAt: { type: Date }
}, { timestamps: true });

// Virtual: isActive
subscriptionSchema.virtual('isCurrentlyActive').get(function () {
    return this.status === 'active' && new Date() < this.endDate;
});

subscriptionSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Subscription', subscriptionSchema);
