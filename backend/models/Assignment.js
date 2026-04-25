const mongoose = require('mongoose');

const reassignmentEntrySchema = new mongoose.Schema({
    fromRider: { type: mongoose.Schema.Types.ObjectId, ref: 'Rider' },
    toRider: { type: mongoose.Schema.Types.ObjectId, ref: 'Rider' },
    reason: String,
    reassignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reassignedAt: { type: Date, default: Date.now }
});

const assignmentSchema = new mongoose.Schema(
    {
        order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
        rider: { type: mongoose.Schema.Types.ObjectId, ref: 'Rider', required: true },

        // How was it assigned?
        assignmentMode: {
            type: String,
            enum: ['auto', 'manual'],
            required: true
        },
        assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // null = auto

        // Assignment lifecycle
        status: {
            type: String,
            enum: ['pending', 'accepted', 'rejected', 'reassigned', 'picked_up', 'in_transit', 'delivered', 'cancelled'],
            default: 'pending'
        },

        // Scoring at time of assignment (for audit)
        score: { type: Number },
        distanceKm: { type: Number },

        // Timestamps for each stage
        assignedAt: { type: Date, default: Date.now },
        acceptedAt: Date,
        rejectedAt: Date,
        pickedAt: Date,
        inTransitAt: Date,
        deliveredAt: Date,

        // Rejection reason from rider
        rejectionReason: String,

        // Reassignment history
        reassignmentHistory: [reassignmentEntrySchema],

        // Earnings for this assignment
        deliveryFee: { type: Number, default: 0 },
        commissionAmount: { type: Number, default: 0 },
        riderEarning: { type: Number, default: 0 },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Assignment', assignmentSchema);
