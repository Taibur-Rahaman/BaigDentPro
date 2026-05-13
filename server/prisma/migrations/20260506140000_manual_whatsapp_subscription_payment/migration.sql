-- Manual WhatsApp subscription settlement — add requester + plan label + lifecycle timestamps.

ALTER TABLE "subscription_payments" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "subscription_payments" ADD COLUMN IF NOT EXISTS "planName" TEXT;
ALTER TABLE "subscription_payments" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3);

UPDATE "subscription_payments" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;

ALTER TABLE "subscription_payments" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "subscription_payments" ALTER COLUMN "updatedAt" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscription_payments_userId_fkey'
  ) THEN
    ALTER TABLE "subscription_payments"
      ADD CONSTRAINT "subscription_payments_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "subscription_payments_status_idx" ON "subscription_payments"("status");
CREATE INDEX IF NOT EXISTS "subscription_payments_userId_idx" ON "subscription_payments"("userId");
