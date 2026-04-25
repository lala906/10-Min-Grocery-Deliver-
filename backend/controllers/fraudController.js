const asyncHandler = require('express-async-handler');
const FraudFlag = require('../models/FraudFlag');
const User = require('../models/User');
const Order = require('../models/Order');

// @desc    Get all fraud flags (Admin)
// @route   GET /api/fraud
// @access  Admin
const getFraudFlags = asyncHandler(async (req, res) => {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = status ? { status } : {};

    const flags = await FraudFlag.find(filter)
        .populate('user', 'name email phone riskScore isFlagged')
        .sort({ riskScore: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit));

    const total = await FraudFlag.countDocuments(filter);
    const highRisk = await FraudFlag.countDocuments({ riskScore: { $gte: 60 } });
    const criticalRisk = await FraudFlag.countDocuments({ riskScore: { $gte: 80 } });

    res.json({
        status: 'success',
        data: { flags, total, highRisk, criticalRisk }
    });
});

// @desc    Resolve a fraud flag
// @route   PUT /api/fraud/:id/resolve
// @access  Admin
const resolveFlag = asyncHandler(async (req, res) => {
    const { action, resolution } = req.body; // action: 'dismiss' | 'block_user' | 'acknowledge'
    const flag = await FraudFlag.findById(req.params.id).populate('user');
    if (!flag) {
        res.status(404);
        throw new Error('Fraud flag not found');
    }

    flag.status = action === 'dismiss' ? 'dismissed' : 'actioned';
    flag.resolution = resolution;
    flag.resolvedBy = req.user._id;
    flag.resolvedAt = new Date();
    await flag.save();

    // Block user if action is block
    if (action === 'block_user' && flag.user) {
        await User.findByIdAndUpdate(flag.user._id, {
            isBlocked: true,
            isFlagged: true,
            riskScore: 100
        });
    }

    res.json({ status: 'success', message: `Flag ${flag.status}`, data: flag });
});

// @desc    Get suspicious users
// @route   GET /api/fraud/users
// @access  Admin
const getSuspiciousUsers = asyncHandler(async (req, res) => {
    const users = await User.find({ riskScore: { $gte: 30 } })
        .select('name email phone riskScore isFlagged isBlocked createdAt')
        .sort({ riskScore: -1 })
        .limit(50);

    res.json({ status: 'success', data: users });
});

// @desc    Mark order as suspicious manually
// @route   POST /api/fraud/flag
// @access  Admin
const manualFlag = asyncHandler(async (req, res) => {
    const { userId, type, details, referenceId } = req.body;
    const flag = await FraudFlag.create({
        user: userId,
        type,
        details,
        referenceId,
        riskScore: 50
    });

    res.status(201).json({ status: 'success', data: flag });
});

module.exports = { getFraudFlags, resolveFlag, getSuspiciousUsers, manualFlag };
