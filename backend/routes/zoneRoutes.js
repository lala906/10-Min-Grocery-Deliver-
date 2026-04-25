const express = require('express');
const router = express.Router();
const { getZones, createZone, updateZone, deleteZone, assignRidersToZone } = require('../controllers/zoneController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, admin, getZones)
    .post(protect, admin, createZone);

router.route('/:id')
    .put(protect, admin, updateZone)
    .delete(protect, admin, deleteZone);

router.put('/:id/riders', protect, admin, assignRidersToZone);

module.exports = router;
