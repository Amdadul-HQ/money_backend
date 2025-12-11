/**
 * Admin User Seeding Script
 * 
 * This script creates admin users for testing and development purposes.
 * Run with: npm run seed:admin
 * 
 * Default credentials:
 * - Super Admin: superadmin@example.com / SuperAdmin@123
 * - Admin: admin@example.com / Admin@123
 */

import { PrismaClient, Role, MemberStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

interface AdminUser {
    name: string;
    email: string;
    phone: string;
    password: string;
    role: Role;
    status: MemberStatus;
    fatherName?: string;
    motherName?: string;
    address?: string;
    occupation?: string;
    joiningDate?: Date;
}

const SALT_ROUNDS = 10;

const adminUsers: AdminUser[] = [
    {
        name: 'Super Administrator',
        email: 'superadmin@example.com',
        phone: '+8801700000001',
        password: 'SuperAdmin@123',
        role: Role.SUPER_ADMIN,
        status: MemberStatus.ACTIVE,
        fatherName: 'N/A',
        motherName: 'N/A',
        address: 'System Administrator',
        occupation: 'System Administrator',
        joiningDate: new Date('2024-01-01'),
    },
    {
        name: 'Admin User',
        email: 'admin@example.com',
        phone: '+8801700000002',
        password: 'Admin@123',
        role: Role.ADMIN,
        status: MemberStatus.ACTIVE,
        fatherName: 'N/A',
        motherName: 'N/A',
        address: 'System Administrator',
        occupation: 'Administrator',
        joiningDate: new Date('2024-01-01'),
    },
    {
        name: 'Test Admin',
        email: 'testadmin@example.com',
        phone: '+8801700000003',
        password: 'TestAdmin@123',
        role: Role.ADMIN,
        status: MemberStatus.ACTIVE,
        fatherName: 'Test Father',
        motherName: 'Test Mother',
        address: 'Test Address, Dhaka',
        occupation: 'Test Occupation',
        joiningDate: new Date('2024-01-15'),
    },
];

async function seedAdminUsers() {
    console.log('🌱 Starting admin user seeding...\n');

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const userData of adminUsers) {
        try {
            // Check if user already exists
            const existingUser = await prisma.user.findFirst({
                where: {
                    OR: [
                        { email: userData.email },
                        { phone: userData.phone },
                    ],
                },
            });

            if (existingUser) {
                console.log(`⏭️  Skipped: ${userData.name} (${userData.email}) - User already exists`);
                skipped++;
                continue;
            }

            // Hash the password
            const hashedPassword = await bcrypt.hash(userData.password, SALT_ROUNDS);

            // Create the user
            const user = await prisma.user.create({
                data: {
                    name: userData.name,
                    email: userData.email,
                    phone: userData.phone,
                    password: hashedPassword,
                    role: userData.role,
                    status: userData.status,
                    fatherName: userData.fatherName,
                    motherName: userData.motherName,
                    address: userData.address,
                    occupation: userData.occupation,
                    joiningDate: userData.joiningDate,
                },
            });

            // Create member stats for the user
            await prisma.memberStats.create({
                data: {
                    memberId: user.memberId,
                },
            });

            console.log(`✅ Created: ${userData.name} (${userData.email})`);
            console.log(`   Role: ${userData.role}`);
            console.log(`   Member ID: ${user.memberId}`);
            console.log(`   Password: ${userData.password}\n`);
            created++;
        } catch (error) {
            console.error(`❌ Error creating ${userData.name}:`, error.message);
            errors++;
        }
    }

    console.log('\n📊 Seeding Summary:');
    console.log(`   ✅ Created: ${created}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📝 Total processed: ${adminUsers.length}\n`);

    if (created > 0) {
        console.log('🔐 Default Admin Credentials:');
        console.log('─'.repeat(60));
        adminUsers.forEach((user) => {
            console.log(`   Email: ${user.email}`);
            console.log(`   Password: ${user.password}`);
            console.log(`   Role: ${user.role}`);
            console.log('─'.repeat(60));
        });
    }
}

async function main() {
    try {
        await seedAdminUsers();
    } catch (error) {
        console.error('❌ Fatal error during seeding:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main()
    .then(() => {
        console.log('\n✅ Seeding completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Seeding failed:', error);
        process.exit(1);
    });
