const mongoose = require('mongoose');

const locationHistorySchema = new mongoose.Schema(
    {
        rider: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Rider',
            required: true,
            index: true
        },
        order: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order',
            index: true
        },
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
        speed:   { type: Number, default: 0 },   // m/s
        heading: { type: Number, default: 0 },   // degrees
        accuracy:{ type: Number, default: 0 },   // meters
        timestamp: { type: Date, default: Date.now, index: true }
    },
    {
        timeseries: false,
        timestamps: true   // adds createdAt/updatedAt
    }
);

// Auto-expire location history older than 7 days
locationHistorySchema.index({ timestamp: 1 }, { expireAfterSeconds: 604800 });

module.exports = mongoose.model('LocationHistory', locationHistorySchema);
