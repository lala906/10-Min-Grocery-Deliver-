import React, { useState, useEffect } from 'react';
import { getZones, createZone, updateZone, deleteZone } from '../../services/api';
import { FiLayers, FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';

const AdminZones = () => {
    const [zones, setZones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: '', description: '', baseDeliveryFee: 20, maxDeliveryRadiusKm: 5, color: '#10b981', center: { lat: '', lng: '' } });
    const [toast, setToast] = useState(null);

    const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

    const fetchZones = async () => {
        setLoading(true);
        try { const res = await getZones(); setZones(Array.isArray(res) ? res : []); }
        catch (e) { console.error(e); } finally { setLoading(false); }
    };

    useEffect(() => { fetchZones(); }, []);

    const openCreate = () => { setEditing(null); setForm({ name: '', description: '', baseDeliveryFee: 20, maxDeliveryRadiusKm: 5, color: '#10b981', center: { lat: '', lng: '' } }); setShowModal(true); };
    const openEdit = (zone) => { setEditing(zone); setForm({ name: zone.name, description: zone.description || '', baseDeliveryFee: zone.baseDeliveryFee, maxDeliveryRadiusKm: zone.maxDeliveryRadiusKm, color: zone.color || '#10b981', center: zone.center || { lat: '', lng: '' } }); setShowModal(true); };

    const handleSave = async () => {
        if (!form.name.trim()) return showToast('Zone name is required', 'error');
        try {
            if (editing) { await updateZone(editing._id, form); showToast('Zone updated!'); }
            else { await createZone(form); showToast('Zone created!'); }
            setShowModal(false);
            fetchZones();
        } catch (e) { showToast(e.response?.data?.message || 'Failed to save', 'error'); }
    };

    const handleDelete = async (zone) => {
        if (!window.confirm(`Delete zone "${zone.name}"?`)) return;
        try { await deleteZone(zone._id); showToast('Zone deleted'); fetchZones(); }
        catch (e) { showToast('Failed to delete', 'error'); }
    };

    return (
        <div className="p-6 md:p-8">
            {toast && (
                <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-xl font-semibold text-sm ${toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
                    {toast.msg}
                </div>
            )}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2"><FiLayers className="text-green-500" /> Zone Management</h1>
                    <p className="text-gray-500 text-sm mt-1">Define delivery zones and assign riders</p>
                </div>
                <button onClick={openCreate} className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-2.5 px-5 rounded-xl transition-all text-sm">
                    <FiPlus /> Create Zone
                </button>
            </div>

            {loading ? <div className="text-center py-12 text-gray-400">Loading zones...</div> : zones.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                    <FiLayers className="mx-auto text-5xl text-gray-200 mb-3" />
                    <p className="text-gray-400 font-medium">No zones created yet</p>
                    <button onClick={openCreate} className="mt-4 bg-green-500 text-white font-bold py-2.5 px-6 rounded-xl text-sm hover:bg-green-600">Create First Zone</button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {zones.map(zone => (
                        <div key={zone._id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: zone.color }} />
                                <h3 className="font-black text-gray-900 text-sm">{zone.name}</h3>
                                <div className={`ml-auto w-2 h-2 rounded-full ${zone.isActive ? 'bg-green-400' : 'bg-gray-300'}`} />
                            </div>
                            {zone.description && <p className="text-xs text-gray-500 mb-3">{zone.description}</p>}
                            <div className="grid grid-cols-2 gap-2 mb-4">
                                <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                                    <p className="text-xs text-gray-400">Delivery Fee</p>
                                    <p className="font-black text-gray-800">₹{zone.baseDeliveryFee}</p>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                                    <p className="text-xs text-gray-400">Radius</p>
                                    <p className="font-black text-gray-800">{zone.maxDeliveryRadiusKm} km</p>
                                </div>
                            </div>
                            <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                                <span>{zone.assignedRiders?.length || 0} riders assigned</span>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => openEdit(zone)} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold rounded-xl text-xs transition-all">
                                    <FiEdit2 /> Edit
                                </button>
                                <button onClick={() => handleDelete(zone)} className="flex items-center justify-center gap-1.5 py-2 px-3 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl text-xs transition-all">
                                    <FiTrash2 />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <h3 className="text-lg font-black text-gray-900 mb-5">{editing ? 'Edit Zone' : 'Create Zone'}</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-bold text-gray-700 mb-1 block">Zone Name *</label>
                                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                    placeholder="e.g. North Delhi" className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                            </div>
                            <div>
                                <label className="text-sm font-bold text-gray-700 mb-1 block">Description</label>
                                <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                                    placeholder="Optional description" className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-sm font-bold text-gray-700 mb-1 block">Base Delivery Fee (₹)</label>
                                    <input type="number" value={form.baseDeliveryFee} onChange={e => setForm({ ...form, baseDeliveryFee: Number(e.target.value) })}
                                        className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-gray-700 mb-1 block">Max Radius (km)</label>
                                    <input type="number" value={form.maxDeliveryRadiusKm} onChange={e => setForm({ ...form, maxDeliveryRadiusKm: Number(e.target.value) })}
                                        className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-bold text-gray-700 mb-1 block">Map Color</label>
                                <div className="flex items-center gap-3">
                                    <input type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })}
                                        className="w-10 h-10 border border-gray-200 rounded-xl cursor-pointer" />
                                    <span className="text-sm text-gray-500 font-mono">{form.color}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200">Cancel</button>
                            <button onClick={handleSave} className="flex-1 py-3 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600">{editing ? 'Update Zone' : 'Create Zone'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminZones;
