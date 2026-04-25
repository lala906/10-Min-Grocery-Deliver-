 import React, { createContext, useState, useEffect, useContext } from 'react';
import { useAuth } from './AuthContext';
import { getCart, addToCart as apiAdd, updateCartItem as apiUpdate, removeFromCart as apiRemove } from '../services/api';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
    const { userInfo } = useAuth();
    const [cart, setCart] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (userInfo) {
            fetchCart();
        } else {
            setCart(null);
        }
    }, [userInfo]);

    const sanitizeCart = (cartData) => {
        if (cartData && cartData.items) {
            cartData.items = cartData.items.filter(item => item.product != null);
        }
        return cartData;
    };

    const fetchCart = async () => {
        setLoading(true);
        try {
            const { data } = await getCart();
            setCart(sanitizeCart(data));
        } catch (error) {
            console.error('Failed to fetch cart', error);
        }
        setLoading(false);
    };

    const addToCart = async (productId, quantity = 1) => {
        try {
            const { data } = await apiAdd(productId, quantity);
            setCart(sanitizeCart(data));
            return true;
        } catch (error) {
            console.error('Failed to add to cart', error);
            return false;
        }
    };

    const updateQuantity = async (productId, quantity) => {
        try {
            const { data } = await apiUpdate(productId, quantity);
            setCart(sanitizeCart(data));
            return true;
        } catch (error) {
            console.error('Failed to update cart', error);
            return false;
        }
    };

    const removeItem = async (productId) => {
        try {
            const { data } = await apiRemove(productId);
            setCart(sanitizeCart(data));
            return true;
        } catch (error) {
            console.error('Failed to remove item', error);
            return false;
        }
    };

    const clearCartState = () => {
        setCart(null);
    };

    return (
        <CartContext.Provider value={{ cart, loading, addToCart, updateQuantity, removeItem, fetchCart, clearCartState }}>
            {children}
        </CartContext.Provider>
    );
};
