import React, { useState, useEffect, useRef } from 'react';
import { FiMessageSquare, FiX, FiSend, FiMinus } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { getUnreadChatCount, getChatHistory, sendChatMessage } from '../services/api';

// For simplicity, we are defaulting to a single "general" support room for the user right now
// A more advanced version would listen to active order ids
const ChatWidget = () => {
    const { userInfo } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [messages, setMessages] = useState([]);
    const [inputMsg, setInputMsg] = useState('');
    const [activeRoom, setActiveRoom] = useState(null);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        // Mock active room as user's primary support channel
        const room = `support_${userInfo?.data?._id}`;
        setActiveRoom(room);

        const fetchUnread = async () => {
            try {
                // Mock endpoint or use actual
                // const res = await getUnreadChatCount();
                // setUnreadCount(res.data.unread);
                setUnreadCount(1); // Demo unread count
            } catch (err) {
                console.error(err);
            }
        };
        fetchUnread();
    }, [userInfo]);

    useEffect(() => {
        if (isOpen && !isMinimized && activeRoom) {
            setUnreadCount(0); // mark read locally
            // Fetch history
            getChatHistory(activeRoom).then(res => {
                setMessages(res.data || []);
                scrollToBottom();
            }).catch(console.error);
        }
    }, [isOpen, isMinimized, activeRoom]);

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!inputMsg.trim() || !activeRoom) return;
        
        const newMsg = {
            room: activeRoom,
            roomType: 'support',
            message: inputMsg
        };

        // Optimistic UI update
        const tempMsg = {
            _id: Date.now().toString(),
            sender: userInfo.data._id,
            message: inputMsg,
            createdAt: new Date()
        };
        setMessages(prev => [...prev, tempMsg]);
        setInputMsg('');
        scrollToBottom();

        try {
            await sendChatMessage(newMsg);
        } catch (err) {
            console.error('Failed to send:', err);
            // Revert or show error
        }
    };

    if (!userInfo) return null;

    if (!isOpen) {
        return (
            <button
                onClick={() => { setIsOpen(true); setIsMinimized(false); }}
                className="fixed bottom-6 right-6 p-4 bg-primary text-gray-900 rounded-full shadow-2xl hover:bg-yellow-500 transition-transform transform hover:scale-110 z-50 flex items-center justify-center"
            >
                <FiMessageSquare className="w-8 h-8" />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-white">
                        {unreadCount}
                    </span>
                )}
            </button>
        );
    }

    return (
        <div className={`fixed right-6 bottom-6 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col z-50 transition-all duration-300 ${isMinimized ? 'h-16' : 'h-[500px]'}`}>
            {/* Header */}
            <div className="bg-gray-900 text-white p-4 rounded-t-2xl flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="font-bold">Live Support</span>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => setIsMinimized(!isMinimized)} className="text-gray-400 hover:text-white transition-colors">
                        <FiMinus size={18} />
                    </button>
                    <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-red-400 transition-colors">
                        <FiX size={20} />
                    </button>
                </div>
            </div>

            {/* Chat Body (hidden if minimized) */}
            {!isMinimized && (
                <>
                    <div className="flex-1 p-4 overflow-y-auto bg-gray-50 flex flex-col gap-3">
                        <div className="text-center text-xs text-gray-400 mb-2">
                            A support agent will join shortly.
                        </div>
                        {messages.length === 0 ? (
                            <div className="flex-1 flex items-center justify-center text-gray-500 text-sm italic h-full">
                                No messages yet. Say hi!
                            </div>
                        ) : (
                            messages.map((m, i) => {
                                const isMe = m.sender === userInfo.data._id;
                                return (
                                    <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${isMe ? 'bg-primary text-gray-900 rounded-tr-none' : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none shadow-sm'}`}>
                                            {m.message}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="p-3 bg-white border-t border-gray-100 rounded-b-2xl">
                        <form onSubmit={handleSend} className="flex gap-2">
                            <input
                                type="text"
                                value={inputMsg}
                                onChange={e => setInputMsg(e.target.value)}
                                placeholder="Type a message..."
                                className="flex-1 px-4 py-2 bg-gray-100 border-none rounded-full focus:ring-2 focus:ring-secondary text-sm outline-none"
                            />
                            <button
                                type="submit"
                                disabled={!inputMsg.trim()}
                                className="bg-secondary text-white p-2 rounded-full hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0 w-10 h-10 flex items-center justify-center"
                            >
                                <FiSend size={16} />
                            </button>
                        </form>
                    </div>
                </>
            )}
        </div>
    );
};

export default ChatWidget;
