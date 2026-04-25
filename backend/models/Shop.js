const mongoose = require('mongoose');

const shopSchema = new mongoose.Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    shopName: {
        type: String,
        required: true
    },
    address: {
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        postalCode: { type: String, required: true },
    },
    location: {
        lat: { type: Number },
        lng: { type: Number }
    },
    category: {
        type: String,
        enum: ['kirana', 'dairy', 'bakery', 'pharmacy'],
        required: true
    },
    shopImage: { type: String }, // optional initially
    shopFrontImage: { type: String, required: true },
    isOpen: {
        type: Boolean,
        default: false
    },
    rating: {
        type: Number,
        default: 0
    },
    totalOrders: {
        type: Number,
        default: 0
    },
    revenue: {
        type: Number,
        default: 0
    },
    // KYC Documentation
    kycDetails: {
        aadhaarNumber: { type: String, required: true },
        aadhaarImage: { type: String, required: true },
        panNumber: { type: String, required: true },
        panImage: { type: String, required: true },
        gstCertificate: { type: String } // Optional
    },
    // Bank Details
    bankDetails: {
        accountHolderName: { type: String, required: true },
        accountNumber: { type: String, required: true },
        ifscCode: { type: String, required: true }
    },
    // KYC Status Management
    kycStatus: {
        type: String,
        enum: ['pending', 'under_review', 'approved', 'rejected'],
        default: 'pending'
    },
    rejectionReason: {
        type: String
    },
    // Admin Controls
    isBlocked: {
        type: Boolean,
        default: false
    },
    commissionPercentage: {
        type: Number,
        default: 10 // Default 10% commission
    }
}, { timestamps: true });

// Optional text index for search
shopSchema.index({ shopName: 'text', category: 'text' });
// Spatial index for location based queries
shopSchema.index({ 'location': '2dsphere' });

module.exports = mongoose.model('Shop', shopSchema);
