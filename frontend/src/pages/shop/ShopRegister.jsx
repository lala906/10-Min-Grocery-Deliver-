import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const ShopRegister = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    otp: '',
    shopName: '',
    street: '',
    city: '',
    state: '',
    postalCode: '',
    category: 'kirana',
    aadhaarNumber: '',
    panNumber: '',
    accountHolderName: '',
    accountNumber: '',
    ifscCode: ''
  });
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);

  useEffect(() => {
    let timer;
    if (otpTimer > 0) {
        timer = setTimeout(() => setOtpTimer(otpTimer - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [otpTimer]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSendOtp = async () => {
    if (!formData.phone || formData.phone.length < 10) {
       alert('Enter valid phone number');
       return;
    }
    try {
      setLoading(true);
      await api.post('/auth/send-otp', { phone: formData.phone });
      setOtpSent(true);
      setOtpTimer(30);
      alert('OTP sent successfully');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!formData.otp || String(formData.otp).trim() === '') {
        alert('Please enter the OTP');
        return;
    }
    try {
      setLoading(true);
      const { data } = await api.post('/auth/verify-otp', { phone: formData.phone, otp: formData.otp });
      // If user exists and logs in directly, handle. Else proceed.
      setOtpVerified(true);
      alert('OTP verified successfully');
    } catch (err) {
      alert(err.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!otpVerified) {
      alert('Please verify OTP first');
      return;
    }
    try {
      setLoading(true);
      const payload = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        shopName: formData.shopName,
        address: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          postalCode: formData.postalCode
        },
        location: { lat: 0, lng: 0 }, // optional for now
        category: formData.category,
        shopFrontImage: 'https://via.placeholder.com/150', // placeholder for quick registration loop
        aadhaarNumber: formData.aadhaarNumber,
        aadhaarImage: 'https://via.placeholder.com/150',
        panNumber: formData.panNumber,
        panImage: 'https://via.placeholder.com/150',
        accountHolderName: formData.accountHolderName,
        accountNumber: formData.accountNumber,
        ifscCode: formData.ifscCode
      };
      
      await api.post('/shops/register-with-kyc', payload);
      alert('Registration successful! Please wait for admin approval.');
      navigate('/');
    } catch (err) {
      alert(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-vh-100 py-10">
      <div className="bg-white dark:bg-gray-800 p-8 rounded shadow-lg max-w-lg w-full">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800 dark:text-white">Become a Shop Partner</h2>
        
        {/* Progress Bar */}
        <div className="flex mb-6 text-sm text-gray-500 justify-between px-4">
            <span className={step === 1 ? "text-green-600 font-bold" : ""}>1. Profile</span>
            <span className={step === 2 ? "text-green-600 font-bold" : ""}>2. Shop Details</span>
            <span className={step === 3 ? "text-green-600 font-bold" : ""}>3. KYC & Bank</span>
        </div>

        <form onSubmit={step === 3 ? handleSubmit : (e) => { e.preventDefault(); setStep(step + 1); }}>
          
          {step === 1 && (
            <div className="space-y-4">
              <input type="text" name="name" placeholder="Owner Name" onChange={handleInputChange} className="w-full border p-2 rounded" required />
              <input type="email" name="email" placeholder="Email Address" onChange={handleInputChange} className="w-full border p-2 rounded" required />
              <div className="flex gap-2">
                <input type="text" name="phone" placeholder="Phone Number" onChange={handleInputChange} disabled={otpSent && !otpVerified} className="w-full border p-2 rounded" required />
                <button type="button" onClick={handleSendOtp} disabled={(otpSent && otpTimer > 0) || otpVerified || loading} className="bg-blue-600 text-white px-4 py-2 rounded whitespace-nowrap disabled:opacity-50 transition-all">
                  {otpVerified ? 'Verified' : (otpSent && otpTimer > 0 ? `Resend (${otpTimer}s)` : 'Send OTP')}
                </button>
              </div>
              {otpSent && !otpVerified && (
                <div className="flex gap-2">
                  <input type="text" name="otp" placeholder="Enter OTP" onChange={handleInputChange} className="w-full border p-2 rounded" required />
                  <button type="button" onClick={handleVerifyOtp} disabled={loading} className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50">Verify</button>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <input type="text" name="shopName" placeholder="Shop Name" onChange={handleInputChange} className="w-full border p-2 rounded" required />
              <select name="category" onChange={handleInputChange} className="w-full border p-2 rounded" required>
                <option value="kirana">Kirana / Grocery</option>
                <option value="dairy">Dairy Products</option>
                <option value="bakery">Bakery</option>
                <option value="pharmacy">Pharmacy</option>
              </select>
              <input type="text" name="street" placeholder="Street Address" onChange={handleInputChange} className="w-full border p-2 rounded" required />
              <input type="text" name="city" placeholder="City" onChange={handleInputChange} className="w-full border p-2 rounded" required />
              <input type="text" name="state" placeholder="State" onChange={handleInputChange} className="w-full border p-2 rounded" required />
              <input type="text" name="postalCode" placeholder="Postal Code" onChange={handleInputChange} className="w-full border p-2 rounded" required />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-700 dark:text-gray-300">KYC Documents</h3>
              <input type="text" name="aadhaarNumber" placeholder="Aadhaar Number" onChange={handleInputChange} className="w-full border p-2 rounded" required />
              <input type="text" name="panNumber" placeholder="PAN Number" onChange={handleInputChange} className="w-full border p-2 rounded" required />
              
              <h3 className="font-semibold text-gray-700 dark:text-gray-300 mt-4">Bank Details</h3>
              <input type="text" name="accountHolderName" placeholder="Account Holder Name" onChange={handleInputChange} className="w-full border p-2 rounded" required />
              <input type="text" name="accountNumber" placeholder="Account Number" onChange={handleInputChange} className="w-full border p-2 rounded" required />
              <input type="text" name="ifscCode" placeholder="IFSC Code" onChange={handleInputChange} className="w-full border p-2 rounded" required />
            </div>
          )}

          <div className="mt-8 flex justify-between">
            {step > 1 && (
              <button type="button" onClick={() => setStep(step - 1)} className="bg-gray-500 text-white px-6 py-2 rounded">Back</button>
            )}
            <button type="submit" disabled={loading} className="bg-blue-600 text-white px-6 py-2 rounded ml-auto">
              {step === 3 ? (loading ? 'Submitting...' : 'Submit Form') : 'Next'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ShopRegister;
