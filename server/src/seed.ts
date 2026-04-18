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

async function main() {
  console.log('🌱 Seeding database...');

  await seedCatalogPlans();

  const demoClinic = await prisma.clinic.upsert({
    where: { id: 'seed-clinic-baigdentpro' },
    update: { name: 'BaigDentPro Dental Clinic', plan: 'PREMIUM', isActive: true },
    create: {
      id: 'seed-clinic-baigdentpro',
      name: 'BaigDentPro Dental Clinic',
      plan: 'PREMIUM',
      isActive: true,
      phone: '+880 1617-180711',
      email: 'info@baigdentpro.com',
    },
  });

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

  const hashedPassword = await bcrypt.hash('password123', 12);
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@baigdentpro.com' },
    update: {
      clinicId: demoClinic.id,
      role: 'CLINIC_ADMIN',
      clinicName: demoClinic.name,
      isActive: true,
      isApproved: true,
    },
    create: {
      email: 'demo@baigdentpro.com',
      password: hashedPassword,
      name: 'Dr. Demo',
      role: 'CLINIC_ADMIN',
      clinicId: demoClinic.id,
      clinicName: demoClinic.name,
      clinicAddress: 'Dhaka, Bangladesh',
      clinicPhone: '+880 1617-180711',
      clinicEmail: 'info@baigdentpro.com',
      degree: 'BDS, MDS',
      specialization: 'General Dentistry',
      isActive: true,
      isApproved: true,
    },
  });

  console.log('✅ Demo clinic admin:', demoUser.email, '(manages doctor access for this clinic)');

  await prisma.clinic.update({
    where: { id: demoClinic.id },
    data: { ownerId: demoUser.id, plan: 'PREMIUM' },
  });

  const staffDoctor = await prisma.user.upsert({
    where: { email: 'doctor@baigdentpro.com' },
    update: {
      clinicId: demoClinic.id,
      clinicName: demoClinic.name,
      role: 'DOCTOR',
      isActive: true,
      isApproved: true,
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
    },
  });
  console.log('✅ Staff doctor (same clinic):', staffDoctor.email, '/ password123');

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

  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@baigdentpro.com' },
    update: { isApproved: true, isActive: true, clinicId: demoClinic.id },
    create: {
      email: 'superadmin@baigdentpro.com',
      password: await bcrypt.hash('super123', 12),
      name: 'Super Admin',
      role: 'SUPER_ADMIN',
      clinicId: demoClinic.id,
      clinicName: 'BaigDentPro Platform',
      isApproved: true,
      isActive: true,
    },
  });
  console.log('✅ Created super admin:', superAdmin.email);

  const omixEmail = process.env.OMIX_SERVICE_USER_EMAIL?.trim();
  const omixPassword = process.env.OMIX_SERVICE_USER_PASSWORD?.trim();
  if (omixEmail && omixPassword) {
    const omixHash = await bcrypt.hash(omixPassword, 12);
    const omixUser = await prisma.user.upsert({
      where: { email: omixEmail },
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
        email: omixEmail,
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

  if (isSupabaseConfigured()) {
    const authSeeds: { email: string; password: string }[] = [
      { email: 'demo@baigdentpro.com', password: 'password123' },
      { email: 'doctor@baigdentpro.com', password: 'password123' },
      { email: 'superadmin@baigdentpro.com', password: 'super123' },
    ];
    const omixE = process.env.OMIX_SERVICE_USER_EMAIL?.trim();
    const omixP = process.env.OMIX_SERVICE_USER_PASSWORD?.trim();
    if (omixE && omixP) {
      authSeeds.push({ email: omixE, password: omixP });
    }
    for (const { email, password } of authSeeds) {
      const r = await syncSupabasePasswordForEmail(email, password);
      if (r.synced) console.log('✅ Supabase Auth user:', email);
      else if (r.note && r.note !== 'supabase_not_configured') console.warn('⚠️ Supabase Auth', email, r.note);
    }
  } else {
    console.log('ℹ️  Set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY to sync seeded users to Supabase Auth.');
  }

  console.log('🎉 Seeding completed!');
  console.log('\n📋 Demo Login:');
  console.log('   Email: demo@baigdentpro.com');
  console.log('   Password: password123');
  if (omixEmail && omixPassword) {
    console.log('\n📋 Omix service user seeded (OMIX_SERVICE_USER_* in server/.env).');
    console.log('   Email:', omixEmail);
  }
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
