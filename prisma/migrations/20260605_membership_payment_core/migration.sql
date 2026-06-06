-- Phase 1 membership core: renewal metadata and tenant-scoped payment ledger.

ALTER TYPE "MembershipStatus" ADD VALUE IF NOT EXISTS 'PENDING';

CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'WAIVED');
CREATE TYPE "PaymentMethod" AS ENUM ('OFFLINE', 'CASH', 'CHECK', 'CARD', 'BANK_TRANSFER', 'STRIPE', 'OTHER');
CREATE TYPE "PaymentPurpose" AS ENUM ('MEMBERSHIP', 'EVENT', 'DONATION', 'OTHER');

ALTER TABLE "MembershipTier"
  ADD COLUMN "description" TEXT;

ALTER TABLE "Membership"
  ADD COLUMN "autoRenew" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "source" TEXT NOT NULL DEFAULT 'admin',
  ADD COLUMN "notes" TEXT;

CREATE TABLE "PaymentRecord" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "contactId" TEXT,
  "membershipId" TEXT,
  "amountCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "status" "PaymentStatus" NOT NULL DEFAULT 'PAID',
  "method" "PaymentMethod" NOT NULL DEFAULT 'OFFLINE',
  "purpose" "PaymentPurpose" NOT NULL DEFAULT 'MEMBERSHIP',
  "provider" TEXT,
  "providerRef" TEXT,
  "paidAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PaymentRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentReceipt" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "contactId" TEXT,
  "membershipId" TEXT,
  "receiptNumber" TEXT NOT NULL,
  "recipientEmail" TEXT NOT NULL,
  "recipientName" TEXT,
  "amountCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "description" TEXT NOT NULL,
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PaymentReceipt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StripeWebhookEvent" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT,
  "stripeEventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB,

  CONSTRAINT "StripeWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Membership_tenantId_status_idx" ON "Membership"("tenantId", "status");
CREATE INDEX "Membership_tenantId_expiresAt_idx" ON "Membership"("tenantId", "expiresAt");
CREATE INDEX "PaymentRecord_tenantId_idx" ON "PaymentRecord"("tenantId");
CREATE INDEX "PaymentRecord_tenantId_purpose_idx" ON "PaymentRecord"("tenantId", "purpose");
CREATE INDEX "PaymentRecord_tenantId_status_idx" ON "PaymentRecord"("tenantId", "status");
CREATE INDEX "PaymentRecord_contactId_idx" ON "PaymentRecord"("contactId");
CREATE INDEX "PaymentRecord_membershipId_idx" ON "PaymentRecord"("membershipId");
CREATE INDEX "PaymentRecord_paidAt_idx" ON "PaymentRecord"("paidAt");
CREATE UNIQUE INDEX "PaymentRecord_provider_providerRef_key" ON "PaymentRecord"("provider", "providerRef");
CREATE UNIQUE INDEX "PaymentReceipt_paymentId_key" ON "PaymentReceipt"("paymentId");
CREATE UNIQUE INDEX "PaymentReceipt_receiptNumber_key" ON "PaymentReceipt"("receiptNumber");
CREATE INDEX "PaymentReceipt_tenantId_idx" ON "PaymentReceipt"("tenantId");
CREATE INDEX "PaymentReceipt_contactId_idx" ON "PaymentReceipt"("contactId");
CREATE INDEX "PaymentReceipt_membershipId_idx" ON "PaymentReceipt"("membershipId");
CREATE INDEX "PaymentReceipt_issuedAt_idx" ON "PaymentReceipt"("issuedAt");
CREATE UNIQUE INDEX "StripeWebhookEvent_stripeEventId_key" ON "StripeWebhookEvent"("stripeEventId");
CREATE INDEX "StripeWebhookEvent_tenantId_idx" ON "StripeWebhookEvent"("tenantId");
CREATE INDEX "StripeWebhookEvent_processedAt_idx" ON "StripeWebhookEvent"("processedAt");

ALTER TABLE "PaymentRecord"
  ADD CONSTRAINT "PaymentRecord_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PaymentRecord"
  ADD CONSTRAINT "PaymentRecord_contactId_fkey"
  FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PaymentRecord"
  ADD CONSTRAINT "PaymentRecord_membershipId_fkey"
  FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PaymentReceipt"
  ADD CONSTRAINT "PaymentReceipt_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PaymentReceipt"
  ADD CONSTRAINT "PaymentReceipt_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "PaymentRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PaymentReceipt"
  ADD CONSTRAINT "PaymentReceipt_contactId_fkey"
  FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PaymentReceipt"
  ADD CONSTRAINT "PaymentReceipt_membershipId_fkey"
  FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StripeWebhookEvent"
  ADD CONSTRAINT "StripeWebhookEvent_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
