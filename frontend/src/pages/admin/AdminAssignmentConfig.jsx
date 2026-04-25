import React, { useState, useEffect } from 'react';
import { getAssignmentConfig, updateAssignmentConfig } from '../../services/api';
import { FiSettings, FiSave, FiToggleLeft, FiToggleRight } from 'react-icons/fi';

const AdminAssignmentConfig = () => {
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);

    const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

    useEffect(() => {
        getAssignmentConfig().then(res => { setConfig(res); setLoading(false); }).catch(e => { console.error(e); setLoading(false); });
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateAssignmentConfig(config);
            showToast('Configuration saved successfully!');
        } catch (e) {
            showToast(e.response?.data?.message || 'Failed to save', 'error');
        } finally { setSaving(false); }
    };

    const set = (path, value) => {
        const keys = path.split('.');
        setConfig(prev => {
            const updated = { ...prev };
            let obj = updated;
            for (let i = 0; i < keys.length - 1; i++) { obj[keys[i]] = { ...obj[keys[i]] }; obj = obj[keys[i]]; }
            obj[keys[keys.length - 1]] = value;
            return updated;
        });
    };

    if (loading) return <div className="p-8 text-center text-gray-400">Loading config...</div>;
    if (!config) return <div className="p-8 text-center text-red-400">Failed to load config</div>;

    const totalWeight = (config.rules?.proximityWeight || 0) + (config.rules?.ratingWeight || 0) +
        (config.rules?.workloadWeight || 0) + (config.rules?.vehicleTypeWeight || 0);

    return (
        <div className="p-6 md:p-8 max-w-3xl">
            {toast && (
                <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-xl font-semibold text-sm ${toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
                    {toast.msg}
                </div>
            )}
            <div className="mb-8">
                <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                    <FiSettings className="text-green-500" /> Assignment Engine Config
                </h1>
                <p className="text-gray-500 text-sm mt-1">Configure rules for automatic rider assignment</p>
            </div>

            {/* Master Toggle */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-black text-gray-900">Auto-Assignment</p>
                        <p className="text-sm text-gray-500 mt-1">Automatically assign riders to new orders</p>
                    </div>
                    <button onClick={() => set('autoAssignEnabled', !config.autoAssignEnabled)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${config.autoAssignEnabled ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                        {config.autoAssignEnabled ? <FiToggleRight className="text-lg" /> : <FiToggleLeft className="text-lg" />}
                        {config.autoAssignEnabled ? 'Enabled' : 'Disabled'}
                    </button>
                </div>
            </div>

            {/* Rule Weights */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="font-black text-gray-900">Rule Weights</h2>
                    <span className={`text-sm font-bold ${totalWeight === 100 ? 'text-green-600' : 'text-red-500'}`}>
                        Total: {totalWeight}% {totalWeight !== 100 && '(must equal 100%)'}
                    </span>
                </div>
                <div className="space-y-5">
                    {[
                        { label: 'Proximity', key: 'rules.proximityWeight', desc: 'Closer riders score higher', color: 'bg-green-500' },
                        { label: 'Rating', key: 'rules.ratingWeight', desc: 'Higher rated riders score higher', color: 'bg-blue-500' },
                        { label: 'Workload', key: 'rules.workloadWeight', desc: 'Riders with fewer active orders score higher', color: 'bg-purple-500' },
                        { label: 'Vehicle Type', key: 'rules.vehicleTypeWeight', desc: 'Vehicle suitability match', color: 'bg-orange-500' },
                    ].map(({ label, key, desc, color }) => {
                        const keys = key.split('.');
                        const value = keys.reduce((o, k) => o?.[k], config) || 0;
                        return (
                            <div key={key}>
                                <div className="flex items-center justify-between mb-2">
                                    <div>
                                        <p className="font-bold text-gray-800 text-sm">{label}</p>
                                        <p className="text-xs text-gray-400">{desc}</p>
                                    </div>
                                    <span className="font-black text-gray-900 text-lg w-12 text-right">{value}%</span>
                                </div>
                                <input type="range" min={0} max={100} step={5} value={value}
                                    onChange={e => set(key, Number(e.target.value))}
                                    className="w-full h-2 rounded-full appearance-none cursor-pointer accent-green-500" />
                                <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${value}%` }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Operational Limits */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
                <h2 className="font-black text-gray-900 mb-5">Operational Limits</h2>
                <div className="grid grid-cols-2 gap-4">
                    {[
                        { label: 'Max Search Radius (km)', key: 'maxDistanceKm', min: 1, max: 50 },
                        { label: 'Max Orders/Rider', key: 'maxOrdersPerRider', min: 1, max: 10 },
                        { label: 'Assignment Timeout (sec)', key: 'assignmentTimeoutSeconds', min: 30, max: 300 },
                        { label: 'Re-assign After N Rejections', key: 'reassignAfterRejections', min: 1, max: 10 },
                        { label: 'Max Reassignment Attempts', key: 'maxReassignmentAttempts', min: 1, max: 20 },
                    ].map(({ label, key, min, max }) => (
                        <div key={key}>
                            <label className="text-sm font-bold text-gray-700 mb-1 block">{label}</label>
                            <input type="number" min={min} max={max} value={config[key] || 0}
                                onChange={e => set(key, Number(e.target.value))}
                                className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                        </div>
                    ))}
                    <div className="col-span-2 flex items-center gap-3">
                        <input type="checkbox" id="preferSameZone" checked={config.preferSameZone || false}
                            onChange={e => set('preferSameZone', e.target.checked)}
                            className="w-4 h-4 accent-green-500 cursor-pointer" />
                        <label htmlFor="preferSameZone" className="text-sm font-bold text-gray-700 cursor-pointer">
                            Prefer riders in the same zone as the order
                        </label>
                    </div>
                </div>
            </div>

            <button onClick={handleSave} disabled={saving || totalWeight !== 100}
                className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-black py-4 rounded-2xl text-lg transition-all active:scale-95 disabled:opacity-60 shadow-lg shadow-green-200">
                <FiSave /> {saving ? 'Saving...' : 'Save Configuration'}
            </button>
            {totalWeight !== 100 && (
                <p className="text-center text-red-500 text-sm mt-3">Rule weights must total exactly 100% before saving.</p>
            )}
        </div>
    );
};

export default AdminAssignmentConfig;
