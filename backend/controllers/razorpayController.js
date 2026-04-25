const asyncHandler = require('express-async-handler');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const Order = require('../models/Order');

// ─── Razorpay instance ────────────────────────────────────────────
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ─── Serviceable Pincodes (India) ────────────────────────────────
// Extend this list as you expand delivery areas
const SERVICEABLE_PINCODES = new Set([
    // Mumbai
    '400001','400002','400003','400004','400005','400006','400007','400008','400009','400010',
    '400011','400012','400013','400014','400015','400016','400017','400018','400019','400020',
    '400021','400022','400023','400024','400025','400026','400027','400028','400029','400030',
    '400031','400032','400033','400034','400035','400036','400037','400038','400039','400040',
    '400041','400042','400043','400044','400045','400046','400047','400048','400049','400050',
    '400051','400052','400053','400054','400055','400056','400057','400058','400059','400060',
    '400061','400062','400063','400064','400065','400066','400067','400068','400069','400070',
    '400071','400072','400073','400074','400075','400076','400077','400078','400079','400080',
    '400081','400082','400083','400084','400085','400086','400087','400088','400089','400090',
    '400091','400092','400093','400094','400095','400096','400097','400098','400099','400100',
    '400101','400102','400103','400104','400105','400706','400601','400602','400603','400604',
    // Thane
    '400601','400602','400603','400604','400605','400606','400607','400608','400609','400610',
    '400611','400612','400613','400614','400615','400616','400617','400618','400619','400620',
    // Pune
    '411001','411002','411003','411004','411005','411006','411007','411008','411009','411010',
    '411011','411012','411013','411014','411015','411016','411017','411018','411019','411020',
    '411021','411022','411023','411024','411025','411026','411027','411028','411029','411030',
    '411031','411032','411033','411034','411035','411036','411037','411038','411039','411040',
    '411041','411042','411043','411044','411045','411046','411047','411048','411057','411058',
    '411060','411061','411062','411066','411067','411068','411069','411076','411078',
    // Nashik
    '422001','422002','422003','422004','422005','422006','422007','422008','422009','422010',
    // Nagpur
    '440001','440002','440003','440004','440005','440006','440007','440008','440009','440010',
    // Delhi
    '110001','110002','110003','110004','110005','110006','110007','110008','110009','110010',
    '110011','110012','110013','110014','110015','110016','110017','110018','110019','110020',
    '110021','110022','110023','110024','110025','110026','110027','110028','110029','110030',
    '110031','110032','110033','110034','110035','110036','110037','110038','110039','110040',
    '110041','110042','110043','110044','110045','110046','110047','110048','110049','110050',
    '110051','110052','110053','110054','110055','110056','110057','110058','110059','110060',
    '110061','110062','110063','110064','110065','110066','110067','110068','110069','110070',
    '110071','110072','110073','110074','110075','110076','110077','110078','110079','110080',
    '110081','110082','110083','110084','110085','110086','110087','110088','110089','110090',
    '110091','110092','110093','110094','110095','110096','110097',
    // Bangalore
    '560001','560002','560003','560004','560005','560006','560007','560008','560009','560010',
    '560011','560012','560013','560014','560015','560016','560017','560018','560019','560020',
    '560021','560022','560023','560024','560025','560026','560027','560028','560029','560030',
    '560031','560032','560034','560035','560036','560037','560038','560040','560041','560042',
    '560043','560045','560046','560047','560048','560049','560050','560051','560052','560053',
    '560054','560055','560056','560057','560058','560059','560060','560061','560062','560063',
    '560064','560065','560066','560067','560068','560069','560070','560071','560072','560073',
    '560074','560075','560076','560077','560078','560079','560080','560081','560082','560083',
    '560085','560086','560087','560088','560089','560090','560091','560092','560093','560094',
    '560095','560096','560097','560098','560099','560100','560102','560103','560105',
    // Hyderabad
    '500001','500002','500003','500004','500005','500006','500007','500008','500009','500010',
    '500011','500012','500013','500014','500015','500016','500017','500018','500019','500020',
    // Chennai
    '600001','600002','600003','600004','600005','600006','600007','600008','600009','600010',
    '600011','600012','600013','600014','600015','600016','600017','600018','600019','600020',
]);

// ─── @desc    Check if pincode is serviceable ─────────────────────
// @route   GET /api/razorpay/check-pincode/:pincode
// @access  Private
const checkPincode = asyncHandler(async (req, res) => {
    const { pincode } = req.params;
    if (!pincode || !/^\d{6}$/.test(pincode)) {
        return res.status(400).json({ serviceable: false, message: 'Invalid pincode format' });
    }
    const serviceable = SERVICEABLE_PINCODES.has(pincode);
    res.json({ serviceable, pincode });
});

// ─── @desc    Create Razorpay Order ──────────────────────────────
// @route   POST /api/razorpay/create-order
// @access  Private
const createRazorpayOrder = asyncHandler(async (req, res) => {
    const { amount, currency = 'INR', notes = {} } = req.body;

    if (!amount || amount <= 0) {
        res.status(400);
        throw new Error('Invalid amount');
    }

    // Razorpay expects amount in paise (multiply by 100)
    const options = {
        amount: Math.round(amount * 100),
        currency,
        receipt: `receipt_${Date.now()}`,
        notes: {
            userId: req.user._id.toString(),
            ...notes,
        },
    };

    const razorpayOrder = await razorpay.orders.create(options);

    res.status(201).json({
        success: true,
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        key: process.env.RAZORPAY_KEY_ID,
    });
});

// ─── @desc    Verify Razorpay Payment Signature ───────────────────
// @route   POST /api/razorpay/verify-payment
// @access  Private
const verifyRazorpayPayment = asyncHandler(async (req, res) => {
    const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        internalOrderId, // our MongoDB order _id
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        res.status(400);
        throw new Error('Missing payment verification fields');
    }

    // Signature check
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body)
        .digest('hex');

    if (expectedSignature !== razorpay_signature) {
        res.status(400);
        throw new Error('Payment signature verification failed');
    }

    // Update the order in DB
    if (internalOrderId) {
        const order = await Order.findById(internalOrderId);
        if (order) {
            order.isPaid = true;
            order.paidAt = Date.now();
            order.paymentMethod = 'Razorpay';
            order.paymentStatus = 'paid';
            order.paymentResult = {
                id: razorpay_payment_id,
                status: 'captured',
                update_time: new Date().toISOString(),
                razorpay_order_id,
                razorpay_signature,
            };
            await order.save();
        }
    }

    res.json({ success: true, paymentId: razorpay_payment_id });
});

module.exports = { createRazorpayOrder, verifyRazorpayPayment, checkPincode };
