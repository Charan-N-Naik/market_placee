import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import api from '../api/axios';

const API_BASE = import.meta.env.VITE_API_BASE || `${window.location.origin}/api`;

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('kisanbazaar_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Attempt silent refresh on startup using raw axios (bypasses interceptor to avoid loop)
    const initializeAuth = async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/auth/refresh`, {
          withCredentials: true,
        });

        // After getting a new token, fetch the user profile
        api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;

        const userRes = await api.get('/auth/me');
        const userData = { ...userRes.data, token: data.token };

        setUser(userData);
        localStorage.setItem('kisanbazaar_user', JSON.stringify(userData));
      } catch (error) {
        // 401 here means no valid session — this is normal for logged-out users. Suppress noise.
        setUser(null);
        localStorage.removeItem('kisanbazaar_user');
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = useCallback(async (credentials) => {
    try {
      const { data } = await api.post('/auth/login', credentials);
      const userData = { ...data.user, token: data.token };
      setUser(userData);
      localStorage.setItem('kisanbazaar_user', JSON.stringify(userData));
      return userData;
    } catch (err) {
      throw new Error(err.response?.data?.message || 'Login failed');
    }
  }, []);

  const googleLogin = useCallback(async (token, role) => {
    try {
      const { data } = await api.post('/auth/google', { token, role });
      const userData = { ...data.user, token: data.token };
      setUser(userData);
      localStorage.setItem('kisanbazaar_user', JSON.stringify(userData));
      return userData;
    } catch (err) {
      throw new Error(err.response?.data?.message || 'Google authentication failed');
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout error', err);
    } finally {
      setUser(null);
      localStorage.removeItem('kisanbazaar_user');
    }
  }, []);

  const register = useCallback(async (userData) => {
    try {
      let dataToSend = userData;
      let headers = { 'Content-Type': 'application/json' };

      if (userData.avatar) {
        const formData = new FormData();
        Object.keys(userData).forEach(key => {
          if (userData[key] !== undefined && userData[key] !== null) {
            formData.append(key, userData[key]);
          }
        });
        dataToSend = formData;
        headers = { 'Content-Type': 'multipart/form-data' };
      }

      const { data } = await api.post('/auth/register', dataToSend, { headers });
      const newUser = { ...data.user, token: data.token };
      setUser(newUser);
      localStorage.setItem('kisanbazaar_user', JSON.stringify(newUser));
      return newUser;
    } catch (err) {
      throw new Error(err.response?.data?.message || 'Registration failed');
    }
  }, []);

  const updateProfile = useCallback(async (profileData) => {
    try {
      const { data } = await api.put('/auth/me', profileData);
      const updatedUser = { ...user, ...data, token: user.token };
      setUser(updatedUser);
      localStorage.setItem('kisanbazaar_user', JSON.stringify(updatedUser));
      return updatedUser;
    } catch (err) {
      throw new Error(err.response?.data?.message || 'Profile update failed');
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, login, googleLogin, logout, register, updateProfile, isAuthenticated: !!user, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
