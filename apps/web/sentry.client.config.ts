import * as Sentry from '@sentry/nextjs';
import { BrowserTracing } from '@sentry/tracing';
import { Replay } from '@sentry/replay';

// Get environment
const environment = process.env.NODE_ENV || 'development';
const isProduction = environment === 'production';
const isStaging = environment === 'staging';
const isDevelopment = environment === 'development';

// Sampling rates based on environment
const tracesSampleRate = isDevelopment ? 1.0 : isStaging ? 0.5 : 0.1;
const replaySessionSampleRate = isProduction ? 0.1 : 1.0;
const replayOnErrorSampleRate = 1.0;

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment,
  
  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate,
  
  // Set sampling rate for replay
  replaysSessionSampleRate,
  replaysOnErrorSampleRate,
  
  // Integrations
  integrations: [
    new BrowserTracing({
      tracingOrigins: ['localhost', 'orgflow.app', /^\//],
      routingInstrumentation: Sentry.reactRouterV6Instrumentation,
    }),
    new Replay({
      maskAllText: true,
      blockAllMedia: true,
      maskAllInputs: true,
      maskAllOptions: true,
    }),
  ],
  
  // Before send
  beforeSend(event, hint) {
    // Ignore expected errors
    if (event.exception) {
      const error = hint.originalException as any;
      
      // Ignore 404 errors
      if (error?.statusCode === 404 || error?.status === 404) {
        return null;
      }
      
      // Ignore client abort errors
      if (error?.name === 'AbortError') {
        return null;
      }
    }
    
    // Add user context from Clerk if available
    // This will be populated by the auth middleware
    
    return event;
  },
  
  // Filter out unnecessary data
  ignoreErrors: [
    // Expected client errors
    'AbortError',
    'NetworkError',
    'ChunkLoadError',
  ],
  
  // Release version
  release: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
  
  // Attach stack traces
  stackTrace: {
    frameLines: {
      func: 5,
      context: 5,
    },
  },
  
  // Attach user from Clerk
  // This will be set by the auth middleware
  initialScope: {
    tags: {
      environment,
      client: 'browser',
    },
  },
  
  // Performance monitoring
  beforeSendTransaction(event) {
    // Filter out health check transactions
    if (event.transaction?.includes('/health')) {
      return null;
    }
    
    return event;
  },
});

// Helper to set user context
export function setUserContext(userId: string, tenantId: string, email?: string) {
  Sentry.setUser({
    id: userId,
    tenantId,
    email,
  });
}

// Helper to set tenant context
export function setTenantContext(tenantId: string) {
  Sentry.setTag('tenantId', tenantId);
  Sentry.setContext('tenant', { tenantId });
}

// Helper to clear context
export function clearContext() {
  Sentry.setUser(null);
  Sentry.setTag('tenantId', undefined);
}

// Helper to capture exception with context
export function captureException(error: unknown, context?: Record<string, any>) {
  Sentry.withScope((scope) => {
    if (context) {
      scope.setContext('custom', context);
    }
    Sentry.captureException(error);
  });
}

// Helper to capture message
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info', context?: Record<string, any>) {
  Sentry.withScope((scope) => {
    if (context) {
      scope.setContext('custom', context);
    }
    Sentry.captureMessage(message, { level });
  });
}

export { Sentry };
