const asyncHandler = require('express-async-handler');
const DeliverySlot = require('../models/DeliverySlot');

// Generate slots for the next N days
const generateSlotsForDays = async (days = 3) => {
    const slots = [];
    const today = new Date();

    for (let d = 0; d < days; d++) {
        const date = new Date(today);
        date.setDate(today.getDate() + d);
        const dateStr = date.toISOString().split('T')[0];
        const label = d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : date.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });

        const timeSlots = [
            { start: '07:00', end: '10:00', label: `${label} 7-10 AM` },
            { start: '10:00', end: '13:00', label: `${label} 10-1 PM` },
            { start: '13:00', end: '16:00', label: `${label} 1-4 PM` },
            { start: '16:00', end: '19:00', label: `${label} 4-7 PM` },
            { start: '19:00', end: '22:00', label: `${label} 7-10 PM` },
        ];

        for (const ts of timeSlots) {
            const exists = await DeliverySlot.findOne({ date: dateStr, startTime: ts.start });
            if (!exists) {
                slots.push({
                    date: dateStr,
                    label: ts.label,
                    startTime: ts.start,
                    endTime: ts.end,
                    capacity: 20,
                    isActive: true
                });
            }
        }
    }

    if (slots.length > 0) {
        await DeliverySlot.insertMany(slots);
    }
};

// @desc    Get available delivery slots
// @route   GET /api/slots
// @access  Public
const getAvailableSlots = asyncHandler(async (req, res) => {
    // Auto-generate slots if none exist for the next 3 days
    await generateSlotsForDays(3);

    const today = new Date().toISOString().split('T')[0];
    const threeDaysLater = new Date();
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);
    const endDate = threeDaysLater.toISOString().split('T')[0];

    const slots = await DeliverySlot.find({
        date: { $gte: today, $lte: endDate },
        isActive: true
    }).sort({ date: 1, startTime: 1 });

    // Filter out past slots for today
    const nowTime = new Date().getHours().toString().padStart(2, '0') + ':00';
    const filteredSlots = slots.filter(slot => {
        if (slot.date === today && slot.endTime <= nowTime) return false;
        return true;
    });

    res.json({
        status: 'success',
        data: filteredSlots
    });
});

// @desc    Get all slots (Admin)
// @route   GET /api/slots/admin
// @access  Admin
const getAllSlots = asyncHandler(async (req, res) => {
    await generateSlotsForDays(7);
    const slots = await DeliverySlot.find({}).sort({ date: 1, startTime: 1 });
    res.json({ status: 'success', data: slots });
});

// @desc    Book a slot (increment bookedCount)
// @route   PUT /api/slots/:id/book
// @access  Private
const bookSlot = asyncHandler(async (req, res) => {
    const slot = await DeliverySlot.findById(req.params.id);
    if (!slot) {
        res.status(404);
        throw new Error('Slot not found');
    }
    if (slot.bookedCount >= slot.capacity) {
        res.status(400);
        throw new Error('This delivery slot is fully booked');
    }
    slot.bookedCount += 1;
    await slot.save();
    res.json({ status: 'success', data: slot });
});

// @desc    Release a slot (on order cancel)
// @route   PUT /api/slots/:id/release
// @access  Private
const releaseSlot = asyncHandler(async (req, res) => {
    const slot = await DeliverySlot.findById(req.params.id);
    if (slot && slot.bookedCount > 0) {
        slot.bookedCount -= 1;
        await slot.save();
    }
    res.json({ status: 'success', message: 'Slot released' });
});

// @desc    Update slot capacity (Admin)
// @route   PUT /api/slots/:id
// @access  Admin
const updateSlot = asyncHandler(async (req, res) => {
    const { capacity, isActive } = req.body;
    const slot = await DeliverySlot.findByIdAndUpdate(
        req.params.id,
        { capacity, isActive },
        { new: true }
    );
    res.json({ status: 'success', data: slot });
});

module.exports = { getAvailableSlots, getAllSlots, bookSlot, releaseSlot, updateSlot };
