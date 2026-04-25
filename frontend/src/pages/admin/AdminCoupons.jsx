import React, { useState, useEffect } from 'react';
import { getCoupons, createCoupon, updateCoupon, deleteCoupon } from '../../services/api';
import { FiPlus, FiEdit2, FiTrash2, FiTag, FiClock, FiPercent, FiDollarSign } from 'react-icons/fi';

const AdminCoupons = () => {
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    
    // Form state
    const [formData, setFormData] = useState({
        code: '',
        title: '',
        description: '',
        discountType: 'percentage',
        discountValue: '',
        maxDiscountAmount: '',
        expiryDate: '',
        usageLimit: 100,
        minOrderValue: 0,
        isActive: true,
        userType: 'all',
        isAutoApply: false
    });

    const [editId, setEditId] = useState(null);

    const fetchCoupons = async () => {
        try {
            setLoading(true);
            const res = await getCoupons();
            setCoupons(res.data);
            setLoading(false);
        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCoupons();
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleOpenModal = (coupon = null) => {
        if (coupon) {
            setIsEditing(true);
            setEditId(coupon._id);
            setFormData({
                code: coupon.code,
                title: coupon.title || '',
                description: coupon.description || '',
                discountType: coupon.discountType,
                discountValue: coupon.discountValue,
                maxDiscountAmount: coupon.maxDiscountAmount || '',
                expiryDate: new Date(coupon.expiryDate).toISOString().slice(0, 16),
                usageLimit: coupon.usageLimit,
                minOrderValue: coupon.minOrderValue || 0,
                isActive: coupon.isActive,
                userType: coupon.userType || 'all',
                isAutoApply: coupon.isAutoApply || false
            });
        } else {
            setIsEditing(false);
            setEditId(null);
            setFormData({
                code: '',
                title: '',
                description: '',
                discountType: 'percentage',
                discountValue: '',
                maxDiscountAmount: '',
                expiryDate: '',
                usageLimit: 100,
                minOrderValue: 0,
                isActive: true,
                userType: 'all',
                isAutoApply: false
            });
        }
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isEditing) {
                await updateCoupon(editId, formData);
            } else {
                await createCoupon(formData);
            }
            setShowModal(false);
            fetchCoupons();
        } catch (error) {
            alert(error.response?.data?.message || 'Error saving coupon');
        }
    };

    const handleDelete = async (id) => {
        if(window.confirm('Are you sure you want to delete this coupon?')) {
            try {
                await deleteCoupon(id);
                fetchCoupons();
            } catch (error) {
                alert('Error deleting coupon');
            }
        }
    };

    if (loading) return <div className="p-8">Loading coupons...</div>;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900 border-l-4 border-secondary pl-3">Coupon Management</h1>
                <button 
                    onClick={() => handleOpenModal()}
                    className="flex items-center bg-secondary hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                    <FiPlus className="mr-2" /> Create Coupon
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Discount</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usage Limit</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expiry</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {coupons.map((coupon) => (
                            <tr key={coupon._id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0 h-10 w-10 bg-yellow-50 text-yellow-600 rounded-lg flex items-center justify-center">
                                            <FiTag className="h-5 w-5" />
                                        </div>
                                        <div className="ml-4">
                                            <div className="text-sm font-bold text-gray-900">{coupon.code}</div>
                                            <div className="text-sm text-gray-500">{coupon.isAutoApply ? 'Auto-Apply' : 'Manual'}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-bold text-gray-900 flex items-center">
                                        {coupon.discountType === 'percentage' ? <FiPercent className="mr-1 text-gray-400" /> : <FiDollarSign className="mr-1 text-gray-400" />}
                                        {coupon.discountValue}{coupon.discountType === 'percentage' ? '%' : ' OFF'}
                                    </div>
                                    {coupon.minOrderValue > 0 && <div className="text-xs text-gray-500">Min: ₹{coupon.minOrderValue}</div>}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-900">{coupon.usedCount} / {coupon.usageLimit}</div>
                                    <div className="w-24 bg-gray-200 rounded-full h-1.5 mt-1">
                                        <div className="bg-secondary h-1.5 rounded-full" style={{ width: `${Math.min(100, (coupon.usedCount / coupon.usageLimit) * 100)}%` }}></div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className={`text-sm flex items-center ${new Date(coupon.expiryDate) < new Date() ? 'text-red-500 font-bold' : 'text-gray-900'}`}>
                                        <FiClock className="mr-1.5" />
                                        {new Date(coupon.expiryDate).toLocaleDateString()}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${coupon.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {coupon.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button onClick={() => handleOpenModal(coupon)} className="text-indigo-600 hover:text-indigo-900 mr-4">
                                        <FiEdit2 className="h-5 w-5 inline" />
                                    </button>
                                    <button onClick={() => handleDelete(coupon._id)} className="text-red-600 hover:text-red-900">
                                        <FiTrash2 className="h-5 w-5 inline" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
                    <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-gray-900">{isEditing ? 'Edit Coupon' : 'Create New Coupon'}</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-500 pt-1">
                                <span className="text-2xl">&times;</span>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Coupon Code *</label>
                                    <input type="text" name="code" required value={formData.code} onChange={handleChange} className="w-full border-gray-300 border rounded-lg p-2 uppercase" placeholder="e.g. SUMMER50" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                                    <input type="text" name="title" value={formData.title} onChange={handleChange} className="w-full border-gray-300 border rounded-lg p-2" placeholder="Summer Special 50% Off!" />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type *</label>
                                    <select name="discountType" value={formData.discountType} onChange={handleChange} className="w-full border-gray-300 border rounded-lg p-2">
                                        <option value="percentage">Percentage (%)</option>
                                        <option value="fixed">Flat Amount (₹)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Discount Value *</label>
                                    <input type="number" name="discountValue" required value={formData.discountValue} onChange={handleChange} className="w-full border-gray-300 border rounded-lg p-2" min="1" />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Order Value</label>
                                    <input type="number" name="minOrderValue" value={formData.minOrderValue} onChange={handleChange} className="w-full border-gray-300 border rounded-lg p-2" min="0" />
                                </div>
                                {formData.discountType === 'percentage' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Max Discount Amount (Cap)</label>
                                        <input type="number" name="maxDiscountAmount" value={formData.maxDiscountAmount} onChange={handleChange} className="w-full border-gray-300 border rounded-lg p-2" min="0" />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Total Usage Limit *</label>
                                    <input type="number" name="usageLimit" required value={formData.usageLimit} onChange={handleChange} className="w-full border-gray-300 border rounded-lg p-2" min="1" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date *</label>
                                    <input type="datetime-local" name="expiryDate" required value={formData.expiryDate} onChange={handleChange} className="w-full border-gray-300 border rounded-lg p-2" />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Target End Users</label>
                                    <select name="userType" value={formData.userType} onChange={handleChange} className="w-full border-gray-300 border rounded-lg p-2">
                                        <option value="all">All Users</option>
                                        <option value="first_time">First-Time Users Only</option>
                                        <option value="subscribed">Premium Subscribers Only</option>
                                    </select>
                                </div>

                                <div className="flex flex-col justify-center space-y-2 col-span-2 sm:col-span-1 mt-4">
                                    <label className="flex items-center text-sm">
                                        <input type="checkbox" name="isAutoApply" checked={formData.isAutoApply} onChange={handleChange} className="rounded text-secondary w-4 h-4 mr-2" />
                                        Auto-Apply Best Coupon at Checkout
                                    </label>
                                    <label className="flex items-center text-sm">
                                        <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleChange} className="rounded text-secondary w-4 h-4 mr-2" />
                                        Active (Visible immediately)
                                    </label>
                                </div>
                            </div>
                            
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description (Internal / T&C)</label>
                                <textarea name="description" value={formData.description} onChange={handleChange} className="w-full border-gray-300 border rounded-lg p-2" rows="2"></textarea>
                            </div>

                            <div className="flex justify-end gap-3 mt-6 border-t pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium">Cancel</button>
                                <button type="submit" className="px-5 py-2 bg-secondary text-white rounded-lg hover:bg-green-700 font-medium shadow-sm">
                                    {isEditing ? 'Save Changes' : 'Create Coupon'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminCoupons;
