-- Normalize invoice payment provenance labels to CASH | STRIPE (legacy aliases).
UPDATE "Payment" SET "paymentSource" = 'CASH' WHERE "paymentSource" IN ('CASH_INTERNAL', 'cash_internal', 'CASH');
UPDATE "Payment" SET "paymentSource" = 'STRIPE' WHERE "paymentSource" IN ('STRIPE_VERIFIED', 'stripe_verified', 'STRIPE');

ALTER TABLE "Payment" ALTER COLUMN "paymentSource" SET DEFAULT 'CASH';
