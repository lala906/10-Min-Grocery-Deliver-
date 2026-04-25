const mongoose = require('mongoose');

const deliverySlotSchema = new mongoose.Schema({
    date: { type: String, required: true }, // YYYY-MM-DD
    label: { type: String, required: true }, // "Today 10-12 PM"
    startTime: { type: String, required: true }, // "10:00"
    endTime: { type: String, required: true },   // "12:00"
    capacity: { type: Number, required: true, default: 20 },
    bookedCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' }
}, { timestamps: true });

// Virtual: is slot available
deliverySlotSchema.virtual('isAvailable').get(function () {
    return this.isActive && this.bookedCount < this.capacity;
});

deliverySlotSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('DeliverySlot', deliverySlotSchema);
