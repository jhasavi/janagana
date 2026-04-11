import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuth } from '@clerk/nextjs';

/**
 * Centralized API client for Janagana
 * 
 * Features:
 * - Uses NEXT_PUBLIC_API_URL in browser
 * - Uses API_URL on server (for SSR)
 * - Adds auth token from Clerk to every request
 * - Handles 401 → redirect to login
 * - Handles network errors (API might be cold-starting)
 * - Has retry logic (3 retries for network errors)
 * - Request timeout (30 seconds for free tier cold start)
 */

// Determine API URL based on environment
const getApiUrl = (): string => {
  if (typeof window === 'undefined') {
    // Server-side: use API_URL (for SSR)
    return process.env.API_URL || 'http://localhost:4000/api/v1';
  }
  // Client-side: use NEXT_PUBLIC_API_URL
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
};

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: getApiUrl(),
  timeout: 30000, // 30 seconds for Render free tier cold start
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Add auth token
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Get auth token from Clerk (only on client-side)
    if (typeof window !== 'undefined') {
      try {
        const { getToken } = useAuth();
        const token = await getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        // If Clerk is not available, continue without token
        console.warn('Failed to get auth token:', error);
      }
    }

    // Add tenant slug if available
    if (typeof window !== 'undefined') {
      // Try to get tenant from localStorage or URL
      const tenantSlug = localStorage.getItem('current_tenant');
      if (tenantSlug) {
        config.headers['x-tenant-slug'] = tenantSlug;
      }
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor: Handle errors and retry
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: number };

    // Handle 401: Redirect to login
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      // Redirect to login page
      window.location.href = '/sign-in';
      return Promise.reject(error);
    }

    // Handle network errors or 5xx errors: Retry logic
    if (
      (error.code === 'ECONNABORTED' || 
       error.code === 'ERR_NETWORK' || 
       error.code === 'ECONNRESET' ||
       (error.response?.status ?? 0) >= 500) &&
      originalRequest &&
      !originalRequest._retry
    ) {
      originalRequest._retry = (originalRequest._retry || 0) + 1;

      // Retry up to 3 times
      if (originalRequest._retry <= 3) {
        console.log(`Retrying request (attempt ${originalRequest._retry}/3)...`);
        
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, originalRequest._retry - 1) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
        
        return apiClient(originalRequest);
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Helper function to determine if error is due to cold start
 */
export const isColdStartError = (error: AxiosError): boolean => {
  return (
    error.code === 'ECONNABORTED' ||
    error.code === 'ERR_NETWORK' ||
    error.code === 'ECONNRESET' ||
    (error.response?.status === 503) ||
    (error.response?.status === 504)
  );
};

/**
 * Helper function to get error message
 */
export const getErrorMessage = (error: AxiosError): string => {
  if (isColdStartError(error)) {
    return 'API is starting up... Please wait a moment';
  }

  if (error.response?.data) {
    const data = error.response.data as { message?: string; error?: string };
    return data.message || data.error || 'An error occurred';
  }

  if (error.message) {
    return error.message;
  }

  return 'An unexpected error occurred';
};

export default apiClient;
