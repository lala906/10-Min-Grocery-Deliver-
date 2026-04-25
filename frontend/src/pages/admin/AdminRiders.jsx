import React, { useState, useEffect } from 'react';
import { getAllRiders, getAllOrders, assignRiderToOrder, updateRiderStatus, triggerAutoAssign } from '../../services/api';
import { FiUsers, FiMapPin, FiCheckCircle, FiSlash, FiZap, FiSearch, FiFilter } from 'react-icons/fi';

const statusColors = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-600',
    suspended: 'bg-yellow-100 text-yellow-800',
    blacklisted: 'bg-red-100 text-red-800',
};

const kycColors = {
    not_submitted: 'bg-gray-100 text-gray-500',
    pending: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
};

const AdminRiders = () => {
    const [riders, setRiders] = useState([]);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState('');
    const [selectedRider, setSelectedRider] = useState('');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [toast, setToast] = useState(null);
    const [actionLoading, setActionLoading] = useState(null);

    const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

    const fetchData = async () => {
        try {
            const [ridersRes, ordersRes] = await Promise.all([getAllRiders(), getAllOrders()]);
            setRiders(ridersRes.riders || ridersRes.data || ridersRes || []);
            const allOrders = ordersRes.data || ordersRes || [];
            setOrders(allOrders.filter(o => ['Order Placed', 'Merchant Accepted', 'Packed', 'Ready for Pickup', 'Waiting for Rider'].includes(o.orderStatus)));
        } catch (error) {
            console.error('Failed to fetch data', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleAssign = async () => {
        if (!selectedOrder || !selectedRider) return showToast('Select an order and a rider', 'error');
        setActionLoading('assign');
        try {
            await assignRiderToOrder(selectedOrder, selectedRider);
            showToast('Rider successfully assigned!');
            setOrders(orders.filter(o => o._id !== selectedOrder));
            setSelectedOrder(''); setSelectedRider('');
        } catch (e) { showToast('Failed to assign rider', 'error'); } finally { setActionLoading(null); }
    };

    const handleAutoAssign = async () => {
        if (!selectedOrder) return showToast('Select an order first', 'error');
        setActionLoading('auto');
        try {
            await triggerAutoAssign(selectedOrder);
            showToast('Auto-assignment triggered!');
            setOrders(orders.filter(o => o._id !== selectedOrder));
            setSelectedOrder('');
        } catch (e) { showToast(e.response?.data?.message || 'Auto-assign failed', 'error'); } finally { setActionLoading(null); }
    };

    const handleStatusChange = async (rider, status) => {
        const reason = status !== 'active' ? prompt(`Reason for ${status}:`) : undefined;
        setActionLoading(rider._id);
        try {
            await updateRiderStatus(rider._id, status, reason);
            showToast(`Rider ${status}`);
            fetchData();
        } catch (e) { showToast('Failed to update status', 'error'); } finally { setActionLoading(null); }
    };

    const filtered = riders.filter(r => {
        const matchSearch = !search || r.name?.toLowerCase().includes(search.toLowerCase()) || r.phone?.includes(search);
        const matchStatus = !statusFilter || r.status === statusFilter;
        return matchSearch && matchStatus;
    });

    if (loading) return <div className="p-8 text-center font-bold text-gray-400">Loading Riders...</div>;

    return (
        <div className="p-6 md:p-8">
            {toast && (
                <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-xl font-semibold text-sm ${toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
                    {toast.msg}
                </div>
            )}

            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                        <FiUsers className="text-green-500" /> Delivery Partners
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">{riders.length} total riders</p>
                </div>
            </div>

            {/* Assignment Panel */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
                <h3 className="text-lg font-black mb-4 text-gray-900">Assign Order to Rider</h3>
                <div className="flex flex-col md:flex-row gap-3">
                    <select value={selectedOrder} onChange={(e) => setSelectedOrder(e.target.value)}
                        className="flex-1 p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
                        <option value="">Select Unassigned Order...</option>
                        {orders.map(order => (
                            <option key={order._id} value={order._id}>
                                #{order._id.slice(-6)} — {order.shippingAddress?.address?.slice(0, 30)}... ({order.orderStatus})
                            </option>
                        ))}
                    </select>
                    <select value={selectedRider} onChange={(e) => setSelectedRider(e.target.value)}
                        className="flex-1 p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
                        <option value="">Select Rider...</option>
                        {riders.filter(r => r.isAvailable && r.status === 'active').map(rider => (
                            <option key={rider._id} value={rider._id}>{rider.name} — {rider.phone}</option>
                        ))}
                    </select>
                    <button onClick={handleAssign} disabled={actionLoading === 'assign'}
                        className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-xl shadow transition-all active:scale-95 disabled:opacity-60 text-sm">
                        Assign
                    </button>
                    <button onClick={handleAutoAssign} disabled={actionLoading === 'auto'}
                        className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3 px-6 rounded-xl shadow transition-all active:scale-95 disabled:opacity-60 text-sm">
                        <FiZap /> Auto-Assign
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-3 mb-4 flex-wrap">
                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 flex-1 min-w-48">
                    <FiSearch className="text-gray-400" />
                    <input type="text" placeholder="Search by name or phone..." value={search} onChange={e => setSearch(e.target.value)}
                        className="py-2.5 text-sm flex-1 focus:outline-none" />
                </div>
                <div className="flex gap-2">
                    {['', 'active', 'inactive', 'suspended', 'blacklisted'].map(s => (
                        <button key={s} onClick={() => setStatusFilter(s)}
                            className={`px-3 py-2 rounded-xl text-xs font-bold capitalize transition-all ${statusFilter === s ? 'bg-green-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                            {s || 'All'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Rider</th>
                                <th className="px-6 py-4">Vehicle</th>
                                <th className="px-6 py-4">KYC</th>
                                <th className="px-6 py-4">Account Status</th>
                                <th className="px-6 py-4">Availability</th>
                                <th className="px-6 py-4">Location</th>
                                <th className="px-6 py-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filtered.map((rider) => (
                                <tr key={rider._id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <p className="font-bold text-gray-900">{rider.name}</p>
                                        <p className="text-xs text-gray-400">{rider.phone}</p>
                                        {rider.totalDeliveries > 0 && <p className="text-xs text-green-600 font-medium">{rider.totalDeliveries} deliveries</p>}
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        <p className="font-medium text-gray-700">{rider.vehicleDetails?.vehicleType || '—'}</p>
                                        <p className="text-xs text-gray-400">{rider.vehicleDetails?.numberPlate || ''}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${kycColors[rider.kycStatus || 'not_submitted']}`}>
                                            {(rider.kycStatus || 'not_submitted').replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${statusColors[rider.status || 'inactive']}`}>
                                            {rider.status || 'inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${rider.isOnline ? 'bg-blue-100 text-blue-700' : rider.isAvailable ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${rider.isOnline ? 'bg-blue-500 animate-pulse' : rider.isAvailable ? 'bg-green-500' : 'bg-gray-400'}`} />
                                            {rider.isOnline ? 'Online' : rider.isAvailable ? 'Available' : 'Offline'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        {rider.currentLocation?.lat ? (
                                            <span className="inline-flex items-center gap-1 text-blue-600 font-mono text-xs">
                                                <FiMapPin className="w-3 h-3" />
                                                {rider.currentLocation.lat.toFixed(3)}, {rider.currentLocation.lng.toFixed(3)}
                                            </span>
                                        ) : <span className="text-gray-300 italic text-xs">No signal</span>}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-1">
                                            {rider.status !== 'active' && (
                                                <button onClick={() => handleStatusChange(rider, 'active')} disabled={actionLoading === rider._id}
                                                    className="px-2.5 py-1.5 bg-green-50 text-green-700 font-bold rounded-lg text-xs hover:bg-green-100 transition-all">
                                                    Activate
                                                </button>
                                            )}
                                            {rider.status !== 'suspended' && (
                                                <button onClick={() => handleStatusChange(rider, 'suspended')} disabled={actionLoading === rider._id}
                                                    className="px-2.5 py-1.5 bg-yellow-50 text-yellow-700 font-bold rounded-lg text-xs hover:bg-yellow-100 transition-all">
                                                    Suspend
                                                </button>
                                            )}
                                            {rider.status !== 'blacklisted' && (
                                                <button onClick={() => handleStatusChange(rider, 'blacklisted')} disabled={actionLoading === rider._id}
                                                    className="px-2.5 py-1.5 bg-red-50 text-red-700 font-bold rounded-lg text-xs hover:bg-red-100 transition-all">
                                                    <FiSlash className="inline w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filtered.length === 0 && (
                        <div className="py-12 text-center text-gray-400">
                            <FiUsers className="mx-auto text-4xl mb-3" />
                            <p>No riders match your filters</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminRiders;
