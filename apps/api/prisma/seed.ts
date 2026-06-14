import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const defaultUsers = [
  {
    email: 'superadmin@mithaqyn.com',
    password: 'Admin@Mithaqyn2024!',
    firstName: 'Super',
    lastName: 'Admin',
    role: UserRole.SUPER_ADMIN,
  },
  {
    email: 'legal@mithaqyn.com',
    password: 'Legal@Mithaqyn2024!',
    firstName: 'Legal',
    lastName: 'Admin',
    role: UserRole.LEGAL_ADMIN,
  },
  {
    email: 'manager@mithaqyn.com',
    password: 'Manager@Mithaqyn2024!',
    firstName: 'Contract',
    lastName: 'Manager',
    role: UserRole.CONTRACT_MANAGER,
  },
  {
    email: 'reviewer@mithaqyn.com',
    password: 'Reviewer@Mithaqyn2024!',
    firstName: 'Contract',
    lastName: 'Reviewer',
    role: UserRole.REVIEWER,
  },
  {
    email: 'auditor@mithaqyn.com',
    password: 'Auditor@Mithaqyn2024!',
    firstName: 'System',
    lastName: 'Auditor',
    role: UserRole.AUDITOR,
  },
];

async function main() {
  console.log('Seeding Mithaqyn database...');

  for (const u of defaultUsers) {
    const passwordHash = await bcrypt.hash(u.password, 12);
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        passwordHash,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
      },
    });
    console.log(`  ✓ User: ${u.email} (${u.role})`);
  }

  const counterparty = await prisma.counterparty.upsert({
    where: { id: 'demo-counterparty-001' },
    update: {},
    create: {
      id: 'demo-counterparty-001',
      name: 'Acme Corporation',
      type: 'VENDOR',
      email: 'contracts@acmecorp.com',
      country: 'US',
    },
  });
  console.log(`  ✓ Counterparty: ${counterparty.name}`);

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
