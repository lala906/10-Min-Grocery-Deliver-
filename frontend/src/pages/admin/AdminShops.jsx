import React, { useEffect, useState } from 'react';
import api from '../../services/api';

const AdminShops = () => {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchShops = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/admin/shops${statusFilter ? `?status=${statusFilter}` : ''}`);
      setShops(data);
    } catch (err) {
      alert('Failed to fetch shops');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShops();
  }, [statusFilter]);

  const approveKyc = async (id) => {
    try {
      await api.put(`/admin/kyc-approve/${id}`);
      fetchShops();
      alert('Shop KYC Approved');
    } catch (err) {
      alert('Failed to approve');
    }
  };

  const rejectKyc = async (id) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    try {
      await api.put(`/admin/kyc-reject/${id}`, { reason });
      fetchShops();
      alert('Shop KYC Rejected');
    } catch (err) {
      alert('Failed to reject');
    }
  };

  const toggleBlock = async (id) => {
    try {
      await api.put(`/admin/shops/${id}/block`);
      fetchShops();
      alert('Shop block status toggled');
    } catch (err) {
      alert('Failed to toggle block status');
    }
  };

  if (loading && shops.length === 0) return <div className="p-8 text-center text-gray-500">Loading shops...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Shop & KYC Verification</h1>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border p-2 rounded dark:bg-gray-800 dark:text-gray-200">
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="overflow-x-auto bg-white dark:bg-gray-800 shadow rounded-lg">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shop Info</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner & Bank</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">KYC Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {shops.map(shop => (
              <tr key={shop._id} className={shop.isBlocked ? 'opacity-50' : ''}>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{shop.shopName}</div>
                  <div className="text-sm text-gray-500">{shop.category} - {shop.address?.city}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900 dark:text-white">{shop.owner?.name} ({shop.owner?.phone})</div>
                  <div className="text-xs text-gray-500">A/C: {shop.bankDetails?.accountNumber} ({shop.bankDetails?.ifscCode})</div>
                  <div className="text-xs text-gray-500">Aadhaar: {shop.kycDetails?.aadhaarNumber} | PAN: {shop.kycDetails?.panNumber}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    shop.kycStatus === 'approved' ? 'bg-green-100 text-green-800' :
                    shop.kycStatus === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {shop.kycStatus.toUpperCase()}
                  </span>
                  {shop.rejectionReason && <p className="text-xs text-red-500 mt-1">{shop.rejectionReason}</p>}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2 flex">
                  {shop.kycStatus !== 'approved' && (
                    <button onClick={() => approveKyc(shop._id)} className="bg-blue-600 p-2 text-white rounded shadow-sm hover:bg-blue-700 text-xs">Approve</button>
                  )}
                  {shop.kycStatus !== 'rejected' && (
                    <button onClick={() => rejectKyc(shop._id)} className="bg-red-500 p-2 text-white rounded shadow-sm hover:bg-red-600 text-xs">Reject</button>
                  )}
                  <button onClick={() => toggleBlock(shop._id)} className="bg-gray-600 p-2 text-white rounded shadow-sm hover:bg-gray-700 text-xs ml-2">
                    {shop.isBlocked ? 'Unblock' : 'Block'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminShops;
