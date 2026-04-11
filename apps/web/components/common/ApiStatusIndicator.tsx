'use client';

import { useApiHealth } from '@/hooks/use-api';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';

/**
 * API Connection Status Indicator
 * 
 * Shows the connection status to the Render API:
 * - Green dot: API connected
 * - Yellow dot: API connecting (cold start)
 * - Red dot: API error
 * 
 * Polls /api/v1/health/live every 30 seconds
 */
export default function ApiStatusIndicator() {
  const { data, isLoading, error, isFetching } = useApiHealth();

  // Determine status
  let status: 'connected' | 'connecting' | 'error' = 'error';
  let message = 'API Error';

  if (isLoading || isFetching) {
    status = 'connecting';
    message = 'Connecting...';
  } else if (data?.status === 'ok' || data?.status === 'healthy') {
    status = 'connected';
    message = 'API Connected';
  } else {
    status = 'error';
    message = 'API Error';
  }

  // Render based on status
  if (status === 'connected') {
    return (
      <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
        <CheckCircle2 className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">API Connected</span>
      </div>
    );
  }

  if (status === 'connecting') {
    return (
      <div className="flex items-center gap-2 text-xs text-yellow-600 dark:text-yellow-400">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span className="hidden sm:inline">Starting up...</span>
      </div>
    );
  }

  // Error state
  return (
    <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
      <XCircle className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">API Error</span>
    </div>
  );
}
