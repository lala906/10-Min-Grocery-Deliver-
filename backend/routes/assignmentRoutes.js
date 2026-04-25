const express = require('express');
const router = express.Router();
const {
    triggerAutoAssign, manualAssign, reassignOrder,
    getAssignmentHistory, acceptAssignment, rejectAssignment,
    getConfig, updateConfig
} = require('../controllers/assignmentController');
const { protect, admin, protectRider } = require('../middleware/authMiddleware');

// Admin routes
router.post('/auto', protect, admin, triggerAutoAssign);
router.post('/manual', protect, admin, manualAssign);
router.put('/:id/reassign', protect, admin, reassignOrder);
router.get('/history/:orderId', protect, admin, getAssignmentHistory);
router.get('/config', protect, admin, getConfig);
router.put('/config', protect, admin, updateConfig);

// Rider routes
router.put('/:id/accept', protectRider, acceptAssignment);
router.put('/:id/reject', protectRider, rejectAssignment);

module.exports = router;
