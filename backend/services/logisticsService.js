/**
 * Haversine formula - returns distance in km between two lat/lng points
 */
const haversineDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

/**
 * Find the nearest active warehouse to a given location
 * @param {number} lat - Customer latitude
 * @param {number} lng - Customer longitude
 * @param {Array} warehouses - Array of warehouse documents
 * @returns {Object|null} - Nearest warehouse or null
 */
const findNearestWarehouse = (lat, lng, warehouses) => {
    if (!warehouses || warehouses.length === 0) return null;

    let nearest = null;
    let minDistance = Infinity;

    for (const wh of warehouses) {
        if (!wh.isActive) continue;
        const dist = haversineDistance(lat, lng, wh.location.lat, wh.location.lng);
        if (dist < minDistance && dist <= (wh.serviceRadius || 10)) {
            minDistance = dist;
            nearest = { ...wh.toObject?.() ?? wh, distanceKm: dist.toFixed(2) };
        }
    }

    return nearest;
};

/**
 * Find the nearest active open shop to a given location
 * @param {number} lat - Customer latitude
 * @param {number} lng - Customer longitude
 * @param {Array} shops - Array of shop documents
 * @returns {Object|null} - Nearest shop or null
 */
const findNearestShop = (lat, lng, shops) => {
    if (!shops || shops.length === 0) return null;

    let nearest = null;
    let minDistance = Infinity;

    for (const shop of shops) {
        if (!shop.isOpen || shop.kycStatus !== 'approved') continue;
        const dist = haversineDistance(lat, lng, shop.location.lat, shop.location.lng);
        if (dist < minDistance && dist <= 20) { // arbitrary 20km service radius
            minDistance = dist;
            nearest = { ...shop.toObject?.() ?? shop, distanceKm: dist.toFixed(2) };
        }
    }

    return nearest;
};

/**
 * Estimate delivery time based on distance
 * @param {number} distanceKm
 * @returns {number} - Minutes
 */
const estimateDeliveryMinutes = (distanceKm) => {
    const baseTime = 10; // prep time
    const travelTime = Math.ceil(distanceKm * 3); // ~3 min/km average
    return baseTime + travelTime;
};

/**
 * Group orders for batch delivery (same zone/area)
 * @param {Array} pendingOrders
 * @returns {Array} - Array of order groups
 */
const groupOrdersForBatch = (pendingOrders, maxGroupSize = 3) => {
    const batches = [];
    for (let i = 0; i < pendingOrders.length; i += maxGroupSize) {
        batches.push(pendingOrders.slice(i, i + maxGroupSize));
    }
    return batches;
};

/**
 * Dynamic pricing: calculate surge factor based on demand
 * @param {number} recentOrderCount - Orders in last 30 mins
 * @param {number} availableRiders - Active available riders
 * @returns {number} - Surge factor (1.0 - 2.0)
 */
const calculateSurgeFactor = (recentOrderCount, availableRiders) => {
    if (availableRiders === 0) return 2.0;
    const ratio = recentOrderCount / Math.max(availableRiders, 1);
    if (ratio > 5) return 2.0;
    if (ratio > 3) return 1.5;
    if (ratio > 2) return 1.25;
    return 1.0;
};

/**
 * Time-based pricing multiplier
 * @param {number} hour - Hour of the day (0-23)
 * @returns {number} - Multiplier
 */
const getTimePriceMultiplier = (hour) => {
    // Peak hours: 7-9 AM, 12-2 PM, 6-9 PM
    if ((hour >= 7 && hour <= 9) || (hour >= 12 && hour <= 14) || (hour >= 18 && hour <= 21)) {
        return 1.15;
    }
    return 1.0;
};

module.exports = {
    haversineDistance,
    findNearestWarehouse,
    findNearestShop,
    estimateDeliveryMinutes,
    groupOrdersForBatch,
    calculateSurgeFactor,
    getTimePriceMultiplier
};
