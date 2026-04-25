const asyncHandler = require('express-async-handler');
const Rider = require('../models/Rider');
const Order = require('../models/Order');
const Assignment = require('../models/Assignment');
const LocationHistory = require('../models/LocationHistory');
const jwt = require('jsonwebtoken');
const { createAuditLog } = require('../services/auditLogger');

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

// @desc    Auth rider & get token
// @route   POST /api/riders/login
const authRider = asyncHandler(async (req, res) => {
    const { phone, password } = req.body;
    const rider = await Rider.findOne({ phone }).select('+password');

    if (rider && (await rider.matchPassword(password))) {
        res.json({
            _id: rider._id,
            name: rider.name,
            phone: rider.phone,
            email: rider.email,
            status: rider.status,
            kycStatus: rider.kycStatus,
            isAvailable: rider.isAvailable,
            vehicleDetails: rider.vehicleDetails,
            token: generateToken(rider._id),
            role: 'rider'
        });
    } else {
        res.status(401);
        throw new Error('Invalid phone or password');
    }
});

// @desc    Register new rider (self-onboarding)
// @route   POST /api/riders/register
const registerRider = asyncHandler(async (req, res) => {
    const { name, phone, email, password, vehicleDetails } = req.body;

    const riderExists = await Rider.findOne({ phone });
    if (riderExists) { res.status(400); throw new Error('Rider already exists'); }

    const rider = await Rider.create({
        name, phone, email, password,
        vehicleDetails,
        status: 'inactive',
        kycStatus: 'not_submitted'
    });

    if (rider) {
        res.status(201).json({
            _id: rider._id,
            name: rider.name,
            phone: rider.phone,
            status: rider.status,
            kycStatus: rider.kycStatus,
            token: generateToken(rider._id),
            role: 'rider'
        });
    } else {
        res.status(400); throw new Error('Invalid rider data');
    }
});

// @desc    Get rider profile
// @route   GET /api/riders/profile
const getRiderProfile = asyncHandler(async (req, res) => {
    const rider = await Rider.findById(req.rider._id).populate('zone', 'name');
    if (!rider) { res.status(404); throw new Error('Rider not found'); }
    res.json(rider);
});

// @desc    Update rider availability
// @route   PUT /api/riders/availability
const updateAvailability = asyncHandler(async (req, res) => {
    const { isAvailable } = req.body;
    const rider = await Rider.findById(req.rider._id);
    if (!rider) { res.status(404); throw new Error('Rider not found'); }

    if (rider.status !== 'active') {
        res.status(403);
        throw new Error('Cannot go online — account is not active. Complete KYC first.');
    }

    rider.isAvailable = isAvailable;
    rider.isOnline = isAvailable;
    rider.lastActiveAt = new Date();
    await rider.save();

    const io = req.app.get('socketio');
    if (io) {
        io.to('admin_room').emit(isAvailable ? 'riderOnline' : 'riderOffline', {
            riderId: rider._id,
            name: rider.name,
            location: rider.currentLocation
        });
    }

    res.json({ message: `Rider is now ${isAvailable ? 'online' : 'offline'}`, isAvailable });
});

// @desc    Update rider GPS location
// @route   PUT /api/riders/location
const updateLocation = asyncHandler(async (req, res) => {
    const { lat, lng, speed = 0, heading = 0, accuracy = 0 } = req.body;

    // ── Server-side GPS validation ──────────────────────────────
    if (typeof lat !== 'number' || typeof lng !== 'number') {
        res.status(400); throw new Error('Invalid GPS coordinates');
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        res.status(400); throw new Error('GPS coordinates out of range');
    }
    // Reject implausible speeds (> 120 km/h = 33.3 m/s for delivery riders)
    if (speed < 0 || speed > 35) {
        // Still accept but cap — don't reject entirely (GPS can spike)
        // just log the anomaly
        console.warn(`[GPS] Anomalous speed for rider ${req.rider._id}: ${(speed * 3.6).toFixed(1)} km/h`);
    }

    const rider = await Rider.findById(req.rider._id);
    if (!rider) { res.status(404); throw new Error('Rider not found'); }

    rider.currentLocation = { lat, lng, updatedAt: new Date() };
    rider.lastActiveAt = new Date();
    await rider.save();

    // Save to location history (stores last 60 seconds of path for playback)
    await LocationHistory.create({
        rider: rider._id, lat, lng,
        speed: Math.min(speed, 35), // cap anomalous values
        heading, accuracy,
    });

    // Broadcast to active order rooms and admin
    const io = req.app.get('socketio');
    if (io) {
        const activeOrders = await Order.find({
            rider: rider._id,
            orderStatus: { $in: ['Rider Assigned', 'Picked Up', 'In Transit', 'Out for Delivery'] }
        });
        const payload = {
            lat, lng,
            speed: Math.min(speed, 35),
            heading, accuracy,
            timestamp: Date.now(),
        };
        activeOrders.forEach(order => {
            io.to(order._id.toString()).emit('riderLocationUpdated', payload);
        });
        // Admin map broadcast (includes rider identity)
        io.to('admin_room').emit('riderLocationUpdated', {
            riderId: rider._id,
            name: rider.name,
            vehicleType: rider.vehicleDetails?.vehicleType,
            activeOrderCount: activeOrders.length,
            ...payload,
        });
    }

    res.json({ message: 'Location updated' });
});

// @desc    Get assigned orders for logged-in rider
// @route   GET /api/riders/orders
const getAssignedOrders = asyncHandler(async (req, res) => {
    const orders = await Order.find({ rider: req.rider._id })
        .populate('user', 'name phone')
        .populate('activeAssignment')
        .sort({ createdAt: -1 });
    res.json(orders);
});

// @desc    Update order status by rider
// @route   PUT /api/riders/orders/:id/status
const updateOrderStatusByRider = asyncHandler(async (req, res) => {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order || order.rider.toString() !== req.rider._id.toString()) {
        res.status(404); throw new Error('Order not found or not assigned to you');
    }

    const statusMap = {
        'Picked Up': 'pickedAt',
        'In Transit': 'inTransitAt',
        'Delivered': 'deliveredAt',
        'Completed': 'completedAt',
    };

    order.orderStatus = status;
    if (statusMap[status]) order[statusMap[status]] = new Date();
    if (status === 'Delivered') { order.isDelivered = true; }

    const updatedOrder = await order.save();

    // Update assignment status
    if (order.activeAssignment) {
        const assignMap = { 'Picked Up': 'picked_up', 'In Transit': 'in_transit', 'Delivered': 'delivered' };
        if (assignMap[status]) {
            await Assignment.findByIdAndUpdate(order.activeAssignment, {
                status: assignMap[status],
                [`${assignMap[status]}At`]: new Date()
            });
        }
    }

    const io = req.app.get('socketio');
    if (io) {
        io.to(order._id.toString()).emit('orderStatusUpdated', { status: updatedOrder.orderStatus });
        io.to('admin_room').emit('orderStatusUpdated', { orderId: order._id, status: updatedOrder.orderStatus });
    }

    res.json(updatedOrder);
});

// @desc    Get rider earnings summary
// @route   GET /api/riders/earnings
const getRiderEarnings = asyncHandler(async (req, res) => {
    const riderId = req.rider._id;

    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    const [todayAssignments, weekAssignments, allTime] = await Promise.all([
        Assignment.find({ rider: riderId, status: 'delivered', deliveredAt: { $gte: startOfDay } }),
        Assignment.find({ rider: riderId, status: 'delivered', deliveredAt: { $gte: startOfWeek } }),
        Assignment.find({ rider: riderId, status: 'delivered' })
    ]);

    const sum = (arr) => arr.reduce((s, a) => s + (a.riderEarning || 0), 0);

    res.json({
        today: { deliveries: todayAssignments.length, earnings: sum(todayAssignments) },
        thisWeek: { deliveries: weekAssignments.length, earnings: sum(weekAssignments) },
        allTime: { deliveries: allTime.length, earnings: sum(allTime) }
    });
});

// @desc    Get rider performance metrics
// @route   GET /api/riders/performance
const getRiderPerformance = asyncHandler(async (req, res) => {
    const rider = await Rider.findById(req.rider._id).select('rating ratingCount totalDeliveries avgDeliveryTimeMinutes');
    const recentOrders = await Assignment.find({ rider: req.rider._id, status: 'delivered' })
        .sort({ deliveredAt: -1 }).limit(10).populate('order', 'orderStatus totalPrice');

    res.json({ ...rider.toObject(), recentDeliveries: recentOrders });
});

// ─── ADMIN ENDPOINTS ──────────────────────────────────────────────

// @desc    Get all riders (admin)
// @route   GET /api/riders
const getRiders = asyncHandler(async (req, res) => {
    const { status, kycStatus, isOnline, zone, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (kycStatus) filter.kycStatus = kycStatus;
    if (isOnline !== undefined) filter.isOnline = isOnline === 'true';
    if (zone) filter.zone = zone;

    const riders = await Rider.find(filter)
        .populate('zone', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit));

    const total = await Rider.countDocuments(filter);
    res.json({ riders, total, page: Number(page), pages: Math.ceil(total / limit) });
});

// @desc    Get single rider detail (admin)
// @route   GET /api/riders/:id
const getRiderById = asyncHandler(async (req, res) => {
    const rider = await Rider.findById(req.params.id).populate('zone', 'name');
    if (!rider) { res.status(404); throw new Error('Rider not found'); }
    res.json(rider);
});

// @desc    Update rider status (activate/suspend/blacklist)
// @route   PUT /api/riders/:id/status
const updateRiderStatus = asyncHandler(async (req, res) => {
    const { status, reason } = req.body;
    const rider = await Rider.findById(req.params.id);
    if (!rider) { res.status(404); throw new Error('Rider not found'); }

    const before = { status: rider.status };
    rider.status = status;
    if (status !== 'active') { rider.isAvailable = false; rider.isOnline = false; }
    await rider.save();

    await createAuditLog({
        actorId: req.user._id, actorName: req.user.name, actorRole: req.user.role,
        action: `RIDER_${status.toUpperCase()}`,
        description: `Rider ${rider.name} status changed to ${status}${reason ? `. Reason: ${reason}` : ''}`,
        targetType: 'Rider', targetId: rider._id,
        before, after: { status },
        ipAddress: req.ip,
        severity: status === 'blacklisted' ? 'critical' : 'warning'
    });

    const io = req.app.get('socketio');
    if (io && status !== 'active') {
        io.to(`rider_${rider._id}`).emit('accountStatusChanged', { status, reason });
    }

    res.json({ message: `Rider ${status}`, rider });
});

// @desc    Get all active riders for live map (admin)
// @route   GET /api/riders/active
const getActiveRiders = asyncHandler(async (req, res) => {
    const riders = await Rider.find({ isOnline: true, status: 'active' })
        .select('name phone currentLocation vehicleDetails isAvailable')
        .lean();
    res.json(riders);
});

// @desc    Assign rider to order (legacy / manual from admin)
// @route   PUT /api/riders/assign
const assignRider = asyncHandler(async (req, res) => {
    const { orderId, riderId } = req.body;
    const order = await Order.findById(orderId);
    const rider = await Rider.findById(riderId);

    if (!order || !rider) { res.status(404); throw new Error('Order or Rider not found'); }

    order.rider = rider._id;
    order.orderStatus = 'Rider Assigned';
    order.assignedAt = new Date();
    const updatedOrder = await order.save();

    const io = req.app.get('socketio');
    if (io) {
        io.to(order._id.toString()).emit('orderStatusUpdated', { status: updatedOrder.orderStatus });
        io.to(`rider_${riderId}`).emit('orderAssigned', { orderId });
    }

    res.json(updatedOrder);
});

module.exports = {
    authRider, registerRider, getRiderProfile,
    updateAvailability, updateLocation,
    getAssignedOrders, updateOrderStatusByRider,
    getRiderEarnings, getRiderPerformance,
    getRiders, getRiderById, updateRiderStatus,
    getActiveRiders, assignRider
};
