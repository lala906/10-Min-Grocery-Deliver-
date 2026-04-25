import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCategories, createProduct, uploadImage } from '../../services/api';

const AddProduct = () => {
    const [categories, setCategories] = useState([]);
    const [formData, setFormData] = useState({
        name: '',
        price: '',
        description: '',
        category: '',
        stock: '',
        image: '',
    });
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const { data } = await getCategories();
                setCategories(data || []);
                if (data && data.length > 0) {
                    setFormData(prev => ({ ...prev, category: data[0]._id }));
                }
            } catch (error) {
                console.error('Failed to fetch categories', error);
            }
        };
        fetchCategories();
    }, []);

    const handleImageUpload = async () => {
        if (!file) return formData.image || ''; // Return existing image if no new file

        const uploadData = new FormData();
        uploadData.append('image', file);

        try {
            const response = await uploadImage(uploadData);
            return response.data; // Image URL from backend
        } catch (error) {
            console.error('Image upload failed', error);
            throw new Error('Image upload failed');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const imageUrl = await handleImageUpload();

            const productData = {
                ...formData,
                price: Number(formData.price),
                stock: Number(formData.stock),
                image: imageUrl
            };

            await createProduct(productData);
            navigate('/admin/products');
        } catch (error) {
            console.error('Failed to add product', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 mb-8">Add New Product</h1>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Product Name</label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-secondary focus:border-secondary transition-all"
                                placeholder="Product Name"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Price (₹)</label>
                            <input
                                type="number"
                                required
                                min="0"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-secondary focus:border-secondary transition-all"
                                placeholder="99"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Stock Quantity</label>
                            <input
                                type="number"
                                required
                                min="0"
                                value={formData.stock}
                                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-secondary focus:border-secondary transition-all"
                                placeholder="100"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                            <select
                                required
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-secondary focus:border-secondary transition-all bg-white"
                            >
                                {categories.length === 0 && <option value="">No Categories Found</option>}
                                {categories.map((cat) => (
                                    <option key={cat._id} value={cat._id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Product Image</label>
                            <div className="flex items-center gap-4">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setFile(e.target.files[0])}
                                    required
                                    className="w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-secondary hover:file:bg-green-100 transition-colors"
                                />
                            </div>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                            <textarea
                                required
                                rows="4"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-secondary focus:border-secondary transition-all"
                                placeholder="Product description..."
                            ></textarea>
                        </div>
                    </div>

                    <div className="flex justify-end gap-4 pt-6 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={() => navigate('/admin/products')}
                            className="px-6 py-3 font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-8 py-3 font-bold text-white bg-secondary hover:bg-green-700 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                        >
                            {loading ? 'Adding...' : 'Add Product'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddProduct;
