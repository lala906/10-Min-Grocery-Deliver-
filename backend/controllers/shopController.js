const asyncHandler = require('express-async-handler');
const Shop = require('../models/Shop');
const User = require('../models/User');
const Order = require('../models/Order');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// @desc    Register a new shop owner with KYC
// @route   POST /api/shops/register-with-kyc
// @access  Public
const registerShop = asyncHandler(async (req, res) => {
    const { 
        name, phone, email, password, // User details
        shopName, address, location, category, shopFrontImage, // Shop details
        aadhaarNumber, aadhaarImage, panNumber, panImage, gstCertificate, // KYC
        accountHolderName, accountNumber, ifscCode // Bank
    } = req.body;

    if (!name || !phone || !shopName || !address || !category || !aadhaarNumber || !panNumber || !accountNumber) {
        res.status(400);
        throw new Error('Please fill all mandatory fields');
    }

    // Check if user exists (by phone or email)
    let user = await User.findOne({ phone });
    if (!user && email) {
        user = await User.findOne({ email });
    }

    // We can also check existing PAN/Aadhaar in Shop collection
    const existingShop = await Shop.findOne({
        $or: [
            { 'kycDetails.aadhaarNumber': aadhaarNumber },
            { 'kycDetails.panNumber': panNumber }
        ]
    });

    if (existingShop) {
        res.status(400);
        throw new Error('Aadhaar or PAN is already registered with another shop');
    }

    // Create User if doesn't exist
    if (!user) {
        user = await User.create({
            name,
            email: email || `${phone}@temp.com`,
            phone,
            password: password || phone, // fallback password
            role: 'shop_owner'
        });
    } else {
        // Upgrade role
        user.role = 'shop_owner';
        user.name = name;
        if (password) user.password = password;
        await user.save();
    }

    // Create Shop
    const shop = await Shop.create({
        owner: user._id,
        shopName,
        address,
        location,
        category,
        shopFrontImage,
        kycDetails: {
            aadhaarNumber,
            aadhaarImage,
            panNumber,
            panImage,
            gstCertificate
        },
        bankDetails: {
            accountHolderName,
            accountNumber,
            ifscCode
        },
        kycStatus: 'pending' // Admin needs to approve
    });

    res.status(201).json({
        status: 'success',
        message: 'Shop registration request submitted successfully. Waiting for admin approval.',
        data: {
            shopId: shop._id,
            userId: user._id,
            token: generateToken(user._id)
        }
    });
});

// @desc    Get Shop Profile
// @route   GET /api/shops/profile
// @access  Private/ShopOwner
const getShopProfile = asyncHandler(async (req, res) => {
    const shop = await Shop.findOne({ owner: req.user._id });
    if (!shop) {
        res.status(404);
        throw new Error('Shop profile not found');
    }
    res.json(shop);
});

// @desc    Update Shop Status (Open/Close)
// @route   PUT /api/shops/status
// @access  Private/ShopOwner
const updateShopStatus = asyncHandler(async (req, res) => {
    const { isOpen } = req.body;
    const shop = await Shop.findOne({ owner: req.user._id });
    
    if (!shop) {
        res.status(404);
        throw new Error('Shop not found');
    }
    
    if (shop.kycStatus !== 'approved') {
        res.status(403);
        throw new Error('Your KYC is not approved yet. Cannot open shop.');
    }

    shop.isOpen = isOpen;
    await shop.save();
    res.json(shop);
});

// @desc    Get Shop Orders
// @route   GET /api/shops/orders
// @access  Private/ShopOwner
const getShopOrders = asyncHandler(async (req, res) => {
    const shop = await Shop.findOne({ owner: req.user._id });
    if (!shop) {
        res.status(404);
        throw new Error('Shop not found');
    }

    const orders = await Order.find({ shop: shop._id }).populate('user', 'name phone').sort({ createdAt: -1 });
    res.json(orders);
});

// @desc    Accept or Reject Order
// @route   PUT /api/shops/orders/:id/status
// @access  Private/ShopOwner
const updateOrderStatus = asyncHandler(async (req, res) => {
    const { status, reason } = req.body; // 'Merchant Accepted' or 'Rejected by Shop'
    const order = await Order.findById(req.params.id);

    if (!order) {
        res.status(404);
        throw new Error('Order not found');
    }

    // Ensure order belongs to merchant
    const shop = await Shop.findOne({ owner: req.user._id });
    if (!shop || order.shop.toString() !== shop._id.toString()) {
        res.status(403);
        throw new Error('Not authorized to update this order');
    }

    if (status === 'Merchant Accepted') {
        order.orderStatus = 'Merchant Accepted';
        order.merchantAcceptedAt = Date.now();
    } else if (status === 'Rejected by Shop') {
        order.orderStatus = 'Cancelled';
        order.cancelledBy = 'merchant';
        order.cancelReason = reason || 'Shop rejected order out of capacity';
    } else if (status === 'Ready for Pickup') {
        order.orderStatus = 'Ready for Pickup';
        order.readyAt = Date.now();
    } else {
        res.status(400);
        throw new Error('Invalid status update for shop owner');
    }

    await order.save();
    res.json(order);
});

module.exports = {
    registerShop,
    getShopProfile,
    updateShopStatus,
    getShopOrders,
    updateOrderStatus
};
