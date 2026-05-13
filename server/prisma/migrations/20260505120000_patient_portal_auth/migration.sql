-- CreateTable
CREATE TABLE "patient_portal_otps" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_portal_otps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_portal_refresh_tokens" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_portal_refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "patient_portal_refresh_tokens_tokenHash_key" ON "patient_portal_refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "patient_portal_otps_patientId_clinicId_idx" ON "patient_portal_otps"("patientId", "clinicId");

-- CreateIndex
CREATE INDEX "patient_portal_otps_expiresAt_idx" ON "patient_portal_otps"("expiresAt");

-- AddForeignKey
CREATE INDEX "patient_portal_refresh_tokens_patientId_idx" ON "patient_portal_refresh_tokens"("patientId");

-- AddForeignKey
ALTER TABLE "patient_portal_otps" ADD CONSTRAINT "patient_portal_otps_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_portal_otps" ADD CONSTRAINT "patient_portal_otps_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_portal_refresh_tokens" ADD CONSTRAINT "patient_portal_refresh_tokens_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
