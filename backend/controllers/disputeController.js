const asyncHandler = require('express-async-handler');
const Dispute = require('../models/Dispute');
const Order = require('../models/Order');
const { createAuditLog } = require('../services/auditLogger');

// Helper to push timeline entry
const addTimeline = (dispute, action, req, note) => {
    dispute.timeline.push({
        action,
        performedBy: req.user?._id || req.rider?._id,
        performedByRole: req.user ? req.user.role : 'rider',
        performedByName: req.user?.name || req.rider?.name,
        note,
        timestamp: new Date()
    });
};

// @desc    Raise a dispute
// @route   POST /api/disputes
// @access  Private (Customer or Rider or Admin)
const raiseDispute = asyncHandler(async (req, res) => {
    const { orderId, type, description, priority } = req.body;

    const order = await Order.findById(orderId);
    if (!order) { res.status(404); throw new Error('Order not found'); }
    if (order.dispute) { res.status(400); throw new Error('Dispute already raised for this order'); }

    const actor = req.user || req.rider;
    const actorRole = req.user ? 'customer' : 'rider';

    const dispute = await Dispute.create({
        order: orderId,
        raisedBy: actor._id,
        raisedByRole: actorRole,
        raisedByName: actor.name,
        type,
        description,
        priority: priority || 'medium',
        status: 'open',
        timeline: [{
            action: 'dispute_raised',
            performedByRole: actorRole,
            performedByName: actor.name,
            timestamp: new Date()
        }]
    });

    order.dispute = dispute._id;
    await order.save();

    res.status(201).json({ message: 'Dispute raised', dispute });
});

// @desc    Get all disputes (Admin)
// @route   GET /api/disputes
// @access  Private/Admin
const getAllDisputes = asyncHandler(async (req, res) => {
    const { status, priority, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const disputes = await Dispute.find(filter)
        .populate('order', '_id orderStatus totalPrice')
        .populate('assignedTo', 'name email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit));

    const total = await Dispute.countDocuments(filter);
    res.json({ disputes, total, page: Number(page), pages: Math.ceil(total / limit) });
});

// @desc    Get single dispute
// @route   GET /api/disputes/:id
// @access  Private/Admin
const getDisputeById = asyncHandler(async (req, res) => {
    const dispute = await Dispute.findById(req.params.id)
        .populate('order')
        .populate('assignedTo', 'name email')
        .populate('resolvedBy', 'name email');
    if (!dispute) { res.status(404); throw new Error('Dispute not found'); }
    res.json(dispute);
});

// @desc    Upload evidence to dispute
// @route   POST /api/disputes/:id/evidence
// @access  Private
const addEvidence = asyncHandler(async (req, res) => {
    const { url, type, description } = req.body;
    const dispute = await Dispute.findById(req.params.id);
    if (!dispute) { res.status(404); throw new Error('Dispute not found'); }

    const actor = req.user || req.rider;
    dispute.evidence.push({
        url, type: type || 'image', description,
        uploadedBy: actor._id,
        uploadedByRole: req.user ? req.user.role : 'rider',
        uploadedAt: new Date()
    });

    addTimeline(dispute, 'evidence_added', req, `Evidence uploaded: ${description || url}`);
    await dispute.save();

    res.json({ message: 'Evidence added', dispute });
});

// @desc    Update dispute status / assign to admin
// @route   PUT /api/disputes/:id/status
// @access  Private/Admin
const updateDisputeStatus = asyncHandler(async (req, res) => {
    const { status, assignedTo, note, priority } = req.body;
    const dispute = await Dispute.findById(req.params.id);
    if (!dispute) { res.status(404); throw new Error('Dispute not found'); }

    if (status) dispute.status = status;
    if (assignedTo) dispute.assignedTo = assignedTo;
    if (priority) dispute.priority = priority;
    addTimeline(dispute, `status_changed_to_${status || 'updated'}`, req, note);

    await dispute.save();

    await createAuditLog({
        actorId: req.user._id, actorName: req.user.name, actorRole: req.user.role,
        action: 'DISPUTE_STATUS_UPDATED',
        description: `Dispute ${dispute._id} status → ${status}`,
        targetType: 'Dispute', targetId: dispute._id, severity: 'info'
    });

    res.json({ message: 'Dispute updated', dispute });
});

// @desc    Resolve dispute
// @route   PUT /api/disputes/:id/resolve
// @access  Private/Admin
const resolveDispute = asyncHandler(async (req, res) => {
    const { resolution, compensationAmount } = req.body;
    const dispute = await Dispute.findById(req.params.id);
    if (!dispute) { res.status(404); throw new Error('Dispute not found'); }

    dispute.status = 'resolved';
    dispute.resolution = resolution;
    dispute.resolvedAt = new Date();
    dispute.resolvedBy = req.user._id;
    if (compensationAmount) {
        dispute.compensationAmount = compensationAmount;
        dispute.compensationStatus = 'approved';
    }

    addTimeline(dispute, 'resolved', req, resolution);
    await dispute.save();

    await createAuditLog({
        actorId: req.user._id, actorName: req.user.name, actorRole: req.user.role,
        action: 'DISPUTE_RESOLVED',
        description: `Dispute ${dispute._id} resolved. Resolution: ${resolution}`,
        targetType: 'Dispute', targetId: dispute._id, severity: 'info'
    });

    res.json({ message: 'Dispute resolved', dispute });
});

module.exports = { raiseDispute, getAllDisputes, getDisputeById, addEvidence, updateDisputeStatus, resolveDispute };
