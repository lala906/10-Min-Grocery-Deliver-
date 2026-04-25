const mongoose = require('mongoose');

const warehouseSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true },
    location: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true }
    },
    serviceRadius: { type: Number, default: 5 }, // km
    isActive: { type: Boolean, default: true },
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    phone: { type: String },
    openHours: {
        from: { type: String, default: '06:00' },
        to: { type: String, default: '23:00' }
    }
}, { timestamps: true });

module.exports = mongoose.model('Warehouse', warehouseSchema);
