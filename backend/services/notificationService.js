const Notification = require('../models/Notification');
const nodemailer = require('nodemailer');

// ─── Email Transport (Nodemailer) ─────────────────────────────────
let transporter = null;
try {
    transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
} catch (e) {
    console.warn('[Notification] Email transporter failed to init:', e.message);
}

// ─── Notification Type → Email Subject Map ────────────────────────
const emailSubjects = {
    ORDER_PLACED: '✅ Order Placed Successfully!',
    RIDER_ASSIGNED: '🛵 Rider Assigned to Your Order',
    OUT_FOR_DELIVERY: '📦 Your Order is Out for Delivery!',
    ORDER_DELIVERED: '🎉 Order Delivered Successfully!',
    ORDER_CANCELLED: '❌ Order Cancelled',
    DELIVERY_FAILED: '⚠️ Delivery Attempt Failed',
    REFUND_INITIATED: '💰 Refund Initiated',
    REFUND_COMPLETED: '✅ Refund Completed',
    WALLET_CREDIT: '💳 Wallet Credited',
    SUBSCRIPTION_ACTIVATED: '⭐ Premium Membership Activated!',
    COUPON_AVAILABLE: '🎁 New Coupon Available for You!',
    SYSTEM: '📢 Notification from GroceryStore'
};

/**
 * Core notification sender — creates in-app notification and optionally sends email/push
 * @param {Object} opts
 * @param {string} opts.userId - MongoDB user ID
 * @param {string} opts.title
 * @param {string} opts.message
 * @param {string} opts.type - Notification type enum
 * @param {string} opts.referenceId - Related order/coupon ID
 * @param {string} opts.email - User's email (for email channel)
 * @param {string} opts.fcmToken - Firebase token (for push)
 */
const sendNotification = async ({
    userId, title, message, type = 'SYSTEM', referenceId = null,
    email = null, fcmToken = null
}) => {
    try {
        // 1. In-app notification
        await Notification.create({
            user: userId,
            title,
            message,
            type,
            referenceId,
            channel: 'in_app'
        });

        // 2. Email notification (if email provided and transporter configured)
        if (email && transporter && process.env.EMAIL_USER) {
            try {
                await transporter.sendMail({
                    from: `"GroceryStore 🛒" <${process.env.EMAIL_USER}>`,
                    to: email,
                    subject: emailSubjects[type] || '📢 GroceryStore Notification',
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px; border-radius: 10px;">
                            <div style="background: linear-gradient(135deg, #6366f1, #22c55e); padding: 20px; border-radius: 8px; text-align: center;">
                                <h1 style="color: white; margin: 0; font-size: 22px;">🛒 GroceryStore</h1>
                            </div>
                            <div style="background: white; padding: 24px; border-radius: 8px; margin-top: 16px;">
                                <h2 style="color: #1f2937; margin-top: 0;">${title}</h2>
                                <p style="color: #4b5563; line-height: 1.6; font-size: 16px;">${message}</p>
                                ${referenceId ? `<p style="color: #6b7280; font-size: 14px;">Reference: <strong>${referenceId}</strong></p>` : ''}
                                <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/orders" 
                                   style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 12px; font-weight: bold;">
                                    View Order →
                                </a>
                            </div>
                            <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 16px;">
                                © 2024 GroceryStore. All rights reserved.
                            </p>
                        </div>
                    `
                });
            } catch (emailErr) {
                console.warn('[Notification] Email send failed:', emailErr.message);
            }
        }

        // 3. SMS notification placeholder (integrate Twilio/MSG91 here)
        // if (phone) { await sendSMS(phone, message); }

        // 4. Push notification placeholder (Firebase FCM)
        // if (fcmToken) { await sendPush(fcmToken, title, message); }

    } catch (err) {
        console.error('[Notification] sendNotification error:', err.message);
    }
};

/**
 * Order event notifications — fires correct type based on status
 */
const notifyOrderEvent = async (order, type, user) => {
    const messages = {
        ORDER_PLACED: `Your order #${order._id} has been placed successfully! Estimated delivery: ${order.estimatedDeliveryMinutes} mins.`,
        RIDER_ASSIGNED: `A rider has been assigned to your order #${order._id}. They'll pick it up soon!`,
        OUT_FOR_DELIVERY: `Your order #${order._id} is out for delivery! Get ready to receive it.`,
        ORDER_DELIVERED: `Your order #${order._id} has been delivered. Enjoy! Rate your experience.`,
        ORDER_CANCELLED: `Your order #${order._id} has been cancelled. ${order.cancelReason || ''}`,
        DELIVERY_FAILED: `Delivery for order #${order._id} failed. We'll retry soon or process a refund.`,
        REFUND_INITIATED: `Refund of ₹${order.refundAmount} for order #${order._id} has been initiated to your wallet.`,
        REFUND_COMPLETED: `Refund of ₹${order.refundAmount} has been credited to your wallet!`
    };

    await sendNotification({
        userId: order.user,
        title: emailSubjects[type] || 'Order Update',
        message: messages[type] || 'Your order status has been updated.',
        type,
        referenceId: order._id.toString(),
        email: user?.email,
        fcmToken: user?.fcmToken
    });
};

module.exports = { sendNotification, notifyOrderEvent };
