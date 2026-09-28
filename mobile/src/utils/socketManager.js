import { AppState } from 'react-native';
import { io } from 'socket.io-client';
import { getAuthSession } from './authStorage';

let socketInstance = null;
let appStateSubscription = null;

const BACKEND_URL = 'https://market-placee.onrender.com'; // or local dev IP e.g. http://10.0.2.2:5000 for Android emulator

/**
 * Initialize authenticated Socket.IO connection with automatic lifecycle reconnect.
 */
export async function initializeSocket(url = BACKEND_URL) {
  if (socketInstance) return socketInstance;

  const session = await getAuthSession();
  const token = session?.token;

  socketInstance = io(url, {
    auth: { token: token ? `Bearer ${token}` : '' },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
  });

  socketInstance.on('connect', () => {
    console.log('[Mobile Socket] Connected:', socketInstance.id);
  });

  socketInstance.on('disconnect', (reason) => {
    console.log('[Mobile Socket] Disconnected:', reason);
  });

  // Handle app background/foreground transitions
  if (!appStateSubscription) {
    appStateSubscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active') {
        console.log('[Mobile Socket] App resumed to foreground — reconnecting socket...');
        if (!socketInstance?.connected) {
          const freshSession = await getAuthSession();
          if (socketInstance) {
            socketInstance.auth = { token: freshSession?.token ? `Bearer ${freshSession.token}` : '' };
            socketInstance.connect();
          }
        }
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        console.log('[Mobile Socket] App sent to background — disconnecting socket to preserve battery & data...');
        if (socketInstance && socketInstance.connected) {
          socketInstance.disconnect();
        }
      }
    });
  }

  return socketInstance;
}

/**
 * Get active socket instance.
 */
export function getSocket() {
  return socketInstance;
}

/**
 * Cleanup and teardown socket and listeners on user logout.
 */
export function teardownSocket() {
  if (appStateSubscription) {
    appStateSubscription.remove();
    appStateSubscription = null;
  }
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}
