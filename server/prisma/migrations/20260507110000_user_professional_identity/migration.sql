-- Professional identity (title, admin verification) for prescriptions and UI.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "professionalVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "professionalVerifiedAt" TIMESTAMP(3);

-- Legacy self-service pending owners were created as CLINIC_ADMIN; normalize to explicit pending role until approved.
UPDATE "User"
SET role = 'PENDING_APPROVAL'
WHERE "isApproved" = false AND role = 'CLINIC_ADMIN';
