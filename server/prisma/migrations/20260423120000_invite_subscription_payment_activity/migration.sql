-- Invite-based onboarding
CREATE TABLE "invites" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "branchId" TEXT,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "invites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "invites_token_key" ON "invites"("token");
CREATE INDEX "invites_clinicId_idx" ON "invites"("clinicId");
CREATE INDEX "invites_email_idx" ON "invites"("email");

ALTER TABLE "invites" ADD CONSTRAINT "invites_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invites" ADD CONSTRAINT "invites_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Clinic subscription payments (separate from invoice `Payment` rows)
CREATE TABLE "subscription_payments" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "method" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "externalRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "subscription_payments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "subscription_payments_clinicId_idx" ON "subscription_payments"("clinicId");

ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Activity timeline: clinic scope + structured meta
ALTER TABLE "ActivityLog" ADD COLUMN IF NOT EXISTS "clinicId" TEXT;
ALTER TABLE "ActivityLog" ADD COLUMN IF NOT EXISTS "meta" JSONB;

CREATE INDEX IF NOT EXISTS "ActivityLog_clinicId_idx" ON "ActivityLog"("clinicId");

ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Subscription billing fields
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "autoRenew" BOOLEAN NOT NULL DEFAULT true;
