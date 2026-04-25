import React, { useEffect, useState } from 'react';
import { getCategories, createCategory, deleteCategory } from '../../services/api';
import { FiPlus, FiTrash2 } from 'react-icons/fi';

const AdminCategories = () => {
    const [categories, setCategories] = useState([]);
    const [newCatName, setNewCatName] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchCategories = async () => {
        try {
            const { data } = await getCategories();
            setCategories(data || []);
        } catch (error) {
            console.error('Failed to fetch categories', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newCatName) return;
        try {
            await createCategory({ name: newCatName, description: 'Created by Admin', image: '/placeholder.png' });
            setNewCatName('');
            fetchCategories();
        } catch (error) {
            console.error('Failed to add category', error);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Delete category?')) {
            try {
                await deleteCategory(id);
                fetchCategories();
            } catch (error) {
                console.error('Failed to delete category', error);
            }
        }
    };

    return (
        <div className="p-8 max-w-5xl">
            <h1 className="text-2xl font-bold text-gray-900 mb-8">Categories Management</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-1">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sticky top-8">
                        <h2 className="text-lg font-bold mb-4 text-gray-900">Add Category</h2>
                        <form onSubmit={handleAdd} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Category Name</label>
                                <input
                                    type="text"
                                    required
                                    value={newCatName}
                                    onChange={(e) => setNewCatName(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-secondary focus:border-secondary transition-all"
                                    placeholder="e.g. Dairy & Eggs"
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full flex justify-center items-center gap-2 bg-secondary hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-all shadow-sm"
                            >
                                <FiPlus /> Add
                            </button>
                        </form>
                    </div>
                </div>

                <div className="md:col-span-2">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        {loading ? (
                            <div className="p-8 text-center text-gray-500">Loading categories...</div>
                        ) : categories.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">No categories found.</div>
                        ) : (
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4">Name</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {categories.map((cat) => (
                                        <tr key={cat._id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-gray-900">{cat.name}</td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => handleDelete(cat._id)}
                                                    className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                                >
                                                    <FiTrash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminCategories;
