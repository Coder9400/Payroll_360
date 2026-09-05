/**
 * API Client
 * ──────────
 * Axios instance pre-configured for the PeoplePay360 backend.
 * - Reads VITE_API_BASE_URL from environment (defaults to localhost:5000/api)
 * - Attaches Bearer token from localStorage on every request
 * - Handles 401 globally by clearing session and redirecting to /login
 */
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false,
});

// ── Request interceptor: attach auth token ─────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('pp360_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: handle 401 globally ─────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear stale token and redirect to login
      localStorage.removeItem('pp360_token');
      localStorage.removeItem('pp360_user');
      // Only redirect if not already on login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
