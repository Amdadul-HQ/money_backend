# PostgreSQL Database Setup Script
# This script will create a new database user and database for the money_backend application

Write-Host "=== PostgreSQL Setup for Money Backend ===" -ForegroundColor Cyan
Write-Host ""

# Configuration
$DB_NAME = "money_backend"
$DB_USER = "money_app_user"
$PSQL_PATH = "C:\Program Files\PostgreSQL\17\bin\psql.exe"

# Prompt for postgres password
Write-Host "Enter the PostgreSQL 'postgres' superuser password:" -ForegroundColor Yellow
$POSTGRES_PASSWORD = Read-Host -AsSecureString
$POSTGRES_PASSWORD_PLAIN = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($POSTGRES_PASSWORD))

# Prompt for new user password
Write-Host ""
Write-Host "Enter a password for the new database user '$DB_USER':" -ForegroundColor Yellow
$DB_PASSWORD = Read-Host -AsSecureString
$DB_PASSWORD_PLAIN = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($DB_PASSWORD))

Write-Host ""
Write-Host "Creating database and user..." -ForegroundColor Green

# Set postgres password as environment variable
$env:PGPASSWORD = $POSTGRES_PASSWORD_PLAIN

# Create SQL commands
$SQL_COMMANDS = @"
-- Create database
CREATE DATABASE $DB_NAME;

-- Create user with password
CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD_PLAIN';

-- Grant all privileges on database
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;

-- Connect to the new database and grant schema privileges
\c $DB_NAME
GRANT ALL ON SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;
"@

# Save SQL to temporary file
$SQL_FILE = ".\setup-temp.sql"
$SQL_COMMANDS | Out-File -FilePath $SQL_FILE -Encoding UTF8

try {
    # Execute SQL commands
    & $PSQL_PATH -U postgres -f $SQL_FILE 2>&1 | Tee-Object -Variable output
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✓ Database and user created successfully!" -ForegroundColor Green
        Write-Host ""
        
        # Update .env file
        Write-Host "Updating .env file..." -ForegroundColor Green
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
    } else {
        Write-Host ""
        Write-Host "✗ Error occurred during setup" -ForegroundColor Red
        Write-Host $output
    }
} catch {
    Write-Host ""
    Write-Host "✗ Error: $_" -ForegroundColor Red
} finally {
    # Clean up
    if (Test-Path $SQL_FILE) {
        Remove-Item $SQL_FILE
    }
    # Clear password from environment
    $env:PGPASSWORD = $null
}
