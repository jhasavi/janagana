-- CreateTable
CREATE TABLE "SupportRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "name" TEXT,
    "email" TEXT,
    "message" TEXT NOT NULL,
    "context" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HelpFeedback" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "articleSlug" TEXT NOT NULL,
    "helpful" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HelpFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupportRequest_tenantId_idx" ON "SupportRequest"("tenantId");

-- CreateIndex
CREATE INDEX "SupportRequest_status_idx" ON "SupportRequest"("status");

-- CreateIndex
CREATE INDEX "SupportRequest_createdAt_idx" ON "SupportRequest"("createdAt");

-- CreateIndex
CREATE INDEX "HelpFeedback_tenantId_idx" ON "HelpFeedback"("tenantId");

-- CreateIndex
CREATE INDEX "HelpFeedback_articleSlug_idx" ON "HelpFeedback"("articleSlug");
