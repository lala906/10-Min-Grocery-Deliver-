import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { FiTruck } from 'react-icons/fi';

const RiderLogin = () => {
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const { loginAsRider, userInfo, error } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (userInfo && userInfo.data?.role === 'rider') {
            navigate('/rider/dashboard');
        }
    }, [userInfo, navigate]);

    const submitHandler = async (e) => {
        e.preventDefault();
        const success = await loginAsRider(phone, password);
        if (success) {
            navigate('/rider/dashboard');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8 w-full max-w-md">
                <div className="flex justify-center mb-6">
                    <div className="bg-orange-100 p-4 rounded-full">
                        <FiTruck className="w-10 h-10 text-orange-600" />
                    </div>
                </div>
                <h1 className="text-3xl font-black text-center text-gray-900 mb-2">Rider Login</h1>
                <p className="text-center text-gray-500 font-medium mb-8">Access your delivery dashboard</p>

                {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-bold border border-red-100 flex items-center justify-center">{error}</div>}

                <form onSubmit={submitHandler} className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Phone Number</label>
                        <input
                            type="text"
                            placeholder="Enter registered phone"
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Password</label>
                        <input
                            type="password"
                            placeholder="Enter password"
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full h-14 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95 transform cursor-pointer text-lg"
                    >
                        Login as Rider
                    </button>
                </form>

                <p className="text-center text-sm text-gray-500 mt-6">
                    New rider?{' '}
                    <Link to="/rider/register" className="text-orange-600 font-bold hover:underline">Register here</Link>
                </p>

                <p className="text-center text-xs text-gray-400 mt-3">
                    <Link to="/" className="hover:underline">← Back to store</Link>
                </p>
            </div>
        </div>
    );
};

export default RiderLogin;
