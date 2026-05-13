-- Multi-clinic hierarchy: catalog plans, branches, device sessions, clinic owner, subscription.planId.

CREATE TABLE IF NOT EXISTS "plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "deviceLimit" INTEGER NOT NULL,
    "features" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "plans_name_key" ON "plans"("name");

CREATE TABLE IF NOT EXISTS "branches" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "branches_clinicId_idx" ON "branches"("clinicId");

ALTER TABLE "branches" DROP CONSTRAINT IF EXISTS "branches_clinicId_fkey";
ALTER TABLE "branches" ADD CONSTRAINT "branches_clinicId_fkey"
  FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "device_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "device_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "device_sessions_userId_clinicId_deviceId_key" ON "device_sessions"("userId", "clinicId", "deviceId");
CREATE INDEX IF NOT EXISTS "device_sessions_clinicId_idx" ON "device_sessions"("clinicId");

ALTER TABLE "device_sessions" DROP CONSTRAINT IF EXISTS "device_sessions_userId_fkey";
ALTER TABLE "device_sessions" ADD CONSTRAINT "device_sessions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "device_sessions" DROP CONSTRAINT IF EXISTS "device_sessions_clinicId_fkey";
ALTER TABLE "device_sessions" ADD CONSTRAINT "device_sessions_clinicId_fkey"
  FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Clinic" ADD COLUMN IF NOT EXISTS "ownerId" TEXT;

ALTER TABLE "Clinic" DROP CONSTRAINT IF EXISTS "Clinic_ownerId_fkey";
ALTER TABLE "Clinic" ADD CONSTRAINT "Clinic_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "branchId" TEXT;

ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_branchId_fkey";
ALTER TABLE "User" ADD CONSTRAINT "User_branchId_fkey"
  FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "planId" TEXT;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3);
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "endDate" TIMESTAMP(3);

ALTER TABLE "subscriptions" DROP CONSTRAINT IF EXISTS "subscriptions_planId_fkey";
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_planId_fkey"
  FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "subscriptions_planId_idx" ON "subscriptions"("planId");

UPDATE "Clinic" c
SET "ownerId" = (
  SELECT u."id" FROM "User" u
  WHERE u."clinicId" = c."id" AND u."role" = 'CLINIC_ADMIN'
  ORDER BY u."createdAt" ASC
  LIMIT 1
)
WHERE c."ownerId" IS NULL;

UPDATE "Clinic" c
SET "ownerId" = (
  SELECT u."id" FROM "User" u
  WHERE u."clinicId" = c."id"
  ORDER BY u."createdAt" ASC
  LIMIT 1
)
WHERE c."ownerId" IS NULL;

INSERT INTO "branches" ("id", "clinicId", "name", "address")
SELECT gen_random_uuid()::text, c."id", 'Main', NULL
FROM "Clinic" c
WHERE NOT EXISTS (SELECT 1 FROM "branches" b WHERE b."clinicId" = c."id");
