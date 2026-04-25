const express = require('express');
const router = express.Router();
const { getChatHistory, sendMessage, getUnreadCount } = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

router.get('/unread', protect, getUnreadCount);
router.get('/:room', protect, getChatHistory);
router.post('/send', protect, sendMessage);

module.exports = router;
