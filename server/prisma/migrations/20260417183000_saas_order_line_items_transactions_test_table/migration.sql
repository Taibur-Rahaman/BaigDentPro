-- Tenant SaaS: order headers + line items + payment records; restore optional test_table.
-- Supabase Postgres: uses gen_random_uuid() (available without extra extensions on modern PG).

-- 1) Demo / connectivity table (does not replace app data models)
CREATE TABLE IF NOT EXISTS "test_table" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "test_table_pkey" PRIMARY KEY ("id")
);

-- 2) Expand saas_orders to header shape (keep existing rows)
ALTER TABLE "saas_orders" ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'BDT';
ALTER TABLE "saas_orders" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'CONFIRMED';
ALTER TABLE "saas_orders" ADD COLUMN IF NOT EXISTS "subtotal" DOUBLE PRECISION;
ALTER TABLE "saas_orders" ADD COLUMN IF NOT EXISTS "total" DOUBLE PRECISION;
ALTER TABLE "saas_orders" ADD COLUMN IF NOT EXISTS "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID';
ALTER TABLE "saas_orders" ADD COLUMN IF NOT EXISTS "notes" TEXT;

UPDATE "saas_orders"
SET
    "subtotal" = COALESCE("subtotal", "totalPrice"),
    "total" = COALESCE("total", "totalPrice")
WHERE "subtotal" IS NULL OR "total" IS NULL;

ALTER TABLE "saas_orders" ALTER COLUMN "subtotal" SET NOT NULL;
ALTER TABLE "saas_orders" ALTER COLUMN "total" SET NOT NULL;

-- 3) Line items (created before FKs if table empty; we add FKs after backfill)
CREATE TABLE IF NOT EXISTS "saas_order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "lineTotal" DOUBLE PRECISION NOT NULL,
    "productName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saas_order_items_pkey" PRIMARY KEY ("id")
);

INSERT INTO "saas_order_items" ("id", "orderId", "productId", "quantity", "unitPrice", "lineTotal", "productName", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    o."id",
    o."productId",
    o."quantity",
    CASE WHEN o."quantity" > 0 THEN o."totalPrice" / (o."quantity")::float ELSE o."totalPrice" END,
    o."totalPrice",
    p."name",
    o."createdAt",
    o."updatedAt"
FROM "saas_orders" o
INNER JOIN "saas_products" p ON p."id" = o."productId"
WHERE NOT EXISTS (
    SELECT 1 FROM "saas_order_items" i WHERE i."orderId" = o."id"
);

CREATE INDEX IF NOT EXISTS "saas_order_items_orderId_idx" ON "saas_order_items"("orderId");
CREATE INDEX IF NOT EXISTS "saas_order_items_productId_idx" ON "saas_order_items"("productId");

ALTER TABLE "saas_order_items" DROP CONSTRAINT IF EXISTS "saas_order_items_orderId_fkey";
ALTER TABLE "saas_order_items" ADD CONSTRAINT "saas_order_items_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "saas_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "saas_order_items" DROP CONSTRAINT IF EXISTS "saas_order_items_productId_fkey";
ALTER TABLE "saas_order_items" ADD CONSTRAINT "saas_order_items_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "saas_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 4) Drop legacy single-line columns on saas_orders
ALTER TABLE "saas_orders" DROP CONSTRAINT IF EXISTS "saas_orders_productId_fkey";
DROP INDEX IF EXISTS "saas_orders_productId_idx";
ALTER TABLE "saas_orders" DROP COLUMN IF EXISTS "productId";
ALTER TABLE "saas_orders" DROP COLUMN IF EXISTS "quantity";
ALTER TABLE "saas_orders" DROP COLUMN IF EXISTS "totalPrice";

CREATE INDEX IF NOT EXISTS "saas_orders_status_idx" ON "saas_orders"("status");

-- 5) Payment / ledger rows (create when a processor confirms settlement)
CREATE TABLE IF NOT EXISTS "transactions" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "provider" TEXT,
    "externalRef" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "transactions_orderId_idx" ON "transactions"("orderId");
CREATE INDEX IF NOT EXISTS "transactions_status_idx" ON "transactions"("status");

ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "transactions_orderId_fkey";
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "saas_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
