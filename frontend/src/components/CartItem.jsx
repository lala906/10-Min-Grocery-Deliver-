import React from 'react';
import { useCart } from '../context/CartContext';
import { FiTrash2 } from 'react-icons/fi';

const CartItem = ({ item }) => {
    const { updateQuantity, removeItem } = useCart();

    const handleUpdate = async (qty) => {
        if (qty > 0) {
            await updateQuantity(item.product._id, qty);
        } else {
            await removeItem(item.product._id);
        }
    };

    const handleRemove = async () => {
        await removeItem(item.product._id);
    };

    return (
        <div className="flex items-center p-4 bg-white border-b border-gray-100 last:border-b-0">
            <div className="w-20 h-20 bg-gray-50 p-2 rounded-lg flex-shrink-0">
                <img
                    src={item.product.image || '/placeholder.png'}
                    alt={item.product.name}
                    className="w-full h-full object-contain mix-blend-multiply"
                />
            </div>

            <div className="ml-4 flex-1">
                <h4 className="font-semibold text-gray-800 text-sm line-clamp-1">{item.product.name}</h4>
                <p className="text-xs text-gray-500 mt-1">₹{item.price}</p>
                <p className="font-bold text-gray-900 mt-1">₹{item.price * item.quantity}</p>
            </div>

            <div className="flex flex-col items-end justify-between h-full ml-4">
                <button onClick={handleRemove} className="text-gray-400 hover:text-red-500 mb-2 p-1 rounded-full hover:bg-red-50 transition-colors">
                    <FiTrash2 className="w-4 h-4" />
                </button>

                <div className="flex items-center bg-secondary text-white rounded-lg h-8 font-medium shadow-sm overflow-hidden">
                    <button
                        onClick={() => handleUpdate(item.quantity - 1)}
                        className="w-8 h-full hover:bg-green-700 flex items-center justify-center transition-colors text-lg leading-none pb-0.5"
                    >
                        -
                    </button>
                    <span className="w-8 text-center text-sm">{item.quantity}</span>
                    <button
                        onClick={() => handleUpdate(item.quantity + 1)}
                        className="w-8 h-full hover:bg-green-700 flex items-center justify-center transition-colors text-lg leading-none pb-0.5"
                    >
                        +
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CartItem;
