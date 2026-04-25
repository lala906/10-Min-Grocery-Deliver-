const mongoose = require('mongoose');

const assignmentConfigSchema = new mongoose.Schema(
    {
        // Singleton — only one config document
        singleton: { type: Boolean, default: true, unique: true },

        // Master toggle
        autoAssignEnabled: { type: Boolean, default: true },

        // Rule weights (must sum to 100)
        rules: {
            proximityWeight: { type: Number, default: 40 },   // % weight for distance
            ratingWeight: { type: Number, default: 25 },      // % weight for rider rating
            workloadWeight: { type: Number, default: 25 },    // % weight for current workload
            vehicleTypeWeight: { type: Number, default: 10 }, // % weight for vehicle suitability
        },

        // Filters
        maxDistanceKm: { type: Number, default: 10 },         // Max search radius
        maxOrdersPerRider: { type: Number, default: 3 },      // Concurrent orders per rider
        preferSameZone: { type: Boolean, default: true },

        // Timing
        assignmentTimeoutSeconds: { type: Number, default: 60 },     // Rider must accept within this time
        reassignAfterRejections: { type: Number, default: 2 },       // After N rejections, reassign
        maxReassignmentAttempts: { type: Number, default: 5 },

        // Vehicle type requirements per order value
        vehicleRules: {
            heavyOrderThresholdKg: { type: Number, default: 10 },     // Orders over this weight need car/van
            allowedVehiclesForHeavy: {
                type: [String],
                default: ['car', 'van']
            }
        },

        // Last updated by
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true }
);

module.exports = mongoose.model('AssignmentConfig', assignmentConfigSchema);
