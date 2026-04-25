import React, { useState, useEffect } from 'react';
import { getAdvancedAnalytics } from '../../services/api';
import { FiTrendingUp, FiShoppingBag, FiUsers, FiAlertTriangle, FiDollarSign } from 'react-icons/fi';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const AdminAnalytics = () => {
    const [data, setData] = useState(null);
    const [period, setPeriod] = useState('30');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const res = await getAdvancedAnalytics({ period });
                setData(res.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [period]);

    if (loading || !data) return <div className="p-8">Loading analytics...</div>;

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-500">Advanced Analytics</h1>
                <select 
                    value={period} 
                    onChange={e => setPeriod(e.target.value)}
                    className="border-gray-200 rounded-lg focus:ring-blue-500 font-medium bg-white shadow-sm"
                >
                    <option value="7">Last 7 Days</option>
                    <option value="30">Last 30 Days</option>
                    <option value="90">Last 90 Days</option>
                </select>
            </div>

            {/* Top Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-500 font-medium">Total Revenue</span>
                        <div className="p-2 bg-green-50 text-green-600 rounded-lg"><FiTrendingUp /></div>
                    </div>
                    <div className="text-3xl font-black text-gray-900">₹{data.summary.revenue.toLocaleString()}</div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-500 font-medium">Delivered Orders</span>
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><FiShoppingBag /></div>
                    </div>
                    <div className="text-3xl font-black text-gray-900">{data.summary.deliveredOrders}</div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-500 font-medium">Avg Order Value</span>
                        <div className="p-2 bg-orange-50 text-orange-600 rounded-lg"><FiDollarSign /></div>
                    </div>
                    <div className="text-3xl font-black text-gray-900">₹{data.summary.avgOrderValue}</div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-500 font-medium">New Users</span>
                        <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><FiUsers /></div>
                    </div>
                    <div className="text-3xl font-black text-gray-900">{data.users.newUsers}</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Revenue Chart */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="font-bold mb-6 text-gray-900">Daily Revenue</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data.dailyRevenue}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="_id" tick={{fontSize: 12, fill: '#6B7280'}} axisLine={false} tickLine={false} />
                                <YAxis tick={{fontSize: 12, fill: '#6B7280'}} axisLine={false} tickLine={false} tickFormatter={val => `₹${val}`} />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Line type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={3} dot={false} activeDot={{r: 6}} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Category Revenue */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="font-bold mb-6 text-gray-900">Revenue by Category</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.categoryRevenue} layout="vertical" margin={{top: 5, right: 30, left: 40, bottom: 5}}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                                <XAxis type="number" tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                                <YAxis dataKey="_id" type="category" tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px' }} />
                                <Bar dataKey="revenue" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Top Products & Users */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="font-bold mb-4 text-gray-900">Top Selling Products</h3>
                    <div className="space-y-4">
                        {data.topProducts.map(p => (
                            <div key={p._id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                                <span className="font-medium text-gray-800">{p.name || 'Unknown Item'}</span>
                                <div className="text-right">
                                    <div className="text-sm font-bold text-gray-900">₹{p.revenue.toLocaleString()}</div>
                                    <div className="text-xs text-gray-500">{p.units} units</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="font-bold mb-4 flex items-center text-gray-900">
                        <FiAlertTriangle className="mr-2 text-red-500" /> Fraud & Risk Activity
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-red-50 p-4 rounded-xl">
                            <div className="text-red-800 text-xs font-bold uppercase mb-1">Blocked Users</div>
                            <div className="text-2xl font-black text-red-600">{data.users.blockedUsers}</div>
                        </div>
                        <div className="bg-yellow-50 p-4 rounded-xl">
                            <div className="text-yellow-800 text-xs font-bold uppercase mb-1">Open Flags</div>
                            <div className="text-2xl font-black text-yellow-600">
                                {data.fraud.find(f => f._id === 'open')?.count || 0}
                            </div>
                        </div>
                    </div>
                    
                    <h3 className="font-bold mt-6 mb-4 text-gray-900">User Retention</h3>
                    <div className="flex h-4 rounded-full overflow-hidden bg-gray-100">
                        {data.retention.map(r => (
                            <div 
                                key={r._id} 
                                style={{ width: `${(r.count / data.users.totalUsers) * 100}%` }}
                                className={r._id === 'returning' ? 'bg-indigo-500' : 'bg-gray-300'}
                                title={`${r._id}: ${r.count} users`}
                            />
                        ))}
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-gray-500 font-medium uppercase tracking-wider">
                        <span>New</span>
                        <span>Returning</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminAnalytics;
