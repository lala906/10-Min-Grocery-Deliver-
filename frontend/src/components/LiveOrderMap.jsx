import React, { useEffect, useRef, useState, useCallback } from 'react';

/* ── Leaflet CSS loader ─────────────────────────────────────────── */
let leafletCSSInjected = false;
const injectLeafletCSS = () => {
    if (leafletCSSInjected || typeof document === 'undefined') return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    leafletCSSInjected = true;
};

/* ── Heading-aware rider SVG ─────────────────────────────────────── */
const makeRiderIcon = (L, heading = 0, speed = 0) => {
    const isMoving = speed > 0.5;
    const pulseColor = isMoving ? '#16a34a' : '#f59e0b';
    return L.divIcon({
        html: `
            <div style="position:relative;width:52px;height:52px;">
                <!-- pulse ring -->
                <div style="
                    position:absolute;inset:-8px;
                    border-radius:50%;
                    background:${pulseColor}22;
                    animation:livePulse 1.8s infinite;
                "></div>
                <!-- bike container, rotated by heading -->
                <div style="
                    width:52px;height:52px;
                    display:flex;align-items:center;justify-content:center;
                    transform:rotate(${heading}deg);
                    transition:transform 0.6s ease;
                ">
                    <div style="
                        width:44px;height:44px;
                        background:linear-gradient(135deg,#16a34a,#15803d);
                        border-radius:50%;
                        border:3px solid white;
                        box-shadow:0 4px 20px rgba(22,163,74,0.55);
                        display:flex;align-items:center;justify-content:center;
                        font-size:22px;line-height:1;
                    ">🛵</div>
                </div>
                <!-- speed chip -->
                ${speed > 1 ? `<div style="
                    position:absolute;bottom:-18px;left:50%;transform:translateX(-50%);
                    background:#111827;color:#fff;font-size:9px;font-weight:800;
                    padding:2px 6px;border-radius:999px;white-space:nowrap;
                ">${Math.round(speed * 3.6)} km/h</div>` : ''}
            </div>
            <style>
                @keyframes livePulse {
                    0%,100%{ transform:scale(1); opacity:0.6; }
                    50%{ transform:scale(1.5); opacity:0; }
                }
            </style>
        `,
        className: '',
        iconSize: [52, 52],
        iconAnchor: [26, 26],
        popupAnchor: [0, -30],
    });
};

const makeHomeIcon = (L) => L.divIcon({
    html: `<div style="width:40px;height:40px;background:linear-gradient(135deg,#dc2626,#b91c1c);border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 4px 15px rgba(220,38,38,0.5);display:flex;align-items:center;justify-content:center;"><div style="transform:rotate(45deg);font-size:18px;line-height:1;">🏠</div></div>`,
    className: '',
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -38],
});

const makeStoreIcon = (L) => L.divIcon({
    html: `<div style="width:40px;height:40px;background:linear-gradient(135deg,#7c3aed,#6d28d9);border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 4px 15px rgba(124,58,237,0.5);display:flex;align-items:center;justify-content:center;"><div style="transform:rotate(45deg);font-size:18px;line-height:1;">🏪</div></div>`,
    className: '',
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -38],
});

/* ── Smooth movement with easing ────────────────────────────────── */
const smoothMove = (marker, targetLatLng, durationMs = 900) => {
    if (!marker || !targetLatLng) return;
    const start = marker.getLatLng();
    const startTime = performance.now();
    const animate = (now) => {
        const t = Math.min((now - startTime) / durationMs, 1);
        // Cubic ease-in-out
        const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        marker.setLatLng([
            start.lat + (targetLatLng[0] - start.lat) * ease,
            start.lng + (targetLatLng[1] - start.lng) * ease,
        ]);
        if (t < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
};

/* ── Haversine distance (meters) ────────────────────────────────── */
const haversineM = (lat1, lng1, lat2, lng2) => {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/* ── Map tile options ────────────────────────────────────────────── */
const TILES = {
    dark: {
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        attribution: '© <a href="https://carto.com">CARTO</a>',
    },
    light: {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '© <a href="https://openstreetmap.org">OSM</a>',
    },
};

/* ── Default store coords ────────────────────────────────────────── */
const STORE_LOC = [28.7041, 77.1025];
const GEOFENCE_RADIUS_M = 300;

/* ════════════════════════════════════════════════════════════════════
   LiveOrderMap — props:
     riderLocation : { lat, lng, speed?, heading?, accuracy? }
     destination   : { lat, lng }
     orderId       : string
     status        : string
     pathHistory   : [{lat,lng}]     — breadcrumb trail
     darkMode      : bool
     onNearby      : () => void      — geofence callback
     autoFollow    : bool
   ════════════════════════════════════════════════════════════════════ */
const LiveOrderMap = ({
    riderLocation,
    destination,
    orderId,
    status,
    pathHistory = [],
    darkMode = true,
    onNearby,
    autoFollow = true,
}) => {
    const containerRef   = useRef(null);
    const mapRef         = useRef(null);
    const riderMarkerRef = useRef(null);
    const breadcrumbRef  = useRef(null);
    const geofenceRef    = useRef(null);
    const tileLayerRef   = useRef(null);
    const [isDark, setIsDark] = useState(darkMode);
    const nearbyFiredRef = useRef(false);

    /* ── Bootstrap map once ─────────────────────────────────────── */
    useEffect(() => {
        injectLeafletCSS();
        if (!containerRef.current || mapRef.current) return;

        import('leaflet').then((mod) => {
            const L = mod.default || mod;
            const center = riderLocation?.lat
                ? [riderLocation.lat, riderLocation.lng]
                : destination?.lat
                ? [destination.lat, destination.lng]
                : STORE_LOC;

            const map = L.map(containerRef.current, {
                center,
                zoom: 15,
                zoomControl: false,
                attributionControl: false,
            });
            mapRef.current = map;

            // Zoom control top-right
            L.control.zoom({ position: 'topright' }).addTo(map);

            // Tiles
            const tile = TILES[isDark ? 'dark' : 'light'];
            tileLayerRef.current = L.tileLayer(tile.url, { maxZoom: 19 }).addTo(map);

            // Store marker
            L.marker(STORE_LOC, { icon: makeStoreIcon(L) })
                .addTo(map)
                .bindPopup('<b>🏪 Store</b><br>Your order started here');

            // Destination marker
            if (destination?.lat) {
                L.marker([destination.lat, destination.lng], { icon: makeHomeIcon(L) })
                    .addTo(map)
                    .bindPopup('<b>🏠 Your Location</b><br>Delivery address');

                // Geofence ring
                geofenceRef.current = L.circle([destination.lat, destination.lng], {
                    radius: GEOFENCE_RADIUS_M,
                    color: '#f59e0b',
                    fillColor: '#fef3c7',
                    fillOpacity: 0.15,
                    weight: 2,
                    dashArray: '6 4',
                }).addTo(map);
            }

            // Rider marker
            if (riderLocation?.lat) {
                const rm = L.marker(
                    [riderLocation.lat, riderLocation.lng],
                    { icon: makeRiderIcon(L, riderLocation.heading || 0, riderLocation.speed || 0) }
                ).addTo(map).bindPopup('<b>🛵 Rider</b> — On the way!');
                riderMarkerRef.current = rm;
            }

            // Fit bounds
            const pts = [
                STORE_LOC,
                destination?.lat ? [destination.lat, destination.lng] : null,
                riderLocation?.lat ? [riderLocation.lat, riderLocation.lng] : null,
            ].filter(Boolean);
            if (pts.length > 1) map.fitBounds(L.latLngBounds(pts), { padding: [50, 50] });
        });

        return () => {
            mapRef.current?.remove();
            mapRef.current = null;
            riderMarkerRef.current = null;
            breadcrumbRef.current = null;
            geofenceRef.current = null;
            tileLayerRef.current = null;
            nearbyFiredRef.current = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* ── Toggle tile layer (dark/light) ─────────────────────────── */
    useEffect(() => {
        if (!mapRef.current || !tileLayerRef.current) return;
        import('leaflet').then((mod) => {
            const L = mod.default || mod;
            tileLayerRef.current.remove();
            const tile = TILES[isDark ? 'dark' : 'light'];
            tileLayerRef.current = L.tileLayer(tile.url, { maxZoom: 19 }).addTo(mapRef.current);
            tileLayerRef.current.bringToBack();
        });
    }, [isDark]);

    /* ── Update rider marker on location change ─────────────────── */
    useEffect(() => {
        if (!mapRef.current || !riderLocation?.lat) return;

        import('leaflet').then((mod) => {
            const L = mod.default || mod;
            const newIcon = makeRiderIcon(L, riderLocation.heading || 0, riderLocation.speed || 0);

            if (riderMarkerRef.current) {
                smoothMove(riderMarkerRef.current, [riderLocation.lat, riderLocation.lng]);
                riderMarkerRef.current.setIcon(newIcon);
            } else {
                const rm = L.marker(
                    [riderLocation.lat, riderLocation.lng],
                    { icon: newIcon }
                ).addTo(mapRef.current).bindPopup('<b>🛵 Rider</b> — On the way!');
                riderMarkerRef.current = rm;
            }

            // Auto-follow
            if (autoFollow) {
                mapRef.current.panTo([riderLocation.lat, riderLocation.lng], {
                    animate: true, duration: 0.7,
                });
            }

            // Geofence check
            if (destination?.lat && !nearbyFiredRef.current) {
                const dist = haversineM(riderLocation.lat, riderLocation.lng, destination.lat, destination.lng);
                if (dist <= GEOFENCE_RADIUS_M) {
                    nearbyFiredRef.current = true;
                    onNearby?.();
                }
            }
        });
    }, [riderLocation, destination, autoFollow, onNearby]);

    /* ── Breadcrumb polyline for path history ────────────────────── */
    useEffect(() => {
        if (!mapRef.current || pathHistory.length < 2) return;
        import('leaflet').then((mod) => {
            const L = mod.default || mod;
            const latlngs = pathHistory.map(p => [p.lat, p.lng]);
            if (breadcrumbRef.current) {
                breadcrumbRef.current.setLatLngs(latlngs);
            } else {
                breadcrumbRef.current = L.polyline(latlngs, {
                    color: '#16a34a',
                    weight: 4,
                    opacity: 0.7,
                    dashArray: '8 5',
                    lineJoin: 'round',
                }).addTo(mapRef.current);
            }
        });
    }, [pathHistory]);

    return (
        <div className="relative" style={{ borderRadius: 16, overflow: 'hidden' }}>
            <div
                ref={containerRef}
                style={{ width: '100%', height: '360px' }}
                className="border border-gray-800 shadow-inner"
            />
            {/* Dark/Light toggle */}
            <button
                onClick={() => setIsDark(d => !d)}
                className="absolute top-3 left-3 z-[999] bg-gray-900/80 text-white text-xs font-bold px-3 py-1.5 rounded-xl backdrop-blur border border-white/10 hover:bg-gray-800 transition-all"
            >
                {isDark ? '☀️ Light' : '🌙 Dark'}
            </button>
            {/* Live pulse indicator */}
            <div className="absolute top-3 right-14 z-[999] flex items-center gap-1.5 bg-gray-900/80 backdrop-blur text-green-400 text-xs font-bold px-3 py-1.5 rounded-xl border border-white/10">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                LIVE
            </div>
        </div>
    );
};

export default LiveOrderMap;
