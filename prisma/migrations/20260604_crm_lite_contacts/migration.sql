-- CRM-lite contact fields for the NB/TPW pilot.
-- These fields keep operational provenance on Contact without introducing a full CRM.

ALTER TABLE "Contact"
  ADD COLUMN "source" TEXT,
  ADD COLUMN "interestType" TEXT,
  ADD COLUMN "lastActivityAt" TIMESTAMP(3),
  ADD COLUMN "lastActivitySummary" TEXT,
  ADD COLUMN "notes" TEXT,
  ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "externalSource" TEXT,
  ADD COLUMN "externalId" TEXT,
  ADD COLUMN "importedAt" TIMESTAMP(3),
  ADD COLUMN "originalMetadata" JSONB;

CREATE INDEX "Contact_tenantId_source_idx" ON "Contact"("tenantId", "source");
CREATE INDEX "Contact_tenantId_interestType_idx" ON "Contact"("tenantId", "interestType");
CREATE INDEX "Contact_tenantId_lastActivityAt_idx" ON "Contact"("tenantId", "lastActivityAt");
