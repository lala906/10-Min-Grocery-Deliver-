import React, { useEffect, useState, useRef, useCallback } from 'react';
import { getLiveMapData, getAllRiders } from '../../services/api';
import { io } from 'socket.io-client';
import {
    FiRefreshCw, FiTruck, FiShoppingCart, FiAlertTriangle, FiActivity,
    FiZap, FiFilter, FiMapPin, FiUser, FiClock, FiWifi, FiWifiOff,
} from 'react-icons/fi';

/* ── Leaflet CSS loader ─────────────────────────────────────────── */
let _cssLoaded = false;
const loadLeafletCSS = () => {
    if (_cssLoaded || typeof document === 'undefined') return;
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(l);
    _cssLoaded = true;
};

/* ── Speed-aware rider icon factory ─────────────────────────────── */
const makeAdminRiderIcon = (L, rider) => {
    const speedKmh = (rider.speed || 0) * 3.6;
    const isStuck  = speedKmh < 1 && rider.online;
    const isFast   = speedKmh > 70;
    const ring = isFast ? '#ef4444' : isStuck ? '#f59e0b' : '#22c55e';
    return L.divIcon({
        html: `
            <div style="position:relative;width:46px;height:46px;">
                <div style="
                    position:absolute;inset:-6px;border-radius:50%;
                    background:${ring}22;animation:adminPulse 2s infinite;
                "></div>
                <div style="
                    width:46px;height:46px;background:linear-gradient(135deg,${ring},${ring}99);
                    border-radius:50%;border:3px solid white;
                    box-shadow:0 3px 12px ${ring}55;
                    display:flex;align-items:center;justify-content:center;
                    font-size:20px;
                    transform:rotate(${rider.heading || 0}deg);
                    transition:transform 0.5s ease;
                ">🛵</div>
                ${speedKmh > 1 ? `<div style="
                    position:absolute;bottom:-18px;left:50%;transform:translateX(-50%);
                    background:#111;color:#fff;font-size:9px;font-weight:800;
                    padding:2px 6px;border-radius:999px;white-space:nowrap;pointer-events:none;
                ">${Math.round(speedKmh)} km/h</div>` : ''}
                ${isStuck ? `<div style="
                    position:absolute;top:-14px;left:50%;transform:translateX(-50%);
                    background:#f59e0b;color:#fff;font-size:8px;font-weight:900;
                    padding:1px 5px;border-radius:4px;white-space:nowrap;pointer-events:none;
                ">STUCK</div>` : ''}
                ${isFast ? `<div style="
                    position:absolute;top:-14px;left:50%;transform:translateX(-50%);
                    background:#ef4444;color:#fff;font-size:8px;font-weight:900;
                    padding:1px 5px;border-radius:4px;white-space:nowrap;pointer-events:none;
                ">FAST!</div>` : ''}
            </div>
            <style>@keyframes adminPulse{0%,100%{transform:scale(1);opacity:.5}50%{transform:scale(1.6);opacity:0}}</style>
        `,
        className: '',
        iconSize: [46, 46],
        iconAnchor: [23, 23],
        popupAnchor: [0, -28],
    });
};

/* ── Haversine (km) ──────────────────────────────────────────────── */
const haversineKm = (lat1, lng1, lat2, lng2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/* ── ETA estimate ─────────────────────────────────────────────────── */
const estimateETA = (riderLat, riderLng, destLat, destLng, speedMs) => {
    if (!riderLat || !destLat) return null;
    const distKm = haversineKm(riderLat, riderLng, destLat, destLng);
    const speedKmh = Math.max(speedMs * 3.6, 10); // min 10 km/h assumed
    return Math.max(1, Math.round((distKm / speedKmh) * 60));
};

/* ── Smooth marker movement ─────────────────────────────────────── */
const smoothMove = (marker, target, ms = 800) => {
    if (!marker) return;
    const start = marker.getLatLng();
    const t0 = performance.now();
    const anim = (now) => {
        const t = Math.min((now - t0) / ms, 1);
        const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        marker.setLatLng([start.lat + (target[0] - start.lat) * e, start.lng + (target[1] - start.lng) * e]);
        if (t < 1) requestAnimationFrame(anim);
    };
    requestAnimationFrame(anim);
};

/* ── Filter chips ────────────────────────────────────────────────── */
const FILTERS = [
    { id: 'all',      label: 'All Riders',       color: 'bg-gray-700 text-white' },
    { id: 'delayed',  label: '⚠️ Delayed Orders', color: 'bg-red-900/60 text-red-300 border border-red-500/40' },
    { id: 'stuck',    label: '🐌 Stuck Riders',   color: 'bg-amber-900/60 text-amber-300 border border-amber-500/40' },
    { id: 'fast',     label: '⚡ Speeding',        color: 'bg-blue-900/60 text-blue-300 border border-blue-500/40' },
    { id: 'busy',     label: '📦 Delivering',     color: 'bg-purple-900/60 text-purple-300 border border-purple-500/40' },
];

/* ════════════════════════════════════════════════════════════════════
   AdminLiveMap — Production-level super panel
   ════════════════════════════════════════════════════════════════════ */
const AdminLiveMap = () => {
    const [mapData, setMapData]         = useState({ activeRiders: [], activeOrders: [] });
    const [loading, setLoading]         = useState(true);
    const [filter, setFilter]           = useState('all');
    const [selectedRider, setSelectedRider] = useState(null);
    const [socketConn, setSocketConn]   = useState(false);
    const [liveRiders, setLiveRiders]   = useState({}); // riderId → {lat, lng, speed, heading, ts}
    const [alerts, setAlerts]           = useState([]);  // {type, text, ts}
    const [lastRefreshed, setLastRefreshed] = useState(null);

    const mapContainerRef = useRef(null);
    const mapRef          = useRef(null);
    const riderMarkersRef = useRef({});   // riderId → Leaflet marker
    const riderTracksRef  = useRef({});   // riderId → Leaflet polyline
    const riderPathsRef   = useRef({});   // riderId → [{lat, lng}]
    const socketRef       = useRef(null);
    const fetchTimerRef   = useRef(null);

    /* ── Push alert ────────────────────────────────────────────── */
    const pushAlert = useCallback((type, text) => {
        const ts = Date.now();
        setAlerts(a => [{ type, text, ts }, ...a.slice(0, 9)]);
    }, []);

    /* ── Load initial data ──────────────────────────────────────── */
    const fetchData = useCallback(async () => {
        try {
            const res = await getLiveMapData();
            const data = res?.data || res || { activeRiders: [], activeOrders: [] };
            setMapData(data);
            setLastRefreshed(new Date());
        } catch (e) { console.error('Live map fetch error:', e); }
        finally { setLoading(false); }
    }, []);

    /* ── Bootstrap Leaflet map ──────────────────────────────────── */
    useEffect(() => {
        loadLeafletCSS();
        if (!mapContainerRef.current || mapRef.current) return;

        import('leaflet').then(mod => {
            const L = mod.default || mod;
            const map = L.map(mapContainerRef.current, {
                center: [20.5937, 78.9629], // India center
                zoom: 5,
                zoomControl: false,
                attributionControl: false,
            });
            mapRef.current = map;
            L.control.zoom({ position: 'topright' }).addTo(map);
            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);
        });

        return () => {
            mapRef.current?.remove();
            mapRef.current = null;
            riderMarkersRef.current = {};
            riderTracksRef.current = {};
        };
    }, []);

    /* ── Socket.IO subscription ─────────────────────────────────── */
    useEffect(() => {
        const socket = io('http://127.0.0.1:5000', {
            transports: ['websocket', 'polling'],
            reconnectionAttempts: 10,
        });
        socketRef.current = socket;
        socket.on('connect', () => {
            setSocketConn(true);
            socket.emit('joinAdminRoom');
        });
        socket.on('disconnect', () => setSocketConn(false));

        socket.on('riderLocationUpdated', ({ riderId, name, lat, lng, speed = 0, heading = 0, activeOrderCount = 0, timestamp }) => {
            if (!riderId || typeof lat !== 'number') return;

            const speedKmh = speed * 3.6;

            // Speed alerts
            if (speedKmh > 75) pushAlert('danger', `🚨 ${name || riderId} is speeding at ${Math.round(speedKmh)} km/h`);

            // Update live rider state and trigger transitions if needed
            setLiveRiders(prev => {
                const prevSpeed = (prev[riderId]?.speed || 0) * 3.6;
                if (prevSpeed > 5 && speedKmh < 1) {
                    pushAlert('warning', `🐌 ${name || riderId} appears to be stuck or waiting.`);
                }
                return {
                    ...prev,
                    [riderId]: { lat, lng, speed, heading, name, activeOrderCount, ts: timestamp || Date.now() },
                };
            });

            // Update Leaflet marker
            if (!mapRef.current) return;
            import('leaflet').then(mod => {
                const L = mod.default || mod;
                const riderData = { speed, heading, name, online: true };

                if (riderMarkersRef.current[riderId]) {
                    smoothMove(riderMarkersRef.current[riderId], [lat, lng]);
                    riderMarkersRef.current[riderId].setIcon(makeAdminRiderIcon(L, riderData));
                } else {
                    const mk = L.marker([lat, lng], { icon: makeAdminRiderIcon(L, riderData) })
                        .addTo(mapRef.current)
                        .bindPopup(`<b>🛵 ${name || 'Rider'}</b><br>${Math.round(speedKmh)} km/h<br>${activeOrderCount} active order(s)`);
                    riderMarkersRef.current[riderId] = mk;
                }

                // Breadcrumb polyline (last 30 points)
                riderPathsRef.current[riderId] = [
                    ...(riderPathsRef.current[riderId] || []).slice(-30),
                    [lat, lng],
                ];
                const path = riderPathsRef.current[riderId];
                if (path.length >= 2) {
                    if (riderTracksRef.current[riderId]) {
                        riderTracksRef.current[riderId].setLatLngs(path);
                    } else {
                        riderTracksRef.current[riderId] = L.polyline(path, {
                            color: '#22c55e', weight: 2, opacity: 0.45, dashArray: '4 3',
                        }).addTo(mapRef.current);
                    }
                }
            });
        });

        // New order events
        socket.on('newOrderPlaced', ({ orderId }) => {
            pushAlert('info', `📦 New order placed: #${String(orderId).slice(-6)}`);
            fetchData();
        });
        socket.on('orderStatusUpdated', ({ orderId, status }) => {
            if (status === 'Delivered') pushAlert('success', `✅ Order delivered: #${String(orderId).slice(-6)}`);
        });

        return () => { socket.off(); socket.disconnect(); socketRef.current = null; };
    }, [pushAlert, fetchData]);

    /* ── Auto-refresh REST data every 15s ───────────────────────── */
    useEffect(() => {
        fetchData();
        fetchTimerRef.current = setInterval(fetchData, 15000);
        return () => clearInterval(fetchTimerRef.current);
    }, [fetchData]);

    /* ── Remove stale markers (no update in 30s) ─────────────────── */
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            setLiveRiders(prev => {
                const updated = { ...prev };
                Object.keys(updated).forEach(id => {
                    if (now - (updated[id].ts || 0) > 30000) {
                        delete updated[id];
                        if (riderMarkersRef.current[id]) {
                            riderMarkersRef.current[id].remove();
                            delete riderMarkersRef.current[id];
                        }
                    }
                });
                return updated;
            });
        }, 15000);
        return () => clearInterval(interval);
    }, []);

    /* ── Focus map on selected rider ─────────────────────────────── */
    useEffect(() => {
        if (!selectedRider || !mapRef.current) return;
        const loc = liveRiders[selectedRider._id] || selectedRider.currentLocation;
        if (loc?.lat) {
            mapRef.current.flyTo([loc.lat, loc.lng], 15, { duration: 1.2 });
        }
    }, [selectedRider, liveRiders]);

    /* ── Computed data ────────────────────────────────────────────── */
    const activeRiders = mapData.activeRiders || [];
    const activeOrders = mapData.activeOrders || [];
    const liveRiderIds = Object.keys(liveRiders);

    const filteredRiders = activeRiders.filter(r => {
        const live = liveRiders[r._id];
        const kmh = (live?.speed || 0) * 3.6;
        if (filter === 'stuck')   return kmh < 1;
        if (filter === 'fast')    return kmh > 70;
        if (filter === 'busy')    return !r.isAvailable;
        if (filter === 'delayed') return live && live.activeOrderCount > 0;
        return true;
    });

    const problemOrders = activeOrders.filter(o =>
        ['Waiting for Rider', 'Rider Assigned'].includes(o.orderStatus) &&
        new Date() - new Date(o.createdAt) > 20 * 60 * 1000
    );

    return (
        <div className="flex flex-col h-full bg-gray-950 text-white min-h-screen">

            {/* ── Top Bar ─────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-900 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/10 rounded-xl border border-green-500/20">
                        <FiMapPin className="text-green-400 w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="font-black text-white text-lg">Admin Live Map</h1>
                        <p className="text-xs text-gray-500 mt-0.5">
                            {lastRefreshed ? `Synced ${lastRefreshed.toLocaleTimeString()}` : 'Loading…'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {/* Socket status */}
                    <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${
                        socketConn
                            ? 'bg-green-900/30 border-green-500/30 text-green-400'
                            : 'bg-gray-800 border-gray-700 text-gray-500'
                    }`}>
                        {socketConn
                            ? <><span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />Socket Live</>
                            : <><FiWifiOff size={11} />Disconnected</>
                        }
                    </div>
                    <button
                        onClick={fetchData}
                        className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 font-bold py-2 px-4 rounded-xl text-sm transition-all"
                    >
                        <FiRefreshCw className={loading ? 'animate-spin' : ''} size={14} /> Refresh
                    </button>
                </div>
            </div>

            {/* ── Stats Strip ─────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 p-4 shrink-0">
                {[
                    { label: 'Live GPS',      value: liveRiderIds.length,                                     color: 'text-green-400',  icon: <FiActivity size={16} /> },
                    { label: 'Online Riders', value: activeRiders.length,                                     color: 'text-blue-400',   icon: <FiTruck size={16} /> },
                    { label: 'Active Orders', value: activeOrders.length,                                     color: 'text-orange-400', icon: <FiShoppingCart size={16} /> },
                    { label: 'Problem Orders',value: problemOrders.length,                                    color: 'text-red-400',    icon: <FiAlertTriangle size={16} /> },
                    { label: 'Avg Speed',
                      value: liveRiderIds.length
                        ? `${Math.round(Object.values(liveRiders).reduce((s, r) => s + (r.speed || 0) * 3.6, 0) / liveRiderIds.length)} km/h`
                        : '—',
                      color: 'text-purple-400', icon: <FiZap size={16} /> },
                ].map(s => (
                    <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                        <div className="flex items-center gap-2 text-gray-500 mb-1">{s.icon}<p className="text-xs font-bold uppercase tracking-wider">{s.label}</p></div>
                        <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                    </div>
                ))}
            </div>

            {/* ── Filter chips ─────────────────────────────────────── */}
            <div className="flex gap-2 px-4 pb-3 flex-wrap shrink-0">
                {FILTERS.map(f => (
                    <button
                        key={f.id}
                        onClick={() => setFilter(f.id)}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                            filter === f.id
                                ? 'ring-2 ring-white/30 ' + f.color
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700'
                        }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* ── Main: Map + Sidebar layout ────────────────────────── */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 px-4 pb-4 min-h-0">

                {/* Map */}
                <div className="lg:col-span-2 relative rounded-2xl overflow-hidden border border-gray-800 shadow-2xl" style={{ minHeight: 420 }}>
                    <div ref={mapContainerRef} style={{ width: '100%', height: '100%', minHeight: 420 }} />

                    {/* Map overlay: live rider count */}
                    <div className="absolute top-3 left-3 z-[999] bg-gray-900/90 backdrop-blur border border-gray-800 rounded-xl px-3 py-2">
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Live Riders</p>
                        <p className="text-xl font-black text-green-400">{liveRiderIds.length}</p>
                    </div>

                    {/* Loading overlay */}
                    {loading && (
                        <div className="absolute inset-0 bg-gray-950/70 flex items-center justify-center z-[998]">
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
                                <p className="text-gray-400 text-sm font-bold">Loading map data…</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="flex flex-col gap-3 overflow-hidden">

                    {/* Alerts stream */}
                    {alerts.length > 0 && (
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                            <div className="px-4 py-2.5 border-b border-gray-800 flex items-center justify-between">
                                <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                                    <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
                                    Live Alerts
                                </h3>
                                <button onClick={() => setAlerts([])} className="text-[10px] text-gray-500 hover:text-gray-300">Clear</button>
                            </div>
                            <div className="overflow-y-auto max-h-28">
                                {alerts.slice(0, 5).map(a => (
                                    <div key={a.ts} className={`px-4 py-2 text-xs font-semibold border-b border-gray-800/50 ${
                                        a.type === 'danger' ? 'text-red-400' :
                                        a.type === 'success' ? 'text-green-400' : 'text-blue-400'
                                    }`}>
                                        {a.text}
                                        <span className="ml-2 text-gray-600">{new Date(a.ts).toLocaleTimeString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Problem Orders */}
                    {problemOrders.length > 0 && (
                        <div className="bg-red-900/20 border border-red-500/30 rounded-2xl overflow-hidden">
                            <div className="px-4 py-2.5 border-b border-red-500/20 flex items-center gap-2">
                                <FiAlertTriangle size={13} className="text-red-400" />
                                <h3 className="text-xs font-black text-red-300 uppercase tracking-wider">Problem Orders ({problemOrders.length})</h3>
                            </div>
                            <div className="overflow-y-auto max-h-32">
                                {problemOrders.map(o => (
                                    <div key={o._id} className="px-4 py-2 flex items-center justify-between text-xs border-b border-red-500/10">
                                        <div>
                                            <p className="font-black text-red-300 font-mono">#{o._id?.slice(-6)}</p>
                                            <p className="text-red-400/60">{o.orderStatus}</p>
                                        </div>
                                        <p className="text-red-400 font-bold">
                                            {Math.round((Date.now() - new Date(o.createdAt)) / 60000)}m ago
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Rider list */}
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden flex-1">
                        <div className="px-4 py-2.5 border-b border-gray-800 flex items-center justify-between">
                            <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                Riders ({filteredRiders.length})
                            </h3>
                        </div>
                        <div className="overflow-y-auto max-h-56 lg:max-h-full">
                            {filteredRiders.length === 0 ? (
                                <div className="p-8 text-center text-gray-500 text-sm">
                                    <FiTruck className="mx-auto mb-2 text-3xl text-gray-700" />
                                    No riders match this filter
                                </div>
                            ) : filteredRiders.map(rider => {
                                const live   = liveRiders[rider._id];
                                const kmh    = live ? Math.round(live.speed * 3.6) : null;
                                const isStuck  = kmh !== null && kmh < 1;
                                const isFast   = kmh !== null && kmh > 70;
                                const isActive = !!live;

                                return (
                                    <div
                                        key={rider._id}
                                        onClick={() => setSelectedRider(p => p?._id === rider._id ? null : rider)}
                                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all border-b border-gray-800/50 ${
                                            selectedRider?._id === rider._id ? 'bg-green-900/20' : 'hover:bg-gray-800/60'
                                        }`}
                                    >
                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm border ${
                                            isActive ? 'bg-green-900/40 border-green-500/40 text-green-300' : 'bg-gray-800 border-gray-700 text-gray-400'
                                        }`}>
                                            {rider.name?.charAt(0)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="font-bold text-white text-sm truncate">{rider.name}</p>
                                                {isFast && <span className="text-[9px] font-black bg-red-900/50 text-red-400 px-1.5 py-0.5 rounded border border-red-500/30">FAST</span>}
                                                {isStuck && <span className="text-[9px] font-black bg-amber-900/50 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/30">STUCK</span>}
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
                                                <p className="text-xs text-gray-400">{rider.vehicleDetails?.vehicleType || 'Rider'}</p>
                                                {live?.activeOrderCount > 0 && (
                                                    <span className="text-[9px] font-bold text-orange-400">
                                                        {live.activeOrderCount} order(s)
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            {kmh !== null && (
                                                <p className={`text-xs font-black ${isFast ? 'text-red-400' : isStuck ? 'text-amber-400' : 'text-blue-400'}`}>
                                                    {kmh} km/h
                                                </p>
                                            )}
                                            {!isActive && <p className="text-[10px] text-gray-600">No GPS</p>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Selected rider detail card */}
                    {selectedRider && (
                        <div className="bg-gray-900 border border-green-500/30 rounded-2xl p-4 shrink-0">
                            <h3 className="font-black text-green-400 text-sm mb-3 flex items-center gap-2">
                                <FiUser size={14} /> {selectedRider.name}
                            </h3>
                            {(() => {
                                const live = liveRiders[selectedRider._id];
                                const kmh  = live ? Math.round(live.speed * 3.6) : null;
                                return (
                                    <div className="space-y-2 text-xs">
                                        {[
                                            ['Vehicle',   selectedRider.vehicleDetails?.vehicleType || '—'],
                                            ['Phone',     selectedRider.phone || '—'],
                                            ['Speed',     kmh !== null ? `${kmh} km/h` : 'No GPS'],
                                            ['Orders',    live?.activeOrderCount ?? '—'],
                                            ['GPS',       live ? `${live.lat?.toFixed(5)}, ${live.lng?.toFixed(5)}` : 'Offline'],
                                            ['Updated',   live ? new Date(live.ts).toLocaleTimeString() : '—'],
                                        ].map(([l, v]) => (
                                            <div key={l} className="flex justify-between">
                                                <span className="text-gray-500 font-medium">{l}</span>
                                                <span className="font-bold text-white">{v}</span>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()}
                            <button
                                onClick={() => setSelectedRider(null)}
                                className="mt-3 w-full py-1.5 text-xs font-bold text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-xl transition-all"
                            >
                                Deselect
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminLiveMap;
