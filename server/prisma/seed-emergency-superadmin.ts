import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'superadmin@baigdentpro.com';
  const password = 'password123';
  const clinicId = 'seed-clinic-baigdentpro';
  const clinicName = 'BaigDentPro Platform';

  const hashedPassword = await bcrypt.hash(password, 12);

  await prisma.clinic.upsert({
    where: { id: clinicId },
    update: {
      name: clinicName,
      isActive: true,
      plan: 'PREMIUM',
    },
    create: {
      id: clinicId,
      name: clinicName,
      email,
      isActive: true,
      plan: 'PREMIUM',
    },
  });

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      isActive: true,
      isApproved: true,
      accountStatus: 'ACTIVE',
      clinicId,
      clinicName,
      name: 'Emergency Super Admin',
    },
    create: {
      email,
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      isActive: true,
      isApproved: true,
      accountStatus: 'ACTIVE',
      clinicId,
      clinicName,
      name: 'Emergency Super Admin',
    },
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
      isApproved: true,
      accountStatus: true,
      clinicId: true,
    },
  });

  await prisma.clinic.update({
    where: { id: clinicId },
    data: { ownerId: user.id },
  });

  console.log('✅ SUPERADMIN READY');
  console.log('EMAIL:', email);
  console.log('PASSWORD: [set by script constant]');
}

main()
  .catch((e) => {
    console.error('SEED ERROR:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
