import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    getRiderAssignedOrders, updateOrderStatusByRider,
    updateRiderAvailability, updateRiderLocation,
    getRiderEarnings, getRiderProfile,
    acceptAssignment, rejectAssignment
} from '../services/api';
import {
    FiTruck, FiLogOut, FiMapPin, FiCheckCircle, FiClock,
    FiDollarSign, FiToggleLeft, FiToggleRight, FiUser,
    FiStar, FiPackage, FiNavigation, FiActivity, FiAlertTriangle,
    FiWifi, FiZap, FiCrosshair,
} from 'react-icons/fi';
import { io } from 'socket.io-client';

/* ── Order status flow ───────────────────────────────────────────── */
const STATUS_FLOW = {
    'Rider Assigned':   { next: 'Picked Up',        label: 'Mark Picked Up',      color: 'bg-purple-500 hover:bg-purple-600' },
    'Picked Up':        { next: 'In Transit',        label: 'Start Delivery',      color: 'bg-blue-500 hover:bg-blue-600' },
    'In Transit':       { next: 'Out for Delivery',  label: 'Out for Delivery',    color: 'bg-indigo-500 hover:bg-indigo-600' },
    'Out for Delivery': { next: 'Delivered',         label: 'Confirm Delivered ✓', color: 'bg-green-500 hover:bg-green-600' },
};

const STATUS_BADGE = {
    'Rider Assigned':   'bg-blue-100 text-blue-800',
    'Picked Up':        'bg-purple-100 text-purple-800',
    'In Transit':       'bg-indigo-100 text-indigo-800',
    'Out for Delivery': 'bg-orange-100 text-orange-800',
    'Delivered':        'bg-green-100 text-green-800',
    'Completed':        'bg-gray-100 text-gray-600',
};

/* ── GPS throttle (only send if moved ≥ 15m or 2.5s elapsed) ─────── */
const MIN_DISTANCE_M = 15;
const MAX_INTERVAL_MS = 2500;

const haversineM = (lat1, lng1, lat2, lng2) => {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const getRiderInfo = () => {
    try { return JSON.parse(localStorage.getItem('riderInfo') || 'null'); } catch { return null; }
};

/* ── Speed Behavior Banner ───────────────────────────────────────── */
const SpeedBanner = ({ speedKmh }) => {
    if (speedKmh === null) return null;
    if (speedKmh > 75)
        return (
            <div className="mx-4 mt-3 bg-red-900/20 border border-red-500/30 rounded-2xl px-4 py-3 flex items-center gap-3">
                <FiAlertTriangle className="text-red-400 shrink-0" size={18} />
                <div>
                    <p className="text-sm font-black text-red-300">Unsafe Speed Detected!</p>
                    <p className="text-xs text-red-400/70 mt-0.5">You are going {Math.round(speedKmh)} km/h. Please slow down.</p>
                </div>
            </div>
        );
    if (speedKmh < 1)
        return (
            <div className="mx-4 mt-3 bg-amber-900/20 border border-amber-500/30 rounded-2xl px-4 py-3 flex items-center gap-3">
                <FiClock className="text-amber-400 shrink-0" size={18} />
                <p className="text-sm font-bold text-amber-300">You appear to be stationary</p>
            </div>
        );
    return null;
};

/* ── GPS Status Chip ─────────────────────────────────────────────── */
const GpsChip = ({ gpsActive, accuracy, speedKmh }) => (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
        gpsActive
            ? 'bg-green-900/30 border-green-500/30 text-green-400'
            : 'bg-gray-800 border-gray-700 text-gray-500'
    }`}>
        <FiCrosshair size={12} className={gpsActive ? 'animate-pulse' : ''} />
        {gpsActive ? (
            <>GPS Active {accuracy ? `±${Math.round(accuracy)}m` : ''} · {Math.round(speedKmh ?? 0)} km/h</>
        ) : 'GPS Off'}
    </div>
);

/* ════════════════════════════════════════════════════════════════════
   RiderDashboard
   ════════════════════════════════════════════════════════════════════ */
const RiderDashboard = () => {
    const navigate = useNavigate();
    const [profile, setProfile]           = useState(null);
    const [orders, setOrders]             = useState([]);
    const [earnings, setEarnings]         = useState(null);
    const [loading, setLoading]           = useState(true);
    const [isOnline, setIsOnline]         = useState(false);
    const [tab, setTab]                   = useState('orders');
    const [actionLoading, setActionLoading] = useState(null);
    const [toast, setToast]               = useState(null);

    // GPS state
    const [gpsActive, setGpsActive]       = useState(false);
    const [speedKmh, setSpeedKmh]         = useState(null);
    const [accuracy, setAccuracy]         = useState(null);
    const [heading, setHeading]           = useState(null);

    const socketRef      = useRef(null);
    const watchIdRef     = useRef(null);
    const lastSentRef    = useRef({ lat: null, lng: null, ts: 0 });
    const riderInfo      = getRiderInfo();

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    /* ── Fetch data ────────────────────────────────────────────── */
    const fetchOrders = useCallback(async () => {
        try {
            const res = await getRiderAssignedOrders();
            const list = res?.data || res || [];
            setOrders(Array.isArray(list) ? list : []);
        } catch (e) { console.error(e); }
    }, []);

    /* ── Boot ──────────────────────────────────────────────────── */
    useEffect(() => {
        const info = getRiderInfo();
        if (!info?.token) { navigate('/rider/login'); return; }

        // Socket
        socketRef.current = io('http://127.0.0.1:5000', {
            transports: ['websocket', 'polling'],
            reconnectionAttempts: 5,
        });
        socketRef.current.emit('joinRiderRoom', info._id || info.id);
        socketRef.current.on('orderAssigned', () => {
            showToast('🎉 New order assigned to you!');
            fetchOrders();
        });
        socketRef.current.on('accountStatusChanged', ({ status: s, reason }) => {
            showToast(`Account ${s}. ${reason || ''}`, 'error');
        });

        Promise.all([
            getRiderProfile().catch(() => info),
            getRiderAssignedOrders().catch(() => []),
            getRiderEarnings().catch(() => null),
        ]).then(([prof, ords, earn]) => {
            setProfile(prof?.data || prof || info);
            const orderList = ords?.data || ords || [];
            setOrders(Array.isArray(orderList) ? orderList : []);
            setEarnings(earn?.data || earn);
            const online = prof?.isAvailable || prof?.data?.isAvailable || false;
            setIsOnline(online);
            if (online) startLocationTracking(info);
        }).finally(() => setLoading(false));

        return () => {
            socketRef.current?.disconnect();
            stopLocationTracking();
        };
    }, [navigate, fetchOrders]);

    /* ── Start real GPS watchPosition ──────────────────────────── */
    const startLocationTracking = useCallback((info) => {
        if (!navigator.geolocation) {
            showToast('Geolocation not supported', 'error');
            return;
        }
        setGpsActive(true);

        watchIdRef.current = navigator.geolocation.watchPosition(
            (pos) => {
                const { latitude: lat, longitude: lng, speed, heading: hdg, accuracy: acc } = pos.coords;

                // Validate GPS data
                if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return;

                const kmh = (speed || 0) * 3.6;
                setSpeedKmh(kmh);
                setAccuracy(acc);
                setHeading(hdg);

                // Throttle: only send if moved ≥15m OR 2.5s has passed
                const now = Date.now();
                const last = lastSentRef.current;
                const distMoved = (last.lat !== null)
                    ? haversineM(last.lat, last.lng, lat, lng)
                    : Infinity;
                const timePassed = now - last.ts;

                if (distMoved < MIN_DISTANCE_M && timePassed < MAX_INTERVAL_MS) return;

                lastSentRef.current = { lat, lng, ts: now };

                // Send to backend
                updateRiderLocation(lat, lng, speed || 0, hdg || 0).catch(console.error);

                // Emit to socket for all subscribers
                const riderId = info?._id || info?.id;
                socketRef.current?.emit('updateRiderLocation', {
                    riderId,
                    lat,
                    lng,
                    speed: speed || 0,
                    heading: hdg || 0,
                    accuracy: acc || 0,
                });
            },
            (err) => {
                console.error('[GPS] Error:', err.message);
                setGpsActive(false);
                if (err.code === 1) showToast('GPS permission denied', 'error');
                else showToast('GPS signal lost — retrying', 'error');
            },
            {
                enableHighAccuracy: true,
                maximumAge: 1000,
                timeout: 10000,
            }
        );
    }, []);

    const stopLocationTracking = useCallback(() => {
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
        setGpsActive(false);
        setSpeedKmh(null);
        setAccuracy(null);
    }, []);

    /* ── Toggle Online/Offline ──────────────────────────────────── */
    const handleToggleOnline = async () => {
        const newStatus = !isOnline;
        setActionLoading('toggle');
        try {
            await updateRiderAvailability(newStatus);
            setIsOnline(newStatus);
            if (newStatus) startLocationTracking(riderInfo);
            else stopLocationTracking();
            showToast(newStatus ? '🟢 You are now Online' : '🔴 You are now Offline');
        } catch (e) {
            showToast(e.response?.data?.message || 'Failed to update status', 'error');
        } finally { setActionLoading(null); }
    };

    /* ── Update order status ────────────────────────────────────── */
    const handleUpdateStatus = async (orderId, newStatus) => {
        setActionLoading(orderId);
        try {
            await updateOrderStatusByRider(orderId, newStatus);
            setOrders(os => os.map(o => o._id === orderId ? { ...o, orderStatus: newStatus } : o));
            showToast(`Order marked as ${newStatus}`);
            if (newStatus === 'Delivered') {
                const earn = await getRiderEarnings();
                setEarnings(earn?.data || earn);
            }
        } catch { showToast('Failed to update status', 'error'); }
        finally { setActionLoading(null); }
    };

    const activeOrders = orders.filter(o => !['Delivered', 'Completed', 'Cancelled'].includes(o.orderStatus));
    const completedOrders = orders.filter(o => ['Delivered', 'Completed'].includes(o.orderStatus));

    /* ── Loading Screen ─────────────────────────────────────────── */
    if (loading) return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center">
            <div className="text-center">
                <div className="w-14 h-14 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-400 font-bold">Loading dashboard…</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-950 text-white flex flex-col pb-10">

            {/* ── Toast ─────────────────────────────────────────────── */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-2xl shadow-2xl font-semibold text-sm ${
                    toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'
                } text-white`}>
                    {toast.msg}
                </div>
            )}

            {/* ── Header ────────────────────────────────────────────── */}
            <header className="bg-gray-900 border-b border-gray-800 px-4 md:px-6 py-4 flex items-center justify-between sticky top-0 z-30">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center font-black text-white text-base">
                        {profile?.name?.charAt(0) || 'R'}
                    </div>
                    <div>
                        <p className="font-black text-white text-sm">{profile?.name || 'Rider'}</p>
                        <p className="text-xs text-gray-400">{profile?.vehicleDetails?.vehicleType || 'Delivery Partner'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Online toggle */}
                    <button
                        onClick={handleToggleOnline}
                        disabled={actionLoading === 'toggle'}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                            isOnline
                                ? 'bg-green-500 text-white shadow-lg shadow-green-900/30'
                                : 'bg-gray-800 text-gray-400 border border-gray-700'
                        }`}
                    >
                        {isOnline ? <FiToggleRight size={18} /> : <FiToggleLeft size={18} />}
                        {isOnline ? 'Online' : 'Offline'}
                    </button>
                    <button
                        onClick={() => { localStorage.removeItem('riderInfo'); navigate('/rider/login'); }}
                        className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-900/20 rounded-xl transition-all"
                    >
                        <FiLogOut size={18} />
                    </button>
                </div>
            </header>

            {/* ── GPS + Speed banner ────────────────────────────────── */}
            <div className="px-4 pt-4 flex items-center gap-3 flex-wrap">
                <GpsChip gpsActive={gpsActive} accuracy={accuracy} speedKmh={speedKmh} />
                {isOnline && gpsActive && (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-green-400">
                        <FiWifi size={12} /> Broadcasting location
                    </div>
                )}
            </div>
            <SpeedBanner speedKmh={speedKmh} />

            {/* ── KYC Warning ───────────────────────────────────────── */}
            {profile?.kycStatus && profile.kycStatus !== 'approved' && (
                <div className={`mx-4 mt-4 px-4 py-3 rounded-2xl text-sm font-bold flex items-center gap-3 border ${
                    profile.kycStatus === 'rejected'
                        ? 'bg-red-900/20 text-red-400 border-red-500/30'
                        : 'bg-amber-900/20 text-amber-400 border-amber-500/30'
                }`}>
                    {profile.kycStatus === 'not_submitted' ? '⚠️ Complete KYC to go online' :
                     profile.kycStatus === 'pending' ? '🕐 KYC under review' :
                     '❌ KYC rejected — please resubmit'}
                    {profile.kycStatus === 'not_submitted' && (
                        <Link to="/rider/kyc" className="ml-auto underline font-black text-amber-300">Submit →</Link>
                    )}
                </div>
            )}

            {/* ── Stats Strip ───────────────────────────────────────── */}
            <div className="grid grid-cols-3 gap-3 px-4 pt-4">
                {[
                    { label: 'Today', value: `₹${earnings?.today?.earnings?.toFixed(0) || 0}`, color: 'text-green-400' },
                    { label: 'Deliveries', value: earnings?.today?.deliveries || 0, color: 'text-blue-400' },
                    { label: 'Rating', value: profile?.rating?.toFixed(1) || '—', color: 'text-yellow-400' },
                ].map(s => (
                    <div key={s.label} className="bg-gray-900 rounded-2xl border border-gray-800 p-4 text-center">
                        <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                        <p className="text-xs text-gray-500 font-medium mt-0.5">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* ── Tab Bar ───────────────────────────────────────────── */}
            <div className="flex gap-1 mx-4 mt-4 p-1 bg-gray-900 rounded-2xl border border-gray-800">
                {[
                    { id: 'orders',   label: `Active (${activeOrders.length})`,   icon: <FiPackage size={14} /> },
                    { id: 'history',  label: `Done (${completedOrders.length})`,  icon: <FiCheckCircle size={14} /> },
                    { id: 'earnings', label: 'Earnings',                            icon: <FiDollarSign size={14} /> },
                    { id: 'profile',  label: 'Profile',                             icon: <FiUser size={14} /> },
                ].map(t => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                            tab === t.id
                                ? 'bg-green-500 text-white shadow-lg shadow-green-900/30'
                                : 'text-gray-500 hover:bg-gray-800'
                        }`}
                    >
                        {t.icon} <span className="hidden sm:inline">{t.label}</span>
                    </button>
                ))}
            </div>

            {/* ── Tab Content ───────────────────────────────────────── */}
            <main className="flex-1 p-4 space-y-4">

                {/* Active Orders */}
                {tab === 'orders' && (
                    activeOrders.length === 0 ? (
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center mt-4">
                            <FiPackage className="mx-auto text-5xl text-gray-700 mb-3" />
                            <p className="font-bold text-gray-400">No active orders</p>
                            <p className="text-xs text-gray-600 mt-1">
                                {isOnline ? 'Waiting for assignments…' : 'Go online to receive orders'}
                            </p>
                        </div>
                    ) : activeOrders.map(order => {
                        const flow = STATUS_FLOW[order.orderStatus];
                        return (
                            <div key={order._id} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-lg">

                                {/* Order header */}
                                <div className="flex items-center justify-between p-4 border-b border-gray-800">
                                    <div>
                                        <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Order ID</p>
                                        <p className="font-black text-white font-mono text-sm">#{order._id?.slice(-8)}</p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-black ${STATUS_BADGE[order.orderStatus] || 'bg-gray-800 text-gray-400'}`}>
                                        {order.orderStatus}
                                    </span>
                                </div>

                                <div className="p-4 space-y-3">
                                    {/* Address */}
                                    <div className="flex items-start gap-3 bg-gray-800/60 rounded-xl p-3">
                                        <FiMapPin className="text-green-400 mt-0.5 shrink-0" size={16} />
                                        <div>
                                            <p className="font-bold text-white text-sm leading-tight">{order.shippingAddress?.address}</p>
                                            <p className="text-xs text-gray-400 mt-0.5">{order.shippingAddress?.city}, {order.shippingAddress?.postalCode}</p>
                                        </div>
                                    </div>

                                    {/* Customer + Total */}
                                    <div className="flex items-center justify-between px-1">
                                        <div>
                                            <p className="text-[10px] text-gray-500">Customer</p>
                                            <p className="font-bold text-white text-sm">{order.user?.name || 'Customer'}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] text-gray-500">Amount</p>
                                            <p className="font-black text-lg text-green-400">₹{order.totalPrice}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] text-gray-500">Payment</p>
                                            <p className="font-bold text-gray-300 text-sm">{order.paymentMethod}</p>
                                        </div>
                                    </div>

                                    {/* Items preview */}
                                    {order.orderItems?.length > 0 && (
                                        <div className="text-xs text-gray-400 bg-gray-800/40 rounded-xl p-3 leading-relaxed">
                                            {order.orderItems.slice(0, 3).map((item, i) => (
                                                <span key={i}>{item.name} ×{item.quantity}{i < Math.min(order.orderItems.length, 3) - 1 ? ', ' : ''}</span>
                                            ))}
                                            {order.orderItems.length > 3 && <span className="text-gray-500"> +{order.orderItems.length - 3} more</span>}
                                        </div>
                                    )}
                                </div>

                                {/* Action buttons */}
                                {flow && (
                                    <div className="px-4 pb-4 flex gap-3">
                                        {order.shippingAddress?.address && (
                                            <a
                                                href={`https://maps.google.com/?q=${encodeURIComponent(
                                                    (order.shippingAddress.lat && order.shippingAddress.lng)
                                                        ? `${order.shippingAddress.lat},${order.shippingAddress.lng}`
                                                        : `${order.shippingAddress.address} ${order.shippingAddress.city}`
                                                )}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex items-center gap-2 px-4 py-3 bg-blue-900/30 text-blue-400 border border-blue-500/30 font-bold rounded-xl text-sm hover:bg-blue-900/50 transition-all"
                                            >
                                                <FiNavigation size={14} /> Navigate
                                            </a>
                                        )}
                                        <button
                                            onClick={() => handleUpdateStatus(order._id, flow.next)}
                                            disabled={actionLoading === order._id}
                                            className={`flex-1 py-3 text-white font-black rounded-xl transition-all active:scale-95 disabled:opacity-50 text-sm shadow-lg ${flow.color}`}
                                        >
                                            {actionLoading === order._id ? 'Updating…' : flow.label}
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}

                {/* Completed */}
                {tab === 'history' && (
                    completedOrders.length === 0 ? (
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
                            <FiCheckCircle className="mx-auto text-5xl text-gray-700 mb-3" />
                            <p className="text-gray-500 font-medium">No completed deliveries yet</p>
                        </div>
                    ) : completedOrders.map(order => (
                        <div key={order._id} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-center gap-4">
                            <div className="w-10 h-10 bg-green-900/30 border border-green-500/30 rounded-full flex items-center justify-center">
                                <FiCheckCircle className="text-green-400" size={18} />
                            </div>
                            <div className="flex-1">
                                <p className="font-black font-mono text-sm text-white">#{order._id?.slice(-8)}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{order.shippingAddress?.address?.slice(0, 40)}…</p>
                            </div>
                            <div className="text-right">
                                <p className="font-black text-green-400">₹{order.totalPrice}</p>
                                <p className="text-xs text-gray-500">{order.orderStatus}</p>
                            </div>
                        </div>
                    ))
                )}

                {/* Earnings */}
                {tab === 'earnings' && (
                    <div className="space-y-4">
                        {[
                            { label: "Today's Earnings",  data: earnings?.today,    color: 'from-green-500 to-emerald-700' },
                            { label: "This Week",         data: earnings?.thisWeek, color: 'from-blue-500 to-indigo-700' },
                            { label: "All Time",          data: earnings?.allTime,  color: 'from-purple-500 to-purple-800' },
                        ].map(e => (
                            <div key={e.label} className={`bg-gradient-to-r ${e.color} rounded-2xl p-6 shadow-xl`}>
                                <p className="text-white/70 text-sm font-bold">{e.label}</p>
                                <p className="text-4xl font-black mt-1 text-white">₹{(e.data?.earnings || 0).toFixed(0)}</p>
                                <p className="text-white/60 text-sm mt-1">{e.data?.deliveries || 0} deliveries</p>
                            </div>
                        ))}
                        <Link
                            to="/rider/kyc"
                            className="block bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center font-bold text-green-400 hover:bg-gray-800 transition-colors text-sm"
                        >
                            📋 View KYC & Payout Details →
                        </Link>
                    </div>
                )}

                {/* Profile */}
                {tab === 'profile' && profile && (
                    <div className="space-y-4">
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-green-900/40">
                                    {profile.name?.charAt(0)}
                                </div>
                                <div>
                                    <p className="font-black text-xl text-white">{profile.name}</p>
                                    <p className="text-gray-400 text-sm">{profile.phone}</p>
                                    <div className="flex items-center gap-1 mt-1">
                                        <FiStar className="text-yellow-400 w-4 h-4" />
                                        <span className="font-bold text-white text-sm">{profile.rating?.toFixed(1) || 'N/A'}</span>
                                        <span className="text-gray-500 text-xs">({profile.ratingCount || 0} ratings)</span>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    ['Vehicle', profile.vehicleDetails?.vehicleType],
                                    ['Plate', profile.vehicleDetails?.numberPlate],
                                    ['Total Deliveries', profile.totalDeliveries || 0],
                                    ['Commission', `${profile.commissionRate || 20}%`],
                                    ['KYC Status', profile.kycStatus?.replace('_', ' ')],
                                    ['Account', profile.status || 'inactive'],
                                ].map(([label, value]) => (
                                    <div key={label} className="bg-gray-800 rounded-xl p-3">
                                        <p className="text-xs text-gray-500 font-medium">{label}</p>
                                        <p className="font-bold text-white mt-0.5 capitalize text-sm">{value || '—'}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <Link
                            to="/rider/kyc"
                            className="block bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black text-center py-4 rounded-2xl shadow-lg shadow-green-900/30 hover:shadow-xl transition-all active:scale-95"
                        >
                            📋 Submit / Update KYC Documents
                        </Link>
                    </div>
                )}
            </main>
        </div>
    );
};

export default RiderDashboard;
