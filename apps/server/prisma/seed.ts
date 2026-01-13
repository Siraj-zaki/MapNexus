import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@indoormap.com' },
    update: {},
    create: {
      email: 'admin@indoormap.com',
      password: adminPassword,
      name: 'Admin User',
      role: 'ADMIN',
    },
  });
  console.log(`✅ Admin user created: ${admin.email}`);

  // Create demo user
  const demoPassword = await bcrypt.hash('demo123', 12);
  const demo = await prisma.user.upsert({
    where: { email: 'demo@indoormap.com' },
    update: {},
    create: {
      email: 'demo@indoormap.com',
      password: demoPassword,
      name: 'Demo User',
      role: 'VIEWER',
    },
  });
  console.log(`✅ Demo user created: ${demo.email}`);

  console.log('');
  console.log('📋 Test Credentials:');
  console.log('   Admin: admin@indoormap.com / admin123');
  console.log('   Demo:  demo@indoormap.com / demo123');
  console.log('');
  console.log('✨ Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
