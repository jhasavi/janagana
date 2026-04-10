/**
 * Application Configuration
 * 
 * This file defines the configuration schema for the NestJS application.
 * It uses @nestjs/config to load environment variables and provides type-safe
 * access to configuration values throughout the application.
 * 
 * Usage:
 * ```typescript
 * import { ConfigService } from '@nestjs/config';
 * 
 * constructor(private config: ConfigService) {}
 * 
 * const dbUrl = this.config.get('database.url');
 * const stripeKey = this.config.get('stripe.secretKey');
 * ```
 */

export default () => ({
  // ─── APPLICATION CONFIGURATION ─────────────────────────────────────────────────
  app: {
    // Port the API server will listen on
    port: parseInt(process.env.PORT || '4000', 10),
    
    // Node environment (development, production, test)
    nodeEnv: process.env.NODE_ENV || 'development',
    
    // Public URL of this API instance
    url: process.env.APP_URL || 'http://localhost:4000',
    
    // Comma-separated list of allowed CORS origins
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:3001',
    ],
  },

  // ─── DATABASE CONFIGURATION ─────────────────────────────────────────────────────
  database: {
    // PostgreSQL database connection string
    url: process.env.DATABASE_URL,
  },

  // ─── REDIS CONFIGURATION ─────────────────────────────────────────────────────────
  redis: {
    // Redis connection string for caching and sessions
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  // ─── JWT AUTHENTICATION CONFIGURATION ───────────────────────────────────────────
  jwt: {
    // Secret key for signing JWT tokens
    secret: process.env.JWT_SECRET,
    
    // JWT token expiration time
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  // ─── CLERK AUTHENTICATION CONFIGURATION ───────────────────────────────────────────
  clerk: {
    // Clerk Secret Key (server-side)
    secretKey: process.env.CLERK_SECRET_KEY,
    
    // Clerk Publishable Key (also needed for JWT verification)
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
    
    // Clerk Webhook Secret (for verifying webhook signatures)
    webhookSecret: process.env.CLERK_WEBHOOK_SECRET,
  },

  // ─── STRIPE PAYMENTS CONFIGURATION ──────────────────────────────────────────────
  stripe: {
    // Stripe Secret Key (server-side)
    secretKey: process.env.STRIPE_SECRET_KEY,
    
    // Stripe Publishable Key (client-side)
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    
    // Stripe Webhook Secret (for payment events)
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    
    // Stripe Connect Webhook Secret (for Connect account events)
    connectWebhookSecret: process.env.STRIPE_CONNECT_WEBHOOK_SECRET,
    
    // Platform fee percentage (for Stripe Connect)
    platformFeePercentage: parseFloat(process.env.PLATFORM_FEE_PERCENTAGE || '2'),
  },

  // ─── RESEND EMAIL CONFIGURATION ────────────────────────────────────────────────
  resend: {
    // Resend API Key
    apiKey: process.env.RESEND_API_KEY,
    
    // Default sender email address
    from: process.env.EMAIL_FROM || 'noreply@orgflow.app',
    
    // Default sender name
    fromName: process.env.EMAIL_FROM_NAME || 'OrgFlow',
  },

  // ─── CLOUDINARY MEDIA CONFIGURATION ───────────────────────────────────────────────
  cloudinary: {
    // Cloudinary Cloud Name
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    
    // Cloudinary API Key
    apiKey: process.env.CLOUDINARY_API_KEY,
    
    // Cloudinary API Secret
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },

  // ─── SENTRY ERROR TRACKING CONFIGURATION ───────────────────────────────────────────
  sentry: {
    // Sentry DSN (Data Source Name)
    dsn: process.env.SENTRY_DSN,
  },

  // ─── RATE LIMITING CONFIGURATION ─────────────────────────────────────────────────
  rateLimit: {
    // Time to live for rate limit window (in seconds)
    ttl: parseInt(process.env.THROTTLE_TTL || '60', 10),
    
    // Maximum requests per time window
    limit: parseInt(process.env.THROTTLE_LIMIT || '100', 10),
  },
});
