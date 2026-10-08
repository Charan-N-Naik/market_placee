import { io } from 'socket.io-client';
import { API_BASE } from '../api/axios';

// Determine the WebSocket URL matching the backend server
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || API_BASE.replace(/\/api\/?$/, '');

let socket = null;
let currentToken = null;

// Read the active authenticated user's JWT from localStorage
export const getCurrentToken = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('kisanbazaar_user');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.token || null;
  } catch (err) {
    return null;
  }
};

/**
 * Returns a singleton Socket.IO instance authenticated with the current user's JWT.
 * If the user logs in, switches accounts, or refreshes their token after initial creation,
 * it updates socket.auth and reconnects with the fresh token.
 */
export const getSocket = () => {
  const token = getCurrentToken();

  if (!socket) {
    currentToken = token;
    socket = io(SOCKET_URL, {
      autoConnect: true,
      transports: ['websocket', 'polling'],
      withCredentials: true,
      auth: { token },
    });

    socket.on('connect', () => {
      console.log('[Socket.IO] Connected with id:', socket.id);
    });

    socket.on('connect_error', (error) => {
      console.warn('[Socket.IO] Connection warning:', error.message);
    });
  } else if (currentToken !== token) {
    // User logged in, switched accounts, or token refreshed — update auth and reconnect
    currentToken = token;
    socket.auth = { token };
    socket.disconnect().connect();
    console.log('[Socket.IO] Reconnected with updated authentication token');
  } else if (!socket.connected && token) {
    socket.connect();
  }

  return socket;
};

// Reconnect on cross-tab storage changes (e.g. login in another tab or logout)
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === 'kisanbazaar_user' && socket) {
      const newToken = getCurrentToken();
      if (currentToken !== newToken) {
        currentToken = newToken;
        socket.auth = { token: newToken };
        socket.disconnect().connect();
        console.log('[Socket.IO] Storage sync: Reconnected with fresh user token');
      }
    }
  });
}

export default getSocket;
