const express = require('express');
const router = express.Router();
const { getWallet, addMoney, getTransactions, getAllWalletTransactions } = require('../controllers/walletController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/', protect, getWallet);
router.post('/add', protect, addMoney);
router.get('/transactions', protect, getTransactions);
router.get('/admin/all', protect, admin, getAllWalletTransactions);

module.exports = router;
