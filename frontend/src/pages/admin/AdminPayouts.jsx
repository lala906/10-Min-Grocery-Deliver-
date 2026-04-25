import React, { useState, useEffect } from 'react';
import { getAllPayouts, calculatePayout, markPayoutPaid, getAllRiders, exportPayoutsCSV } from '../../services/api';
import { FiDollarSign, FiDownload, FiCheckCircle, FiClock, FiPlus } from 'react-icons/fi';

const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-blue-100 text-blue-800',
    paid: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
};

const AdminPayouts = () => {
    const [payouts, setPayouts] = useState([]);
    const [riders, setRiders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCalcModal, setShowCalcModal] = useState(false);
    const [calcForm, setCalcForm] = useState({ riderId: '', periodStart: '', periodEnd: '' });
    const [actionLoading, setActionLoading] = useState(false);
    const [toast, setToast] = useState(null);
    const [filter, setFilter] = useState('');

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const [payRes, riderRes] = await Promise.all([
                getAllPayouts(filter ? { status: filter } : {}),
                getAllRiders({ status: 'active', limit: 200 })
            ]);
            setPayouts(payRes.payouts || []);
            setRiders(riderRes.riders || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [filter]);

    const handleCalculate = async () => {
        if (!calcForm.riderId || !calcForm.periodStart || !calcForm.periodEnd) {
            return showToast('Please fill all fields', 'error');
        }
        setActionLoading(true);
        try {
            await calculatePayout(calcForm);
            showToast('Payout calculated successfully!');
            setShowCalcModal(false);
            setCalcForm({ riderId: '', periodStart: '', periodEnd: '' });
            fetchData();
        } catch (e) {
            showToast(e.response?.data?.message || 'Calculation failed', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleMarkPaid = async (payout) => {
        const ref = prompt('Enter payment reference (e.g. UTR/transaction ID):');
        if (!ref) return;
        setActionLoading(true);
        try {
            await markPayoutPaid(payout._id, ref, 'bank_transfer');
            showToast('Payout marked as paid!');
            fetchData();
        } catch (e) {
            showToast('Failed to mark as paid', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const totalPending = payouts.filter(p => p.status === 'pending').reduce((s, p) => s + p.netPayout, 0);
    const totalPaid = payouts.filter(p => p.status === 'paid').reduce((s, p) => s + p.netPayout, 0);

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
                        <FiDollarSign className="text-green-500" /> Payout Management
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Calculate and process rider earnings</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={exportPayoutsCSV}
                        className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 font-bold py-2.5 px-5 rounded-xl hover:bg-gray-50 transition-all text-sm"
                    >
                        <FiDownload /> Export CSV
                    </button>
                    <button
                        onClick={() => setShowCalcModal(true)}
                        className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-2.5 px-5 rounded-xl transition-all text-sm"
                    >
                        <FiPlus /> Calculate Payout
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                {[
                    { label: 'Total Pending', value: `₹${totalPending.toFixed(0)}`, icon: <FiClock />, color: 'bg-yellow-50 text-yellow-600', dot: 'bg-yellow-400' },
                    { label: 'Total Paid Out', value: `₹${totalPaid.toFixed(0)}`, icon: <FiCheckCircle />, color: 'bg-green-50 text-green-600', dot: 'bg-green-400' },
                    { label: 'Total Records', value: payouts.length, icon: <FiDollarSign />, color: 'bg-blue-50 text-blue-600', dot: 'bg-blue-400' },
                ].map(card => (
                    <div key={card.label} className={`rounded-2xl p-5 ${card.color} flex items-center gap-4`}>
                        <div className={`w-3 h-3 rounded-full ${card.dot}`} />
                        <div>
                            <p className="text-xs font-bold opacity-70 uppercase tracking-wide">{card.label}</p>
                            <p className="text-2xl font-black mt-0.5">{card.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filter */}
            <div className="flex gap-2 mb-4">
                {['', 'pending', 'paid', 'failed'].map(s => (
                    <button
                        key={s}
                        onClick={() => setFilter(s)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold capitalize transition-all ${filter === s ? 'bg-green-500 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                    >
                        {s || 'All'}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-gray-400">Loading payouts...</div>
                ) : payouts.length === 0 ? (
                    <div className="p-12 text-center">
                        <FiDollarSign className="mx-auto text-5xl text-gray-200 mb-3" />
                        <p className="text-gray-400 font-medium">No payouts found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Rider</th>
                                    <th className="px-6 py-4">Period</th>
                                    <th className="px-6 py-4">Deliveries</th>
                                    <th className="px-6 py-4">Gross</th>
                                    <th className="px-6 py-4">Commission</th>
                                    <th className="px-6 py-4">Net Payout</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {payouts.map(payout => (
                                    <tr key={payout._id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-gray-900">{payout.rider?.name}</p>
                                            <p className="text-xs text-gray-400">{payout.rider?.phone}</p>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{payout.periodLabel}</td>
                                        <td className="px-6 py-4 font-bold text-gray-900">{payout.totalDeliveries}</td>
                                        <td className="px-6 py-4 text-gray-700">₹{payout.grossEarnings?.toFixed(0)}</td>
                                        <td className="px-6 py-4 text-red-600">-₹{payout.totalCommission?.toFixed(0)}</td>
                                        <td className="px-6 py-4 font-black text-green-600">₹{payout.netPayout?.toFixed(0)}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusColors[payout.status]}`}>
                                                {payout.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {payout.status === 'pending' && (
                                                <button
                                                    onClick={() => handleMarkPaid(payout)}
                                                    className="text-green-600 font-bold text-sm hover:underline"
                                                >
                                                    Mark Paid
                                                </button>
                                            )}
                                            {payout.status === 'paid' && (
                                                <span className="text-xs text-gray-400">{payout.paymentRef}</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Calculate Modal */}
            {showCalcModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <h3 className="text-lg font-black text-gray-900 mb-5">Calculate Payout</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-bold text-gray-700 mb-1 block">Rider</label>
                                <select
                                    value={calcForm.riderId}
                                    onChange={e => setCalcForm({ ...calcForm, riderId: e.target.value })}
                                    className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                                >
                                    <option value="">Select rider...</option>
                                    {riders.map(r => (
                                        <option key={r._id} value={r._id}>{r.name} — {r.phone}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-sm font-bold text-gray-700 mb-1 block">Period Start</label>
                                    <input
                                        type="date"
                                        value={calcForm.periodStart}
                                        onChange={e => setCalcForm({ ...calcForm, periodStart: e.target.value })}
                                        className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-gray-700 mb-1 block">Period End</label>
                                    <input
                                        type="date"
                                        value={calcForm.periodEnd}
                                        onChange={e => setCalcForm({ ...calcForm, periodEnd: e.target.value })}
                                        className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowCalcModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200">
                                Cancel
                            </button>
                            <button onClick={handleCalculate} disabled={actionLoading} className="flex-1 py-3 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 disabled:opacity-60">
                                {actionLoading ? 'Calculating...' : 'Calculate'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPayouts;
