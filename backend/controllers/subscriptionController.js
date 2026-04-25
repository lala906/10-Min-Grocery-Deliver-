const asyncHandler = require('express-async-handler');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const { creditWallet } = require('../services/walletService');
const { sendNotification } = require('../services/notificationService');

const PLANS = {
    monthly: { price: 99, days: 30, label: 'Monthly Premium' },
    yearly: { price: 999, days: 365, label: 'Yearly Premium' }
};

// @desc    Get subscription plans
// @route   GET /api/subscriptions/plans
// @access  Public
const getPlans = asyncHandler(async (req, res) => {
    res.json({
        status: 'success',
        data: {
            monthly: {
                ...PLANS.monthly,
                features: ['Free delivery on all orders', 'Exclusive member discounts', '5% cashback on every order', 'Priority support']
            },
            yearly: {
                ...PLANS.yearly,
                savings: PLANS.monthly.price * 12 - PLANS.yearly.price,
                features: ['Everything in Monthly', 'Extra 2% cashback (7% total)', 'Early access to sales', 'Dedicated account manager']
            }
        }
    });
});

// @desc    Get current user's subscription
// @route   GET /api/subscriptions/me
// @access  Private
const getMySubscription = asyncHandler(async (req, res) => {
    const subscription = await Subscription.findOne({ user: req.user._id });
    res.json({ status: 'success', data: subscription });
});

// @desc    Subscribe to a plan
// @route   POST /api/subscriptions/subscribe
// @access  Private
const subscribe = asyncHandler(async (req, res) => {
    const { plan } = req.body;
    if (!PLANS[plan]) {
        res.status(400);
        throw new Error('Invalid plan. Choose monthly or yearly.');
    }

    // Check if already subscribed
    const existing = await Subscription.findOne({ user: req.user._id, status: 'active' });
    if (existing && new Date() < existing.endDate) {
        res.status(400);
        throw new Error('You already have an active subscription');
    }

    const planConfig = PLANS[plan];
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + planConfig.days);

    // Create or update subscription
    const subscription = existing
        ? await Subscription.findByIdAndUpdate(existing._id, {
            plan,
            status: 'active',
            startDate: new Date(),
            endDate,
            price: planConfig.price
        }, { new: true })
        : await Subscription.create({
            user: req.user._id,
            plan,
            startDate: new Date(),
            endDate,
            price: planConfig.price,
            features: { freeDelivery: true, exclusiveOffers: true, cashbackPercent: plan === 'yearly' ? 7 : 5 }
        });

    // Update user
    await User.findByIdAndUpdate(req.user._id, {
        subscription: subscription._id,
        isSubscribed: true
    });

    // Send notification
    await sendNotification({
        userId: req.user._id,
        title: '⭐ Premium Membership Activated!',
        message: `Welcome to Premium! Enjoy free delivery, exclusive offers, and ${plan === 'yearly' ? '7%' : '5%'} cashback until ${endDate.toLocaleDateString('en-IN')}.`,
        type: 'SUBSCRIPTION_ACTIVATED',
        email: req.user.email
    });

    res.json({
        status: 'success',
        message: `${planConfig.label} activated successfully!`,
        data: subscription
    });
});

// @desc    Cancel subscription
// @route   PUT /api/subscriptions/cancel
// @access  Private
const cancelSubscription = asyncHandler(async (req, res) => {
    const subscription = await Subscription.findOne({ user: req.user._id, status: 'active' });
    if (!subscription) {
        res.status(404);
        throw new Error('No active subscription found');
    }

    subscription.status = 'cancelled';
    subscription.cancelledAt = new Date();
    subscription.autoRenew = false;
    await subscription.save();

    await User.findByIdAndUpdate(req.user._id, { isSubscribed: false });

    res.json({ status: 'success', message: 'Subscription cancelled. Benefits remain until ' + subscription.endDate.toLocaleDateString('en-IN') });
});

// @desc    Admin: Get all subscriptions
// @route   GET /api/subscriptions/admin/all
// @access  Admin
const getAllSubscriptions = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, status } = req.query;
    const filter = status ? { status } : {};

    const subscriptions = await Subscription.find(filter)
        .populate('user', 'name email phone')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit));

    const total = await Subscription.countDocuments(filter);
    const revenue = await Subscription.aggregate([
        { $match: {} },
        { $group: { _id: '$plan', count: { $sum: 1 }, total: { $sum: '$price' } } }
    ]);

    res.json({ status: 'success', data: { subscriptions, total, revenue } });
});

module.exports = { getPlans, getMySubscription, subscribe, cancelSubscription, getAllSubscriptions };
