import React, { useEffect, useState } from 'react';
import { getCategories, getProducts, getRecommendations } from '../services/api';
import CategoryCard from '../components/CategoryCard';
import ProductCard from '../components/ProductCard';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { FiTrendingUp, FiClock, FiStar } from 'react-icons/fi';
import { branding } from '../config/branding';

const quickCategories = [
    { label: 'Fruits', emoji: '🍎' },
    { label: 'Vegetables', emoji: '🥦' },
    { label: 'Dairy', emoji: '🥛' },
    { label: 'Snacks', emoji: '🍪' },
    { label: 'Beverages', emoji: '🧃' },
    { label: 'Bakery', emoji: '🍞' },
];

const Home = () => {
    const { t } = useTranslation();
    const { userInfo } = useAuth();
    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [recs, setRecs] = useState({ personalized: [], popular: [], timeBased: [], timeLabel: null });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [catData, prodData] = await Promise.all([
                    getCategories(),
                    getProducts()
                ]);
                setCategories(catData.data || []);
                setProducts(prodData.data ? prodData.data.slice(0, 8) : []);

                if (userInfo) {
                    const recData = await getRecommendations().catch(() => ({
                        data: { personalized: [], popular: [], timeBased: [], timeLabel: null }
                    }));
                    setRecs(recData.data || { personalized: [], popular: [], timeBased: [], timeLabel: null });
                }
            } catch (error) {
                console.error('Failed to fetch home data', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [userInfo]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-secondary border-t-transparent"></div>
            </div>
        );
    }

    const { personalized, popular, timeBased, timeLabel } = recs;

    return (
        <div className="bg-gray-50 dark:bg-gray-900 min-h-screen pb-12 transition-colors duration-300">

            {/* ─── HERO SECTION ─────────────────────────────────────── */}
            <div className="relative overflow-hidden h-[420px] sm:h-[480px] flex items-center shadow-2xl">

                {/* Background image with slow parallax-zoom animation */}
                <div
                    className="absolute inset-0 bg-cover bg-center hero-zoom"
                    style={{
                        backgroundImage: `url('https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=90&w=1920')`,
                    }}
                />

                {/* Dark green → transparent gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-[rgba(0,60,20,0.90)] via-[rgba(0,40,10,0.65)] to-[rgba(0,0,0,0.10)]" />

                {/* Decorative blobs */}
                <div className="absolute right-10 top-10 w-48 h-48 bg-green-400/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute right-40 bottom-10 w-32 h-32 bg-yellow-400/10 rounded-full blur-2xl pointer-events-none" />

                {/* Animated text content */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
                    <div className="max-w-lg hero-fadein">

                        {/* Badges */}
                        <div className="flex flex-wrap gap-2 mb-5">
                            <span className="inline-flex items-center gap-1.5 bg-yellow-400 text-yellow-900 text-xs font-black px-3 py-1.5 rounded-full shadow-lg tracking-wide uppercase">
                                ⚡ Fast Delivery
                            </span>
                            <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur text-white text-xs font-semibold px-3 py-1.5 rounded-full border border-white/30">
                                📍 Delivering to Bhopal
                            </span>
                        </div>

                        {/* Main heading */}
                        <h1 className="text-5xl sm:text-6xl font-black mb-2 leading-tight text-white drop-shadow-lg">
                            {branding.appName}
                        </h1>
                        <p className="text-lg sm:text-xl text-green-200 mb-8 font-semibold drop-shadow">
                            Fresh groceries delivered in 10 minutes ⚡
                        </p>

                        {/* Search bar */}
                        <div className="relative w-full max-w-md">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg select-none">🔍</span>
                            <input
                                type="text"
                                placeholder="Search for fruits, milk, bread..."
                                className="w-full pl-12 pr-4 py-4 rounded-2xl text-gray-800 bg-white shadow-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-400 transition-all placeholder-gray-400 cursor-pointer"
                                onClick={() => { window.location.href = '/products'; }}
                                readOnly
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── QUICK CATEGORY CHIPS ─────────────────────────────── */}
            <div className="bg-white dark:bg-gray-800 shadow-md border-b border-gray-100 dark:border-gray-700 sticky top-0 z-20 transition-colors">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
                    <div className="flex gap-2 overflow-x-auto hide-scrollbar">
                        {quickCategories.map((qc) => (
                            <a
                                key={qc.label}
                                href="/products"
                                className="flex-shrink-0 flex items-center gap-1.5 bg-green-50 hover:bg-green-100 dark:bg-green-900/30 dark:hover:bg-green-800/50 text-green-800 dark:text-green-300 text-sm font-semibold px-4 py-2 rounded-full border border-green-200 dark:border-green-700 transition-all hover:scale-105 hover:shadow-sm"
                            >
                                <span>{qc.emoji}</span>
                                <span>{qc.label}</span>
                            </a>
                        ))}
                        <a
                            href="/products"
                            className="flex-shrink-0 flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-semibold px-4 py-2 rounded-full border border-gray-200 dark:border-gray-600 transition-all hover:scale-105"
                        >
                            <span>🛒</span>
                            <span>All Categories</span>
                        </a>
                    </div>
                </div>
            </div>

            {/* ─── TRUST BADGES STRIP ───────────────────────────────── */}
            <div className="bg-green-600 text-white py-3">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-wrap justify-center sm:justify-between gap-3 text-sm font-semibold">
                        <span>⚡ 10-minute delivery</span>
                        <span>🛡️ 100% Fresh &amp; Hygienic</span>
                        <span>🔄 Easy Returns</span>
                        <span>💳 Secure Payments</span>
                    </div>
                </div>
            </div>

            {/* ─── PAGE CONTENT ─────────────────────────────────────── */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 pt-10">

                {/* Categories Grid */}
                <section>
                    <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100 tracking-tight">
                        Shop by Category
                    </h2>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                        {categories.map((category) => (
                            <CategoryCard key={category._id} category={category} />
                        ))}
                    </div>
                </section>

                {/* AI Time-Based Recs */}
                {timeBased && timeBased.length > 0 && (
                    <section className="bg-orange-50 dark:bg-orange-900/30 p-6 rounded-3xl border border-orange-100 dark:border-orange-800">
                        <div className="flex items-center mb-6">
                            <FiClock className="text-orange-500 mr-2 w-6 h-6" />
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">{timeLabel}</h2>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                            {timeBased.map((product) => (
                                <ProductCard key={product._id} product={product} />
                            ))}
                        </div>
                    </section>
                )}

                {/* AI Personalized Recs */}
                {personalized && personalized.length > 0 && (
                    <section>
                        <div className="flex items-center mb-6">
                            <FiStar className="text-secondary mr-2 w-6 h-6" />
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">{t('recommended')}</h2>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                            {personalized.map((product) => (
                                <ProductCard key={product._id} product={product} />
                            ))}
                        </div>
                    </section>
                )}

                {/* Popular Products */}
                <section>
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center">
                            <FiTrendingUp className="text-blue-500 mr-2 w-6 h-6" />
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">{t('popular_products')}</h2>
                        </div>
                        <a href="/products" className="text-secondary font-medium hover:text-green-700 hover:underline">See all</a>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {(popular && popular.length > 0 ? popular : products).map((product) => (
                            <ProductCard key={product._id} product={product} />
                        ))}
                    </div>
                </section>

            </div>

            {/* ─── KEYFRAME ANIMATIONS ──────────────────────────────── */}
            <style>{`
                .hero-zoom {
                    animation: heroZoom 14s ease-in-out infinite alternate;
                }
                @keyframes heroZoom {
                    from { transform: scale(1); }
                    to   { transform: scale(1.09); }
                }
                .hero-fadein {
                    animation: heroFadeIn 0.9s ease-out both;
                }
                @keyframes heroFadeIn {
                    from { opacity: 0; transform: translateY(28px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
};

export default Home;
