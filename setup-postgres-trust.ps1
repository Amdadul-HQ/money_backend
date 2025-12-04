# Alternative PostgreSQL Setup - Using Trust Authentication Temporarily
# This script temporarily enables trust authentication to set up the database

Write-Host "=== PostgreSQL Setup (Trust Method) ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "This script will temporarily allow password-less access to set up your database." -ForegroundColor Yellow
Write-Host "Press Ctrl+C to cancel, or any key to continue..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

$PG_HBA = "C:\Program Files\PostgreSQL\17\data\pg_hba.conf"
$PG_HBA_BACKUP = "C:\Program Files\PostgreSQL\17\data\pg_hba.conf.backup"
$PSQL_PATH = "C:\Program Files\PostgreSQL\17\bin\psql.exe"
$PG_CTL_PATH = "C:\Program Files\PostgreSQL\17\bin\pg_ctl.exe"

Write-Host ""
Write-Host "Step 1: Backing up pg_hba.conf..." -ForegroundColor Green
Copy-Item -Path $PG_HBA -Destination $PG_HBA_BACKUP -Force

Write-Host "Step 2: Modifying authentication to trust..." -ForegroundColor Green
$hbaContent = @"
# TYPE  DATABASE        USER            ADDRESS                 METHOD
# Temporary trust for setup
host    all             all             127.0.0.1/32            trust
host    all             all             ::1/128                 trust
local   all             all                                     trust
"@
$hbaContent | Out-File -FilePath $PG_HBA -Encoding UTF8

Write-Host "Step 3: Reloading PostgreSQL configuration..." -ForegroundColor Green
& "C:\Program Files\PostgreSQL\17\bin\pg_ctl.exe" reload -D "C:\Program Files\PostgreSQL\17\data"

Start-Sleep -Seconds 2

# Configuration
$DB_NAME = "money_backend"
$DB_USER = "money_app_user"

# Prompt for new user password
Write-Host ""
Write-Host "Enter a password for the new database user '$DB_USER':" -ForegroundColor Yellow
$DB_PASSWORD = Read-Host -AsSecureString
$DB_PASSWORD_PLAIN = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($DB_PASSWORD))

Write-Host ""
Write-Host "Step 4: Creating database and user..." -ForegroundColor Green

try {
    # Create database
    & $PSQL_PATH -U postgres -c "CREATE DATABASE $DB_NAME;" 2>&1
    
    # Create user
    & $PSQL_PATH -U postgres -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD_PLAIN';" 2>&1
    
    # Grant privileges
    & $PSQL_PATH -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" 2>&1
    
    # Connect and grant schema privileges
    & $PSQL_PATH -U postgres -d $DB_NAME -c "GRANT ALL ON SCHEMA public TO $DB_USER;" 2>&1
    & $PSQL_PATH -U postgres -d $DB_NAME -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;" 2>&1
    & $PSQL_PATH -U postgres -d $DB_NAME -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;" 2>&1
    
    Write-Host ""
    Write-Host "✓ Database and user created successfully!" -ForegroundColor Green
    
    # Update .env file
    Write-Host "Step 5: Updating .env file..." -ForegroundColor Green
    $CONNECTION_STRING = "DATABASE_URL=`"postgresql://${DB_USER}:${DB_PASSWORD_PLAIN}@localhost:5432/${DB_NAME}?schema=public`""
    
    # Read current .env content
    $envContent = Get-Content .env -Raw -ErrorAction SilentlyContinue
    
    # Replace or add DATABASE_URL
    if ($envContent -match 'DATABASE_URL=') {
        $envContent = $envContent -replace 'DATABASE_URL=.*', $CONNECTION_STRING
    } else {
        if ($envContent) {
            $envContent = $CONNECTION_STRING + "`r`n" + $envContent
        } else {
            $envContent = $CONNECTION_STRING
        }
    }
    
    # Write back to .env
    $envContent | Out-File -FilePath .env -Encoding UTF8 -NoNewline
    
    Write-Host "✓ .env file updated!" -ForegroundColor Green
    
} catch {
    Write-Host "✗ Error: $_" -ForegroundColor Red
} finally {
    Write-Host ""
    Write-Host "Step 6: Restoring original authentication..." -ForegroundColor Green
    Copy-Item -Path $PG_HBA_BACKUP -Destination $PG_HBA -Force
    
    Write-Host "Step 7: Reloading PostgreSQL configuration..." -ForegroundColor Green
    & "C:\Program Files\PostgreSQL\17\bin\pg_ctl.exe" reload -D "C:\Program Files\PostgreSQL\17\data"
    
    # Clean up backup
    Remove-Item $PG_HBA_BACKUP -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Database Name: $DB_NAME" -ForegroundColor White
Write-Host "Username: $DB_USER" -ForegroundColor White
Write-Host "Host: localhost" -ForegroundColor White
Write-Host "Port: 5432" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Run: pnpm prisma migrate dev --name init" -ForegroundColor White
Write-Host "2. Run: pnpm prisma generate" -ForegroundColor White
Write-Host "3. Run: pnpm run start:dev" -ForegroundColor White
