import React, { useEffect, useState } from 'react';
import api from '../../services/api';

const ShopDashboard = () => {
  const [shop, setShop] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchShopData();
  }, []);

  const fetchShopData = async () => {
    try {
      const [shopRes, ordersRes] = await Promise.all([
        api.get('/shops/profile'),
        api.get('/shops/orders')
      ]);
      setShop(shopRes.data);
      setOrders(ordersRes.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch shop details');
    } finally {
      setLoading(false);
    }
  };

  const toggleShopStatus = async () => {
    if (shop?.kycStatus !== 'approved') {
      alert('Your KYC is not approved yet.');
      return;
    }
    try {
      const { data } = await api.put('/shops/status', { isOpen: !shop.isOpen });
      setShop(data);
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      await api.put(`/shops/orders/${orderId}/status`, { status });
      fetchShopData();
      alert(`Order marked as ${status}`);
    } catch (err) {
      alert('Failed to update order');
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading Dashboard...</div>;
  if (!shop) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header Profile Card */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{shop.shopName}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{shop.category} Store</p>
          <div className="mt-4 flex items-center space-x-4 text-sm font-semibold">
            <span className={`px-2 py-1 rounded-full ${shop.kycStatus === 'approved' ? 'bg-green-100 text-green-700' : shop.kycStatus === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
              KYC: {shop.kycStatus}
            </span>
            {shop.kycStatus === 'rejected' && (
              <span className="text-red-500 text-xs">Reason: {shop.rejectionReason}</span>
            )}
            <span className={`px-2 py-1 rounded-full ${shop.isOpen ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
               Store: {shop.isOpen ? 'Open' : 'Closed'}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <label className="flex items-center cursor-pointer">
            <div className="relative">
              <input type="checkbox" className="sr-only" checked={shop.isOpen} onChange={toggleShopStatus} disabled={shop.kycStatus !== 'approved'} />
              <div className={`block w-14 h-8 rounded-full ${shop.isOpen ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition transform ${shop.isOpen ? 'translate-x-6' : ''}`}></div>
            </div>
            <div className="ml-3 text-gray-700 font-medium">Toggle Status</div>
          </label>
        </div>
      </div>

      {/* Orders Grid */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Active Orders</h2>
        {orders.length === 0 ? (
          <p className="text-gray-500">No recent orders yet.</p>
        ) : (
          <div className="space-y-4">
            {orders.map(order => (
              <div key={order._id} className="border border-gray-200 dark:border-gray-700 p-4 rounded flex justify-between items-center">
                <div>
                  <p className="font-semibold">Order #{order._id.substring(18)}</p>
                  <p className="text-sm text-gray-500">{new Date(order.createdAt).toLocaleString()}</p>
                  <p className="mt-2 font-medium">₹{order.totalPrice}</p>
                  <p className="text-xs font-semibold text-blue-500 mt-1">{order.orderStatus}</p>
                </div>
                {order.orderStatus === 'Order Placed' && (
                  <div className="space-x-2">
                    <button onClick={() => updateOrderStatus(order._id, 'Merchant Accepted')} className="bg-green-500 text-white px-3 py-1 rounded">Accept</button>
                    <button onClick={() => updateOrderStatus(order._id, 'Rejected by Shop')} className="bg-red-500 text-white px-3 py-1 rounded">Reject</button>
                  </div>
                )}
                {order.orderStatus === 'Merchant Accepted' && (
                  <div>
                    <button onClick={() => updateOrderStatus(order._id, 'Ready for Pickup')} className="bg-blue-500 text-white px-3 py-1 rounded">Mark Ready</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ShopDashboard;
