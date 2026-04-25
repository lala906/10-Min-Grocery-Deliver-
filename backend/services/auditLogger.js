const AuditLog = require('../models/AuditLog');

/**
 * Creates an audit log entry.
 * @param {Object} params
 * @param {string} params.actorId - ID of who performed the action
 * @param {string} params.actorName - Name of who performed the action
 * @param {string} params.actorRole - Role: 'admin', 'rider', 'system', etc.
 * @param {string} params.action - Action code e.g. 'KYC_APPROVED'
 * @param {string} params.description - Human-readable description
 * @param {string} params.targetType - Model name e.g. 'Rider', 'Order'
 * @param {string} params.targetId - Document ID
 * @param {Object} params.before - State before action
 * @param {Object} params.after - State after action
 * @param {string} params.ipAddress
 * @param {string} params.severity - 'info', 'warning', 'critical'
 */
const createAuditLog = async ({
    actorId,
    actorName = 'System',
    actorRole = 'system',
    action,
    description,
    targetType,
    targetId,
    before,
    after,
    ipAddress,
    userAgent,
    severity = 'info'
}) => {
    try {
        await AuditLog.create({
            actorId,
            actorName,
            actorRole,
            action,
            description,
            targetType,
            targetId,
            before,
            after,
            ipAddress,
            userAgent,
            severity,
            timestamp: new Date()
        });
    } catch (err) {
        // Audit logging should never crash the main operation
        console.error('[AuditLogger] Failed to write audit log:', err.message);
    }
};

module.exports = { createAuditLog };
