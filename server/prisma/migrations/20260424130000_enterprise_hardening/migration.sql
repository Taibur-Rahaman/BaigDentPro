-- Enterprise hardening: audit extensions, payment audit trail, impersonation sessions, fraud alerts

ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "clinicId" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "ipAddress" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "userAgent" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "entityType" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "beforeSnapshot" JSONB;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "afterSnapshot" JSONB;

CREATE INDEX IF NOT EXISTS "audit_logs_clinicId_idx" ON "audit_logs"("clinicId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'audit_logs_clinicId_fkey'
  ) THEN
    ALTER TABLE "audit_logs"
      ADD CONSTRAINT "audit_logs_clinicId_fkey"
      FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "payment_event_logs" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT,
    "subscriptionPaymentId" TEXT,
    "event" TEXT NOT NULL,
    "payload" JSONB,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payment_event_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "payment_event_logs_clinicId_idx" ON "payment_event_logs"("clinicId");
CREATE INDEX IF NOT EXISTS "payment_event_logs_subscriptionPaymentId_idx" ON "payment_event_logs"("subscriptionPaymentId");
CREATE INDEX IF NOT EXISTS "payment_event_logs_createdAt_idx" ON "payment_event_logs"("createdAt");

CREATE TABLE IF NOT EXISTS "impersonation_sessions" (
    "id" TEXT NOT NULL,
    "jti" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "targetClinicId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "impersonation_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "impersonation_sessions_jti_key" ON "impersonation_sessions"("jti");
CREATE INDEX IF NOT EXISTS "impersonation_sessions_actorUserId_idx" ON "impersonation_sessions"("actorUserId");
CREATE INDEX IF NOT EXISTS "impersonation_sessions_targetClinicId_idx" ON "impersonation_sessions"("targetClinicId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'impersonation_sessions_actorUserId_fkey'
  ) THEN
    ALTER TABLE "impersonation_sessions"
      ADD CONSTRAINT "impersonation_sessions_actorUserId_fkey"
      FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'impersonation_sessions_targetClinicId_fkey'
  ) THEN
    ALTER TABLE "impersonation_sessions"
      ADD CONSTRAINT "impersonation_sessions_targetClinicId_fkey"
      FOREIGN KEY ("targetClinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "fraud_alerts" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT,
    "userId" TEXT,
    "rule" TEXT NOT NULL,
    "riskScore" INTEGER NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fraud_alerts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "fraud_alerts_clinicId_idx" ON "fraud_alerts"("clinicId");
CREATE INDEX IF NOT EXISTS "fraud_alerts_userId_idx" ON "fraud_alerts"("userId");
CREATE INDEX IF NOT EXISTS "fraud_alerts_createdAt_idx" ON "fraud_alerts"("createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fraud_alerts_clinicId_fkey'
  ) THEN
    ALTER TABLE "fraud_alerts"
      ADD CONSTRAINT "fraud_alerts_clinicId_fkey"
      FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fraud_alerts_userId_fkey'
  ) THEN
    ALTER TABLE "fraud_alerts"
      ADD CONSTRAINT "fraud_alerts_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
