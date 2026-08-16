-- Replace the unused Stripe customer reference with KOMOJU subscription state.
ALTER TABLE "User" DROP COLUMN IF EXISTS "stripeCustomerId";
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "komojuCustomerId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "komojuSubscriptionId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "komojuCheckoutSessionId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "premiumStatus" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "premiumUntil" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "premiumCancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS "User_komojuCustomerId_key" ON "User"("komojuCustomerId");
CREATE UNIQUE INDEX IF NOT EXISTS "User_komojuSubscriptionId_key" ON "User"("komojuSubscriptionId");
CREATE UNIQUE INDEX IF NOT EXISTS "User_komojuCheckoutSessionId_key" ON "User"("komojuCheckoutSessionId");

CREATE TABLE IF NOT EXISTS "BillingEvent" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BillingEvent_pkey" PRIMARY KEY ("id")
);
