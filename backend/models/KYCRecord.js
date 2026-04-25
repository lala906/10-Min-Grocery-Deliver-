const mongoose = require('mongoose');

const auditEntrySchema = new mongoose.Schema({
    action: { type: String, required: true },        // 'submitted', 'approved', 'rejected', 'resubmitted'
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    performedByName: String,
    remarks: String,
    timestamp: { type: Date, default: Date.now }
});

const kycRecordSchema = new mongoose.Schema(
    {
        rider: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Rider',
            required: true,
            unique: true
        },
        // Documents
        licenseNumber: { type: String },
        licenseUrl: { type: String },
        idProofType: {
            type: String,
            enum: ['aadhaar', 'pan', 'passport', 'voter_id'],
        },
        idProofNumber: { type: String },
        idProofUrl: { type: String },
        vehicleRegUrl: { type: String },
        selfieUrl: { type: String },

        // Status
        status: {
            type: String,
            enum: ['not_submitted', 'pending', 'approved', 'rejected'],
            default: 'not_submitted'
        },

        // Admin Review
        reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reviewedAt: Date,
        rejectionReason: String,

        // Audit Trail
        auditTrail: [auditEntrySchema],

        submittedAt: Date,
    },
    { timestamps: true }
);

module.exports = mongoose.model('KYCRecord', kycRecordSchema);
