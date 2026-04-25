const asyncHandler = require('express-async-handler');
const Product = require('../models/Product');
const Order = require('../models/Order');
const UserActivity = require('../models/UserActivity');

// @desc    Track user activity
// @route   POST /api/recommendations/activity
// @access  Private
const trackActivity = asyncHandler(async (req, res) => {
    const { type, productId, categoryId, searchQuery } = req.body;
    await UserActivity.create({
        user: req.user._id,
        type,
        product: productId,
        category: categoryId,
        searchQuery,
        hourOfDay: new Date().getHours()
    });
    res.json({ status: 'success' });
});

// @desc    Get recommendations for logged-in user
// @route   GET /api/recommendations
// @access  Private
const getRecommendations = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const hour = new Date().getHours();

    // 1. Get user's purchased product categories
    const pastOrders = await Order.find({ user: userId, orderStatus: { $in: ['Delivered', 'Completed'] } })
        .populate('orderItems.product', 'category')
        .limit(10);

    const purchasedCategoryIds = new Set();
    const purchasedProductIds = new Set();

    pastOrders.forEach(order => {
        order.orderItems.forEach(item => {
            if (item.product?.category) purchasedCategoryIds.add(item.product.category.toString());
            if (item.product?._id) purchasedProductIds.add(item.product._id.toString());
        });
    });

    // 2. Get viewed products from activity
    const recentViews = await UserActivity.find({ user: userId, type: 'view' })
        .sort({ createdAt: -1 })
        .limit(15)
        .populate('product', 'category');

    recentViews.forEach(a => {
        if (a.product?.category) purchasedCategoryIds.add(a.product.category.toString());
    });

    // 3. Time-based boosting: morning = breakfast items, evening = snacks/dinner
    let timeBoostTag = null;
    if (hour >= 6 && hour <= 10) timeBoostTag = 'breakfast';
    else if (hour >= 11 && hour <= 14) timeBoostTag = 'lunch';
    else if (hour >= 16 && hour <= 20) timeBoostTag = 'snacks';
    else if (hour >= 20) timeBoostTag = 'dinner';

    // 4. Build recommendation query
    const catArray = Array.from(purchasedCategoryIds);
    const purchasedArray = Array.from(purchasedProductIds);

    let personalQuery = {
        isVisible: true,
        stock: { $gt: 0 },
        _id: { $nin: purchasedArray }
    };
    if (catArray.length > 0) {
        personalQuery.category = { $in: catArray };
    }

    const [personalRecs, popularProducts, timeBasedRecs] = await Promise.all([
        // Personalized: from purchased categories
        Product.find(personalQuery)
            .populate('category', 'name')
            .sort({ rating: -1, totalSold: -1 })
            .limit(8),

        // Popular: most sold overall
        Product.find({ isVisible: true, stock: { $gt: 0 } })
            .populate('category', 'name')
            .sort({ totalSold: -1, rating: -1 })
            .limit(8),

        // Time-based: tagged products
        timeBoostTag
            ? Product.find({ isVisible: true, stock: { $gt: 0 }, tags: timeBoostTag })
                .populate('category', 'name')
                .sort({ rating: -1 })
                .limit(6)
            : Promise.resolve([])
    ]);

    res.json({
        status: 'success',
        data: {
            personalized: personalRecs,
            popular: popularProducts,
            timeBased: timeBasedRecs,
            timeLabel: timeBoostTag ? `Perfect for ${timeBoostTag}` : null
        }
    });
});

// @desc    Get "Frequently Bought Together" products
// @route   GET /api/recommendations/fbt/:productId
// @access  Public
const getFrequentlyBoughtTogether = asyncHandler(async (req, res) => {
    const { productId } = req.params;

    // Find orders containing this product
    const ordersWithProduct = await Order.find({
        'orderItems.product': productId,
        orderStatus: { $in: ['Delivered', 'Completed'] }
    }).select('orderItems').limit(100);

    // Collect co-purchased product IDs
    const coProductCounts = {};
    ordersWithProduct.forEach(order => {
        order.orderItems.forEach(item => {
            const id = item.product.toString();
            if (id !== productId) {
                coProductCounts[id] = (coProductCounts[id] || 0) + 1;
            }
        });
    });

    // Sort by co-occurrence frequency
    const topIds = Object.entries(coProductCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([id]) => id);

    const products = await Product.find({
        _id: { $in: topIds },
        isVisible: true,
        stock: { $gt: 0 }
    }).populate('category', 'name');

    res.json({ status: 'success', data: products });
});

// @desc    Get popular products (for homepage)
// @route   GET /api/recommendations/popular
// @access  Public
const getPopularProducts = asyncHandler(async (req, res) => {
    const products = await Product.find({ isVisible: true, stock: { $gt: 0 } })
        .populate('category', 'name')
        .sort({ totalSold: -1, rating: -1 })
        .limit(12);
    res.json({ status: 'success', data: products });
});

module.exports = { trackActivity, getRecommendations, getFrequentlyBoughtTogether, getPopularProducts };
