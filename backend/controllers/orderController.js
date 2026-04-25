const asyncHandler = require('express-async-handler');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Notification = require('../models/Notification');
const Warehouse = require('../models/Warehouse');
const Subscription = require('../models/Subscription');
const { notifyOrderEvent } = require('../services/notificationService');
const { analyzeOrder } = require('../services/fraudDetectionService');
const { debitWallet, refundToWallet } = require('../services/walletService');
const { findNearestWarehouse, findNearestShop, estimateDeliveryMinutes } = require('../services/logisticsService');

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
const placeOrder = asyncHandler(async (req, res) => {
    const {
        orderItems,
        shippingAddress,
        paymentMethod,
        itemsPrice,
        taxPrice,
        shippingPrice,
        totalPrice,
        couponId,
        couponDiscount,
        walletAmountUsed,
        deliverySlotId
    } = req.body;

    if (!orderItems || orderItems.length === 0) {
        res.status(400);
        throw new Error('No order items');
    }

    // 1. Stock check and deduction
    for (let i = 0; i < orderItems.length; i++) {
        const product = await Product.findById(orderItems[i].product);
        if (product) {
            if (product.stock < orderItems[i].quantity) {
                res.status(400);
                throw new Error(`${product.name} is out of stock`);
            }
            product.stock -= orderItems[i].quantity;
            product.totalSold = (product.totalSold || 0) + orderItems[i].quantity;
            if (product.stock === 0) product.isVisible = false;
            await product.save();
        }
    }

    // 2. Fraud check (async — non-blocking for UX)
    const fraudResult = await analyzeOrder(req.user._id, { totalPrice });

    // 3. Auto-assign nearest shop instead of warehouse
    let nearestShop = null;
    let nearestWarehouse = null;
    if (shippingAddress?.lat && shippingAddress?.lng) {
        const Shop = require('../models/Shop');
        const shops = await Shop.find({ isOpen: true, kycStatus: 'approved' });
        nearestShop = findNearestShop(shippingAddress.lat, shippingAddress.lng, shops);
        // Fallback or secondary
        const warehouses = await Warehouse.find({ isActive: true });
        nearestWarehouse = findNearestWarehouse(shippingAddress.lat, shippingAddress.lng, warehouses);
    }

    // 4. Check subscription for free delivery
    let memberFreeDelivery = false;
    const subscription = await Subscription.findOne({ user: req.user._id, status: 'active' });
    if (subscription && new Date() < subscription.endDate) {
        memberFreeDelivery = true;
    }

    // 5. Wallet deduction
    let actualWalletUsed = 0;
    if (walletAmountUsed && walletAmountUsed > 0) {
        await debitWallet(
            req.user._id,
            walletAmountUsed,
            `Payment for order`,
            null,
            'order'
        );
        actualWalletUsed = walletAmountUsed;
    }

    // 6. Estimate delivery time
    const distKm = nearestWarehouse?.distanceKm || 3;
    const estimatedMins = estimateDeliveryMinutes(parseFloat(distKm));

    // 7. Create order
    const order = new Order({
        orderItems,
        user: req.user._id,
        shippingAddress,
        paymentMethod,
        itemsPrice,
        taxPrice,
        shippingPrice: memberFreeDelivery ? 0 : (shippingPrice || 0),
        deliveryFee: memberFreeDelivery ? 0 : (shippingPrice || 20),
        totalPrice: memberFreeDelivery ? Math.max(0, totalPrice - (shippingPrice || 20)) : totalPrice,
        coupon: couponId || undefined,
        couponDiscount: couponDiscount || 0,
        walletAmountUsed: actualWalletUsed,
        deliverySlot: deliverySlotId || undefined,
        shop: nearestShop?._id || undefined,       // assigned to local shop
        warehouse: nearestWarehouse?._id || undefined, // fallback/warehouse assignment
        memberFreeDelivery,
        estimatedDeliveryMinutes: estimatedMins,
        fraudScore: fraudResult.riskScore,
        isFraudSuspected: fraudResult.riskScore >= 60
    });

    const createdOrder = await order.save();

    // 8. Book delivery slot if provided
    if (deliverySlotId) {
        try {
            const DeliverySlot = require('../models/DeliverySlot');
            const slot = await DeliverySlot.findById(deliverySlotId);
            if (slot && slot.bookedCount < slot.capacity) {
                slot.bookedCount += 1;
                await slot.save();
            }
        } catch (e) { console.warn('[Order] Slot booking error:', e.message); }
    }

    // 8.5 Record Coupon usage
    if (couponId) {
        try {
            const Coupon = require('../models/Coupon');
            await Coupon.findByIdAndUpdate(couponId, {
                $inc: { usedCount: 1 },
                $addToSet: { usersUsed: req.user._id }
            });
        } catch (e) { console.warn('[Order] Coupon stats update error:', e.message); }
    }

    // 9. Mark first order as done
    const User = require('../models/User');
    await User.findByIdAndUpdate(req.user._id, { isFirstOrder: false });

    // 10. Send notification
    const user = await User.findById(req.user._id);
    await notifyOrderEvent(createdOrder, 'ORDER_PLACED', user);

    // 11. Emit socket event
    const io = req.app.get('socketio');
    if (io) io.to('admin_room').emit('newOrderPlaced', { orderId: createdOrder._id, userId: req.user._id });

    res.status(201).json({
        status: 'success',
        message: 'Order created',
        data: createdOrder,
    });
});

// @desc    Get logged in user orders
// @route   GET /api/orders/myorders
// @access  Private
const getMyOrders = asyncHandler(async (req, res) => {
    const orders = await Order.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .populate('deliverySlot')
        .populate('warehouse', 'name');

    res.json({
        status: 'success',
        message: 'Order history fetched',
        data: orders,
    });
});

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id)
        .populate('user', 'name email phone')
        .populate('orderItems.product', 'name price image')
        .populate('deliverySlot')
        .populate('warehouse', 'name address');

    if (order) {
        if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            res.status(403);
            throw new Error('Not authorized to view this order');
        }
        res.json({ status: 'success', message: 'Order fetched', data: order });
    } else {
        res.status(404);
        throw new Error('Order not found');
    }
});

// @desc    Update order status to delivered
// @route   PUT /api/orders/:id/deliver
// @access  Private/Admin
const updateOrderToDelivered = asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);

    if (order) {
        order.isDelivered = true;
        order.deliveredAt = Date.now();
        order.orderStatus = 'Delivered';

        const updatedOrder = await order.save();
        res.json({ status: 'success', message: 'Order updated to delivered', data: updatedOrder });

        const io = req.app.get('socketio');
        if (io) io.to(order._id.toString()).emit('orderStatusUpdated', { status: updatedOrder.orderStatus });

        const User = require('../models/User');
        const user = await User.findById(order.user);
        await notifyOrderEvent(updatedOrder, 'ORDER_DELIVERED', user);

        // Cashback for subscribers
        if (user?.isSubscribed) {
            const sub = await Subscription.findOne({ user: user._id, status: 'active' });
            if (sub && new Date() < sub.endDate) {
                const cashbackPct = sub.features?.cashbackPercent || 5;
                const cashback = parseFloat((order.itemsPrice * cashbackPct / 100).toFixed(2));
                if (cashback > 0) {
                    await require('../services/walletService').creditWallet(
                        user._id, cashback,
                        `${cashbackPct}% cashback on order #${order._id}`,
                        order._id.toString(), 'cashback'
                    );
                }
            }
        }
    } else {
        res.status(404);
        throw new Error('Order not found');
    }
});

// @desc    Get all orders (Admin)
// @route   GET /api/orders
// @access  Private/Admin
const getOrders = asyncHandler(async (req, res) => {
    const { page = 1, limit = 30, status } = req.query;
    const filter = status ? { orderStatus: status } : {};

    const orders = await Order.find(filter)
        .populate('user', 'id name email')
        .populate('rider', 'name phone')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit));

    const total = await Order.countDocuments(filter);

    res.json({ status: 'success', message: 'All orders fetched', data: orders, total });
});

// @desc    Update order status (Admin/System)
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
const updateOrderStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
        res.status(404);
        throw new Error('Order not found');
    }

    order.orderStatus = status;

    // Handle delivery failure auto-refund
    if (status === 'Delivery Failed') {
        order.deliveryAttempts = (order.deliveryAttempts || 0) + 1;
        order.deliveryFailedReason = req.body.reason || 'Delivery attempt failed';

        if (order.deliveryAttempts >= 2) {
            // Auto-refund to wallet
            order.refundStatus = 'pending';
            order.refundAmount = order.totalPrice;
            order.orderStatus = 'Refund Initiated';

            await refundToWallet(order.user, order.totalPrice, order._id);
            order.refundStatus = 'completed';
        }
    }

    const updatedOrder = await order.save();
    res.json({ status: 'success', message: 'Order status updated', data: updatedOrder });

    const io = req.app.get('socketio');
    if (io) io.to(order._id.toString()).emit('orderStatusUpdated', { status: updatedOrder.orderStatus });

    const User = require('../models/User');
    const user = await User.findById(order.user);

    const notifMap = {
        'Rider Assigned': 'RIDER_ASSIGNED',
        'Out for Delivery': 'OUT_FOR_DELIVERY',
        'Delivery Failed': 'DELIVERY_FAILED',
        'Refund Initiated': 'REFUND_INITIATED',
        'Refunded': 'REFUND_COMPLETED',
        'Cancelled': 'ORDER_CANCELLED'
    };

    if (notifMap[status]) {
        await notifyOrderEvent(updatedOrder, notifMap[status], user);
    }
});

// @desc    Retry delivery
// @route   PUT /api/orders/:id/retry
// @access  Admin
const retryDelivery = asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (!order) {
        res.status(404);
        throw new Error('Order not found');
    }
    if (order.orderStatus !== 'Delivery Failed') {
        res.status(400);
        throw new Error('Order is not in Delivery Failed state');
    }

    order.orderStatus = 'Waiting for Rider';
    order.retryScheduled = false;
    await order.save();

    res.json({ status: 'success', message: 'Delivery retry scheduled', data: order });
});

module.exports = {
    placeOrder,
    getOrderById,
    getMyOrders,
    getOrders,
    updateOrderToDelivered,
    updateOrderStatus,
    retryDelivery
};
