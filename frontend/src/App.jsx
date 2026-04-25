import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetails from './pages/ProductDetails';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Orders from './pages/Orders';

// New Features (Phase 1-5)
import Wallet from './pages/Wallet';
import Membership from './pages/Membership';
import Support from './pages/Support';

import AdminLayout from './components/admin/AdminLayout';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminProducts from './pages/admin/AdminProducts';
import AddProduct from './pages/admin/AddProduct';
import EditProduct from './pages/admin/EditProduct';
import AdminCategories from './pages/admin/AdminCategories';
import AdminOrders from './pages/admin/AdminOrders';
import AdminRiders from './pages/admin/AdminRiders';

// New Admin Pages
import AdminLiveMap from './pages/admin/AdminLiveMap';
import AdminKYCQueue from './pages/admin/AdminKYCQueue';
import AdminPayouts from './pages/admin/AdminPayouts';
import AdminDisputes from './pages/admin/AdminDisputes';
import AdminAuditLogs from './pages/admin/AdminAuditLogs';
import AdminAssignmentConfig from './pages/admin/AdminAssignmentConfig';
import AdminZones from './pages/admin/AdminZones';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminCoupons from './pages/admin/AdminCoupons';

import RiderLogin from './pages/RiderLogin';
import RiderRegister from './pages/RiderRegister';
import RiderDashboard from './pages/RiderDashboard';
import RiderKYC from './pages/RiderKYC';
import PublicTracking from './pages/PublicTracking';

// Local Shop Integration
import ShopRegister from './pages/shop/ShopRegister';
import ShopDashboard from './pages/shop/ShopDashboard';
import AdminShops from './pages/admin/AdminShops';

import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ThemeProvider } from './context/ThemeContext';
import ChatWidget from './components/ChatWidget';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <AuthProvider>
        <CartProvider>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans text-gray-900 dark:text-gray-100 flex flex-col relative transition-colors duration-300">
            <Routes>
              {/* Public & User Routes with Navbar */}
              <Route path="*" element={
                <>
                  <Navbar />
                  <main className="flex-1 w-full">
                    <Routes>
                      <Route path="/" element={<Home />} />
                      <Route path="/products" element={<Products />} />
                      <Route path="/product/:id" element={<ProductDetails />} />
                      <Route path="/cart" element={<Cart />} />
                      <Route path="/checkout" element={<Checkout />} />
                      <Route path="/login" element={<Login />} />
                      <Route path="/register" element={<Register />} />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="/orders" element={<Orders />} />
                      <Route path="/wallet" element={<Wallet />} />
                      <Route path="/membership" element={<Membership />} />
                      <Route path="/support" element={<Support />} />
                    </Routes>
                  </main>
                  <ChatWidget />
                </>
              } />

              {/* Admin Routes */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="analytics" element={<AdminAnalytics />} />
                <Route path="live-map" element={<AdminLiveMap />} />
                <Route path="products" element={<AdminProducts />} />
                <Route path="products/add" element={<AddProduct />} />
                <Route path="products/edit/:id" element={<EditProduct />} />
                <Route path="categories" element={<AdminCategories />} />
                <Route path="orders" element={<AdminOrders />} />
                <Route path="riders" element={<AdminRiders />} />
                {/* New Admin Sections */}
                <Route path="kyc" element={<AdminKYCQueue />} />
                <Route path="payouts" element={<AdminPayouts />} />
                <Route path="disputes" element={<AdminDisputes />} />
                <Route path="audit" element={<AdminAuditLogs />} />
                <Route path="assignment-config" element={<AdminAssignmentConfig />} />
                <Route path="zones" element={<AdminZones />} />
                <Route path="coupons" element={<AdminCoupons />} />
                <Route path="shops" element={<AdminShops />} />
              </Route>

              {/* Rider Routes */}
              <Route path="/rider/login" element={<RiderLogin />} />
              <Route path="/rider/register" element={<RiderRegister />} />
              <Route path="/rider/dashboard" element={<RiderDashboard />} />
              <Route path="/rider/kyc" element={<RiderKYC />} />

              {/* Public Tracking — share link */}
              <Route path="/track/:orderId" element={<PublicTracking />} />

              {/* Shop Routes */}
              <Route path="/shop/register" element={
                <>
                  <Navbar />
                  <ShopRegister />
                </>
              } />
              <Route path="/shop/dashboard" element={
                <>
                  <Navbar />
                  <ShopDashboard />
                </>
              } />
            </Routes>
          </div>
        </CartProvider>
      </AuthProvider>
    </Router>
    </ThemeProvider>
  );
}

export default App;
