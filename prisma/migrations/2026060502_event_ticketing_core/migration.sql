-- Phase 2 event ticketing core: ticket types, quantity-aware registrations, check-in, and event payment ledger links.

ALTER TYPE "RegistrationStatus" ADD VALUE IF NOT EXISTS 'PENDING_PAYMENT';

CREATE TABLE "EventTicketType" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "priceCents" INTEGER NOT NULL DEFAULT 0,
  "memberPriceCents" INTEGER,
  "capacity" INTEGER,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "EventTicketType_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "EventRegistration"
  ADD COLUMN "ticketTypeId" TEXT,
  ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "amountCents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "checkedInAt" TIMESTAMP(3);

ALTER TABLE "PaymentRecord"
  ADD COLUMN "eventId" TEXT,
  ADD COLUMN "registrationId" TEXT;

CREATE INDEX "EventTicketType_tenantId_idx" ON "EventTicketType"("tenantId");
CREATE INDEX "EventTicketType_eventId_idx" ON "EventTicketType"("eventId");
CREATE INDEX "EventRegistration_ticketTypeId_idx" ON "EventRegistration"("ticketTypeId");
CREATE INDEX "PaymentRecord_eventId_idx" ON "PaymentRecord"("eventId");
CREATE INDEX "PaymentRecord_registrationId_idx" ON "PaymentRecord"("registrationId");

ALTER TABLE "EventTicketType"
  ADD CONSTRAINT "EventTicketType_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EventTicketType"
  ADD CONSTRAINT "EventTicketType_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EventRegistration"
  ADD CONSTRAINT "EventRegistration_ticketTypeId_fkey"
  FOREIGN KEY ("ticketTypeId") REFERENCES "EventTicketType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PaymentRecord"
  ADD CONSTRAINT "PaymentRecord_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PaymentRecord"
  ADD CONSTRAINT "PaymentRecord_registrationId_fkey"
  FOREIGN KEY ("registrationId") REFERENCES "EventRegistration"("id") ON DELETE SET NULL ON UPDATE CASCADE;
