const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

// Generate JWT Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        res.status(400);
        throw new Error('Please add all fields');
    }

    // Check if user exists
    const userExists = await User.findOne({ email }).select("+password");

    if (userExists) {
        res.status(400);
        throw new Error('User already exists');
    }

    // Create user
    const user = await User.create({
        name,
        email,
        password,
    });

    if (user) {
        res.status(201).json({
            status: 'success',
            message: 'User registered successfully',
            data: {
                _id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user._id),
            }
        });
    } else {
        res.status(400);
        throw new Error('Invalid user data');
    }
});

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        res.status(400);
        throw new Error('Please add all fields');
    }

    // Check for user email
    const user = await User.findOne({ email }).select('+password');

    if (user && user.isBlocked) {
        res.status(403);
        throw new Error('Your account has been blocked by an administrator.');
    }

    if (user && (await user.matchPassword(password))) {
        res.json({
            status: 'success',
            message: 'User logged in successfully',
            data: {
                _id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user._id),
            }
        });
    } else {
        res.status(401);
        throw new Error('Invalid credentials');
    }
});

// @desc    Get current user profile
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = asyncHandler(async (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'User profile fetched successfully',
        data: req.user
    });
});

const updateUserBlockStatus = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (user) {
        user.isBlocked = req.body.isBlocked;
        await user.save();
        res.json({ message: `User has been ${user.isBlocked ? 'blocked' : 'unblocked'}` });
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});

const toggleWishlist = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { productId } = req.body;

    const user = await User.findById(userId);
    const alreadyInWishlist = user.wishlist.includes(productId);

    if (alreadyInWishlist) {
        user.wishlist = user.wishlist.filter(id => id.toString() !== productId.toString());
    } else {
        user.wishlist.push(productId);
    }

    await user.save();
    res.json(user.wishlist);
});

const addAddress = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    if (user) {
        user.addresses.push(req.body);
        await user.save();
        res.status(201).json(user.addresses);
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});

const removeAddress = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    if (user) {
        user.addresses = user.addresses.filter(addr => addr._id.toString() !== req.params.addressId);
        await user.save();
        res.json(user.addresses);
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});

const OTPRecord = require('../models/OTPRecord');

// @desc    Send OTP to phone number
// @route   POST /api/auth/send-otp
// @access  Public
const sendOtp = asyncHandler(async (req, res) => {
    const { phone } = req.body;
    if (!phone) {
        res.status(400);
        throw new Error('Please provide a phone number');
    }

    // Check for cooldown (30 seconds)
    const existingOTP = await OTPRecord.findOne({ phone }).sort({ createdAt: -1 });
    if (existingOTP) {
        const timeDiff = new Date() - existingOTP.createdAt;
        if (timeDiff < 30 * 1000) {
            res.status(429);
            throw new Error('Please wait 30 seconds before requesting a new OTP');
        }
    }

    // Generate a 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // In production, integrate with SMS Gateway (e.g. Twilio, MSG91)
    console.log(`[OTP] Sent ${otp} to ${phone}`);

    await OTPRecord.deleteMany({ phone }); // Remove old OTPs to prevent multiple active ones
    await OTPRecord.create({
        phone,
        otp,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes expiry
    });

    res.status(200).json({ status: 'success', message: 'OTP sent successfully' });
});

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOtp = asyncHandler(async (req, res) => {
    const { phone, otp } = req.body;
    
    if (process.env.NODE_ENV !== 'production') {
        console.log(`[DEBUG] Received OTP Verification Request:`, { phone, enteredOtp: otp });
    }
    
    if (!phone || !otp) {
        res.status(400);
        throw new Error('Please provide phone and OTP');
    }

    const record = await OTPRecord.findOne({ phone }).sort({ createdAt: -1 });

    if (!record) {
        res.status(404);
        throw new Error('OTP not found. Please request a new OTP');
    }

    if (process.env.NODE_ENV !== 'production') {
        console.log(`[DEBUG] Stored OTP Data:`, { storedOtp: record.otp, expiresAt: record.expiresAt });
    }

    // Check expiry
    if (new Date() > record.expiresAt) {
        await OTPRecord.deleteMany({ phone });
        res.status(400);
        throw new Error('OTP expired, please resend');
    }

    // Convert both to string and trim strictly
    if (String(otp).trim() !== String(record.otp).trim()) {
        res.status(400);
        throw new Error('Invalid OTP');
    }

    // Valid OTP - Remove it so it cannot be reused
    await OTPRecord.deleteMany({ phone });

    // Check if user exists (for OTP login based on phone)
    let user = await User.findOne({ phone });
    if (user) {
        return res.status(200).json({
            status: 'success',
            message: 'OTP verified, logged in successfully',
            data: {
                _id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                token: generateToken(user._id),
            }
        });
    }

    // If user doesn't exist, it's a new registration flow
    res.status(200).json({ 
        status: 'success', 
        message: 'OTP verified successfully. Proceed to register.',
        verifiedPhone: phone
    });
});

module.exports = {
    registerUser,
    loginUser,
    getUserProfile,
    updateUserBlockStatus,
    toggleWishlist,
    addAddress,
    removeAddress,
    sendOtp,
    verifyOtp
};
