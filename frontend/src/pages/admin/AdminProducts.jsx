import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getProducts, deleteProduct } from '../../services/api';
import { FiPlus, FiEdit, FiTrash2 } from 'react-icons/fi';

const AdminProducts = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchProducts = async () => {
        try {
            const { data } = await getProducts();
            setProducts(data || []);
        } catch (error) {
            console.error('Failed to fetch products', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this product?')) {
            try {
                await deleteProduct(id);
                fetchProducts(); // Refresh list
            } catch (error) {
                console.error('Failed to delete product', error);
            }
        }
    };

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Products Management</h1>
                <Link
                    to="/admin/products/add"
                    className="flex items-center gap-2 bg-secondary hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
                >
                    <FiPlus /> Add Product
                </Link>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading products...</div>
                ) : products.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No products found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full whitespace-nowrap">
                            <thead className="bg-gray-50 border-b border-gray-200 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Image</th>
                                    <th className="px-6 py-4">Name</th>
                                    <th className="px-6 py-4">Price</th>
                                    <th className="px-6 py-4">Category</th>
                                    <th className="px-6 py-4">Stock</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {products.map((product) => (
                                    <tr key={product._id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="w-12 h-12 bg-white border border-gray-100 rounded-lg p-1">
                                                <img src={product.image} alt={product.name} className="w-full h-full object-contain mix-blend-multiply" />
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            <div className="max-w-[200px] truncate">{product.name}</div>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-gray-900">₹{product.price}</td>
                                        <td className="px-6 py-4 text-gray-500">{product.category?.name || '-'}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${product.stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                }`}>
                                                {product.stock}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-3">
                                            <Link
                                                to={`/admin/products/edit/${product._id}`}
                                                className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                                            >
                                                <FiEdit className="w-4 h-4" />
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(product._id)}
                                                className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                            >
                                                <FiTrash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminProducts;
