import React, { useState, useEffect } from 'react';
import { getAllDisputes, updateDisputeStatus, resolveDispute } from '../../services/api';
import { FiAlertCircle, FiCheck, FiChevronRight } from 'react-icons/fi';

const statusColors = {
    open: 'bg-red-100 text-red-700',
    under_review: 'bg-yellow-100 text-yellow-700',
    resolved: 'bg-green-100 text-green-700',
    escalated: 'bg-purple-100 text-purple-700',
    closed: 'bg-gray-100 text-gray-600',
};
const priorityColors = {
    low: 'text-gray-500', medium: 'text-yellow-600', high: 'text-orange-600', critical: 'text-red-600'
};

const AdminDisputes = () => {
    const [disputes, setDisputes] = useState([]);
    const [selected, setSelected] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [resolution, setResolution] = useState('');
    const [toast, setToast] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchDisputes = async () => {
        setLoading(true);
        try {
            const res = await getAllDisputes(filter ? { status: filter } : {});
            setDisputes(res.disputes || []);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    useEffect(() => { fetchDisputes(); }, [filter]);

    const handleStatusChange = async (id, status) => {
        setActionLoading(true);
        try {
            await updateDisputeStatus(id, { status });
            showToast('Status updated');
            fetchDisputes();
            if (selected?._id === id) setSelected({ ...selected, status });
        } catch (e) { showToast('Failed', 'error'); } finally { setActionLoading(false); }
    };

    const handleResolve = async () => {
        if (!resolution.trim()) return showToast('Enter resolution notes', 'error');
        setActionLoading(true);
        try {
            await resolveDispute(selected._id, { resolution });
            showToast('Dispute resolved!');
            setResolution('');
            fetchDisputes();
            setSelected(null);
        } catch (e) { showToast('Failed', 'error'); } finally { setActionLoading(false); }
    };

    return (
        <div className="p-6 md:p-8">
            {toast && (
                <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-xl font-semibold text-sm ${toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
                    {toast.msg}
                </div>
            )}

            <div className="mb-8">
                <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                    <FiAlertCircle className="text-red-500" /> Dispute Management
                </h1>
                <p className="text-gray-500 text-sm mt-1">Review and resolve customer/rider disputes</p>
            </div>

            <div className="flex gap-2 mb-6">
                {['', 'open', 'under_review', 'escalated', 'resolved', 'closed'].map(s => (
                    <button key={s} onClick={() => setFilter(s)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold capitalize transition-all ${filter === s ? 'bg-red-500 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
                        {s || 'All'}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* List */}
                <div className="xl:col-span-1 space-y-2">
                    {loading ? <div className="bg-white rounded-2xl p-8 text-center text-gray-400">Loading...</div>
                        : disputes.length === 0 ? (
                            <div className="bg-white rounded-2xl p-8 text-center">
                                <FiAlertCircle className="mx-auto text-4xl text-gray-200 mb-3" />
                                <p className="text-gray-400 font-medium">No disputes found</p>
                            </div>
                        ) : disputes.map(d => (
                            <div key={d._id} onClick={() => setSelected(d)}
                                className={`bg-white rounded-2xl p-4 border cursor-pointer transition-all hover:shadow-md ${selected?._id === d._id ? 'border-red-400 shadow-md' : 'border-gray-100'}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${statusColors[d.status]}`}>{d.status?.replace('_', ' ')}</span>
                                    <span className={`text-xs font-bold uppercase ${priorityColors[d.priority]}`}>{d.priority}</span>
                                </div>
                                <p className="font-bold text-gray-900 text-sm truncate capitalize">{d.type?.replace('_', ' ')}</p>
                                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{d.description}</p>
                                <div className="flex items-center gap-2 mt-3">
                                    <span className="text-xs text-gray-400 font-medium">By: {d.raisedByName}</span>
                                    <FiChevronRight className="ml-auto text-gray-300" />
                                </div>
                            </div>
                        ))}
                </div>

                {/* Detail */}
                <div className="xl:col-span-2">
                    {!selected ? (
                        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
                            <FiAlertCircle className="mx-auto text-5xl text-gray-200 mb-4" />
                            <p className="text-gray-400 font-medium">Select a dispute to review</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                            <div className="p-6 border-b border-gray-50">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-lg font-black text-gray-900 capitalize">{selected.type?.replace(/_/g, ' ')}</h2>
                                    <span className={`px-3 py-1.5 rounded-full text-sm font-bold ${statusColors[selected.status]}`}>
                                        {selected.status?.replace('_', ' ')}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600 mt-3">{selected.description}</p>
                            </div>

                            <div className="p-6 grid grid-cols-2 gap-4">
                                {[
                                    { label: 'Raised By', value: `${selected.raisedByName} (${selected.raisedByRole})` },
                                    { label: 'Priority', value: selected.priority },
                                    { label: 'Order ID', value: selected.order?._id?.slice(-8) || '—' },
                                    { label: 'Created', value: new Date(selected.createdAt).toLocaleString() },
                                ].map(({ label, value }) => (
                                    <div key={label} className="bg-gray-50 rounded-xl p-3">
                                        <p className="text-xs text-gray-400 font-medium mb-1">{label}</p>
                                        <p className="font-bold text-gray-800 text-sm">{value}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Evidence */}
                            {selected.evidence?.length > 0 && (
                                <div className="px-6 pb-4">
                                    <h3 className="font-bold text-gray-700 text-sm mb-3">Evidence</h3>
                                    <div className="flex gap-2 flex-wrap">
                                        {selected.evidence.map((e, i) => (
                                            <a key={i} href={e.url} target="_blank" rel="noreferrer"
                                                className="text-blue-600 underline text-xs font-medium bg-blue-50 px-3 py-2 rounded-lg">
                                                Evidence {i + 1} ↗
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Timeline */}
                            {selected.timeline?.length > 0 && (
                                <div className="px-6 pb-4">
                                    <h3 className="font-bold text-gray-700 text-sm mb-3 uppercase tracking-wide">Timeline</h3>
                                    <div className="space-y-2 max-h-40 overflow-y-auto">
                                        {selected.timeline.map((t, i) => (
                                            <div key={i} className="flex items-center gap-3 text-sm">
                                                <div className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                                                <span className="font-medium text-gray-700 capitalize">{t.action?.replace(/_/g, ' ')}</span>
                                                {t.performedByName && <span className="text-gray-400">by {t.performedByName}</span>}
                                                <span className="text-xs text-gray-400 ml-auto">{new Date(t.timestamp).toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Resolution */}
                            {selected.resolution && (
                                <div className="mx-6 mb-4 p-4 bg-green-50 rounded-xl border border-green-200">
                                    <p className="text-sm font-bold text-green-700">Resolution:</p>
                                    <p className="text-sm text-green-600 mt-1">{selected.resolution}</p>
                                </div>
                            )}

                            {/* Actions */}
                            {!['resolved', 'closed'].includes(selected.status) && (
                                <div className="px-6 pb-6 space-y-3">
                                    <div className="flex gap-2">
                                        {['under_review', 'escalated'].map(s => (
                                            <button key={s} onClick={() => handleStatusChange(selected._id, s)}
                                                disabled={actionLoading || selected.status === s}
                                                className="flex-1 py-2 text-sm font-bold capitalize rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40 transition-all">
                                                → {s.replace('_', ' ')}
                                            </button>
                                        ))}
                                    </div>
                                    <textarea
                                        value={resolution}
                                        onChange={e => setResolution(e.target.value)}
                                        placeholder="Enter resolution notes..."
                                        rows={3}
                                        className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
                                    />
                                    <button onClick={handleResolve} disabled={actionLoading}
                                        className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-60">
                                        <FiCheck /> Mark as Resolved
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminDisputes;
