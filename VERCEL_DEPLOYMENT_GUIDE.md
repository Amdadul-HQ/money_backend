# Complete Guide: Deploying NestJS Backend to Vercel

This comprehensive guide will walk you through deploying your NestJS backend application to Vercel step by step.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Project Setup](#project-setup)
4. [Vercel Configuration](#vercel-configuration)
5. [Environment Variables](#environment-variables)
6. [Database Setup](#database-setup)
7. [Build Configuration](#build-configuration)
8. [Deployment Steps](#deployment-steps)
9. [Post-Deployment](#post-deployment)
10. [Custom Domain Setup](#custom-domain-setup)
11. [Monitoring & Logs](#monitoring--logs)
12. [Troubleshooting](#troubleshooting)
13. [Best Practices](#best-practices)

---

## Prerequisites

Before you begin, ensure you have:

- ✅ A Vercel account ([sign up here](https://vercel.com/signup))
- ✅ Vercel CLI installed (`npm i -g vercel` or `pnpm add -g vercel`)
- ✅ Git repository (GitHub, GitLab, or Bitbucket) with your code pushed
- ✅ PostgreSQL database (hosted on Vercel Postgres, Supabase, Neon, or any PostgreSQL provider)
- ✅ Node.js installed (v18 or higher recommended)
- ✅ pnpm installed (this project uses pnpm as package manager)
- ✅ All environment variables ready

### Installing pnpm (if not already installed)

```bash
# Using npm
npm install -g pnpm

# Using Homebrew (macOS)
brew install pnpm

# Using curl
curl -fsSL https://get.pnpm.io/install.sh | sh -
```

### Installing Vercel CLI

```bash
# Using npm
npm install -g vercel

# Using pnpm (recommended for this project)
pnpm add -g vercel

# Using yarn
yarn global add vercel
```

---

## Pre-Deployment Checklist

Before deploying, make sure you've completed these steps:

- [ ] **Code is committed and pushed to Git**
  ```bash
  git status
  git add .
  git commit -m "Ready for deployment"
  git push origin main
  ```

- [ ] **All dependencies are installed**
  ```bash
  pnpm install
  ```

- [ ] **Project builds successfully locally**
  ```bash
  pnpm build
  ```

- [ ] **Prisma Client is generated**
  ```bash
  pnpm prisma:generate
  ```

- [ ] **Environment variables are documented** (see [Environment Variables](#environment-variables))

- [ ] **Database is set up and accessible** (see [Database Setup](#database-setup))

- [ ] **CORS origins are configured** (check `api/index.ts`)

- [ ] **`vercel.json` is configured correctly**

- [ ] **`api/index.ts` exists and is properly set up**

---

## Project Setup

### Step 1: Install Vercel CLI (if not already installed)

```bash
# Using npm
npm install -g vercel

# Using pnpm
pnpm add -g vercel

# Using yarn
yarn global add vercel
```

### Step 2: Verify Project Structure

Your project should have the following structure:

```
money_backend/
├── api/
│   └── index.ts          # ✅ Serverless function handler (REQUIRED)
├── src/
│   ├── main.ts           # NestJS bootstrap file
│   └── ...
├── prisma/
│   ├── schema.prisma     # Prisma schema
│   └── migrations/       # Database migrations
├── vercel.json           # ✅ Vercel configuration (REQUIRED)
├── package.json          # ✅ With proper build scripts (REQUIRED)
├── tsconfig.json         # TypeScript configuration
└── pnpm-lock.yaml        # pnpm lock file
```

**Critical Files:**
- ✅ `vercel.json` - Must exist in root directory
- ✅ `api/index.ts` - Must exist and export a serverless handler
- ✅ `package.json` - Must have build scripts and dependencies

### Step 3: Test Local Build

Before deploying, test that your project builds correctly:

```bash
# Install dependencies
pnpm install

# Generate Prisma Client
pnpm prisma:generate

# Build the project
pnpm build

# Verify dist folder was created
ls -la dist/
```

If the build succeeds, you're ready to deploy!

---

## Vercel Configuration

### Understanding `vercel.json`

The `vercel.json` file configures how Vercel builds and routes your application:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/index.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "api/index.ts"
    }
  ],
  "functions": {
    "api/index.ts": {
      "maxDuration": 30
    }
  }
}
```

**Key Points:**
- All requests are routed to `api/index.ts`
- Maximum function duration is set to 30 seconds (can be increased to 60s on Pro plan)
- Uses `@vercel/node` builder for Node.js serverless functions

### Understanding `api/index.ts`

This file creates a serverless-compatible NestJS app:
- Caches the app instance for better performance (reduces cold starts)
- Uses Express adapter for NestJS
- Maintains all your middleware, pipes, and filters
- Exports a handler function that Vercel can invoke

**Important Notes:**
- The app is cached after first initialization
- All routes are handled through this single entry point
- CORS configuration should include your frontend URLs
- The global prefix `/ts` is applied to all routes

### Vercel Configuration Options

You can customize `vercel.json` for your needs:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/index.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "api/index.ts"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  },
  "functions": {
    "api/index.ts": {
      "maxDuration": 30,  // Free: 10s, Pro: 60s, Enterprise: 300s
      "memory": 1024      // Optional: Memory allocation in MB
    }
  },
  "regions": ["iad1"]  // Optional: Deploy to specific regions
}
```

**Function Limits:**
- **Free Plan**: 10s max duration, 1GB memory
- **Pro Plan**: 60s max duration, 1GB memory
- **Enterprise Plan**: 300s max duration, up to 3GB memory

---

## Environment Variables

### Required Environment Variables

Based on your `ENVEnum`, you need to set these in Vercel:

#### Core Configuration
```
NODE_ENV=production
PORT=3000 (Vercel handles this automatically)
```

#### Database
```
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
```

#### JWT Configuration
```
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-refresh-secret-key-here
JWT_REFRESH_EXPIRES_IN=7d
```

#### Email Configuration (SMTP)
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM_EMAIL=your-email@gmail.com
SMTP_FROM_NAME=Your App Name
```

#### Password Reset
```
PASSWORD_RESET_TOKEN_EXPIRY=15
FRONTEND_URL=https://your-frontend.vercel.app
```

#### Cloudinary (File Upload)
```
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### How to Add Environment Variables in Vercel

#### Option 1: Via Vercel Dashboard (Recommended)

1. Go to your project on [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on your project
3. Go to **Settings** → **Environment Variables**
4. Add each variable:
   - **Key**: `DATABASE_URL`
   - **Value**: `postgresql://...`
   - **Environment**: Select `Production`, `Preview`, and/or `Development`
5. Click **Save**
6. Repeat for all environment variables

#### Option 2: Via Vercel CLI

```bash
# Set environment variable
vercel env add DATABASE_URL production

# You'll be prompted to enter the value
# Repeat for all variables
```

#### Option 3: Via `.env` file (for local development)

Create a `.env` file in your project root (already in `.gitignore`):

```env
NODE_ENV=production
DATABASE_URL=postgresql://...
JWT_SECRET=...
# ... add all other variables
```

**Note:** Never commit `.env` files to Git!

---

## Database Setup

### Option 1: Vercel Postgres (Recommended for Vercel)

1. Go to your Vercel project dashboard
2. Click **Storage** → **Create Database** → **Postgres**
3. Choose a plan (Hobby plan is free)
4. Create database
5. Copy the `POSTGRES_URL` connection string
6. Use it as your `DATABASE_URL` environment variable

### Option 2: External PostgreSQL (Supabase, Neon, etc.)

1. Create a PostgreSQL database on your preferred provider
2. Get the connection string
3. Add it as `DATABASE_URL` in Vercel environment variables
4. **Important:** Ensure your database allows connections from Vercel's IP addresses

### Running Prisma Migrations

#### Before First Deployment

Run migrations locally pointing to your production database:

```bash
# Set production DATABASE_URL temporarily
export DATABASE_URL="your-production-database-url"

# Run migrations
pnpm prisma:migrate

# Or push schema (for development)
pnpm prisma:push
```

#### Using Vercel Build Command

You can run migrations during build by adding a `vercel-build` script to `package.json`:

```json
{
  "scripts": {
    "vercel-build": "prisma generate && prisma migrate deploy && nest build"
  }
}
```

**Important Notes:**
- `prisma migrate deploy` is safer for production than `prisma migrate dev`
- `prisma migrate deploy` applies pending migrations without creating new ones
- This ensures your production database schema matches your code

**Alternative: Manual Migration Before Deployment**

If you prefer to run migrations manually:

```bash
# 1. Set production database URL
export DATABASE_URL="your-production-database-url"

# 2. Generate Prisma Client
pnpm prisma:generate

# 3. Deploy migrations
pnpm prisma migrate deploy

# 4. Verify schema is up to date
pnpm prisma:validate
```

---

## Build Configuration

### Understanding the Build Process

When Vercel builds your project, it:

1. **Installs dependencies** using `pnpm install` (or your package manager)
2. **Runs build command** (if `vercel-build` script exists, otherwise uses `build`)
3. **Generates Prisma Client** (via `postinstall` script in `package.json`)
4. **Compiles TypeScript** to JavaScript
5. **Creates serverless function** from `api/index.ts`

### Recommended Build Scripts

Your `package.json` should include:

```json
{
  "scripts": {
    "build": "nest build",
    "postinstall": "prisma generate",
    "vercel-build": "prisma generate && prisma migrate deploy && nest build"
  }
}
```

**Explanation:**
- `build`: Standard NestJS build command
- `postinstall`: Automatically runs after `pnpm install` to generate Prisma Client
- `vercel-build`: Custom build command for Vercel (optional but recommended)

### Build Settings in Vercel Dashboard

When configuring your project in Vercel:

- **Framework Preset**: `Other` (or leave blank)
- **Root Directory**: `./` (default, or specify if project is in subdirectory)
- **Build Command**: 
  - Leave blank (uses `vercel-build` if exists, otherwise `build`)
  - OR specify: `pnpm run vercel-build`
- **Output Directory**: `dist` (NestJS default, but not used for serverless)
- **Install Command**: `pnpm install` (or leave blank for auto-detection)
- **Node.js Version**: `18.x` or `20.x` (recommended)

---

## Deployment Steps

### Method 1: Deploy via Vercel Dashboard (Recommended for First Deployment)

#### Step 1: Prepare Your Code

```bash
# Ensure all changes are committed
git status

# Add and commit all files
git add .
git commit -m "Prepare for Vercel deployment"

# Push to your repository
git push origin main
```

#### Step 2: Import Project to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New** → **Project**
3. If this is your first time, connect your Git provider (GitHub, GitLab, or Bitbucket)
4. Select your repository (`money_backend` or your repo name)
5. Click **Import**

#### Step 3: Configure Project Settings

In the project configuration page:

1. **Project Name**: Choose a name (e.g., `money-backend`)
2. **Framework Preset**: Select `Other` or leave as default
3. **Root Directory**: `./` (default)
4. **Build Command**: 
   - Leave blank (will use `vercel-build` if exists, otherwise `build`)
   - OR enter: `pnpm run vercel-build`
5. **Output Directory**: `dist` (not critical for serverless, but good to specify)
6. **Install Command**: `pnpm install` (or leave blank for auto-detection)

#### Step 4: Add Environment Variables

**Before clicking Deploy**, add all environment variables:

1. Scroll down to **Environment Variables** section
2. Click **Add** for each variable
3. Enter:
   - **Key**: e.g., `DATABASE_URL`
   - **Value**: Your actual value
   - **Environment**: Select one or more:
     - ☑️ Production
     - ☑️ Preview
     - ☑️ Development
4. Click **Save**
5. Repeat for all required variables (see [Environment Variables](#environment-variables))

**Pro Tip:** You can add variables after deployment, but you'll need to redeploy for them to take effect.

#### Step 5: Deploy

1. Review all settings
2. Click **Deploy**
3. Wait for the build to complete (usually 2-5 minutes)
4. Once complete, you'll see:
   - ✅ Build successful
   - Your deployment URL: `https://your-project.vercel.app`
   - Option to view logs

#### Step 6: Verify Deployment

```bash
# Test your API
curl https://your-project.vercel.app/ts

# Check Swagger docs
open https://your-project.vercel.app/ts/docs
```

### Method 2: Deploy via Vercel CLI (Recommended for Updates)

#### Step 1: Login to Vercel

```bash
vercel login
```

This will open your browser to authenticate. After successful login, you'll return to the terminal.

#### Step 2: Link Your Project

```bash
# Navigate to your project directory
cd /Users/amdad/Documents/batch_19/money_backend

# Link the project
vercel link
```

Follow the prompts:
- **Set up and deploy?** → `Y`
- **Which scope?** → Select your account/team
- **Link to existing project?** → `N` (for first time) or `Y` (if already exists)
- **Project name?** → Enter a name (e.g., `money-backend`)
- **Directory?** → `./` (default)
- **Override settings?** → `N` (unless you want to change)

This creates a `.vercel` folder (already in `.gitignore`) that stores your project configuration.

#### Step 3: Set Environment Variables

You can set environment variables via CLI:

```bash
# For Production
vercel env add DATABASE_URL production
# Paste your value when prompted, press Enter

vercel env add JWT_SECRET production
vercel env add JWT_EXPIRES_IN production
vercel env add JWT_REFRESH_SECRET production
vercel env add JWT_REFRESH_EXPIRES_IN production

# Email Configuration
vercel env add SMTP_HOST production
vercel env add SMTP_PORT production
vercel env add SMTP_USER production
vercel env add SMTP_PASS production
vercel env add SMTP_FROM_EMAIL production
vercel env add SMTP_FROM_NAME production

# Other variables
vercel env add PASSWORD_RESET_TOKEN_EXPIRY production
vercel env add FRONTEND_URL production
vercel env add CLOUDINARY_CLOUD_NAME production
vercel env add CLOUDINARY_API_KEY production
vercel env add CLOUDINARY_API_SECRET production

# For Preview environment (repeat with 'preview' instead of 'production')
vercel env add DATABASE_URL preview
# ... repeat for all variables

# For Development environment (repeat with 'development' instead of 'production')
vercel env add DATABASE_URL development
# ... repeat for all variables
```

**Alternative: Bulk Import from .env file**

```bash
# Pull existing env vars (if any)
vercel env pull .env.local

# Edit .env.local with all your variables
# Then push them (this is a manual process - you'll need to add each one)
```

#### Step 4: Deploy

```bash
# Deploy to preview environment (creates a preview URL)
vercel

# Deploy to production
vercel --prod
```

**What happens:**
- Vercel builds your project
- Uploads the build artifacts
- Creates serverless functions
- Provides you with a deployment URL

**Output example:**
```
Vercel CLI 32.x.x
🔍  Inspect: https://vercel.com/your-project/abc123
✅  Production: https://your-project.vercel.app [copied to clipboard]
```

#### Step 5: View Deployment Logs

```bash
# View logs for latest deployment
vercel logs

# View logs for specific deployment
vercel logs [deployment-url]
```

### Method 3: Automatic Deployments (Recommended for Ongoing Development)

Once your project is connected to Git via Vercel Dashboard:

**Automatic Deployment Rules:**
- ✅ **Push to `main` branch** → Automatic production deployment
- ✅ **Push to other branches** → Automatic preview deployment
- ✅ **Pull requests** → Automatic preview deployment with unique URL
- ✅ **Merge to `main`** → Automatic production deployment

**Benefits:**
- No need to run `vercel --prod` manually
- Every code change is automatically deployed
- Preview deployments allow testing before production
- Easy rollback to previous deployments

**How to Enable:**
1. Connect your Git repository in Vercel Dashboard (done during initial setup)
2. Ensure your repository is properly connected
3. Push to your branch - deployment happens automatically!

**Deployment Status:**
- Check deployment status in Vercel Dashboard
- Each deployment gets a unique URL
- You can view build logs, function logs, and analytics

**Branch Protection:**
- You can configure branch protection in Vercel
- Require manual approval for production deployments
- Set up deployment checks and gates

---

## Post-Deployment

### 1. Update CORS Configuration

After deployment, update your frontend URL in `api/index.ts`:

```typescript
app.enableCors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://your-frontend.vercel.app', // Add your production frontend URL
    process.env.FRONTEND_URL || '',
  ].filter(Boolean),
  // ...
});
```

Then redeploy.

### 2. Test Your API

Your API endpoints will be available at:
- **Base URL**: `https://your-project.vercel.app`
- **API Prefix**: `/ts` (as configured in your app)
- **Swagger Docs**: `https://your-project.vercel.app/ts/docs`

**Example API calls:**
```bash
# Health check
curl https://your-project.vercel.app/ts

# Swagger docs
open https://your-project.vercel.app/ts/docs
```

### 3. Update Frontend API URL

Update your frontend application to use the new Vercel URL:
```
https://your-project.vercel.app/ts
```

### 4. Run Database Migrations

If you haven't already:
```bash
# Connect to production database
export DATABASE_URL="your-production-database-url"
pnpm prisma:migrate deploy
```

### 5. Seed Admin User (if needed)

If you need to seed an admin user in production:

```bash
# Set production database URL
export DATABASE_URL="your-production-database-url"

# Run seed script
pnpm seed:admin
```

**Important:** Only run this once, or ensure your seed script is idempotent (won't create duplicates).

### 6. Verify All Endpoints

Test your key endpoints:

```bash
# Base health check
curl https://your-project.vercel.app/ts

# Swagger documentation
curl https://your-project.vercel.app/ts/docs

# Test authentication endpoint (if applicable)
curl -X POST https://your-project.vercel.app/ts/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

---

## Custom Domain Setup

### Adding a Custom Domain

1. **Go to Vercel Dashboard:**
   - Navigate to your project
   - Click **Settings** → **Domains**

2. **Add Domain:**
   - Enter your domain (e.g., `api.yourdomain.com`)
   - Click **Add**

3. **Configure DNS:**
   - Vercel will provide DNS records to add
   - Add a CNAME record pointing to Vercel
   - Or add an A record (for apex domains)

4. **Wait for Propagation:**
   - DNS changes can take up to 48 hours
   - Usually takes 5-30 minutes

5. **SSL Certificate:**
   - Vercel automatically provisions SSL certificates
   - HTTPS is enabled by default

### Domain Configuration Example

**For subdomain (api.yourdomain.com):**
```
Type: CNAME
Name: api
Value: cname.vercel-dns.com
```

**For apex domain (yourdomain.com):**
```
Type: A
Name: @
Value: 76.76.21.21
```

---

## Monitoring & Logs

### Viewing Logs in Vercel Dashboard

1. Go to your project in Vercel Dashboard
2. Click on a deployment
3. Click **Functions** tab
4. Click on `api/index.ts`
5. View real-time logs

### Viewing Logs via CLI

```bash
# View logs for latest deployment
vercel logs

# View logs for specific deployment
vercel logs [deployment-url]

# Follow logs in real-time
vercel logs --follow

# Filter logs by function
vercel logs --function api/index.ts
```

### Monitoring Performance

**Vercel Analytics (Pro Plan):**
- Real-time analytics
- Function execution times
- Error rates
- Request counts

**Function Metrics:**
- Execution duration
- Memory usage
- Cold start frequency
- Error rates

### Setting Up Error Tracking

Consider integrating error tracking services:

**Sentry:**
```bash
pnpm add @sentry/node @sentry/profiling-node
```

**LogRocket:**
```bash
pnpm add logrocket
```

**Custom Error Logging:**
- Use Vercel's built-in logging
- Integrate with external services
- Set up alerts for critical errors

---

## Troubleshooting

## Troubleshooting

### Issue 1: Build Fails

**Error:** `Cannot find module '@nestjs/core'`

**Solution:**
- Ensure `package.json` has all dependencies
- Check that `pnpm install` runs successfully
- Verify `node_modules` is not in `.gitignore` incorrectly

**Error:** `Prisma Client not generated`

**Solution:**
- Add `prisma generate` to build command:
  ```json
  "vercel-build": "prisma generate && nest build"
  ```

### Issue 2: Function Timeout

**Error:** `Function execution exceeded timeout`

**Solution:**
- Increase timeout in `vercel.json`:
  ```json
  "functions": {
    "api/index.ts": {
      "maxDuration": 60
    }
  }
  ```
- Note: Free plan max is 10s, Pro plan max is 60s

### Issue 3: Database Connection Issues

**Error:** `Can't reach database server`

**Solution:**
- Verify `DATABASE_URL` is correct in Vercel environment variables
- Check database allows connections from Vercel IPs
- For Vercel Postgres, connection string is automatically provided
- For external databases, ensure SSL is enabled: `?sslmode=require`

### Issue 4: CORS Errors

**Error:** `Access to fetch blocked by CORS policy`

**Solution:**
- Add your frontend URL to CORS origins in `api/index.ts`
- Ensure `credentials: true` is set if using cookies
- Redeploy after changes

### Issue 5: Environment Variables Not Working

**Error:** `Environment variable not defined`

**Solution:**
- Verify variables are set in Vercel dashboard
- Check variable names match exactly (case-sensitive)
- Ensure variables are set for correct environment (Production/Preview/Development)
- Redeploy after adding variables

### Issue 6: Prisma Client Issues

**Error:** `PrismaClient is not configured`

**Solution:**
- Ensure `postinstall` script in `package.json`:
  ```json
  "postinstall": "prisma generate"
  ```
- Or add to build command:
  ```json
  "vercel-build": "prisma generate && nest build"
  ```

### Issue 7: Cold Start Performance

**Issue:** First request is slow (2-5 seconds)

**Solution:**
- This is normal for serverless functions (cold start)
- Vercel caches the function after first invocation
- Subsequent requests are much faster (< 100ms)
- Consider using Vercel Pro plan for better performance
- Optimize your app initialization code
- Minimize imports and dependencies
- Use connection pooling for databases

**Optimization Tips:**
```typescript
// In api/index.ts - cache the app instance
let cachedApp: express.Express;

// Lazy load heavy dependencies
// Minimize startup code
```

### Issue 8: pnpm Not Found

**Error:** `pnpm: command not found`

**Solution:**
- Vercel should auto-detect pnpm from `pnpm-lock.yaml`
- If not, specify in `package.json`:
  ```json
  {
    "packageManager": "pnpm@10.11.0"
  }
  ```
- Or set in Vercel project settings: **Settings** → **General** → **Package Manager** → Select `pnpm`

### Issue 9: Build Timeout

**Error:** `Build exceeded maximum build time`

**Solution:**
- Optimize build process
- Remove unnecessary dependencies
- Use `vercel-build` script to optimize
- Consider splitting into multiple projects
- Check for circular dependencies

### Issue 10: Memory Limit Exceeded

**Error:** `Function exceeded memory limit`

**Solution:**
- Optimize memory usage
- Reduce bundle size
- Remove unused dependencies
- Upgrade to Pro plan (more memory available)
- Optimize Prisma queries

### Issue 11: Route Not Found (404)

**Error:** `Cannot GET /your-route`

**Solution:**
- Check that routes are prefixed with `/ts` (your global prefix)
- Verify `vercel.json` routes configuration
- Ensure `api/index.ts` is properly exporting handler
- Check that NestJS routes are correctly defined

**Example:**
```bash
# Wrong
curl https://your-project.vercel.app/auth/login

# Correct
curl https://your-project.vercel.app/ts/auth/login
```

### Issue 12: Prisma Migrations Fail During Build

**Error:** `Migration failed` during `vercel-build`

**Solution:**
- Run migrations manually before deployment
- Remove `prisma migrate deploy` from `vercel-build` script
- Use `prisma db push` for development (not recommended for production)
- Ensure database is accessible from Vercel

---

## Best Practices

### 1. Environment Management

- ✅ **Use different databases** for production, preview, and development
- ✅ **Never commit `.env` files** to Git (already in `.gitignore`)
- ✅ **Use Vercel's environment variable management** instead of hardcoding
- ✅ **Set variables for all environments** (Production, Preview, Development)
- ✅ **Use descriptive variable names** that match your `ENVEnum`
- ✅ **Rotate secrets regularly** for security
- ✅ **Use Vercel's secret management** for sensitive data

### 2. Database Migrations

- ✅ **Run migrations before deployment** to ensure schema is up to date
- ✅ **Use `prisma migrate deploy`** for production (not `migrate dev`)
- ✅ **Test migrations on preview environment** first
- ✅ **Keep migration history** in version control
- ✅ **Backup database** before running migrations in production
- ✅ **Use transactions** for critical migrations
- ✅ **Document breaking changes** in migration files

### 3. Security

- ✅ **Use strong JWT secrets** (at least 32 characters, random)
- ✅ **Enable SSL for database connections** (`?sslmode=require`)
- ✅ **Restrict CORS to specific origins** (not `*`)
- ✅ **Never expose secrets** in code, logs, or error messages
- ✅ **Use HTTPS** for all API calls (Vercel provides this automatically)
- ✅ **Validate all inputs** using class-validator
- ✅ **Sanitize user inputs** to prevent injection attacks
- ✅ **Rate limit API endpoints** to prevent abuse
- ✅ **Use environment-specific secrets** (different for dev/prod)

### 4. Performance

- ✅ **Optimize database queries** (use Prisma's `select` and `include` wisely)
- ✅ **Use connection pooling** (Prisma does this automatically)
- ✅ **Cache frequently accessed data** (Redis, in-memory cache)
- ✅ **Minimize cold start time** (optimize imports, lazy load)
- ✅ **Use pagination** for list endpoints
- ✅ **Optimize bundle size** (remove unused dependencies)
- ✅ **Enable compression** (Vercel does this automatically)
- ✅ **Use CDN** for static assets (Vercel provides this)

### 5. Monitoring & Logging

- ✅ **Check Vercel function logs regularly** for errors
- ✅ **Monitor database connections** and query performance
- ✅ **Set up error tracking** (Sentry, LogRocket, etc.)
- ✅ **Monitor API response times** and identify slow endpoints
- ✅ **Set up alerts** for critical errors
- ✅ **Log important events** (user actions, errors, etc.)
- ✅ **Use structured logging** (JSON format)
- ✅ **Monitor function invocations** and costs

### 6. Code Quality

- ✅ **Write tests** for critical functionality
- ✅ **Use TypeScript** strictly (enable strict mode)
- ✅ **Follow NestJS best practices** (modules, services, DTOs)
- ✅ **Use DTOs for validation** (class-validator, class-transformer)
- ✅ **Handle errors gracefully** (use exception filters)
- ✅ **Document your API** (Swagger/OpenAPI)
- ✅ **Use meaningful variable names** and comments
- ✅ **Keep functions small and focused**

### 7. Deployment

- ✅ **Test locally before deploying** (`pnpm build`, `pnpm start:prod`)
- ✅ **Use preview deployments** for testing
- ✅ **Review build logs** after each deployment
- ✅ **Test API endpoints** after deployment
- ✅ **Keep deployment history** (Vercel does this automatically)
- ✅ **Use rollback** if issues are detected
- ✅ **Deploy during low-traffic periods** for major changes
- ✅ **Communicate deployments** to your team

### 8. Cost Optimization

- ✅ **Monitor function invocations** and costs
- ✅ **Optimize function execution time** (reduce max duration if possible)
- ✅ **Use appropriate plan** (Free, Pro, Enterprise)
- ✅ **Cache responses** to reduce database calls
- ✅ **Use edge functions** for simple operations (if applicable)
- ✅ **Monitor database usage** and optimize queries

---

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [NestJS Documentation](https://docs.nestjs.com)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Vercel Serverless Functions](https://vercel.com/docs/functions/serverless-functions)

---

## Quick Reference

### Common Vercel CLI Commands

```bash
# Login to Vercel
vercel login

# Link project to Vercel
vercel link

# Deploy to preview environment
vercel

# Deploy to production
vercel --prod

# View deployment logs
vercel logs

# View logs for specific function
vercel logs --function api/index.ts

# Follow logs in real-time
vercel logs --follow

# List all environment variables
vercel env ls

# Add environment variable
vercel env add VARIABLE_NAME production

# Remove environment variable
vercel env rm VARIABLE_NAME production

# Pull environment variables to local file
vercel env pull .env.local

# List all deployments
vercel ls

# Inspect a deployment
vercel inspect [deployment-url]

# Remove a deployment
vercel rm [deployment-url]
```

### Common pnpm Commands

```bash
# Install dependencies
pnpm install

# Build project
pnpm build

# Generate Prisma Client
pnpm prisma:generate

# Run migrations
pnpm prisma:migrate

# Deploy migrations (production)
pnpm prisma migrate deploy

# Open Prisma Studio
pnpm prisma:studio

# Seed admin user
pnpm seed:admin

# Start development server
pnpm start:dev

# Start production server (local)
pnpm start:prod
```

### Project URLs

After deployment, you'll have:

- **Production URL**: `https://your-project.vercel.app`
- **Preview URL**: `https://your-project-git-branch.vercel.app`
- **API Base URL**: `https://your-project.vercel.app/ts`
- **Swagger Documentation**: `https://your-project.vercel.app/ts/docs`
- **Health Check**: `https://your-project.vercel.app/ts`

### Environment Variables Checklist

Use this checklist to ensure all variables are set:

**Core:**
- [ ] `NODE_ENV=production`
- [ ] `DATABASE_URL=postgresql://...`

**JWT:**
- [ ] `JWT_SECRET=...`
- [ ] `JWT_EXPIRES_IN=15m`
- [ ] `JWT_REFRESH_SECRET=...`
- [ ] `JWT_REFRESH_EXPIRES_IN=7d`

**Email (SMTP):**
- [ ] `SMTP_HOST=...`
- [ ] `SMTP_PORT=587`
- [ ] `SMTP_USER=...`
- [ ] `SMTP_PASS=...`
- [ ] `SMTP_FROM_EMAIL=...`
- [ ] `SMTP_FROM_NAME=...`

**Other:**
- [ ] `PASSWORD_RESET_TOKEN_EXPIRY=15`
- [ ] `FRONTEND_URL=https://...`
- [ ] `CLOUDINARY_CLOUD_NAME=...`
- [ ] `CLOUDINARY_API_KEY=...`
- [ ] `CLOUDINARY_API_SECRET=...`

### Testing Your Deployment

```bash
# 1. Health check
curl https://your-project.vercel.app/ts

# 2. Check Swagger docs
curl https://your-project.vercel.app/ts/docs

# 3. Test authentication (example)
curl -X POST https://your-project.vercel.app/ts/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# 4. Test with authentication token
curl https://your-project.vercel.app/ts/user/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Support & Resources

### Getting Help

If you encounter issues:

1. **Check Vercel Function Logs**
   - Go to Vercel Dashboard → Your Project → Deployments → Functions
   - Look for error messages and stack traces

2. **Review Build Logs**
   - Check the build output for compilation errors
   - Verify all dependencies are installed correctly

3. **Verify Environment Variables**
   - Ensure all required variables are set
   - Check variable names match exactly (case-sensitive)
   - Verify values are correct

4. **Test Database Connectivity**
   - Verify `DATABASE_URL` is correct
   - Check database allows connections from Vercel
   - Test connection string locally

5. **Check CORS Configuration**
   - Verify frontend URL is in CORS origins
   - Check `api/index.ts` CORS settings

6. **Review Documentation**
   - [Vercel Documentation](https://vercel.com/docs)
   - [NestJS Documentation](https://docs.nestjs.com)
   - [Prisma Documentation](https://www.prisma.io/docs)

### Community Support

- **Vercel Community**: [vercel.com/discord](https://vercel.com/discord)
- **NestJS Discord**: [discord.gg/nestjs](https://discord.gg/nestjs)
- **Stack Overflow**: Tag questions with `vercel`, `nestjs`, `prisma`

### Useful Links

- **Vercel Dashboard**: [vercel.com/dashboard](https://vercel.com/dashboard)
- **Vercel Status**: [vercel-status.com](https://www.vercel-status.com)
- **Vercel Pricing**: [vercel.com/pricing](https://vercel.com/pricing)
- **NestJS Best Practices**: [docs.nestjs.com/fundamentals](https://docs.nestjs.com/fundamentals)

---

## Deployment Checklist Summary

Before deploying, ensure:

- [ ] Code is committed and pushed to Git
- [ ] All dependencies are in `package.json`
- [ ] `vercel.json` is configured correctly
- [ ] `api/index.ts` exists and is properly set up
- [ ] Project builds successfully locally (`pnpm build`)
- [ ] Prisma Client generates successfully (`pnpm prisma:generate`)
- [ ] Database is set up and accessible
- [ ] All environment variables are documented
- [ ] CORS origins include your frontend URL
- [ ] Database migrations are ready (if needed)
- [ ] Admin user seed script is ready (if needed)

After deployment:

- [ ] Verify deployment URL is accessible
- [ ] Test health check endpoint
- [ ] Test Swagger documentation
- [ ] Test authentication endpoints
- [ ] Verify environment variables are working
- [ ] Check function logs for errors
- [ ] Test database connectivity
- [ ] Update frontend API URL
- [ ] Run database migrations (if needed)
- [ ] Seed admin user (if needed)

---

**Happy Deploying! 🚀**

*Last Updated: 2024*
