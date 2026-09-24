import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from './AuthContext';

const ListingContext = createContext();

export function ListingProvider({ children }) {
  const [listings, setListings] = useState([]);
  const [savedListings, setSavedListings] = useState([]); // Array of full listing objects
  const [loading, setLoading] = useState(true);
  const { user, isAuthenticated } = useAuth();

  const fetchListings = useCallback(async () => {
    try {
      if (user?.role === 'farmer') {
        const { data } = await api.get('/listings/my');
        setListings(data);
      } else if (user?.role === 'buyer') {
        const [allListingsRes, savedListingsRes] = await Promise.all([
          api.get('/listings'),
          api.get('/listings/saved')
        ]);
        setListings(allListingsRes.data.listings || allListingsRes.data);
        setSavedListings(savedListingsRes.data);
      } else {
        const { data } = await api.get('/listings');
        setListings(data.listings || data);
      }
    } catch (error) {
      console.error('Error fetching listings:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchListings();
    } else {
      setListings([]);
      setSavedListings([]);
      setLoading(false);
    }
  }, [isAuthenticated, fetchListings]);

  const addListing = useCallback(async (listingData) => {
    try {
      const formData = new FormData();
      Object.keys(listingData).forEach(key => {
        if (key === 'photoFile' && listingData[key]) {
          formData.append('images', listingData[key]);
        } else if (key === 'report') {
          // New multi-angle Gemini report
          if (listingData[key]) {
            formData.append('aiVerify', 'true');
            formData.append('verificationReport', JSON.stringify(listingData[key]));
          }
        } else if (key === 'aiVerify') {
          // Allow explicit aiVerify flag from AddListingPage
          formData.append('aiVerify', listingData[key]);
        } else if (key === 'location') {
          const locVal = typeof listingData[key] === 'object'
            ? (listingData[key].address || listingData[key].district || listingData[key].state || '')
            : listingData[key];
          formData.append('location[address]', locVal);
        } else if (key !== 'photo' && listingData[key] !== undefined) {
          formData.append(key, listingData[key]);
        }
      });

      try {
        const { data } = await api.post('/listings', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setListings(prev => [data, ...prev]);
        return data;
      } catch (apiErr) {
        console.warn('Error posting listing to API, fallback to local state:', apiErr.message);
        const newLocalListing = {
          _id: 'loc_' + Date.now(),
          id: 'loc_' + Date.now(),
          cropName: listingData.cropName || 'Crop',
          variety: listingData.variety || '',
          quantity: Number(listingData.quantity) || 1,
          unit: listingData.unit || 'kg',
          pricePerUnit: Number(listingData.pricePerUnit || listingData.price) || 0,
          price: Number(listingData.pricePerUnit || listingData.price) || 0,
          description: listingData.description || '',
          isOrganic: listingData.isOrganic === true || listingData.isOrganic === 'true',
          location: listingData.location || 'Karnataka',
          harvestDate: listingData.harvestDate || new Date().toISOString(),
          photo: listingData.photo || null,
          status: 'active',
          views: 0,
          createdAt: new Date().toISOString(),
        };
        setListings(prev => [newLocalListing, ...prev]);
        return newLocalListing;
      }
    } catch (err) {
      console.error('Error adding listing', err);
      throw err;
    }
  }, []);


  const toggleSaved = useCallback(async (listingId) => {
    try {
      await api.post(`/listings/${listingId}/save`);
      // Refetch saved listings to ensure state is in sync with backend
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
    // Backend already filters by user if we fetched /my
    return listings;
  }, [listings]);

  const getSavedListingItems = useCallback(() => {
    return savedListings;
  }, [savedListings]);
  
  const incrementView = useCallback(async (listingId) => {
    try {
      // Backend automatically increments view when GET /:id is called. We can manually update state.
      setListings(prev => prev.map(l => (l._id || l.id) === listingId ? { ...l, views: (l.views || 0) + 1 } : l));
      await api.get(`/listings/${listingId}`);
    } catch (err) {
      console.error('Error incrementing view', err);
    }
  }, []);

  const updateListing = useCallback(async (listingId, updatedData) => {
    try {
      const { data } = await api.put(`/listings/${listingId}`, updatedData);
      setListings(prev => prev.map(l => (l._id || l.id) === listingId ? { ...l, ...data } : l));
      return data;
    } catch (err) {
      console.warn('Error updating listing via API, updating local state:', err.message);
      setListings(prev => prev.map(l => (l._id || l.id) === listingId ? { ...l, ...updatedData } : l));
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
      setSavedListings(prev => prev.filter(l => (l._id || l.id) !== listingId));
    }
  }, []);

  return (
    <ListingContext.Provider value={{
      listings,
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
