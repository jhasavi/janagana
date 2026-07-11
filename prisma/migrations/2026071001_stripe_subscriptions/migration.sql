-- Stripe subscription ids for membership auto-renew and recurring donations
ALTER TABLE "Membership" ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Membership_stripeSubscriptionId_key" ON "Membership"("stripeSubscriptionId");

ALTER TABLE "PaymentRecord" ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" TEXT;
CREATE INDEX IF NOT EXISTS "PaymentRecord_stripeSubscriptionId_idx" ON "PaymentRecord"("stripeSubscriptionId");
