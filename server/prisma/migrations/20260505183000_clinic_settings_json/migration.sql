ALTER TABLE "Clinic"
ADD COLUMN "settings" JSONB NOT NULL DEFAULT '{}'::jsonb;
