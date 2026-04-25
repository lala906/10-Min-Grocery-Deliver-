const mongoose = require('mongoose');

const userActivitySchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
        type: String,
        enum: ['view', 'purchase', 'cart_add', 'search', 'wishlist'],
        required: true
    },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    searchQuery: { type: String },
    hourOfDay: { type: Number }, // 0-23 for time-based recommendations
    meta: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

module.exports = mongoose.model('UserActivity', userActivitySchema);
