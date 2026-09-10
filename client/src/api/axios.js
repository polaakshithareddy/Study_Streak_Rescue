import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request Interceptor: Attach JWT token if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('ssr_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Extract error message cleanly
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const customMessage = error.response?.data?.error?.message || 'An unexpected error occurred.';
    return Promise.reject(new Error(customMessage));
  }
);

export default api;
