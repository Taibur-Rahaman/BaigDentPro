import type { Request, Response, NextFunction } from 'express';
import type { AuthRequest } from './auth.js';
import { writeAuditLog } from '../services/auditLogService.js';
import { recordRbacDenialSpike } from '../services/fraudAlertService.js';
import { resolveBusinessClinicId } from '../utils/requestClinic.js';

/** Canonical clinical roles (stored on `User.role`). */
export const CLINICAL_ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  CLINIC_ADMIN: 'CLINIC_ADMIN',
  CLINIC_OWNER: 'CLINIC_OWNER',
  DOCTOR: 'DOCTOR',
  RECEPTIONIST: 'RECEPTIONIST',
  LAB_TECH: 'LAB_TECH',
  TENANT: 'TENANT',
} as const;

function rawRole(req: AuthRequest): string {
  return (req.user?.role || '').trim();
}

function isPlatformAdmin(role: string): boolean {
  return role === CLINICAL_ROLES.SUPER_ADMIN;
}

/** Full clinic administration (not SaaS super-admin). */
export function isClinicAdministrator(role: string): boolean {
  return role === CLINICAL_ROLES.CLINIC_ADMIN || role === CLINICAL_ROLES.CLINIC_OWNER;
}

function isDoctor(role: string): boolean {
  return role === CLINICAL_ROLES.DOCTOR;
}

function isDoctorLike(role: string): boolean {
  return isDoctor(role) || role === 'DENTAL_ASSISTANT';
}

function isReceptionist(role: string): boolean {
  return role === CLINICAL_ROLES.RECEPTIONIST;
}

function isLabTech(role: string): boolean {
  return role === CLINICAL_ROLES.LAB_TECH;
}

function forbidden(req: Request, res: Response, message: string, reason: string): void {
  const a = req as AuthRequest;
  let clinicId: string | null = null;
  try {
    clinicId = resolveBusinessClinicId(a);
  } catch {
    clinicId = a.user?.clinicId?.trim() ?? null;
  }
  void writeAuditLog({
    userId: a.user?.id ?? 'unknown',
    clinicId,
    action: 'RBAC_DENY',
    entityType: 'EMR_HTTP',
    metadata: { path: req.originalUrl ?? req.url, method: req.method, reason, message },
    ipAddress: req.ip,
    userAgent: req.get('user-agent') ?? null,
  });
  void recordRbacDenialSpike({
    clinicId,
    userId: a.user?.id ?? 'unknown',
    path: req.originalUrl ?? req.url ?? '',
  });
  res.status(403).json({ error: message });
}

/** SaaS catalog tenants must not access clinic EMR APIs. */
export function blockTenantFromEmr(req: Request, res: Response, next: NextFunction): void {
  const r = rawRole(req as AuthRequest);
  if (r === CLINICAL_ROLES.TENANT) {
    forbidden(req, res, 'This account cannot access clinic EMR modules', 'tenant_emr_block');
    return;
  }
  next();
}

export function requirePatientsEmrAccess(req: Request, res: Response, next: NextFunction): void {
  const a = req as AuthRequest;
  const r = rawRole(a);
  const method = req.method.toUpperCase();
  if (isPlatformAdmin(r) || isClinicAdministrator(r)) {
    next();
    return;
  }
  if (isLabTech(r)) {
    forbidden(req, res, 'Insufficient permissions', 'lab_tech_patients');
    return;
  }
  if (method === 'GET') {
    if (isDoctorLike(r) || isReceptionist(r)) {
      next();
      return;
    }
    forbidden(req, res, 'Insufficient permissions', 'patients_get');
    return;
  }
  if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
    if (isDoctorLike(r) || isReceptionist(r)) {
      next();
      return;
    }
    forbidden(req, res, 'Insufficient permissions', 'patients_write');
    return;
  }
  if (method === 'DELETE') {
    if (isClinicAdministrator(r) || isPlatformAdmin(r)) {
      next();
      return;
    }
    forbidden(req, res, 'Only clinic administrators may delete patients', 'patients_delete');
    return;
  }
  forbidden(req, res, 'Insufficient permissions', 'patients_other');
}

/** Receptionists must not create, edit, or delete treatment plans (clinical safety). */
export function blockReceptionistTreatmentPlanMutations(req: Request, res: Response, next: NextFunction): void {
  const a = req as AuthRequest;
  if (!isReceptionist(rawRole(a))) {
    next();
    return;
  }
  const method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    next();
    return;
  }
  const path = (req.originalUrl || req.url || '').split('?')[0];
  if (path.includes('/treatment-plans')) {
    forbidden(req, res, 'Receptionists cannot modify treatment plans', 'receptionist_treatment_plan');
    return;
  }
  next();
}

export function requireAppointmentsEmrAccess(req: Request, res: Response, next: NextFunction): void {
  const a = req as AuthRequest;
  const r = rawRole(a);
  if (isPlatformAdmin(r) || isClinicAdministrator(r)) {
    next();
    return;
  }
  if (isLabTech(r)) {
    forbidden(req, res, 'Insufficient permissions', 'lab_tech_appointments');
    return;
  }
  if (isDoctorLike(r) || isReceptionist(r)) {
    next();
    return;
  }
  forbidden(req, res, 'Insufficient permissions', 'appointments');
}

export function requirePrescriptionsEmrAccess(req: Request, res: Response, next: NextFunction): void {
  const a = req as AuthRequest;
  const r = rawRole(a);
  const method = req.method.toUpperCase();
  if (isPlatformAdmin(r) || isClinicAdministrator(r)) {
    next();
    return;
  }
  if (isLabTech(r) || isReceptionist(r)) {
    forbidden(req, res, 'Insufficient permissions', 'prescriptions_role');
    return;
  }
  if (isDoctorLike(r)) {
    next();
    return;
  }
  if (method === 'GET') {
    forbidden(req, res, 'Insufficient permissions', 'prescriptions_get');
    return;
  }
  forbidden(req, res, 'Insufficient permissions', 'prescriptions');
}

export function requireInvoicesEmrAccess(req: Request, res: Response, next: NextFunction): void {
  const a = req as AuthRequest;
  const r = rawRole(a);
  const method = req.method.toUpperCase();
  if (isPlatformAdmin(r) || isClinicAdministrator(r)) {
    next();
    return;
  }
  if (isLabTech(r)) {
    forbidden(req, res, 'Insufficient permissions', 'lab_tech_invoices');
    return;
  }
  if (method === 'GET') {
    if (isDoctorLike(r) || isReceptionist(r)) {
      next();
      return;
    }
    forbidden(req, res, 'Insufficient permissions', 'invoices_get');
    return;
  }
  if (method === 'POST') {
    const path = (req.originalUrl || req.url || '').split('?')[0];
    if (path.includes('/payments')) {
      if (path.includes('/verify')) {
        if (isPlatformAdmin(r) || isClinicAdministrator(r)) {
          next();
          return;
        }
        forbidden(req, res, 'Only clinic administrators may verify or reject payments', 'invoice_payment_verify_route');
        return;
      }
      if (isDoctorLike(r)) {
        forbidden(req, res, 'Doctors cannot record invoice payments', 'doctor_invoice_payment');
        return;
      }
      if (isReceptionist(r) || isClinicAdministrator(r) || isPlatformAdmin(r)) {
        next();
        return;
      }
      forbidden(req, res, 'Insufficient permissions', 'invoice_payment_post');
      return;
    }
    if (isClinicAdministrator(r) || isPlatformAdmin(r)) {
      next();
      return;
    }
    if (isDoctorLike(r)) {
      forbidden(req, res, 'Doctors have read-only access to invoices', 'doctor_invoice_create');
      return;
    }
    if (isReceptionist(r)) {
      forbidden(req, res, 'Receptionists have read-only access to invoices', 'receptionist_invoice_create');
      return;
    }
    forbidden(req, res, 'Insufficient permissions', 'invoice_post');
    return;
  }
  if (method === 'PUT' || method === 'PATCH') {
    if (isClinicAdministrator(r) || isPlatformAdmin(r)) {
      next();
      return;
    }
    if (isReceptionist(r)) {
      forbidden(req, res, 'Receptionists cannot edit invoices', 'receptionist_invoice_put');
      return;
    }
    forbidden(req, res, 'Insufficient permissions', 'invoice_put');
    return;
  }
  if (method === 'DELETE') {
    if (isPlatformAdmin(r) || isClinicAdministrator(r)) {
      next();
      return;
    }
    forbidden(req, res, 'Only clinic administrators may delete invoices', 'invoice_delete');
    return;
  }
  forbidden(req, res, 'Insufficient permissions', 'invoices_other');
}

/** bKash / Nagad / Stripe async verification — clinic admin or owner only (not receptionist). */
export function requireInvoicePaymentVerificationAccess(req: Request, res: Response, next: NextFunction): void {
  const a = req as AuthRequest;
  const r = rawRole(a);
  if (isPlatformAdmin(r) || isClinicAdministrator(r)) {
    next();
    return;
  }
  forbidden(req, res, 'Only clinic administrators may verify or reject payments', 'invoice_payment_verify');
}

export function requireLabEmrAccess(req: Request, res: Response, next: NextFunction): void {
  const a = req as AuthRequest;
  const r = rawRole(a);
  if (isPlatformAdmin(r) || isClinicAdministrator(r)) {
    next();
    return;
  }
  if (isLabTech(r)) {
    next();
    return;
  }
  if (isDoctorLike(r)) {
    next();
    return;
  }
  if (isReceptionist(r)) {
    if (req.method.toUpperCase() === 'GET') {
      next();
      return;
    }
    forbidden(req, res, 'Insufficient permissions', 'receptionist_lab_write');
    return;
  }
  forbidden(req, res, 'Insufficient permissions', 'lab');
}
