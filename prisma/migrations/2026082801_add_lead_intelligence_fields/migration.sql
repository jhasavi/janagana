-- Lead intelligence: first-touch UTM attribution, lifecycle stage, and lead score.
-- See docs/16-LEAD-INTELLIGENCE-PLAN.md.

CREATE TYPE "LifecycleStage" AS ENUM ('NEW', 'ENGAGED', 'QUALIFIED', 'CONVERTED', 'LOST');

ALTER TABLE "Contact"
  ADD COLUMN "utmSource" TEXT,
  ADD COLUMN "utmMedium" TEXT,
  ADD COLUMN "utmCampaign" TEXT,
  ADD COLUMN "referrerUrl" TEXT,
  ADD COLUMN "lifecycleStage" "LifecycleStage" NOT NULL DEFAULT 'NEW',
  ADD COLUMN "leadScore" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "leadScoreUpdatedAt" TIMESTAMP(3);

CREATE INDEX "Contact_tenantId_lifecycleStage_idx" ON "Contact"("tenantId", "lifecycleStage");
CREATE INDEX "Contact_tenantId_leadScore_idx" ON "Contact"("tenantId", "leadScore");
