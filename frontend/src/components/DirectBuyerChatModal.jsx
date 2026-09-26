import React, { useState, useEffect, useRef } from 'react';
import { X, Send, CheckCheck, Loader2 } from 'lucide-react';
import api from '../api/axios';

export default function DirectBuyerChatModal({ buyerName, order, onClose }) {
  const orderId = order?._id || order?.id || 'default_order';
  const buyerId = order?.buyer?._id || order?.buyer || order?.buyerId;

  const storageKey = `kb_chat_${orderId}`;

  const [chatId, setChatId] = useState(null);
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch (_) { }
    return [];
  });
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Persist messages locally
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(messages));
      } catch (_) { }
    }
  }, [messages, storageKey]);

  // Initialize or fetch backend chat room if participantId exists
  useEffect(() => {
    let intervalId = null;

    const initBackendChat = async () => {
      if (!buyerId) return;
      setLoading(true);
      try {
        const res = await api.post('/chat', { participantId: buyerId }).catch(() => null);
        if (res?.data?._id) {
          const cId = res.data._id;
          setChatId(cId);

          if (res.data.messages && Array.isArray(res.data.messages)) {
            const formatted = res.data.messages.map(m => ({
              id: m._id || Date.now() + Math.random(),
              sender: m.sender?._id === buyerId ? 'buyer' : 'farmer',
              text: m.content || m.text || '',
              time: new Date(m.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            }));
            if (formatted.length > 0) {
              setMessages(formatted);
            }
          }

          // Polling every 4 seconds for live updates
          intervalId = setInterval(async () => {
            try {
              const pollRes = await api.get(`/chat/${cId}`);
              if (pollRes?.data?.messages) {
                const polledFormatted = pollRes.data.messages.map(m => ({
                  id: m._id || Date.now() + Math.random(),
                  sender: m.sender?._id === buyerId ? 'buyer' : 'farmer',
                  text: m.content || m.text || '',
                  time: new Date(m.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                }));
                setMessages(polledFormatted);
              }
            } catch (_) { }
          }, 4000);
        }
      } catch (err) {
        console.warn('Backend chat fallback to local storage:', err);
      } finally {
        setLoading(false);
      }
    };

    initBackendChat();

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [buyerId]);

  const handleSend = async (e) => {
    e?.preventDefault();
    const textToSend = inputText.trim();
    if (!textToSend || sending) return;

    setSending(true);
    const newMsg = {
      id: Date.now(),
      sender: 'farmer',
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, newMsg]);
    setInputText('');

    if (chatId) {
      try {
        await api.post(`/chat/${chatId}/message`, { content: textToSend });
      } catch (err) {
        console.warn('Failed to sync message to backend API:', err);
      }
    }
    setSending(false);
  };

  const quickReplies = [
    'Order is packed & ready for pickup! 📦',
    'Delivery agent has been notified 🚚',
    'Thank you for direct farm sourcing! 🌱',
  ];

  return (
    <div 
      className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl border border-gray-200 w-full max-w-lg h-[620px] max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="bg-[#1F7A4D] text-white p-4 flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-sm text-white flex items-center justify-center font-black text-lg border border-white/30">
                {buyerName?.charAt(0) || 'B'}
              </div>
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#1F7A4D] absolute -bottom-0.5 -right-0.5" title="Online" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white leading-tight">{buyerName || 'Verified Buyer'}</h3>
                <span className="text-[10px] bg-white/20 text-white font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">Buyer</span>
              </div>
              <p className="text-[11px] text-emerald-100 font-medium">Direct Live Messaging • Order #{orderId.slice(-6)}</p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* ORDER INFO CHIP BAR */}
        {order && (
          <div className="bg-emerald-50 border-b border-emerald-100 px-4 py-2.5 flex items-center justify-between text-xs text-emerald-900 shrink-0">
            <span className="font-bold">Lot: {order?.items?.[0]?.cropName || order?.cropName || 'Farm Produce'} ({order?.items?.[0]?.quantity || order?.quantity || 1} {order?.items?.[0]?.unit || order?.unit || 'kg'})</span>
            <span className="font-black text-emerald-800">Total: ₹{order?.totalAmount || order?.amount || order?.price || 0}</span>
          </div>
        )}

        {/* MESSAGES CONTAINER */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-stone-50/60">
          {loading && messages.length === 0 && (
            <div className="flex items-center justify-center py-10 gap-2 text-xs font-bold text-gray-400">
              <Loader2 size={16} className="animate-spin text-[#1F7A4D]" />
              Connecting to secure chat channel...
            </div>
          )}

          {messages.length === 0 && !loading && (
            <div className="text-center py-12 space-y-2">
              <span className="text-3xl block">💬</span>
              <p className="text-xs font-bold text-gray-600">Start direct conversation with {buyerName || 'Buyer'}</p>
              <p className="text-[11px] text-gray-400">Send an order update or pickup detail below.</p>
            </div>
          )}

          {messages.map((msg) => {
            const isFarmer = msg.sender === 'farmer';
            return (
              <div 
                key={msg.id}
                className={`flex flex-col ${isFarmer ? 'items-end' : 'items-start'}`}
              >
                <div 
                  className={`max-w-[82%] px-4 py-3 rounded-2xl text-xs leading-relaxed shadow-xs ${
                    isFarmer 
                      ? 'bg-[#1F7A4D] text-white rounded-br-xs' 
                      : 'bg-white text-gray-800 border border-gray-200 rounded-bl-xs'
                  }`}
                >
                  <p className="font-medium whitespace-pre-wrap">{msg.text}</p>
                  <div className={`flex items-center gap-1 mt-1 text-[9px] ${isFarmer ? 'text-emerald-200 justify-end' : 'text-gray-400'}`}>
                    <span>{msg.time}</span>
                    {isFarmer && <CheckCheck size={12} className="text-emerald-300" />}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* QUICK REPLIES CHIPS */}
        <div className="bg-white border-t border-gray-100 px-3 py-2 flex gap-2 overflow-x-auto shrink-0 scrollbar-none">
          {quickReplies.map((reply, idx) => (
            <button
              key={idx}
              onClick={() => setInputText(reply)}
              className="text-[11px] font-bold text-[#1F7A4D] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 px-3 py-1.5 rounded-full whitespace-nowrap cursor-pointer transition-colors shrink-0"
            >
              {reply}
            </button>
          ))}
        </div>

        {/* INPUT FORM */}
        <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-200 flex items-center gap-2 shrink-0">
          <input
            type="text"
            placeholder="Type live message to buyer..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 bg-gray-100 hover:bg-white focus:bg-white border border-gray-200 focus:border-[#1F7A4D] rounded-2xl px-4 py-3 text-xs font-semibold text-gray-800 outline-none transition-all"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || sending}
            className="w-11 h-11 rounded-2xl bg-[#1F7A4D] hover:bg-[#165b38] disabled:opacity-40 text-white flex items-center justify-center cursor-pointer shadow-md transition-all shrink-0"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
