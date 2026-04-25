const express = require('express');
const router = express.Router();
const {
    placeOrder,
    getOrderById,
    getMyOrders,
    getOrders,
    updateOrderToDelivered,
    updateOrderStatus,
    retryDelivery
} = require('../controllers/orderController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
    .post(protect, placeOrder)
    .get(protect, admin, getOrders);

router.route('/myorders').get(protect, getMyOrders);
router.route('/:id').get(protect, getOrderById);
router.route('/:id/deliver').put(protect, admin, updateOrderToDelivered);
router.route('/:id/status').put(protect, admin, updateOrderStatus);
router.route('/:id/retry').put(protect, admin, retryDelivery);

module.exports = router;
