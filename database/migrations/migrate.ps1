# ===================================================================
# GoodDays Database Migration Runner (PowerShell for Windows)
# File: migrate.ps1
# Description: Run all database migrations in correct order
# Usage: .\migrate.ps1 [-Operation "all"] [-Help]
# ===================================================================

param(
    [ValidateSet("all", "rollback", "seed-only", "core-only", "reset", "verify")]
    [string]$Operation = "all",
    
    [switch]$Help,
    
    [string]$DbUser = $env:DB_USER,
    [string]$DbName = $env:DB_NAME,
    [string]$DbHost = $env:DB_HOST,
    [string]$DbPort = $env:DB_PORT
)

# Set defaults if not provided
if (-not $DbUser) { $DbUser = "postgres" }
if (-not $DbName) { $DbName = "gooddays" }
if (-not $DbHost) { $DbHost = "localhost" }
if (-not $DbPort) { $DbPort = "5432" }

# Script directory
$ScriptDir = Split-Path -Parent -Path $MyInvocation.MyCommand.Definition

# ===================================================================
# Output Functions
# ===================================================================

function Write-Header {
    param([string]$Message)
    Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║ $Message" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠ $Message" -ForegroundColor Yellow
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ $Message" -ForegroundColor Cyan
}

function Show-Help {
    $helpText = @"
GoodDays Database Migration Runner (PowerShell)

Usage: .\migrate.ps1 [-Operation <operation>] [-Help]

Operations:
    all         Run all migrations in order (default)
    rollback    Remove all tables and data (⚠️  DESTRUCTIVE)
    seed-only   Run only seed data migration (003)
    core-only   Run only core schema (001 & 002)
    reset       Rollback and run fresh migrations
    verify      Verify database state after migrations

Environment Variables:
    DB_USER     Database user (default: postgres)
    DB_NAME     Database name (default: gooddays)
    DB_HOST     Database host (default: localhost)
    DB_PORT     Database port (default: 5432)

Examples:
    .\migrate.ps1                                      # Run all migrations
    .\migrate.ps1 -DbUser admin                        # Use custom user
    .\migrate.ps1 -Operation reset                     # Clean reset
    .\migrate.ps1 -Operation rollback                  # Remove all tables
    .\migrate.ps1 -Operation verify                    # Check schema

"@
    Write-Host $helpText
}

# ===================================================================
# Database Functions
# ===================================================================

function Test-PostgresConnection {
    try {
        $connectionString = "PostgreSQL Database provider;Server=$DbHost;Port=$DbPort;User Id=$DbUser"
        Write-Info "Checking PostgreSQL connection to $DbHost`:$DbPort..."
        
        # Try using psql
        $result = psql -U $DbUser -h $DbHost -p $DbPort -d postgres -c "SELECT 1" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Success "PostgreSQL server is accessible"
            return $true
        } else {
            Write-Error "Cannot connect to PostgreSQL server"
            return $false
        }
    } catch {
        Write-Error "PostgreSQL check failed: $_"
        return $false
    }
}

function Test-Database {
    try {
        $result = psql -U $DbUser -h $DbHost -p $DbPort -d $DbName -c "SELECT 1" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Database '$DbName' exists and is accessible"
            return $true
        } else {
            Write-Warning "Database '$DbName' does not exist. Creating..."
            $result = createdb -U $DbUser -h $DbHost -p $DbPort $DbName
            if ($LASTEXITCODE -eq 0) {
                Write-Success "Created database '$DbName'"
                return $true
            } else {
                Write-Error "Failed to create database: $result"
                return $false
            }
        }
    } catch {
        Write-Error "Database check failed: $_"
        return $false
    }
}

function Run-Migration {
    param(
        [string]$MigrationFile,
        [string]$MigrationName
    )
    
    Write-Info "Running: $MigrationName"
    
    $filePath = Join-Path $ScriptDir $MigrationFile
    if (-not (Test-Path $filePath)) {
        Write-Error "Migration file not found: $MigrationFile"
        return $false
    }
    
    try {
        $scriptContent = Get-Content -Path $filePath -Raw
        $result = $scriptContent | psql -U $DbUser -h $DbHost -p $DbPort -d $DbName 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Completed: $MigrationName"
            return $true
        } else {
            Write-Error "Failed: $MigrationName"
            Write-Host $result -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Error "Error running migration: $_"
        return $false
    }
}

function Count-Tables {
    try {
        $result = psql -U $DbUser -h $DbHost -p $DbPort -d $DbName -t -c `
            "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>&1
        return $result.Trim()
    } catch {
        return "0"
    }
}

function Verify-Schema {
    Write-Info "Verifying database schema..."
    
    $tableCount = Count-Tables
    Write-Info "Total tables: $tableCount"
    
    $coreTables = @("user_profiles", "tasks", "daily_tracking", "expenses")
    
    foreach ($table in $coreTables) {
        try {
            $result = psql -U $DbUser -h $DbHost -p $DbPort -d $DbName -c "\dt $table" 2>&1
            if ($result -like "*$table*") {
                Write-Success "Table exists: $table"
            } else {
                Write-Error "Table missing: $table"
            }
        } catch {
            Write-Error "Error checking table $table : $_"
        }
    }
    
    # Check financial tables
    try {
        $result = psql -U $DbUser -h $DbHost -p $DbPort -d $DbName -c "\dt investment_buckets" 2>&1
        if ($result -like "*investment_buckets*") {
            Write-Success "Financial module installed"
        }
    } catch {
        Write-Warning "Financial module check skipped"
    }
}

# ===================================================================
# Operation Functions
# ===================================================================

function Invoke-AllMigrations {
    Write-Header "Running All Migrations"
    
    Write-Info "Database Configuration:"
    Write-Host "  User: $DbUser"
    Write-Host "  Database: $DbName"
    Write-Host "  Host: $DbHost"
    Write-Host "  Port: $DbPort"
    Write-Host "  Migrations: $ScriptDir"
    
    if (-not (Test-PostgresConnection)) { exit 1 }
    if (-not (Test-Database)) { exit 1 }
    
    Write-Header "Migration Sequence"
    
    if (-not (Run-Migration "001_core_and_financial_schema.sql" "Core Schema & Financial Module")) { exit 1 }
    if (-not (Run-Migration "002_new_features_schema.sql" "New Features (Workouts, Goals, Thesis, etc.)")) { exit 1 }
    if (-not (Run-Migration "003_seed_financial_data.sql" "Seed Financial Data")) { exit 1 }
    
    Write-Header "Migration Complete!"
    Verify-Schema
}

function Invoke-Rollback {
    Write-Warning "⚠️  CAUTION: This will delete ALL data from the database!"
    $confirmation = Read-Host "Are you sure? Type 'YES' to confirm"
    
    if ($confirmation -ne "YES") {
        Write-Info "Rollback cancelled."
        return
    }
    
    Write-Header "Rolling Back Database"
    
    if (-not (Test-PostgresConnection)) { exit 1 }
    
    $filePath = Join-Path $ScriptDir "000_rollback_all.sql"
    if (-not (Test-Path $filePath)) {
        Write-Error "Rollback file not found: 000_rollback_all.sql"
        exit 1
    }
    
    try {
        $scriptContent = Get-Content -Path $filePath -Raw
        $result = $scriptContent | psql -U $DbUser -h $DbHost -p $DbPort -d $DbName 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "All tables and functions removed"
            Write-Info "Table count: $(Count-Tables)"
        } else {
            Write-Error "Rollback operation failed"
            Write-Host $result -ForegroundColor Red
            exit 1
        }
    } catch {
        Write-Error "Error during rollback: $_"
        exit 1
    }
}

function Invoke-Reset {
    Write-Header "Database Reset"
    Write-Warning "This will delete all data and recreate the schema from scratch."
    
    Invoke-Rollback
    Write-Host ""
    Invoke-AllMigrations
}

function Invoke-SeedOnly {
    Write-Header "Running Seed Data Migration"
    
    if (-not (Test-PostgresConnection)) { exit 1 }
    if (-not (Test-Database)) { exit 1 }
    
    if -not (Run-Migration "003_seed_financial_data.sql" "Seed Financial Data") { exit 1 }
    Write-Success "Seed data loaded successfully"
}

function Invoke-CoreOnly {
    Write-Header "Running Core Schema Migrations"
    
    if (-not (Test-PostgresConnection)) { exit 1 }
    if (-not (Test-Database)) { exit 1 }
    
    if -not (Run-Migration "001_core_and_financial_schema.sql" "Core Schema & Financial Module") { exit 1 }
    if -not (Run-Migration "002_new_features_schema.sql" "New Features Schema") { exit 1 }
    Write-Success "Core schema loaded successfully"
}

# ===================================================================
# Main
# ===================================================================

if ($Help) {
    Show-Help
    exit 0
}

switch ($Operation) {
    "all" {
        Invoke-AllMigrations
    }
    "rollback" {
        Invoke-Rollback
    }
    "seed-only" {
        Invoke-SeedOnly
    }
    "core-only" {
        Invoke-CoreOnly
    }
    "reset" {
        Invoke-Reset
    }
    "verify" {
        if (Test-PostgresConnection) {
            Test-Database | Out-Null
            Verify-Schema
        }
    }
    default {
        Invoke-AllMigrations
    }
}
