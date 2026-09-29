import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_SESSION_KEY = 'kisanbazaar_mobile_user';

/**
 * Securely store authentication token and user data in device Keychain.
 * Uses hardware-backed keystore/keychain for secure token storage.
 */
export async function saveAuthSession(userData) {
  try {
    const token = userData?.token;
    if (token) {
      await Keychain.setGenericPassword('auth_token', token, {
        service: 'com.kisanbazaar.auth',
      });
    }
    // Store non-sensitive user metadata in AsyncStorage
    await AsyncStorage.setItem(USER_SESSION_KEY, JSON.stringify(userData));
    return true;
  } catch (error) {
    console.error('[AuthStorage] Failed to save credentials to Keychain:', error);
    // Fallback to AsyncStorage if Keychain is unavailable on device
    await AsyncStorage.setItem(USER_SESSION_KEY, JSON.stringify(userData));
    return false;
  }
}

/**
 * Retrieve auth token from Keychain and user session from storage.
 */
export async function getAuthSession() {
  try {
    const credentials = await Keychain.getGenericPassword({
      service: 'com.kisanbazaar.auth',
    });
    const storedUserRaw = await AsyncStorage.getItem(USER_SESSION_KEY);
    const user = storedUserRaw ? JSON.parse(storedUserRaw) : null;

    if (credentials && credentials.password) {
      return {
        ...user,
        token: credentials.password,
      };
    }
    return user;
  } catch (error) {
    console.error('[AuthStorage] Failed to read credentials from Keychain:', error);
    const storedUserRaw = await AsyncStorage.getItem(USER_SESSION_KEY);
    return storedUserRaw ? JSON.parse(storedUserRaw) : null;
  }
}

/**
 * Clear credentials on logout from Keychain and local storage.
 */
export async function clearAuthSession() {
  try {
    await Keychain.resetGenericPassword({
      service: 'com.kisanbazaar.auth',
    });
    await AsyncStorage.removeItem(USER_SESSION_KEY);
    return true;
  } catch (error) {
    console.error('[AuthStorage] Error clearing auth session:', error);
    await AsyncStorage.removeItem(USER_SESSION_KEY);
    return false;
  }
}
