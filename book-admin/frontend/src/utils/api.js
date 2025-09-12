// API configuration for development vs production
const isDevelopment = process.env.NODE_ENV === 'development';

// Use environment variable if available, otherwise fallback to hardcoded values
export const API_BASE_URL = isDevelopment 
  ? 'http://localhost:8000'  // Development - direct to backend
  : process.env.REACT_APP_API_URL || 'https://shuspot-admin-panel.vercel.app/api';  // Production - Vercel API routes

export const getApiUrl = (endpoint = '') => {
  // Handle missing endpoint and leading slash
  const cleanEndpoint = endpoint
    ? (endpoint.startsWith('/') ? endpoint.slice(1) : endpoint)
    : '';
  return cleanEndpoint ? `${API_BASE_URL}/${cleanEndpoint}` : API_BASE_URL;
};

export default {
  API_BASE_URL,
  getApiUrl
};
