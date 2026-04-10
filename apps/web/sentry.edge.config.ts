import * as Sentry from '@sentry/nextjs';

// Get environment
const environment = process.env.NODE_ENV || 'development';
const isProduction = environment === 'production';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment,
  
  // Edge runtime has limited performance monitoring
  tracesSampleRate: 0, // Disable tracing for edge runtime
  
  // Before send
  beforeSend(event, hint) {
    // Ignore expected errors in edge runtime
    if (event.exception) {
      const error = hint.originalException as any;
      
      // Ignore 404 errors
      if (error?.statusCode === 404 || error?.status === 404) {
        return null;
      }
    }
    
    return event;
  },
  
  // Filter out unnecessary data
  ignoreErrors: [
    'AbortError',
    'NetworkError',
  ],
  
  // Release version
  release: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
  
  // Initial scope
  initialScope: {
    tags: {
      environment,
      runtime: 'edge',
    },
  },
});

export { Sentry };
