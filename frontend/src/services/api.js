import axios from 'axios';

const api = axios.create({
    baseURL: 'http://127.0.0.1:5000/api',
});

// ─── Auth Interceptor ─────────────────────────────────────────────
api.interceptors.request.use(
    (config) => {
        const userInfo = localStorage.getItem('userInfo');
        if (userInfo) {
            const { data } = JSON.parse(userInfo);
            if (data?.token) config.headers.Authorization = `Bearer ${data.token}`;
        }
        // Rider auth token
        const riderInfo = localStorage.getItem('riderInfo');
        if (riderInfo && !config.headers.Authorization) {
            const rd = JSON.parse(riderInfo);
            if (rd?.token) config.headers.Authorization = `Bearer ${rd.token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// ─── User Auth ────────────────────────────────────────────────────
export const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    return data;
};
export const register = async (name, email, password) => {
    const { data } = await api.post('/auth/register', { name, email, password });
    return data;
};

// ─── Products ─────────────────────────────────────────────────────
export const getProducts = async (minPrice = 0, maxPrice = 999999) => {
    const { data } = await api.get(`/products?minPrice=${minPrice}&maxPrice=${maxPrice}`);
    return data;
};
export const getProductById = async (id) => {
    const { data } = await api.get(`/products/${id}`);
    return data;
};
export const createProduct = async (productData) => {
    const { data } = await api.post('/products', productData);
    return data;
};
export const updateProduct = async (id, productData) => {
    const { data } = await api.put(`/products/${id}`, productData);
    return data;
};
export const deleteProduct = async (id) => {
    const { data } = await api.delete(`/products/${id}`);
    return data;
};

// ─── Categories ───────────────────────────────────────────────────
export const getCategories = async () => {
    const { data } = await api.get('/categories');
    return data;
};
export const getProductsByCategory = async (id) => {
    const { data } = await api.get(`/products/category/${id}`);
    return data;
};
export const createCategory = async (categoryData) => {
    const { data } = await api.post('/categories', categoryData);
    return data;
};
export const deleteCategory = async (id) => {
    const { data } = await api.delete(`/categories/${id}`);
    return data;
};

// ─── Cart ─────────────────────────────────────────────────────────
export const getCart = async () => { const { data } = await api.get('/cart'); return data; };
export const addToCart = async (productId, quantity) => { const { data } = await api.post('/cart', { productId, quantity }); return data; };
export const updateCartItem = async (productId, quantity) => { const { data } = await api.put(`/cart/${productId}`, { quantity }); return data; };
export const removeFromCart = async (productId) => { const { data } = await api.delete(`/cart/${productId}`); return data; };

// ─── Orders ───────────────────────────────────────────────────────
export const placeOrder = async (orderData) => { const { data } = await api.post('/orders', orderData); return data; };
export const getMyOrders = async () => { const { data } = await api.get('/orders/myorders'); return data; };
export const getOrderDetails = async (id) => { const { data } = await api.get(`/orders/${id}`); return data; };
export const getAllOrders = async () => { const { data } = await api.get('/orders'); return data; };
export const updateOrderStatus = async (id, status) => { const { data } = await api.put(`/orders/${id}/status`, { status }); return data; };

// ─── Admin ────────────────────────────────────────────────────────
export const getAdminDashboard = async () => { const { data } = await api.get('/admin/dashboard'); return data; };
export const getLiveMapData = async () => { const { data } = await api.get('/admin/live-map'); return data; };
export const getAllUsers = async (params = {}) => { const { data } = await api.get('/admin/users', { params }); return data; };
export const toggleUserBlock = async (id) => { const { data } = await api.put(`/admin/users/${id}/block`); return data; };
// Legacy compat
export const getAdminStats = async () => getAdminDashboard();

// ─── Upload ───────────────────────────────────────────────────────
export const uploadImage = async (formData) => {
    const { data } = await api.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    return data;
};

// ─── Notifications ────────────────────────────────────────────────
export const getNotifications = async () => { const { data } = await api.get('/notifications'); return data; };
export const markNotificationRead = async (id) => { const { data } = await api.put(`/notifications/${id}/read`); return data; };

// ─── Wishlist & Addresses ────────────────────────────────────────
export const toggleWishlist = async (productId) => { const { data } = await api.post('/auth/wishlist/toggle', { productId }); return data; };
export const addAddress = async (addressData) => { const { data } = await api.post('/auth/addresses', addressData); return data; };
export const removeAddress = async (addressId) => { const { data } = await api.delete(`/auth/addresses/${addressId}`); return data; };

// ─── Coupons ─────────────────────────────────────────────────────
export const applyCoupon = async (code, cartTotal) => { const { data } = await api.post('/coupons/apply', { code, cartTotal }); return data; };
export const getCoupons = async () => { const { data } = await api.get('/coupons'); return data; };
export const getAvailableCoupons = async () => { const { data } = await api.get('/coupons/available'); return data; };
export const createCoupon = async (couponData) => { const { data } = await api.post('/coupons', couponData); return data; };
export const updateCoupon = async (id, couponData) => { const { data } = await api.put(`/coupons/${id}`, couponData); return data; };
export const deleteCoupon = async (id) => { const { data } = await api.delete(`/coupons/${id}`); return data; };

// ─── Payment (Legacy Stripe) ──────────────────────────────────────
export const createPaymentIntent = async (amount) => { const { data } = await api.post('/payment/create-payment-intent', { amount }); return data; };

// ─── Razorpay ─────────────────────────────────────────────────────
export const createRazorpayOrder = async (amount, notes = {}) => { const { data } = await api.post('/razorpay/create-order', { amount, notes }); return data; };
export const verifyRazorpayPayment = async (payload) => { const { data } = await api.post('/razorpay/verify-payment', payload); return data; };
export const checkPincodeServiceability = async (pincode) => { const { data } = await api.get(`/razorpay/check-pincode/${pincode}`); return data; };

// ─── India Post Pincode Lookup (public API, no auth) ─────────────
export const lookupPincode = async (pincode) => {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
    const json = await res.json();
    return json;
};

// ─── Rider Auth & Profile ────────────────────────────────────────
export const loginRider = async (phone, password) => { const { data } = await api.post('/riders/login', { phone, password }); return data; };
export const registerRider = async (riderData) => { const { data } = await api.post('/riders/register', riderData); return data; };
export const getRiderProfile = async () => { const { data } = await api.get('/riders/profile'); return data; };
export const updateRiderAvailability = async (isAvailable) => { const { data } = await api.put('/riders/availability', { isAvailable }); return data; };
export const updateRiderLocation = async (lat, lng, speed, heading) => { const { data } = await api.put('/riders/location', { lat, lng, speed, heading }); return data; };
export const getRiderAssignedOrders = async () => { const { data } = await api.get('/riders/orders'); return data; };
export const updateOrderStatusByRider = async (id, status) => { const { data } = await api.put(`/riders/orders/${id}/status`, { status }); return data; };
export const getRiderEarnings = async () => { const { data } = await api.get('/riders/earnings'); return data; };
export const getRiderPerformance = async () => { const { data } = await api.get('/riders/performance'); return data; };

// ─── Admin Rider Management ───────────────────────────────────────
export const getAllRiders = async (params = {}) => { const { data } = await api.get('/riders', { params }); return data; };
export const getRiderById = async (id) => { const { data } = await api.get(`/riders/${id}`); return data; };
export const updateRiderStatus = async (id, status, reason) => { const { data } = await api.put(`/riders/${id}/status`, { status, reason }); return data; };
export const getActiveRiders = async () => { const { data } = await api.get('/riders/active'); return data; };
export const assignRiderToOrder = async (orderId, riderId) => { const { data } = await api.put('/riders/assign', { orderId, riderId }); return data; };

// ─── KYC ──────────────────────────────────────────────────────────
export const submitKYC = async (kycData) => { const { data } = await api.post('/kyc/submit', kycData); return data; };
export const getMyKYC = async () => { const { data } = await api.get('/kyc/me'); return data; };
export const getKYCQueue = async (params = {}) => { const { data } = await api.get('/kyc/queue', { params }); return data; };
export const getKYCByRider = async (riderId) => { const { data } = await api.get(`/kyc/${riderId}`); return data; };
export const approveKYC = async (id) => { const { data } = await api.put(`/kyc/${id}/approve`); return data; };
export const rejectKYC = async (id, reason) => { const { data } = await api.put(`/kyc/${id}/reject`, { reason }); return data; };

// ─── Assignments ──────────────────────────────────────────────────
export const triggerAutoAssign = async (orderId) => { const { data } = await api.post('/assignments/auto', { orderId }); return data; };
export const manualAssign = async (orderId, riderId, reason) => { const { data } = await api.post('/assignments/manual', { orderId, riderId, reason }); return data; };
export const reassignOrder = async (assignmentId, newRiderId, reason) => { const { data } = await api.put(`/assignments/${assignmentId}/reassign`, { newRiderId, reason }); return data; };
export const getAssignmentHistory = async (orderId) => { const { data } = await api.get(`/assignments/history/${orderId}`); return data; };
export const getAssignmentConfig = async () => { const { data } = await api.get('/assignments/config'); return data; };
export const updateAssignmentConfig = async (configData) => { const { data } = await api.put('/assignments/config', configData); return data; };
export const acceptAssignment = async (id) => { const { data } = await api.put(`/assignments/${id}/accept`); return data; };
export const rejectAssignment = async (id, reason) => { const { data } = await api.put(`/assignments/${id}/reject`, { reason }); return data; };

// ─── Payouts ──────────────────────────────────────────────────────
export const calculatePayout = async (payoutData) => { const { data } = await api.post('/payouts/calculate', payoutData); return data; };
export const getAllPayouts = async (params = {}) => { const { data } = await api.get('/payouts', { params }); return data; };
export const getRiderPayouts = async (riderId) => { const { data } = await api.get(`/payouts/rider/${riderId}`); return data; };
export const markPayoutPaid = async (id, paymentRef, paymentMethod) => { const { data } = await api.put(`/payouts/${id}/mark-paid`, { paymentRef, paymentMethod }); return data; };
export const exportPayoutsCSV = () => { window.open('http://127.0.0.1:5000/api/payouts/export', '_blank'); };

// ─── Disputes ─────────────────────────────────────────────────────
export const raiseDispute = async (disputeData) => { const { data } = await api.post('/disputes', disputeData); return data; };
export const getAllDisputes = async (params = {}) => { const { data } = await api.get('/disputes', { params }); return data; };
export const getDisputeById = async (id) => { const { data } = await api.get(`/disputes/${id}`); return data; };
export const addEvidence = async (id, evidenceData) => { const { data } = await api.post(`/disputes/${id}/evidence`, evidenceData); return data; };
export const updateDisputeStatus = async (id, statusData) => { const { data } = await api.put(`/disputes/${id}/status`, statusData); return data; };
export const resolveDispute = async (id, resolutionData) => { const { data } = await api.put(`/disputes/${id}/resolve`, resolutionData); return data; };

// ─── Audit Logs ───────────────────────────────────────────────────
export const getAuditLogs = async (params = {}) => { const { data } = await api.get('/audit', { params }); return data; };
export const getTargetLogs = async (type, id) => { const { data } = await api.get(`/audit/target/${type}/${id}`); return data; };

// ─── Zones ────────────────────────────────────────────────────────
export const getZones = async () => { const { data } = await api.get('/zones'); return data; };
export const createZone = async (zoneData) => { const { data } = await api.post('/zones', zoneData); return data; };
export const updateZone = async (id, zoneData) => { const { data } = await api.put(`/zones/${id}`, zoneData); return data; };
export const deleteZone = async (id) => { const { data } = await api.delete(`/zones/${id}`); return data; };
export const assignRidersToZone = async (id, riderIds) => { const { data } = await api.put(`/zones/${id}/riders`, { riderIds }); return data; };

// ─── Reviews ─────────────────────────────────────────────────────
export const addProductReview = async (productId, reviewData) => { const { data } = await api.post(`/products/${productId}/reviews`, reviewData); return data; };

// ─── LATEST CAPABILITIES (PHASE 1-5) ─────────────────────────────

// Wallet
export const getWallet = async () => { const { data } = await api.get('/wallet'); return data; };
export const addWalletMoney = async (amount) => { const { data } = await api.post('/wallet/add', { amount }); return data; };
export const getWalletTransactions = async (params = {}) => { const { data } = await api.get('/wallet/transactions', { params }); return data; };

// Delivery Slots
export const getDeliverySlots = async () => { const { data } = await api.get('/slots'); return data; };

// Recommendations & Personalization
export const getRecommendations = async () => { const { data } = await api.get('/recommendations'); return data; };
export const trackUserActivity = async (activityData) => { const { data } = await api.post('/recommendations/activity', activityData); return data; };
export const getFrequentlyBoughtTogether = async (productId) => { const { data } = await api.get(`/recommendations/fbt/${productId}`); return data; };

// Subscriptions
export const getSubscriptionPlans = async () => { const { data } = await api.get('/subscriptions/plans'); return data; };
export const getMySubscription = async () => { const { data } = await api.get('/subscriptions/me'); return data; };
export const subscribeToPlan = async (plan) => { const { data } = await api.post('/subscriptions/subscribe', { plan }); return data; };

// Support Tickets
export const getSupportTickets = async () => { const { data } = await api.get('/support/tickets'); return data; };
export const createSupportTicket = async (ticketData) => { const { data } = await api.post('/support/tickets', ticketData); return data; };
export const getFAQs = async () => { const { data } = await api.get('/support/faqs'); return data; };

// Chat
export const getUnreadChatCount = async () => { const { data } = await api.get('/chat/unread'); return data; };
export const getChatHistory = async (room) => { const { data } = await api.get(`/chat/${room}`); return data; };
export const sendChatMessage = async (msgData) => { const { data } = await api.post('/chat/send', msgData); return data; };

// Admin Analytics
export const getAdvancedAnalytics = async (params = {}) => { const { data } = await api.get('/analytics', { params }); return data; };

export default api;
