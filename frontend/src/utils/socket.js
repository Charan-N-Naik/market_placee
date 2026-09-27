import { io } from 'socket.io-client';

// Determine the WebSocket URL matching the backend server
const API_BASE = import.meta.env.VITE_API_BASE || (typeof window !== 'undefined' && window.location.origin ? `${window.location.origin}/api` : 'http://localhost:5000/api');
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || API_BASE.replace(/\/api\/?$/, '');

let socket = null;

export const getSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: true,
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    socket.on('connect', () => {
      console.log('[Socket.IO] Connected with id:', socket.id);
    });

    socket.on('connect_error', (error) => {
      console.warn('[Socket.IO] Connection warning:', error.message);
    });
  }

  // Ensure socket is connected if previously disconnected
  if (!socket.connected) {
    socket.connect();
  }

  return socket;
};

export default getSocket;
