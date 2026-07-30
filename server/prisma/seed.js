import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';

  const adminHash = await bcrypt.hash(adminPassword, 10);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: Role.ADMIN, passwordHash: adminHash },
    create: {
      email: adminEmail,
      passwordHash: adminHash,
      role: Role.ADMIN,
      fullName: 'Administrator'
    }
  });

  const demoHash = await bcrypt.hash('User@12345', 10);
  await prisma.user.upsert({
    where: { email: 'customer@example.com' },
    update: { passwordHash: demoHash, role: Role.USER },
    create: {
      email: 'customer@example.com',
      passwordHash: demoHash,
      role: Role.USER,
      fullName: 'Demo Customer'
    }
  });

  const count = await prisma.product.count();
  if (count === 0) {
    await prisma.product.createMany({
      data: [
        {
          title: 'Starter Account',
          description: 'Tài khoản khởi đầu, phù hợp người mới.',
          category: 'Game',
          price: 490000,
          stock: 12,
          imageUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80'
        },
        {
          title: 'Pro Account',
          description: 'Tài khoản nâng cao với nhiều tính năng.',
          category: 'Game',
          price: 1290000,
          stock: 6,
          imageUrl: 'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?auto=format&fit=crop&w=1200&q=80'
        },
        {
          title: 'Premium Account',
          description: 'Gói premium cho nhu cầu cao.',
          category: 'Service',
          price: 2590000,
          stock: 3,
          imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80'
        }
      ]
    });
  }

  console.log('Seed completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
