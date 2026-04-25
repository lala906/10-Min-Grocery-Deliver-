const asyncHandler = require('express-async-handler');
const AuditLog = require('../models/AuditLog');

// @desc    Get audit logs (with filters)
// @route   GET /api/audit
// @access  Private/Admin
const getAuditLogs = asyncHandler(async (req, res) => {
    const {
        actorRole, action, targetType, targetId,
        severity, from, to,
        page = 1, limit = 50
    } = req.query;

    const filter = {};
    if (actorRole) filter.actorRole = actorRole;
    if (action) filter.action = new RegExp(action, 'i');
    if (targetType) filter.targetType = targetType;
    if (targetId) filter.targetId = targetId;
    if (severity) filter.severity = severity;
    if (from || to) {
        filter.timestamp = {};
        if (from) filter.timestamp.$gte = new Date(from);
        if (to) filter.timestamp.$lte = new Date(to);
    }

    const logs = await AuditLog.find(filter)
        .sort({ timestamp: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit));

    const total = await AuditLog.countDocuments(filter);
    res.json({ logs, total, page: Number(page), pages: Math.ceil(total / limit) });
});

// @desc    Get audit logs for a specific target
// @route   GET /api/audit/target/:type/:id
// @access  Private/Admin
const getTargetLogs = asyncHandler(async (req, res) => {
    const logs = await AuditLog.find({
        targetType: req.params.type,
        targetId: req.params.id
    }).sort({ timestamp: -1 }).limit(100);

    res.json(logs);
});

module.exports = { getAuditLogs, getTargetLogs };
