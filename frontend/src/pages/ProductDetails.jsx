import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProductById } from '../services/api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

const ProductDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);

    const { cart, addToCart, updateQuantity } = useCart();
    const { userInfo } = useAuth();

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const { data } = await getProductById(id);
                setProduct(data);
            } catch (error) {
                console.error('Failed to load product', error);
            } finally {
                setLoading(false);
            }
        };
        fetchProduct();
    }, [id]);

    if (loading) return <div className="flex justify-center mt-20"><div className="animate-spin rounded-full h-12 w-12 border-4 border-secondary border-t-transparent"></div></div>;
    if (!product) return <div className="text-center mt-20 text-xl font-medium text-gray-500">Product not found.</div>;

    const cartItem = cart?.items?.find((item) => item.product._id === product._id);

    const handleAdd = async () => {
        if (!userInfo) return navigate('/login');
        await addToCart(product._id, 1);
    };

    const handleUpdate = async (qty) => {
        if (qty >= 0) {
            await updateQuantity(product._id, qty);
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 bg-gray-50 min-h-screen">
            <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 flex flex-col md:flex-row gap-0 md:gap-12 p-8 mb-8">

                <div className="md:w-1/2 flex justify-center items-center bg-gray-50 rounded-2xl p-12 relative overflow-hidden group">
                    <img
                        src={product.image || '/placeholder.png'}
                        alt={product.name}
                        className="max-w-full max-h-[400px] object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-500"
                    />
                </div>

                <div className="md:w-1/2 flex flex-col pt-8 md:pt-4">
                    <div className="mb-2 inline-flex">
                        <span className="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">{product.category?.name || 'Category'}</span>
                    </div>

                    <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-4 tracking-tight leading-tight">{product.name}</h1>

                    <div className="flex items-center gap-4 mb-8">
                        <span className="text-4xl font-black text-gray-900">₹{product.price}</span>
                        {product.stock > 0 ? (
                            <span className="text-sm font-medium text-green-600 flex items-center bg-green-50 px-3 py-1 rounded-full"><span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>In Stock ({product.stock})</span>
                        ) : (
                            <span className="text-sm font-medium text-red-600 flex items-center bg-red-50 px-3 py-1 rounded-full"><span className="w-2 h-2 rounded-full bg-red-500 mr-2"></span>Out of Stock</span>
                        )}
                    </div>

                    <p className="text-gray-600 text-lg leading-relaxed mb-10">{product.description}</p>

                    <div className="mt-auto pt-6 border-t border-gray-100">
                        {cartItem ? (
                            <div className="flex items-center bg-secondary text-white rounded-xl h-14 font-medium shadow-lg hover:shadow-xl transition-shadow overflow-hidden max-w-xs transition-transform transform active:scale-95">
                                <button
                                    onClick={() => handleUpdate(cartItem.quantity - 1)}
                                    className="w-16 h-full hover:bg-green-700 flex items-center justify-center text-2xl transition-colors pb-1"
                                >-</button>
                                <div className="flex-1 text-center flex flex-col justify-center border-x border-green-600/30">
                                    <span className="text-xl font-bold leading-none">{cartItem.quantity}</span>
                                    <span className="text-[10px] uppercase font-bold tracking-wider opacity-80 mt-1">in cart</span>
                                </div>
                                <button
                                    onClick={() => handleUpdate(cartItem.quantity + 1)}
                                    disabled={cartItem.quantity >= product.stock}
                                    className="w-16 h-full disabled:bg-gray-400 hover:bg-green-700 flex items-center justify-center text-2xl transition-colors pb-1"
                                >+</button>
                            </div>
                        ) : (
                            <button
                                onClick={handleAdd}
                                disabled={product.stock === 0}
                                className="w-full md:w-auto px-12 h-14 bg-secondary hover:bg-green-700 text-white font-bold rounded-xl text-lg transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-1 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                            >
                                Add to Cart
                            </button>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};

export default ProductDetails;
