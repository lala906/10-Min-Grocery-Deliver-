const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
    {
        // Who did it
        actorId: { type: mongoose.Schema.Types.ObjectId, required: true },
        actorName: { type: String },
        actorRole: {
            type: String,
            enum: ['admin', 'super_admin', 'kyc_admin', 'support_admin', 'rider', 'customer', 'system'],
            required: true
        },

        // What was done
        action: {
            type: String,
            required: true,
            // e.g. 'KYC_APPROVED', 'RIDER_SUSPENDED', 'ORDER_ASSIGNED', 'PAYOUT_PROCESSED'
        },
        description: { type: String },

        // What was affected
        targetType: {
            type: String,
            enum: ['Rider', 'Order', 'KYCRecord', 'Assignment', 'Payout', 'Dispute', 'Zone', 'Product', 'User', 'AssignmentConfig', 'System'],
        },
        targetId: { type: mongoose.Schema.Types.ObjectId },

        // Before / After snapshot (optional)
        before: { type: mongoose.Schema.Types.Mixed },
        after: { type: mongoose.Schema.Types.Mixed },

        // Request metadata
        ipAddress: String,
        userAgent: String,

        // Severity
        severity: {
            type: String,
            enum: ['info', 'warning', 'critical'],
            default: 'info'
        },

        timestamp: { type: Date, default: Date.now, index: true }
    },
    {
        // No updatedAt needed — logs are immutable
        timestamps: { createdAt: 'timestamp', updatedAt: false }
    }
);

// Compound index for fast admin queries
auditLogSchema.index({ actorId: 1, timestamp: -1 });
auditLogSchema.index({ targetType: 1, targetId: 1 });
auditLogSchema.index({ action: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
