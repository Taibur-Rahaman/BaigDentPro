-- Tenant scope: every patient row belongs to a clinic (backfilled from owning user).
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "clinicId" TEXT;

UPDATE "Patient" AS p
SET "clinicId" = u."clinicId"
FROM "User" AS u
WHERE p."userId" = u.id AND (p."clinicId" IS NULL OR p."clinicId" = '');

UPDATE "Patient"
SET "clinicId" = (SELECT c.id FROM "Clinic" AS c ORDER BY c."createdAt" ASC LIMIT 1)
WHERE "clinicId" IS NULL;

ALTER TABLE "Patient" ALTER COLUMN "clinicId" SET NOT NULL;

ALTER TABLE "Patient" DROP CONSTRAINT IF EXISTS "Patient_clinicId_fkey";
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Patient_clinicId_idx" ON "Patient"("clinicId");

-- Subscription checkout metadata (provider-verified upgrades).
ALTER TABLE "subscription_payments" ADD COLUMN IF NOT EXISTS "planCode" TEXT;
ALTER TABLE "subscription_payments" ADD COLUMN IF NOT EXISTS "metadata" JSONB;
