const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const Order = require('../models/Order');
const LocationHistory = require('../models/LocationHistory');
const Rider = require('../models/Rider');

// ─── @desc  Public order tracking info (no auth — share link)
// @route GET /api/tracking/:orderId
// @access Public
router.get('/:orderId', asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.orderId)
        .select('orderStatus shippingAddress rider estimatedDeliveryMinutes placedAt orderItems user')
        .populate('rider', 'name vehicleDetails currentLocation')
        .lean();

    if (!order) {
        res.status(404);
        throw new Error('Order not found');
    }

    // Only expose public-safe fields
    res.json({
        status: 'success',
        data: {
            orderId: order._id,
            orderStatus: order.orderStatus,
            estimatedDeliveryMinutes: order.estimatedDeliveryMinutes,
            placedAt: order.placedAt,
            destination: order.shippingAddress
                ? { city: order.shippingAddress.city, postalCode: order.shippingAddress.postalCode }
                : null,
            rider: order.rider
                ? {
                      name: order.rider.name,
                      vehicleType: order.rider.vehicleDetails?.vehicleType,
                      currentLocation: order.rider.currentLocation,
                  }
                : null,
            itemCount: order.orderItems?.length || 0,
        },
    });
}));

// ─── @desc  Get last N minutes of rider path (for playback)
// @route GET /api/tracking/:orderId/path?minutes=2
// @access Public
router.get('/:orderId/path', asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.orderId).select('rider').lean();
    if (!order?.rider) {
        return res.json({ status: 'success', data: [] });
    }

    const minutes = Math.min(parseInt(req.query.minutes) || 2, 10); // max 10 min
    const since = new Date(Date.now() - minutes * 60 * 1000);

    const history = await LocationHistory.find({
        rider: order.rider,
        createdAt: { $gte: since },
    })
        .select('lat lng speed heading createdAt')
        .sort({ createdAt: 1 })
        .limit(300)
        .lean();

    res.json({ status: 'success', data: history });
}));

module.exports = router;
