const asyncHandler = require('express-async-handler');
const Zone = require('../models/Zone');
const Rider = require('../models/Rider');
const { createAuditLog } = require('../services/auditLogger');

// @desc    Get all zones
// @route   GET /api/zones
// @access  Private/Admin
const getZones = asyncHandler(async (req, res) => {
    const zones = await Zone.find({})
        .populate('assignedRiders', 'name phone isOnline status')
        .sort({ name: 1 });
    res.json(zones);
});

// @desc    Create zone
// @route   POST /api/zones
// @access  Private/Admin
const createZone = asyncHandler(async (req, res) => {
    const { name, description, center, baseDeliveryFee, maxDeliveryRadiusKm, color } = req.body;

    const exists = await Zone.findOne({ name });
    if (exists) { res.status(400); throw new Error('Zone with this name already exists'); }

    const zone = await Zone.create({ name, description, center, baseDeliveryFee, maxDeliveryRadiusKm, color });

    await createAuditLog({
        actorId: req.user._id, actorName: req.user.name, actorRole: req.user.role,
        action: 'ZONE_CREATED', description: `Zone "${name}" created`,
        targetType: 'Zone', targetId: zone._id, severity: 'info'
    });

    res.status(201).json(zone);
});

// @desc    Update zone
// @route   PUT /api/zones/:id
// @access  Private/Admin
const updateZone = asyncHandler(async (req, res) => {
    const zone = await Zone.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!zone) { res.status(404); throw new Error('Zone not found'); }

    await createAuditLog({
        actorId: req.user._id, actorName: req.user.name, actorRole: req.user.role,
        action: 'ZONE_UPDATED', description: `Zone "${zone.name}" updated`,
        targetType: 'Zone', targetId: zone._id, severity: 'info'
    });

    res.json(zone);
});

// @desc    Delete zone
// @route   DELETE /api/zones/:id
// @access  Private/Admin
const deleteZone = asyncHandler(async (req, res) => {
    const zone = await Zone.findById(req.params.id);
    if (!zone) { res.status(404); throw new Error('Zone not found'); }
    await zone.deleteOne();

    await createAuditLog({
        actorId: req.user._id, actorName: req.user.name, actorRole: req.user.role,
        action: 'ZONE_DELETED', description: `Zone "${zone.name}" deleted`,
        targetType: 'Zone', targetId: zone._id, severity: 'warning'
    });

    res.json({ message: 'Zone deleted' });
});

// @desc    Assign riders to a zone
// @route   PUT /api/zones/:id/riders
// @access  Private/Admin
const assignRidersToZone = asyncHandler(async (req, res) => {
    const { riderIds } = req.body; // array of rider IDs
    const zone = await Zone.findById(req.params.id);
    if (!zone) { res.status(404); throw new Error('Zone not found'); }

    zone.assignedRiders = riderIds;
    await zone.save();

    // Update zone field on each rider
    await Rider.updateMany({ _id: { $in: riderIds } }, { zone: zone._id });
    // Remove zone from riders not in list
    await Rider.updateMany(
        { zone: zone._id, _id: { $nin: riderIds } },
        { $unset: { zone: 1 } }
    );

    await createAuditLog({
        actorId: req.user._id, actorName: req.user.name, actorRole: req.user.role,
        action: 'ZONE_RIDERS_UPDATED', description: `${riderIds.length} riders assigned to zone "${zone.name}"`,
        targetType: 'Zone', targetId: zone._id, severity: 'info'
    });

    res.json({ message: 'Riders assigned to zone', zone });
});

module.exports = { getZones, createZone, updateZone, deleteZone, assignRidersToZone };
