// src/services/api.js
import axios from 'axios';

// Prefer .env (VITE_API_BASE_URL). Fallback to the same host's /api
const base = (import.meta?.env?.VITE_API_BASE_URL ?? `${window.location.origin}/api`)
  .replace(/\/+$/, ''); // trim trailing slash

const api = axios.create({
  baseURL: `${base}/`,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token automatically if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Token ${token}`;
  return config;
});

export default api;

