# GoodDays Database Migrations

This directory contains all SQL migration files for the GoodDays application database. The database uses PostgreSQL and follows a versioned migrations approach for schema evolution and data seeding.

## 📋 Migration Files

### 000_rollback_all.sql
**Purpose:** Complete cleanup/reset script
**Status:** Development/Testing only
**Data Impact:** ⚠️ **DESTRUCTIVE** - Deletes all tables and data

This script is useful for:
- Development environment cleanup
- Testing fresh database setup
- Resetting database to initial state

```bash
psql -U postgres -d gooddays -f 000_rollback_all.sql
```

### 001_core_and_financial_schema.sql
**Purpose:** Foundation tables and financial module
**Scope:** Core application schema + Full financial tracking module
**Size:** ~70+ tables and views
**Data Impact:** Creates schema only (no data loss)

**Key Modules:**
- **Core Tables:** User profiles, tasks, daily tracking, focus sessions
- **Study Tracking:** Study sessions, resources, chapters
- **Fitness & Health:** Daily tracking metrics, self-care logs
- **Gamification:** Points system, achievements, levels
- **Financial Module:** Goals, investment buckets, monthly tasks, snapshots, rules
- **Performance:** Indexes for common query patterns

```bash
psql -U postgres -d gooddays -f 001_core_and_financial_schema.sql
```

### 002_new_features_schema.sql
**Purpose:** New features from Phase 2-5
**Scope:** Workouts, Goals, Reminders, Journal, Thesis, Deadlines
**Size:** ~20+ tables
**Data Impact:** Creates schema only

**Key Modules:**
- **Workout Tracking:** Exercises, templates, intensity levels
- **Goals & Aspirations:** Personal goals, milestones, progress tracking
- **Reminders & Notifications:** Scheduled reminders, notification history
- **Journaling:** Journal entries, reflection prompts, mood tracking
- **Thesis Research:** Protocols, patients, deadlines, documents, followups, statistics
- **Project Management:** Deadlines, projects, followups
- **Collaboration:** Study groups, member management
- **Dashboard:** Snapshots and analytics

```bash
psql -U postgres -d gooddays -f 002_new_features_schema.sql
```

### 003_seed_financial_data.sql
**Purpose:** Initial data for financial module
**Scope:** Financial goals, investment buckets, tasks, rules, snapshots
**Data Impact:** Inserts reference data (safe to run multiple times)

**Includes:**
- 5 Financial goals with targets and deadlines
- 6 Investment buckets with categories and monthly targets
- 10 Monthly tasks across different buckets
- 10 Financial rules for investment/trading/mindset
- 3 Sample monthly snapshots with realistic progression

**Note:** Uses SQL INSERT...ON CONFLICT DO NOTHING for idempotency

```bash
psql -U postgres -d gooddays -f 003_seed_financial_data.sql
```

---

## 🚀 Quick Start Guide

### Prerequisites
- PostgreSQL 12+ installed
- Database named `gooddays` created
- User `postgres` with appropriate privileges

### Create Database
```bash
createdb gooddays
```

### Run All Migrations in Order
```bash
# 1. Create core schema
psql -U postgres -d gooddays -f 001_core_and_financial_schema.sql

# 2. Create new features schema
psql -U postgres -d gooddays -f 002_new_features_schema.sql

# 3. Seed financial data
psql -U postgres -d gooddays -f 003_seed_financial_data.sql
```

### Alternative: Use Migration Script (if available)
```bash
./migrate.sh
```

### Verify Installation
```bash
# Connect to database
psql -U postgres -d gooddays

# Check tables
\dt

# Check functions
\df

# Sample query
SELECT COUNT(*) FROM user_profiles;
```

---

## 📊 Database Schema Overview

### Core Entities
```
user_profiles (base user account)
  ↓
  ├─ tasks (what needs to be done)
  ├─ daily_tracking (daily metrics)
  ├─ expenses (spending records)
  └─ gamification_entries (achievement tracking)
```

### Financial Module
```
financial_goals (targets)
  ↓
investment_buckets (categories)
  ↓
monthly_tasks (recurring actions)
  ↓
monthly_task_completions (progress tracking)
  ↓
monthly_snapshots (monthly summary)
```

### Research & Thesis
```
thesis_protocols (research project)
  ↓
  ├─ thesis_patients (study subjects)
  ├─ thesis_deadlines (milestones)
  ├─ thesis_documents (files/papers)
  ├─ thesis_followups (patient visits)
  └─ thesis_stats (aggregated data)
```

### Health & Wellness
```
daily_tracking (daily metrics)
  ↓
  ├─ workouts (exercise records)
  ├─ journal_entries (reflections)
  └─ self_care_logs (care activities)
```

---

## 🔧 Key Features

### 1. **Transaction Safety**
All migrations are wrapped in `BEGIN...COMMIT` for atomicity

### 2. **Idempotent Operations**
- `CREATE TABLE IF NOT EXISTS` prevents errors on re-runs
- `INSERT...ON CONFLICT DO NOTHING` for seed data (prevents duplicates)

### 3. **Performance Indexes**
Strategic indexes on frequently queried columns:
- User-date combinations
- Foreign key lookups
- Recurring queries (deadlines, status)

### 4. **Data Integrity**
- Foreign key constraints with CASCADE deletes
- Unique constraints on composite keys
- CHECK constraints for valid enum values

### 5. **Automatic Timestamps**
All tables include:
- `created_at` (auto-set on insert)
- `updated_at` (optional, for modifications)

### 6. **PostgreSQL UUID Support**
Financial module uses UUID (gen_random_uuid()) for:
- Better distributed system compatibility
- Unique ID generation without sequences

---

## 📝 Schema Highlights

### Financial Buckets Categories
```sql
'EMERGENCY_FUND'   -- 6 months expenses safety net
'HEALTH'           -- Insurance, medical expenses
'TRAVEL'           -- Vacation and travel fund
'MISCELLANEOUS'    -- General savings
'WEALTH'           -- Long-term investments
'TRADING'          -- Active trading account
```

### Monthly Task Types
```sql
'SIP_PAYMENT'           -- Systematic Investment Plan
'EMI_PAYMENT'           -- Equated Monthly Installation
'INSURANCE_REVIEW'      -- Insurance policy checkup
'PORTFOLIO_REVIEW'      -- Investment portfolio review
'EMERGENCY_FUND_CHECK'  -- Fund balance verification
'TRAVEL_FUND_CHECK'     -- Travel savings progress
'CUSTOM'                -- Custom task
```

### Financial Rules Categories
```sql
'INVESTMENT'  -- Investment strategies and rules
'TRADING'     -- Trading specific guidelines
'MINDSET'     -- Decision-making frameworks
'LIFESTYLE'   -- Spending and lifestyle choices
```

---

## 🔑 Primary Keys & Relationships

### Auto-Increment IDs
Most core tables use SERIAL (auto-incrementing integers):
- user_profiles, tasks, daily_tracking, workouts, etc.

### UUID Primary Keys
Financial module uses UUID for better scalability:
- financial_goals, investment_buckets, monthly_tasks, etc.

### Foreign Key Relationships
```sql
tasks.user_id → user_profiles.id (ON DELETE CASCADE)
expenses.user_id → user_profiles.id (ON DELETE CASCADE)
thesis_patients.protocol_id → thesis_protocols.id (ON DELETE CASCADE)
```

---

## 📈 Sample Data

### Investment Buckets
| Bucket | Category | Monthly Target | Color | Icon |
|--------|----------|-----------------|-------|------|
| Emergency Fund | EMERGENCY_FUND | ₹15,000 | #EF4444 | shield |
| Health Insurance | HEALTH | ₹5,000 | #EC4899 | heart |
| Travel Fund | TRAVEL | ₹8,000 | #06B6D4 | plane |
| Wealth Building | WEALTH | ₹20,000 | #10B981 | trending-up |
| Trading Account | TRADING | ₹10,000 | #F59E0B | bar-chart-3 |

### Financial Rules (Sample)
- "Pay Yourself First" - Allocate percentages before spending
- "Build Emergency Fund First" - 6 months expenses priority
- "Diversification is Key" - Multiple asset classes
- "No Emotional Trading" - Follow system rules
- "Risk Management First" - Stop-losses before entry

---

## 🛠️ Maintenance & Troubleshooting

### Reset Database
```bash
psql -U postgres -d gooddays -f 000_rollback_all.sql
psql -U postgres -d gooddays -f 001_core_and_financial_schema.sql
psql -U postgres -d gooddays -f 002_new_features_schema.sql
psql -U postgres -d gooddays -f 003_seed_financial_data.sql
```

### Check Table Sizes
```sql
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Verify Indexes
```sql
SELECT * FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename;
```

### Check Foreign Key Relationships
```sql
SELECT * FROM information_schema.table_constraints 
WHERE table_schema = 'public' AND constraint_type = 'FOREIGN KEY';
```

---

## 📚 Future Enhancements

Potential future migrations:
- User preferences and settings table
- Audit logs for financial transactions
- Multi-user collaboration features
- Data archival and retention policies
- Report generation tables
- Integration with external APIs (banking, investments)

---

## 📞 Support & Questions

For migration issues:
1. Check PostgreSQL logs: `psql -l`
2. Verify database permissions: `\du`
3. Test individual migrations in order
4. Check foreign key dependencies

---

## 🔐 Security Notes

- Use environment variables for credentials in production
- Implement row-level security (RLS) for multi-user scenarios
- Encrypt sensitive financial data at rest
- Audit all financial transaction modifications
- Regular backups before running migrations

---

**Last Updated:** 2025-01-29
**Database Version:** PostgreSQL 12+
**App Version:** GoodDays 1.0
