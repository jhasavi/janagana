'use client';

import { useEffect, useState } from 'react';

/**
 * ApiLoadingState Component
 * 
 * Shows a friendly loading state when the API is cold-starting.
 * This is necessary because Render free tier cold start takes 30-60 seconds.
 * 
 * Features:
 * - Friendly message: "Starting up... (first request may take 30 seconds)"
 * - Animated progress bar
 * - Does NOT look like an error
 * - Disappears once API responds
 * - Shows automatically when API request takes > 5 seconds
 */

interface ApiLoadingStateProps {
  isLoading: boolean;
  message?: string;
}

export default function ApiLoadingState({ isLoading, message }: ApiLoadingStateProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      setProgress(0);
      return;
    }

    // Animate progress bar
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 100;
        return prev + 2;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isLoading]);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
        <div className="text-center">
          {/* Animated icon */}
          <div className="mb-4">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
          </div>

          {/* Message */}
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {message || 'Starting up...'}
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            First request may take up to 30 seconds
          </p>

          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(progress, 100)}%` }}
            ></div>
          </div>

          {/* Helpful tips */}
          <div className="mt-4 text-xs text-gray-500 text-left">
            <p className="font-semibold mb-1">Why is this happening?</p>
            <ul className="list-disc list-inside space-y-1">
              <li>API is warming up on Render free tier</li>
              <li>This only happens after periods of inactivity</li>
              <li>Subsequent requests will be instant</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to track API loading state
 * Shows loading state when request takes > 5 seconds
 */
export function useApiLoading() {
  const [isLoading, setIsLoading] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [showLoading, setShowLoading] = useState(false);

  const startLoading = () => {
    setStartTime(Date.now());
    setIsLoading(true);
  };

  const stopLoading = () => {
    setIsLoading(false);
    setStartTime(null);
    setShowLoading(false);
  };

  useEffect(() => {
    if (!startTime || !isLoading) return;

    const timeout = setTimeout(() => {
      // Show loading state after 5 seconds
      if (isLoading) {
        setShowLoading(true);
      }
    }, 5000);

    return () => clearTimeout(timeout);
  }, [startTime, isLoading]);

  return {
    isLoading: showLoading,
    startLoading,
    stopLoading,
  };
}
