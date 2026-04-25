import React from 'react';
import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    FiGrid, FiBox, FiList, FiShoppingCart, FiLogOut,
    FiUsers, FiFileText, FiMap, FiDollarSign,
    FiAlertCircle, FiActivity, FiSettings, FiLayers, FiTag
} from 'react-icons/fi';

const AdminLayout = () => {
    const { userInfo, logout } = useAuth();
    const location = useLocation();

    if (!userInfo || userInfo.data.role !== 'admin') {
        return <Navigate to="/admin/login" replace />;
    }

    const menuGroups = [
        {
            label: 'Overview',
            items: [
                { path: '/admin/dashboard', icon: <FiGrid />, label: 'Dashboard' },
                { path: '/admin/analytics', icon: <FiActivity />, label: 'Analytics' },
                { path: '/admin/live-map', icon: <FiMap />, label: 'Live Map' },
            ]
        },
        {
            label: 'Catalog',
            items: [
                { path: '/admin/products', icon: <FiBox />, label: 'Products' },
                { path: '/admin/categories', icon: <FiList />, label: 'Categories' },
                { path: '/admin/coupons', icon: <FiTag />, label: 'Coupons' },
            ]
        },
        {
            label: 'Operations',
            items: [
                { path: '/admin/orders', icon: <FiShoppingCart />, label: 'Orders' },
                { path: '/admin/riders', icon: <FiUsers />, label: 'Riders' },
                { path: '/admin/kyc', icon: <FiFileText />, label: 'Rider KYC' },
                { path: '/admin/shops', icon: <FiFileText />, label: 'Shops & KYC' },
                { path: '/admin/zones', icon: <FiLayers />, label: 'Zones' },
            ]
        },
        {
            label: 'Finance',
            items: [
                { path: '/admin/payouts', icon: <FiDollarSign />, label: 'Payouts' },
            ]
        },
        {
            label: 'Support',
            items: [
                { path: '/admin/disputes', icon: <FiAlertCircle />, label: 'Disputes' },
                { path: '/admin/audit', icon: <FiActivity />, label: 'Audit Logs' },
                { path: '/admin/assignment-config', icon: <FiSettings />, label: 'Assignment Config' },
            ]
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-gray-200 flex flex-col fixed h-full z-10 shadow-sm">
                <div className="h-16 flex items-center px-6 border-b border-gray-100">
                    <Link to="/admin/dashboard" className="text-xl font-black">
                        <span className="text-green-500">10Min</span>
                        <span className="text-gray-800"> Admin</span>
                    </Link>
                </div>
                <div className="flex-1 py-4 px-3 space-y-5 overflow-y-auto">
                    {menuGroups.map((group) => (
                        <div key={group.label}>
                            <p className="text-xs uppercase font-bold text-gray-400 tracking-widest px-3 mb-2">{group.label}</p>
                            <div className="space-y-0.5">
                                {group.items.map((item) => {
                                    const isActive = location.pathname.startsWith(item.path);
                                    return (
                                        <Link
                                            key={item.path}
                                            to={item.path}
                                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all text-sm ${
                                                isActive
                                                    ? 'bg-green-50 text-green-700 shadow-sm'
                                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                            }`}
                                        >
                                            {React.cloneElement(item.icon, { className: `w-4 h-4 ${isActive ? 'text-green-600' : ''}` })}
                                            {item.label}
                                            {item.path === '/admin/kyc' && (
                                                <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">!</span>
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-3 border-t border-gray-100">
                    <div className="px-3 py-2 mb-2">
                        <p className="text-xs text-gray-500">Logged in as</p>
                        <p className="text-sm font-bold text-gray-800 truncate">{userInfo?.data?.name}</p>
                    </div>
                    <button
                        onClick={logout}
                        className="flex items-center gap-3 w-full px-3 py-2.5 text-red-600 rounded-xl hover:bg-red-50 font-medium transition-colors text-sm"
                    >
                        <FiLogOut className="w-4 h-4" /> Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 md:ml-64 bg-gray-50 min-h-screen pb-12">
                <Outlet />
            </main>
        </div>
    );
};

export default AdminLayout;
