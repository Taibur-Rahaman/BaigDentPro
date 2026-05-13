-- Per-clinic capability grants/revokes (SuperAdmin-managed; overlays role + plan).
CREATE TABLE "clinic_capability_overrides" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "capabilityKey" TEXT NOT NULL,
    "grant" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinic_capability_overrides_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "clinic_capability_overrides_clinicId_capabilityKey_key" ON "clinic_capability_overrides"("clinicId", "capabilityKey");

CREATE INDEX "clinic_capability_overrides_clinicId_idx" ON "clinic_capability_overrides"("clinicId");

ALTER TABLE "clinic_capability_overrides" ADD CONSTRAINT "clinic_capability_overrides_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
