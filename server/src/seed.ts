import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const hashedPassword = await bcrypt.hash('password123', 12);
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@baigmed.com' },
    update: {},
    create: {
      email: 'demo@baigmed.com',
      password: hashedPassword,
      name: 'Dr. Demo',
      clinicName: 'BaigMed Dental Clinic',
      clinicAddress: 'Dhaka, Bangladesh',
      clinicPhone: '+880 1617-180711',
      clinicEmail: 'info@baigmed.com',
      degree: 'BDS, MDS',
      specialization: 'General Dentistry',
    },
  });

  console.log('✅ Created demo user:', demoUser.email);

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
    await prisma.product.upsert({
      where: { slug: product.slug },
      update: {},
      create: product as any,
    });
  }

  console.log(`✅ Created ${products.length} products`);

  console.log('🎉 Seeding completed!');
  console.log('\n📋 Demo Login:');
  console.log('   Email: demo@baigmed.com');
  console.log('   Password: password123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
