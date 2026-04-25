const asyncHandler = require('express-async-handler');
const Assignment = require('../models/Assignment');
const AssignmentConfig = require('../models/AssignmentConfig');
const Order = require('../models/Order');
const Rider = require('../models/Rider');
const { autoAssign } = require('../services/assignmentEngine');
const { createAuditLog } = require('../services/auditLogger');

// @desc    Auto-assign rider to order
// @route   POST /api/assignments/auto
// @access  Private/Admin
const triggerAutoAssign = asyncHandler(async (req, res) => {
    const { orderId } = req.body;
    const order = await Order.findById(orderId);
    if (!order) { res.status(404); throw new Error('Order not found'); }
    if (order.rider) { res.status(400); throw new Error('Order already has a rider assigned'); }

    const { assignment, rider } = await autoAssign(order, req.user._id);
    const io = req.app.get('socketio');
    if (io) {
        io.to(order._id.toString()).emit('orderStatusUpdated', { status: 'Rider Assigned' });
        io.to(`rider_${rider._id}`).emit('orderAssigned', { orderId: order._id, assignment });
    }

    res.status(201).json({ message: 'Auto-assignment successful', assignment, rider });
});

// @desc    Manually assign a specific rider to an order
// @route   POST /api/assignments/manual
// @access  Private/Admin
const manualAssign = asyncHandler(async (req, res) => {
    const { orderId, riderId, reason } = req.body;

    const order = await Order.findById(orderId);
    const rider = await Rider.findById(riderId);

    if (!order) { res.status(404); throw new Error('Order not found'); }
    if (!rider) { res.status(404); throw new Error('Rider not found'); }
    if (rider.status !== 'active') { res.status(400); throw new Error('Rider is not active'); }

    // If there's an existing assignment, mark it as reassigned
    if (order.activeAssignment) {
        await Assignment.findByIdAndUpdate(order.activeAssignment, { status: 'reassigned' });
    }

    const deliveryFee = order.deliveryFee || 20;
    const commissionRate = rider.commissionRate || 15;
    const commissionAmount = (deliveryFee * commissionRate) / 100;

    const assignment = await Assignment.create({
        order: order._id,
        rider: rider._id,
        assignmentMode: 'manual',
        assignedBy: req.user._id,
        status: 'pending',
        deliveryFee,
        commissionAmount,
        riderEarning: deliveryFee - commissionAmount,
        assignedAt: new Date()
    });

    order.rider = rider._id;
    order.activeAssignment = assignment._id;
    order.orderStatus = 'Rider Assigned';
    order.assignedAt = new Date();
    await order.save();

    await createAuditLog({
        actorId: req.user._id,
        actorName: req.user.name,
        actorRole: req.user.role,
        action: 'ORDER_MANUALLY_ASSIGNED',
        description: `Order ${orderId} manually assigned to rider ${rider.name}${reason ? `. Reason: ${reason}` : ''}`,
        targetType: 'Assignment',
        targetId: assignment._id,
        ipAddress: req.ip,
        severity: 'info'
    });

    const io = req.app.get('socketio');
    if (io) {
        io.to(order._id.toString()).emit('orderStatusUpdated', { status: 'Rider Assigned' });
        io.to(`rider_${riderId}`).emit('orderAssigned', { orderId, assignment });
    }

    res.status(201).json({ message: 'Manual assignment successful', assignment });
});

// @desc    Reassign order to a different rider
// @route   PUT /api/assignments/:id/reassign
// @access  Private/Admin
const reassignOrder = asyncHandler(async (req, res) => {
    const { newRiderId, reason } = req.body;
    const currentAssignment = await Assignment.findById(req.params.id).populate('rider');
    if (!currentAssignment) { res.status(404); throw new Error('Assignment not found'); }

    const newRider = await Rider.findById(newRiderId);
    if (!newRider) { res.status(404); throw new Error('New rider not found'); }

    const order = await Order.findById(currentAssignment.order);

    // Record reassignment
    const reassignEntry = {
        fromRider: currentAssignment.rider._id,
        toRider: newRiderId,
        reason: reason || 'Admin reassignment',
        reassignedBy: req.user._id,
        reassignedAt: new Date()
    };

    currentAssignment.status = 'reassigned';
    currentAssignment.reassignmentHistory.push(reassignEntry);
    await currentAssignment.save();

    // Create new assignment
    const deliveryFee = order.deliveryFee || 20;
    const commissionRate = newRider.commissionRate || 15;
    const commissionAmount = (deliveryFee * commissionRate) / 100;

    const newAssignment = await Assignment.create({
        order: order._id,
        rider: newRiderId,
        assignmentMode: 'manual',
        assignedBy: req.user._id,
        status: 'pending',
        deliveryFee,
        commissionAmount,
        riderEarning: deliveryFee - commissionAmount,
        reassignmentHistory: [reassignEntry],
        assignedAt: new Date()
    });

    order.rider = newRiderId;
    order.activeAssignment = newAssignment._id;
    order.orderStatus = 'Rider Assigned';
    await order.save();

    await createAuditLog({
        actorId: req.user._id,
        actorName: req.user.name,
        actorRole: req.user.role,
        action: 'ORDER_REASSIGNED',
        description: `Order ${order._id} reassigned from ${currentAssignment.rider.name} to ${newRider.name}. Reason: ${reason}`,
        targetType: 'Assignment',
        targetId: newAssignment._id,
        ipAddress: req.ip,
        severity: 'warning'
    });

    const io = req.app.get('socketio');
    if (io) {
        io.to(order._id.toString()).emit('orderStatusUpdated', { status: 'Rider Assigned' });
        io.to(`rider_${newRiderId}`).emit('orderAssigned', { orderId: order._id, assignment: newAssignment });
    }

    res.json({ message: 'Reassignment successful', assignment: newAssignment });
});

// @desc    Get assignment history for an order
// @route   GET /api/assignments/history/:orderId
// @access  Private/Admin
const getAssignmentHistory = asyncHandler(async (req, res) => {
    const assignments = await Assignment.find({ order: req.params.orderId })
        .populate('rider', 'name phone vehicleDetails')
        .populate('assignedBy', 'name email')
        .sort({ assignedAt: -1 });
    res.json(assignments);
});

// @desc    Rider accepts assignment
// @route   PUT /api/assignments/:id/accept
// @access  Private/Rider
const acceptAssignment = asyncHandler(async (req, res) => {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) { res.status(404); throw new Error('Assignment not found'); }
    if (assignment.rider.toString() !== req.rider._id.toString()) {
        res.status(403); throw new Error('Not your assignment');
    }

    assignment.status = 'accepted';
    assignment.acceptedAt = new Date();
    await assignment.save();

    const io = req.app.get('socketio');
    if (io) {
        io.to(assignment.order.toString()).emit('assignmentAccepted', { assignmentId: assignment._id });
        io.to('admin_room').emit('assignmentAccepted', { assignmentId: assignment._id, riderId: req.rider._id });
    }

    res.json({ message: 'Assignment accepted', assignment });
});

// @desc    Rider rejects assignment
// @route   PUT /api/assignments/:id/reject
// @access  Private/Rider
const rejectAssignment = asyncHandler(async (req, res) => {
    const { reason } = req.body;
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) { res.status(404); throw new Error('Assignment not found'); }
    if (assignment.rider.toString() !== req.rider._id.toString()) {
        res.status(403); throw new Error('Not your assignment');
    }

    assignment.status = 'rejected';
    assignment.rejectedAt = new Date();
    assignment.rejectionReason = reason || 'No reason given';
    await assignment.save();

    const io = req.app.get('socketio');
    if (io) {
        io.to('admin_room').emit('assignmentRejected', {
            assignmentId: assignment._id,
            orderId: assignment.order,
            riderId: req.rider._id,
            reason: assignment.rejectionReason
        });
    }

    res.json({ message: 'Assignment rejected', assignment });
});

// @desc    Get/Update assignment engine config
// @route   GET /api/assignments/config
// @route   PUT /api/assignments/config
// @access  Private/Admin
const getConfig = asyncHandler(async (req, res) => {
    let config = await AssignmentConfig.findOne({ singleton: true });
    if (!config) config = await AssignmentConfig.create({ singleton: true });
    res.json(config);
});

const updateConfig = asyncHandler(async (req, res) => {
    const before = await AssignmentConfig.findOne({ singleton: true });
    const config = await AssignmentConfig.findOneAndUpdate(
        { singleton: true },
        { ...req.body, updatedBy: req.user._id },
        { new: true, upsert: true }
    );

    await createAuditLog({
        actorId: req.user._id,
        actorName: req.user.name,
        actorRole: req.user.role,
        action: 'ASSIGNMENT_CONFIG_UPDATED',
        description: 'Assignment engine configuration updated',
        targetType: 'AssignmentConfig',
        targetId: config._id,
        before: before?.toObject(),
        after: config.toObject(),
        ipAddress: req.ip,
        severity: 'warning'
    });

    res.json({ message: 'Config updated', config });
});

module.exports = {
    triggerAutoAssign, manualAssign, reassignOrder,
    getAssignmentHistory, acceptAssignment, rejectAssignment,
    getConfig, updateConfig
};
