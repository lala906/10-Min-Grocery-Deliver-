import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getCategories, getProductById, updateProduct, uploadImage } from '../../services/api';

const EditProduct = () => {
    const { id } = useParams();
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
    const [fetching, setFetching] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const catRes = await getCategories();
                setCategories(catRes.data || []);

                const prodRes = await getProductById(id);
                if (prodRes.data) {
                    setFormData({
                        name: prodRes.data.name,
                        price: prodRes.data.price,
                        description: prodRes.data.description,
                        category: prodRes.data.category?._id || '',
                        stock: prodRes.data.stock,
                        image: prodRes.data.image,
                    });
                }
            } catch (error) {
                console.error('Failed to fetch data', error);
            } finally {
                setFetching(false);
            }
        };
        fetchData();
    }, [id]);

    const handleImageUpload = async () => {
        if (!file) return formData.image || '';

        const uploadData = new FormData();
        uploadData.append('image', file);

        try {
            const response = await uploadImage(uploadData);
            return response.data;
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

            await updateProduct(id, productData);
            navigate('/admin/products');
        } catch (error) {
            console.error('Failed to update product', error);
        } finally {
            setLoading(false);
        }
    };

    if (fetching) return <div className="p-8 text-center text-gray-500">Loading product data...</div>;

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 mb-8">Edit Product</h1>

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
                                {categories.map((cat) => (
                                    <option key={cat._id} value={cat._id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Update Product Image (Optional)</label>
                            <div className="flex items-center gap-6">
                                {formData.image && (
                                    <img src={formData.image} alt="Current" className="w-16 h-16 object-contain border border-gray-200 rounded-lg p-1" />
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setFile(e.target.files[0])}
                                    className="w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 transition-colors"
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
                            className="px-8 py-3 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                        >
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditProduct;
