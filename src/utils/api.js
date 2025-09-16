// API configuration for development vs production
const isDevelopment = process.env.NODE_ENV === 'development';

export const API_BASE_URL = isDevelopment 
  ? 'http://localhost:8000'  // Development - direct to backend
  : '/api';                  // Production - Vercel API routes

export const getApiUrl = (endpoint = '') => {
  // Normalize: handle undefined/null and leading slashes
  const ep = typeof endpoint === 'string' ? endpoint : '';
  const cleanEndpoint = ep.startsWith('/') ? ep.slice(1) : ep;
  return cleanEndpoint ? `${API_BASE_URL}/${cleanEndpoint}` : API_BASE_URL;
};

export default {
  API_BASE_URL,
  getApiUrl
};
