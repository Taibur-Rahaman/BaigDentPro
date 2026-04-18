-- Clinic region (payment method policy): BD | INTERNATIONAL.
ALTER TABLE "Clinic" ADD COLUMN IF NOT EXISTS "region" TEXT NOT NULL DEFAULT 'BD';

-- Invoice payment lifecycle (aggregated into Invoice.paid/due only when VERIFIED).
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "paymentStatus" TEXT;
UPDATE "Payment" SET "paymentStatus" = 'VERIFIED' WHERE "paymentStatus" IS NULL OR TRIM("paymentStatus") = '';
ALTER TABLE "Payment" ALTER COLUMN "paymentStatus" SET NOT NULL;
ALTER TABLE "Payment" ALTER COLUMN "paymentStatus" SET DEFAULT 'PENDING';

ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "transactionRef" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "verifiedByUserId" TEXT;

ALTER TABLE "Payment" DROP CONSTRAINT IF EXISTS "Payment_verifiedByUserId_fkey";
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_verifiedByUserId_fkey"
  FOREIGN KEY ("verifiedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Payment_transactionRef_idx" ON "Payment"("transactionRef");
CREATE INDEX IF NOT EXISTS "Payment_paymentStatus_idx" ON "Payment"("paymentStatus");

-- Fraud alerts: automated rule engine flag (stored alongside persisted alerts).
ALTER TABLE "fraud_alerts" ADD COLUMN IF NOT EXISTS "autoFlag" BOOLEAN NOT NULL DEFAULT false;
