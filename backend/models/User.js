const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const addressSchema = new mongoose.Schema({
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true },
    lat: { type: Number },
    lng: { type: Number },
    isDefault: { type: Boolean, default: false }
});

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Please add a name'],
        },
        email: {
            type: String,
            required: [true, 'Please add an email'],
            unique: true,
            match: [
                /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
                'Please add a valid email',
            ],
        },
        password: {
            type: String,
            required: [true, 'Please add a password'],
            minlength: 6,
            select: false,
        },
        phone: { type: String },
        role: {
            type: String,
            enum: ['user', 'admin', 'rider', 'shop_owner'],
            default: 'user',
        },
        isBlocked: {
            type: Boolean,
            default: false
        },
        wishlist: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        }],
        addresses: [addressSchema],

        // ─── Wallet ────────────────────────────────────────────────
        walletBalance: {
            type: Number,
            default: 0,
            min: 0
        },

        // ─── Subscription ─────────────────────────────────────────
        subscription: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Subscription'
        },
        isSubscribed: {
            type: Boolean,
            default: false
        },

        // ─── Fraud ────────────────────────────────────────────────
        riskScore: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        isFlagged: {
            type: Boolean,
            default: false
        },

        // ─── Notifications ────────────────────────────────────────
        fcmToken: { type: String },     // Firebase Cloud Messaging
        notificationPrefs: {
            email: { type: Boolean, default: true },
            sms: { type: Boolean, default: true },
            push: { type: Boolean, default: true }
        },

        // ─── Preferences ─────────────────────────────────────────
        language: { type: String, enum: ['en', 'hi'], default: 'en' },
        isFirstOrder: { type: Boolean, default: true }
    },
    {
        timestamps: true,
    }
);

// Encrypt password using bcrypt
userSchema.pre('save', async function () {
    if (!this.isModified('password')) {
        return;
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
