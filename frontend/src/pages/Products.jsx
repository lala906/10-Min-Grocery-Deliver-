import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getProducts } from '../services/api';
import ProductCard from '../components/ProductCard';
import { FiFilter, FiSearch } from 'react-icons/fi';

const Products = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchParams] = useSearchParams();
    const searchTerm = searchParams.get('search') || '';

    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true);
            try {
                const { data } = await getProducts();

                let filteredProducts = data || [];
                if (searchTerm) {
                    filteredProducts = filteredProducts.filter((p) =>
                        p.name.toLowerCase().includes(searchTerm.toLowerCase())
                    );
                }

                setProducts(filteredProducts);
            } catch (error) {
                console.error('Failed to fetch products', error);
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, [searchTerm]);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen bg-gray-50">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
                        {searchTerm ? `Search results for "${searchTerm}"` : 'All Products'}
                    </h1>
                    <p className="text-gray-500 mt-1">{products.length} products found</p>
                </div>

                <div className="flex items-center gap-2">
                    <button className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors shadow-sm">
                        <FiFilter /> Sort
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-secondary border-t-transparent"></div>
                </div>
            ) : products.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm mt-8">
                    <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <FiSearch className="h-10 w-10 text-gray-300" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">No products found</h2>
                    <p className="text-gray-500 max-w-md mx-auto">We couldn't find any products matching your search. Try checking your spelling or using more general terms.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {products.map((product) => (
                        <ProductCard key={product._id} product={product} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default Products;
