-- AlterEnum
ALTER TYPE "CommunicationPurpose" ADD VALUE 'HOUSEHOLD_INVITE';

-- CreateEnum
CREATE TYPE "HouseholdInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CANCELED');

-- CreateTable
CREATE TABLE "HouseholdInvite" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "invitedByContactId" TEXT NOT NULL,
    "inviteeEmail" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "status" "HouseholdInviteStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),
    "acceptedContactId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HouseholdInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HouseholdInvite_tokenHash_key" ON "HouseholdInvite"("tokenHash");

-- CreateIndex
CREATE INDEX "HouseholdInvite_tenantId_idx" ON "HouseholdInvite"("tenantId");

-- CreateIndex
CREATE INDEX "HouseholdInvite_householdId_idx" ON "HouseholdInvite"("householdId");

-- CreateIndex
CREATE INDEX "HouseholdInvite_tenantId_inviteeEmail_idx" ON "HouseholdInvite"("tenantId", "inviteeEmail");

-- AddForeignKey
ALTER TABLE "HouseholdInvite" ADD CONSTRAINT "HouseholdInvite_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HouseholdInvite" ADD CONSTRAINT "HouseholdInvite_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HouseholdInvite" ADD CONSTRAINT "HouseholdInvite_invitedByContactId_fkey" FOREIGN KEY ("invitedByContactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
