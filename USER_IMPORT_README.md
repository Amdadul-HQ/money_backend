# User Import API - Quick Start Guide

## Installation

Before testing the import API, you need to install the required dependencies:

```bash
cd "/media/amdadulhq/New Volume/MoneyContributionManagementSystem/backend"

# Install dependencies
npm install
# or
pnpm install
```

## API Endpoints

### 1. Import Users from Excel
**POST** `/admin/import/users`

**Authentication:** Requires Admin JWT token

**Request:**
- **Content-Type:** `multipart/form-data`
- **Body:**
  - `file`: Excel file (.xlsx or .xls) - **Required**
  - `defaultPassword`: String (default: "User@123") - Optional
  - `defaultStatus`: "PENDING" | "ACTIVE" | "SUSPENDED" | "INACTIVE" | "REJECTED" (default: "ACTIVE") - Optional
  - `skipDuplicates`: Boolean (default: true) - Optional

### 2. Get Template Structure
**GET** `/admin/import/template`

**Authentication:** Requires Admin JWT token

Returns the expected Excel column structure with sample data.

## Excel File Format

### Required Columns
- **Name**: User's full name
- **Email**: User's email address (must be unique)
- **Phone**: User's phone number (must be unique)

### Optional Columns
- **Father Name**: Father's name
- **Mother Name**: Mother's name
- **Address**: Full address
- **Occupation**: User's occupation
- **NID**: National ID number (must be unique if provided)
- **Reference Person**: Reference person's name
- **Reference Phone**: Reference person's phone

> **Note:** Column names are case-insensitive. You can use "Email", "email", "EMAIL", etc.

## Sample Excel Structure

| Name | Email | Phone | Father Name | Mother Name | Address | Occupation | NID | Reference Person | Reference Phone |
|------|-------|-------|-------------|-------------|---------|----------|------|-----------------|----------------|
| John Doe | john.doe@example.com | 01712345678 | Michael Doe | Sarah Doe | Dhaka | Engineer | 1234567890123 | Jane Smith | 01798765432 |
| Alice Smith | alice.smith@example.com | 01823456789 | Bob Smith | Mary Smith | Chittagong | Teacher | | | |

## Default Settings

- **Default Password:** `User@123` (all imported users)
- **Default Status:** `ACTIVE`
- **Duplicate Handling:** Skip duplicates (existing users with same email/phone/NID)

## Testing

1. **Start the server:**
   ```bash
   pnpm run start:dev
   ```

2. **Create an Excel file** with the required columns

3. **Get admin token** by logging in as an admin

4. **Test import using cURL:**
   ```bash
   curl -X POST http://localhost:3000/admin/import/users \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
     -F "file=@your-users-file.xlsx"
   ```

5. **Check database:**
   ```bash
   pnpm run prisma:studio
   ```

6. **Test login** with imported user:
   - Email: (from Excel file)
   - Password: `User@123`

## Response Format

```json
{
  "success": true,
  "message": "Import completed: 10 users created, 2 skipped (duplicates), 1 failed",
  "data": {
    "totalRows": 13,
    "successCount": 10,
    "failedCount": 1,
    "skippedCount": 2,
    "errors": [
      {
        "row": 5,
        "email": "invalid",
        "name": "Test User",
        "errors": ["Invalid email format"]
      }
    ],
    "skippedEmails": [
      "existing.user@example.com"
    ]
  }
}
```

## Error Messages

- **No file uploaded:** "No file uploaded"
- **Invalid file type:** "Invalid file type. Please upload an Excel file (.xlsx or .xls)"
- **Empty file:** "Excel file is empty"
- **Missing required field:** "Name/Email/Phone is required"
- **Invalid email:** "Invalid email format"
- **Duplicate user:** User is skipped or import fails (based on `skipDuplicates` setting)

## File Limits

- **Max file size:** 10MB
- **Supported formats:** .xlsx, .xls

For more details, see the [complete walkthrough](walkthrough.md).
