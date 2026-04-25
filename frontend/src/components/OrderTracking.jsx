import React, { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import LiveOrderMap from './LiveOrderMap';
import {
    FiTruck, FiCheckCircle, FiClock, FiWifi, FiWifiOff,
    FiMapPin, FiNavigation, FiAlertTriangle, FiShare2,
    FiCopy, FiActivity, FiZap, FiPlayCircle, FiX,
    FiPhone,
} from 'react-icons/fi';

/* ── Lifecycle steps ─────────────────────────────────────────────── */
const STEPS = [
    { key: 'Order Placed',      label: 'Preparing',     emoji: '📦', short: 'Prep' },
    { key: 'Rider Assigned',    label: 'Picked Up',     emoji: '🛵', short: 'Pickup' },
    { key: 'In Transit',        label: 'On the Way',    emoji: '🚀', short: 'Transit' },
    { key: 'Out for Delivery',  label: 'Nearby',        emoji: '🏎️', short: 'Nearby' },
    { key: 'Delivered',         label: 'Delivered',     emoji: '✅', short: 'Done' },
];

const STATUS_STEP_MAP = {
    'Order Placed': 0, 'Merchant Accepted': 0, 'Packing': 0,
    'Waiting for Rider': 0, 'Rider Assigned': 1,
    'Picked Up': 1, 'In Transit': 2, 'Out for Delivery': 3,
    'Delivered': 4, 'Completed': 4,
};

const MAP_STATUSES = ['Rider Assigned', 'Picked Up', 'In Transit', 'Out for Delivery'];

/* ── Haversine ───────────────────────────────────────────────────── */
const haversineKm = (lat1, lng1, lat2, lng2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/* ── Delivery Confidence Score ───────────────────────────────────── */
const calcConfidence = ({ speedHistory, riderLocation, destination, etaMins, status }) => {
    let score = 80; // base
    if (!riderLocation || !destination?.lat) return score;

    const distKm = haversineKm(riderLocation.lat, riderLocation.lng, destination.lat, destination.lng);
    // Lower distance = higher confidence
    if (distKm < 0.5) score += 15;
    else if (distKm < 1) score += 10;
    else if (distKm < 2) score += 5;
    else if (distKm > 5) score -= 10;

    // Speed consistency
    if (speedHistory.length >= 3) {
        const speeds = speedHistory.slice(-5).map(s => s * 3.6); // m/s → km/h
        const avg = speeds.reduce((a, b) => a + b, 0) / speeds.length;
        const variance = speeds.reduce((s, v) => s + Math.abs(v - avg), 0) / speeds.length;
        if (variance < 5) score += 8;       // very consistent
        else if (variance < 15) score += 3;
        else score -= 5;                    // erratic
        if (avg < 1) score -= 10;          // stuck
        if (avg > 80) score -= 8;          // too fast
    }

    if (['Out for Delivery'].includes(status)) score += 5;
    return Math.min(100, Math.max(10, Math.round(score)));
};

/* ── Progress Bar ────────────────────────────────────────────────── */
const DeliveryProgressBar = ({ currentStatus }) => {
    const idx = STATUS_STEP_MAP[currentStatus] ?? 0;
    const pct = STEPS.length > 1 ? (idx / (STEPS.length - 1)) * 100 : 0;
    return (
        <div className="px-5 pt-4 pb-2">
            <div className="relative">
                {/* Rail */}
                <div className="absolute top-[18px] left-5 right-5 h-1.5 bg-gray-800 rounded-full" />
                {/* Fill */}
                <div
                    className="absolute top-[18px] left-5 h-1.5 bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-1000"
                    style={{ width: `calc(${pct}% * (100% - 2.5rem) / 100)` }}
                />
                {/* Step dots */}
                <div className="relative flex justify-between px-5">
                    {STEPS.map((step, i) => {
                        const done = i < idx;
                        const active = i === idx;
                        return (
                            <div key={i} className="flex flex-col items-center gap-1.5">
                                <div className={`
                                    w-9 h-9 rounded-full border-2 flex items-center justify-center text-base
                                    transition-all duration-500
                                    ${done ? 'bg-green-500 border-green-500 text-white shadow-lg shadow-green-500/30' : ''}
                                    ${active ? 'bg-gray-900 border-green-400 shadow-lg shadow-green-500/40 scale-110 ring-2 ring-green-400/40' : ''}
                                    ${!done && !active ? 'bg-gray-800 border-gray-700 text-gray-500' : ''}
                                `}>
                                    {done ? '✓' : step.emoji}
                                </div>
                                <span className={`text-[9px] font-bold uppercase tracking-wider hidden sm:block ${
                                    active ? 'text-green-400' : done ? 'text-gray-400' : 'text-gray-600'
                                }`}>{step.short}</span>
                                {active && (
                                    <span className="absolute -bottom-5 text-[9px] font-bold text-green-400 animate-pulse">●</span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
            <p className="text-center text-xs font-bold text-gray-300 mt-6">{currentStatus}</p>
        </div>
    );
};

/* ── Confidence Badge ────────────────────────────────────────────── */
const ConfidenceBadge = ({ score }) => {
    const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444';
    const label = score >= 80 ? 'High' : score >= 60 ? 'Medium' : 'Low';
    return (
        <div className="flex items-center gap-2 bg-gray-800/70 rounded-xl px-3 py-2 border border-gray-700">
            <FiActivity size={13} style={{ color }} />
            <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Confidence</p>
                <p className="text-sm font-black" style={{ color }}>{score}% {label}</p>
            </div>
        </div>
    );
};

/* ── ETA Badge ───────────────────────────────────────────────────── */
const ETABadge = ({ riderLoc, dest, prevEta, onEtaChange }) => {
    const [eta, setEta] = useState(null);

    useEffect(() => {
        if (!riderLoc?.lat || !dest?.lat) { setEta(null); return; }
        const distKm = haversineKm(riderLoc.lat, riderLoc.lng, dest.lat, dest.lng);
        const mins = Math.max(1, Math.round((distKm / 25) * 60)); // 25 km/h urban avg
        setEta(mins);
        onEtaChange?.(mins);
    }, [riderLoc, dest]);

    if (!eta) return null;
    const delayed = prevEta && eta > prevEta + 3;
    return (
        <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${
            delayed
                ? 'bg-red-900/40 border-red-500/40 text-red-400'
                : 'bg-green-900/40 border-green-500/40 text-green-400'
        }`}>
            <FiNavigation size={12} />
            {delayed ? `⚠️ Delayed ~${eta}m` : `Arriving ~${eta} min`}
        </div>
    );
};

/* ── Speed & Behavior Alert ──────────────────────────────────────── */
const SpeedAlert = ({ speedKmh }) => {
    if (!speedKmh || speedKmh < 1) return (
        <div className="flex items-center gap-2 bg-amber-900/30 border border-amber-500/30 text-amber-400 text-xs font-bold px-3 py-2 rounded-xl">
            <FiAlertTriangle size={13} /> Rider may be stuck or waiting
        </div>
    );
    if (speedKmh > 70) return (
        <div className="flex items-center gap-2 bg-red-900/30 border border-red-500/30 text-red-400 text-xs font-bold px-3 py-2 rounded-xl">
            <FiZap size={13} /> Rider moving unusually fast ({Math.round(speedKmh)} km/h)
        </div>
    );
    return null;
};

/* ── Share Tracking Link ─────────────────────────────────────────── */
const ShareButton = ({ orderId }) => {
    const [copied, setCopied] = useState(false);
    const url = `${window.location.origin}/track/${orderId}`;
    const copy = () => {
        navigator.clipboard.writeText(url).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };
    return (
        <button
            onClick={copy}
            className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-xs font-bold px-3 py-1.5 rounded-xl transition-all"
        >
            {copied ? <FiCheckCircle size={12} className="text-green-400" /> : <FiShare2 size={12} />}
            {copied ? 'Copied!' : 'Share'}
        </button>
    );
};

/* ── Mini Path Playback Modal ────────────────────────────────────── */
const PlaybackModal = ({ pathHistory, destination, onClose }) => {
    const mapRef = useRef(null);
    const containerRef = useRef(null);
    const intervalRef = useRef(null);
    const [idx, setIdx] = useState(0);
    const [playing, setPlaying] = useState(false);
    const markerRef = useRef(null);

    useEffect(() => {
        injectLeafletCSS();
        if (!containerRef.current || mapRef.current) return;
        import('leaflet').then((mod) => {
            const L = mod.default || mod;
            const center = pathHistory[0] ? [pathHistory[0].lat, pathHistory[0].lng] : [28.7, 77.1];
            const map = L.map(containerRef.current, { center, zoom: 15, zoomControl: true, attributionControl: false });
            mapRef.current = map;
            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map);
            if (pathHistory.length > 1) {
                L.polyline(pathHistory.map(p => [p.lat, p.lng]), {
                    color: '#22c55e', weight: 3, opacity: 0.5, dashArray: '5 4',
                }).addTo(map);
            }
            if (destination?.lat) {
                L.circleMarker([destination.lat, destination.lng], {
                    radius: 10, color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.7,
                }).addTo(map).bindPopup('Destination');
            }
            const mk = L.circleMarker(center, {
                radius: 8, color: '#16a34a', fillColor: '#16a34a', fillOpacity: 1, weight: 3,
            }).addTo(map);
            markerRef.current = mk;
        });
        return () => { mapRef.current?.remove(); mapRef.current = null; markerRef.current = null; };
    }, []);

    const play = useCallback(() => {
        if (!markerRef.current || pathHistory.length < 2) return;
        setPlaying(true);
        let i = idx;
        intervalRef.current = setInterval(() => {
            i++;
            if (i >= pathHistory.length) { clearInterval(intervalRef.current); setPlaying(false); return; }
            setIdx(i);
            const pt = pathHistory[i];
            markerRef.current?.setLatLng([pt.lat, pt.lng]);
            mapRef.current?.panTo([pt.lat, pt.lng]);
        }, 200);
    }, [idx, pathHistory]);

    const pause = () => { clearInterval(intervalRef.current); setPlaying(false); };
    useEffect(() => () => clearInterval(intervalRef.current), []);

    const injectLeafletCSS = () => {
        if (document.getElementById('leaflet-css-pb')) return;
        const l = document.createElement('link');
        l.id = 'leaflet-css-pb';
        l.rel = 'stylesheet';
        l.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(l);
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-3xl border border-gray-700 shadow-2xl w-full max-w-lg overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
                    <div>
                        <h3 className="font-black text-white text-base">📍 Route Playback</h3>
                        <p className="text-xs text-gray-400 mt-0.5">{pathHistory.length} location points</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white p-1"><FiX size={20} /></button>
                </div>
                <div ref={containerRef} style={{ width: '100%', height: 280 }} />
                <div className="flex items-center gap-3 px-5 py-4">
                    <button
                        onClick={playing ? pause : play}
                        className="flex items-center gap-2 bg-green-500 hover:bg-green-400 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all"
                    >
                        <FiPlayCircle size={16} /> {playing ? 'Pause' : idx > 0 ? 'Resume' : 'Play'}
                    </button>
                    <div className="flex-1 bg-gray-800 rounded-full h-2 overflow-hidden">
                        <div
                            className="bg-green-500 h-2 rounded-full transition-all"
                            style={{ width: `${pathHistory.length > 1 ? (idx / (pathHistory.length - 1)) * 100 : 0}%` }}
                        />
                    </div>
                    <span className="text-xs font-mono text-gray-400">{idx}/{pathHistory.length - 1}</span>
                </div>
            </div>
        </div>
    );
};

/* ════════════════════════════════════════════════════════════════════
   Main OrderTracking Component
   ════════════════════════════════════════════════════════════════════ */
const OrderTracking = ({ order }) => {
    const [status, setStatus]             = useState(order?.orderStatus || 'Order Placed');
    const [riderLocation, setRiderLocation] = useState(null);
    const [socketConn, setSocketConn]     = useState(false);
    const [lastUpdated, setLastUpdated]   = useState(null);
    const [locationStale, setLocationStale] = useState(false);
    const [pathHistory, setPathHistory]   = useState([]);
    const [speedKmh, setSpeedKmh]         = useState(null);
    const [speedHistory, setSpeedHistory] = useState([]);
    const [confidence, setConfidence]     = useState(80);
    const [deviated, setDeviated]         = useState(false);
    const [nearby, setNearby]             = useState(false);
    const [showPlayback, setShowPlayback] = useState(false);
    const [prevEta, setPrevEta]           = useState(null);
    const [autoFollow, setAutoFollow]     = useState(true);
    const socketRef   = useRef(null);
    const staleTimer  = useRef(null);
    const MAX_HISTORY = 120; // ~4 minutes at 2s updates

    const dest = order?.shippingAddress?.lat
        ? { lat: order.shippingAddress.lat, lng: order.shippingAddress.lng }
        : null;
    const showMap = MAP_STATUSES.includes(status);

    /* ── Socket connection & Initial Data ────────────────────────── */
    useEffect(() => {
        if (!order?._id) return;

        // Fetch past path history for playback
        fetch(`http://127.0.0.1:5000/api/tracking/${order._id}/path?minutes=5`)
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success' && data.data?.length > 0) {
                    setPathHistory(data.data.map(p => ({
                        lat: p.lat, lng: p.lng, ts: new Date(p.createdAt).getTime()
                    })));
                }
            })
            .catch(err => console.warn('[OrderTracking] Path fetch error:', err));

        let socket;
        try {
            socket = io('http://127.0.0.1:5000', {
                transports: ['websocket', 'polling'],
                reconnectionAttempts: 8,
                reconnectionDelay: 2000,
            });
            socketRef.current = socket;

            socket.on('connect', () => {
                setSocketConn(true);
                socket.emit('joinOrderRoom', order._id);
            });
            socket.on('disconnect', () => setSocketConn(false));

            socket.on('orderStatusUpdated', ({ status: s }) => {
                setStatus(s);
                if (s === 'Delivered') setNearby(false);
            });

            socket.on('riderLocationUpdated', ({ lat, lng, speed = 0, heading = 0, accuracy }) => {
                if (typeof lat !== 'number' || typeof lng !== 'number') return;
                if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return; // sanity

                const loc = { lat, lng, speed, heading, accuracy };
                setRiderLocation(loc);
                setLastUpdated(new Date());
                setLocationStale(false);
                clearTimeout(staleTimer.current);
                staleTimer.current = setTimeout(() => setLocationStale(true), 8000);

                const kmh = (speed || 0) * 3.6;
                setSpeedKmh(kmh);
                setSpeedHistory(h => [...h.slice(-19), speed]);

                // Add to path history (throttled — only if moved > 20m)
                setPathHistory(prev => {
                    const last = prev[prev.length - 1];
                    if (last) {
                        const d = haversineKm(last.lat, last.lng, lat, lng) * 1000;
                        if (d < 20) return prev;
                    }
                    return [...prev.slice(-MAX_HISTORY), { lat, lng, ts: Date.now() }];
                });

                // Route deviation detection (simple — check if speed ≈ 0 for ages)
                // More robust: compare to straight-line path
                if (dest?.lat) {
                    const directDist = haversineKm(lat, lng, dest.lat, dest.lng);
                    // If last 10 pts show movement but distance isn't decreasing — possible deviation
                    setPathHistory(hist => {
                        if (hist.length >= 8) {
                            const oldest = hist[0];
                            const distOld = haversineKm(oldest.lat, oldest.lng, dest.lat, dest.lng);
                            if (directDist > distOld + 0.3) setDeviated(true);
                            else setDeviated(false);
                        }
                        return hist;
                    });
                }
            });
        } catch (err) {
            console.warn('[OrderTracking] Socket init error:', err.message);
        }
        return () => {
            try {
                socket?.off();
                socket?.disconnect();
            } catch (_) {}
            socketRef.current = null;
            clearTimeout(staleTimer.current);
        };
    }, [order?._id]);

    /* ── Recalculate confidence score ───────────────────────────── */
    useEffect(() => {
        if (!riderLocation) return;
        const score = calcConfidence({ speedHistory, riderLocation, destination: dest, status });
        setConfidence(score);
    }, [riderLocation, speedHistory, status]);

    if (!order) return null;

    return (
        <div className="rounded-3xl bg-gray-950 border border-gray-800 shadow-2xl overflow-hidden text-white">
            {/* ── Header ──────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-800">
                <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-green-500/10 rounded-xl border border-green-500/20">
                        <FiTruck className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                        <h3 className="text-base font-extrabold text-white">Live Delivery Tracking</h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Order #{order._id?.slice(-8).toUpperCase()}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                    {/* ETA */}
                    {showMap && (
                        <ETABadge
                            riderLoc={riderLocation}
                            dest={dest}
                            prevEta={prevEta}
                            onEtaChange={setPrevEta}
                        />
                    )}
                    {/* Socket indicator */}
                    <div className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-full border ${
                        socketConn
                            ? 'bg-green-900/30 border-green-500/30 text-green-400'
                            : 'bg-gray-800 border-gray-700 text-gray-500'
                    }`}>
                        {socketConn
                            ? <><span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" /> Live</>
                            : <><FiWifiOff size={11} /> Offline</>
                        }
                    </div>
                </div>
            </div>

            {/* ── Progress Bar ─────────────────────────────────────── */}
            <DeliveryProgressBar currentStatus={status} />

            {/* ── Stats row ────────────────────────────────────────── */}
            {showMap && (
                <div className="flex items-center gap-3 px-5 pb-3 flex-wrap">
                    <ConfidenceBadge score={confidence} />
                    {riderLocation && speedKmh !== null && (
                        <div className="flex items-center gap-2 bg-gray-800/70 rounded-xl px-3 py-2 border border-gray-700">
                            <FiZap size={13} className="text-blue-400" />
                            <div>
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Speed</p>
                                <p className="text-sm font-black text-blue-400">{Math.round(speedKmh)} km/h</p>
                            </div>
                        </div>
                    )}
                    {lastUpdated && (
                        <div className="ml-auto text-[10px] text-gray-500 font-medium">
                            Updated {lastUpdated.toLocaleTimeString()}
                        </div>
                    )}
                </div>
            )}

            {/* ── Alerts ───────────────────────────────────────────── */}
            <div className="px-5 space-y-2">
                {locationStale && (
                    <div className="flex items-center gap-2 bg-amber-900/30 border border-amber-500/30 text-amber-400 text-xs font-bold px-3 py-2.5 rounded-xl">
                        <FiClock size={13} /> Updating location…
                    </div>
                )}
                {nearby && (
                    <div className="flex items-center gap-2 bg-green-900/30 border border-green-500/30 text-green-400 text-xs font-bold px-3 py-2.5 rounded-xl animate-pulse">
                        <FiMapPin size={13} /> 🎉 Rider is nearby — get ready to receive your order!
                        <button className="ml-auto bg-green-500 text-white px-3 py-1 rounded-lg text-[10px] font-black flex items-center gap-1">
                            <FiPhone size={10} /> Call
                        </button>
                    </div>
                )}
                {deviated && showMap && (
                    <div className="flex items-center gap-2 bg-orange-900/30 border border-orange-500/30 text-orange-400 text-xs font-bold px-3 py-2.5 rounded-xl">
                        <FiAlertTriangle size={13} /> Rider is taking an alternate route
                    </div>
                )}
                {showMap && speedKmh !== null && <SpeedAlert speedKmh={speedKmh} />}
            </div>

            {/* ── Live Map ─────────────────────────────────────────── */}
            {showMap ? (
                <div className="px-5 py-4 space-y-3">
                    {/* Map controls */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            onClick={() => setAutoFollow(f => !f)}
                            className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all ${
                                autoFollow
                                    ? 'bg-green-500/20 border-green-500/40 text-green-400'
                                    : 'bg-gray-800 border-gray-700 text-gray-400'
                            }`}
                        >
                            {autoFollow ? '📍 Auto-follow ON' : '📍 Auto-follow OFF'}
                        </button>
                        {pathHistory.length >= 5 && (
                            <button
                                onClick={() => setShowPlayback(true)}
                                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border bg-purple-900/30 border-purple-500/40 text-purple-400 hover:bg-purple-900/50 transition-all"
                            >
                                <FiPlayCircle size={12} /> Playback
                            </button>
                        )}
                        {order._id && <ShareButton orderId={order._id} />}
                    </div>

                    {/* No rider location yet */}
                    {!riderLocation && (
                        <div className="flex items-center gap-2 bg-gray-800/60 border border-gray-700 text-gray-400 text-xs font-semibold px-3 py-2.5 rounded-xl">
                            <FiMapPin size={13} /> Waiting for rider to share location…
                        </div>
                    )}

                    <LiveOrderMap
                        riderLocation={riderLocation}
                        destination={dest}
                        orderId={order._id}
                        status={status}
                        pathHistory={pathHistory}
                        darkMode={true}
                        autoFollow={autoFollow}
                        onNearby={() => setNearby(true)}
                    />
                </div>
            ) : (
                status !== 'Delivered' && status !== 'Cancelled' && (
                    <div className="px-5 pb-5">
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-start gap-3">
                            <FiMapPin className="w-5 h-5 text-gray-500 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-sm font-bold text-gray-300">Live map activates soon</p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Map tracking will appear once a rider is assigned. Status: <strong className="text-gray-300">{status}</strong>
                                </p>
                            </div>
                        </div>
                    </div>
                )
            )}

            {/* ── Delivered state ───────────────────────────────────── */}
            {status === 'Delivered' && (
                <div className="px-5 pb-5">
                    <div className="bg-green-900/20 border border-green-500/30 rounded-2xl p-5 text-center">
                        <div className="text-4xl mb-2">🎉</div>
                        <h3 className="font-black text-green-400 text-base">Order Delivered!</h3>
                        <p className="text-xs text-gray-400 mt-1">Hope you enjoy your order</p>
                    </div>
                </div>
            )}

            {/* ── Playback modal ────────────────────────────────────── */}
            {showPlayback && (
                <PlaybackModal
                    pathHistory={pathHistory}
                    destination={dest}
                    onClose={() => setShowPlayback(false)}
                />
            )}
        </div>
    );
};

export default OrderTracking;
