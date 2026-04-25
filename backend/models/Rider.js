const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const shiftSchema = new mongoose.Schema({
    day: { type: String, enum: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] },
    startTime: String, // "09:00"
    endTime: String,   // "17:00"
});

const riderSchema = new mongoose.Schema(
    {
        name: { type: String, required: [true, 'Please add a name'] },
        phone: { type: String, required: [true, 'Please add a phone number'], unique: true },
        email: { type: String },
        password: { type: String, required: [true, 'Please add a password'], minlength: 6, select: false },

        // Vehicle
        vehicleDetails: {
            model: String,
            numberPlate: String,
            vehicleType: {
                type: String,
                enum: ['bicycle', 'motorcycle', 'scooter', 'car', 'van'],
                default: 'motorcycle'
            }
        },

        // Status & Control
        status: {
            type: String,
            enum: ['active', 'inactive', 'suspended', 'blacklisted'],
            default: 'inactive'  // inactive until KYC approved
        },
        isAvailable: { type: Boolean, default: false },
        isOnline: { type: Boolean, default: false },

        // KYC & Verification
        kycStatus: {
            type: String,
            enum: ['not_submitted', 'pending', 'approved', 'rejected'],
            default: 'not_submitted'
        },
        backgroundCheckStatus: {
            type: String,
            enum: ['not_started', 'pending', 'verified', 'failed'],
            default: 'not_started'
        },

        // Documents (stored as URLs)
        documents: {
            licenseUrl: String,
            idProofUrl: String,
            vehicleRegUrl: String,
            profilePhotoUrl: String,
        },

        // Location
        currentLocation: {
            lat: { type: Number },
            lng: { type: Number },
            updatedAt: { type: Date }
        },

        // Zone Assignment
        zone: { type: mongoose.Schema.Types.ObjectId, ref: 'Zone' },

        // Earnings & Commission
        commissionRate: { type: Number, default: 15 }, // % taken by platform
        totalEarnings: { type: Number, default: 0 },
        totalDeliveries: { type: Number, default: 0 },

        // Performance
        rating: { type: Number, default: 0 },
        ratingCount: { type: Number, default: 0 },
        avgDeliveryTimeMinutes: { type: Number, default: 0 },

        // Shift Management
        shifts: [shiftSchema],

        // Meta
        joinedAt: { type: Date, default: Date.now },
        lastActiveAt: { type: Date },
    },
    { timestamps: true }
);

riderSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

riderSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Rider', riderSchema);
