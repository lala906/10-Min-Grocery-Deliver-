const asyncHandler = require('express-async-handler');
const Payout = require('../models/Payout');
const Assignment = require('../models/Assignment');
const Rider = require('../models/Rider');
const { createAuditLog } = require('../services/auditLogger');

// @desc    Calculate & create payout for a rider for a date range
// @route   POST /api/payouts/calculate
// @access  Private/Admin
const calculatePayout = asyncHandler(async (req, res) => {
    const { riderId, periodStart, periodEnd, periodLabel } = req.body;

    const rider = await Rider.findById(riderId);
    if (!rider) { res.status(404); throw new Error('Rider not found'); }

    const start = new Date(periodStart);
    const end = new Date(periodEnd);

    // Find all delivered assignments in period
    const assignments = await Assignment.find({
        rider: riderId,
        status: 'delivered',
        deliveredAt: { $gte: start, $lte: end }
    }).populate('order', '_id totalPrice');

    const lineItems = assignments.map(a => ({
        assignment: a._id,
        order: a.order?._id,
        deliveryFee: a.deliveryFee,
        commissionRate: rider.commissionRate,
        commissionAmount: a.commissionAmount,
        riderEarning: a.riderEarning,
        deliveredAt: a.deliveredAt
    }));

    const grossEarnings = lineItems.reduce((s, l) => s + (l.deliveryFee || 0), 0);
    const totalCommission = lineItems.reduce((s, l) => s + (l.commissionAmount || 0), 0);
    const netPayout = lineItems.reduce((s, l) => s + (l.riderEarning || 0), 0);

    const payout = await Payout.create({
        rider: riderId,
        periodStart: start,
        periodEnd: end,
        periodLabel: periodLabel || `${start.toDateString()} – ${end.toDateString()}`,
        totalDeliveries: assignments.length,
        grossEarnings,
        totalCommission,
        netPayout,
        lineItems,
        status: 'pending',
    });

    await createAuditLog({
        actorId: req.user._id,
        actorName: req.user.name,
        actorRole: req.user.role,
        action: 'PAYOUT_CALCULATED',
        description: `Payout calculated for ${rider.name}: ₹${netPayout} for ${assignments.length} deliveries`,
        targetType: 'Payout',
        targetId: payout._id,
        severity: 'info'
    });

    res.status(201).json({ payout });
});

// @desc    Get all payouts (with filters)
// @route   GET /api/payouts
// @access  Private/Admin
const getAllPayouts = asyncHandler(async (req, res) => {
    const { status, riderId, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (riderId) filter.rider = riderId;

    const payouts = await Payout.find(filter)
        .populate('rider', 'name phone')
        .populate('processedBy', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit));

    const total = await Payout.countDocuments(filter);
    res.json({ payouts, total, page: Number(page), pages: Math.ceil(total / limit) });
});

// @desc    Get payouts for a specific rider
// @route   GET /api/payouts/rider/:riderId
// @access  Private/Admin or Rider
const getRiderPayouts = asyncHandler(async (req, res) => {
    const payouts = await Payout.find({ rider: req.params.riderId })
        .sort({ createdAt: -1 });
    res.json(payouts);
});

// @desc    Mark payout as paid
// @route   PUT /api/payouts/:id/mark-paid
// @access  Private/Admin
const markPayoutPaid = asyncHandler(async (req, res) => {
    const { paymentRef, paymentMethod } = req.body;
    const payout = await Payout.findById(req.params.id).populate('rider', 'name');
    if (!payout) { res.status(404); throw new Error('Payout not found'); }

    payout.status = 'paid';
    payout.paidAt = new Date();
    payout.paymentRef = paymentRef;
    payout.paymentMethod = paymentMethod || 'bank_transfer';
    payout.processedBy = req.user._id;
    await payout.save();

    // Update rider's total earnings
    await Rider.findByIdAndUpdate(payout.rider._id, {
        $inc: { totalEarnings: payout.netPayout }
    });

    await createAuditLog({
        actorId: req.user._id, actorName: req.user.name, actorRole: req.user.role,
        action: 'PAYOUT_MARKED_PAID',
        description: `Payout of ₹${payout.netPayout} marked as paid for ${payout.rider.name}`,
        targetType: 'Payout', targetId: payout._id, severity: 'info'
    });

    res.json({ message: 'Payout marked as paid', payout });
});

// @desc    Export payouts as CSV
// @route   GET /api/payouts/export
// @access  Private/Admin
const exportPayoutsCSV = asyncHandler(async (req, res) => {
    const { status, riderId, from, to } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (riderId) filter.rider = riderId;
    if (from || to) {
        filter.createdAt = {};
        if (from) filter.createdAt.$gte = new Date(from);
        if (to) filter.createdAt.$lte = new Date(to);
    }

    const payouts = await Payout.find(filter)
        .populate('rider', 'name phone')
        .populate('processedBy', 'name')
        .sort({ createdAt: -1 })
        .lean();

    const headers = ['Rider Name', 'Phone', 'Period', 'Deliveries', 'Gross (₹)', 'Commission (₹)', 'Net Payout (₹)', 'Status', 'Paid At', 'Payment Ref'];
    const rows = payouts.map(p => [
        p.rider?.name || '',
        p.rider?.phone || '',
        p.periodLabel || '',
        p.totalDeliveries,
        p.grossEarnings.toFixed(2),
        p.totalCommission.toFixed(2),
        p.netPayout.toFixed(2),
        p.status,
        p.paidAt ? new Date(p.paidAt).toLocaleDateString() : '',
        p.paymentRef || ''
    ]);

    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="payouts.csv"');
    res.send(csv);
});

module.exports = { calculatePayout, getAllPayouts, getRiderPayouts, markPayoutPaid, exportPayoutsCSV };
