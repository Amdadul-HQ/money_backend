/* eslint-disable @typescript-eslint/no-misused-promises */
// prisma/seed.ts
import { PrismaClient, Role, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Step 1: Create the User
  const user = await prisma.user.create({
    data: {
      email: 'admin@gmail.com',
      name: 'Admin User',
      role: Role.ADMIN,
      isVerified: true,
      status: UserStatus.Active,
    },
  });

  // Step 2: Create the Auth entry for the User
  const hashedPassword = await bcrypt.hash('admin@123', 10);

  const auth = await prisma.auth.create({
    data: {
      email: user.email,
      name: user.name,
      password: hashedPassword,
      role: Role.ADMIN,
      userId: user.id,
    },
  });

  console.log('Admin user created:', { user, auth });
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
