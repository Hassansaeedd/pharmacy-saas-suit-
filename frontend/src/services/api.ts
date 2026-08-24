import axios from 'axios';
 
const getBaseUrl = (): string => {
  let url = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
  url = url.trim().replace(/\/+$/, ''); // Remove trailing slash
  if (!url.endsWith('/api/v1')) {
    url = `${url}/api/v1`;
  }
  return url;
};

export const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('pharmaflow_token') || localStorage.getItem('pharmaflow_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response interceptor to handle 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      sessionStorage.removeItem('pharmaflow_token');
      localStorage.removeItem('pharmaflow_token');
      localStorage.removeItem('pharmaflow_user');
      localStorage.removeItem('pharmaflow_business');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/onboard') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
