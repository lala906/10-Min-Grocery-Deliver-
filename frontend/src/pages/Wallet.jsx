import React, { useState, useEffect } from 'react';
import { getWallet, addWalletMoney, getWalletTransactions } from '../services/api';
import { FiCreditCard, FiPlusCircle, FiArrowUpRight, FiArrowDownLeft, FiClock } from 'react-icons/fi';

const Wallet = () => {
    const [balance, setBalance] = useState(0);
    const [transactions, setTransactions] = useState([]);
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    const [error, setError] = useState(null);

    const fetchData = async () => {
        try {
            const data = await getWallet();
            setBalance(data.data.balance);
            setTransactions(data.data.transactions);
            setLoading(false);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch wallet');
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAddMoney = async (e) => {
        e.preventDefault();
        if (!amount || isNaN(amount) || amount <= 0) return alert('Enter valid amount');
        setAdding(true);
        try {
            await addWalletMoney(amount);
            setAmount('');
            fetchData();
            alert('Money added successfully (dummy simulation)');
        } catch (err) {
            alert(err.response?.data?.message || 'Error adding money');
        } finally {
            setAdding(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading wallet...</div>;

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-black text-gray-900 mb-8 flex items-center">
                <FiCreditCard className="mr-3 text-secondary" /> My Wallet
            </h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                {/* Balance Card */}
                <div className="bg-gradient-to-r from-secondary to-green-600 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-20">
                        <FiCreditCard className="w-32 h-32" />
                    </div>
                    <p className="text-green-100 font-medium mb-2">Available Balance</p>
                    <h2 className="text-5xl font-black flex items-baseline relative z-10">
                        <span className="text-3xl mr-1">₹</span>{balance.toFixed(2)}
                    </h2>
                </div>

                {/* Add Money Form */}
                <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                    <h3 className="text-xl font-bold mb-4 flex items-center">
                        <FiPlusCircle className="mr-2 text-primary" /> Top up Wallet
                    </h3>
                    <form onSubmit={handleAddMoney}>
                        <div className="flex gap-4">
                            <div className="relative flex-1">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₹</span>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    placeholder="Enter amount"
                                    className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-secondary focus:border-secondary transition-all"
                                    required
                                    min="1"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={adding}
                                className="bg-secondary hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl transition-colors disabled:opacity-50"
                            >
                                {adding ? 'Adding...' : 'Add'}
                            </button>
                        </div>
                        <div className="mt-4 flex gap-2">
                            {[500, 1000, 2000].map(val => (
                                <button
                                    key={val}
                                    type="button"
                                    onClick={() => setAmount(val.toString())}
                                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-1 px-4 rounded-full text-sm transition-colors"
                                >
                                    +₹{val}
                                </button>
                            ))}
                        </div>
                    </form>
                </div>
            </div>

            {/* Transactions List */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50">
                    <h3 className="text-xl font-bold flex items-center">
                        <FiClock className="mr-2 text-gray-500" /> Recent Transactions
                    </h3>
                </div>
                {transactions.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No transactions yet.</div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {transactions.map(txn => (
                            <div key={txn._id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                <div className="flex items-center">
                                    <div className={`p-3 rounded-full mr-4 ${txn.type === 'credit' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                        {txn.type === 'credit' ? <FiArrowDownLeft size={20} /> : <FiArrowUpRight size={20} />}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900">{txn.description}</p>
                                        <p className="text-sm text-gray-500">{new Date(txn.createdAt).toLocaleString('en-IN')}</p>
                                    </div>
                                </div>
                                <div className={`font-black text-lg ${txn.type === 'credit' ? 'text-green-600' : 'text-gray-900'}`}>
                                    {txn.type === 'credit' ? '+' : '-'}₹{txn.amount.toFixed(2)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Wallet;
