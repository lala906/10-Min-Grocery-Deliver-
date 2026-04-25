import React, { useState, useEffect } from 'react';
import { getSupportTickets, createSupportTicket, getFAQs } from '../services/api';
import { FiMessageCircle, FiChevronDown, FiPlus } from 'react-icons/fi';

const Support = () => {
    const [tickets, setTickets] = useState([]);
    const [faqs, setFaqs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeFaq, setActiveFaq] = useState(null);

    // New Ticket Form
    const [showForm, setShowForm] = useState(false);
    const [subject, setSubject] = useState('');
    const [category, setCategory] = useState('general');
    const [message, setMessage] = useState('');

    const fetchData = async () => {
        try {
            const [ticketRes, faqRes] = await Promise.all([
                getSupportTickets(),
                getFAQs()
            ]);
            setTickets(ticketRes.data);
            setFaqs(faqRes.data);
            setLoading(false);
        } catch (err) {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await createSupportTicket({ subject, category, message });
            alert('Ticket submitted successfully');
            setSubject(''); setMessage(''); setShowForm(false);
            fetchData();
        } catch (err) {
            alert('Error submitting ticket');
        }
    };

    if (loading) return <div className="p-8 text-center">Loading Support Hub...</div>;

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-black text-gray-900 mb-8 flex items-center">
                <FiMessageCircle className="mr-3 text-secondary" /> Support Center
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* FAQ Section */}
                <div className="lg:col-span-2 space-y-4">
                    <h2 className="text-xl font-bold mb-4">Frequently Asked Questions</h2>
                    {faqs.map((faq, idx) => (
                        <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <button
                                onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                                className="w-full text-left p-5 font-bold text-gray-800 hover:bg-gray-50 flex justify-between items-center transition-colors"
                            >
                                {faq.q}
                                <FiChevronDown className={`transition-transform ${activeFaq === idx ? 'rotate-180' : ''}`} />
                            </button>
                            {activeFaq === idx && (
                                <div className="p-5 pt-0 text-gray-600 bg-gray-50 border-t border-gray-100">
                                    {faq.a}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Tickets Section */}
                <div>
                    <h2 className="text-xl font-bold mb-4">My Tickets</h2>
                    {!showForm ? (
                        <>
                            <button 
                                onClick={() => setShowForm(true)}
                                className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold py-3 rounded-xl mb-6 flex items-center justify-center transition-colors"
                            >
                                <FiPlus className="mr-2" /> Create New Ticket
                            </button>
                            
                            <div className="space-y-4">
                                {tickets.length === 0 ? (
                                    <p className="text-gray-500 text-sm">No support tickets found.</p>
                                ) : (
                                    tickets.map(ticket => (
                                        <div key={ticket._id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow transition-shadow">
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="font-bold text-gray-900 line-clamp-1">{ticket.subject}</h3>
                                                <span className={`text-xs px-2 py-1 rounded-full font-bold uppercase ${
                                                    ticket.status === 'open' ? 'bg-blue-100 text-blue-700' :
                                                    ticket.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'
                                                }`}>
                                                    {ticket.status}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-500 mb-2">Updated: {new Date(ticket.updatedAt).toLocaleDateString()}</p>
                                            <p className="text-sm text-gray-700 line-clamp-2 bg-gray-50 p-2 rounded">{ticket.messages[ticket.messages.length - 1]?.message}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="font-bold mb-4">New Support Request</h3>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Category</label>
                                    <select value={category} onChange={e => setCategory(e.target.value)} className="w-full border border-gray-200 rounded-lg p-2 focus:ring-2 focus:ring-secondary">
                                        <option value="general">General Inquiry</option>
                                        <option value="orders">Orders & Delivery</option>
                                        <option value="payment">Payment & Refunds</option>
                                        <option value="technical">Technical Issue</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Subject</label>
                                    <input required type="text" value={subject} onChange={e => setSubject(e.target.value)} className="w-full border border-gray-200 rounded-lg p-2 focus:ring-2 focus:ring-secondary" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Message</label>
                                    <textarea required rows="4" value={message} onChange={e => setMessage(e.target.value)} className="w-full border border-gray-200 rounded-lg p-2 focus:ring-2 focus:ring-secondary"></textarea>
                                </div>
                                <div className="flex gap-2">
                                    <button type="submit" className="flex-1 bg-secondary text-white font-bold py-2 rounded-lg hover:bg-green-700">Submit</button>
                                    <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-gray-100 text-gray-700 font-bold py-2 rounded-lg hover:bg-gray-200">Cancel</button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Support;
