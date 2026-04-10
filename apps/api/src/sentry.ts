import * as Sentry from '@sentry/node';
import { RewriteFrames } from '@sentry/integrations';

// Get environment
const environment = process.env.NODE_ENV || 'development';
const isProduction = environment === 'production';
const isStaging = environment === 'staging';
const isDevelopment = environment === 'development';

// Sampling rates based on environment
const tracesSampleRate = isDevelopment ? 1.0 : isStaging ? 0.5 : 0.1;

// Initialize Sentry
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment,
  
  // Performance monitoring
  tracesSampleRate,
  
  // Integrations
  integrations: [
    new RewriteFrames({
      root: process.cwd(),
    }),
  ],
  
  // Sampling
  beforeSend(event, hint) {
    // Ignore expected errors
    if (event.exception) {
      const error = hint.originalException as any;
      
      // Ignore 404 errors (not critical)
      if (error?.statusCode === 404 || error?.status === 404) {
        return null;
      }
      
      // Ignore validation errors (expected)
      if (error?.name === 'ValidationError' || error?.name === 'BadRequestException') {
        return null;
      }
      
      // Ignore unauthorized errors (expected for protected routes)
      if (error?.statusCode === 401 || error?.status === 401) {
        return null;
      }
    }
    
    // Add custom context
    if (event.request) {
      event.tags = {
        ...event.tags,
        environment,
        nodeVersion: process.version,
      };
    }
    
    return event;
  },
  
  // Filter out unnecessary data
  ignoreErrors: [
    // Expected client errors
    'AbortError',
    'TimeoutError',
    'ECONNRESET',
    'ECONNREFUSED',
    'ETIMEDOUT',
    // Validation errors
    'ValidationError',
    'BadRequestException',
    'UnauthorizedException',
    'ForbiddenException',
  ],
  
  // Release version
  release: process.env.APP_VERSION || process.env.npm_package_version || '1.0.0',
  
  // Server name
  serverName: isProduction ? undefined : 'localhost',
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
