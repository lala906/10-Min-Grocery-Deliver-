const mongoose = require('mongoose');

const riderReviewSchema = new mongoose.Schema({
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rider: { type: mongoose.Schema.Types.ObjectId, ref: 'Rider', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String },
    tags: [{ type: String }] // ['Fast', 'Polite', 'Professional']
}, { timestamps: true });

// Ensure one review per order
riderReviewSchema.index({ order: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('RiderReview', riderReviewSchema);
