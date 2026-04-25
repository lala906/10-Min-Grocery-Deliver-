const asyncHandler = require('express-async-handler');
const ChatMessage = require('../models/ChatMessage');
const Order = require('../models/Order');

// @desc    Get chat history for a room
// @route   GET /api/chat/:room
// @access  Private
const getChatHistory = asyncHandler(async (req, res) => {
    const { room } = req.params;
    const messages = await ChatMessage.find({ room })
        .sort({ createdAt: 1 })
        .limit(100);

    // Mark messages as read
    await ChatMessage.updateMany(
        { room, sender: { $ne: req.user._id }, isRead: false },
        { isRead: true, readAt: new Date() }
    );

    res.json({ status: 'success', data: messages });
});

// @desc    Send a chat message (REST fallback)
// @route   POST /api/chat/send
// @access  Private
const sendMessage = asyncHandler(async (req, res) => {
    const { room, roomType, message, messageType = 'text' } = req.body;

    const chatMsg = await ChatMessage.create({
        room,
        roomType,
        sender: req.user._id,
        senderModel: req.user.role === 'admin' ? 'Admin' : 'User',
        senderName: req.user.name,
        message,
        messageType
    });

    // Emit via socket if available
    const io = req.app.get('socketio');
    if (io) {
        io.to(room).emit('newChatMessage', chatMsg);
    }

    res.status(201).json({ status: 'success', data: chatMsg });
});

// @desc    Get unread message count for user
// @route   GET /api/chat/unread
// @access  Private
const getUnreadCount = asyncHandler(async (req, res) => {
    // Get user's order rooms
    const orders = await Order.find({
        user: req.user._id,
        orderStatus: { $in: ['Rider Assigned', 'Picked Up', 'In Transit', 'Out for Delivery'] }
    }).select('_id');

    const roomIds = orders.map(o => `order_${o._id}`);

    const unread = await ChatMessage.countDocuments({
        room: { $in: roomIds },
        sender: { $ne: req.user._id },
        isRead: false
    });

    res.json({ status: 'success', data: { unread } });
});

module.exports = { getChatHistory, sendMessage, getUnreadCount };
