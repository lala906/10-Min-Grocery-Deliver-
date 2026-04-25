import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import LiveOrderMap from '../components/LiveOrderMap';
import { FiTruck, FiMapPin, FiClock, FiPackage, FiWifi, FiWifiOff } from 'react-icons/fi';

const STATUS_COLOR = {
    'Order Placed':      '#f59e0b',
    'Packing':           '#f59e0b',
    'Rider Assigned':    '#3b82f6',
    'Picked Up':         '#8b5cf6',
    'In Transit':        '#6366f1',
    'Out for Delivery':  '#f97316',
    'Delivered':         '#22c55e',
};

const PublicTracking = () => {
    const { orderId } = useParams();
    const [orderData, setOrderData]   = useState(null);
    const [loading, setLoading]       = useState(true);
    const [error, setError]           = useState('');
    const [riderLoc, setRiderLoc]     = useState(null);
    const [status, setStatus]         = useState('');
    const [socketConn, setSocketConn] = useState(false);
    const [pathHistory, setPathHistory] = useState([]);
    const [speedKmh, setSpeedKmh]     = useState(null);
    const socketRef = useRef(null);

    /* ── Load order ────────────────────────────────────────────── */
    useEffect(() => {
        if (!orderId) return;
        fetch(`http://127.0.0.1:5000/api/tracking/${orderId}`)
            .then(r => r.json())
            .then(json => {
                if (json?.data) {
                    setOrderData(json.data);
                    setStatus(json.data.orderStatus);
                    const loc = json.data.rider?.currentLocation;
                    if (loc?.lat) setRiderLoc({ lat: loc.lat, lng: loc.lng });
                } else {
                    setError('Order not found');
                }
            })
            .catch(() => setError('Failed to load tracking info'))
            .finally(() => setLoading(false));
    }, [orderId]);

    /* ── Socket connection ──────────────────────────────────────── */
    useEffect(() => {
        if (!orderId) return;
        const socket = io('http://127.0.0.1:5000', {
            transports: ['websocket', 'polling'],
            reconnectionAttempts: 8,
        });
        socketRef.current = socket;
        socket.on('connect', () => { setSocketConn(true); socket.emit('joinOrderRoom', orderId); });
        socket.on('disconnect', () => setSocketConn(false));
        socket.on('orderStatusUpdated', ({ status: s }) => setStatus(s));
        socket.on('riderLocationUpdated', ({ lat, lng, speed = 0, heading = 0 }) => {
            if (typeof lat !== 'number') return;
            const loc = { lat, lng, speed, heading };
            setRiderLoc(loc);
            setSpeedKmh((speed || 0) * 3.6);
            setPathHistory(p => {
                const last = p[p.length - 1];
                if (last && Math.abs(last.lat - lat) < 0.0002 && Math.abs(last.lng - lng) < 0.0002) return p;
                return [...p.slice(-80), { lat, lng, ts: Date.now() }];
            });
        });
        return () => { socket.off(); socket.disconnect(); socketRef.current = null; };
    }, [orderId]);

    /* ── Render ─────────────────────────────────────────────────── */
    if (loading) return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center">
            <div className="text-center">
                <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-400 font-bold">Loading tracking…</p>
            </div>
        </div>
    );

    if (error) return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
            <div className="text-center">
                <p className="text-5xl mb-4">😕</p>
                <h2 className="text-white font-black text-xl mb-2">{error}</h2>
                <p className="text-gray-400 text-sm">Check that the tracking link is correct</p>
            </div>
        </div>
    );

    const statusColor = STATUS_COLOR[status] || '#6b7280';
    const showMap = ['Rider Assigned', 'Picked Up', 'In Transit', 'Out for Delivery'].includes(status);

    return (
        <div className="min-h-screen bg-gray-950 text-white">
            {/* Header */}
            <div className="bg-gray-900 border-b border-gray-800 px-5 py-5">
                <div className="max-w-lg mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-500/10 rounded-xl border border-green-500/20">
                            <FiTruck className="text-green-400 w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="font-black text-white text-base">Live Tracking</h1>
                            <p className="text-xs text-gray-400 font-mono mt-0.5">
                                #{orderId?.slice(-8).toUpperCase()}
                            </p>
                        </div>
                    </div>
                    <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${
                        socketConn
                            ? 'bg-green-900/30 border-green-500/30 text-green-400'
                            : 'bg-gray-800 border-gray-700 text-gray-500'
                    }`}>
                        {socketConn
                            ? <><span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />Live</>
                            : <><FiWifiOff size={11} />Offline</>
                        }
                    </div>
                </div>
            </div>

            <div className="max-w-lg mx-auto p-5 space-y-5">
                {/* Status card */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Current Status</p>
                        {speedKmh !== null && speedKmh > 1 && (
                            <span className="text-xs font-bold text-blue-400 bg-blue-900/30 px-3 py-1 rounded-full border border-blue-500/30">
                                🛵 {Math.round(speedKmh)} km/h
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full animate-pulse" style={{ background: statusColor }} />
                        <h2 className="text-2xl font-black" style={{ color: statusColor }}>
                            {status}
                        </h2>
                    </div>
                    {status === 'Delivered' && (
                        <div className="mt-4 bg-green-900/20 border border-green-500/30 rounded-xl p-4 text-center">
                            <p className="text-3xl mb-1">🎉</p>
                            <p className="font-black text-green-400">Your order was delivered!</p>
                        </div>
                    )}
                </div>

                {/* Rider info */}
                {orderData?.rider && (
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-900/30 border border-green-500/20 rounded-full flex items-center justify-center text-2xl">
                            🛵
                        </div>
                        <div>
                            <p className="font-black text-white">{orderData.rider.name}</p>
                            <p className="text-xs text-gray-400 mt-0.5 capitalize">
                                {orderData.rider.vehicleType || 'Delivery Partner'}
                            </p>
                        </div>
                    </div>
                )}

                {/* Map */}
                {showMap ? (
                    <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <FiMapPin size={12} /> Live Map
                        </p>
                        <LiveOrderMap
                            riderLocation={riderLoc}
                            destination={null}
                            orderId={orderId}
                            status={status}
                            pathHistory={pathHistory}
                            darkMode={true}
                            autoFollow={true}
                        />
                    </div>
                ) : (
                    !['Delivered', 'Cancelled'].includes(status) && (
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex items-center gap-3">
                            <FiClock className="text-amber-400 shrink-0" size={20} />
                            <div>
                                <p className="font-bold text-white text-sm">Live map coming soon</p>
                                <p className="text-xs text-gray-400 mt-0.5">Map will appear once a rider picks up your order</p>
                            </div>
                        </div>
                    )
                )}

                {/* Order info */}
                {orderData && (
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
                        {[
                            { icon: <FiPackage size={14} />, label: 'Items', value: `${orderData.itemCount} item(s)` },
                            { icon: <FiMapPin size={14} />, label: 'Delivering to', value: `${orderData.destination?.city || '—'} — ${orderData.destination?.postalCode || '—'}` },
                        ].map(row => (
                            <div key={row.label} className="flex items-center gap-3">
                                <div className="text-gray-500">{row.icon}</div>
                                <div className="flex-1">
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{row.label}</p>
                                    <p className="text-sm font-bold text-white mt-0.5">{row.value}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <p className="text-center text-xs text-gray-600 pb-4">
                    This is a read-only live tracking page. Your order info is kept private.
                </p>
            </div>
        </div>
    );
};

export default PublicTracking;
