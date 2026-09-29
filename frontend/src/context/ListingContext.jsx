import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import api from '../api/axios';
import { useAuth } from './AuthContext';
import { getSocket } from '../utils/socket';

const ListingContext = createContext();

export function ListingProvider({ children }) {
  const [listings, setListings] = useState([]);
  const [myListings, setMyListings] = useState([]);
  const [savedListings, setSavedListings] = useState([]); // Array of full listing objects
  const [loading, setLoading] = useState(true);
  const { user, isAuthenticated } = useAuth();
  const userId = user?._id || user?.id;
  const userRole = user?.role;
  const requestIdRef = useRef(0);

  const fetchListings = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    try {
      const promises = [
        api.get('/listings?limit=100'),
        userRole === 'farmer' ? api.get('/listings/my') : Promise.resolve({ data: [] }),
        userRole === 'buyer' ? api.get('/listings/saved') : Promise.resolve({ data: [] })
      ];

      const [marketRes, myRes, savedRes] = await Promise.allSettled(promises);
      if (requestId !== requestIdRef.current) return;

      if (marketRes.status === 'fulfilled') {
        const mData = marketRes.value.data;
        const allListings = Array.isArray(mData?.listings) ? mData.listings : (Array.isArray(mData) ? mData : []);
        setListings(allListings);
      }

      if (myRes.status === 'fulfilled' && userRole === 'farmer') {
        setMyListings(Array.isArray(myRes.value.data) ? myRes.value.data : []);
      }

      if (savedRes.status === 'fulfilled' && userRole === 'buyer') {
        setSavedListings(Array.isArray(savedRes.value.data) ? savedRes.value.data : []);
      }
    } catch (error) {
      if (requestId === requestIdRef.current) {
        console.error('Error fetching listings:', error);
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [userId, userRole]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchListings();
    } else {
      setListings([]);
      setMyListings([]);
      setSavedListings([]);
      setLoading(false);
    }
  }, [isAuthenticated, fetchListings]);

  // Real-time socket event listeners for instant catalog synchronisation
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleListingCreated = (newListing) => {
      if (!newListing) return;
      const newId = (newListing._id || newListing.id)?.toString();
      setListings(prev => {
        if (prev.some(l => (l._id || l.id)?.toString() === newId)) return prev;
        return [newListing, ...prev];
      });
      const farmerId = (newListing.farmer?._id || newListing.farmer?.id || newListing.farmer)?.toString();
      if (userId && farmerId === userId.toString()) {
        setMyListings(prev => {
          if (prev.some(l => (l._id || l.id)?.toString() === newId)) return prev;
          return [newListing, ...prev];
        });
      }
    };

    const handleListingUpdated = (updatedListing) => {
      if (!updatedListing) return;
      const upId = (updatedListing._id || updatedListing.id)?.toString();
      setListings(prev =>
        prev.map(l => (l._id || l.id)?.toString() === upId ? { ...l, ...updatedListing } : l)
      );
      setMyListings(prev =>
        prev.map(l => (l._id || l.id)?.toString() === upId ? { ...l, ...updatedListing } : l)
      );
    };

    const handleListingDeleted = (deletedId) => {
      if (!deletedId) return;
      const delStr = deletedId.toString();
      setListings(prev => prev.filter(l => (l._id || l.id)?.toString() !== delStr));
      setMyListings(prev => prev.filter(l => (l._id || l.id)?.toString() !== delStr));
      setSavedListings(prev => prev.filter(l => (l._id || l.id)?.toString() !== delStr));
    };

    const handleStockUpdated = ({ listingId, quantity }) => {
      if (!listingId) return;
      const strId = listingId.toString();
      setListings(prev =>
        prev.map(l => (l._id || l.id)?.toString() === strId ? { ...l, quantity: Number(quantity) } : l)
      );
      setMyListings(prev =>
        prev.map(l => (l._id || l.id)?.toString() === strId ? { ...l, quantity: Number(quantity) } : l)
      );
    };

    socket.on('listing:created', handleListingCreated);
    socket.on('listing:updated', handleListingUpdated);
    socket.on('listing:deleted', handleListingDeleted);
    socket.on('listing:stock_updated', handleStockUpdated);

    return () => {
      socket.off('listing:created', handleListingCreated);
      socket.off('listing:updated', handleListingUpdated);
      socket.off('listing:deleted', handleListingDeleted);
      socket.off('listing:stock_updated', handleStockUpdated);
    };
  }, [userId]);

  const addListing = useCallback(async (listingData) => {
    const formData = new FormData();

    Object.keys(listingData).forEach(key => {
      if (key === 'photoFile' && listingData[key]) {
        // Attach raw file for multipart upload (used when /api/upload is unavailable)
        formData.append('images', listingData[key]);
      } else if (key === 'report') {
        if (listingData[key]) {
          formData.append('aiVerify', 'true');
          formData.append('verificationReport', JSON.stringify(listingData[key]));
        }
      } else if (key === 'aiVerify') {
        formData.append('aiVerify', listingData[key]);
      } else if (key === 'location') {
        // Send as flat form fields so the controller can parse them
        const loc = listingData[key];
        if (typeof loc === 'object' && loc !== null) {
          formData.append('location[address]', loc.address || loc.district || loc.state || '');
          if (loc.district) formData.append('location[district]', loc.district);
          if (loc.state)   formData.append('location[state]',   loc.state);
          if (loc.lat)     formData.append('location[lat]',     String(loc.lat));
          if (loc.lng)     formData.append('location[lng]',     String(loc.lng));
        } else {
          formData.append('location[address]', loc || '');
        }
      } else if (key === 'photo' || key === 'imageUrl') {
        if (listingData[key]) formData.append('imageUrl', listingData[key]);
      } else if (listingData[key] !== undefined && listingData[key] !== null) {
        formData.append(key, listingData[key]);
      }
    });

    // This call MUST succeed — no silent local fallback.
    // If it throws, the error propagates to the caller (AddListingPage) which shows the user.
    const { data } = await api.post('/listings', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    // Update both market catalog and farmer's own list optimistically
    setListings(prev => {
      const id = (data._id || data.id)?.toString();
      if (prev.some(l => (l._id || l.id)?.toString() === id)) return prev;
      return [data, ...prev];
    });
    setMyListings(prev => {
      const id = (data._id || data.id)?.toString();
      if (prev.some(l => (l._id || l.id)?.toString() === id)) return prev;
      return [data, ...prev];
    });

    return data;
  }, []);

  const toggleSaved = useCallback(async (listingId) => {
    try {
      await api.post(`/listings/${listingId}/save`);
      const { data } = await api.get('/listings/saved');
      setSavedListings(data);
    } catch (err) {
      console.error('Error toggling saved', err);
    }
  }, []);

  const isSaved = useCallback((listingId) => {
    return (savedListings || []).some(l => (l._id || l.id) === listingId);
  }, [savedListings]);

  const getMyListings = useCallback((farmerName) => {
    if (myListings && myListings.length > 0) return myListings;
    return listings.filter(l => {
      const fId = l.farmer?._id || l.farmer?.id || l.farmer;
      if (fId && userId && fId.toString() === userId.toString()) return true;
      if (farmerName && l.farmer?.name && l.farmer.name.toLowerCase() === farmerName.toLowerCase()) return true;
      return false;
    });
  }, [myListings, listings, userId]);

  const getSavedListingItems = useCallback(() => {
    return savedListings;
  }, [savedListings]);
  
  const incrementView = useCallback(async (listingId) => {
    try {
      setListings(prev => prev.map(l => (l._id || l.id) === listingId ? { ...l, views: (l.views || 0) + 1 } : l));
      setMyListings(prev => prev.map(l => (l._id || l.id) === listingId ? { ...l, views: (l.views || 0) + 1 } : l));
      await api.get(`/listings/${listingId}`);
    } catch (err) {
      console.error('Error incrementing view', err);
    }
  }, []);

  const updateListing = useCallback(async (listingId, updatedData) => {
    try {
      const { data } = await api.put(`/listings/${listingId}`, updatedData);
      setListings(prev => prev.map(l => (l._id || l.id) === listingId ? { ...l, ...data } : l));
      setMyListings(prev => prev.map(l => (l._id || l.id) === listingId ? { ...l, ...data } : l));
      return data;
    } catch (err) {
      console.warn('Error updating listing via API, updating local state:', err.message);
      setListings(prev => prev.map(l => (l._id || l.id) === listingId ? { ...l, ...updatedData } : l));
      setMyListings(prev => prev.map(l => (l._id || l.id) === listingId ? { ...l, ...updatedData } : l));
      return updatedData;
    }
  }, []);

  const deleteListing = useCallback(async (listingId) => {
    try {
      await api.delete(`/listings/${listingId}`);
    } catch (err) {
      console.warn('Error deleting listing via API, updating local state:', err.message);
    } finally {
      setListings(prev => prev.filter(l => (l._id || l.id) !== listingId));
      setMyListings(prev => prev.filter(l => (l._id || l.id) !== listingId));
      setSavedListings(prev => prev.filter(l => (l._id || l.id) !== listingId));
    }
  }, []);

  return (
    <ListingContext.Provider value={{
      listings,
      myListings,
      loading,
      addListing,
      updateListing,
      deleteListing,
      toggleSaved,
      isSaved,
      getMyListings,
      getSavedListingItems,
      savedListings,
      incrementView,
      fetchListings
    }}>
      {children}
    </ListingContext.Provider>
  );
}

export const useListings = () => useContext(ListingContext);
