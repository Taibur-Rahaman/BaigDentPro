-- Tenant SaaS: Profile, product cost, Profit rows (no test_table).

CREATE TABLE "profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "profiles_userId_key" ON "profiles"("userId");

ALTER TABLE "profiles" ADD CONSTRAINT "profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "saas_products" ADD COLUMN IF NOT EXISTS "costPrice" DOUBLE PRECISION NOT NULL DEFAULT 0;

CREATE TABLE "profits" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profits_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "profits_orderId_key" ON "profits"("orderId");

CREATE INDEX "profits_userId_idx" ON "profits"("userId");

ALTER TABLE "profits" ADD CONSTRAINT "profits_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "saas_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "profits" ADD CONSTRAINT "profits_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
