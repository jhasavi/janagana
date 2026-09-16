-- Ambassador/referral-code tracking. See docs/17-REFERRAL-PROGRAM.md.

ALTER TABLE "Contact"
  ADD COLUMN "referredByCode" TEXT;

CREATE TABLE "ReferralCode" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "label" TEXT,
  "ownerContactId" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ReferralCode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReferralRedemption" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "referralCodeId" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "converted" BOOLEAN NOT NULL DEFAULT false,
  "convertedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ReferralRedemption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReferralCode_tenantId_code_key" ON "ReferralCode"("tenantId", "code");
CREATE INDEX "ReferralCode_tenantId_idx" ON "ReferralCode"("tenantId");
CREATE INDEX "ReferralCode_ownerContactId_idx" ON "ReferralCode"("ownerContactId");

CREATE UNIQUE INDEX "ReferralRedemption_contactId_key" ON "ReferralRedemption"("contactId");
CREATE INDEX "ReferralRedemption_tenantId_referralCodeId_idx" ON "ReferralRedemption"("tenantId", "referralCodeId");
CREATE INDEX "ReferralRedemption_tenantId_idx" ON "ReferralRedemption"("tenantId");

ALTER TABLE "ReferralCode"
  ADD CONSTRAINT "ReferralCode_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "ReferralCode_ownerContactId_fkey" FOREIGN KEY ("ownerContactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ReferralRedemption"
  ADD CONSTRAINT "ReferralRedemption_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "ReferralRedemption_referralCodeId_fkey" FOREIGN KEY ("referralCodeId") REFERENCES "ReferralCode"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "ReferralRedemption_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
