/**
 * Wipes transactional EMR/finance data for `isDemo` clinics and reinserts a small fixtures set.
 * Does not remove users or subscription rows.
 */
import { prisma } from '../index.js';
import bcrypt from 'bcryptjs';

const DEMO_PASSWORD = 'Temp@12345';
const DEMO_CLINIC_ID = 'demo-dental-clinic';
const DEMO_CLINIC_NAME = 'Demo Dental Clinic';
const DEMO_SHOP_CLINIC_ID = 'demo-shop-clinic';

function assertDemoUsersEnabled(): void {
  if (String(process.env.ENABLE_DEMO_USERS || '').trim().toLowerCase() !== 'true') {
    throw new Error('Demo reset blocked: set ENABLE_DEMO_USERS=true.');
  }
}

export async function resetAllDemoClinics(): Promise<{ clinicsReset: number }> {
  assertDemoUsersEnabled();
  const demos = await prisma.clinic.findMany({
    where: { isDemo: true },
    select: { id: true },
  });
  for (const c of demos) {
    await wipeDemoClinicData(c.id);
    await seedMinimalDemoDataset(c.id);
  }
  await resetDemoIdentityUsers();
  return { clinicsReset: demos.length };
}

async function wipeDemoClinicData(clinicId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.appointmentWaitlistEntry.deleteMany({ where: { clinicId } });
    await tx.appointment.deleteMany({ where: { clinicId } });
    await tx.invoice.deleteMany({ where: { clinicId } });
    await tx.activityLog.deleteMany({ where: { clinicId } });
    await tx.patientPortalOtp.deleteMany({ where: { clinicId } });
    await tx.subscriptionPayment.deleteMany({ where: { clinicId } });
    await tx.order.deleteMany({ where: { clinicId } });
    await tx.product.deleteMany({ where: { clinicId } });
    await tx.patient.deleteMany({ where: { clinicId } });
  });
}

async function resetDemoIdentityUsers(): Promise<void> {
  const hash = await bcrypt.hash(DEMO_PASSWORD, 12);
  await prisma.clinic.upsert({
    where: { id: DEMO_CLINIC_ID },
    update: { name: DEMO_CLINIC_NAME, isDemo: true, isActive: true, plan: 'ENTERPRISE', planTier: 'ENTERPRISE' },
    create: { id: DEMO_CLINIC_ID, name: DEMO_CLINIC_NAME, isDemo: true, isActive: true, plan: 'ENTERPRISE', planTier: 'ENTERPRISE' },
  });
  await prisma.clinic.upsert({
    where: { id: DEMO_SHOP_CLINIC_ID },
    update: { name: 'Demo Shop Workspace', isDemo: true, isActive: true, plan: 'FREE', planTier: 'STARTER' },
    create: { id: DEMO_SHOP_CLINIC_ID, name: 'Demo Shop Workspace', isDemo: true, isActive: true, plan: 'FREE', planTier: 'STARTER' },
  });

  const users = [
    { email: 'superadmin@demo.com', name: 'Demo Super Admin', role: 'SUPER_ADMIN', clinicId: DEMO_CLINIC_ID, clinicName: DEMO_CLINIC_NAME },
    { email: 'clinic@demo.com', name: 'Demo Clinic Admin', role: 'CLINIC_ADMIN', clinicId: DEMO_CLINIC_ID, clinicName: DEMO_CLINIC_NAME },
    { email: 'doctor@demo.com', name: 'Demo Doctor', role: 'DOCTOR', clinicId: DEMO_CLINIC_ID, clinicName: DEMO_CLINIC_NAME },
    { email: 'shop@demo.com', name: 'Demo Store Manager', role: 'STORE_MANAGER', clinicId: DEMO_SHOP_CLINIC_ID, clinicName: 'Demo Shop Workspace' },
  ] as const;

  for (const u of users) {
    const row = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        password: hash,
        role: u.role,
        clinicId: u.clinicId,
        clinicName: u.clinicName,
        isActive: true,
        isApproved: true,
        accountStatus: 'ACTIVE',
        sessionVersion: 0,
      },
      create: {
        email: u.email,
        name: u.name,
        password: hash,
        role: u.role,
        clinicId: u.clinicId,
        clinicName: u.clinicName,
        isActive: true,
        isApproved: true,
        accountStatus: 'ACTIVE',
      },
      select: { id: true },
    });
    await prisma.profile.upsert({
      where: { userId: row.id },
      update: {
        displayName: u.name,
        notes: JSON.stringify({ isDemo: true, isFirstLogin: true, status: 'ACTIVE' }),
      },
      create: {
        userId: row.id,
        displayName: u.name,
        notes: JSON.stringify({ isDemo: true, isFirstLogin: true, status: 'ACTIVE' }),
      },
    });
  }
}

async function seedMinimalDemoDataset(clinicId: string): Promise<void> {
  const doctor = await prisma.user.findFirst({
    where: { clinicId, role: 'DOCTOR', isActive: true },
    select: { id: true, name: true },
  });
  const admin = await prisma.user.findFirst({
    where: { clinicId, role: { in: ['CLINIC_ADMIN', 'CLINIC_OWNER'] }, isActive: true },
    select: { id: true },
  });
  const uid = doctor?.id ?? admin?.id;
  if (!uid) return;

  const p1 = await prisma.patient.create({
    data: {
      regNo: `DEMO-${Date.now().toString(36)}`,
      name: 'Demo Patient',
      age: 35,
      gender: 'M',
      phone: '+8801700000099',
      email: 'demo.patient@example.com',
      address: 'Dhaka',
      clinicId,
      userId: uid,
    },
  });

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);

  await prisma.appointment.create({
    data: {
      patientId: p1.id,
      userId: uid,
      clinicId,
      date: tomorrow,
      time: '10:00',
      duration: 30,
      type: 'Checkup',
      status: 'SCHEDULED',
    },
  });

  await prisma.prescription.create({
    data: {
      patientId: p1.id,
      userId: uid,
      diagnosis: 'Routine dental review',
      chiefComplaint: 'Cleaning',
      items: {
        create: [
          {
            drugName: 'Paracetamol',
            dosage: '500mg',
            frequency: 'TDS',
            duration: '3 days',
            afterFood: true,
          },
        ],
      },
    },
  });

  await prisma.invoice.create({
    data: {
      patientId: p1.id,
      userId: uid,
      clinicId,
      invoiceNo: `DEMO-INV-${Date.now().toString(36)}`,
      date: new Date(),
      dueDate: new Date(),
      status: 'PENDING',
      subtotal: 1500,
      tax: 0,
      total: 1500,
      paid: 0,
      due: 1500,
    },
  });
}
