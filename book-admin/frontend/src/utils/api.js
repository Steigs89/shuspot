// API configuration for development vs production
const isDevelopment = process.env.NODE_ENV === 'development';

export const API_BASE_URL = isDevelopment 
  ? 'http://localhost:8000'  // Development - direct to backend
  : '/api';                  // Production - Vercel API routes

export const getApiUrl = (endpoint) => {
  // Remove leading slash if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_BASE_URL}/${cleanEndpoint}`;
};

// For production builds, also support relative URLs
export const getFullApiUrl = (endpoint) => {
  if (isDevelopment) {
    return getApiUrl(endpoint);
  }
  
  // In production, use the current domain
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${window.location.origin}/api/${cleanEndpoint}`;
};

export default {
  API_BASE_URL,
  getApiUrl,
  getFullApiUrl
};
