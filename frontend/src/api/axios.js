import axios from 'axios';

// Determine API base URL:
// - Use Vite env `VITE_API_BASE` when set (recommended for production)
// - Otherwise, use `window.location.origin + '/api'` in browser (for deployments where API is proxied)
// - Fallback to localhost for local dev
const API_BASE = import.meta.env.VITE_API_BASE || (typeof window !== 'undefined' && window.location.origin ? `${window.location.origin}/api` : 'http://localhost:5000/api');

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for sending httpOnly cookies
});

// Add a request interceptor
api.interceptors.request.use(
  (config) => {
    const user = JSON.parse(localStorage.getItem('kisanbazaar_user'));
    if (user && user.token) {
      config.headers.Authorization = `Bearer ${user.token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {

      // CRITICAL: Never retry the refresh endpoint itself — that causes an infinite loop.
      // Also skip if there's no local user session to refresh.
      const isRefreshCall = originalRequest.url?.includes('/auth/refresh');
      const hasLocalUser = !!localStorage.getItem('kisanbazaar_user');

      if (isRefreshCall || !hasLocalUser) {
        // No session or the refresh itself failed — clear state silently, no redirect spam.
        localStorage.removeItem('kisanbazaar_user');
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      try {
        // Attempt to refresh token using a plain axios call (bypasses this interceptor)
        const { data } = await axios.get(`${API_BASE}/auth/refresh`, {
          withCredentials: true,
        });

        // Update local storage with new token
        const user = JSON.parse(localStorage.getItem('kisanbazaar_user'));
        if (user) {
          user.token = data.token;
          localStorage.setItem('kisanbazaar_user', JSON.stringify(user));
        }

        // Retry original request with new token
        api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
        originalRequest.headers['Authorization'] = `Bearer ${data.token}`;

        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed — clear storage but do NOT redirect here;
        // let AuthContext handle the UI state.
        localStorage.removeItem('kisanbazaar_user');
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
