const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
        type: String,
        enum: [
            'ORDER_PLACED', 'ORDER_ACCEPTED', 'ORDER_PACKING', 'ORDER_READY',
            'RIDER_ASSIGNED', 'OUT_FOR_DELIVERY', 'ORDER_DELIVERED', 'ORDER_CANCELLED',
            'DELIVERY_FAILED', 'REFUND_INITIATED', 'REFUND_COMPLETED',
            'WALLET_CREDIT', 'WALLET_DEBIT',
            'SUBSCRIPTION_ACTIVATED', 'SUBSCRIPTION_EXPIRING',
            'COUPON_AVAILABLE', 'LOW_STOCK_ALERT', 'SYSTEM'
        ],
        default: 'SYSTEM'
    },
    channel: { type: String, enum: ['in_app', 'push', 'email', 'sms'], default: 'in_app' },
    referenceId: { type: String },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
