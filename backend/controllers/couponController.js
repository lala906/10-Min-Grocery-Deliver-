const Coupon = require('../models/Coupon');
const Order = require('../models/Order');
const { analyzeCouponUsage } = require('../services/fraudDetectionService');

const applyCoupon = async (req, res, next) => {
    try {
        const { code, cartTotal, userId } = req.body;
        const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });

        if (!coupon) return res.status(404).json({ message: 'Invalid or incorrect coupon code' });
        if (new Date() > coupon.expiryDate) return res.status(400).json({ message: 'Coupon has expired' });
        if (coupon.usedCount >= coupon.usageLimit) return res.status(400).json({ message: 'Coupon usage limit reached' });

        // ─── Advanced Rule Checks ──────────────────────────────────
        // Min order value
        if (coupon.minOrderValue && cartTotal < coupon.minOrderValue) {
            return res.status(400).json({
                message: `Minimum order value of ₹${coupon.minOrderValue} required for this coupon`
            });
        }

        // Max order value
        if (coupon.maxOrderValue && cartTotal > coupon.maxOrderValue) {
            return res.status(400).json({
                message: `This coupon is only valid for orders up to ₹${coupon.maxOrderValue}`
            });
        }

        // Per-user limit check
        if (userId && coupon.usersUsed.includes(userId)) {
            const userUsageCount = coupon.usersUsed.filter(id => id.toString() === userId).length;
            if (userUsageCount >= (coupon.perUserLimit || 1)) {
                return res.status(400).json({ message: 'You have already used this coupon' });
            }
        }

        // First-time user check
        if (coupon.userType === 'first_time' && userId) {
            const orderCount = await Order.countDocuments({ user: userId });
            if (orderCount > 0) {
                return res.status(400).json({ message: 'This coupon is only for first-time orders' });
            }
        }

        // Subscribed user check
        if (coupon.userType === 'subscribed' && userId) {
            const User = require('../models/User');
            const user = await User.findById(userId);
            if (!user?.isSubscribed) {
                return res.status(400).json({ message: 'This coupon is only for Premium members' });
            }
        }

        // Fraud check on coupon usage
        if (userId) {
            await analyzeCouponUsage(userId, coupon._id.toString());
        }

        let discount = 0;
        if (coupon.discountType === 'percentage') {
            discount = (cartTotal * coupon.discountValue) / 100;
            // Apply max discount cap
            if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
                discount = coupon.maxDiscountAmount;
            }
        } else {
            discount = coupon.discountValue;
        }

        discount = Math.min(discount, cartTotal); // can't discount more than total
        discount = parseFloat(discount.toFixed(2));

        res.json({
            discount,
            newTotal: parseFloat((cartTotal - discount).toFixed(2)),
            couponId: coupon._id,
            title: coupon.title || coupon.code,
            message: `Coupon applied! You saved ₹${discount}`
        });
    } catch (error) {
        next(error);
    }
};

const createCoupon = async (req, res, next) => {
    try {
        const newCoupon = new Coupon(req.body);
        const savedCoupon = await newCoupon.save();
        res.status(201).json({ status: 'success', data: savedCoupon });
    } catch (error) {
        next(error);
    }
};

const updateCoupon = async (req, res, next) => {
    try {
        const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!coupon) return res.status(404).json({ message: 'Coupon not found' });
        res.json({ status: 'success', data: coupon });
    } catch (error) {
        next(error);
    }
};

const getCoupons = async (req, res, next) => {
    try {
        const coupons = await Coupon.find({}).populate('categoryRestrictions', 'name').sort({ createdAt: -1 });
        res.json({ status: 'success', data: coupons });
    } catch (error) {
        next(error);
    }
};

const deleteCoupon = async (req, res, next) => {
    try {
        await Coupon.findByIdAndDelete(req.params.id);
        res.json({ message: 'Coupon deleted' });
    } catch (error) {
        next(error);
    }
};

// Get active auto-apply coupons for the cart
const getAutoApplyCoupons = async (req, res, next) => {
    try {
        const now = new Date();
        const coupons = await Coupon.find({
            isActive: true,
            isAutoApply: true,
            expiryDate: { $gt: now }
        });
        res.json({ status: 'success', data: coupons });
    } catch (error) {
        next(error);
    }
};

// Get all available coupons for the user to view in cart
const getAvailableCoupons = async (req, res, next) => {
    try {
        const now = new Date();
        const coupons = await Coupon.find({
            isActive: true,
            expiryDate: { $gt: now }
        }).select('-usersUsed -usedCount'); // Don't expose sensitive stats to user
        res.json({ status: 'success', data: coupons });
    } catch (error) {
        next(error);
    }
};

module.exports = { applyCoupon, createCoupon, updateCoupon, getCoupons, deleteCoupon, getAutoApplyCoupons, getAvailableCoupons };
