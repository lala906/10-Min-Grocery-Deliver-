const express = require('express');
const router = express.Router();
const { getAnalytics, getLowStockAlerts, getHeatmapData } = require('../controllers/analyticsController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/', protect, admin, getAnalytics);
router.get('/low-stock', protect, admin, getLowStockAlerts);
router.get('/heatmap', protect, admin, getHeatmapData);

module.exports = router;
