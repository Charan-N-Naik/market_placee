import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { useAuth } from './AuthContext';

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated, user } = useAuth();

  const fetchCart = useCallback(async () => {
    if (!isAuthenticated || user?.role !== 'buyer') {
      setCart(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const { data } = await api.get('/cart');
      setCart(data);
    } catch (error) {
      console.error('Error fetching cart:', error);
      setCart({ items: [] });
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const addToCart = async (listingId, quantity, listingObj = null) => {
    try {
      console.log('Adding to cart:', { listingId, quantity });
      const { data } = await api.post('/cart/add', { listingId, quantity });
      console.log('Cart updated via API:', data);
      setCart(data);
      return data;
    } catch (error) {
      console.warn('API cart add failed, using robust local cart fallback:', error);
      
      // Fallback local state update
      setCart(prevCart => {
        const currentItems = prevCart?.items ? [...prevCart.items] : [];
        const existingIndex = currentItems.findIndex(item => (item.listing?._id || item.listing?.id || item.listing) === listingId);
        
        if (existingIndex > -1) {
          currentItems[existingIndex] = {
            ...currentItems[existingIndex],
            quantity: currentItems[existingIndex].quantity + quantity
          };
        } else {
          currentItems.push({
            listing: listingObj || listingId,
            quantity,
            priceAtAdd: listingObj?.pricePerUnit || listingObj?.price || 0
          });
        }
        return { ...prevCart, items: currentItems };
      });
      return { success: true };
    }
  };

  const updateQuantity = async (listingId, quantity) => {
    try {
      const { data } = await api.put('/cart/update', { listingId, quantity });
      setCart(data);
      return data;
    } catch (error) {
      console.warn('API update cart quantity failed, updating locally:', error);
      setCart(prevCart => {
        if (!prevCart?.items) return prevCart;
        const updatedItems = prevCart.items.map(item => {
          if ((item.listing?._id || item.listing?.id || item.listing) === listingId) {
            return { ...item, quantity };
          }
          return item;
        });
        return { ...prevCart, items: updatedItems };
      });
    }
  };

  const removeFromCart = async (listingId) => {
    try {
      const { data } = await api.delete('/cart/remove', { data: { listingId } });
      setCart(data);
      return data;
    } catch (error) {
      console.warn('API remove cart failed, updating locally:', error);
      setCart(prevCart => {
        if (!prevCart?.items) return prevCart;
        const filtered = prevCart.items.filter(item => (item.listing?._id || item.listing?.id || item.listing) !== listingId);
        return { ...prevCart, items: filtered };
      });
    }
  };

  const cartItemsCount = cart?.items?.reduce((total, item) => total + item.quantity, 0) || 0;

  return (
    <CartContext.Provider value={{
      cart,
      loading,
      addToCart,
      updateQuantity,
      removeFromCart,
      fetchCart,
      cartItemsCount
    }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
