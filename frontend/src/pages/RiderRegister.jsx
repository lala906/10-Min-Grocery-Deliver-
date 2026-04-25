import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerRider } from '../services/api';
import { FiTruck, FiUser, FiPhone, FiLock, FiCheckCircle, FiArrowLeft } from 'react-icons/fi';

const VEHICLE_TYPES = [
    { value: 'bicycle',     label: '🚲 Bicycle' },
    { value: 'motorcycle',  label: '🏍️ Motorcycle' },
    { value: 'scooter',     label: '🛵 Scooter' },
    { value: 'electric_bike', label: '⚡ E-Bike' },
    { value: 'car',         label: '🚗 Car' },
];

const RiderRegister = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);
    const [form, setForm] = useState({
        name: '',
        phone: '',
        email: '',
        password: '',
        confirmPassword: '',
        vehicleType: 'motorcycle',
        numberPlate: '',
        model: '',
    });

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 4000);
    };

    const set = (key, value) => setForm(f => ({ ...f, [key]: value }));

    const validateStep1 = () => {
        if (!form.name.trim()) return 'Full name is required';
        if (!/^[6-9]\d{9}$/.test(form.phone)) return 'Enter a valid 10-digit Indian mobile number';
        if (form.password.length < 6) return 'Password must be at least 6 characters';
        if (form.password !== form.confirmPassword) return 'Passwords do not match';
        return null;
    };

    const handleStep1 = () => {
        const err = validateStep1();
        if (err) return showToast(err, 'error');
        setStep(2);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.vehicleType) return showToast('Please select vehicle type', 'error');
        setLoading(true);
        try {
            const res = await registerRider({
                name: form.name,
                phone: form.phone,
                email: form.email,
                password: form.password,
                vehicleDetails: {
                    vehicleType: form.vehicleType,
                    numberPlate: form.numberPlate,
                    model: form.model,
                }
            });
            // Store rider token
            localStorage.setItem('riderInfo', JSON.stringify(res));
            setStep(3);
        } catch (err) {
            showToast(err.response?.data?.message || 'Registration failed. Try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-green-50 flex flex-col">
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-2xl shadow-xl font-semibold text-sm ${toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
                    {toast.msg}
                </div>
            )}

            {/* Header */}
            <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3 shadow-sm">
                {step < 3 && (
                    <button onClick={() => step === 1 ? navigate('/rider/login') : setStep(1)} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
                        <FiArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                )}
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <FiTruck className="text-orange-600 w-4 h-4" />
                </div>
                <div>
                    <h1 className="font-black text-gray-900 text-sm">10Min Delivery</h1>
                    <p className="text-xs text-gray-400">Rider Onboarding</p>
                </div>
            </div>

            {/* Progress Bar */}
            {step < 3 && (
                <div className="px-6 pt-6">
                    <div className="flex items-center gap-2 mb-4">
                        {[1, 2].map(s => (
                            <React.Fragment key={s}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black transition-all ${step >= s ? 'bg-orange-500 text-white shadow' : 'bg-gray-200 text-gray-500'}`}>
                                    {step > s ? <FiCheckCircle /> : s}
                                </div>
                                {s < 2 && <div className={`flex-1 h-1 rounded-full transition-all ${step > s ? 'bg-orange-500' : 'bg-gray-200'}`} />}
                            </React.Fragment>
                        ))}
                    </div>
                    <div className="flex justify-between">
                        <p className="text-xs text-gray-500 font-medium">Account Details</p>
                        <p className="text-xs text-gray-500 font-medium">Vehicle Info</p>
                    </div>
                </div>
            )}

            <main className="flex-1 px-4 py-6 max-w-md mx-auto w-full">

                {/* ── Step 1: Account Details ── */}
                {step === 1 && (
                    <div className="space-y-5">
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                            <h2 className="font-black text-gray-900 mb-1">Create Your Account</h2>
                            <p className="text-sm text-gray-400 mb-5">Join thousands of riders earning with 10Min</p>

                            <div className="space-y-4">
                                {/* Name */}
                                <div>
                                    <label className="text-sm font-bold text-gray-700 mb-1.5 block">Full Name *</label>
                                    <div className="relative">
                                        <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <input value={form.name} onChange={e => set('name', e.target.value)}
                                            placeholder="e.g. Rahul Kumar"
                                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                                    </div>
                                </div>

                                {/* Phone */}
                                <div>
                                    <label className="text-sm font-bold text-gray-700 mb-1.5 block">Mobile Number *</label>
                                    <div className="relative">
                                        <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <div className="absolute left-10 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-bold border-r border-gray-200 pr-2">+91</div>
                                        <input value={form.phone} onChange={e => set('phone', e.target.value.replace(/\D/g,'').slice(0, 10))}
                                            placeholder="10-digit mobile"
                                            className="w-full pl-20 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 font-mono" />
                                    </div>
                                </div>

                                {/* Email */}
                                <div>
                                    <label className="text-sm font-bold text-gray-700 mb-1.5 block">Email <span className="text-gray-400 font-normal">(optional)</span></label>
                                    <input value={form.email} onChange={e => set('email', e.target.value)}
                                        type="email" placeholder="rider@email.com"
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                                </div>

                                {/* Password */}
                                <div>
                                    <label className="text-sm font-bold text-gray-700 mb-1.5 block">Password *</label>
                                    <div className="relative">
                                        <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <input value={form.password} onChange={e => set('password', e.target.value)}
                                            type="password" placeholder="Minimum 6 characters"
                                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                                    </div>
                                </div>

                                {/* Confirm Password */}
                                <div>
                                    <label className="text-sm font-bold text-gray-700 mb-1.5 block">Confirm Password *</label>
                                    <div className="relative">
                                        <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <input value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)}
                                            type="password" placeholder="Re-enter password"
                                            className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 ${form.confirmPassword && form.password !== form.confirmPassword ? 'border-red-300 bg-red-50' : 'border-gray-200'}`} />
                                    </div>
                                    {form.confirmPassword && form.password !== form.confirmPassword && (
                                        <p className="text-xs text-red-500 mt-1 font-medium">Passwords don't match</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <button onClick={handleStep1}
                            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-4 rounded-2xl text-base shadow-lg shadow-orange-200 transition-all active:scale-95">
                            Continue →
                        </button>

                        <p className="text-center text-sm text-gray-500">
                            Already a rider?{' '}
                            <Link to="/rider/login" className="text-orange-600 font-bold hover:underline">Sign In</Link>
                        </p>
                    </div>
                )}

                {/* ── Step 2: Vehicle Details ── */}
                {step === 2 && (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                            <h2 className="font-black text-gray-900 mb-1">Vehicle Information</h2>
                            <p className="text-sm text-gray-400 mb-5">Select your primary delivery vehicle</p>

                            {/* Vehicle Type Grid */}
                            <div className="grid grid-cols-2 gap-2 mb-5 sm:grid-cols-3">
                                {VEHICLE_TYPES.map(vt => (
                                    <button key={vt.value} type="button"
                                        onClick={() => set('vehicleType', vt.value)}
                                        className={`p-3 rounded-xl border-2 text-sm font-bold transition-all text-left ${form.vehicleType === vt.value ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                                        {vt.label}
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-4">
                                {/* Number Plate */}
                                <div>
                                    <label className="text-sm font-bold text-gray-700 mb-1.5 block">Vehicle Number Plate *</label>
                                    <input value={form.numberPlate} onChange={e => set('numberPlate', e.target.value.toUpperCase())}
                                        placeholder="e.g. DL 01 AB 1234"
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-orange-400"
                                        required />
                                </div>

                                {/* Model */}
                                <div>
                                    <label className="text-sm font-bold text-gray-700 mb-1.5 block">Vehicle Model <span className="text-gray-400 font-normal">(optional)</span></label>
                                    <input value={form.model} onChange={e => set('model', e.target.value)}
                                        placeholder="e.g. Honda Activa 6G"
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                                </div>
                            </div>
                        </div>

                        {/* Earnings Preview */}
                        <div className="bg-gradient-to-r from-orange-400 to-green-500 rounded-2xl p-5 text-white">
                            <p className="font-bold text-sm text-white/80 mb-1">💰 Estimated Earnings</p>
                            <p className="font-black text-2xl">₹800 – ₹2,000+</p>
                            <p className="text-white/70 text-xs mt-1">per day based on deliveries · commission applies</p>
                        </div>

                        <div className="flex gap-3">
                            <button type="button" onClick={() => setStep(1)}
                                className="flex-1 py-4 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200 transition-all">
                                ← Back
                            </button>
                            <button type="submit" disabled={loading}
                                className="flex-2 flex-1 py-4 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-2xl shadow-lg shadow-orange-200 transition-all active:scale-95 disabled:opacity-60">
                                {loading ? 'Registering...' : 'Create Account 🎉'}
                            </button>
                        </div>

                        <p className="text-center text-xs text-gray-400">
                            By registering you agree to our Terms of Service & Privacy Policy
                        </p>
                    </form>
                )}

                {/* ── Step 3: Success ── */}
                {step === 3 && (
                    <div className="text-center py-8">
                        <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-200">
                            <FiCheckCircle className="w-12 h-12 text-white" />
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 mb-3">Welcome Aboard! 🎉</h2>
                        <p className="text-gray-500 mb-1">Your account has been created successfully.</p>
                        <p className="text-sm text-gray-400 mb-8">
                            Complete KYC verification to start accepting orders.
                        </p>

                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-left space-y-3 mb-8">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                    <FiCheckCircle className="text-green-500 w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-800">Account Created</p>
                                    <p className="text-xs text-gray-400">Your profile is ready</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                                    <span className="text-orange-500 text-sm">2</span>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-800">Complete KYC</p>
                                    <p className="text-xs text-gray-400">Upload license, ID proof & selfie</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 opacity-40">
                                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                    <FiTruck className="text-gray-400 w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-700">Start Earning</p>
                                    <p className="text-xs text-gray-400">After KYC approval by admin</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <Link to="/rider/kyc"
                                className="block bg-gradient-to-r from-orange-500 to-green-500 text-white font-black py-4 rounded-2xl text-base shadow-lg transition-all active:scale-95">
                                Submit KYC Documents →
                            </Link>
                            <Link to="/rider/dashboard"
                                className="block bg-white border border-gray-200 text-gray-700 font-bold py-3 rounded-2xl text-sm hover:bg-gray-50 transition-all">
                                Go to Dashboard
                            </Link>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default RiderRegister;
