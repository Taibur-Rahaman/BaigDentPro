-- Access control: accountStatus, clinic plan tier / demo, per-clinic feature flag rows

ALTER TABLE "Clinic" ADD COLUMN IF NOT EXISTS "planTier" TEXT NOT NULL DEFAULT 'STARTER';
ALTER TABLE "Clinic" ADD COLUMN IF NOT EXISTS "isDemo" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "accountStatus" TEXT NOT NULL DEFAULT 'PENDING';

UPDATE "User" SET "accountStatus" = 'ACTIVE' WHERE "isApproved" = true OR role = 'SUPER_ADMIN';

CREATE TABLE IF NOT EXISTS "clinic_feature_flags" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinic_feature_flags_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "clinic_feature_flags_clinicId_featureKey_key" ON "clinic_feature_flags"("clinicId", "featureKey");
CREATE INDEX IF NOT EXISTS "clinic_feature_flags_clinicId_idx" ON "clinic_feature_flags"("clinicId");

ALTER TABLE "clinic_feature_flags" DROP CONSTRAINT IF EXISTS "clinic_feature_flags_clinicId_fkey";
ALTER TABLE "clinic_feature_flags" ADD CONSTRAINT "clinic_feature_flags_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
