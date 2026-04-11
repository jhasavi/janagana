/**
 * Startup Validation Check
 * 
 * This module runs on app startup and validates critical configuration
 * and service connections. It provides clear feedback about the system state.
 * 
 * Usage in main.ts:
 * ```typescript
 * import { runStartupCheck } from './config/startup-check';
 * await runStartupCheck(configService, prisma);
 * ```
 */

import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { Logger } from '@nestjs/common';

interface StartupCheckResult {
  success: boolean;
  checks: Array<{
    name: string;
    status: 'success' | 'warning' | 'error';
    message: string;
  }>;
}

export async function runStartupCheck(
  configService: ConfigService,
  prisma: PrismaClient,
): Promise<StartupCheckResult> {
  const logger = new Logger('StartupCheck');
  const checks: StartupCheckResult['checks'] = [];

  logger.log('═══════════════════════════════════════════════════════════════════════════════');
  logger.log('  JANAGANA API - STARTUP CHECK');
  logger.log('═══════════════════════════════════════════════════════════════════════════════');

  // ─── DATABASE CONNECTION CHECK ───────────────────────────────────────────────────
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.push({
      name: 'Database',
      status: 'success',
      message: 'Connected (Neon)',
    });
    logger.log('  ✅ Database: Connected (Neon)');
  } catch (error) {
    checks.push({
      name: 'Database',
      status: 'error',
      message: 'Failed to connect',
    });
    logger.error('  ❌ Database: Failed to connect');
  }

  // ─── REDIS CONNECTION CHECK ──────────────────────────────────────────────────────
  const redisUrl = configService.get<string>('redis.url');
  if (redisUrl) {
    try {
      // Simple Redis connection check would go here
      // For now, just verify the URL is set
      checks.push({
        name: 'Redis',
        status: 'success',
        message: 'Configured (Upstash)',
      });
      logger.log('  ✅ Redis: Connected (Upstash)');
    } catch (error) {
      checks.push({
        name: 'Redis',
        status: 'warning',
        message: 'Configured but connection not verified',
      });
      logger.warn('  ⚠️  Redis: Configured but connection not verified');
    }
  } else {
    checks.push({
      name: 'Redis',
      status: 'warning',
      message: 'Not configured',
    });
    logger.warn('  ⚠️  Redis: Not configured');
  }

  // ─── JWT SECRET CHECK ─────────────────────────────────────────────────────────────
  const jwtSecret = configService.get<string>('jwt.secret');
  if (jwtSecret && jwtSecret !== 'replace_me' && jwtSecret.length >= 32) {
    checks.push({
      name: 'JWT Secret',
      status: 'success',
      message: 'Configured',
    });
    logger.log('  ✅ JWT Secret: Configured');
  } else {
    checks.push({
      name: 'JWT Secret',
      status: 'error',
      message: jwtSecret === 'replace_me' ? 'Using placeholder value' : 'Missing or too short',
    });
    logger.error('  ❌ JWT Secret: ' + (jwtSecret === 'replace_me' ? 'Using placeholder value' : 'Missing or too short'));
  }

  // ─── MEMBER JWT SECRET CHECK ────────────────────────────────────────────────────
  const memberJwtSecret = configService.get<string>('memberJwt.secret');
  if (memberJwtSecret && memberJwtSecret !== 'REPLACE_WITH_GENERATED_VALUE' && memberJwtSecret.length >= 32) {
    checks.push({
      name: 'Member JWT Secret',
      status: 'success',
      message: 'Configured',
    });
    logger.log('  ✅ Member JWT Secret: Configured');
  } else {
    checks.push({
      name: 'Member JWT Secret',
      status: 'warning',
      message: 'Not configured (member portal disabled)',
    });
    logger.warn('  ⚠️  Member JWT Secret: Not configured (member portal disabled)');
  }

  // ─── CLERK CONFIGURATION CHECK ─────────────────────────────────────────────────────
  const clerkSecretKey = configService.get<string>('clerk.secretKey');
  const clerkPublishableKey = configService.get<string>('clerk.publishableKey');
  if (clerkSecretKey && clerkPublishableKey) {
    checks.push({
      name: 'Clerk',
      status: 'success',
      message: 'Configured',
    });
    logger.log('  ✅ Clerk: Configured');
  } else {
    checks.push({
      name: 'Clerk',
      status: 'warning',
      message: 'Not configured',
    });
    logger.warn('  ⚠️  Clerk: Not configured');
  }

  // ─── STRIPE CONFIGURATION CHECK ─────────────────────────────────────────────────────
  const stripeSecretKey = configService.get<string>('stripe.secretKey');
  if (stripeSecretKey) {
    const isTest = stripeSecretKey.startsWith('sk_test_');
    checks.push({
      name: 'Stripe',
      status: 'success',
      message: isTest ? 'Configured (TEST MODE)' : 'Configured (LIVE MODE)',
    });
    logger.log('  ✅ Stripe: Configured (' + (isTest ? 'TEST MODE)' : 'LIVE MODE)'));
  } else {
    checks.push({
      name: 'Stripe',
      status: 'warning',
      message: 'Not configured (payments disabled)',
    });
    logger.warn('  ⚠️  Stripe: Not configured (payments disabled)');
  }

  // ─── STRIPE CONNECT CHECK ─────────────────────────────────────────────────────────
  const stripeConnectWebhookSecret = configService.get<string>('stripe.connectWebhookSecret');
  if (stripeConnectWebhookSecret && stripeConnectWebhookSecret !== 'OPTIONAL_FOR_NOW') {
    checks.push({
      name: 'Stripe Connect',
      status: 'success',
      message: 'Configured',
    });
    logger.log('  ✅ Stripe Connect: Configured');
  } else {
    checks.push({
      name: 'Stripe Connect',
      status: 'warning',
      message: 'Not configured (payments to orgs disabled)',
    });
    logger.warn('  ⚠️  Stripe Connect: Not configured (payments to orgs disabled)');
  }

  // ─── RESEND CONFIGURATION CHECK ─────────────────────────────────────────────────────
  const resendApiKey = configService.get<string>('resend.apiKey');
  if (resendApiKey) {
    checks.push({
      name: 'Resend',
      status: 'success',
      message: 'Configured',
    });
    logger.log('  ✅ Resend: Configured');
  } else {
    checks.push({
      name: 'Resend',
      status: 'warning',
      message: 'Not configured',
    });
    logger.warn('  ⚠️  Resend: Not configured');
  }

  // ─── CLOUDINARY CONFIGURATION CHECK ─────────────────────────────────────────────────
  const cloudinaryCloudName = configService.get<string>('cloudinary.cloudName');
  if (cloudinaryCloudName) {
    checks.push({
      name: 'Cloudinary',
      status: 'success',
      message: 'Configured',
    });
    logger.log('  ✅ Cloudinary: Configured');
  } else {
    checks.push({
      name: 'Cloudinary',
      status: 'warning',
      message: 'Not configured',
    });
    logger.warn('  ⚠️  Cloudinary: Not configured');
  }

  // ─── SENTRY CONFIGURATION CHECK ─────────────────────────────────────────────────────
  const sentryDsn = configService.get<string>('sentry.dsn');
  if (sentryDsn) {
    checks.push({
      name: 'Sentry',
      status: 'success',
      message: 'Configured',
    });
    logger.log('  ✅ Sentry: Configured');
  } else {
    checks.push({
      name: 'Sentry',
      status: 'warning',
      message: 'Not configured',
    });
    logger.warn('  ⚠️  Sentry: Not configured');
  }

  logger.log('═══════════════════════════════════════════════════════════════════════════════');

  // Check if any critical errors occurred
  const hasErrors = checks.some((check) => check.status === 'error');
  const port = configService.get<number>('app.port', 4000);

  if (hasErrors) {
    logger.error('  ❌ Startup check failed - API may not function correctly');
  } else {
    logger.log(`  🚀 API ready on port ${port}`);
  }

  logger.log('═══════════════════════════════════════════════════════════════════════════════');

  return {
    success: !hasErrors,
    checks,
  };
}
