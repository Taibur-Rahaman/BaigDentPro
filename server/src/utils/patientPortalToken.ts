import jwt, { type SignOptions } from 'jsonwebtoken';
import { JWT_EXPIRES_IN, JWT_SECRET } from './config.js';

export type PatientPortalAccessClaims = {
  kind: 'patient_portal';
  patientId: string;
  clinicId: string;
};

export function signPatientPortalAccessToken(args: { patientId: string; clinicId: string }): string {
  const opts: SignOptions = { expiresIn: JWT_EXPIRES_IN as SignOptions['expiresIn'] };
  const payload: PatientPortalAccessClaims = {
    kind: 'patient_portal',
    patientId: args.patientId,
    clinicId: args.clinicId,
  };
  return jwt.sign(payload, JWT_SECRET, opts);
}

export function verifyPatientPortalAccessToken(token: string): PatientPortalAccessClaims | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as Partial<PatientPortalAccessClaims>;
    if (decoded.kind !== 'patient_portal') return null;
    if (typeof decoded.patientId !== 'string' || typeof decoded.clinicId !== 'string') return null;
    return {
      kind: 'patient_portal',
      patientId: decoded.patientId,
      clinicId: decoded.clinicId,
    };
  } catch {
    return null;
  }
}
