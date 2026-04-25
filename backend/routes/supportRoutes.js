const express = require('express');
const router = express.Router();
const {
    createTicket, getMyTickets, getTicketById,
    replyToTicket, closeTicket, getAllTickets, getFAQs
} = require('../controllers/supportController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/faqs', getFAQs);
router.route('/tickets')
    .get(protect, getMyTickets)
    .post(protect, createTicket);

router.get('/tickets/admin/all', protect, admin, getAllTickets);
router.get('/tickets/:id', protect, getTicketById);
router.post('/tickets/:id/reply', protect, replyToTicket);
router.put('/tickets/:id/close', protect, closeTicket);

module.exports = router;
