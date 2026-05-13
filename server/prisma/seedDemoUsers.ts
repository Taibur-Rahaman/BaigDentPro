import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const DEMO_PASSWORD = 'Temp@12345';
const DEMO_CLINIC_ID = 'demo-dental-clinic';
const DEMO_CLINIC_NAME = 'Demo Dental Clinic';
const DEMO_SHOP_CLINIC_ID = 'demo-shop-clinic';
const DEMO_SHOP_CLINIC_NAME = 'Demo Shop Workspace';

type DemoUserSpec = {
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'CLINIC_ADMIN' | 'DOCTOR' | 'STORE_MANAGER';
  clinicId: string;
  clinicName: string;
};

const DEMO_USERS: DemoUserSpec[] = [
  { email: 'superadmin@demo.com', name: 'Demo Super Admin', role: 'SUPER_ADMIN', clinicId: DEMO_CLINIC_ID, clinicName: DEMO_CLINIC_NAME },
  { email: 'clinic@demo.com', name: 'Demo Clinic Admin', role: 'CLINIC_ADMIN', clinicId: DEMO_CLINIC_ID, clinicName: DEMO_CLINIC_NAME },
  { email: 'doctor@demo.com', name: 'Demo Doctor', role: 'DOCTOR', clinicId: DEMO_CLINIC_ID, clinicName: DEMO_CLINIC_NAME },
  { email: 'shop@demo.com', name: 'Demo Store Manager', role: 'STORE_MANAGER', clinicId: DEMO_SHOP_CLINIC_ID, clinicName: 'Demo Shop Workspace' },
];

function assertDemoUsersEnabled(): void {
  if (String(process.env.ENABLE_DEMO_USERS || '').trim().toLowerCase() !== 'true') {
    throw new Error('Demo user seed blocked: set ENABLE_DEMO_USERS=true to allow this operation.');
  }
}

async function ensureDemoClinics(prisma: PrismaClient): Promise<void> {
  await prisma.clinic.upsert({
    where: { id: DEMO_CLINIC_ID },
    update: { name: DEMO_CLINIC_NAME, plan: 'ENTERPRISE', planTier: 'ENTERPRISE', isDemo: true, isActive: true },
    create: { id: DEMO_CLINIC_ID, name: DEMO_CLINIC_NAME, plan: 'ENTERPRISE', planTier: 'ENTERPRISE', isDemo: true, isActive: true, email: 'clinic@demo.com' },
  });
  await prisma.clinic.upsert({
    where: { id: DEMO_SHOP_CLINIC_ID },
    update: { name: DEMO_SHOP_CLINIC_NAME, plan: 'FREE', planTier: 'STARTER', isDemo: true, isActive: true },
    create: { id: DEMO_SHOP_CLINIC_ID, name: DEMO_SHOP_CLINIC_NAME, plan: 'FREE', planTier: 'STARTER', isDemo: true, isActive: true, email: 'shop@demo.com' },
  });
}

function shouldPrintCredentials(): boolean {
  if ((process.env.NODE_ENV || '').trim().toLowerCase() !== 'production') return true;
  return (process.env.ALLOW_DEMO_CREDENTIAL_OUTPUT || '').trim().toLowerCase() === 'true';
}

async function upsertDemoUser(prisma: PrismaClient, spec: DemoUserSpec, passwordHash: string): Promise<void> {
  const user = await prisma.user.upsert({
    where: { email: spec.email },
    update: {
      name: spec.name,
      password: passwordHash,
      role: spec.role,
      clinicId: spec.clinicId,
      clinicName: spec.clinicName,
      isActive: true,
      isApproved: true,
      accountStatus: 'ACTIVE',
      sessionVersion: 0,
    },
    create: {
      email: spec.email,
      name: spec.name,
      password: passwordHash,
      role: spec.role,
      clinicId: spec.clinicId,
      clinicName: spec.clinicName,
      isActive: true,
      isApproved: true,
      accountStatus: 'ACTIVE',
    },
    select: { id: true },
  });
  await prisma.profile.upsert({
    where: { userId: user.id },
    update: { displayName: spec.name, notes: JSON.stringify({ isDemo: true, isFirstLogin: true, status: 'ACTIVE' }) },
    create: { userId: user.id, displayName: spec.name, notes: JSON.stringify({ isDemo: true, isFirstLogin: true, status: 'ACTIVE' }) },
  });
}

export async function seedDemoUsers(prisma: PrismaClient): Promise<void> {
  assertDemoUsersEnabled();
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  await ensureDemoClinics(prisma);
  for (const spec of DEMO_USERS) await upsertDemoUser(prisma, spec, passwordHash);
  const clinicAdmin = await prisma.user.findUnique({
    where: { email: 'clinic@demo.com' },
    select: { id: true },
  });
  if (clinicAdmin?.id) {
    await prisma.clinic.update({
      where: { id: DEMO_CLINIC_ID },
      data: { ownerId: clinicAdmin.id },
    });
  }
  if (shouldPrintCredentials()) {
    console.log(`
Demo Accounts:

SuperAdmin: superadmin@demo.com / Temp@12345
Clinic: clinic@demo.com / Temp@12345
Doctor: doctor@demo.com / Temp@12345
Shop: shop@demo.com / Temp@12345
`);
  } else {
    console.log('[seedDemoUsers] Demo accounts seeded. Credential echo suppressed in production.');
  }
}

export async function resetDemoData(prisma: PrismaClient): Promise<void> {
  assertDemoUsersEnabled();
  const demoClinics = await prisma.clinic.findMany({ where: { isDemo: true }, select: { id: true } });
  const clinicIds = demoClinics.map((c) => c.id);
  await prisma.$transaction(async (tx) => {
    if (clinicIds.length === 0) return;
    await tx.appointmentWaitlistEntry.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await tx.appointment.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await tx.invoice.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await tx.activityLog.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await tx.patientPortalOtp.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await tx.subscriptionPayment.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await tx.order.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await tx.product.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await tx.patient.deleteMany({ where: { clinicId: { in: clinicIds } } });
  });
  await seedDemoUsers(prisma);
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    await seedDemoUsers(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void main().catch((error) => {
    console.error('[seedDemoUsers] failed', error);
    process.exit(1);
  });
}
