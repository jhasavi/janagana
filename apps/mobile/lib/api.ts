import axios from 'axios';
import { auth } from './auth';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await auth.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add tenant slug to headers for multi-tenant support
    const tenantSlug = await auth.getTenantSlug();
    if (tenantSlug) {
      config.headers['X-Tenant-Slug'] = tenantSlug;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired, clear auth and redirect to login
      await auth.clear();
      // The router will handle the redirect
    }
    return Promise.reject(error);
  }
);

export default api;
