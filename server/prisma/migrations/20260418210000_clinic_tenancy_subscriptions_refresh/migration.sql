-- Clinic-scoped SaaS tenancy, subscriptions, refresh tokens, product imageUrl,
-- and migration from userId → clinicId on saas_products, saas_orders, profits.

-- 1) Clinic SaaS columns
ALTER TABLE "Clinic" ADD COLUMN IF NOT EXISTS "plan" TEXT NOT NULL DEFAULT 'FREE';
ALTER TABLE "Clinic" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

-- 2) Users must belong to a clinic (Prisma requires non-null clinicId)
INSERT INTO "Clinic" ("id", "name", "plan", "isActive", "createdAt", "updatedAt")
SELECT 'clinic-migration-legacy-orphans', 'Legacy unassigned workspace', 'FREE', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE EXISTS (SELECT 1 FROM "User" WHERE "clinicId" IS NULL)
  AND NOT EXISTS (SELECT 1 FROM "Clinic" WHERE "id" = 'clinic-migration-legacy-orphans');

UPDATE "User" SET "clinicId" = 'clinic-migration-legacy-orphans' WHERE "clinicId" IS NULL;

ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_clinicId_fkey";
ALTER TABLE "User" ALTER COLUMN "clinicId" SET NOT NULL;
ALTER TABLE "User" ADD CONSTRAINT "User_clinicId_fkey"
  FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 3) Tenant catalog: clinicId + imageUrl, drop userId
ALTER TABLE "saas_products" ADD COLUMN IF NOT EXISTS "clinicId" TEXT;
ALTER TABLE "saas_products" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;

UPDATE "saas_products" p
SET "clinicId" = u."clinicId"
FROM "User" u
WHERE p."userId" = u."id" AND (p."clinicId" IS NULL OR p."clinicId" = '');

DELETE FROM "saas_products" WHERE "clinicId" IS NULL;

ALTER TABLE "saas_products" DROP CONSTRAINT IF EXISTS "saas_products_userId_fkey";
DROP INDEX IF EXISTS "saas_products_userId_idx";
ALTER TABLE "saas_products" DROP COLUMN IF EXISTS "userId";

ALTER TABLE "saas_products" ALTER COLUMN "clinicId" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "saas_products_clinicId_idx" ON "saas_products"("clinicId");
ALTER TABLE "saas_products" DROP CONSTRAINT IF EXISTS "saas_products_clinicId_fkey";
ALTER TABLE "saas_products" ADD CONSTRAINT "saas_products_clinicId_fkey"
  FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4) Tenant orders: clinicId, drop userId
ALTER TABLE "saas_orders" ADD COLUMN IF NOT EXISTS "clinicId" TEXT;

UPDATE "saas_orders" o
SET "clinicId" = u."clinicId"
FROM "User" u
WHERE o."userId" = u."id" AND (o."clinicId" IS NULL OR o."clinicId" = '');

DELETE FROM "saas_orders" WHERE "clinicId" IS NULL;

ALTER TABLE "saas_orders" DROP CONSTRAINT IF EXISTS "saas_orders_userId_fkey";
DROP INDEX IF EXISTS "saas_orders_userId_idx";
ALTER TABLE "saas_orders" DROP COLUMN IF EXISTS "userId";

ALTER TABLE "saas_orders" ALTER COLUMN "clinicId" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "saas_orders_clinicId_idx" ON "saas_orders"("clinicId");
ALTER TABLE "saas_orders" DROP CONSTRAINT IF EXISTS "saas_orders_clinicId_fkey";
ALTER TABLE "saas_orders" ADD CONSTRAINT "saas_orders_clinicId_fkey"
  FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 5) Profits: clinicId, drop userId
ALTER TABLE "profits" ADD COLUMN IF NOT EXISTS "clinicId" TEXT;

UPDATE "profits" pr
SET "clinicId" = u."clinicId"
FROM "User" u
WHERE pr."userId" = u."id" AND (pr."clinicId" IS NULL OR pr."clinicId" = '');

UPDATE "profits" pr
SET "clinicId" = o."clinicId"
FROM "saas_orders" o
WHERE pr."orderId" = o."id" AND (pr."clinicId" IS NULL OR pr."clinicId" = '');

DELETE FROM "profits" WHERE "clinicId" IS NULL;

ALTER TABLE "profits" DROP CONSTRAINT IF EXISTS "profits_userId_fkey";
DROP INDEX IF EXISTS "profits_userId_idx";
ALTER TABLE "profits" DROP COLUMN IF EXISTS "userId";

ALTER TABLE "profits" ALTER COLUMN "clinicId" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "profits_clinicId_idx" ON "profits"("clinicId");
ALTER TABLE "profits" DROP CONSTRAINT IF EXISTS "profits_clinicId_fkey";
ALTER TABLE "profits" ADD CONSTRAINT "profits_clinicId_fkey"
  FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 6) Subscriptions (one active row per clinic)
CREATE TABLE IF NOT EXISTS "subscriptions" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'FREE',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_clinicId_key" ON "subscriptions"("clinicId");

ALTER TABLE "subscriptions" DROP CONSTRAINT IF EXISTS "subscriptions_clinicId_fkey";
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_clinicId_fkey"
  FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "subscriptions" ("id", "clinicId", "plan", "status", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, c."id", COALESCE(c."plan", 'FREE'), 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Clinic" c
WHERE NOT EXISTS (SELECT 1 FROM "subscriptions" s WHERE s."clinicId" = c."id");

-- 7) Refresh tokens
CREATE TABLE IF NOT EXISTS "refresh_tokens" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");
CREATE INDEX IF NOT EXISTS "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

ALTER TABLE "refresh_tokens" DROP CONSTRAINT IF EXISTS "refresh_tokens_userId_fkey";
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
