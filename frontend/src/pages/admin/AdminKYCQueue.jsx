import React, { useState, useEffect } from 'react';
import { getKYCQueue, approveKYC, rejectKYC } from '../../services/api';
import { FiFileText, FiCheck, FiX, FiEye, FiClock, FiUser } from 'react-icons/fi';

const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
};

const AdminKYCQueue = () => {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('pending');
    const [selected, setSelected] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [toast, setToast] = useState(null);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchQueue = async () => {
        setLoading(true);
        try {
            const res = await getKYCQueue({ status: filter });
            setRecords(res.records || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchQueue(); }, [filter]);

    const handleApprove = async (kyc) => {
        setActionLoading(true);
        try {
            await approveKYC(kyc._id);
            showToast(`KYC approved for ${kyc.rider?.name}`);
            fetchQueue();
            setSelected(null);
        } catch (e) {
            showToast(e.response?.data?.message || 'Failed to approve', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleReject = async () => {
        if (!rejectReason.trim()) return showToast('Please enter a rejection reason', 'error');
        setActionLoading(true);
        try {
            await rejectKYC(selected._id, rejectReason);
            showToast(`KYC rejected for ${selected.rider?.name}`);
            setShowRejectModal(false);
            setRejectReason('');
            fetchQueue();
            setSelected(null);
        } catch (e) {
            showToast(e.response?.data?.message || 'Failed to reject', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="p-6 md:p-8">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-xl font-semibold text-sm transition-all ${toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
                    {toast.msg}
                </div>
            )}

            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                        <FiFileText className="text-green-500" /> KYC Verification Queue
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Review and approve delivery partner documents</p>
                </div>
                <div className="flex gap-2">
                    {['pending', 'approved', 'rejected'].map(s => (
                        <button
                            key={s}
                            onClick={() => setFilter(s)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold capitalize transition-all ${filter === s ? 'bg-green-500 text-white shadow' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* List */}
                <div className="xl:col-span-1 space-y-3">
                    {loading ? (
                        <div className="bg-white rounded-2xl p-8 text-center text-gray-400">Loading...</div>
                    ) : records.length === 0 ? (
                        <div className="bg-white rounded-2xl p-8 text-center">
                            <FiFileText className="mx-auto text-4xl text-gray-300 mb-3" />
                            <p className="text-gray-500 font-medium">No {filter} KYC records</p>
                        </div>
                    ) : records.map(kyc => (
                        <div
                            key={kyc._id}
                            onClick={() => setSelected(kyc)}
                            className={`bg-white rounded-2xl p-4 border cursor-pointer transition-all hover:shadow-md ${selected?._id === kyc._id ? 'border-green-400 shadow-md' : 'border-gray-100'}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                                    {kyc.rider?.name?.charAt(0) || 'R'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-gray-900 truncate">{kyc.rider?.name}</p>
                                    <p className="text-xs text-gray-500">{kyc.rider?.phone}</p>
                                </div>
                                <span className={`text-xs font-bold px-2 py-1 rounded-full ${statusColors[kyc.status]}`}>
                                    {kyc.status}
                                </span>
                            </div>
                            <div className="mt-3 flex items-center gap-1 text-xs text-gray-400">
                                <FiClock className="w-3 h-3" />
                                {kyc.submittedAt ? new Date(kyc.submittedAt).toLocaleDateString() : 'Not submitted'}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Detail Panel */}
                <div className="xl:col-span-2">
                    {!selected ? (
                        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
                            <FiEye className="mx-auto text-5xl text-gray-200 mb-4" />
                            <p className="text-gray-400 font-medium">Select a record to review</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                            <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white font-bold">
                                        {selected.rider?.name?.charAt(0)}
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-black text-gray-900">{selected.rider?.name}</h2>
                                        <p className="text-sm text-gray-500">{selected.rider?.phone}</p>
                                    </div>
                                </div>
                                <span className={`px-3 py-1.5 rounded-full text-sm font-bold ${statusColors[selected.status]}`}>
                                    {selected.status}
                                </span>
                            </div>

                            <div className="p-6 grid grid-cols-2 gap-4">
                                {[
                                    { label: 'License Number', value: selected.licenseNumber },
                                    { label: 'ID Proof Type', value: selected.idProofType },
                                    { label: 'ID Proof Number', value: selected.idProofNumber },
                                    { label: 'Submitted At', value: selected.submittedAt ? new Date(selected.submittedAt).toLocaleString() : '—' },
                                    { label: 'Vehicle Type', value: selected.rider?.vehicleDetails?.vehicleType || '—' },
                                    { label: 'Vehicle Plate', value: selected.rider?.vehicleDetails?.numberPlate || '—' },
                                ].map(({ label, value }) => (
                                    <div key={label} className="bg-gray-50 rounded-xl p-3">
                                        <p className="text-xs text-gray-400 font-medium mb-1">{label}</p>
                                        <p className="font-bold text-gray-800 text-sm">{value || '—'}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Documents */}
                            <div className="px-6 pb-6">
                                <h3 className="font-bold text-gray-800 mb-3 text-sm uppercase tracking-wide">Documents</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {[
                                        { label: 'License', url: selected.licenseUrl },
                                        { label: 'ID Proof', url: selected.idProofUrl },
                                        { label: 'Vehicle Reg', url: selected.vehicleRegUrl },
                                        { label: 'Selfie', url: selected.selfieUrl },
                                    ].map(({ label, url }) => (
                                        <div key={label} className="border border-gray-200 rounded-xl overflow-hidden">
                                            {url ? (
                                                <a href={url} target="_blank" rel="noreferrer">
                                                    <img src={url} alt={label} className="w-full h-24 object-cover hover:opacity-80 transition-opacity" />
                                                    <p className="text-xs text-center py-2 font-medium text-gray-600">{label} ↗</p>
                                                </a>
                                            ) : (
                                                <div className="h-24 flex items-center justify-center bg-gray-50">
                                                    <p className="text-xs text-gray-400">{label} not uploaded</p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Audit Trail */}
                            {selected.auditTrail?.length > 0 && (
                                <div className="px-6 pb-6">
                                    <h3 className="font-bold text-gray-800 mb-3 text-sm uppercase tracking-wide">Audit Trail</h3>
                                    <div className="space-y-2">
                                        {selected.auditTrail.map((entry, i) => (
                                            <div key={i} className="flex items-center gap-3 text-sm">
                                                <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                                                <span className="font-medium text-gray-700 capitalize">{entry.action}</span>
                                                {entry.performedByName && <span className="text-gray-400">by {entry.performedByName}</span>}
                                                <span className="text-gray-400 ml-auto text-xs">{new Date(entry.timestamp).toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Rejection Reason */}
                            {selected.rejectionReason && (
                                <div className="mx-6 mb-6 p-4 bg-red-50 rounded-xl border border-red-200">
                                    <p className="text-sm font-bold text-red-700">Rejection Reason:</p>
                                    <p className="text-sm text-red-600 mt-1">{selected.rejectionReason}</p>
                                </div>
                            )}

                            {/* Action Buttons */}
                            {selected.status === 'pending' && (
                                <div className="px-6 pb-6 flex gap-3">
                                    <button
                                        onClick={() => handleApprove(selected)}
                                        disabled={actionLoading}
                                        className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl transition-all active:scale-95 disabled:opacity-60"
                                    >
                                        <FiCheck /> Approve KYC
                                    </button>
                                    <button
                                        onClick={() => setShowRejectModal(true)}
                                        disabled={actionLoading}
                                        className="flex-1 flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold py-3 rounded-xl border border-red-200 transition-all active:scale-95"
                                    >
                                        <FiX /> Reject KYC
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <h3 className="text-lg font-black text-gray-900 mb-4">Reject KYC</h3>
                        <p className="text-sm text-gray-600 mb-4">Please provide a reason for rejection. This will be shown to the rider.</p>
                        <textarea
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)}
                            placeholder="e.g. Document image is unclear, please resubmit..."
                            rows={4}
                            className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                        />
                        <div className="flex gap-3 mt-4">
                            <button
                                onClick={() => { setShowRejectModal(false); setRejectReason(''); }}
                                className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReject}
                                disabled={actionLoading}
                                className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-all disabled:opacity-60"
                            >
                                Confirm Reject
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminKYCQueue;
