// src/services/api.js - Fixed version with better token handling
import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // If we get 401 Unauthorized, the token is invalid
    if (error.response?.status === 401) {
      console.log('🚫 Received 401, token may be invalid');
      // Don't automatically redirect here, let components handle it
    }
    return Promise.reject(error);
  }
);

export default api;