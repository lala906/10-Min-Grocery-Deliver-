import React, { useEffect, useState } from 'react';
import { getAdminStats } from '../services/api';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await getAdminStats();
                setStats(data);
            } catch (err) {
                console.error('Failed to fetch admin dashboard stats:', err);
            }
        };
        fetchStats();
    }, []);

    if (!stats) return <div className="p-10 text-center font-bold">Loading Stats...</div>;

    const data = {
        labels: stats.monthlyRevenue.map(m => `Month ${m._id}`),
        datasets: [
            {
                label: 'Monthly Revenue',
                data: stats.monthlyRevenue.map(m => m.total),
                backgroundColor: 'rgba(53, 162, 235, 0.5)',
            },
        ],
    };

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Analytics Dashboard</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded shadow text-center">
                    <p className="text-gray-500">Total Users</p>
                    <h3 className="text-3xl font-bold text-blue-600">{stats.totalUsers}</h3>
                </div>
                <div className="bg-white p-6 rounded shadow text-center">
                    <p className="text-gray-500">Total Orders</p>
                    <h3 className="text-3xl font-bold text-green-600">{stats.totalOrders}</h3>
                </div>
                <div className="bg-white p-6 rounded shadow text-center">
                    <p className="text-gray-500">Total Revenue</p>
                    <h3 className="text-3xl font-bold text-red-600">₹{stats.totalRevenue.toFixed(2)}</h3>
                </div>
            </div>

            <div className="bg-white p-6 rounded shadow mb-8">
                <h3 className="mb-4 font-bold text-gray-700">Revenue Over Time</h3>
                <Bar data={data} options={{ maintainAspectRatio: false }} height={300} />
            </div>

            <div className="bg-white p-6 rounded shadow mt-8">
                <h3 className="text-xl font-bold mb-4 text-gray-700">Top Selling Products</h3>
                <ul className="divide-y text-left">
                    {stats.topProducts.map(p => (
                        <li key={p._id} className="py-2 flex justify-between uppercase">
                            <span className="font-bold">{p.name}</span>
                            <span className="text-gray-600">{p.totalQuantity} units sold</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default AdminDashboard;
