import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { FiUser, FiPackage, FiLogOut, FiSettings, FiHeart, FiMapPin, FiChevronRight } from 'react-icons/fi';

const Profile = () => {
    const { userInfo, logout } = useAuth();
    const navigate = useNavigate();

    if (!userInfo) {
        navigate('/login');
        return null;
    }

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 bg-gray-50 min-h-screen">
            <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 p-8 mb-8 flex items-center gap-6">
                <div className="w-24 h-24 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex justify-center items-center p-1 shadow-inner border-2 border-white">
                    <div className="w-full h-full bg-secondary rounded-full flex justify-center items-center text-white text-4xl font-black shadow-lg">
                        {userInfo?.data?.name?.charAt(0).toUpperCase()}
                    </div>
                </div>
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">{userInfo?.data?.name}</h1>
                    <p className="text-gray-500 mt-1 font-medium bg-gray-100 py-1 px-3 rounded-full inline-block text-sm">{userInfo?.data?.email}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden text-gray-800">
                        <Link to="/orders" className="flex items-center justify-between p-6 hover:bg-green-50 transition-colors border-b border-gray-50">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-secondary bg-opacity-10 text-secondary rounded-xl"><FiPackage className="w-6 h-6" /></div>
                                <div>
                                    <h3 className="font-bold text-gray-900">My Orders</h3>
                                    <p className="text-sm text-gray-500">Track, return, or buy things again</p>
                                </div>
                            </div>
                            <FiChevronRight className="w-5 h-5 text-gray-400" />
                        </Link>

                        <Link to="#" className="flex items-center justify-between p-6 hover:bg-green-50 transition-colors border-b border-gray-50">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><FiHeart className="w-6 h-6" /></div>
                                <div>
                                    <h3 className="font-bold text-gray-900">Your Wishlist</h3>
                                    <p className="text-sm text-gray-500">View your saved items</p>
                                </div>
                            </div>
                            <FiChevronRight className="w-5 h-5 text-gray-400" />
                        </Link>

                        <Link to="#" className="flex items-center justify-between p-6 hover:bg-green-50 transition-colors border-b border-gray-50">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><FiMapPin className="w-6 h-6" /></div>
                                <div>
                                    <h3 className="font-bold text-gray-900">Addresses</h3>
                                    <p className="text-sm text-gray-500">Manage delivery addresses</p>
                                </div>
                            </div>
                            <FiChevronRight className="w-5 h-5 text-gray-400" />
                        </Link>

                        <Link to="#" className="flex items-center justify-between p-6 hover:bg-green-50 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-orange-50 text-orange-600 rounded-xl"><FiSettings className="w-6 h-6" /></div>
                                <div>
                                    <h3 className="font-bold text-gray-900">Account Settings</h3>
                                    <p className="text-sm text-gray-500">Manage password, privacy</p>
                                </div>
                            </div>
                            <FiChevronRight className="w-5 h-5 text-gray-400" />
                        </Link>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center justify-center py-4 bg-red-50 text-red-600 font-bold rounded-2xl hover:bg-red-600 hover:text-white transition-all shadow-sm hover:shadow-xl transform hover:-translate-y-1 active:scale-95 duration-300 gap-2 border border-red-100 hover:border-red-600"
                        >
                            <FiLogOut className="w-5 h-5" /> Logout
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
