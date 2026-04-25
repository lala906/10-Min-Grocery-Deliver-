import React, { useEffect, useState } from 'react';
import { getAdminDashboard } from '../../services/api';
import { Link } from 'react-router-dom';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
    Chart as ChartJS, CategoryScale, LinearScale, BarElement,
    Title, Tooltip, Legend, ArcElement
} from 'chart.js';
import {
    FiUsers, FiShoppingCart, FiTruck, FiDollarSign,
    FiAlertCircle, FiFileText, FiRadio, FiActivity
} from 'react-icons/fi';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const StatCard = ({ label, value, icon, color, sub, to }) => {
    const card = (
        <div className={`bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-md transition-all group`}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs uppercase font-bold text-gray-400 tracking-widest mb-2">{label}</p>
                    <p className={`text-3xl font-black ${color}`}>{value}</p>
                    {sub && <p className="text-xs text-gray-400 mt-1 font-medium">{sub}</p>}
                </div>
                <div className={`p-3 rounded-xl bg-gray-50 group-hover:scale-110 transition-transform ${color}`}>
                    {React.cloneElement(icon, { className: 'w-5 h-5' })}
                </div>
            </div>
        </div>
    );
    return to ? <Link to={to}>{card}</Link> : card;
};

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getAdminDashboard()
            .then(data => setStats(data?.data || data))
            .catch(err => console.error('Dashboard error:', err))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <div className="p-8 flex items-center justify-center min-h-screen">
            <div className="text-center">
                <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-500 font-medium">Loading Dashboard...</p>
            </div>
        </div>
    );

    if (!stats) return <div className="p-8 text-center text-red-500">Failed to load stats</div>;

    const monthlyLabels = stats.monthlyRevenue?.map(m => {
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return `${months[(m._id.month || 1) - 1]} ${m._id.year || ''}`;
    }) || [];

    const barData = {
        labels: monthlyLabels,
        datasets: [{
            label: 'Revenue (₹)',
            data: stats.monthlyRevenue?.map(m => m.total) || [],
            backgroundColor: 'rgba(16,185,129,0.7)',
            borderRadius: 8,
            hoverBackgroundColor: 'rgba(16,185,129,1)',
        }],
    };

    const donutData = {
        labels: ['Active Riders', 'Offline Riders'],
        datasets: [{
            data: [stats.onlineRiders || 0, (stats.totalRiders || 0) - (stats.onlineRiders || 0)],
            backgroundColor: ['#10b981', '#e5e7eb'],
            borderWidth: 0,
        }],
    };

    const barOptions = {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            x: { grid: { display: false } },
            y: { grid: { color: '#f3f4f6' }, ticks: { callback: v => `₹${v}` } }
        }
    };

    const orderStatusCounts = {};
    (stats.recentOrders || []).forEach(o => {
        orderStatusCounts[o.orderStatus] = (orderStatusCounts[o.orderStatus] || 0) + 1;
    });

    return (
        <div className="p-6 md:p-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-black text-gray-900">Dashboard Overview</h1>
                    <p className="text-gray-500 text-sm mt-1">
                        {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
                <Link to="/admin/live-map"
                    className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-2.5 px-5 rounded-xl text-sm transition-all shadow shadow-green-200">
                    <FiRadio className="animate-pulse" /> Live Map
                </Link>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard label="Total Users"     value={stats.totalUsers     || 0} icon={<FiUsers />}        color="text-blue-600"   />
                <StatCard label="Total Orders"    value={stats.totalOrders    || 0} icon={<FiShoppingCart />} color="text-green-600"  to="/admin/orders" sub={`${stats.ordersInProgress || 0} in progress`} />
                <StatCard label="Total Revenue"   value={`₹${(stats.totalRevenue || 0).toFixed(0)}`} icon={<FiDollarSign />} color="text-emerald-600" />
                <StatCard label="Total Riders"    value={stats.totalRiders    || 0} icon={<FiTruck />}        color="text-purple-600" to="/admin/riders" sub={`${stats.onlineRiders || 0} online now`} />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard label="Active Riders"  value={stats.activeRiders   || 0} icon={<FiTruck />}       color="text-green-600"   to="/admin/riders" />
                <StatCard label="KYC Pending"    value={stats.pendingKYC     || 0} icon={<FiFileText />}    color="text-yellow-600"  to="/admin/kyc"    sub="Needs review" />
                <StatCard label="Open Disputes"  value={stats.openDisputes   || 0} icon={<FiAlertCircle />} color="text-red-600"     to="/admin/disputes" sub="Active cases" />
                <StatCard label="Online Now"     value={stats.onlineRiders   || 0} icon={<FiRadio />}       color="text-blue-500"    to="/admin/live-map" sub="Riders online" />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="font-black text-gray-800 mb-5">Monthly Revenue</h3>
                    <div className="h-52">
                        <Bar data={barData} options={barOptions} />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="font-black text-gray-800 mb-5">Rider Status</h3>
                    <div className="h-40 flex items-center justify-center">
                        <Doughnut data={donutData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
                    </div>
                    <div className="mt-4 text-center">
                        <p className="text-3xl font-black text-green-600">{stats.onlineRiders || 0}</p>
                        <p className="text-xs text-gray-400 font-medium">of {stats.totalRiders || 0} riders online</p>
                    </div>
                </div>
            </div>

            {/* Top Products + Recent Orders */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="font-black text-gray-800 mb-4 flex items-center gap-2">
                        <FiActivity className="text-green-500" /> Top Selling Products
                    </h3>
                    <ul className="space-y-3">
                        {(stats.topProducts || []).slice(0, 5).map((p, i) => (
                            <li key={p._id} className="flex items-center gap-3">
                                <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-black flex items-center justify-center">{i + 1}</span>
                                <span className="font-bold text-gray-800 flex-1 text-sm capitalize">{p.name}</span>
                                <span className="text-xs font-bold bg-green-500 text-white px-2.5 py-1 rounded-full">{p.totalQuantity} sold</span>
                            </li>
                        ))}
                        {(!stats.topProducts || stats.topProducts.length === 0) && (
                            <li className="text-center text-gray-400 italic py-4">No products sold yet</li>
                        )}
                    </ul>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="font-black text-gray-800 mb-4 flex items-center justify-between">
                        <span className="flex items-center gap-2"><FiShoppingCart className="text-green-500" /> Recent Orders</span>
                        <Link to="/admin/orders" className="text-sm text-green-600 font-bold hover:underline">View all →</Link>
                    </h3>
                    <div className="space-y-3">
                        {(stats.recentOrders || []).slice(0, 5).map(order => (
                            <div key={order._id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-black text-gray-500">
                                    #{order._id.slice(-3)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-gray-800 text-sm truncate">{order.user?.name || 'Customer'}</p>
                                    <p className="text-xs text-gray-400">{order.orderStatus}</p>
                                </div>
                                <p className="font-black text-green-600 text-sm">₹{order.totalPrice?.toFixed(0)}</p>
                            </div>
                        ))}
                        {(!stats.recentOrders || stats.recentOrders.length === 0) && (
                            <p className="text-center text-gray-400 italic py-4">No recent orders</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
