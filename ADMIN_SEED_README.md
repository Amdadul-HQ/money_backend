# Admin User Seeding Script

This script creates admin users in your database for testing and development purposes.

## 🚀 Quick Start

Run the seeding script:

```bash
npm run seed:admin
```

Or with pnpm:

```bash
pnpm seed:admin
```

## 👥 Default Admin Users

The script creates the following admin users:

### 1. Super Administrator
- **Email:** `superadmin@example.com`
- **Password:** `SuperAdmin@123`
- **Role:** `SUPER_ADMIN`
- **Phone:** `+8801700000001`

### 2. Admin User
- **Email:** `admin@example.com`
- **Password:** `Admin@123`
- **Role:** `ADMIN`
- **Phone:** `+8801700000002`

### 3. Test Admin
- **Email:** `testadmin@example.com`
- **Password:** `TestAdmin@123`
- **Role:** `ADMIN`
- **Phone:** `+8801700000003`

## 📋 Features

- ✅ **Password Hashing:** Uses bcrypt with 10 salt rounds
- ✅ **Duplicate Prevention:** Checks for existing users by email and phone
- ✅ **Member Stats:** Automatically creates MemberStats for each admin
- ✅ **Detailed Logging:** Shows creation status and credentials
- ✅ **Error Handling:** Gracefully handles errors and conflicts
- ✅ **Active Status:** All admins are created with `ACTIVE` status

## 🔧 Customization

To add or modify admin users, edit the `adminUsers` array in `prisma/seed-admin.ts`:

```typescript
const adminUsers: AdminUser[] = [
  {
    name: 'Your Admin Name',
    email: 'youradmin@example.com',
    phone: '+8801700000004',
    password: 'YourPassword@123',
    role: Role.ADMIN, // or Role.SUPER_ADMIN
    status: MemberStatus.ACTIVE,
    // ... other optional fields
  },
];
```

## 🔐 Security Notes

> [!WARNING]
> - These are **test credentials** for development only
> - **Never use these credentials in production**
> - Change all passwords before deploying to production
> - Store production credentials securely (environment variables, secrets manager)

## 📝 What Gets Created

For each admin user:
1. **User Record** in the `User` table with:
   - Auto-generated UUID
   - Auto-incremented member ID
   - Hashed password
   - Assigned role (ADMIN or SUPER_ADMIN)
   - Active status
   
2. **Member Stats Record** initialized with:
   - Linked to the user's member ID
   - Default values for all financial tracking fields

## 🧪 Testing

After running the seed script, you can:

1. **Login via API:** Use any of the credentials above to test authentication
2. **Check Prisma Studio:** Run `npm run prisma:studio` to view the created users
3. **Test Admin Endpoints:** Verify admin-only routes work with these credentials

## 🔄 Re-running the Script

The script is **idempotent** - it can be run multiple times safely:
- Existing users are skipped (based on email/phone)
- Only new users are created
- You'll see a summary of created/skipped/failed users

## 🛠️ Troubleshooting

### Error: "User already exists"
- This is expected if users were already created
- The script will skip existing users automatically

### Error: "Database connection failed"
- Ensure your database is running
- Check your `.env` file has the correct `DATABASE_URL`
- Run `npm run prisma:generate` to ensure Prisma Client is up to date

### Error: "bcrypt error"
- Make sure bcrypt is installed: `pnpm install bcrypt`
- If on Windows, you might need to rebuild: `pnpm rebuild bcrypt`

## 📂 Related Files

- **Seed Script:** [`prisma/seed-admin.ts`](file:///media/amdadulhq/New%20Volume1/MoneyContributionManagementSystem/backend/prisma/seed-admin.ts)
- **Database Schema:** [`prisma/schema.prisma`](file:///media/amdadulhq/New%20Volume1/MoneyContributionManagementSystem/backend/prisma/schema.prisma)
- **Package Scripts:** [`package.json`](file:///media/amdadulhq/New%20Volume1/MoneyContributionManagementSystem/backend/package.json)
