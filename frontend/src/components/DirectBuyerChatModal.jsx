import React, { useState, useEffect, useRef } from 'react';
import { X, Send, CheckCheck, Loader2, User, Truck, ShieldCheck, Sprout } from 'lucide-react';
import api from '../api/axios';
import { getSocket } from '../utils/socket';

export default function DirectBuyerChatModal({ buyerName, order, onClose }) {
  const orderId = order?._id || order?.id || order?.orderId || 'default_order';

  // Current logged in user info
  const currentUser = (() => {
    try {
      const raw = localStorage.getItem('kisanbazaar_user');
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  })();
  const currentUserId = currentUser?._id || currentUser?.id;
  const currentRole = currentUser?.role || 'buyer';

  const farmerName = order?.farmer?.name || order?.farmerDetails?.farmerName || order?.items?.[0]?.listing?.farmer?.name || 'Farmer';
  const buyerDisplayName = order?.buyer?.name || order?.buyerDropDetails?.buyerName || buyerName || 'Buyer';
  const agentName = order?.deliveryAgent?.name || order?.driver?.name || 'Delivery Partner';

  const storageKey = `kb_chat_${orderId}`;

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
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Persist messages locally as fallback
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(messages));
      } catch (_) { }
    }
  }, [messages, storageKey]);

  // Initialize Socket.IO and fetch backend chat room
  useEffect(() => {
    if (!orderId || orderId === 'default_order') return;

    const socket = getSocket();
    const chatRoom = `order_chat:${orderId}`;
    const orderRoom = `order:${orderId}`;

    socket.emit('join_room', chatRoom);
    socket.emit('join_room', orderRoom);
    setIsConnected(socket.connected);

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    // Listen for incoming live real-time messages from any party
    const handleReceiveOrderMessage = (newMsg) => {
      if (!newMsg) return;
      if (newMsg.orderId && newMsg.orderId !== orderId) return;

      setMessages((prev) => {
        // Prevent duplicate messages if already present
        const exists = prev.some(
          (m) =>
            (m._id && newMsg._id && m._id === newMsg._id) ||
            (m.tempId && m.tempId === newMsg.tempId) ||
            (m.text === newMsg.text && Math.abs(new Date(m.createdAt || 0) - new Date(newMsg.createdAt || 0)) < 2000)
        );
        if (exists) {
          return prev.map(m => (m._id === newMsg._id ? newMsg : m));
        }
        return [...prev, newMsg];
      });
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('receive_order_message', handleReceiveOrderMessage);

    // Fetch initial chat history from backend
    const fetchChatHistory = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/chat/order/${orderId}`).catch(() => null);
        if (res?.data?.messages && Array.isArray(res.data.messages) && res.data.messages.length > 0) {
          setMessages(res.data.messages);
        }
      } catch (err) {
        console.warn('[DirectBuyerChatModal] Could not fetch chat from API, using cached:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchChatHistory();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('receive_order_message', handleReceiveOrderMessage);
      socket.emit('leave_room', chatRoom);
    };
  }, [orderId]);

  const handleSend = async (e) => {
    e?.preventDefault();
    const textToSend = inputText.trim();
    if (!textToSend || sending) return;

    setSending(true);
    const tempId = `tmp_${Date.now()}`;
    const timestamp = new Date().toISOString();

    const localMsg = {
      _id: tempId,
      tempId,
      orderId,
      sender: {
        _id: currentUserId,
        id: currentUserId,
        name: currentUser?.name || 'You',
        role: currentRole,
      },
      text: textToSend,
      createdAt: timestamp,
    };

    // Optimistic UI update
    setMessages((prev) => [...prev, localMsg]);
    setInputText('');

    // Emit live over Socket.IO
    const socket = getSocket();
    socket.emit('send_order_message', {
      orderId,
      text: textToSend,
      tempId,
    });

    // Sync via REST API for persistence
    try {
      await api.post(`/chat/order/${orderId}/message`, {
        content: textToSend,
        text: textToSend,
      });
    } catch (err) {
      console.warn('[DirectBuyerChatModal] API sync fallback:', err);
    } finally {
      setSending(false);
    }
  };

  // Dynamic quick replies based on role
  const quickReplies = (() => {
    if (currentRole === 'farmer') {
      return [
        'Produce is packed & ready for agent pickup! 📦',
        'Quality verified fresh from farm 🌱',
        'Delivery agent has been contacted 🚚',
      ];
    }
    if (currentRole === 'deliveryAgent') {
      return [
        'I am on my way to the farm for pickup 🚚',
        'Crops collected from farmer, in transit! 🛣️',
        'Arrived at buyer delivery address! 🏁',
      ];
    }
    return [
      'Hi! Can you confirm when the crop will be dispatched? 📦',
      'Please ensure careful handling during transit 🌱',
      'Thank you! Looking forward to delivery 🚚',
    ];
  })();

  const getRoleBadge = (role) => {
    if (role === 'farmer') {
      return (
        <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded flex items-center gap-0.5">
          <Sprout size={10} /> Farmer
        </span>
      );
    }
    if (role === 'deliveryAgent') {
      return (
        <span className="text-[9px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded flex items-center gap-0.5">
          <Truck size={10} /> Agent
        </span>
      );
    }
    return (
      <span className="text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded flex items-center gap-0.5">
        <User size={10} /> Buyer
      </span>
    );
  };

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl border border-gray-200 w-full max-w-lg h-[640px] max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="bg-[#1F7A4D] text-white p-4 flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-sm text-white flex items-center justify-center font-black text-lg border border-white/30">
                💬
              </div>
              <span
                className={`w-3.5 h-3.5 rounded-full border-2 border-[#1F7A4D] absolute -bottom-0.5 -right-0.5 ${
                  isConnected ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
                title={isConnected ? 'Real-time Socket Connected' : 'Connecting...'}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm sm:text-base text-white leading-tight">Live Order Communication</h3>
                <span className="text-[9px] bg-white/20 text-white font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                  Tri-Party
                </span>
              </div>
              <p className="text-[11px] text-emerald-100 font-medium">
                Farmer • Buyer • Delivery Agent • #{orderId.slice(-8).toUpperCase()}
              </p>
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
        <div className="bg-emerald-50 border-b border-emerald-100 px-4 py-2 flex items-center justify-between text-xs text-emerald-900 shrink-0">
          <span className="font-bold truncate max-w-[240px]">
            🌾 {order?.items?.[0]?.cropName || order?.items?.[0]?.listing?.cropName || 'Produce'} (
            {order?.items?.[0]?.quantity || 1} {order?.items?.[0]?.unit || 'kg'})
          </span>
          <span className="font-black text-emerald-800 shrink-0">
            Total: ₹{(order?.totalAmount || 0).toLocaleString('en-IN')}
          </span>
        </div>

        {/* PARTICIPANTS PILL ROW */}
        <div className="bg-zinc-50 border-b border-zinc-200/80 px-4 py-1.5 flex items-center gap-2 text-[10px] font-bold text-zinc-500 overflow-x-auto no-scrollbar shrink-0">
          <span className="text-zinc-400 uppercase text-[9px] font-black">Connected:</span>
          <span className="bg-white border border-zinc-200 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
            🌾 {farmerName}
          </span>
          <span className="bg-white border border-zinc-200 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
            🛒 {buyerDisplayName}
          </span>
          {agentName && (
            <span className="bg-white border border-zinc-200 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
              🚚 {agentName}
            </span>
          )}
        </div>

        {/* MESSAGES CONTAINER */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-stone-50/60">
          {loading && messages.length === 0 && (
            <div className="flex items-center justify-center py-10 gap-2 text-xs font-bold text-gray-400">
              <Loader2 size={16} className="animate-spin text-[#1F7A4D]" />
              Connecting to secure real-time room...
            </div>
          )}

          {messages.length === 0 && !loading && (
            <div className="text-center py-12 space-y-2">
              <span className="text-3xl block">💬</span>
              <p className="text-xs font-black text-gray-700">Start conversation for Order #{orderId.slice(-8).toUpperCase()}</p>
              <p className="text-[11px] text-gray-400">All updates are instantly relayed via Socket.IO between Farmer, Buyer, and Delivery Agent.</p>
            </div>
          )}

          {messages.map((msg, index) => {
            const senderId = msg.sender?._id || msg.sender?.id || msg.sender;
            const isMe = String(senderId) === String(currentUserId);
            const senderRole = msg.sender?.role || (isMe ? currentRole : 'user');
            const senderName = isMe ? 'You' : msg.sender?.name || (senderRole === 'farmer' ? farmerName : senderRole === 'deliveryAgent' ? agentName : buyerDisplayName);

            const timeStr = msg.createdAt
              ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '';

            return (
              <div key={msg._id || msg.tempId || index} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                {/* Sender Tag Header if not me */}
                {!isMe && (
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    <span className="text-[10px] font-black text-zinc-700">{senderName}</span>
                    {getRoleBadge(senderRole)}
                  </div>
                )}

                <div
                  className={`max-w-[82%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-xs ${
                    isMe
                      ? 'bg-[#1F7A4D] text-white rounded-br-xs'
                      : 'bg-white text-zinc-800 border border-zinc-200/90 rounded-bl-xs'
                  }`}
                >
                  <p className="font-semibold whitespace-pre-wrap">{msg.text || msg.content}</p>
                  <div
                    className={`flex items-center gap-1 mt-1 text-[9px] ${
                      isMe ? 'text-emerald-200 justify-end' : 'text-zinc-400'
                    }`}
                  >
                    <span>{timeStr}</span>
                    {isMe && <CheckCheck size={12} className="text-emerald-300" />}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* QUICK REPLIES CHIPS */}
        <div className="bg-white border-t border-gray-100 px-3 py-2 flex gap-2 overflow-x-auto shrink-0 no-scrollbar">
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
            placeholder={`Message Farmer, Buyer & Agent...`}
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
