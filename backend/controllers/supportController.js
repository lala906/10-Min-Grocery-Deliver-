const asyncHandler = require('express-async-handler');
const SupportTicket = require('../models/SupportTicket');
const { sendNotification } = require('../services/notificationService');

// @desc    Create support ticket
// @route   POST /api/support/tickets
// @access  Private
const createTicket = asyncHandler(async (req, res) => {
    const { subject, category, message, relatedOrderId } = req.body;

    const ticket = await SupportTicket.create({
        user: req.user._id,
        subject,
        category,
        relatedOrder: relatedOrderId,
        messages: [{ sender: 'user', senderName: req.user.name, message }]
    });

    res.status(201).json({ status: 'success', data: ticket });
});

// @desc    Get my tickets
// @route   GET /api/support/tickets
// @access  Private
const getMyTickets = asyncHandler(async (req, res) => {
    const tickets = await SupportTicket.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .populate('relatedOrder', 'orderStatus totalPrice');

    res.json({ status: 'success', data: tickets });
});

// @desc    Get ticket by ID
// @route   GET /api/support/tickets/:id
// @access  Private
const getTicketById = asyncHandler(async (req, res) => {
    const ticket = await SupportTicket.findById(req.params.id)
        .populate('user', 'name email')
        .populate('relatedOrder', 'orderStatus totalPrice orderItems');

    if (!ticket) {
        res.status(404);
        throw new Error('Ticket not found');
    }

    // Verify ownership or admin
    if (ticket.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        res.status(403);
        throw new Error('Not authorized');
    }

    res.json({ status: 'success', data: ticket });
});

// @desc    Reply to ticket (user or admin)
// @route   POST /api/support/tickets/:id/reply
// @access  Private
const replyToTicket = asyncHandler(async (req, res) => {
    const { message } = req.body;
    const ticket = await SupportTicket.findById(req.params.id);

    if (!ticket) {
        res.status(404);
        throw new Error('Ticket not found');
    }

    const isAdmin = req.user.role === 'admin';
    ticket.messages.push({
        sender: isAdmin ? 'admin' : 'user',
        senderName: isAdmin ? 'Support Team' : req.user.name,
        message
    });

    if (isAdmin) {
        ticket.status = 'in_progress';
        // Notify user
        await sendNotification({
            userId: ticket.user,
            title: '💬 Support Reply Received',
            message: `Our support team replied to your ticket "${ticket.subject}".`,
            type: 'SYSTEM',
            referenceId: ticket._id.toString()
        });
    }

    await ticket.save();
    res.json({ status: 'success', data: ticket });
});

// @desc    Close ticket
// @route   PUT /api/support/tickets/:id/close
// @access  Private
const closeTicket = asyncHandler(async (req, res) => {
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) {
        res.status(404);
        throw new Error('Ticket not found');
    }
    ticket.status = 'resolved';
    ticket.resolvedAt = new Date();
    await ticket.save();
    res.json({ status: 'success', message: 'Ticket resolved', data: ticket });
});

// @desc    Admin: Get all tickets
// @route   GET /api/support/tickets/admin/all
// @access  Admin
const getAllTickets = asyncHandler(async (req, res) => {
    const { status, page = 1, limit = 20, category } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;

    const tickets = await SupportTicket.find(filter)
        .populate('user', 'name email')
        .populate('relatedOrder', 'orderStatus')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit));

    const total = await SupportTicket.countDocuments(filter);
    const stats = await SupportTicket.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    res.json({ status: 'success', data: { tickets, total, stats } });
});

// FAQ data
const getFAQs = asyncHandler(async (req, res) => {
    const faqs = [
        { q: "How do I track my order?", a: "Go to Orders page and click on your order to see live tracking.", category: "orders" },
        { q: "What is the delivery time?", a: "We deliver within 10-30 minutes depending on your location and slot selected.", category: "delivery" },
        { q: "How do I use wallet balance?", a: "At checkout, toggle 'Pay with Wallet' to use your available balance.", category: "payment" },
        { q: "How do I get a refund?", a: "If your order is not delivered, an automatic refund is credited to your wallet within 24 hours.", category: "payment" },
        { q: "What is Premium Membership?", a: "Premium gives you free delivery, 5% cashback, and exclusive offers for ₹99/month.", category: "membership" },
        { q: "How do coupons work?", a: "Enter a coupon code at checkout. Minimum order value and user type restrictions may apply.", category: "offers" },
        { q: "Can I change my delivery slot?", a: "You can select a delivery slot at checkout. Currently, slots cannot be changed after order placement.", category: "delivery" },
        { q: "What if a product is out of stock?", a: "Out-of-stock products are hidden from the catalog. Check back later or search for alternatives.", category: "products" }
    ];
    res.json({ status: 'success', data: faqs });
});

module.exports = { createTicket, getMyTickets, getTicketById, replyToTicket, closeTicket, getAllTickets, getFAQs };
