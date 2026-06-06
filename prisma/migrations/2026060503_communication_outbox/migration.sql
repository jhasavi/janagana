-- Phase 4 transactional communication outbox.

CREATE TYPE "CommunicationStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED', 'SKIPPED');
CREATE TYPE "CommunicationPurpose" AS ENUM ('PAYMENT_RECEIPT', 'EVENT_CONFIRMATION', 'EVENT_REMINDER', 'RENEWAL_REMINDER', 'GENERAL');

CREATE TABLE "CommunicationMessage" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "contactId" TEXT,
  "membershipId" TEXT,
  "eventId" TEXT,
  "registrationId" TEXT,
  "receiptId" TEXT,
  "purpose" "CommunicationPurpose" NOT NULL,
  "status" "CommunicationStatus" NOT NULL DEFAULT 'QUEUED',
  "recipientEmail" TEXT NOT NULL,
  "recipientName" TEXT,
  "subject" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "scheduledFor" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "provider" TEXT,
  "providerRef" TEXT,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CommunicationMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CommunicationMessage_tenantId_idx" ON "CommunicationMessage"("tenantId");
CREATE INDEX "CommunicationMessage_contactId_idx" ON "CommunicationMessage"("contactId");
CREATE INDEX "CommunicationMessage_membershipId_idx" ON "CommunicationMessage"("membershipId");
CREATE INDEX "CommunicationMessage_eventId_idx" ON "CommunicationMessage"("eventId");
CREATE INDEX "CommunicationMessage_registrationId_idx" ON "CommunicationMessage"("registrationId");
CREATE INDEX "CommunicationMessage_receiptId_idx" ON "CommunicationMessage"("receiptId");
CREATE INDEX "CommunicationMessage_tenantId_status_idx" ON "CommunicationMessage"("tenantId", "status");
CREATE INDEX "CommunicationMessage_scheduledFor_idx" ON "CommunicationMessage"("scheduledFor");

ALTER TABLE "CommunicationMessage"
  ADD CONSTRAINT "CommunicationMessage_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommunicationMessage"
  ADD CONSTRAINT "CommunicationMessage_contactId_fkey"
  FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CommunicationMessage"
  ADD CONSTRAINT "CommunicationMessage_membershipId_fkey"
  FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CommunicationMessage"
  ADD CONSTRAINT "CommunicationMessage_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CommunicationMessage"
  ADD CONSTRAINT "CommunicationMessage_registrationId_fkey"
  FOREIGN KEY ("registrationId") REFERENCES "EventRegistration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CommunicationMessage"
  ADD CONSTRAINT "CommunicationMessage_receiptId_fkey"
  FOREIGN KEY ("receiptId") REFERENCES "PaymentReceipt"("id") ON DELETE SET NULL ON UPDATE CASCADE;
