import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { branding } from '../config/branding';
import AppLogo from '../components/AppLogo';
import { FiShoppingBag, FiTruck, FiBriefcase, FiArrowLeft } from 'react-icons/fi';

const Login = () => {
    // Role selection state
    const [selectedRole, setSelectedRole] = useState(null);

    // Form states
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [otpTimer, setOtpTimer] = useState(0);
    
    // UI states
    const [localError, setLocalError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const { login, loginAsRider, error } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Auto-suggest role based on previous selection
    useEffect(() => {
        const savedRole = localStorage.getItem('lastSelectedRole');
        if (savedRole && !location.state?.resetRole) {
            setSelectedRole(savedRole);
        }
    }, [location]);

    // OTP Timer effect
    useEffect(() => {
        let timer;
        if (otpTimer > 0) {
            timer = setTimeout(() => setOtpTimer(otpTimer - 1), 1000);
        }
        return () => clearTimeout(timer);
    }, [otpTimer]);

    const handleRoleSelect = (role) => {
        setSelectedRole(role);
        localStorage.setItem('lastSelectedRole', role);
        setLocalError('');
    };

    const redirectUser = (role) => {
        if (role === 'admin') navigate('/admin/dashboard');
        else if (role === 'rider') navigate('/rider/dashboard');
        else if (role === 'shop_owner') navigate('/shop/dashboard');
        else navigate('/');
    };

    const handleCustomerLogin = async (e) => {
        e.preventDefault();
        setLocalError('');
        setIsLoading(true);
        const success = await login(email, password);
        setIsLoading(false);
        if (success) {
            // Context updates userInfo, we assume role customer/admin
            const info = JSON.parse(localStorage.getItem('userInfo'));
            redirectUser(info?.data?.role || 'user');
        }
    };

    const handleRiderLogin = async (e) => {
        e.preventDefault();
        setLocalError('');
        setIsLoading(true);
        const success = await loginAsRider(phone, password);
        setIsLoading(false);
        if (success) {
            redirectUser('rider');
        } else {
            setLocalError('Invalid Rider Credentials');
        }
    };

    const handleShopSendOtp = async () => {
        if (!phone || phone.length < 10) {
            setLocalError('Enter valid phone number');
            return;
        }
        setLocalError('');
        setIsLoading(true);
        try {
            await api.post('/auth/send-otp', { phone });
            setOtpSent(true);
            setOtpTimer(30);
        } catch (err) {
            setLocalError(err.response?.data?.message || 'Failed to send OTP');
        } finally {
            setIsLoading(false);
        }
    };

    const handleShopLogin = async (e) => {
        e.preventDefault();
        if (!otpSent) return handleShopSendOtp();
        
        if (!otp || String(otp).trim() === '') {
            setLocalError('Please enter the OTP');
            return;
        }

        console.log(`[DEBUG] Attempting OTP verification for phone: ${phone}, otp: ${otp}`);
        
        setLocalError('');
        setIsLoading(true);
        try {
            const { data } = await api.post('/auth/verify-otp', { phone, otp });
            if (data.data?.token) {
                // User logged in via OTP
                const packagedData = { status: 'success', data: data.data };
                localStorage.setItem('userInfo', JSON.stringify(packagedData));
                window.location.href = '/shop/dashboard'; // full reload to update context cleanly
            } else {
                setLocalError('Account not found. Please register as a shop partner.');
            }
        } catch (err) {
            setLocalError(err.response?.data?.message || 'Invalid OTP');
        } finally {
            setIsLoading(false);
        }
    };

    // Role Selection View
    if (!selectedRole) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
                <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
                    <div className="flex justify-center mb-6">
                        <Link to="/" className="hover:opacity-80 transition-opacity">
                            <AppLogo className="text-4xl" />
                        </Link>
                    </div>
                    <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Select your role</h2>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Choose how you want to interact with {branding.appName}</p>
                </div>

                <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
                    <div className="grid grid-cols-1 gap-4 px-4 sm:px-0">
                        {/* Customer Role */}
                        <button 
                            onClick={() => handleRoleSelect('customer')}
                            className="flex items-center p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-md border border-gray-100 dark:border-gray-700 transition-all group"
                        >
                            <div className="h-16 w-16 bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                <FiShoppingBag size={28} />
                            </div>
                            <div className="ml-6 text-left">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">Continue as Customer</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Shop groceries, manage orders, and check wallet.</p>
                            </div>
                        </button>

                        {/* Shop Owner Role */}
                        <button 
                            onClick={() => handleRoleSelect('shop')}
                            className="flex items-center p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-md border border-gray-100 dark:border-gray-700 transition-all group"
                        >
                            <div className="h-16 w-16 bg-orange-50 dark:bg-orange-900 text-orange-600 dark:text-orange-300 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                <FiBriefcase size={28} />
                            </div>
                            <div className="ml-6 text-left">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-orange-600 transition-colors">Become a Shop Owner</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage store inventory, process incoming orders.</p>
                            </div>
                        </button>

                        {/* Rider Role */}
                        <button 
                            onClick={() => handleRoleSelect('rider')}
                            className="flex items-center p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-md border border-gray-100 dark:border-gray-700 transition-all group"
                        >
                            <div className="h-16 w-16 bg-green-50 dark:bg-green-900 text-green-600 dark:text-green-300 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                <FiTruck size={28} />
                            </div>
                            <div className="ml-6 text-left">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-green-600 transition-colors">Delivery Partner (Rider)</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Accept deliveries, track route, and manage earnings.</p>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Login Form View
    const displayError = localError || error;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md relative">
                <button 
                    onClick={() => handleRoleSelect(null)} 
                    className="absolute -top-12 left-0 sm:-left-12 flex items-center text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition-colors"
                >
                    <FiArrowLeft className="mr-2" /> Change Role
                </button>
                <div className="flex justify-center mb-6">
                    <Link to="/" className="hover:opacity-80 transition-opacity">
                        <AppLogo className="text-4xl" />
                    </Link>
                </div>
                <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                    Sign in as {selectedRole === 'customer' ? 'Customer' : selectedRole === 'rider' ? 'Delivery Partner' : 'Shop Owner'}
                </h2>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white dark:bg-gray-800 py-10 px-6 shadow-xl rounded-3xl sm:px-10 border border-gray-100 dark:border-gray-700">
                    
                    {displayError && <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-medium">{displayError}</div>}

                    {/* Customer Login */}
                    {selectedRole === 'customer' && (
                        <form className="space-y-6" onSubmit={handleCustomerLogin}>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Email address</label>
                                <input
                                    type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                                    className="appearance-none block w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm focus:ring-2 focus:ring-secondary focus:border-transparent sm:text-sm dark:bg-gray-700 dark:text-white transition-all"
                                    placeholder="you@example.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Password</label>
                                <input
                                    type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                                    className="appearance-none block w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm focus:ring-2 focus:ring-secondary focus:border-transparent sm:text-sm dark:bg-gray-700 dark:text-white transition-all"
                                    placeholder="••••••••"
                                />
                            </div>
                            <button type="submit" disabled={isLoading} className="w-full py-3.5 px-4 rounded-xl shadow-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 transition-all duration-200">
                                {isLoading ? 'Signing In...' : 'Sign In'}
                            </button>
                        </form>
                    )}

                    {/* Rider Login */}
                    {selectedRole === 'rider' && (
                        <form className="space-y-6" onSubmit={handleRiderLogin}>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Phone Number</label>
                                <input
                                    type="text" required value={phone} onChange={(e) => setPhone(e.target.value)}
                                    className="appearance-none block w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm focus:ring-2 focus:ring-secondary focus:border-transparent sm:text-sm dark:bg-gray-700 dark:text-white transition-all"
                                    placeholder="10 digit number"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Password</label>
                                <input
                                    type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                                    className="appearance-none block w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm focus:ring-2 focus:ring-secondary focus:border-transparent sm:text-sm dark:bg-gray-700 dark:text-white transition-all"
                                    placeholder="••••••••"
                                />
                            </div>
                            <button type="submit" disabled={isLoading} className="w-full py-3.5 px-4 rounded-xl shadow-lg text-sm font-bold text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-600 transition-all duration-200">
                                {isLoading ? 'Signing In...' : 'Sign In as Rider'}
                            </button>
                        </form>
                    )}

                    {/* Shop Owner Login */}
                    {selectedRole === 'shop' && (
                        <form className="space-y-6" onSubmit={handleShopLogin}>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Registered Phone Number</label>
                                <input
                                    type="text" required disabled={otpSent} value={phone} onChange={(e) => setPhone(e.target.value)}
                                    className="appearance-none block w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm focus:ring-2 focus:ring-secondary focus:border-transparent sm:text-sm dark:bg-gray-700 dark:text-white disabled:opacity-50 transition-all"
                                    placeholder="10 digit number"
                                />
                            </div>
                            {otpSent && (
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Enter OTP</label>
                                    <input
                                        type="text" required value={otp} onChange={(e) => setOtp(e.target.value)}
                                        className="appearance-none block w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm focus:ring-2 focus:ring-secondary focus:border-transparent sm:text-sm dark:bg-gray-700 dark:text-white transition-all"
                                        placeholder="6 digit OTP"
                                    />
                                    <div className="flex justify-end mt-2">
                                        <button 
                                            type="button" 
                                            disabled={otpTimer > 0 || isLoading}
                                            onClick={handleShopSendOtp}
                                            className="text-xs font-semibold text-orange-600 hover:text-orange-800 disabled:opacity-50 transition-all cursor-pointer"
                                        >
                                            {otpTimer > 0 ? `Resend OTP in ${otpTimer}s` : 'Resend OTP'}
                                        </button>
                                    </div>
                                </div>
                            )}
                            <button type="submit" disabled={isLoading} className="w-full py-3.5 px-4 rounded-xl shadow-lg text-sm font-bold text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-600 transition-all duration-200">
                                {isLoading ? 'Processing...' : (otpSent ? 'Verify & Login' : 'Send OTP')}
                            </button>
                        </form>
                    )}

                    {/* Unified Footer Links */}
                    <div className="mt-8">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200 dark:border-gray-600" /></div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-3 bg-white dark:bg-gray-800 text-gray-500 font-medium">New to {branding.appName}?</span>
                            </div>
                        </div>

                        <div className="mt-6 text-center space-y-2">
                            {selectedRole === 'customer' && <Link to="/register" className="block font-bold text-blue-600 hover:text-blue-800">Create Customer Account</Link>}
                            {selectedRole === 'rider' && <Link to="/rider/register" className="block font-bold text-green-600 hover:text-green-800">Register as Rider</Link>}
                            {selectedRole === 'shop' && <Link to="/shop/register" className="block font-bold text-orange-600 hover:text-orange-800">Apply as Shop Partner</Link>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
