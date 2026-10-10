import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('facehr_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Centralized error handling: backend always returns { success, message }
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.code === 'ECONNABORTED') {
      err.userMessage = 'The request timed out. Please try again.';
    } else if (!err.response) {
      err.userMessage = 'Network error. Please check your connection and try again.';
    } else if (err.response.status === 401) {
      const isAuthCall = err.config?.url?.includes('/auth/');
      if (!isAuthCall) {
        localStorage.removeItem('facehr_token');
        localStorage.removeItem('facehr_user');
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
      err.userMessage = err.response.data?.message || 'Please sign in again.';
    } else {
      err.userMessage = err.response.data?.message || 'Something went wrong. Please try again.';
    }
    return Promise.reject(err);
  }
);

/** Graceful helper that turns an error into a human-friendly message */
export function extractError(err, fallback = 'Something went wrong. Please try again.') {
  return err?.userMessage || err?.response?.data?.message || err?.message || fallback;
}

export default api;