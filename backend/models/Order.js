const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
        orderItems: [
            {
                name: { type: String, required: true },
                quantity: { type: Number, required: true },
                image: { type: String, required: true },
                price: { type: Number, required: true },
                product: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Product' },
            },
        ],
        shippingAddress: {
            address: { type: String, required: true },
            city: { type: String, required: true },
            postalCode: { type: String, required: true },
            country: { type: String, required: true },
            lat: { type: Number },
            lng: { type: Number },
        },
        paymentMethod: { type: String, required: true },
        paymentStatus: {
            type: String,
            enum: ['pending', 'paid', 'failed', 'refunded'],
            default: 'pending',
        },
        paymentResult: {
            id: String,
            status: String,
            update_time: String,
            email_address: String,
            razorpay_order_id: String,
            razorpay_signature: String,
        },
        // ── Razorpay ───────────────────────────────────────────────
        razorpayOrderId:   { type: String },
        razorpayPaymentId: { type: String },
        razorpaySignature: { type: String },
        itemsPrice: { type: Number, default: 0.0 },
        taxPrice: { type: Number, default: 0.0 },
        shippingPrice: { type: Number, default: 0.0 },
        deliveryFee: { type: Number, default: 20 },
        totalPrice: { type: Number, required: true, default: 0.0 },

        // ─── Coupon ───────────────────────────────────────────────
        coupon: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' },
        couponDiscount: { type: Number, default: 0 },

        // ─── Wallet ───────────────────────────────────────────────
        walletAmountUsed: { type: Number, default: 0 },

        // ─── Delivery Slot ────────────────────────────────────────
        deliverySlot: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliverySlot' },

        // ─── Warehouse & Shop ────────────────────────────────────────────
        warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
        shop: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop' },

        isPaid: { type: Boolean, required: true, default: false },
        paidAt: Date,
        isDelivered: { type: Boolean, required: true, default: false },
        deliveredAt: Date,

        // Full lifecycle status
        orderStatus: {
            type: String,
            required: true,
            default: 'Order Placed',
            enum: [
                'Order Placed',
                'Merchant Accepted',
                'Packing',
                'Ready for Pickup',
                'Waiting for Rider',
                'Rider Assigned',
                'Picked Up',
                'In Transit',
                'Out for Delivery',
                'Delivered',
                'Completed',
                'Cancelled',
                'Delivery Failed',
                'Refund Initiated',
                'Refunded'
            ],
        },

        // ─── Failure Handling ────────────────────────────────────
        deliveryFailedReason: { type: String },
        deliveryAttempts: { type: Number, default: 0 },
        retryScheduled: { type: Boolean, default: false },
        refundStatus: { type: String, enum: ['none', 'pending', 'completed'], default: 'none' },
        refundAmount: { type: Number, default: 0 },

        // Lifecycle timestamps
        placedAt: { type: Date, default: Date.now },
        merchantAcceptedAt: Date,
        readyAt: Date,
        assignedAt: Date,
        pickedAt: Date,
        inTransitAt: Date,
        completedAt: Date,
        cancelledAt: Date,

        // Rider & Assignment references
        rider: { type: mongoose.Schema.Types.ObjectId, ref: 'Rider' },
        activeAssignment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment' },

        // Batch delivery
        batchId: { type: String },

        // Zone
        zone: { type: mongoose.Schema.Types.ObjectId, ref: 'Zone' },

        // Estimated delivery time
        estimatedDeliveryMinutes: { type: Number, default: 30 },

        // Dispute
        dispute: { type: mongoose.Schema.Types.ObjectId, ref: 'Dispute' },

        // Review flags
        productReviewed: { type: Boolean, default: false },
        riderReviewed: { type: Boolean, default: false },

        // Cancel reason
        cancelReason: String,
        cancelledBy: { type: String, enum: ['customer', 'merchant', 'admin', 'system'] },

        // Subscription
        memberFreeDelivery: { type: Boolean, default: false },

        // Fraud
        fraudScore: { type: Number, default: 0 },
        isFraudSuspected: { type: Boolean, default: false }
    },
    { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
