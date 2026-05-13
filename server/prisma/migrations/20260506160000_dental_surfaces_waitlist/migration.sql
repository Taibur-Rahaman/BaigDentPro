-- Dental chart surface map + minimal appointment waitlist

ALTER TABLE "DentalChart" ADD COLUMN IF NOT EXISTS "surfaces" JSONB NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS "AppointmentWaitlistEntry" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "preferredDate" TIMESTAMP(3),
    "duration" INTEGER NOT NULL DEFAULT 30,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppointmentWaitlistEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AppointmentWaitlistEntry_clinicId_idx" ON "AppointmentWaitlistEntry"("clinicId");
CREATE INDEX IF NOT EXISTS "AppointmentWaitlistEntry_patientId_idx" ON "AppointmentWaitlistEntry"("patientId");

ALTER TABLE "AppointmentWaitlistEntry" DROP CONSTRAINT IF EXISTS "AppointmentWaitlistEntry_clinicId_fkey";
ALTER TABLE "AppointmentWaitlistEntry" ADD CONSTRAINT "AppointmentWaitlistEntry_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AppointmentWaitlistEntry" DROP CONSTRAINT IF EXISTS "AppointmentWaitlistEntry_patientId_fkey";
ALTER TABLE "AppointmentWaitlistEntry" ADD CONSTRAINT "AppointmentWaitlistEntry_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
