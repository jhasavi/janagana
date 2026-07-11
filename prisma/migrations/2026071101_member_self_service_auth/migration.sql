-- AlterEnum
ALTER TYPE "CommunicationPurpose" ADD VALUE 'MEMBER_SIGN_IN';

-- CreateTable
CREATE TABLE "ContactLoginToken" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactLoginToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContactLoginToken_tokenHash_key" ON "ContactLoginToken"("tokenHash");

-- CreateIndex
CREATE INDEX "ContactLoginToken_tenantId_contactId_idx" ON "ContactLoginToken"("tenantId", "contactId");

-- CreateIndex
CREATE UNIQUE INDEX "ContactSession_tokenHash_key" ON "ContactSession"("tokenHash");

-- CreateIndex
CREATE INDEX "ContactSession_tenantId_contactId_idx" ON "ContactSession"("tenantId", "contactId");

-- AddForeignKey
ALTER TABLE "ContactLoginToken" ADD CONSTRAINT "ContactLoginToken_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactLoginToken" ADD CONSTRAINT "ContactLoginToken_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactSession" ADD CONSTRAINT "ContactSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactSession" ADD CONSTRAINT "ContactSession_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

