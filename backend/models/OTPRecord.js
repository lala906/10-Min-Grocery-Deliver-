const mongoose = require('mongoose');

const otpRecordSchema = new mongoose.Schema({
    phone: { type: String, required: true },
    otp: { type: String, required: true },
    expiresAt: { type: Date, required: true }
}, { timestamps: true });

// Auto-delete expired OTPs after 5 minutes
otpRecordSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('OTPRecord', otpRecordSchema);
