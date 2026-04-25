const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        name: { type: String, required: true },
        rating: { type: Number, required: true },
        comment: { type: String, required: true },
        verifiedPurchase: { type: Boolean, default: false },
        helpful: { type: Number, default: 0 },
        images: [{ type: String }]
    },
    { timestamps: true }
);

// Per-warehouse stock entry
const warehouseStockSchema = new mongoose.Schema({
    warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
    stock: { type: Number, default: 0 }
}, { _id: false });

const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Please add a product name'],
        },
        description: {
            type: String,
            required: [true, 'Please add a description'],
        },
        price: {
            type: Number,
            required: [true, 'Please add a price'],
            default: 0.0,
        },
        basePrice: {
            type: Number,
            default: 0.0
        },
        currentPrice: {
            type: Number,
            default: 0.0
        },
        image: {
            type: String,
            required: [true, 'Please add an image URL'],
        },
        category: {
            type: mongoose.Schema.Types.ObjectId,
            required: [true, 'Please add a category'],
            ref: 'Category',
        },
        stock: {
            type: Number,
            required: [true, 'Please add stock count'],
            default: 0,
        },
        warehouseStock: [warehouseStockSchema],
        lowStockThreshold: {
            type: Number,
            default: 5
        },
        shop: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Shop'
        },
        isVisible: {
            type: Boolean,
            default: true
        },
        isFeatured: {
            type: Boolean,
            default: false
        },
        tags: [{ type: String }],
        unit: { type: String, default: 'unit' }, // kg, litre, pack, etc.
        weight: { type: Number },
        reviews: [reviewSchema],
        rating: {
            type: Number,
            required: true,
            default: 0,
        },
        numReviews: {
            type: Number,
            required: true,
            default: 0,
        },
        totalSold: {
            type: Number,
            default: 0
        },
        // Dynamic pricing surge factor (1.0 = normal)
        priceSurgeFactor: {
            type: Number,
            default: 1.0,
            min: 1.0,
            max: 3.0
        }
    },
    {
        timestamps: true,
    }
);

// Auto-hide when stock hits 0
productSchema.pre('save', async function () {
    if (this.stock <= 0) {
        this.isVisible = false;
    }
    if (this.stock > 0 && !this.isVisible) {
        // Re-show if stock has been added back
        // (only if explicitly managed)
    }
    // Sync currentPrice with dynamic pricing
    if (this.basePrice > 0) {
        this.currentPrice = parseFloat((this.basePrice * this.priceSurgeFactor).toFixed(2));
    } else {
        this.currentPrice = this.price;
    }
});

// Text search index
productSchema.index({ name: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Product', productSchema);
