const asyncHandler = require('express-async-handler');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');

const attachCouponsToProducts = async (products) => {
    try {
        const now = new Date();
        const activeCoupons = await Coupon.find({ isActive: true, expiryDate: { $gt: now } }).lean();
        
        return products.map(product => {
            let bestBadge = null;
            let bestDiscount = 0;
            
            // Allow checking arrays as string for easy match
            const prodIdStr = product._id.toString();
            const catIdStr = product.category ? product.category.toString() : '';

            activeCoupons.forEach(coupon => {
                // Check if coupon targets this product or its category
                const appliesToProduct = coupon.productRestrictions && coupon.productRestrictions.some(id => id.toString() === prodIdStr);
                const appliesToCategory = coupon.categoryRestrictions && catIdStr && coupon.categoryRestrictions.some(id => id.toString() === catIdStr);
                
                // If the coupon has explicitly defined restrictions and it matches (or if it's implicitly a product-specific coupon matching)
                if (appliesToProduct || appliesToCategory) {
                    const discountAmt = coupon.discountType === 'percentage' 
                        ? (product.price * coupon.discountValue) / 100
                        : coupon.discountValue;
                    
                    if (discountAmt > bestDiscount) {
                        bestDiscount = discountAmt;
                        bestBadge = coupon.discountType === 'percentage' ? `${coupon.discountValue}% OFF` : `₹${coupon.discountValue} OFF`;
                    }
                }
            });

            return { ...product, discountBadge: bestBadge };
        });
    } catch (err) {
        console.error('Error attaching coupons:', err);
        return products;
    }
};

const getAllProducts = asyncHandler(async (req, res) => {
    const products = await Product.find({}).lean();
    const productsWithCoupons = await attachCouponsToProducts(products);
    res.json({
        status: 'success',
        message: 'Products fetched successfully',
        data: productsWithCoupons
    });
});


const getSingleProduct = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id).lean();

    if (product) {
        const [productWithCoupon] = await attachCouponsToProducts([product]);
        res.json({
            status: 'success',
            message: 'Product fetched successfully',
            data: productWithCoupon
        });
    } else {
        res.status(404);
        throw new Error('Product not found');
    }
});

// @desc    Create a product
// @route   POST /api/products
// @access  Private/Admin
const createProduct = asyncHandler(async (req, res) => {
    const { name, price, description, image, category, stock } = req.body;

    const product = new Product({
        name: name || 'Sample name',
        price: price || 0,
        description: description || 'Sample description',
        image: image || '/images/sample.jpg',
        category: category || 'Sample category',
        stock: stock || 0,
    });

    const createdProduct = await product.save();
    res.status(201).json({
        status: 'success',
        message: 'Product created successfully',
        data: createdProduct
    });
});

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/Admin
const updateProduct = asyncHandler(async (req, res) => {
    const { name, price, description, image, category, stock } = req.body;

    const product = await Product.findById(req.params.id);

    if (product) {
        product.name = name || product.name;
        // ensure 0 value is ok instead of truthy checks where it might overwrite to old value if 0
        product.price = price !== undefined ? price : product.price;
        product.description = description || product.description;
        product.image = image || product.image;
        product.category = category || product.category;
        product.stock = stock !== undefined ? stock : product.stock;

        const updatedProduct = await product.save();
        res.json({
            status: 'success',
            message: 'Product updated successfully',
            data: updatedProduct
        });
    } else {
        res.status(404);
        throw new Error('Product not found');
    }
});

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private/Admin
const deleteProduct = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);

    if (product) {
        await Product.deleteOne({ _id: product._id });
        res.json({
            status: 'success',
            message: 'Product removed successfully',
            data: null
        });
    } else {
        res.status(404);
        throw new Error('Product not found');
    }
});
// @desc    Get products by category
// @route   GET /api/products/category/:categoryId
// @access  Public
const getProductsByCategory = asyncHandler(async (req, res) => {
    const products = await Product.find({ category: req.params.categoryId }).lean();
    const productsWithCoupons = await attachCouponsToProducts(products);
    
    res.json({
        status: 'success',
        message: 'Products fetched successfully',
        data: productsWithCoupons
    });
});

// @desc    Create new review
// @route   POST /api/products/:id/reviews
// @access  Private
const createProductReview = asyncHandler(async (req, res) => {
    const { rating, comment } = req.body;
    const product = await Product.findById(req.params.id);

    if (product) {
        const alreadyReviewed = product.reviews.find(
            (r) => r.user.toString() === req.user._id.toString()
        );

        if (alreadyReviewed) {
            res.status(400);
            throw new Error('Product already reviewed');
        }

        const review = {
            name: req.user.name,
            rating: Number(rating),
            comment,
            user: req.user._id,
        };

        product.reviews.push(review);
        product.numReviews = product.reviews.length;
        product.rating =
            product.reviews.reduce((acc, item) => item.rating + acc, 0) /
            product.reviews.length;

        await product.save();
        res.status(201).json({ message: 'Review added' });
    } else {
        res.status(404);
        throw new Error('Product not found');
    }
});

// @desc    Get product recommendations
// @route   GET /api/products/:id/recommendations
// @access  Public
const getRecommendations = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!product) {
        res.status(404);
        throw new Error('Product not found');
    }
    
    // Simple mock logic: fetch products from same category
    const recommendations = await Product.find({ 
        category: product.category,
        _id: { $ne: product._id }
    }).limit(4);

    res.json({
        status: 'success',
        message: 'Recommendations fetched successfully',
        data: recommendations
    });
});

module.exports = {
    getAllProducts,
    getSingleProduct,
    getProductsByCategory,
    createProduct,
    updateProduct,
    deleteProduct,
    createProductReview,
    getRecommendations
};
