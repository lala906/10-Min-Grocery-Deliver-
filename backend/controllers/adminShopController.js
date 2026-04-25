const asyncHandler = require('express-async-handler');
const Shop = require('../models/Shop');
const User = require('../models/User');

// @desc    Get all shops (and filter by KYC status)
// @route   GET /api/admin/shops
// @access  Private/Admin
const getAllShops = asyncHandler(async (req, res) => {
    const { status } = req.query; // pending, under_review, approved, rejected
    const filter = {};
    if (status) {
        filter.kycStatus = status;
    }
    const shops = await Shop.find(filter).populate('owner', 'name phone email').sort({ createdAt: -1 });
    res.json(shops);
});

// @desc    Get all KYC requests
// @route   GET /api/admin/kyc-requests
// @access  Private/Admin
const getKycRequests = asyncHandler(async (req, res) => {
    const shops = await Shop.find({ kycStatus: { $in: ['pending', 'under_review'] } })
        .populate('owner', 'name phone email')
        .sort({ createdAt: -1 });
    res.json(shops);
});

// @desc    Approve Shop KYC
// @route   PUT /api/admin/kyc-approve/:id
// @access  Private/Admin
const approveKyc = asyncHandler(async (req, res) => {
    const shop = await Shop.findById(req.params.id);
    if (!shop) {
        res.status(404);
        throw new Error('Shop not found');
    }
    
    shop.kycStatus = 'approved';
    shop.rejectionReason = '';
    await shop.save();
    
    // Ensure user role is shop_owner and unblocked
    const user = await User.findById(shop.owner);
    if (user) {
        user.role = 'shop_owner';
        user.isBlocked = false;
        await user.save();
    }

    res.json({ message: 'Shop KYC approved', shop });
});

// @desc    Reject Shop KYC
// @route   PUT /api/admin/kyc-reject/:id
// @access  Private/Admin
const rejectKyc = asyncHandler(async (req, res) => {
    const { reason } = req.body;
    const shop = await Shop.findById(req.params.id);
    if (!shop) {
        res.status(404);
        throw new Error('Shop not found');
    }
    
    shop.kycStatus = 'rejected';
    shop.rejectionReason = reason || 'Documents did not meet the guidelines.';
    shop.isOpen = false;
    await shop.save();
    
    res.json({ message: 'Shop KYC rejected', shop });
});

// @desc    Toggle Shop Block Status
// @route   PUT /api/admin/shops/:id/block
// @access  Private/Admin
const toggleShopBlock = asyncHandler(async (req, res) => {
    const shop = await Shop.findById(req.params.id);
    if (!shop) {
        res.status(404);
        throw new Error('Shop not found');
    }
    
    shop.isBlocked = !shop.isBlocked;
    if (shop.isBlocked) {
        shop.isOpen = false;
    }
    await shop.save();
    
    res.json({ message: `Shop ${shop.isBlocked ? 'blocked' : 'unblocked'}`, shop });
});

module.exports = {
    getAllShops,
    getKycRequests,
    approveKyc,
    rejectKyc,
    toggleShopBlock
};
