import { registerAs } from '@nestjs/config';

export const stripeConfig = registerAs('stripe', () => ({
  secretKey: process.env.STRIPE_SECRET_KEY ?? '',
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY ?? '',
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
  connectWebhookSecret: process.env.STRIPE_CONNECT_WEBHOOK_SECRET ?? '',
  currency: process.env.STRIPE_CURRENCY ?? 'usd',
  trialDays: parseInt(process.env.STRIPE_TRIAL_DAYS ?? '14', 10),
  platformFeePercentage: parseInt(process.env.PLATFORM_FEE_PERCENTAGE ?? '2', 10),
}));

export type StripeConfig = ReturnType<typeof stripeConfig>;
