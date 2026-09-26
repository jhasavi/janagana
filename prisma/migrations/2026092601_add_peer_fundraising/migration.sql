-- Peer-to-peer fundraising: Campaign + PeerFundraiser, plus attribution FKs on PaymentRecord.

CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

CREATE TABLE "Campaign" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "goalCents" INTEGER,
  "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PeerFundraiser" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "ownerContactId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT,
  "story" TEXT,
  "goalCents" INTEGER,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PeerFundraiser_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "PaymentRecord"
  ADD COLUMN "campaignId" TEXT,
  ADD COLUMN "peerFundraiserId" TEXT;

CREATE UNIQUE INDEX "Campaign_tenantId_slug_key" ON "Campaign"("tenantId", "slug");
CREATE INDEX "Campaign_tenantId_idx" ON "Campaign"("tenantId");
CREATE INDEX "Campaign_tenantId_status_idx" ON "Campaign"("tenantId", "status");

CREATE UNIQUE INDEX "PeerFundraiser_tenantId_slug_key" ON "PeerFundraiser"("tenantId", "slug");
CREATE INDEX "PeerFundraiser_tenantId_idx" ON "PeerFundraiser"("tenantId");
CREATE INDEX "PeerFundraiser_campaignId_idx" ON "PeerFundraiser"("campaignId");
CREATE INDEX "PeerFundraiser_ownerContactId_idx" ON "PeerFundraiser"("ownerContactId");

CREATE INDEX "PaymentRecord_campaignId_idx" ON "PaymentRecord"("campaignId");
CREATE INDEX "PaymentRecord_peerFundraiserId_idx" ON "PaymentRecord"("peerFundraiserId");

ALTER TABLE "Campaign"
  ADD CONSTRAINT "Campaign_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PeerFundraiser"
  ADD CONSTRAINT "PeerFundraiser_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "PeerFundraiser_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "PeerFundraiser_ownerContactId_fkey" FOREIGN KEY ("ownerContactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PaymentRecord"
  ADD CONSTRAINT "PaymentRecord_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "PaymentRecord_peerFundraiserId_fkey" FOREIGN KEY ("peerFundraiserId") REFERENCES "PeerFundraiser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
