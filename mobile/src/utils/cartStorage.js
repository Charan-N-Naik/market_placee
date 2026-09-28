import AsyncStorage from '@react-native-async-storage/async-storage';

const CART_STORAGE_KEY = '@kisanbazaar_offline_cart';

/**
 * Load offline persisted cart items.
 */
export async function loadOfflineCart() {
  try {
    const raw = await AsyncStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (error) {
    console.error('[CartStorage] Failed to load offline cart:', error);
    return [];
  }
}

/**
 * Persist cart items for offline access.
 */
export async function saveOfflineCart(cartItems) {
  try {
    await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems || []));
    return true;
  } catch (error) {
    console.error('[CartStorage] Failed to save offline cart:', error);
    return false;
  }
}

/**
 * Clear persisted cart upon successful order checkout.
 */
export async function clearOfflineCart() {
  try {
    await AsyncStorage.removeItem(CART_STORAGE_KEY);
  } catch (error) {
    console.error('[CartStorage] Failed to clear offline cart:', error);
  }
}
