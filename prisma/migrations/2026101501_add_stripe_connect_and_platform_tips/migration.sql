-- Stripe Connect (Express) onboarding state per tenant + optional donor tips to JanaGana.
-- Additive only: new enum, nullable/defaulted columns, one unique index.

CREATE TYPE "StripeConnectStatus" AS ENUM ('NOT_STARTED', 'PENDING', 'RESTRICTED', 'ACTIVE');

ALTER TABLE "Tenant"
  ADD COLUMN "stripeConnectAccountId" TEXT,
  ADD COLUMN "stripeConnectStatus" "StripeConnectStatus" NOT NULL DEFAULT 'NOT_STARTED',
  ADD COLUMN "stripeConnectChargesEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "stripeConnectPayoutsEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "stripeConnectDetailsSubmitted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "stripeConnectSyncedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Tenant_stripeConnectAccountId_key" ON "Tenant"("stripeConnectAccountId");

ALTER TABLE "PaymentRecord"
  ADD COLUMN "platformTipCents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "applicationFeeCents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "stripeConnectAccountId" TEXT;
