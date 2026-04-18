-- Invalidate existing JWTs safely via server-side sessionVersion checks.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "sessionVersion" INTEGER NOT NULL DEFAULT 0;
