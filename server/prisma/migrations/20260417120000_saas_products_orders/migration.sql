-- SaaS tenant catalog & orders (replaces ad-hoc test_table demo).

CREATE TABLE "saas_products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saas_products_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "saas_orders" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saas_orders_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "saas_products_userId_idx" ON "saas_products"("userId");
CREATE INDEX "saas_orders_userId_idx" ON "saas_orders"("userId");
CREATE INDEX "saas_orders_productId_idx" ON "saas_orders"("productId");

ALTER TABLE "saas_products" ADD CONSTRAINT "saas_products_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "saas_orders" ADD CONSTRAINT "saas_orders_productId_fkey" FOREIGN KEY ("productId") REFERENCES "saas_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "saas_orders" ADD CONSTRAINT "saas_orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DROP TABLE IF EXISTS "test_table";
