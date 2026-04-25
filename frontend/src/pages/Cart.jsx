import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import CartItem from '../components/CartItem';
import { FiShoppingBag, FiArrowRight, FiCheckCircle, FiGift } from 'react-icons/fi';
import { getFrequentlyBoughtTogether, getAvailableCoupons } from '../services/api';

const FREE_DELIVERY_THRESHOLD = 500;

const Cart = () => {
    const { cart, loading, addToCart } = useCart();
    const navigate = useNavigate();
    const [upsells, setUpsells] = useState([]);
    const [coupons, setCoupons] = useState([]);
    const [appliedCoupon, setAppliedCoupon] = useState(null);

    useEffect(() => {
        if (cart && cart.items.length > 0 && cart.items[0].product) {
            const firstItem = cart.items[0].product._id;
            getFrequentlyBoughtTogether(firstItem)
                .then(res => setUpsells(res.data))
                .catch(console.error);
        }
        getAvailableCoupons().then(res => {
            const activeCoupons = res.data;
            setCoupons(activeCoupons);
            
            // Auto apply best coupon
            if (cart && cart.items.length > 0) {
                let bestCoupon = null;
                let maxDiscountAmt = 0;
                
                activeCoupons.forEach(c => {
                    if (c.isAutoApply && cart.totalPrice >= (c.minOrderValue || 0)) {
                        let potentialDiscount = c.discountType === 'percentage' 
                            ? (cart.totalPrice * c.discountValue) / 100 
                            : c.discountValue;
                        
                        if (c.maxDiscountAmount && potentialDiscount > c.maxDiscountAmount) {
                            potentialDiscount = c.maxDiscountAmount;
                        }
                        
                        if (potentialDiscount > maxDiscountAmt) {
                            maxDiscountAmt = potentialDiscount;
                            bestCoupon = c;
                        }
                    }
                });
                
                if (bestCoupon) {
                    setAppliedCoupon(bestCoupon);
                }
            }
        }).catch(console.error);
    }, [cart?.items?.length, cart?.totalPrice]);

    if (loading) {
        return <div className="flex justify-center mt-20"><div className="animate-spin rounded-full h-12 w-12 border-4 border-secondary border-t-transparent"></div></div>;
    }

    if (!cart || cart.items.length === 0) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center bg-gray-50 dark:bg-gray-900 min-h-[70vh] flex flex-col justify-center items-center transition-colors">
                <div className="w-32 h-32 bg-yellow-50 dark:bg-yellow-900/20 rounded-full flex flex-col items-center justify-center mb-6 shadow-sm border border-yellow-100 dark:border-yellow-800 mx-auto">
                    <FiShoppingBag className="w-12 h-12 text-primary" />
                </div>
                <h2 className="text-3xl font-black text-gray-900 dark:text-gray-100 mb-3 tracking-tight transition-colors">Your cart is empty!</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm mx-auto text-lg transition-colors">Looks like you haven't added anything to your cart yet.</p>
                <button
                    onClick={() => navigate('/')}
                    className="bg-secondary hover:bg-green-700 text-white px-8 py-3.5 rounded-xl font-bold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                >
                    Start Shopping
                </button>
            </div>
        );
    }

    const subTotal = cart.totalPrice;
    const amountAway = Math.max(0, FREE_DELIVERY_THRESHOLD - subTotal);
    const progressPercent = Math.min(100, (subTotal / FREE_DELIVERY_THRESHOLD) * 100);
    
    let discount = 0;
    if (appliedCoupon && subTotal >= (appliedCoupon.minOrderValue || 0)) {
        discount = appliedCoupon.discountType === 'percentage' ? (subTotal * appliedCoupon.discountValue)/100 : appliedCoupon.discountValue;
        if (appliedCoupon.maxDiscountAmount && discount > appliedCoupon.maxDiscountAmount) {
            discount = appliedCoupon.maxDiscountAmount;
        }
        discount = Math.min(subTotal, discount);
    } else if (appliedCoupon) {
        // If they drop below min order value after applying, remove it
        setAppliedCoupon(null);
    }
    
    const finalTotal = subTotal - discount;

    const handleCheckout = () => {
        // Pass coupon details to checkout via state
        navigate('/checkout', { state: { coupon: appliedCoupon, discount } });
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
            <h1 className="text-3xl font-black mb-8 text-gray-900 dark:text-gray-100 tracking-tight transition-colors">Shopping Cart</h1>

            <div className="flex flex-col lg:flex-row gap-8">
                <div className="lg:w-2/3 flex flex-col gap-6">
                    {/* Free Delivery Bar */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
                        <div className="flex justify-between items-center mb-2">
                            <span className="font-bold text-gray-800 dark:text-gray-200">
                                {amountAway > 0 ? `Add ₹${amountAway.toFixed(2)} for FREE Delivery` : '🎁 You unlocked FREE Delivery!'}
                            </span>
                            <FiCheckCircle className={`w-5 h-5 ${amountAway === 0 ? 'text-green-500' : 'text-gray-300 dark:text-gray-600'}`} />
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                            <div className="bg-secondary h-2.5 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
                        {cart.items.filter(item => item.product).map((item) => (
                            <CartItem key={item.product._id} item={item} />
                        ))}
                    </div>

                    {/* Upsell / FBT */}
                    {upsells.length > 0 && (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
                            <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-gray-100">Add-ons (Frequently Bought Together)</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {upsells.map(product => (
                                    <div key={product._id} className="border border-gray-100 dark:border-gray-700 rounded-xl p-3 flex flex-col justify-between items-center text-center hover:shadow-md transition-shadow">
                                        <img src={product.image} alt={product.name} className="w-20 h-20 object-contain mb-2" />
                                        <p className="text-sm font-bold text-gray-800 dark:text-gray-200 line-clamp-1 w-full" title={product.name}>{product.name}</p>
                                        <p className="text-xs text-secondary font-black mb-2">₹{product.currentPrice || product.price}</p>
                                        <button 
                                            onClick={() => addToCart(product._id, 1)}
                                            className="w-full text-xs bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 py-1.5 rounded-lg font-bold hover:bg-secondary dark:hover:bg-secondary dark:hover:text-white transition-colors"
                                        >
                                            + ADD
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="lg:w-1/3">
                    <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 sticky top-24 transition-colors">
                        <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-gray-100 border-b border-gray-100 dark:border-gray-700 pb-4 flex items-center transition-colors">
                            <FiGift className="mr-2 text-primary" /> Apply Coupon
                        </h2>
                        
                        <div className="mb-6 space-y-3">
                            {coupons.filter(c => c.isActive && subTotal >= (c.minOrderValue || 0)).slice(0, 3).map(coupon => (
                                <div key={coupon._id} onClick={() => setAppliedCoupon(coupon)} className={`p-3 border rounded-xl cursor-pointer transition-colors flex justify-between items-center ${appliedCoupon?._id === coupon._id ? 'border-primary bg-yellow-50 dark:bg-yellow-900/20' : 'border-gray-200 dark:border-gray-600 hover:border-primary dark:hover:border-primary'}`}>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-gray-900 dark:text-gray-100">{coupon.code}</p>
                                            {appliedCoupon?._id === coupon._id && coupon.isAutoApply && <span className="bg-primary/20 text-primary text-[10px] uppercase font-black px-1.5 py-0.5 rounded">Best Offer Applied</span>}
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{coupon.title}</p>
                                    </div>
                                    {appliedCoupon?._id === coupon._id && <FiCheckCircle className="text-secondary" />}
                                </div>
                            ))}
                            {coupons.length > 0 && coupons.filter(c => subTotal >= (c.minOrderValue || 0)).length === 0 && (
                                <p className="text-xs text-gray-400 text-center italic mt-2">Add more items to unlock available coupons.</p>
                            )}
                        </div>

                        <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-gray-100 border-b border-gray-100 dark:border-gray-700 pb-4 transition-colors">Order Summary</h2>

                        <div className="space-y-4 mb-6 text-sm text-gray-600 dark:text-gray-300">
                            <div className="flex justify-between border-b border-gray-50 dark:border-gray-700 pb-2 transition-colors">
                                <span>Items ({cart.items.reduce((a, c) => a + c.quantity, 0)})</span>
                                <span className="font-medium text-gray-900 dark:text-gray-100">₹{subTotal.toFixed(2)}</span>
                            </div>
                            
                            {appliedCoupon && (
                                <div className="flex justify-between text-secondary font-medium border-b border-gray-50 dark:border-gray-700 pb-2 transition-colors">
                                    <span>Coupon ({appliedCoupon.code})</span>
                                    <span>-₹{discount.toFixed(2)}</span>
                                </div>
                            )}

                            <div className="flex justify-between pb-2">
                                <span>Delivery Fee</span>
                                <span className={amountAway === 0 ? "text-green-600 font-bold" : "text-gray-900 dark:text-gray-100 font-medium"}>
                                    {amountAway === 0 ? 'FREE' : '₹20'}
                                </span>
                            </div>

                            <div className="border-t border-gray-200 dark:border-gray-700 transition-colors pt-4 flex justify-between items-center text-lg font-black text-gray-900 dark:text-gray-100">
                                <span>To Pay</span>
                                <span className="text-2xl text-secondary">₹{(finalTotal + (amountAway === 0 ? 0 : 20)).toFixed(2)}</span>
                            </div>
                        </div>

                        <button
                            onClick={handleCheckout}
                            className="w-full flex items-center justify-center bg-secondary hover:bg-green-700 text-white py-4 rounded-xl font-bold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 active:scale-95 text-lg cursor-pointer"
                        >
                            Select Delivery <FiArrowRight className="ml-2 w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Cart;
