const express = require('express');
const router = express.Router();
const { trackActivity, getRecommendations, getFrequentlyBoughtTogether, getPopularProducts } = require('../controllers/recommendationController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getRecommendations);
router.post('/activity', protect, trackActivity);
router.get('/popular', getPopularProducts);
router.get('/fbt/:productId', getFrequentlyBoughtTogether);

module.exports = router;
