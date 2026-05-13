import type { NextFunction, Request, Response } from 'express';
import type { Patient } from '@prisma/client';
import { prisma } from '../index.js';
import { extractAccessTokenFromRequest } from './auth.js';
import { verifyPatientPortalAccessToken } from '../utils/patientPortalToken.js';

export type PatientPortalAuthState = {
  patientId: string;
  clinicId: string;
  patient: Pick<Patient, 'id' | 'clinicId' | 'name' | 'phone' | 'email' | 'address' | 'userId'>;
};

export type PatientPortalRequest = Request & { patientPortal?: PatientPortalAuthState };

export async function authenticatePatientPortal(req: PatientPortalRequest, res: Response, next: NextFunction) {
  const token = extractAccessTokenFromRequest(req);
  if (!token) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }
  const claims = verifyPatientPortalAccessToken(token);
  if (!claims) {
    res.status(401).json({ error: 'Invalid patient portal token' });
    return;
  }
  const patient = await prisma.patient.findFirst({
    where: { id: claims.patientId, clinicId: claims.clinicId },
    select: { id: true, clinicId: true, name: true, phone: true, email: true, address: true, userId: true },
  });
  if (!patient) {
    res.status(401).json({ error: 'Patient not found' });
    return;
  }
  req.patientPortal = {
    patientId: patient.id,
    clinicId: patient.clinicId,
    patient,
  };
  next();
}
