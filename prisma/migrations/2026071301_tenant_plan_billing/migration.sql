-- CreateEnum
CREATE TYPE "TenantPlan" AS ENUM ('FREE', 'PRO');

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "plan" "TenantPlan" NOT NULL DEFAULT 'FREE',
ADD COLUMN     "planRenewsAt" TIMESTAMP(3),
ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "stripeSubscriptionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_stripeCustomerId_key" ON "Tenant"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_stripeSubscriptionId_key" ON "Tenant"("stripeSubscriptionId");

-- Grandfather existing tenants onto Pro so nothing they're already using/demoing
-- (households, member directory, custom fields, wallet passes) gets locked out.
-- New tenants created after this migration default to FREE via the column default above.
UPDATE "Tenant" SET "plan" = 'PRO';
