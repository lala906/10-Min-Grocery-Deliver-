import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiShoppingCart, FiUser, FiSearch, FiLogOut, FiGlobe, FiMessageCircle, FiCreditCard, FiStar, FiSun, FiMoon, FiMonitor } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { branding } from '../config/branding';
import AppLogo from './AppLogo';

const Navbar = () => {
    const { t, i18n } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const { userInfo, logout } = useAuth();
    const { cart, clearCartState } = useCart();
    const { theme, setTheme } = useTheme();
    const navigate = useNavigate();
    const dropdownRef = useRef(null);
    const themeDropdownRef = useRef(null);
    const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);

    const toggleLanguage = () => {
        const newLang = i18n.language === 'en' ? 'hi' : 'en';
        i18n.changeLanguage(newLang);
        localStorage.setItem('appLang', newLang);
    };

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchTerm.trim()) {
            navigate(`/products?search=${searchTerm}`);
        }
    };

    const handleLogout = () => {
        logout();
        clearCartState();
        setDropdownOpen(false);
        navigate('/');
    };

    // Close dropdowns on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
            if (themeDropdownRef.current && !themeDropdownRef.current.contains(event.target)) {
                setThemeDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const cartItemsCount = cart?.items?.reduce((acc, item) => acc + item.quantity, 0) || 0;

    return (
        <nav className="bg-white dark:bg-gray-900 shadow-sm sticky top-0 z-50 transition-colors duration-300 border-b dark:border-gray-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">

                    <div className="flex-shrink-0 flex items-center">
                        <Link to="/" className="hover:opacity-80 transition-opacity">
                            <AppLogo />
                        </Link>
                    </div>

                    <div className="flex-1 max-w-2xl px-8 hidden md:block">
                        <form onSubmit={handleSearch} className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <FiSearch className="text-gray-400" />
                            </div>
                            <input
                                type="text"
                                className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-secondary focus:border-secondary sm:text-sm transition-shadow"
                                placeholder={t('search_placeholder')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </form>
                    </div>

                    <div className="flex items-center space-x-4 md:space-x-6">
                        
                        {/* Theme Toggle */}
                        <div className="relative" ref={themeDropdownRef}>
                            <button
                                onClick={() => setThemeDropdownOpen(!themeDropdownOpen)}
                                className="flex items-center text-gray-500 hover:text-secondary font-medium text-sm transition-colors dark:text-gray-300 dark:hover:text-primary z-50 transform hover:scale-110 active:scale-95 duration-200"
                                title="Toggle Theme"
                            >
                                {theme === 'dark' ? <FiMoon className="h-5 w-5 transition-transform animate-pulse" /> : theme === 'light' ? <FiSun className="h-5 w-5 transition-transform animate-[spin_3s_linear_infinite]" /> : <FiMonitor className="h-5 w-5 transition-transform" />}
                            </button>
                            {themeDropdownOpen && (
                                <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50 ring-1 ring-black ring-opacity-5">
                                    <button onClick={() => { setTheme('light'); setThemeDropdownOpen(false); }} className={`flex items-center w-full px-4 py-2 text-sm ${theme === 'light' ? 'text-secondary font-bold bg-green-50 dark:bg-gray-700' : 'text-gray-700 dark:text-gray-200'} hover:bg-gray-100 dark:hover:bg-gray-700`}>
                                        <FiSun className="mr-2" /> Light ☀️
                                    </button>
                                    <button onClick={() => { setTheme('dark'); setThemeDropdownOpen(false); }} className={`flex items-center w-full px-4 py-2 text-sm ${theme === 'dark' ? 'text-secondary font-bold bg-green-50 dark:bg-gray-700' : 'text-gray-700 dark:text-gray-200'} hover:bg-gray-100 dark:hover:bg-gray-700`}>
                                        <FiMoon className="mr-2" /> Dark 🌙
                                    </button>
                                    <button onClick={() => { setTheme('system'); setThemeDropdownOpen(false); }} className={`flex items-center w-full px-4 py-2 text-sm ${theme === 'system' ? 'text-secondary font-bold bg-green-50 dark:bg-gray-700' : 'text-gray-700 dark:text-gray-200'} hover:bg-gray-100 dark:hover:bg-gray-700 border-t dark:border-gray-700`}>
                                        <FiMonitor className="mr-2" /> System 💻
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Language Toggle */}
                        <button 
                            onClick={toggleLanguage}
                            className="flex items-center text-gray-500 hover:text-secondary font-medium text-sm transition-colors dark:text-gray-300 dark:hover:text-primary"
                            title="Toggle Language"
                        >
                            <FiGlobe className="h-5 w-5 mr-1" />
                            {i18n.language === 'en' ? 'EN' : 'HI'}
                        </button>

                        {userInfo ? (
                            <div className="relative" ref={dropdownRef}>
                                <button 
                                    onClick={() => setDropdownOpen(!dropdownOpen)}
                                    className="flex items-center text-gray-700 hover:text-secondary group focus:outline-none"
                                >
                                    <div className="p-2 rounded-full group-hover:bg-green-50 transition-colors">
                                        <FiUser className="h-5 w-5 dark:text-gray-200" />
                                    </div>
                                    <div className="ml-1 text-left hidden sm:block">
                                        <div className="text-sm font-medium dark:text-gray-200">{t('account')}</div>
                                        {userInfo?.data?.role && userInfo.data.role !== 'user' && (
                                            <div className="text-[10px] font-bold uppercase text-secondary tracking-wider">
                                                {userInfo.data.role.replace('_', ' ')}
                                            </div>
                                        )}
                                    </div>
                                </button>

                                {/* Dropdown Menu */}
                                {dropdownOpen && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 ring-1 ring-black ring-opacity-5">
                                        {userInfo?.data?.role === 'admin' && (
                                            <Link to="/admin/dashboard" onClick={() => setDropdownOpen(false)} className="block px-4 py-2 text-sm text-blue-600 hover:bg-gray-100 font-bold border-b">
                                                {t('admin_portal')}
                                            </Link>
                                        )}
                                        {userInfo?.data?.role === 'shop_owner' ? (
                                            <Link to="/shop/dashboard" onClick={() => setDropdownOpen(false)} className="block px-4 py-2 text-sm text-green-600 hover:bg-gray-100 font-bold border-b">
                                                Shop Dashboard
                                            </Link>
                                        ) : userInfo?.data?.role === 'user' ? (
                                            <Link to="/shop/register" onClick={() => setDropdownOpen(false)} className="block px-4 py-2 text-sm text-orange-600 hover:bg-gray-100 font-semibold border-b">
                                                Become a Shop Partner
                                            </Link>
                                        ) : null}
                                        <Link to="/profile" onClick={() => setDropdownOpen(false)} className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                            <FiUser className="mr-2 text-gray-400" /> My Profile
                                        </Link>
                                        <Link to="/wallet" onClick={() => setDropdownOpen(false)} className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                            <FiCreditCard className="mr-2 text-gray-400" /> {t('wallet')}
                                        </Link>
                                        <Link to="/membership" onClick={() => setDropdownOpen(false)} className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                            <FiStar className="mr-2 text-yellow-400" /> {t('membership')}
                                        </Link>
                                        <Link to="/support" onClick={() => setDropdownOpen(false)} className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 border-b">
                                            <FiMessageCircle className="mr-2 text-gray-400" /> {t('support')}
                                        </Link>
                                        <button onClick={handleLogout} className="flex items-center w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100">
                                            <FiLogOut className="mr-2" /> Logout
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <Link to="/login" className="text-sm font-medium text-gray-700 hover:text-secondary px-3 py-2 rounded-md transition-colors hover:bg-green-50">
                                {t('login')}
                            </Link>
                        )}

                        <Link to="/cart" className="flex items-center bg-secondary hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm hover:shadow">
                            <FiShoppingCart className="h-5 w-5 mr-1 md:mr-2" />
                            <span className="hidden md:inline">{t('my_cart')}</span>
                            {cartItemsCount > 0 && (
                                <span className="ml-1 md:ml-2 bg-white text-secondary text-xs font-bold px-2 py-0.5 rounded-full">
                                    {cartItemsCount}
                                </span>
                            )}
                        </Link>
                    </div>
                </div>
            </div>

            <div className="md:hidden px-4 pb-3">
                <form onSubmit={handleSearch} className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiSearch className="text-gray-400" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-secondary focus:border-secondary sm:text-sm"
                        placeholder={t('search_placeholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </form>
            </div>
        </nav>
    );
};

export default Navbar;
