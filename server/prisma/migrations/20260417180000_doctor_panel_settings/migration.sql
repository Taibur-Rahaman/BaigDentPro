-- Persisted settings for the practice (doctor) workspace dashboard.

CREATE TABLE "doctor_panel_settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "header" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doctor_panel_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "doctor_panel_settings_userId_key" ON "doctor_panel_settings"("userId");

ALTER TABLE "doctor_panel_settings" ADD CONSTRAINT "doctor_panel_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
