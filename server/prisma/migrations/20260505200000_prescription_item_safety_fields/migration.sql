-- Add medicine safety/note fields for prescription item rows (PostgreSQL).
ALTER TABLE "PrescriptionItem"
  ADD COLUMN IF NOT EXISTS "maxDailyDose" VARCHAR(191),
  ADD COLUMN IF NOT EXISTS "doctorNotes" TEXT,
  ADD COLUMN IF NOT EXISTS "allowDoseOverride" BOOLEAN NOT NULL DEFAULT false;
