import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { getMyOrders } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { addToCart } from '../services/api';
import {
    FiPackage,
    FiClock,
    FiCheckCircle,
    FiXCircle,
    FiAlertCircle,
    FiRefreshCw,
    FiShoppingBag,
    FiCalendar,
    FiRotateCcw,
    FiTruck,
    FiMapPin,
    FiDollarSign,
} from 'react-icons/fi';

// Lazy-load heavy tracking components so a socket error never crashes the page
import OrderTracking from '../components/OrderTracking';
import DeliveryTimer from '../components/DeliveryTimer';

/* ─── Helpers ──────────────────────────────────────────────────── */
const STATUS_META = {
    Delivered:       { color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: FiCheckCircle,  dot: 'bg-emerald-500' },
    Cancelled:       { color: 'bg-red-100 text-red-800 border-red-200',             icon: FiXCircle,      dot: 'bg-red-500'     },
    'Out for Delivery': { color: 'bg-blue-100 text-blue-800 border-blue-200',       icon: FiTruck,        dot: 'bg-blue-500'    },
    Pending:         { color: 'bg-amber-100 text-amber-800 border-amber-200',        icon: FiClock,        dot: 'bg-amber-500'   },
};

const getStatusMeta = (status) =>
    STATUS_META[status] || { color: 'bg-orange-100 text-orange-800 border-orange-200', icon: FiClock, dot: 'bg-orange-400' };

const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
    });
};

/* ─── Sub-components ───────────────────────────────────────────── */
const LoadingSkeleton = () => (
    <div className="space-y-6 animate-pulse">
        {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
                <div className="bg-gray-100 h-24 w-full" />
                <div className="p-6 space-y-3">
                    <div className="h-4 bg-gray-100 rounded-full w-1/3" />
                    <div className="h-4 bg-gray-100 rounded-full w-1/2" />
                    <div className="grid grid-cols-3 gap-3 pt-2">
                        {[1, 2, 3].map((j) => (
                            <div key={j} className="h-28 bg-gray-100 rounded-2xl" />
                        ))}
                    </div>
                </div>
            </div>
        ))}
    </div>
);

const EmptyOrders = ({ onShop }) => (
    <div className="flex flex-col items-center justify-center text-center py-24 px-6">
        <div className="relative mb-8">
            <div className="w-32 h-32 bg-gradient-to-br from-green-50 to-emerald-100 rounded-full flex items-center justify-center shadow-inner">
                <FiPackage className="w-14 h-14 text-emerald-400" />
            </div>
            <span className="absolute -bottom-1 -right-1 w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-xl shadow">
                🛒
            </span>
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-2">No Orders Yet</h2>
        <p className="text-gray-500 max-w-xs mb-8 leading-relaxed">
            Looks like you haven't placed any orders yet. Start shopping and your orders will appear here.
        </p>
        <button
            onClick={onShop}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold h-12 px-8 rounded-2xl shadow-lg hover:shadow-xl transition-all active:scale-95 transform hover:-translate-y-0.5"
        >
            <FiShoppingBag className="w-5 h-5" /> Start Shopping
        </button>
    </div>
);

const ErrorState = ({ message, onRetry }) => (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6">
        <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-6">
            <FiAlertCircle className="w-12 h-12 text-red-400" />
        </div>
        <h2 className="text-xl font-black text-gray-900 mb-2">Something went wrong</h2>
        <p className="text-gray-500 max-w-sm mb-6 text-sm leading-relaxed">{message}</p>
        <button
            onClick={onRetry}
            className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white font-bold h-11 px-6 rounded-2xl transition-all active:scale-95"
        >
            <FiRefreshCw className="w-4 h-4" /> Try Again
        </button>
    </div>
);

const OrderStatusBadge = ({ status }) => {
    const meta = getStatusMeta(status);
    const Icon = meta.icon;
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${meta.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
            <Icon className="w-3.5 h-3.5" />
            {status || 'Processing'}
        </span>
    );
};

const ProductItem = ({ item }) => (
    <div className="flex flex-col bg-gray-50 border border-gray-100 hover:border-green-200 rounded-2xl p-3 transition-all duration-200 hover:shadow-sm group">
        <div className="h-20 flex items-center justify-center bg-white rounded-xl mb-2 overflow-hidden p-1">
            {item.image ? (
                <img
                    src={item.image}
                    alt={item.name}
                    className="max-h-full max-w-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-300"
                    onError={(e) => { e.target.style.display = 'none'; }}
                />
            ) : (
                <FiPackage className="w-8 h-8 text-gray-300" />
            )}
        </div>
        <p className="text-xs font-bold text-gray-800 line-clamp-2 leading-snug mb-1.5 min-h-[2rem]">
            {item.name || 'Product'}
        </p>
        <div className="flex justify-between items-center mt-auto">
            <span className="text-[10px] text-gray-400 font-semibold bg-gray-200 px-1.5 py-0.5 rounded-md">
                Qty: {item.quantity}
            </span>
            <span className="text-xs font-black text-gray-900">₹{item.price}</span>
        </div>
    </div>
);

const ReorderButton = ({ order, onReorder }) => (
    <button
        onClick={() => onReorder(order)}
        className="flex items-center gap-1.5 text-xs font-bold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 px-3 py-1.5 rounded-xl transition-all active:scale-95 hover:shadow-sm"
    >
        <FiRotateCcw className="w-3.5 h-3.5" /> Reorder
    </button>
);

/* ─── Main Component ───────────────────────────────────────────── */
const Orders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [reorderSuccess, setReorderSuccess] = useState(null);
    const [expandedOrders, setExpandedOrders] = useState(new Set());

    const { userInfo } = useAuth();
    const navigate = useNavigate();

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            /* ── KEY FIX ──────────────────────────────────────────────────
               api.js getMyOrders() already does: const { data } = await api.get(...)
               That `data` is the Axios response body = { status, message, data: [...] }
               So calling `const { data } = await getMyOrders()` gives us the BODY object.
               We need `.data` from it to get the actual orders array.
            ─────────────────────────────────────────────────────────────── */
            const responseBody = await getMyOrders();
            // Handle both response shapes gracefully
            const ordersArray = responseBody?.data ?? responseBody ?? [];
            const list = Array.isArray(ordersArray) ? ordersArray : [];
            setOrders(list);
            // Auto-expand active orders so map shows immediately
            const activeIds = new Set(
                list
                    .filter(o => ['Rider Assigned','Picked Up','In Transit','Out for Delivery'].includes(o.orderStatus))
                    .map(o => o._id)
            );
            setExpandedOrders(activeIds);
        } catch (err) {
            const msg =
                err?.response?.data?.message ||
                err?.message ||
                'Failed to load orders. Please try again.';
            console.error('[Orders] Fetch failed:', err);
            setError(msg);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!userInfo) {
            navigate('/login');
            return;
        }
        fetchOrders();
    }, [userInfo, navigate, fetchOrders]);

    // Handle Reorder: add all items back to cart
    const handleReorder = async (order) => {
        try {
            const promises = (order.orderItems || []).map((item) =>
                addToCart(item.product || item._id, item.quantity || 1)
            );
            await Promise.allSettled(promises);
            setReorderSuccess(order._id);
            setTimeout(() => setReorderSuccess(null), 3000);
            navigate('/cart');
        } catch (err) {
            console.error('[Reorder] Failed:', err);
        }
    };

    const toggleTracking = (orderId) =>
        setExpandedOrders((prev) => {
            const next = new Set(prev);
            next.has(orderId) ? next.delete(orderId) : next.add(orderId);
            return next;
        });

    /* ─── Render ─────────────────────────────────────────────────── */
    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-screen">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <span className="p-2 bg-green-100 rounded-xl text-green-600">
                            <FiPackage className="w-7 h-7" />
                        </span>
                        My Orders
                    </h1>
                    {!loading && !error && orders.length > 0 && (
                        <p className="text-gray-500 text-sm mt-1 ml-1">
                            {orders.length} order{orders.length !== 1 ? 's' : ''} found
                        </p>
                    )}
                </div>
                {!loading && (
                    <button
                        onClick={fetchOrders}
                        className="flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 hover:border-gray-300 px-4 py-2 rounded-xl transition-all hover:shadow-sm active:scale-95"
                    >
                        <FiRefreshCw className="w-4 h-4" /> Refresh
                    </button>
                )}
            </div>

            {/* Reorder success toast */}
            {reorderSuccess && (
                <div className="fixed top-6 right-6 z-50 flex items-center gap-2 bg-green-600 text-white text-sm font-bold px-5 py-3 rounded-2xl shadow-2xl animate-bounce">
                    <FiCheckCircle className="w-4 h-4" /> Items added to cart!
                </div>
            )}

            {/* States */}
            {loading && <LoadingSkeleton />}
            {!loading && error && <ErrorState message={error} onRetry={fetchOrders} />}
            {!loading && !error && orders.length === 0 && (
                <EmptyOrders onShop={() => navigate('/')} />
            )}

            {/* Orders List */}
            {!loading && !error && orders.length > 0 && (
                <div className="space-y-5">
                    {orders.map((order) => {
                        const meta = getStatusMeta(order.orderStatus);
                        const isActive = ['Order Placed', 'Packing', 'Waiting for Rider', 'Rider Assigned', 'Picked Up', 'Out for Delivery'].includes(order.orderStatus);
                        const isExpanded = expandedOrders.has(order._id);

                        return (
                            <div
                                key={order._id}
                                className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
                            >
                                {/* Card Header */}
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 px-6 py-5 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                                    <div className="flex items-start gap-4">
                                        <div className={`p-2.5 rounded-xl ${meta.dot.replace('bg-', 'bg-opacity-20 bg-')} border border-opacity-30`}
                                            style={{ background: 'rgba(0,0,0,0.04)' }}>
                                            <FiPackage className="w-5 h-5 text-gray-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-0.5">
                                                Order #{order._id?.substring(0, 8)?.toUpperCase()}
                                            </p>
                                            <p className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                                                <FiCalendar className="w-3.5 h-3.5 text-gray-400" />
                                                {formatDate(order.createdAt)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 flex-wrap">
                                        <OrderStatusBadge status={order.orderStatus} />
                                        <span className="font-black text-lg text-gray-900 flex items-center gap-1">
                                            <FiDollarSign className="w-4 h-4 text-gray-400" />
                                            ₹{order.totalPrice}
                                        </span>
                                        <ReorderButton order={order} onReorder={handleReorder} />
                                    </div>
                                </div>

                                {/* Shipping Address (compact) */}
                                {order.shippingAddress?.address && (
                                    <div className="px-6 py-2 border-b border-gray-50 flex items-center gap-2 text-xs text-gray-500">
                                        <FiMapPin className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
                                        <span className="truncate">
                                            {order.shippingAddress.address}, {order.shippingAddress.city}
                                        </span>
                                    </div>
                                )}

                                {/* Product Items Grid */}
                                {order.orderItems?.length > 0 && (
                                    <div className="p-6">
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                                            {order.orderItems.length} item{order.orderItems.length !== 1 ? 's' : ''}
                                        </p>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                            {order.orderItems.map((item, index) => (
                                                <ProductItem key={item._id || index} item={item} />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Delivery Timer (only for active orders) */}
                                {isActive && (
                                    <div className="px-6 pb-4">
                                        <DeliveryTimer placedAt={order.placedAt || order.createdAt} />
                                    </div>
                                )}

                                {/* Track Order Toggle */}
                                <div className="px-6 pb-5">
                                    <button
                                        onClick={() => toggleTracking(order._id)}
                                        className="w-full flex items-center justify-center gap-2 text-sm font-bold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 py-2.5 rounded-2xl transition-all active:scale-[.98]"
                                    >
                                        <FiTruck className="w-4 h-4" />
                                        {isExpanded ? 'Hide Tracking' : 'Track Order'}
                                    </button>

                                    {isExpanded && (
                                        <div className="mt-4">
                                            <OrderTracking order={order} />
                                        </div>
                                    )}
                                </div>

                                {/* Price Breakdown Footer */}
                                <div className="grid grid-cols-3 divide-x divide-gray-100 border-t border-gray-100 bg-gray-50">
                                    {[
                                        { label: 'Items', value: `₹${order.itemsPrice || '—'}` },
                                        { label: 'Shipping', value: order.shippingPrice === 0 ? 'Free' : `₹${order.shippingPrice || '—'}` },
                                        { label: 'Total', value: `₹${order.totalPrice}` },
                                    ].map(({ label, value }) => (
                                        <div key={label} className="flex flex-col items-center py-3 px-2">
                                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{label}</span>
                                            <span className="text-sm font-black text-gray-900 mt-0.5">{value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default Orders;
