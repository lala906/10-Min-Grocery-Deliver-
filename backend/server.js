const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173', 'http://127.0.0.1:3001'],
        methods: ['GET', 'POST', 'PUT', 'DELETE']
    }
});

app.set('socketio', io);

// ─── RATE LIMITING ───────────────────────────────────────────────
let rateLimit;
try {
    rateLimit = require('express-rate-limit');
    const authLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 20,
        message: { message: 'Too many requests from this IP, please try again after 15 minutes.' }
    });
    const apiLimiter = rateLimit({
        windowMs: 1 * 60 * 1000, // 1 minute
        max: 120,
        message: { message: 'Rate limit exceeded.' }
    });
    app.use('/api/auth', authLimiter);
    app.use('/api/riders/login', authLimiter);
    app.use('/api/', apiLimiter);
} catch (e) {
    console.warn('[Rate Limiter] express-rate-limit not installed, skipping.');
}

// ─── SOCKET.IO EVENTS ────────────────────────────────────────────
io.on('connection', (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    // User joins their order tracking room
    socket.on('joinOrderRoom', (orderId) => {
        socket.join(orderId);
        console.log(`[Socket] Socket ${socket.id} joined order room: ${orderId}`);
    });

    // Rider joins their personal room
    socket.on('joinRiderRoom', (riderId) => {
        socket.join(`rider_${riderId}`);
        console.log(`[Socket] Rider ${riderId} joined rider room`);
    });

    // Admin joins admin monitoring room
    socket.on('joinAdminRoom', () => {
        socket.join('admin_room');
        console.log(`[Socket] Admin joined admin_room`);
    });

    // Rider sends live location (client-side watchPosition ~2-3s)
    socket.on('updateRiderLocation', async ({ riderId, lat, lng, speed = 0, heading = 0, accuracy = 0, orderId }) => {
        try {
            // Basic validation
            if (typeof lat !== 'number' || typeof lng !== 'number') return;
            if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return;

            const payload = { lat, lng, speed, heading, accuracy, timestamp: Date.now() };

            // Broadcast to specific order room (customer tracking)
            if (orderId) {
                io.to(orderId).emit('riderLocationUpdated', payload);
            }
            // Broadcast to admin room (live map with all riders)
            io.to('admin_room').emit('riderLocationUpdated', {
                riderId, ...payload,
            });
        } catch (err) {
            console.error('[Socket] Location update error:', err.message);
        }
    });


    socket.on('disconnect', () => {
        console.log(`[Socket] Disconnected: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 5000;

// ─── MIDDLEWARE ───────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── ROUTES ───────────────────────────────────────────────────────
app.use('/api/auth',          require('./routes/authRoutes'));
app.use('/api/products',      require('./routes/productRoutes'));
app.use('/api/upload',        require('./routes/uploadRoutes'));
app.use('/api/categories',    require('./routes/categoryRoutes'));
app.use('/api/cart',          require('./routes/cartRoutes'));
app.use('/api/orders',        require('./routes/orderRoutes'));
app.use('/api/coupons',       require('./routes/couponRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/admin',         require('./routes/adminRoutes'));
app.use('/api/payment',       require('./routes/paymentRoutes'));
app.use('/api/razorpay',      require('./routes/razorpayRoutes'));
app.use('/api/riders',        require('./routes/riderRoutes'));

// ─── NEW ROUTES ────────────────────────────────────────────────────
app.use('/api/shops',         require('./routes/shopRoutes'));
app.use('/api/kyc',           require('./routes/kycRoutes'));
app.use('/api/assignments',   require('./routes/assignmentRoutes'));
app.use('/api/payouts',       require('./routes/payoutRoutes'));
app.use('/api/disputes',      require('./routes/disputeRoutes'));
app.use('/api/audit',         require('./routes/auditRoutes'));
app.use('/api/zones',         require('./routes/zoneRoutes'));

// ─── LATEST FEATURE ROUTES ──────────────────────────────────────────
app.use('/api/wallet',          require('./routes/walletRoutes'));
app.use('/api/slots',           require('./routes/deliverySlotRoutes'));
app.use('/api/recommendations', require('./routes/recommendationRoutes'));
app.use('/api/subscriptions',   require('./routes/subscriptionRoutes'));
app.use('/api/fraud',           require('./routes/fraudRoutes'));
app.use('/api/chat',            require('./routes/chatRoutes'));
app.use('/api/support',         require('./routes/supportRoutes'));
app.use('/api/analytics',       require('./routes/analyticsRoutes'));
app.use('/api/tracking',        require('./routes/trackingRoutes')); // public share link


// Static uploads
app.use('/uploads', express.static(path.join(__dirname, '/uploads')));

// Health check
app.get('/', (req, res) => res.json({
    status: 'ok',
    service: '10Min Grocery Backend',
    version: '2.0.0',
    timestamp: new Date().toISOString()
}));

// ─── ERROR HANDLING ───────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── DATABASE CONNECTION ──────────────────────────────────────────
const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/groceerynewstore';

mongoose.connect(mongoURI)
    .then(() => {
        console.log('[DB] MongoDB connected successfully');
        // Seed default assignment config if it doesn't exist
        const AssignmentConfig = require('./models/AssignmentConfig');
        AssignmentConfig.findOne({ singleton: true }).then(cfg => {
            if (!cfg) AssignmentConfig.create({ singleton: true })
                .then(() => console.log('[DB] Default AssignmentConfig seeded'))
                .catch(e => console.error('[DB] AssignmentConfig seed error:', e.message));
        });
    })
    .catch((err) => console.error('[DB] MongoDB connection error:', err));

// ─── START SERVER ─────────────────────────────────────────────────
server.listen(PORT, () => {
    console.log(`[Server] Running on port ${PORT}`);
    console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
});