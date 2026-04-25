import React, { useState, useEffect } from 'react';
import { getAuditLogs } from '../../services/api';
import { FiActivity, FiFilter, FiRefreshCw } from 'react-icons/fi';

const severityColors = {
    info: 'bg-blue-100 text-blue-700',
    warning: 'bg-yellow-100 text-yellow-700',
    critical: 'bg-red-100 text-red-700',
};

const actionIcons = { KYC: '📋', RIDER: '🏍️', ORDER: '📦', PAYOUT: '💰', DISPUTE: '⚠️', ZONE: '🗺️', ASSIGNMENT: '🎯' };
const getActionIcon = (action = '') => {
    const key = Object.keys(actionIcons).find(k => action.startsWith(k));
    return actionIcons[key] || '📝';
};

const AdminAuditLogs = () => {
    const [logs, setLogs] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState({ actorRole: '', severity: '', action: '' });
    const limit = 50;

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const params = { page, limit };
            if (filters.actorRole) params.actorRole = filters.actorRole;
            if (filters.severity) params.severity = filters.severity;
            if (filters.action) params.action = filters.action;
            const res = await getAuditLogs(params);
            setLogs(res.logs || []);
            setTotal(res.total || 0);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    useEffect(() => { fetchLogs(); }, [page, filters]);

    const handleFilter = (key, val) => { setFilters(f => ({ ...f, [key]: val })); setPage(1); };

    return (
        <div className="p-6 md:p-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                        <FiActivity className="text-indigo-500" /> Audit Logs
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">{total.toLocaleString()} total entries — immutable admin action history</p>
                </div>
                <button onClick={fetchLogs} className="flex items-center gap-2 bg-white border border-gray-200 text-gray-600 font-bold py-2.5 px-4 rounded-xl hover:bg-gray-50 text-sm">
                    <FiRefreshCw className={loading ? 'animate-spin' : ''} /> Refresh
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6 flex flex-wrap gap-3">
                <FiFilter className="text-gray-400 mt-2" />
                <select value={filters.actorRole} onChange={e => handleFilter('actorRole', e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none">
                    <option value="">All Roles</option>
                    <option value="admin">Admin</option>
                    <option value="system">System</option>
                    <option value="rider">Rider</option>
                </select>
                <select value={filters.severity} onChange={e => handleFilter('severity', e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none">
                    <option value="">All Severity</option>
                    <option value="info">Info</option>
                    <option value="warning">Warning</option>
                    <option value="critical">Critical</option>
                </select>
                <input type="text" placeholder="Search action..." value={filters.action}
                    onChange={e => handleFilter('action', e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none flex-1 min-w-40" />
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                {loading ? <div className="p-12 text-center text-gray-400">Loading...</div>
                    : logs.length === 0 ? (
                        <div className="p-12 text-center">
                            <FiActivity className="mx-auto text-5xl text-gray-200 mb-3" />
                            <p className="text-gray-400 font-medium">No audit logs found</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {logs.map(log => (
                                <div key={log._id} className="px-6 py-4 hover:bg-gray-50">
                                    <div className="flex items-start gap-4">
                                        <span className="text-2xl mt-0.5">{getActionIcon(log.action)}</span>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 flex-wrap">
                                                <span className="font-black text-gray-900 text-sm font-mono">{log.action}</span>
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${severityColors[log.severity]}`}>{log.severity}</span>
                                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">{log.actorRole}</span>
                                            </div>
                                            {log.description && <p className="text-sm text-gray-600 mt-1">{log.description}</p>}
                                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                                                {log.actorName && <span>👤 {log.actorName}</span>}
                                                {log.targetType && <span>🎯 {log.targetType}</span>}
                                                <span className="ml-auto">{new Date(log.timestamp).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
            </div>

            {total > limit && (
                <div className="flex items-center justify-between mt-6">
                    <p className="text-sm text-gray-500">Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total}</p>
                    <div className="flex gap-2">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                            className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold disabled:opacity-40 hover:bg-gray-50">← Prev</button>
                        <button onClick={() => setPage(p => p + 1)} disabled={page * limit >= total}
                            className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold disabled:opacity-40 hover:bg-gray-50">Next →</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminAuditLogs;
