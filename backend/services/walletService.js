const User = require('../models/User');
const WalletTransaction = require('../models/WalletTransaction');
const { sendNotification } = require('./notificationService');

/**
 * Credit wallet
 * @param {string} userId
 * @param {number} amount
 * @param {string} description
 * @param {string} referenceId
 * @param {string} referenceType
 */
const creditWallet = async (userId, amount, description, referenceId = null, referenceType = 'other') => {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    user.walletBalance = parseFloat((user.walletBalance + amount).toFixed(2));
    await user.save();

    const txn = await WalletTransaction.create({
        user: userId,
        type: 'credit',
        amount,
        description,
        referenceId,
        referenceType,
        balanceAfter: user.walletBalance
    });

    // Send notification
    await sendNotification({
        userId,
        title: '💳 Wallet Credited!',
        message: `₹${amount} has been added to your wallet. New balance: ₹${user.walletBalance}.`,
        type: 'WALLET_CREDIT',
        referenceId,
        email: user.email
    });

    return txn;
};

/**
 * Debit wallet
 */
const debitWallet = async (userId, amount, description, referenceId = null, referenceType = 'other') => {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');
    if (user.walletBalance < amount) throw new Error('Insufficient wallet balance');

    user.walletBalance = parseFloat((user.walletBalance - amount).toFixed(2));
    await user.save();

    const txn = await WalletTransaction.create({
        user: userId,
        type: 'debit',
        amount,
        description,
        referenceId,
        referenceType,
        balanceAfter: user.walletBalance
    });

    return txn;
};

/**
 * Process refund to wallet
 */
const refundToWallet = async (userId, amount, orderId) => {
    return await creditWallet(
        userId,
        amount,
        `Refund for order #${orderId}`,
        orderId,
        'refund'
    );
};

module.exports = { creditWallet, debitWallet, refundToWallet };
