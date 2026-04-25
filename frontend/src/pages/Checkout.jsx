import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import {
    placeOrder,
    getDeliverySlots,
    getWallet,
    getMySubscription,
    createRazorpayOrder,
    verifyRazorpayPayment,
    checkPincodeServiceability,
    lookupPincode,
} from '../services/api';
import { branding } from '../config/branding';
import {
    FiClock, FiCreditCard, FiTruck, FiMapPin, FiShield,
    FiCheck, FiAlertCircle, FiLoader, FiNavigation, FiPackage,
    FiChevronRight, FiInfo
} from 'react-icons/fi';

// ─── Razorpay script loader ───────────────────────────────────────
const loadRazorpayScript = () =>
    new Promise((resolve) => {
        if (document.getElementById('razorpay-script')) return resolve(true);
        const s = document.createElement('script');
        s.id = 'razorpay-script';
        s.src = 'https://checkout.razorpay.com/v1/checkout.js';
        s.onload = () => resolve(true);
        s.onerror = () => resolve(false);
        document.body.appendChild(s);
    });

// ─── Validation helpers ───────────────────────────────────────────
const STREET_MIN = 10;
const PINCODE_REGEX = /^\d{6}$/;
const CITY_REGEX = /^[a-zA-Z\s\-']{2,50}$/;

const validateAddress = (addr) => {
    const errors = {};
    if (!addr.street || addr.street.trim().length < STREET_MIN)
        errors.street = `Address too short — minimum ${STREET_MIN} characters`;
    if (!addr.pincode || !PINCODE_REGEX.test(addr.pincode))
        errors.pincode = 'Invalid Pincode — must be exactly 6 digits';
    if (!addr.city || !CITY_REGEX.test(addr.city.trim()))
        errors.city = 'Enter valid city name';
    if (!addr.state || addr.state.trim().length < 2)
        errors.state = 'State is required';
    return errors;
};

// ─── Step indicator component ─────────────────────────────────────
const StepBadge = ({ num, label, active, done }) => (
    <div className={`flex items-center gap-2 ${active || done ? 'opacity-100' : 'opacity-40'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
            done ? 'bg-green-500 text-white' : active ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-500'
        }`}>
            {done ? <FiCheck size={14} /> : num}
        </div>
        <span className={`text-sm font-semibold hidden sm:block ${active ? 'text-gray-900' : 'text-gray-500'}`}>{label}</span>
    </div>
);

// ─── Field wrapper ────────────────────────────────────────────────
const Field = ({ label, error, children, hint }) => (
    <div>
        <label className="block text-sm font-bold text-gray-700 mb-1.5">{label}</label>
        {children}
        {error && (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-red-600">
                <FiAlertCircle size={12} /> {error}
            </p>
        )}
        {!error && hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
);

// ─── Main component ───────────────────────────────────────────────
const Checkout = () => {
    const { cart, clearCartState } = useCart();
    const navigate = useNavigate();
    const location = useLocation();

    const discount = location.state?.discount || 0;
    const couponId = location.state?.coupon?._id || undefined;
    const couponObj = location.state?.coupon;

    // ── Address state ──────────────────────────────────────────────
    const [addr, setAddr] = useState({
        street: '', city: '', state: '', pincode: '',
        lat: null, lng: null,
    });
    const [addrErrors, setAddrErrors] = useState({});
    const [touched, setTouched] = useState({});

    // ── Pincode validation state ───────────────────────────────────
    const [pincodeLoading, setPincodeLoading] = useState(false);
    const [pincodeValid, setPincodeValid] = useState(null); // null=untested, true, false
    const [pincodeServiceable, setPincodeServiceable] = useState(null);
    const pincodeDebounceRef = useRef(null);

    // ── GPS state ──────────────────────────────────────────────────
    const [gpsLoading, setGpsLoading] = useState(false);
    const [gpsError, setGpsError] = useState('');

    // ── Payment state ──────────────────────────────────────────────
    const [slots, setSlots] = useState([]);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [walletBal, setWalletBal] = useState(0);
    const [useWallet, setUseWallet] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('Razorpay');
    const [isSubscribed, setIsSubscribed] = useState(false);

    // ── UI state ───────────────────────────────────────────────────
    const [loading, setLoading] = useState(false);
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [step, setStep] = useState(1); // 1=address, 2=slot+payment, 3=done
    const [globalError, setGlobalError] = useState('');
    const [successOrder, setSuccessOrder] = useState(null);

    // ─────────────────────────────────────────────────────────────
    // Boot: redirect if cart empty, load slots / wallet / subscription
    // ─────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!cart || cart.items.length === 0) {
            navigate('/cart');
            return;
        }
        const fetchData = async () => {
            try {
                const [slotRes, walletRes, subRes] = await Promise.all([
                    getDeliverySlots(),
                    getWallet().catch(() => ({ data: { balance: 0 } })),
                    getMySubscription().catch(() => ({ data: null })),
                ]);
                setSlots(slotRes.data);
                setWalletBal(walletRes.data.balance || 0);
                const sub = subRes.data;
                setIsSubscribed(sub && sub.status === 'active' && new Date(sub.endDate) > new Date());
                if (slotRes.data.length > 0) setSelectedSlot(slotRes.data[0]._id);
            } catch { /* silent */ }
        };
        fetchData();
    }, [cart, navigate]);

    if (!cart) return null;

    // ─── Price calculations ────────────────────────────────────────
    const subTotal = cart.totalPrice;
    const freeDelThreshold = 500;
    const shippingPrice = (isSubscribed || subTotal >= freeDelThreshold) ? 0 : 20;
    const finalTotalBeforeWallet = Math.max(0, subTotal - discount + shippingPrice);
    let walletAmountUsed = 0;
    let amountToPay = finalTotalBeforeWallet;
    if (useWallet && walletBal > 0) {
        if (walletBal >= finalTotalBeforeWallet) { walletAmountUsed = finalTotalBeforeWallet; amountToPay = 0; }
        else { walletAmountUsed = walletBal; amountToPay = finalTotalBeforeWallet - walletBal; }
    }

    // ─── Pincode debounce lookup ───────────────────────────────────
    const handlePincodeChange = (val) => {
        setAddr(a => ({ ...a, pincode: val, city: '', state: '' }));
        setPincodeValid(null);
        setPincodeServiceable(null);
        if (pincodeDebounceRef.current) clearTimeout(pincodeDebounceRef.current);
        if (!PINCODE_REGEX.test(val)) return;
        pincodeDebounceRef.current = setTimeout(() => lookupAndValidate(val), 700);
    };

    const lookupAndValidate = async (pin) => {
        setPincodeLoading(true);
        try {
            const [postRes, svcRes] = await Promise.allSettled([
                lookupPincode(pin),
                checkPincodeServiceability(pin),
            ]);

            // India Post API
            if (postRes.status === 'fulfilled') {
                const json = postRes.value;
                if (json?.[0]?.Status === 'Success' && json[0].PostOffice?.length > 0) {
                    const po = json[0].PostOffice[0];
                    setAddr(a => ({
                        ...a,
                        city: a.city || po.District || po.Name || '',
                        state: po.State || '',
                    }));
                    setPincodeValid(true);
                } else {
                    setPincodeValid(false);
                }
            }

            // Serviceability check
            if (svcRes.status === 'fulfilled') {
                setPincodeServiceable(svcRes.value.serviceable);
            }
        } catch {
            setPincodeValid(false);
        } finally {
            setPincodeLoading(false);
        }
    };

    // ─── GPS location ──────────────────────────────────────────────
    const handleUseLocation = () => {
        if (!navigator.geolocation) { setGpsError('Geolocation not supported by your browser'); return; }
        setGpsLoading(true);
        setGpsError('');
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude, longitude } = pos.coords;
                try {
                    const res = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
                    );
                    const d = await res.json();
                    const addr2 = d.address || {};
                    const pin = addr2.postcode?.replace(/\s/g, '').substring(0, 6) || '';
                    setAddr({
                        street: [addr2.road, addr2.neighbourhood, addr2.suburb].filter(Boolean).join(', '),
                        city: addr2.city || addr2.town || addr2.village || addr2.county || '',
                        state: addr2.state || '',
                        pincode: pin,
                        lat: latitude,
                        lng: longitude,
                    });
                    if (PINCODE_REGEX.test(pin)) lookupAndValidate(pin);
                } catch {
                    setGpsError('Could not fetch address. Please fill manually.');
                } finally {
                    setGpsLoading(false);
                }
            },
            (err) => {
                setGpsLoading(false);
                setGpsError(err.code === 1 ? 'Location permission denied' : 'Unable to get location');
            },
            { timeout: 10000, maximumAge: 60000 }
        );
    };

    // ─── Address form validation ───────────────────────────────────
    const validateAndProceed = () => {
        const errors = validateAddress(addr);
        setAddrErrors(errors);
        setTouched({ street: true, city: true, state: true, pincode: true });
        if (Object.keys(errors).length > 0) return;
        if (pincodeServiceable === false) {
            setAddrErrors(e => ({ ...e, pincode: 'Sorry, we do not deliver to this location yet' }));
            return;
        }
        setStep(2);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // ─── Place order + Razorpay payment ───────────────────────────
    const handlePayment = async () => {
        if (!selectedSlot) { setGlobalError('Please select a delivery slot'); return; }
        setGlobalError('');
        setPaymentLoading(true);

        try {
            const orderItems = cart.items.filter(i => i.product).map(i => ({
                product: i.product._id,
                name: i.product.name,
                image: i.product.image,
                price: i.price,
                quantity: i.quantity,
            }));

            const orderData = {
                orderItems,
                shippingAddress: {
                    address: addr.street,
                    city: addr.city,
                    postalCode: addr.pincode,
                    country: 'India',
                    state: addr.state,
                    lat: addr.lat || 0,
                    lng: addr.lng || 0,
                },
                paymentMethod: amountToPay === 0 ? 'Wallet' : paymentMethod,
                itemsPrice: subTotal,
                taxPrice: 0,
                shippingPrice,
                totalPrice: finalTotalBeforeWallet,
                couponId,
                couponDiscount: discount,
                walletAmountUsed,
                deliverySlotId: selectedSlot,
            };

            // ── Wallet covers full amount → skip Razorpay ──────────
            if (amountToPay === 0 || paymentMethod === 'Cash On Delivery') {
                const created = await placeOrder(orderData);
                clearCartState();
                setSuccessOrder(created.data);
                setStep(3);
                setPaymentLoading(false);
                return;
            }

            // ── Step 1: Create order in DB (pending payment) ───────
            const created = await placeOrder({ ...orderData, paymentStatus: 'pending' });
            const internalOrder = created.data;

            // ── Step 2: Create Razorpay order ──────────────────────
            const sdkLoaded = await loadRazorpayScript();
            if (!sdkLoaded) throw new Error('Failed to load Razorpay. Check your internet connection.');

            const rzpOrderRes = await createRazorpayOrder(amountToPay, {
                orderId: internalOrder._id,
            });

            // ── Step 3: Open Razorpay checkout ─────────────────────
            const userInfoRaw = localStorage.getItem('userInfo');
            const userInfo = userInfoRaw ? JSON.parse(userInfoRaw)?.data : {};

            await new Promise((resolve, reject) => {
                const options = {
                    key: rzpOrderRes.key,
                    amount: rzpOrderRes.amount,
                    currency: rzpOrderRes.currency,
                    name: branding.appName || '10Min Grocery',
                    description: `Order #${internalOrder._id}`,
                    image: '/logo192.png',
                    order_id: rzpOrderRes.orderId,
                    prefill: {
                        name: userInfo?.name || '',
                        email: userInfo?.email || '',
                        contact: userInfo?.phone || '',
                    },
                    theme: { color: '#111827' },
                    handler: async (response) => {
                        try {
                            // ── Step 4: Verify signature ───────────
                            await verifyRazorpayPayment({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                internalOrderId: internalOrder._id,
                            });
                            clearCartState();
                            setSuccessOrder(internalOrder);
                            setStep(3);
                            resolve();
                        } catch (err) {
                            reject(new Error(err.response?.data?.message || 'Payment verification failed'));
                        }
                    },
                    modal: {
                        ondismiss: () => reject(new Error('Payment cancelled by user')),
                    },
                };
                const rzp = new window.Razorpay(options);
                rzp.on('payment.failed', (resp) => {
                    reject(new Error(resp.error?.description || 'Payment failed'));
                });
                rzp.open();
            });
        } catch (err) {
            setGlobalError(err.message || 'Payment failed. Please try again.');
        } finally {
            setPaymentLoading(false);
        }
    };

    // ─── Blur handler for inline validation ───────────────────────
    const handleBlur = (field) => {
        setTouched(t => ({ ...t, [field]: true }));
        const errs = validateAddress(addr);
        setAddrErrors(errs);
    };

    const inputCls = (field) =>
        `w-full px-4 py-3 border-2 rounded-xl bg-white text-gray-900 focus:outline-none transition-all text-sm ${
            touched[field] && addrErrors[field]
                ? 'border-red-400 focus:border-red-500 bg-red-50'
                : touched[field] && !addrErrors[field]
                ? 'border-green-400 focus:border-green-500'
                : 'border-gray-200 focus:border-gray-800'
        }`;

    // ─── Form is valid flag ────────────────────────────────────────
    const addressValid =
        Object.keys(validateAddress(addr)).length === 0 &&
        pincodeServiceable !== false &&
        pincodeValid !== false;

    // ─────────────────────────────────────────────────────────────
    // ── SUCCESS SCREEN ───────────────────────────────────────────
    // ─────────────────────────────────────────────────────────────
    if (step === 3 && successOrder) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center">
                    <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                        <FiCheck className="text-green-600" size={44} />
                    </div>
                    <h1 className="text-3xl font-black text-gray-900 mb-2">Order Placed! 🎉</h1>
                    <p className="text-gray-500 mb-6">
                        Your order has been confirmed and will be delivered soon.
                    </p>
                    <div className="bg-gray-50 rounded-2xl p-5 mb-8 text-left space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500 font-medium">Order ID</span>
                            <span className="font-bold text-gray-800 font-mono text-xs">#{successOrder._id?.slice(-8).toUpperCase()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500 font-medium">Amount Paid</span>
                            <span className="font-bold text-green-600">₹{finalTotalBeforeWallet.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500 font-medium">Deliver to</span>
                            <span className="font-bold text-gray-800 text-right max-w-[55%]">{addr.street}, {addr.city}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500 font-medium">Status</span>
                            <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded-full">Order Placed</span>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => navigate('/orders')}
                            className="flex-1 bg-gray-900 text-white font-bold py-3.5 rounded-xl hover:bg-black transition-all"
                        >
                            Track Order
                        </button>
                        <button
                            onClick={() => navigate('/')}
                            className="flex-1 border-2 border-gray-200 text-gray-700 font-bold py-3.5 rounded-xl hover:border-gray-400 transition-all"
                        >
                            Shop More
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────
    // ── MAIN CHECKOUT UI ─────────────────────────────────────────
    // ─────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gray-50">
            {/* ── Hero header ── */}
            <div className="bg-gray-900 text-white py-8 px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
                        <span onClick={() => navigate('/cart')} className="cursor-pointer hover:text-white transition">Cart</span>
                        <FiChevronRight size={14} />
                        <span className="text-white font-semibold">Checkout</span>
                    </div>
                    <h1 className="text-3xl font-black tracking-tight mb-5">Secure Checkout</h1>
                    {/* Step indicators */}
                    <div className="flex items-center gap-4">
                        <StepBadge num={1} label="Delivery Address" active={step === 1} done={step > 1} />
                        <div className="flex-1 h-px bg-gray-700" />
                        <StepBadge num={2} label="Slot & Payment" active={step === 2} done={step > 2} />
                        <div className="flex-1 h-px bg-gray-700" />
                        <StepBadge num={3} label="Confirmation" active={step === 3} done={false} />
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {globalError && (
                    <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl mb-6 text-sm font-semibold">
                        <FiAlertCircle size={18} className="shrink-0" />
                        {globalError}
                    </div>
                )}

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* ── Left column ── */}
                    <div className="lg:w-2/3 space-y-6">

                        {/* ═══ STEP 1 — ADDRESS ═══════════════════════════════════ */}
                        {step === 1 && (
                            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="bg-gradient-to-r from-gray-900 to-gray-700 px-8 py-5 flex items-center justify-between">
                                    <div className="flex items-center gap-3 text-white">
                                        <FiMapPin size={20} />
                                        <h2 className="text-lg font-bold">Delivery Address</h2>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleUseLocation}
                                        disabled={gpsLoading}
                                        className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all border border-white/20 disabled:opacity-60"
                                    >
                                        {gpsLoading
                                            ? <><FiLoader size={14} className="animate-spin" /> Locating...</>
                                            : <><FiNavigation size={14} /> Use My Location</>
                                        }
                                    </button>
                                </div>

                                <div className="p-8 space-y-5">
                                    {gpsError && (
                                        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-sm p-3 rounded-xl font-medium">
                                            <FiInfo size={15} /> {gpsError}
                                        </div>
                                    )}

                                    {/* Street */}
                                    <Field
                                        label="Street Address *"
                                        error={touched.street && addrErrors.street}
                                        hint={`At least ${STREET_MIN} characters — e.g. Flat 4, Wing B, Sunshine Apt, MG Road`}
                                    >
                                        <input
                                            type="text"
                                            value={addr.street}
                                            onChange={e => setAddr(a => ({ ...a, street: e.target.value }))}
                                            onBlur={() => handleBlur('street')}
                                            className={inputCls('street')}
                                            placeholder="Flat No, Wing, Building Name, Street..."
                                        />
                                    </Field>

                                    {/* Pincode + City row */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <Field
                                            label="Pincode *"
                                            error={
                                                (touched.pincode && addrErrors.pincode) ||
                                                (pincodeValid === false && '❌ Invalid Pincode') ||
                                                (pincodeServiceable === false && '⚠️ Sorry, we do not deliver to this location yet')
                                            }
                                        >
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    maxLength={6}
                                                    value={addr.pincode}
                                                    onChange={e => {
                                                        const v = e.target.value.replace(/\D/g, '').slice(0, 6);
                                                        handlePincodeChange(v);
                                                    }}
                                                    onBlur={() => handleBlur('pincode')}
                                                    className={`${inputCls('pincode')} pr-10`}
                                                    placeholder="e.g. 400001"
                                                />
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                    {pincodeLoading && <FiLoader size={16} className="animate-spin text-gray-400" />}
                                                    {!pincodeLoading && pincodeValid === true && pincodeServiceable === true && (
                                                        <FiCheck size={16} className="text-green-500" />
                                                    )}
                                                    {!pincodeLoading && (pincodeValid === false || pincodeServiceable === false) && (
                                                        <FiAlertCircle size={16} className="text-red-500" />
                                                    )}
                                                </div>
                                            </div>
                                            {pincodeValid === true && pincodeServiceable === true && (
                                                <p className="mt-1 text-xs text-green-600 font-semibold flex items-center gap-1">
                                                    <FiCheck size={11} /> Delivery available to this pincode
                                                </p>
                                            )}
                                        </Field>

                                        <Field
                                            label="City *"
                                            error={touched.city && addrErrors.city}
                                            hint="Auto-filled from pincode"
                                        >
                                            <input
                                                type="text"
                                                value={addr.city}
                                                onChange={e => setAddr(a => ({ ...a, city: e.target.value }))}
                                                onBlur={() => handleBlur('city')}
                                                className={inputCls('city')}
                                                placeholder="City / District"
                                            />
                                        </Field>
                                    </div>

                                    {/* State */}
                                    <Field label="State *" error={touched.state && addrErrors.state}>
                                        <input
                                            type="text"
                                            value={addr.state}
                                            onChange={e => setAddr(a => ({ ...a, state: e.target.value }))}
                                            onBlur={() => handleBlur('state')}
                                            className={inputCls('state')}
                                            placeholder="State — auto-filled from pincode"
                                        />
                                    </Field>

                                    {/* Map preview using Leaflet embed via iframe */}
                                    {addr.lat && addr.lng && (
                                        <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
                                            <div className="bg-gray-50 px-4 py-2 text-xs font-bold text-gray-500 flex items-center gap-1.5">
                                                <FiMapPin size={11} /> Location Preview
                                            </div>
                                            <iframe
                                                title="map-preview"
                                                width="100%"
                                                height="180"
                                                style={{ border: 0 }}
                                                src={`https://www.openstreetmap.org/export/embed.html?bbox=${addr.lng - 0.01},${addr.lat - 0.01},${addr.lng + 0.01},${addr.lat + 0.01}&layer=mapnik&marker=${addr.lat},${addr.lng}`}
                                            />
                                        </div>
                                    )}

                                    <button
                                        type="button"
                                        onClick={validateAndProceed}
                                        className="w-full bg-gray-900 hover:bg-black text-white font-bold h-14 rounded-xl transition-all text-base flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                                    >
                                        Continue to Payment <FiChevronRight size={18} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ═══ STEP 2 — SLOT + PAYMENT ════════════════════════════ */}
                        {step === 2 && (
                            <>
                                {/* Saved address summary */}
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center">
                                            <FiCheck className="text-green-600" size={16} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">{addr.street}</p>
                                            <p className="text-xs text-gray-500">{addr.city}, {addr.state} — {addr.pincode}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setStep(1)} className="text-xs font-bold text-gray-500 hover:text-gray-900 underline">Change</button>
                                </div>

                                {/* Delivery Slots */}
                                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                                    <div className="bg-gradient-to-r from-gray-900 to-gray-700 px-8 py-5 flex items-center gap-3 text-white">
                                        <FiClock size={20} />
                                        <h2 className="text-lg font-bold">Choose Delivery Slot</h2>
                                    </div>
                                    <div className="p-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {slots.map(slot => {
                                            const isFull = slot.bookedCount >= slot.capacity;
                                            const isSelected = selectedSlot === slot._id;
                                            return (
                                                <div
                                                    key={slot._id}
                                                    onClick={() => !isFull && setSelectedSlot(slot._id)}
                                                    className={`border-2 rounded-2xl p-4 cursor-pointer transition-all select-none ${
                                                        isFull
                                                            ? 'bg-gray-50 border-gray-100 opacity-50 cursor-not-allowed'
                                                            : isSelected
                                                            ? 'border-gray-900 bg-gray-900 text-white shadow-lg -translate-y-0.5'
                                                            : 'border-gray-200 hover:border-gray-400 hover:-translate-y-0.5'
                                                    }`}
                                                >
                                                    <p className={`font-bold text-sm mb-1 ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                                                        {slot.label?.split(' ').slice(0, 2).join(' ')}
                                                    </p>
                                                    <p className={`text-xs ${isSelected ? 'text-gray-300' : 'text-gray-500'}`}>
                                                        {slot.label?.split(' ').slice(2).join(' ')}
                                                    </p>
                                                    {isFull && <p className="text-xs text-red-500 font-bold mt-2">FULL</p>}
                                                    {isSelected && <FiCheck size={13} className="mt-2 text-green-400" />}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Payment */}
                                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                                    <div className="bg-gradient-to-r from-gray-900 to-gray-700 px-8 py-5 flex items-center gap-3 text-white">
                                        <FiCreditCard size={20} />
                                        <h2 className="text-lg font-bold">Payment Method</h2>
                                    </div>
                                    <div className="p-6 space-y-4">
                                        {/* Wallet toggle */}
                                        {walletBal > 0 && (
                                            <div className="p-4 border-2 border-emerald-200 bg-emerald-50 rounded-2xl flex items-center justify-between">
                                                <div>
                                                    <p className="font-bold text-emerald-900 text-sm">{branding.appName} Wallet</p>
                                                    <p className="text-xs text-emerald-700 font-medium mt-0.5">Available: ₹{walletBal.toFixed(2)}</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setUseWallet(!useWallet)}
                                                    className={`relative w-14 h-7 rounded-full transition-colors ${useWallet ? 'bg-emerald-500' : 'bg-gray-300'}`}
                                                >
                                                    <div className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${useWallet ? 'translate-x-7' : ''}`} />
                                                </button>
                                            </div>
                                        )}

                                        {amountToPay > 0 && (
                                            <div className="space-y-3">
                                                {/* Razorpay option */}
                                                <label className={`flex items-center gap-4 border-2 rounded-2xl p-4 cursor-pointer transition-all ${paymentMethod === 'Razorpay' ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-300'}`}>
                                                    <input
                                                        type="radio" name="pm" value="Razorpay"
                                                        checked={paymentMethod === 'Razorpay'}
                                                        onChange={e => setPaymentMethod(e.target.value)}
                                                        className="w-4 h-4 accent-gray-900"
                                                    />
                                                    <div className="flex-1">
                                                        <p className="font-bold text-gray-900 text-sm">Pay Online</p>
                                                        <p className="text-xs text-gray-500 mt-0.5">UPI, Cards, Net Banking, Wallets via Razorpay</p>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        {['UPI', 'CARD', 'NB'].map(m => (
                                                            <span key={m} className="text-[9px] font-bold bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">{m}</span>
                                                        ))}
                                                    </div>
                                                </label>

                                                {/* COD option */}
                                                <label className={`flex items-center gap-4 border-2 rounded-2xl p-4 cursor-pointer transition-all ${paymentMethod === 'Cash On Delivery' ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-300'}`}>
                                                    <input
                                                        type="radio" name="pm" value="Cash On Delivery"
                                                        checked={paymentMethod === 'Cash On Delivery'}
                                                        onChange={e => setPaymentMethod(e.target.value)}
                                                        className="w-4 h-4 accent-gray-900"
                                                    />
                                                    <div>
                                                        <p className="font-bold text-gray-900 text-sm">Cash on Delivery</p>
                                                        <p className="text-xs text-gray-500 mt-0.5">Pay with cash when your order arrives</p>
                                                    </div>
                                                </label>
                                            </div>
                                        )}

                                        {/* Security badge */}
                                        <div className="flex items-center gap-2 text-xs text-gray-400 pt-2">
                                            <FiShield size={13} /> All payments are encrypted and secure
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* ── Right column — Order Summary ── */}
                    <div className="lg:w-1/3">
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 sticky top-24 overflow-hidden">
                            {/* Header */}
                            <div className="px-7 py-5 border-b border-gray-100">
                                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <FiPackage size={18} className="text-gray-500" /> Order Summary
                                </h2>
                            </div>

                            {/* Items */}
                            <div className="px-7 py-4 space-y-3 max-h-48 overflow-y-auto">
                                {cart.items.filter(i => i.product).map(i => (
                                    <div key={i.product._id} className="flex items-center gap-3">
                                        <img
                                            src={i.product.image}
                                            alt={i.product.name}
                                            className="w-10 h-10 rounded-xl object-cover bg-gray-100"
                                            onError={e => { e.target.src = '/placeholder.png'; }}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-gray-900 truncate">{i.product.name}</p>
                                            <p className="text-xs text-gray-400">x{i.quantity}</p>
                                        </div>
                                        <span className="text-xs font-bold text-gray-900">₹{(i.price * i.quantity).toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Price breakdown */}
                            <div className="px-7 py-4 border-t border-gray-100 space-y-3 text-sm">
                                <div className="flex justify-between text-gray-600">
                                    <span>Cart Total</span>
                                    <span className="font-semibold text-gray-900">₹{subTotal.toFixed(2)}</span>
                                </div>
                                {discount > 0 && (
                                    <div className="flex justify-between text-green-600">
                                        <span>Coupon ({couponObj?.code})</span>
                                        <span className="font-semibold">-₹{discount.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-gray-600">
                                    <span>Delivery Fee</span>
                                    <span className={`font-semibold ${shippingPrice === 0 ? 'text-green-600' : 'text-gray-900'}`}>
                                        {isSubscribed ? <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-bold">Premium Free</span> : shippingPrice === 0 ? 'FREE' : `₹${shippingPrice}`}
                                    </span>
                                </div>
                                {walletAmountUsed > 0 && (
                                    <div className="flex justify-between text-blue-600">
                                        <span>Wallet Paid</span>
                                        <span className="font-semibold">-₹{walletAmountUsed.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                                    <span className="font-bold text-gray-900">Amount Due</span>
                                    <span className="text-2xl font-black text-gray-900">₹{amountToPay.toFixed(2)}</span>
                                </div>
                            </div>

                            {/* CTA */}
                            <div className="px-7 pb-7">
                                {step === 1 ? (
                                    <button
                                        type="button"
                                        onClick={validateAndProceed}
                                        className="w-full bg-gray-900 hover:bg-black text-white font-bold h-14 rounded-xl transition-all text-base shadow-lg"
                                    >
                                        Continue →
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handlePayment}
                                        disabled={paymentLoading || !selectedSlot}
                                        className={`w-full font-bold h-14 rounded-xl transition-all text-base shadow-lg flex items-center justify-center gap-2 ${
                                            paymentLoading || !selectedSlot
                                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                : 'bg-gray-900 hover:bg-black text-white hover:-translate-y-0.5 hover:shadow-xl'
                                        }`}
                                    >
                                        {paymentLoading ? (
                                            <><FiLoader size={18} className="animate-spin" /> Processing...</>
                                        ) : amountToPay === 0 ? (
                                            <><FiCheck size={18} /> Place Order (Wallet)</>
                                        ) : paymentMethod === 'Cash On Delivery' ? (
                                            <><FiTruck size={18} /> Place Order (COD)</>
                                        ) : (
                                            <><FiCreditCard size={18} /> Pay ₹{amountToPay.toFixed(2)}</>
                                        )}
                                    </button>
                                )}

                                <p className="text-center text-xs text-gray-400 mt-3 flex items-center justify-center gap-1.5">
                                    <FiShield size={11} /> Secured by Razorpay · 256-bit SSL
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Checkout;
