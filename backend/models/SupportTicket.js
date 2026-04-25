const mongoose = require('mongoose');

const ticketMessageSchema = new mongoose.Schema({
    sender: { type: String, enum: ['user', 'admin'], required: true },
    senderName: { type: String },
    message: { type: String, required: true }
}, { timestamps: true });

const supportTicketSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    ticketNumber: { type: String, unique: true },
    subject: { type: String, required: true },
    category: {
        type: String,
        enum: ['order_issue', 'payment', 'delivery', 'product', 'account', 'other'],
        default: 'other'
    },
    status: { type: String, enum: ['open', 'in_progress', 'resolved', 'closed'], default: 'open' },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    relatedOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    messages: [ticketMessageSchema],
    resolvedAt: { type: Date },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Auto-generate ticket number before save
supportTicketSchema.pre('save', function (next) {
    if (!this.ticketNumber) {
        this.ticketNumber = 'TKT-' + Date.now().toString(36).toUpperCase();
    }
    next();
});

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
