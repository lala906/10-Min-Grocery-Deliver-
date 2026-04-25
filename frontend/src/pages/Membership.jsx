import React, { useState, useEffect } from 'react';
import { getSubscriptionPlans, getMySubscription, subscribeToPlan } from '../services/api';
import { FiStar, FiCheck, FiTruck, FiPercent } from 'react-icons/fi';
import { branding } from '../config/branding';

const Membership = () => {
    const [plans, setPlans] = useState(null);
    const [mySub, setMySub] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const [plansRes, mySubRes] = await Promise.all([
                getSubscriptionPlans(),
                getMySubscription()
            ]);
            setPlans(plansRes.data);
            setMySub(mySubRes.data);
            setLoading(false);
        } catch (err) {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSubscribe = async (planKey) => {
        if (!window.confirm(`Subscribe to ${plans[planKey].label} for ₹${plans[planKey].price}?`)) return;
        try {
            await subscribeToPlan(planKey);
            alert('Subscribed successfully!');
            fetchData();
        } catch (err) {
            alert(err.response?.data?.message || 'Error subscribing');
        }
    };

    if (loading) return <div className="p-8 text-center">Loading plans...</div>;

    const isActive = mySub && mySub.status === 'active' && new Date(mySub.endDate) > new Date();

    return (
        <div className="max-w-5xl mx-auto px-4 py-12">
            <div className="text-center mb-12">
                <div className="inline-flex items-center justify-center p-4 bg-yellow-100 text-yellow-500 rounded-full mb-4">
                    <FiStar className="h-8 w-8" />
                </div>
                <h1 className="text-4xl font-black text-gray-900 mb-4">{branding.appName} Premium</h1>
                <p className="text-lg text-gray-500">Free delivery, exclusive cashback, and priority support.</p>
            </div>

            {isActive && (
                <div className="mb-12 bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-8 text-white relative overflow-hidden flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold mb-2 flex items-center">
                            <FiStar className="text-yellow-400 mr-2" /> You are a Premium Member
                        </h2>
                        <p className="text-gray-300">
                            Your {mySub.plan} plan is active until {new Date(mySub.endDate).toLocaleDateString('en-IN')}.
                        </p>
                    </div>
                    <div className="text-right">
                        <span className="block text-sm text-gray-400 uppercase tracking-wide font-bold mb-1">Status</span>
                        <span className="bg-green-500 px-3 py-1 rounded-full text-sm font-bold text-white uppercase tracking-wider">Active</span>
                    </div>
                </div>
            )}

            {!isActive && plans && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    {Object.entries(plans).map(([key, plan]) => (
                        <div key={key} className={`bg-white rounded-3xl p-8 border-2 transition-transform hover:-translate-y-2 ${key === 'yearly' ? 'border-primary shadow-xl relative' : 'border-gray-100 shadow-sm'}`}>
                            {key === 'yearly' && (
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-white font-bold px-4 py-1 rounded-full text-sm">
                                    MOST POPULAR
                                </div>
                            )}
                            <h3 className="text-2xl font-bold mb-2 text-gray-900">{plan.label}</h3>
                            <div className="flex items-baseline mb-6">
                                <span className="text-5xl font-black text-gray-900">₹{plan.price}</span>
                                <span className="text-gray-500 ml-2">/ {key === 'monthly' ? 'month' : 'year'}</span>
                            </div>
                            
                            {plan.savings && (
                                <div className="mb-6 inline-block bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold">
                                    Save ₹{plan.savings} compared to monthly
                                </div>
                            )}

                            <ul className="mb-8 space-y-4">
                                {plan.features.map((feat, idx) => (
                                    <li key={idx} className="flex items-start">
                                        <div className="mt-1 mr-3 flex-shrink-0 text-secondary bg-green-50 rounded-full p-1">
                                            <FiCheck size={14} strokeWidth={3} />
                                        </div>
                                        <span className="text-gray-700 font-medium">{feat}</span>
                                    </li>
                                ))}
                            </ul>

                            <button
                                onClick={() => handleSubscribe(key)}
                                className={`w-full py-4 rounded-xl font-bold text-lg transition-colors ${key === 'yearly' ? 'bg-primary hover:bg-yellow-500 text-gray-900' : 'bg-gray-900 hover:bg-gray-800 text-white'}`}
                            >
                                Choose {key === 'monthly' ? 'Monthly' : 'Yearly'}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Membership;
