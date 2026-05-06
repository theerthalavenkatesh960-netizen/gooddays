#!/bin/bash

# ===================================================================
# GoodDays Database Migration Runner
# File: migrate.sh
# Description: Run all database migrations in correct order
# Usage: ./migrate.sh [--help] [--rollback] [--seed-only]
# ===================================================================

set -e  # Exit on first error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-gooddays}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
MIGRATIONS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ===================================================================
# Functions
# ===================================================================

print_header() {
    echo -e "\n${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC} $1"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC}  $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC}  $1"
}

show_help() {
    cat << EOF
${BLUE}GoodDays Database Migration Runner${NC}

Usage: ./migrate.sh [OPTIONS]

Options:
    --help              Show this help message
    --rollback          Remove all tables and data (⚠️  DESTRUCTIVE)
    --seed-only         Run only seed data migration (003)
    --core-only         Run only core schema (001) and new features (002)
    --reset             Rollback and run fresh migrations
    --verify            Verify database state after migrations

Environment Variables:
    DB_USER             Database user (default: postgres)
    DB_NAME             Database name (default: gooddays)
    DB_HOST             Database host (default: localhost)
    DB_PORT             Database port (default: 5432)

Examples:
    ./migrate.sh                          # Run all migrations
    DB_USER=admin ./migrate.sh            # Use custom user
    ./migrate.sh --reset                  # Clean reset
    ./migrate.sh --rollback               # Remove all tables

EOF
}

check_psql() {
    if ! command -v psql &> /dev/null; then
        print_error "psql not found. Please install PostgreSQL client tools."
        exit 1
    fi
    print_success "psql found"
}

check_database() {
    print_info "Checking database connection..."
    
    if psql -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" -d postgres -c "SELECT 1;" &> /dev/null; then
        print_success "PostgreSQL server is accessible"
    else
        print_error "Cannot connect to PostgreSQL server"
        exit 1
    fi
    
    if psql -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" -c "SELECT 1;" &> /dev/null; then
        print_success "Database '$DB_NAME' exists and is accessible"
        return 0
    else
        print_warning "Database '$DB_NAME' does not exist. Creating..."
        createdb -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" "$DB_NAME"
        print_success "Created database '$DB_NAME'"
        return 1
    fi
}

run_migration() {
    local migration_file=$1
    local migration_name=$2
    
    print_info "Running: $migration_name"
    
    if [ ! -f "$MIGRATIONS_DIR/$migration_file" ]; then
        print_error "Migration file not found: $migration_file"
        return 1
    fi
    
    if psql -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" -f "$MIGRATIONS_DIR/$migration_file" &> /dev/null; then
        print_success "Completed: $migration_name"
        return 0
    else
        print_error "Failed: $migration_name"
        return 1
    fi
}

count_tables() {
    psql -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" -t -c \
        "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"
}

verify_schema() {
    print_info "Verifying database schema..."
    
    local table_count=$(count_tables)
    print_info "Total tables: $table_count"
    
    # Check core tables
    local core_tables=("user_profiles" "tasks" "daily_tracking" "expenses")
    for table in "${core_tables[@]}"; do
        if psql -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" -c "\dt $table" 2>/dev/null | grep -q "$table"; then
            print_success "Table exists: $table"
        else
            print_error "Table missing: $table"
        fi
    done
    
    # Check financial tables
    if psql -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" -c "\dt investment_buckets" 2>/dev/null | grep -q "investment_buckets"; then
        print_success "Financial module installed"
    fi
}

run_all_migrations() {
    print_header "Running All Migrations"
    
    print_info "Database Configuration:"
    echo "  User: $DB_USER"
    echo "  Database: $DB_NAME"
    echo "  Host: $DB_HOST"
    echo "  Port: $DB_PORT"
    echo "  Migrations: $MIGRATIONS_DIR"
    echo ""
    
    check_psql
    check_database
    
    print_header "Migration Sequence"
    
    run_migration "001_core_and_financial_schema.sql" "Core Schema & Financial Module" || exit 1
    run_migration "002_new_features_schema.sql" "New Features (Workouts, Goals, Thesis, etc.)" || exit 1
    run_migration "003_seed_financial_data.sql" "Seed Financial Data" || exit 1
    
    print_header "Migration Complete!"
    verify_schema
}

run_rollback() {
    print_warning "⚠️  CAUTION: This will delete ALL data from the database!"
    echo -n "Are you sure? Type 'YES' to confirm: "
    read -r confirmation
    
    if [ "$confirmation" != "YES" ]; then
        print_info "Rollback cancelled."
        return 0
    fi
    
    print_header "Rolling Back Database"
    
    check_psql
    
    if psql -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" -f "$MIGRATIONS_DIR/000_rollback_all.sql" &> /dev/null; then
        print_success "All tables and functions removed"
        print_info "Table count: $(count_tables)"
    else
        print_error "Rollback operation failed"
        return 1
    fi
}

run_reset() {
    print_header "Database Reset"
    print_warning "This will delete all data and recreate the schema from scratch."
    
    run_rollback || return 1
    echo ""
    run_all_migrations
}

run_seed_only() {
    print_header "Running Seed Data Migration"
    
    check_psql
    check_database
    
    run_migration "003_seed_financial_data.sql" "Seed Financial Data" || exit 1
    print_success "Seed data loaded successfully"
}

run_core_only() {
    print_header "Running Core Schema Migrations"
    
    check_psql
    check_database
    
    run_migration "001_core_and_financial_schema.sql" "Core Schema & Financial Module" || exit 1
    run_migration "002_new_features_schema.sql" "New Features Schema" || exit 1
    print_success "Core schema loaded successfully"
}

# ===================================================================
# Main Script
# ===================================================================

main() {
    case "${1:-}" in
        --help)
            show_help
            exit 0
            ;;
        --rollback)
            run_rollback
            ;;
        --seed-only)
            run_seed_only
            ;;
        --core-only)
            run_core_only
            ;;
        --reset)
            run_reset
            ;;
        --verify)
            check_psql
            check_database
            verify_schema
            ;;
        "")
            run_all_migrations
            ;;
        *)
            print_error "Unknown option: $1"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
