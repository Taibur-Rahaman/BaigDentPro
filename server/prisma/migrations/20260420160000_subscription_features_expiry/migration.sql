-- Feature JSON + optional expiry on subscriptions (SaaS FACL + billing-ready).

ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "features" JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);
