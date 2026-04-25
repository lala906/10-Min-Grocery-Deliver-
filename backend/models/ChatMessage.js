const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
    room: { type: String, required: true, index: true }, // e.g., "order_<orderId>" or "support_<ticketId>"
    roomType: { type: String, enum: ['order', 'support'], default: 'order' },
    sender: { type: mongoose.Schema.Types.ObjectId, refPath: 'senderModel', required: true },
    senderModel: { type: String, enum: ['User', 'Rider', 'Admin'], required: true },
    senderName: { type: String, required: true },
    message: { type: String, required: true },
    messageType: { type: String, enum: ['text', 'image', 'system'], default: 'text' },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
