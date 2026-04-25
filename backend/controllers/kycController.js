const asyncHandler = require('express-async-handler');
const KYCRecord = require('../models/KYCRecord');
const Rider = require('../models/Rider');
const { createAuditLog } = require('../services/auditLogger');

// @desc    Rider submits KYC documents
// @route   POST /api/kyc/submit
// @access  Private/Rider
const submitKYC = asyncHandler(async (req, res) => {
    const { licenseNumber, idProofType, idProofNumber, licenseUrl, idProofUrl, vehicleRegUrl, selfieUrl } = req.body;

    // Upsert KYC record
    let kyc = await KYCRecord.findOne({ rider: req.rider._id });

    if (kyc && kyc.status === 'approved') {
        res.status(400);
        throw new Error('KYC already approved. No resubmission allowed.');
    }

    const auditEntry = {
        action: kyc ? 'resubmitted' : 'submitted',
        performedByName: req.rider.name,
        timestamp: new Date()
    };

    if (kyc) {
        kyc.licenseNumber = licenseNumber;
        kyc.idProofType = idProofType;
        kyc.idProofNumber = idProofNumber;
        kyc.licenseUrl = licenseUrl;
        kyc.idProofUrl = idProofUrl;
        kyc.vehicleRegUrl = vehicleRegUrl;
        kyc.selfieUrl = selfieUrl;
        kyc.status = 'pending';
        kyc.submittedAt = new Date();
        kyc.reviewedBy = undefined;
        kyc.reviewedAt = undefined;
        kyc.rejectionReason = undefined;
        kyc.auditTrail.push(auditEntry);
        await kyc.save();
    } else {
        kyc = await KYCRecord.create({
            rider: req.rider._id,
            licenseNumber, idProofType, idProofNumber,
            licenseUrl, idProofUrl, vehicleRegUrl, selfieUrl,
            status: 'pending',
            submittedAt: new Date(),
            auditTrail: [auditEntry]
        });
    }

    // Update rider's kycStatus
    await Rider.findByIdAndUpdate(req.rider._id, { kycStatus: 'pending' });

    res.status(201).json({ message: 'KYC submitted for review', kyc });
});

// @desc    Get my KYC status (Rider)
// @route   GET /api/kyc/me
// @access  Private/Rider
const getMyKYC = asyncHandler(async (req, res) => {
    const kyc = await KYCRecord.findOne({ rider: req.rider._id });
    if (!kyc) return res.json({ status: 'not_submitted' });
    res.json(kyc);
});

// @desc    Get all pending KYC records (Admin queue)
// @route   GET /api/kyc/queue
// @access  Private/Admin
const getKYCQueue = asyncHandler(async (req, res) => {
    const { status = 'pending', page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const records = await KYCRecord.find({ status })
        .populate('rider', 'name phone email vehicleDetails status kycStatus createdAt')
        .sort({ submittedAt: 1 })
        .skip(skip)
        .limit(Number(limit));

    const total = await KYCRecord.countDocuments({ status });
    res.json({ records, total, page: Number(page), pages: Math.ceil(total / limit) });
});

// @desc    Get single KYC record
// @route   GET /api/kyc/:riderId
// @access  Private/Admin
const getKYCByRider = asyncHandler(async (req, res) => {
    const kyc = await KYCRecord.findOne({ rider: req.params.riderId })
        .populate('rider', 'name phone email')
        .populate('reviewedBy', 'name email');
    if (!kyc) { res.status(404); throw new Error('KYC record not found'); }
    res.json(kyc);
});

// @desc    Admin approves KYC
// @route   PUT /api/kyc/:id/approve
// @access  Private/Admin
const approveKYC = asyncHandler(async (req, res) => {
    const kyc = await KYCRecord.findById(req.params.id).populate('rider');
    if (!kyc) { res.status(404); throw new Error('KYC record not found'); }

    const before = { status: kyc.status };

    kyc.status = 'approved';
    kyc.reviewedBy = req.user._id;
    kyc.reviewedAt = new Date();
    kyc.auditTrail.push({
        action: 'approved',
        performedBy: req.user._id,
        performedByName: req.user.name,
        timestamp: new Date()
    });
    await kyc.save();

    // Activate rider
    await Rider.findByIdAndUpdate(kyc.rider._id, {
        kycStatus: 'approved',
        status: 'active'
    });

    await createAuditLog({
        actorId: req.user._id,
        actorName: req.user.name,
        actorRole: req.user.role,
        action: 'KYC_APPROVED',
        description: `KYC approved for rider ${kyc.rider.name}`,
        targetType: 'KYCRecord',
        targetId: kyc._id,
        before,
        after: { status: 'approved' },
        ipAddress: req.ip,
        severity: 'info'
    });

    res.json({ message: 'KYC approved. Rider is now active.', kyc });
});

// @desc    Admin rejects KYC
// @route   PUT /api/kyc/:id/reject
// @access  Private/Admin
const rejectKYC = asyncHandler(async (req, res) => {
    const { reason } = req.body;
    const kyc = await KYCRecord.findById(req.params.id).populate('rider');
    if (!kyc) { res.status(404); throw new Error('KYC record not found'); }

    const before = { status: kyc.status };

    kyc.status = 'rejected';
    kyc.reviewedBy = req.user._id;
    kyc.reviewedAt = new Date();
    kyc.rejectionReason = reason || 'Documents not valid';
    kyc.auditTrail.push({
        action: 'rejected',
        performedBy: req.user._id,
        performedByName: req.user.name,
        remarks: reason,
        timestamp: new Date()
    });
    await kyc.save();

    await Rider.findByIdAndUpdate(kyc.rider._id, { kycStatus: 'rejected' });

    await createAuditLog({
        actorId: req.user._id,
        actorName: req.user.name,
        actorRole: req.user.role,
        action: 'KYC_REJECTED',
        description: `KYC rejected for rider ${kyc.rider.name}. Reason: ${reason}`,
        targetType: 'KYCRecord',
        targetId: kyc._id,
        before,
        after: { status: 'rejected', reason },
        ipAddress: req.ip,
        severity: 'warning'
    });

    res.json({ message: 'KYC rejected.', kyc });
});

module.exports = { submitKYC, getMyKYC, getKYCQueue, getKYCByRider, approveKYC, rejectKYC };
