const express = require('express');
const router = express.Router();
const {
    getAllProducts,
    getSingleProduct,
    getProductsByCategory,
    createProduct,
    updateProduct,
    deleteProduct,
    createProductReview,
    getRecommendations
} = require('../controllers/productController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
    .get(getAllProducts)
    .post(protect, admin, createProduct);

router.route('/category/:categoryId')
    .get(getProductsByCategory);

router.route('/:id')
    .get(getSingleProduct)
    .put(protect, admin, updateProduct)
    .delete(protect, admin, deleteProduct);

router.post('/:id/reviews', protect, createProductReview);
router.get('/:id/recommendations', getRecommendations);

module.exports = router;
