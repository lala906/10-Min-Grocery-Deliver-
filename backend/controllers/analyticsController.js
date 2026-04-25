const asyncHandler = require('express-async-handler');
const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');
const RiderReview = require('../models/RiderReview');
const FraudFlag = require('../models/FraudFlag');
const Subscription = require('../models/Subscription');
const WalletTransaction = require('../models/WalletTransaction');

// @desc    Full analytics dashboard
// @route   GET /api/admin/analytics
// @access  Admin
const getAnalytics = asyncHandler(async (req, res) => {
    const { period = '30' } = req.query; // days
    const sinceDate = new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000);

    const [
        totalOrders,
        revenueData,
        dailyRevenue,
        categoryRevenue,
        topProducts,
        userStats,
        orderStatusBreakdown,
        retentionData,
        fraudStats,
        subscriptionStats,
        couponUsage,
        topCoupons
    ] = await Promise.all([
        Order.countDocuments({ createdAt: { $gte: sinceDate } }),

        // Total revenue
        Order.aggregate([
            { $match: { createdAt: { $gte: sinceDate }, orderStatus: { $in: ['Delivered', 'Completed'] } } },
            { $group: { _id: null, total: { $sum: '$totalPrice' }, count: { $sum: 1 }, avgOrder: { $avg: '$totalPrice' } } }
        ]),

        // Daily revenue chart
        Order.aggregate([
            { $match: { createdAt: { $gte: sinceDate } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    revenue: { $sum: '$totalPrice' },
                    orders: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]),

        // Revenue by category
        Order.aggregate([
            { $match: { createdAt: { $gte: sinceDate } } },
            { $unwind: '$orderItems' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'orderItems.product',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: { path: '$product', preserveNullAndEmpty: true } },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'product.category',
                    foreignField: '_id',
                    as: 'category'
                }
            },
            { $unwind: { path: '$category', preserveNullAndEmpty: true } },
            {
                $group: {
                    _id: '$category.name',
                    revenue: { $sum: { $multiply: ['$orderItems.price', '$orderItems.quantity'] } },
                    unitsSold: { $sum: '$orderItems.quantity' }
                }
            },
            { $sort: { revenue: -1 } },
            { $limit: 10 }
        ]),

        // Top products by revenue
        Order.aggregate([
            { $match: { createdAt: { $gte: sinceDate } } },
            { $unwind: '$orderItems' },
            {
                $group: {
                    _id: '$orderItems.product',
                    name: { $first: '$orderItems.name' },
                    revenue: { $sum: { $multiply: ['$orderItems.price', '$orderItems.quantity'] } },
                    units: { $sum: '$orderItems.quantity' }
                }
            },
            { $sort: { revenue: -1 } },
            { $limit: 10 }
        ]),

        // User stats
        Promise.all([
            User.countDocuments(),
            User.countDocuments({ createdAt: { $gte: sinceDate } }),
            User.countDocuments({ isBlocked: true })
        ]),

        // Order status breakdown
        Order.aggregate([
            { $match: { createdAt: { $gte: sinceDate } } },
            { $group: { _id: '$orderStatus', count: { $sum: 1 } } }
        ]),

        // Retention: users who ordered more than once
        Order.aggregate([
            { $group: { _id: '$user', orderCount: { $sum: 1 } } },
            { $group: { _id: { $cond: [{ $gt: ['$orderCount', 1] }, 'returning', 'new'] }, count: { $sum: 1 } } }
        ]),

        // Fraud stats
        FraudFlag.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]),

        // Subscription stats
        Subscription.aggregate([
            { $group: { _id: '$plan', count: { $sum: 1 }, revenue: { $sum: '$price' } } }
        ]),

        // Coupon Usage
        require('../models/Coupon').aggregate([
            { $group: { _id: null, totalUsage: { $sum: '$usedCount' } } }
        ]),

        // Top Used Coupons
        require('../models/Coupon').find({ usedCount: { $gt: 0 } }).sort({ usedCount: -1 }).limit(5).select('code title usedCount usageLimit')
    ]);

    const [totalUsers, newUsers, blockedUsers] = userStats;

    res.json({
        status: 'success',
        data: {
            summary: {
                totalOrders,
                revenue: revenueData[0]?.total || 0,
                avgOrderValue: revenueData[0]?.avgOrder?.toFixed(2) || 0,
                deliveredOrders: revenueData[0]?.count || 0,
                conversionRate: totalOrders > 0
                    ? ((revenueData[0]?.count || 0) / totalOrders * 100).toFixed(1)
                    : 0
            },
            users: { totalUsers, newUsers, blockedUsers },
            dailyRevenue,
            categoryRevenue,
            topProducts,
            orderStatusBreakdown,
            retention: retentionData,
            fraud: fraudStats,
            subscriptions: subscriptionStats,
            coupons: {
                totalUses: couponUsage[0]?.totalUsage || 0,
                topCoupons
            }
        }
    });
});

// @desc    Get low stock alerts
// @route   GET /api/admin/analytics/low-stock
// @access  Admin
const getLowStockAlerts = asyncHandler(async (req, res) => {
    const products = await Product.find({
        $expr: { $lte: ['$stock', '$lowStockThreshold'] }
    }).populate('category', 'name').sort({ stock: 1 }).limit(50);

    res.json({
        status: 'success',
        data: products,
        count: products.length
    });
});

// @desc    Get heatmap data (orders by location)
// @route   GET /api/admin/analytics/heatmap
// @access  Admin
const getHeatmapData = asyncHandler(async (req, res) => {
    const orders = await Order.find({
        'shippingAddress.lat': { $exists: true, $ne: null }
    }).select('shippingAddress.lat shippingAddress.lng shippingAddress.city totalPrice').limit(500);

    const heatmapPoints = orders.map(o => ({
        lat: o.shippingAddress.lat,
        lng: o.shippingAddress.lng,
        city: o.shippingAddress.city,
        value: o.totalPrice
    }));

    res.json({ status: 'success', data: heatmapPoints });
});

module.exports = { getAnalytics, getLowStockAlerts, getHeatmapData };
