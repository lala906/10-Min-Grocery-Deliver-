const FraudFlag = require('../models/FraudFlag');
const Order = require('../models/Order');
const User = require('../models/User');

/**
 * Analyze an order for fraud signals — returns risk score 0-100
 */
const analyzeOrder = async (userId, orderData) => {
    let riskScore = 0;
    const flags = [];

    try {
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // 1. Multiple orders in last hour
        const recentOrders = await Order.countDocuments({
            user: userId,
            createdAt: { $gte: oneHourAgo }
        });
        if (recentOrders >= 3) {
            riskScore += 30;
            flags.push('multiple_orders');
        }

        // 2. High value order from new user
        const user = await User.findById(userId);
        const userOrderCount = await Order.countDocuments({ user: userId });
        if (userOrderCount === 0 && orderData.totalPrice > 2000) {
            riskScore += 20;
            flags.push('high_value_first_order');
        }

        // 3. User is already flagged
        if (user?.isFlagged) {
            riskScore += 25;
            flags.push('user_flagged');
        }

        // 4. Multiple failed delivery orders  
        const failedOrders = await Order.countDocuments({
            user: userId,
            orderStatus: 'Delivery Failed',
            createdAt: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) }
        });
        if (failedOrders >= 2) {
            riskScore += 20;
            flags.push('multiple_failed_deliveries');
        }

        // 5. High refund rate
        const refundedOrders = await Order.countDocuments({
            user: userId,
            refundStatus: 'completed',
            createdAt: { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) }
        });
        if (refundedOrders >= 3) {
            riskScore += 25;
            flags.push('refund_abuse');
        }

        riskScore = Math.min(riskScore, 100);

        // Auto-flag if risk > 60
        if (riskScore >= 60) {
            await FraudFlag.create({
                user: userId,
                type: flags[0] || 'other',
                riskScore,
                details: `Auto-detected: ${flags.join(', ')}`,
                referenceId: orderData._id?.toString()
            });

            // Update user risk score
            await User.findByIdAndUpdate(userId, {
                riskScore,
                isFlagged: riskScore >= 80
            });
        }

        return { riskScore, flags };
    } catch (err) {
        console.error('[FraudDetection] Error:', err.message);
        return { riskScore: 0, flags: [] };
    }
};

/**
 * Analyze coupon usage for abuse
 */
const analyzeCouponUsage = async (userId, couponId) => {
    let riskScore = 0;
    try {
        // Count how many times this user used coupons in last 7 days
        const recentCouponOrders = await Order.countDocuments({
            user: userId,
            coupon: { $exists: true },
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        });
        if (recentCouponOrders >= 5) {
            riskScore += 40;
            await FraudFlag.create({
                user: userId,
                type: 'coupon_abuse',
                riskScore,
                details: `Used ${recentCouponOrders} coupons in 7 days`,
                referenceId: couponId
            });
        }
        return riskScore;
    } catch (err) {
        console.error('[FraudDetection] Coupon check error:', err.message);
        return 0;
    }
};

module.exports = { analyzeOrder, analyzeCouponUsage };
