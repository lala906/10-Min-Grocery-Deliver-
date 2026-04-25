const mongoose = require('mongoose');

const evidenceSchema = new mongoose.Schema({
    url: { type: String, required: true },
    type: { type: String, enum: ['image', 'video', 'document'], default: 'image' },
    description: String,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId },
    uploadedByRole: { type: String, enum: ['admin', 'rider', 'customer'] },
    uploadedAt: { type: Date, default: Date.now }
});

const timelineEntrySchema = new mongoose.Schema({
    action: String,
    performedBy: { type: mongoose.Schema.Types.ObjectId },
    performedByRole: String,
    performedByName: String,
    note: String,
    timestamp: { type: Date, default: Date.now }
});

const disputeSchema = new mongoose.Schema(
    {
        order: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order',
            required: true,
            index: true
        },

        // Who raised it
        raisedBy: { type: mongoose.Schema.Types.ObjectId, required: true },
        raisedByRole: {
            type: String,
            enum: ['customer', 'rider', 'admin'],
            required: true
        },
        raisedByName: String,

        // Dispute details
        type: {
            type: String,
            enum: ['delivery_issue', 'payment_issue', 'rider_behavior', 'wrong_item', 'missing_item', 'other'],
            required: true
        },
        description: { type: String, required: true },

        // Evidence
        evidence: [evidenceSchema],

        // Status & Assignment
        status: {
            type: String,
            enum: ['open', 'under_review', 'resolved', 'escalated', 'closed'],
            default: 'open'
        },
        priority: {
            type: String,
            enum: ['low', 'medium', 'high', 'critical'],
            default: 'medium'
        },
        assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // admin

        // Resolution
        resolution: String,
        resolvedAt: Date,
        resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

        // Timeline (audit trail of actions)
        timeline: [timelineEntrySchema],

        // Refund / Compensation
        compensationAmount: { type: Number, default: 0 },
        compensationStatus: {
            type: String,
            enum: ['none', 'pending', 'approved', 'rejected', 'paid'],
            default: 'none'
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Dispute', disputeSchema);
