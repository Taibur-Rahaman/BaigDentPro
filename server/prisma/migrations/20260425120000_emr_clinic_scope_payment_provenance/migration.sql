-- EMR tenant hardening: composite uniqueness + appointment/invoice clinicId + payment provenance.

CREATE UNIQUE INDEX IF NOT EXISTS "patient_id_clinic_unique" ON "Patient"("id", "clinicId");

-- Appointment: denormalized clinic + optional chair (future scheduling).
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "clinicId" TEXT;
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "chairId" TEXT;

UPDATE "Appointment" AS a
SET "clinicId" = p."clinicId"
FROM "Patient" AS p
WHERE p.id = a."patientId" AND (a."clinicId" IS NULL OR a."clinicId" = '');

ALTER TABLE "Appointment" ALTER COLUMN "clinicId" SET NOT NULL;

ALTER TABLE "Appointment" DROP CONSTRAINT IF EXISTS "Appointment_clinicId_fkey";
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "appointment_id_clinic_unique" ON "Appointment"("id", "clinicId");
CREATE INDEX IF NOT EXISTS "Appointment_clinicId_idx" ON "Appointment"("clinicId");
CREATE INDEX IF NOT EXISTS "Appointment_clinicId_userId_date_idx" ON "Appointment"("clinicId", "userId", "date");
CREATE INDEX IF NOT EXISTS "Appointment_clinicId_chairId_date_idx" ON "Appointment"("clinicId", "chairId", "date");

-- Invoice: denormalized clinic for strict tenant queries.
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "clinicId" TEXT;

UPDATE "Invoice" AS i
SET "clinicId" = p."clinicId"
FROM "Patient" AS p
WHERE p.id = i."patientId" AND (i."clinicId" IS NULL OR i."clinicId" = '');

ALTER TABLE "Invoice" ALTER COLUMN "clinicId" SET NOT NULL;

ALTER TABLE "Invoice" DROP CONSTRAINT IF EXISTS "Invoice_clinicId_fkey";
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "invoice_id_clinic_unique" ON "Invoice"("id", "clinicId");
CREATE INDEX IF NOT EXISTS "Invoice_clinicId_idx" ON "Invoice"("clinicId");

-- Payment: internal vs externally verified sources.
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "paymentSource" TEXT;
UPDATE "Payment" SET "paymentSource" = 'CASH_INTERNAL' WHERE "paymentSource" IS NULL;
ALTER TABLE "Payment" ALTER COLUMN "paymentSource" SET NOT NULL;
ALTER TABLE "Payment" ALTER COLUMN "paymentSource" SET DEFAULT 'CASH_INTERNAL';

ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "reconciliationStatus" TEXT;
UPDATE "Payment" SET "reconciliationStatus" = 'RECORDED' WHERE "reconciliationStatus" IS NULL;
ALTER TABLE "Payment" ALTER COLUMN "reconciliationStatus" SET NOT NULL;
ALTER TABLE "Payment" ALTER COLUMN "reconciliationStatus" SET DEFAULT 'RECORDED';

ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "stripePaymentIntentId" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "Payment_stripePaymentIntentId_key" ON "Payment"("stripePaymentIntentId");
