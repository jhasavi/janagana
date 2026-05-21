-- CreateEnum
CREATE TYPE "SupportRequestAuthorType" AS ENUM ('ADMIN', 'MEMBER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "EventCancellationStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'REFUNDED');

-- CreateTable
CREATE TABLE "SupportRequestComment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "supportRequestId" TEXT NOT NULL,
    "authorType" "SupportRequestAuthorType" NOT NULL DEFAULT 'MEMBER',
    "authorName" TEXT,
    "body" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportRequestComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventCancellationRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "stripePaymentId" TEXT,
    "reason" TEXT,
    "status" "EventCancellationStatus" NOT NULL DEFAULT 'REQUESTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventCancellationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupportRequestComment_tenantId_idx" ON "SupportRequestComment"("tenantId");

-- CreateIndex
CREATE INDEX "SupportRequestComment_supportRequestId_idx" ON "SupportRequestComment"("supportRequestId");

-- CreateIndex
CREATE INDEX "SupportRequestComment_authorType_idx" ON "SupportRequestComment"("authorType");

-- CreateIndex
CREATE INDEX "EventCancellationRequest_tenantId_idx" ON "EventCancellationRequest"("tenantId");

-- CreateIndex
CREATE INDEX "EventCancellationRequest_registrationId_idx" ON "EventCancellationRequest"("registrationId");

-- CreateIndex
CREATE INDEX "EventCancellationRequest_eventId_idx" ON "EventCancellationRequest"("eventId");

-- CreateIndex
CREATE INDEX "EventCancellationRequest_memberId_idx" ON "EventCancellationRequest"("memberId");

-- CreateIndex
CREATE INDEX "EventCancellationRequest_status_idx" ON "EventCancellationRequest"("status");

-- AddForeignKey
ALTER TABLE "SupportRequestComment" ADD CONSTRAINT "SupportRequestComment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportRequestComment" ADD CONSTRAINT "SupportRequestComment_supportRequestId_fkey" FOREIGN KEY ("supportRequestId") REFERENCES "SupportRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventCancellationRequest" ADD CONSTRAINT "EventCancellationRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventCancellationRequest" ADD CONSTRAINT "EventCancellationRequest_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "EventRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventCancellationRequest" ADD CONSTRAINT "EventCancellationRequest_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventCancellationRequest" ADD CONSTRAINT "EventCancellationRequest_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
