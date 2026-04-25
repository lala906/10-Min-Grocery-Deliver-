const Rider = require('../models/Rider');
const AssignmentConfig = require('../models/AssignmentConfig');
const Assignment = require('../models/Assignment');
const { createAuditLog } = require('./auditLogger');

/**
 * Haversine formula — returns distance in km between two lat/lng points.
 */
const haversineKm = (lat1, lng1, lat2, lng2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/**
 * Normalises a value between 0 and 1 (higher = better).
 * For distance: closer = better → invert.
 * For rating: higher = better.
 * For workload: fewer active orders = better → invert.
 */
const normalise = (value, min, max, invert = false) => {
    if (max === min) return 0.5;
    const n = (value - min) / (max - min);
    return invert ? 1 - n : n;
};

/**
 * Auto-assignment engine.
 * Finds the best available rider for an order using weighted scoring.
 *
 * @param {Object} order - Mongoose Order document (must have shippingAddress.lat/lng)
 * @param {string|null} adminId - Admin triggering (null for fully automatic)
 * @returns {Object} { assignment, rider } or throws
 */
const autoAssign = async (order, adminId = null) => {
    // 1. Load config (or defaults)
    let config = await AssignmentConfig.findOne({ singleton: true });
    if (!config) {
        config = {
            maxDistanceKm: 10,
            maxOrdersPerRider: 3,
            rules: { proximityWeight: 40, ratingWeight: 25, workloadWeight: 25, vehicleTypeWeight: 10 }
        };
    }

    const { maxDistanceKm, maxOrdersPerRider, rules } = config;
    const orderLat = order.shippingAddress?.lat;
    const orderLng = order.shippingAddress?.lng;

    // 2. Find all online & available riders with valid KYC
    const availableRiders = await Rider.find({
        isOnline: true,
        isAvailable: true,
        status: 'active',
        kycStatus: 'approved',
    }).lean();

    if (availableRiders.length === 0) {
        throw new Error('No available riders found for auto-assignment.');
    }

    // 3. Get active order counts per rider
    const riderWorkloads = {};
    for (const rider of availableRiders) {
        const count = await Assignment.countDocuments({
            rider: rider._id,
            status: { $in: ['pending', 'accepted', 'picked_up', 'in_transit'] }
        });
        riderWorkloads[rider._id.toString()] = count;
    }

    // 4. Filter by max workload and max distance
    const filtered = availableRiders.filter(r => {
        const workload = riderWorkloads[r._id.toString()] || 0;
        if (workload >= maxOrdersPerRider) return false;

        if (orderLat && orderLng && r.currentLocation?.lat) {
            const dist = haversineKm(orderLat, orderLng, r.currentLocation.lat, r.currentLocation.lng);
            return dist <= maxDistanceKm;
        }
        return true;
    });

    if (filtered.length === 0) {
        throw new Error('No riders available within the delivery radius.');
    }

    // 5. Compute distances
    const withDistance = filtered.map(r => ({
        ...r,
        distanceKm: (orderLat && r.currentLocation?.lat)
            ? haversineKm(orderLat, orderLng, r.currentLocation.lat, r.currentLocation.lng)
            : maxDistanceKm
    }));

    // 6. Score each rider
    const distances = withDistance.map(r => r.distanceKm);
    const ratings = withDistance.map(r => r.rating || 0);
    const workloads = withDistance.map(r => riderWorkloads[r._id.toString()] || 0);

    const minDist = Math.min(...distances), maxDist = Math.max(...distances);
    const minRat = Math.min(...ratings), maxRat = Math.max(...ratings);
    const minWork = Math.min(...workloads), maxWork = Math.max(...workloads);

    const scored = withDistance.map(r => {
        const proximity = normalise(r.distanceKm, minDist, maxDist, true); // closer is better
        const rating = normalise(r.rating || 0, minRat, maxRat, false);
        const workload = normalise(riderWorkloads[r._id.toString()] || 0, minWork, maxWork, true); // fewer = better
        const vehicle = 1; // default full score; extend with vehicle filtering logic if needed

        const score =
            (proximity * rules.proximityWeight +
             rating * rules.ratingWeight +
             workload * rules.workloadWeight +
             vehicle * rules.vehicleTypeWeight) / 100;

        return { ...r, score };
    });

    // 7. Sort by score descending → pick best
    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];

    // 8. Create Assignment record
    const deliveryFee = order.deliveryFee || 20;
    const commissionRate = best.commissionRate || 15;
    const commissionAmount = (deliveryFee * commissionRate) / 100;
    const riderEarning = deliveryFee - commissionAmount;

    const assignment = await Assignment.create({
        order: order._id,
        rider: best._id,
        assignmentMode: adminId ? 'manual' : 'auto',
        assignedBy: adminId || null,
        status: 'pending',
        score: best.score,
        distanceKm: best.distanceKm,
        deliveryFee,
        commissionAmount,
        riderEarning,
        assignedAt: new Date()
    });

    // 9. Update order
    order.rider = best._id;
    order.activeAssignment = assignment._id;
    order.orderStatus = 'Rider Assigned';
    order.assignedAt = new Date();
    await order.save();

    // 10. Audit log
    await createAuditLog({
        actorId: adminId || best._id,
        actorRole: adminId ? 'admin' : 'system',
        action: adminId ? 'ORDER_MANUALLY_ASSIGNED' : 'ORDER_AUTO_ASSIGNED',
        description: `Order ${order._id} assigned to rider ${best.name} (score: ${best.score.toFixed(3)}, ${best.distanceKm.toFixed(1)} km)`,
        targetType: 'Assignment',
        targetId: assignment._id,
        severity: 'info'
    });

    return { assignment, rider: best };
};

module.exports = { autoAssign, haversineKm };
