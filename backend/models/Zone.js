const mongoose = require('mongoose');

const zoneSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, unique: true },
        description: String,

        // GeoJSON polygon for the zone boundary
        polygon: {
            type: {
                type: String,
                enum: ['Polygon'],
                default: 'Polygon'
            },
            coordinates: {
                type: [[[Number]]], // Array of arrays of [lng, lat] pairs
            }
        },

        // Center point (for distance calculations)
        center: {
            lat: Number,
            lng: Number
        },

        // Assigned riders
        assignedRiders: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Rider'
        }],

        // Zone settings
        isActive: { type: Boolean, default: true },
        baseDeliveryFee: { type: Number, default: 20 },
        maxDeliveryRadiusKm: { type: Number, default: 5 },

        // Meta
        color: { type: String, default: '#10b981' }, // For map display
    },
    { timestamps: true }
);

// 2dsphere index for geo queries
zoneSchema.index({ polygon: '2dsphere' });

module.exports = mongoose.model('Zone', zoneSchema);
