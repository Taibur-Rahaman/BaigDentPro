import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { isSupabaseConfigured } from './utils/supabaseServer.js';
import { syncSupabasePasswordForEmail } from './services/supabaseAuthSync.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

const DEFAULT_CLINIC_ID = 'seed-clinic-baigdentpro';

const SUPERADMIN_SEED_EMAIL = (process.env.SUPERADMIN_SEED_EMAIL || '').trim().toLowerCase();
const SUPERADMIN_SEED_PASSWORD = (process.env.SUPERADMIN_SEED_PASSWORD || '').trim();
const DEMO_SEED_PASSWORD = (process.env.DEMO_SEED_PASSWORD || '').trim();

/**
 * Platform SUPER_ADMIN tied to the default seeded clinic (`seed-clinic-baigdentpro`).
 * Idempotent: safe to run against production `DATABASE_URL` (upsert only; does not wipe data).
 * Re-running resets this account’s password to the seed value via a fresh bcrypt hash (cost 12).
 */
async function ensureSuperAdminUser(clinicId: string): Promise<void> {
  if (!SUPERADMIN_SEED_EMAIL || !SUPERADMIN_SEED_PASSWORD) {
    throw new Error('Missing SUPERADMIN_SEED_EMAIL or SUPERADMIN_SEED_PASSWORD');
  }
  const passwordHash = await bcrypt.hash(SUPERADMIN_SEED_PASSWORD, 12);
  await prisma.user.upsert({
    where: { email: SUPERADMIN_SEED_EMAIL },
    update: {
      password: passwordHash,
      role: 'SUPER_ADMIN',
      clinicId,
      clinicName: 'BaigDentPro Platform',
      isActive: true,
      isApproved: true,
      accountStatus: 'ACTIVE',
    },
    create: {
      email: SUPERADMIN_SEED_EMAIL,
      password: passwordHash,
      name: 'Super Admin',
      role: 'SUPER_ADMIN',
      clinicId,
      clinicName: 'BaigDentPro Platform',
      isActive: true,
      isApproved: true,
      accountStatus: 'ACTIVE',
    },
  });
  console.log('[SEED] SUPER_ADMIN ensured');
}

async function upsertDefaultClinic() {
  return prisma.clinic.upsert({
    where: { id: DEFAULT_CLINIC_ID },
    update: { name: 'BaigDentPro Dental Clinic', plan: 'PREMIUM', isActive: true },
    create: {
      id: DEFAULT_CLINIC_ID,
      name: 'BaigDentPro Dental Clinic',
      plan: 'PREMIUM',
      isActive: true,
      phone: '+880 1601-677122',
      email: 'info@baigdentpro.com',
    },
  });
}

async function syncSupabaseAuthPairs(pairs: { email: string; password: string }[]): Promise<void> {
  if (!isSupabaseConfigured()) {
    console.log('ℹ️  Set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY to sync seeded users to Supabase Auth.');
    return;
  }
  for (const { email, password } of pairs) {
    const r = await syncSupabasePasswordForEmail(email, password);
    if (r.synced) console.log('✅ Supabase Auth user:', email);
    else if (r.note && r.note !== 'supabase_not_configured') console.warn('⚠️ Supabase Auth', email, r.note);
  }
}

/** Minimal production-safe setup: default clinic + SUPER_ADMIN only. */
async function ensureCoreBootstrap(): Promise<void> {
  const clinic = await upsertDefaultClinic();
  await ensureSuperAdminUser(clinic.id);
  await syncSupabaseAuthPairs([{ email: SUPERADMIN_SEED_EMAIL, password: SUPERADMIN_SEED_PASSWORD }]);
  console.log('[SEED] CORE BOOTSTRAP COMPLETE');
}

async function seedCatalogPlans() {
  const platinumFeatures = { branches: 1, roleAccess: false, reports: 'basic', branding: false };
  const premiumFeatures = { branches: 'unlimited', roleAccess: true, reports: 'advanced', branding: true };
  const luxuryFeatures = {
    branches: 'unlimited',
    roleAccess: true,
    reports: 'advanced',
    branding: true,
    prioritySupport: true,
  };

  const rows: Array<{ name: string; price: number; deviceLimit: number; features: object }> = [
    { name: 'FREE', price: 0, deviceLimit: 100, features: {} },
    { name: 'PLATINUM', price: 700, deviceLimit: 1, features: platinumFeatures },
    { name: 'PREMIUM', price: 1000, deviceLimit: 5, features: premiumFeatures },
    { name: 'LUXURY', price: 1500, deviceLimit: 5, features: luxuryFeatures },
  ];

  for (const p of rows) {
    await prisma.plan.upsert({
      where: { name: p.name },
      update: { price: p.price, deviceLimit: p.deviceLimit, features: p.features },
      create: { name: p.name, price: p.price, deviceLimit: p.deviceLimit, features: p.features },
    });
  }
}

/** Optional dev/demo datasets — requires `SEED_MODE=demo` (never defaults). */
async function seedDemoData(): Promise<void> {
  if (!DEMO_SEED_PASSWORD) {
    throw new Error('Missing DEMO_SEED_PASSWORD for demo seed mode');
  }
  await seedCatalogPlans();

  const demoClinic = await prisma.clinic.findUnique({ where: { id: DEFAULT_CLINIC_ID } });
  if (!demoClinic) {
    throw new Error(`[SEED] Default clinic (${DEFAULT_CLINIC_ID}) missing — run core bootstrap first.`);
  }

  const omixEmailEnv = process.env.OMIX_SERVICE_USER_EMAIL?.trim();
  const omixPasswordEnv = process.env.OMIX_SERVICE_USER_PASSWORD?.trim();

  const premiumPlan = await prisma.plan.findUnique({ where: { name: 'PREMIUM' } });
  await prisma.subscription.upsert({
    where: { clinicId: demoClinic.id },
    update: {
      plan: 'PREMIUM',
      planId: premiumPlan?.id ?? null,
      status: 'ACTIVE',
      startDate: new Date(),
    },
    create: {
      clinicId: demoClinic.id,
      plan: 'PREMIUM',
      planId: premiumPlan?.id ?? null,
      status: 'ACTIVE',
      startDate: new Date(),
    },
  });

  const hashedPassword = await bcrypt.hash(DEMO_SEED_PASSWORD, 12);
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@baigdentpro.com' },
    update: {
      password: hashedPassword,
      clinicId: demoClinic.id,
      role: 'CLINIC_ADMIN',
      clinicName: demoClinic.name,
      isActive: true,
      isApproved: true,
      accountStatus: 'ACTIVE',
    },
    create: {
      email: 'demo@baigdentpro.com',
      password: hashedPassword,
      name: 'Dr. Demo',
      role: 'CLINIC_ADMIN',
      clinicId: demoClinic.id,
      clinicName: demoClinic.name,
      clinicAddress: 'Dhaka, Bangladesh',
      clinicPhone: '+880 1601-677122',
      clinicEmail: 'info@baigdentpro.com',
      degree: 'BDS, MDS',
      specialization: 'General Dentistry',
      isActive: true,
      isApproved: true,
      accountStatus: 'ACTIVE',
    },
  });

  console.log('✅ Demo clinic admin:', demoUser.email, '(manages doctor access for this clinic)');

  await prisma.clinic.update({
    where: { id: demoClinic.id },
    data: { ownerId: demoUser.id, plan: 'PREMIUM', isDemo: true, planTier: 'ENTERPRISE' },
  });

  const staffDoctor = await prisma.user.upsert({
    where: { email: 'doctor@baigdentpro.com' },
    update: {
      password: hashedPassword,
      clinicId: demoClinic.id,
      clinicName: demoClinic.name,
      role: 'DOCTOR',
      isActive: true,
      isApproved: true,
      accountStatus: 'ACTIVE',
    },
    create: {
      email: 'doctor@baigdentpro.com',
      password: hashedPassword,
      name: 'Dr. Associate',
      role: 'DOCTOR',
      clinicId: demoClinic.id,
      clinicName: demoClinic.name,
      isActive: true,
      isApproved: true,
      accountStatus: 'ACTIVE',
    },
  });
  console.log('✅ Staff doctor (same clinic):', staffDoctor.email);

  const receptionist = await prisma.user.upsert({
    where: { email: 'receptionist@baigdentpro.com' },
    update: {
      password: hashedPassword,
      clinicId: demoClinic.id,
      clinicName: demoClinic.name,
      role: 'RECEPTIONIST',
      isActive: true,
      isApproved: true,
      accountStatus: 'ACTIVE',
    },
    create: {
      email: 'receptionist@baigdentpro.com',
      password: hashedPassword,
      name: 'Front Desk',
      role: 'RECEPTIONIST',
      clinicId: demoClinic.id,
      clinicName: demoClinic.name,
      isActive: true,
      isApproved: true,
      accountStatus: 'ACTIVE',
    },
  });
  console.log('✅ Receptionist (same clinic):', receptionist.email);

  const TENANT_SEED_CLINIC_ID = 'seed-tenant-shop-clinic';
  const tenantClinic = await prisma.clinic.upsert({
    where: { id: TENANT_SEED_CLINIC_ID },
    update: { name: 'Demo Shop Tenant', isActive: true, plan: 'FREE' },
    create: {
      id: TENANT_SEED_CLINIC_ID,
      name: 'Demo Shop Tenant',
      plan: 'FREE',
      isActive: true,
    },
  });
  const freePlan = await prisma.plan.findUnique({ where: { name: 'FREE' } });
  await prisma.subscription.upsert({
    where: { clinicId: tenantClinic.id },
    update: {
      plan: 'FREE',
      planId: freePlan?.id ?? null,
      status: 'ACTIVE',
      startDate: new Date(),
    },
    create: {
      clinicId: tenantClinic.id,
      plan: 'FREE',
      planId: freePlan?.id ?? null,
      status: 'ACTIVE',
      startDate: new Date(),
    },
  });
  const tenantUser = await prisma.user.upsert({
    where: { email: 'tenant@baigdentpro.com' },
    update: {
      password: hashedPassword,
      clinicId: tenantClinic.id,
      role: 'TENANT',
      isActive: true,
      isApproved: true,
      accountStatus: 'ACTIVE',
    },
    create: {
      email: 'tenant@baigdentpro.com',
      password: hashedPassword,
      name: 'Shop Demo User',
      role: 'TENANT',
      clinicId: tenantClinic.id,
      isActive: true,
      isApproved: true,
      accountStatus: 'ACTIVE',
    },
  });
  await prisma.clinic.update({
    where: { id: tenantClinic.id },
    data: { ownerId: tenantUser.id },
  });
  console.log('✅ Tenant (separate clinic, shop role):', tenantUser.email);

  const defaultHeader = (displayName: string) => ({
    doctorName: displayName,
    doctorLogo: null as string | null,
  });

  await prisma.doctorPanelSettings.upsert({
    where: { userId: demoUser.id },
    update: { header: defaultHeader(demoUser.name) },
    create: { userId: demoUser.id, header: defaultHeader(demoUser.name) },
  });
  await prisma.doctorPanelSettings.upsert({
    where: { userId: staffDoctor.id },
    update: { header: defaultHeader(staffDoctor.name) },
    create: { userId: staffDoctor.id, header: defaultHeader(staffDoctor.name) },
  });
  console.log('✅ Doctor panel settings (header branding) for clinic admin + staff doctor');

  await prisma.patient.upsert({
    where: { id: 'seed-doctor-panel-patient-1' },
    update: { userId: staffDoctor.id, clinicId: demoClinic.id },
    create: {
      id: 'seed-doctor-panel-patient-1',
      regNo: 'REG-1001',
      name: 'Sample Patient One',
      age: 32,
      gender: 'F',
      phone: '+8801700000001',
      email: 'sample1@example.com',
      address: 'Dhaka',
      clinicId: demoClinic.id,
      userId: staffDoctor.id,
    },
  });
  await prisma.patient.upsert({
    where: { id: 'seed-doctor-panel-patient-2' },
    update: { userId: staffDoctor.id, clinicId: demoClinic.id },
    create: {
      id: 'seed-doctor-panel-patient-2',
      regNo: 'REG-1002',
      name: 'Sample Patient Two',
      age: 45,
      gender: 'M',
      phone: '+8801700000002',
      clinicId: demoClinic.id,
      userId: staffDoctor.id,
    },
  });
  console.log('✅ Sample patients for doctor@baigdentpro.com (practice panel)');

  if (omixEmailEnv && omixPasswordEnv) {
    const omixHash = await bcrypt.hash(omixPasswordEnv, 12);
    const omixUser = await prisma.user.upsert({
      where: { email: omixEmailEnv },
      update: {
        password: omixHash,
        clinicId: demoClinic.id,
        role: 'CLINIC_ADMIN',
        clinicName: demoClinic.name,
        name: 'Omix Service',
        isActive: true,
        isApproved: true,
      },
      create: {
        email: omixEmailEnv,
        password: omixHash,
        name: 'Omix Service',
        role: 'CLINIC_ADMIN',
        clinicId: demoClinic.id,
        clinicName: demoClinic.name,
        isActive: true,
        isApproved: true,
      },
    });
    console.log('✅ Omix service clinic admin:', omixUser.email);
  }

  const products = [
    { name: 'Oral-B Electric Toothbrush', slug: 'oral-b-electric-toothbrush', price: 2500, category: 'TOOTHBRUSH', description: 'Advanced electric toothbrush with smart timer', stock: 50, isFeatured: true },
    { name: 'Colgate Total Toothpaste', slug: 'colgate-total-toothpaste', price: 180, category: 'TOOTHPASTE', description: '12-hour protection toothpaste', stock: 100 },
    { name: 'Listerine Mouthwash 500ml', slug: 'listerine-mouthwash-500ml', price: 350, category: 'MOUTHWASH', description: 'Antiseptic mouthwash for fresh breath', stock: 75 },
    { name: 'Oral-B Dental Floss', slug: 'oral-b-dental-floss', price: 120, category: 'DENTAL_FLOSS', description: 'Waxed dental floss for easy cleaning', stock: 200 },
    { name: 'Crest Whitening Strips', slug: 'crest-whitening-strips', price: 3500, category: 'WHITENING', description: 'Professional whitening strips - 14 day treatment', stock: 30, isFeatured: true },
    { name: 'Dental Mirror & Explorer Set', slug: 'dental-mirror-explorer-set', price: 450, category: 'DENTAL_TOOLS', description: 'Professional dental inspection tools', stock: 40 },
    { name: 'Disposable Gloves Box (100)', slug: 'disposable-gloves-box-100', price: 800, category: 'CLINIC_SUPPLIES', description: 'Latex-free examination gloves', stock: 60 },
    { name: 'Orthodontic Wax', slug: 'orthodontic-wax', price: 150, category: 'ORTHODONTIC', description: 'Relief wax for braces', stock: 150 },
    { name: 'Kids Spider-Man Toothbrush', slug: 'kids-spiderman-toothbrush', price: 250, category: 'KIDS_DENTAL', description: 'Fun toothbrush for children', stock: 80, isFeatured: true },
    { name: 'Sensodyne Repair & Protect', slug: 'sensodyne-repair-protect', price: 220, category: 'TOOTHPASTE', description: 'For sensitive teeth', stock: 90 },
    { name: 'Waterpik Water Flosser', slug: 'waterpik-water-flosser', price: 5500, category: 'DENTAL_TOOLS', description: 'Electric water flosser for deep cleaning', stock: 25, isFeatured: true },
    { name: 'Tongue Cleaner', slug: 'tongue-cleaner', price: 80, category: 'DENTAL_TOOLS', description: 'Stainless steel tongue scraper', stock: 120 },
    { name: 'Dental Face Masks Box (50)', slug: 'dental-face-masks-50', price: 500, category: 'CLINIC_SUPPLIES', description: '3-ply surgical masks', stock: 100 },
    { name: 'Retainer Case', slug: 'retainer-case', price: 200, category: 'ORTHODONTIC', description: 'Protective case for retainers', stock: 70 },
    { name: 'Parodontax Toothpaste', slug: 'parodontax-toothpaste', price: 280, category: 'TOOTHPASTE', description: 'For bleeding gums', stock: 60 },
  ];

  for (const product of products) {
    await prisma.shopProduct.upsert({
      where: { slug: product.slug },
      update: {
        name: product.name,
        price: product.price,
        category: product.category,
        description: product.description ?? null,
        stock: product.stock,
        isFeatured: product.isFeatured ?? false,
      },
      create: {
        name: product.name,
        slug: product.slug,
        price: product.price,
        category: product.category,
        description: product.description ?? null,
        stock: product.stock,
        isFeatured: product.isFeatured ?? false,
      },
    });
  }

  console.log(`✅ Seeded ${products.length} public shop products (ShopProduct)`);

  const demoPairs: { email: string; password: string }[] = [
    { email: 'demo@baigdentpro.com', password: DEMO_SEED_PASSWORD },
    { email: 'doctor@baigdentpro.com', password: DEMO_SEED_PASSWORD },
    { email: 'receptionist@baigdentpro.com', password: DEMO_SEED_PASSWORD },
    { email: 'tenant@baigdentpro.com', password: DEMO_SEED_PASSWORD },
    { email: SUPERADMIN_SEED_EMAIL, password: SUPERADMIN_SEED_PASSWORD },
  ];
  if (omixEmailEnv && omixPasswordEnv) {
    demoPairs.push({ email: omixEmailEnv, password: omixPasswordEnv });
  }
  await syncSupabaseAuthPairs(demoPairs);

  console.log('\n📋 Demo Login:');
  console.log('   Email: demo@baigdentpro.com');
  console.log('   Password: <DEMO_SEED_PASSWORD>');

  console.log('[SEED] DEMO DATA COMPLETE');
}

async function main() {
  console.log('🌱 Seeding database...');

  const rawMode = process.env.SEED_MODE?.trim().toLowerCase();
  const modeLabel =
    rawMode === 'demo' ? 'demo' : rawMode === 'core' ? 'core' : rawMode?.length ? `default (${rawMode})` : 'default';
  console.log(`[SEED] MODE = ${modeLabel}`);

  if (rawMode === 'demo' && process.env.NODE_ENV === 'production') {
    console.warn(
      '[SEED] WARNING: SEED_MODE=demo against NODE_ENV=production — demo users, shop products, and sample data will be written to DATABASE_URL.'
    );
  }

  if (rawMode === 'demo') {
    await ensureCoreBootstrap();
    await seedDemoData();
  } else if (rawMode === 'core') {
    await ensureCoreBootstrap();
  } else {
    await ensureCoreBootstrap();
  }

  console.log('🎉 Seed run finished!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
