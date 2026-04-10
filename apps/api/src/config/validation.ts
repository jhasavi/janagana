/**
 * Environment Variable Validation Schema
 * 
 * This file defines Joi validation schemas for all environment variables.
 * The application will fail to start if any required environment variable
 * is missing or invalid.
 * 
 * Usage:
 * This schema is used in app.module.ts with @nestjs/config's validation option:
 * 
 * ```typescript
 * ConfigModule.forRoot({
 *   isGlobal: true,
 *   load: [configuration],
 *   validationSchema: validationSchema,
 *   validationOptions: {
 *     allowUnknown: true,
 *     abortEarly: true,
 *   },
 * })
 * ```
 */

import * as Joi from 'joi';

export const validationSchema = Joi.object({
  // ─── APPLICATION CONFIGURATION ─────────────────────────────────────────────────
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development')
    .description('Node environment (development, production, test)'),

  PORT: Joi.number()
    .port()
    .default(4000)
    .description('Port the API server will listen on'),

  APP_URL: Joi.string()
    .uri()
    .required()
    .description('Public URL of this API instance'),

  CORS_ORIGINS: Joi.string()
    .default('http://localhost:3000,http://localhost:3001')
    .description('Comma-separated list of allowed CORS origins'),

  // ─── DATABASE CONFIGURATION ─────────────────────────────────────────────────────
  DATABASE_URL: Joi.string()
    .uri()
    .required()
    .description('PostgreSQL database connection string'),

  // ─── REDIS CONFIGURATION ─────────────────────────────────────────────────────────
  REDIS_URL: Joi.string()
    .uri()
    .required()
    .description('Redis connection string for caching and sessions'),

  // ─── JWT AUTHENTICATION CONFIGURATION ───────────────────────────────────────────
  JWT_SECRET: Joi.string()
    .required()
    .min(32)
    .description('Secret key for signing JWT tokens (min 32 characters)'),

  JWT_EXPIRES_IN: Joi.string()
    .default('7d')
    .description('JWT token expiration time (e.g., "7d", "24h", "60m")'),

  // ─── CLERK AUTHENTICATION CONFIGURATION ───────────────────────────────────────────
  CLERK_SECRET_KEY: Joi.string()
    .required()
    .pattern(/^sk_(test|live)_[a-zA-Z0-9]+$/)
    .description('Clerk Secret Key (format: sk_test_... or sk_live_...)'),

  CLERK_PUBLISHABLE_KEY: Joi.string()
    .required()
    .pattern(/^pk_(test|live)_[a-zA-Z0-9]+$/)
    .description('Clerk Publishable Key (format: pk_test_... or pk_live_...)'),

  CLERK_WEBHOOK_SECRET: Joi.string()
    .pattern(/^whsec_[a-zA-Z0-9]+$/)
    .description('Clerk Webhook Secret (format: whsec_...)'),

  // ─── STRIPE PAYMENTS CONFIGURATION ──────────────────────────────────────────────
  STRIPE_SECRET_KEY: Joi.string()
    .required()
    .pattern(/^sk_(test|live)_[a-zA-Z0-9]+$/)
    .description('Stripe Secret Key (format: sk_test_... or sk_live_...)'),

  STRIPE_PUBLISHABLE_KEY: Joi.string()
    .required()
    .pattern(/^pk_(test|live)_[a-zA-Z0-9]+$/)
    .description('Stripe Publishable Key (format: pk_test_... or pk_live_...)'),

  STRIPE_WEBHOOK_SECRET: Joi.string()
    .pattern(/^whsec_[a-zA-Z0-9]+$/)
    .description('Stripe Webhook Secret (format: whsec_...)'),

  STRIPE_CONNECT_WEBHOOK_SECRET: Joi.string()
    .pattern(/^whsec_[a-zA-Z0-9]+$/)
    .description('Stripe Connect Webhook Secret (format: whsec_...)'),

  PLATFORM_FEE_PERCENTAGE: Joi.number()
    .min(0)
    .max(100)
    .default(2)
    .description('Platform fee percentage (0-100)'),

  // ─── RESEND EMAIL CONFIGURATION ────────────────────────────────────────────────
  RESEND_API_KEY: Joi.string()
    .required()
    .pattern(/^re_[a-zA-Z0-9]+$/)
    .description('Resend API Key (format: re_...)'),

  EMAIL_FROM: Joi.string()
    .email()
    .required()
    .description('Default sender email address'),

  EMAIL_FROM_NAME: Joi.string()
    .default('OrgFlow')
    .description('Default sender name'),

  // ─── CLOUDINARY MEDIA CONFIGURATION ───────────────────────────────────────────────
  CLOUDINARY_CLOUD_NAME: Joi.string()
    .required()
    .description('Cloudinary Cloud Name'),

  CLOUDINARY_API_KEY: Joi.string()
    .required()
    .description('Cloudinary API Key'),

  CLOUDINARY_API_SECRET: Joi.string()
    .required()
    .description('Cloudinary API Secret'),

  // ─── SENTRY ERROR TRACKING CONFIGURATION ───────────────────────────────────────────
  SENTRY_DSN: Joi.string()
    .uri()
    .allow('', null)
    .description('Sentry DSN (Data Source Name)'),

  // ─── RATE LIMITING CONFIGURATION ─────────────────────────────────────────────────
  THROTTLE_TTL: Joi.number()
    .min(1)
    .default(60)
    .description('Time to live for rate limit window (in seconds)'),

  THROTTLE_LIMIT: Joi.number()
    .min(1)
    .default(100)
    .description('Maximum requests per time window'),
});
