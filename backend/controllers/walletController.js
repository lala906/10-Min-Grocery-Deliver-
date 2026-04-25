const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const WalletTransaction = require('../models/WalletTransaction');
const { creditWallet, debitWallet } = require('../services/walletService');

// @desc    Get wallet balance & recent transactions
// @route   GET /api/wallet
// @access  Private
const getWallet = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).select('walletBalance name email');
    const transactions = await WalletTransaction.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .limit(30);

    res.json({
        status: 'success',
        data: {
            balance: user.walletBalance,
            transactions
        }
    });
});

// @desc    Add money to wallet
// @route   POST /api/wallet/add
// @access  Private
const addMoney = asyncHandler(async (req, res) => {
    const { amount } = req.body;
    if (!amount || amount <= 0) {
        res.status(400);
        throw new Error('Invalid amount');
    }
    if (amount > 50000) {
        res.status(400);
        throw new Error('Maximum top-up is ₹50,000 per transaction');
    }

    const txn = await creditWallet(
        req.user._id,
        parseFloat(amount),
        'Wallet top-up',
        null,
        'topup'
    );

    const user = await User.findById(req.user._id).select('walletBalance');
    res.json({
        status: 'success',
        message: `₹${amount} added to your wallet!`,
        data: { balance: user.walletBalance, transaction: txn }
    });
});

// @desc    Get wallet transaction history
// @route   GET /api/wallet/transactions
// @access  Private
const getTransactions = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, type } = req.query;
    const filter = { user: req.user._id };
    if (type) filter.type = type;

    const transactions = await WalletTransaction.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit));

    const total = await WalletTransaction.countDocuments(filter);

    res.json({
        status: 'success',
        data: { transactions, total, page: Number(page), pages: Math.ceil(total / limit) }
    });
});

// @desc    Admin: Get all wallet transactions
// @route   GET /api/wallet/admin/all
// @access  Admin
const getAllWalletTransactions = asyncHandler(async (req, res) => {
    const { page = 1, limit = 50 } = req.query;
    const transactions = await WalletTransaction.find({})
        .populate('user', 'name email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit));

    const total = await WalletTransaction.countDocuments();
    const totalVolume = await WalletTransaction.aggregate([
        { $match: { type: 'credit', status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    res.json({
        status: 'success',
        data: { transactions, total, totalVolume: totalVolume[0]?.total || 0 }
    });
});

module.exports = { getWallet, addMoney, getTransactions, getAllWalletTransactions };
