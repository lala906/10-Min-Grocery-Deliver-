import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

const ProductCard = ({ product }) => {
    const { addToCart, cart, updateQuantity } = useCart();
    const { userInfo } = useAuth();
    const navigate = useNavigate();
    const { t } = useTranslation();

    const cartItem = cart?.items?.find((item) => item.product?._id === product._id);
    const isOutOfStock = product.stock <= 0;

    const handleAdd = async (e) => {
        e.preventDefault();
        if (isOutOfStock) return;
        if (!userInfo) {
            navigate('/login');
            return;
        }
        await addToCart(product._id, 1);
    };

    const handleUpdate = async (e, qty) => {
        e.preventDefault();
        if (qty >= 0) {
            // Prevent adding more if quantity >= stock
            if (qty > cartItem.quantity && cartItem.quantity >= product.stock) {
                alert(`Only ${product.stock} items left in stock.`);
                return;
            }
            await updateQuantity(product._id, qty);
        }
    };

    return (
        <Link to={`/product/${product._id}`} className={`block bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 group relative ${isOutOfStock ? 'opacity-70' : ''}`}>
            {isOutOfStock && (
                <div className="absolute inset-0 bg-transparent z-10 flex flex-col justify-center items-center pointer-events-none">
                    <span className="bg-red-500 text-white font-bold px-3 py-1 rounded text-xs shadow-md uppercase tracking-wide">
                        {t('out_of_stock')}
                    </span>
                </div>
            )}
            {product.discountBadge && !isOutOfStock && (
                <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-black px-2 py-1 rounded shadow-md z-20">
                    {product.discountBadge}
                </div>
            )}
            <div className="relative pt-[100%] bg-gray-50 dark:bg-gray-900 overflow-hidden border-b border-gray-100 dark:border-gray-700 transition-colors duration-300">
                <img
                    src={product.image || '/placeholder.png'}
                    alt={product.name}
                    className={`absolute inset-0 w-full h-full object-contain p-4 transition-transform duration-300 ${!isOutOfStock && 'group-hover:scale-105'} ${isOutOfStock ? 'grayscale opacity-50' : ''}`}
                />
            </div>
            <div className="p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 line-clamp-1">{product.category?.name || 'Category'}</p>
                <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm mb-2 line-clamp-2 min-h-[40px] leading-tight transition-colors">
                    {product.name}
                </h3>
                <div className="flex items-center justify-between mt-4">
                    <div className="flex flex-col">
                        <span className="text-gray-400 dark:text-gray-500 text-xs mb-0.5">Price</span>
                        <span className="font-bold text-gray-900 dark:text-gray-100">₹{product.price}</span>
                    </div>

                    {cartItem ? (
                        <div className="flex items-center bg-secondary text-white rounded-lg h-9 font-medium overflow-hidden shadow-sm z-20 relative">
                            <button
                                onClick={(e) => handleUpdate(e, cartItem.quantity - 1)}
                                className="w-8 h-full hover:bg-green-700 flex items-center justify-center transition-colors"
                            >-</button>
                            <span className="w-8 text-center text-sm">{cartItem.quantity}</span>
                            <button
                                onClick={(e) => handleUpdate(e, cartItem.quantity + 1)}
                                className="w-8 h-full hover:bg-green-700 flex items-center justify-center transition-colors"
                            >+</button>
                        </div>
                    ) : (
                        <button
                            onClick={handleAdd}
                            disabled={isOutOfStock}
                            className={`px-4 h-9 border font-medium rounded-lg text-sm transition-all duration-200 z-20 relative ${isOutOfStock ? 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'border-secondary text-secondary hover:bg-secondary hover:text-white'}`}
                        >
                            {t('add_to_cart')}
                        </button>
                    )}
                </div>
            </div>
        </Link>
    );
};

export default ProductCard;
