const User = require('../models/User');
const Order = require('../models/Order');
const Rider = require('../models/Rider');
const Assignment = require('../models/Assignment');
const KYCRecord = require('../models/KYCRecord');
const Dispute = require('../models/Dispute');

// @desc    Get full admin dashboard stats
// @route   GET /api/admin/dashboard
// @access  Private/Admin
const getDashboardStats = async (req, res, next) => {
    try {
        const [
            totalUsers,
            totalRiders,
            activeRiders,
            onlineRiders,
            totalOrders,
            ordersInProgress,
            pendingKYC,
            openDisputes,
            orders,
        ] = await Promise.all([
            User.countDocuments(),
            Rider.countDocuments(),
            Rider.countDocuments({ status: 'active' }),
            Rider.countDocuments({ isOnline: true }),
            Order.countDocuments(),
            Order.countDocuments({ orderStatus: { $nin: ['Delivered', 'Completed', 'Cancelled'] } }),
            KYCRecord.countDocuments({ status: 'pending' }),
            Dispute.countDocuments({ status: { $in: ['open', 'under_review'] } }),
            Order.find({}).lean(),
        ]);

        const totalRevenue = orders.reduce((acc, o) => acc + (o.totalPrice || 0), 0);

        const topProducts = await Order.aggregate([
            { $unwind: '$orderItems' },
            { $group: { _id: '$orderItems.product', totalQuantity: { $sum: '$orderItems.quantity' }, name: { $first: '$orderItems.name' } } },
            { $sort: { totalQuantity: -1 } },
            { $limit: 5 }
        ]);

        const monthlyRevenue = await Order.aggregate([
            { $group: { _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } }, total: { $sum: '$totalPrice' } } },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        const recentOrders = await Order.find({})
            .populate('user', 'name')
            .populate('rider', 'name')
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();

        res.json({
            totalUsers, totalRiders, activeRiders, onlineRiders,
            totalOrders, ordersInProgress, pendingKYC, openDisputes,
            totalRevenue, topProducts, monthlyRevenue, recentOrders
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get active riders + orders for live map
// @route   GET /api/admin/live-map
// @access  Private/Admin
const getLiveMapData = async (req, res, next) => {
    try {
        const [activeRiders, activeOrders] = await Promise.all([
            Rider.find({ isOnline: true, status: 'active' })
                .select('name phone currentLocation vehicleDetails isAvailable')
                .lean(),
            Order.find({ orderStatus: { $in: ['Rider Assigned', 'Picked Up', 'In Transit', 'Out for Delivery'] } })
                .populate('rider', 'name phone currentLocation')
                .populate('user', 'name phone')
                .select('orderStatus shippingAddress rider user totalPrice')
                .lean()
        ]);

        res.json({ activeRiders, activeOrders });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all users (admin management)
// @route   GET /api/admin/users
// @access  Private/Admin
const getAllUsers = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, search } = req.query;
        const filter = {};
        if (search) filter.$or = [
            { name: new RegExp(search, 'i') },
            { email: new RegExp(search, 'i') }
        ];
        const users = await User.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));
        const total = await User.countDocuments(filter);
        res.json({ users, total, page: Number(page), pages: Math.ceil(total / limit) });
    } catch (error) {
        next(error);
    }
};

// @desc    Toggle user block status
// @route   PUT /api/admin/users/:id/block
// @access  Private/Admin
const toggleUserBlock = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        user.isBlocked = !user.isBlocked;
        await user.save();
        res.json({ message: `User ${user.isBlocked ? 'blocked' : 'unblocked'}`, user });
    } catch (error) {
        next(error);
    }
};

module.exports = { getDashboardStats, getLiveMapData, getAllUsers, toggleUserBlock };
