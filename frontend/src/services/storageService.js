import { mockListings } from '../data/mockData';

const LISTINGS_KEY = 'kisanbazaar_listings';
const SAVED_KEY = 'kisanbazaar_saved';

const DATA_VERSION = 'v3_real_only';
const VERSION_KEY = 'kb_data_version';

export const storageService = {
  getListings: () => {
    const data = localStorage.getItem(LISTINGS_KEY);
    const version = localStorage.getItem(VERSION_KEY);
    
    if (!data || version !== DATA_VERSION) {
      localStorage.setItem(LISTINGS_KEY, JSON.stringify(mockListings));
      localStorage.setItem(VERSION_KEY, DATA_VERSION);
      return mockListings;
    }
    return JSON.parse(data);
  },
  
  saveListings: (listings) => {
    localStorage.setItem(LISTINGS_KEY, JSON.stringify(listings));
  },

  getSaved: () => {
    const data = localStorage.getItem(SAVED_KEY);
    return data ? JSON.parse(data) : [];
  },

  setSaved: (saved) => {
    localStorage.setItem(SAVED_KEY, JSON.stringify(saved));
  },

  clearData: () => {
    localStorage.removeItem(LISTINGS_KEY);
    localStorage.removeItem(SAVED_KEY);
    window.location.reload();
  }
};
