import React, { useEffect, useState, useCallback } from 'react';
import {
    getAllOrders, updateOrderStatus, getAllRiders,
    assignRiderToOrder, triggerAutoAssign,
    getAssignmentHistory, manualAssign
} from '../../services/api';
import {
    FiShoppingCart, FiSearch, FiRefreshCw, FiTruck, FiZap,
    FiUser, FiClock, FiCheckCircle, FiX, FiMapPin, FiList
} from 'react-icons/fi';

const STATUS_COLORS = {
    'Order Placed':        'bg-gray-100 text-gray-700',
    'Merchant Accepted':   'bg-blue-100 text-blue-700',
    'Packed':              'bg-indigo-100 text-indigo-700',
    'Ready for Pickup':    'bg-purple-100 text-purple-700',
    'Waiting for Rider':   'bg-yellow-100 text-yellow-700',
    'Rider Assigned':      'bg-blue-100 text-blue-800',
    'Picked Up':           'bg-violet-100 text-violet-800',
    'In Transit':          'bg-orange-100 text-orange-800',
    'Out for Delivery':    'bg-amber-100 text-amber-800',
    'Delivered':           'bg-green-100 text-green-800',
    'Completed':           'bg-emerald-100 text-emerald-700',
    'Cancelled':           'bg-red-100 text-red-700',
};

const ALL_STATUSES = [
    'Order Placed','Merchant Accepted','Packed','Ready for Pickup',
    'Waiting for Rider','Rider Assigned','Picked Up','In Transit',
    'Out for Delivery','Delivered','Completed','Cancelled'
];

const UNASSIGNED_STATUSES = ['Order Placed','Merchant Accepted','Packed','Ready for Pickup','Waiting for Rider'];

const AdminOrders = () => {
    const [orders, setOrders]             = useState([]);
    const [riders, setRiders]             = useState([]);
    const [loading, setLoading]           = useState(true);
    const [search, setSearch]             = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [selected, setSelected]         = useState(null);
    const [history, setHistory]           = useState([]);
    const [histLoading, setHistLoading]   = useState(false);
    const [assignRiderId, setAssignRiderId] = useState('');
    const [actionLoading, setActionLoading] = useState(null);
    const [toast, setToast]               = useState(null);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [ordRes, ridRes] = await Promise.all([
                getAllOrders(),
                getAllRiders({ status: 'active', limit: 200 }),
            ]);
            const ords = ordRes?.data || ordRes || [];
            setOrders(Array.isArray(ords) ? ords : []);
            setRiders(ridRes?.riders || []);
        } catch(e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const openDetail = async (order) => {
        setSelected(order);
        setAssignRiderId('');
        setHistLoading(true);
        try {
            const res = await getAssignmentHistory(order._id);
            setHistory(res?.assignments || res?.data || []);
        } catch { setHistory([]); } finally { setHistLoading(false); }
    };

    const handleStatusChange = async (id, status) => {
        setActionLoading(`status-${id}`);
        try {
            await updateOrderStatus(id, status);
            showToast(`Order updated to "${status}"`);
            setOrders(o => o.map(ord => ord._id === id ? { ...ord, orderStatus: status } : ord));
            if (selected?._id === id) setSelected(s => ({ ...s, orderStatus: status }));
        } catch(e) {
            showToast(e.response?.data?.message || 'Failed to update status', 'error');
        } finally { setActionLoading(null); }
    };

    const handleManualAssign = async () => {
        if (!assignRiderId) return showToast('Select a rider first', 'error');
        setActionLoading('assign');
        try {
            await manualAssign(selected._id, assignRiderId, 'Manual admin assignment');
            showToast('Rider assigned successfully!');
            setAssignRiderId('');
            await fetchData();
            openDetail({ ...selected, orderStatus: 'Rider Assigned' });
        } catch(e) {
            showToast(e.response?.data?.message || 'Assignment failed', 'error');
        } finally { setActionLoading(null); }
    };

    const handleAutoAssign = async (orderId) => {
        setActionLoading(`auto-${orderId}`);
        try {
            await triggerAutoAssign(orderId);
            showToast('Auto-assignment triggered!');
            fetchData();
            if (selected?._id === orderId) setSelected(null);
        } catch(e) {
            showToast(e.response?.data?.message || 'No riders available', 'error');
        } finally { setActionLoading(null); }
    };

    const filtered = orders.filter(o => {
        const matchSearch = !search ||
            o._id.includes(search) ||
            o.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
            o.user?.email?.toLowerCase().includes(search.toLowerCase());
        const matchStatus = !statusFilter || o.orderStatus === statusFilter;
        return matchSearch && matchStatus;
    });

    const unassigned = filtered.filter(o => UNASSIGNED_STATUSES.includes(o.orderStatus));
    const inProgress = filtered.filter(o => ['Rider Assigned','Picked Up','In Transit','Out for Delivery'].includes(o.orderStatus));
    const done       = filtered.filter(o => ['Delivered','Completed','Cancelled'].includes(o.orderStatus));

    return (
        <div className="p-6 md:p-8 h-full">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-xl font-semibold text-sm transition-all ${toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
                    {toast.msg}
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                        <FiShoppingCart className="text-green-500" /> Order Management
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">{orders.length} total orders</p>
                </div>
                <button onClick={fetchData} className="flex items-center gap-2 bg-white border border-gray-200 text-gray-600 font-bold py-2.5 px-4 rounded-xl hover:bg-gray-50 text-sm transition-all">
                    <FiRefreshCw className={loading ? 'animate-spin' : ''} /> Refresh
                </button>
            </div>

            {/* Stat Pills */}
            <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                    { label: 'Unassigned', count: unassigned.length, color: 'bg-yellow-50 text-yellow-700', dot: 'bg-yellow-400' },
                    { label: 'In Transit',  count: inProgress.length, color: 'bg-blue-50 text-blue-700',   dot: 'bg-blue-400' },
                    { label: 'Completed',  count: done.length,        color: 'bg-green-50 text-green-700', dot: 'bg-green-400' },
                ].map(s => (
                    <div key={s.label} className={`rounded-2xl p-4 flex items-center gap-3 ${s.color}`}>
                        <span className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
                        <div>
                            <p className="text-2xl font-black">{s.count}</p>
                            <p className="text-xs font-bold opacity-70">{s.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex gap-3 mb-5 flex-wrap">
                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 flex-1 min-w-52">
                    <FiSearch className="text-gray-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search by ID, customer..."
                        className="py-2.5 text-sm flex-1 focus:outline-none" />
                    {search && (
                        <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600">
                            <FiX className="w-4 h-4" />
                        </button>
                    )}
                </div>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                    className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white text-gray-700 focus:outline-none">
                    <option value="">All Statuses</option>
                    {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>

            {/* Layout: Table + Detail Panel */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Orders Table */}
                <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                    {loading ? (
                        <div className="p-12 text-center text-gray-400">
                            <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                            Loading orders...
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="p-12 text-center">
                            <FiShoppingCart className="mx-auto text-5xl text-gray-200 mb-3" />
                            <p className="text-gray-400 font-medium">No orders match your filters</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold tracking-wider">
                                    <tr>
                                        <th className="px-5 py-3.5">Order</th>
                                        <th className="px-5 py-3.5">Customer</th>
                                        <th className="px-5 py-3.5">Status</th>
                                        <th className="px-5 py-3.5">Rider</th>
                                        <th className="px-5 py-3.5 text-right">Amount</th>
                                        <th className="px-5 py-3.5">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filtered.map(order => (
                                        <tr key={order._id}
                                            onClick={() => openDetail(order)}
                                            className={`hover:bg-gray-50/60 cursor-pointer transition-colors ${selected?._id === order._id ? 'bg-green-50/40 border-l-2 border-green-500' : ''}`}>
                                            <td className="px-5 py-3.5">
                                                <p className="font-black text-gray-900 font-mono text-xs">#{order._id?.slice(-8)}</p>
                                                <p className="text-xs text-gray-400 mt-0.5">{new Date(order.createdAt).toLocaleDateString('en-IN')}</p>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <p className="font-bold text-gray-800 text-sm">{order.user?.name || 'Customer'}</p>
                                                <p className="text-xs text-gray-400 truncate max-w-28">{order.shippingAddress?.city}</p>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap ${STATUS_COLORS[order.orderStatus] || 'bg-gray-100 text-gray-600'}`}>
                                                    {order.orderStatus}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                {order.rider ? (
                                                    <div className="flex items-center gap-1.5 text-xs">
                                                        <FiTruck className="text-green-500 w-3 h-3" />
                                                        <span className="font-bold text-gray-700">{order.rider?.name || 'Assigned'}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-400 italic">Unassigned</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3.5 text-right">
                                                <span className="font-black text-green-600">₹{order.totalPrice?.toFixed(0)}</span>
                                            </td>
                                            <td className="px-5 py-3.5" onClick={e => e.stopPropagation()}>
                                                <div className="flex gap-1">
                                                    {UNASSIGNED_STATUSES.includes(order.orderStatus) && (
                                                        <button
                                                            onClick={() => handleAutoAssign(order._id)}
                                                            disabled={actionLoading === `auto-${order._id}`}
                                                            title="Auto-assign rider"
                                                            className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-all disabled:opacity-60">
                                                            <FiZap className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => openDetail(order)}
                                                        title="View details"
                                                        className="p-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-all">
                                                        <FiList className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Detail Panel */}
                <div className="xl:col-span-1">
                    {!selected ? (
                        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
                            <FiList className="mx-auto text-5xl text-gray-200 mb-3" />
                            <p className="text-gray-400 font-medium text-sm">Select an order to view details</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="p-5 border-b border-gray-50 flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-gray-400">Order ID</p>
                                    <p className="font-black text-gray-900 font-mono text-sm">#{selected._id?.slice(-8)}</p>
                                </div>
                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_COLORS[selected.orderStatus] || 'bg-gray-100'}`}>
                                    {selected.orderStatus}
                                </span>
                            </div>

                            {/* Customer Info */}
                            <div className="p-5 border-b border-gray-50 space-y-2">
                                <div className="flex items-center gap-2">
                                    <FiUser className="text-gray-400 w-4 h-4" />
                                    <div>
                                        <p className="font-bold text-gray-800 text-sm">{selected.user?.name}</p>
                                        <p className="text-xs text-gray-400">{selected.user?.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2 mt-2 bg-gray-50 rounded-xl p-3">
                                    <FiMapPin className="text-green-500 w-4 h-4 mt-0.5 flex-shrink-0" />
                                    <p className="text-xs text-gray-600 leading-relaxed">
                                        {selected.shippingAddress?.address}, {selected.shippingAddress?.city} — {selected.shippingAddress?.postalCode}
                                    </p>
                                </div>
                            </div>

                            {/* Rider Assignment */}
                            <div className="p-5 border-b border-gray-50">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                                    {selected.rider ? 'Reassign Rider' : 'Assign Rider'}
                                </p>
                                {selected.rider && (
                                    <div className="flex items-center gap-2 bg-green-50 rounded-xl p-3 mb-3">
                                        <FiTruck className="text-green-600 w-4 h-4" />
                                        <div>
                                            <p className="text-sm font-bold text-green-800">{selected.rider?.name || 'Rider Assigned'}</p>
                                            <p className="text-xs text-green-600">{selected.rider?.phone}</p>
                                        </div>
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    <select value={assignRiderId} onChange={e => setAssignRiderId(e.target.value)}
                                        className="flex-1 p-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400">
                                        <option value="">Select rider...</option>
                                        {riders.filter(r => r.isAvailable || r.status === 'active').map(r => (
                                            <option key={r._id} value={r._id}>{r.name} – {r.phone}</option>
                                        ))}
                                    </select>
                                    <button onClick={handleManualAssign}
                                        disabled={actionLoading === 'assign' || !assignRiderId}
                                        className="px-3 py-2 bg-green-500 text-white rounded-xl text-xs font-bold hover:bg-green-600 disabled:opacity-50 transition-all">
                                        Assign
                                    </button>
                                </div>
                                <button
                                    onClick={() => handleAutoAssign(selected._id)}
                                    disabled={actionLoading === `auto-${selected._id}`}
                                    className="flex items-center justify-center gap-2 w-full mt-2 py-2 bg-indigo-50 text-indigo-700 font-bold rounded-xl text-xs hover:bg-indigo-100 transition-all disabled:opacity-50">
                                    <FiZap className="w-3.5 h-3.5" /> Auto-Assign via Engine
                                </button>
                            </div>

                            {/* Status Update */}
                            <div className="p-5 border-b border-gray-50">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Update Status</p>
                                <select
                                    value={selected.orderStatus}
                                    onChange={e => handleStatusChange(selected._id, e.target.value)}
                                    disabled={actionLoading === `status-${selected._id}`}
                                    className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
                                    {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>

                            {/* Order Items */}
                            {selected.orderItems?.length > 0 && (
                                <div className="p-5 border-b border-gray-50">
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                                        Items ({selected.orderItems.length})
                                    </p>
                                    <div className="space-y-2 max-h-36 overflow-y-auto">
                                        {selected.orderItems.map((item, i) => (
                                            <div key={i} className="flex items-center justify-between text-sm">
                                                <span className="text-gray-700 font-medium truncate flex-1">{item.name}</span>
                                                <span className="text-gray-400 ml-2">×{item.quantity}</span>
                                                <span className="font-bold text-gray-800 ml-3">₹{item.price}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between">
                                        <span className="font-bold text-gray-600 text-sm">Total</span>
                                        <span className="font-black text-green-600">₹{selected.totalPrice?.toFixed(0)}</span>
                                    </div>
                                </div>
                            )}

                            {/* Assignment History */}
                            <div className="p-5">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <FiClock className="w-3.5 h-3.5" /> Assignment History
                                </p>
                                {histLoading ? (
                                    <p className="text-xs text-gray-400 text-center py-3">Loading...</p>
                                ) : history.length === 0 ? (
                                    <p className="text-xs text-gray-400 italic">No assignment history</p>
                                ) : (
                                    <div className="space-y-2 max-h-32 overflow-y-auto">
                                        {history.map((h, i) => (
                                            <div key={h._id || i} className="flex items-center gap-2 text-xs">
                                                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${h.status === 'delivered' ? 'bg-green-400' : h.status === 'rejected' ? 'bg-red-400' : 'bg-blue-400'}`} />
                                                <span className="font-bold text-gray-700 truncate">
                                                    {h.rider?.name || 'Rider'}
                                                </span>
                                                <span className="text-gray-400 capitalize ml-auto">{h.status}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminOrders;
