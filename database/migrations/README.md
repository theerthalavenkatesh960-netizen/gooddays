# GoodDays Database Migrations

This directory contains SQL migration files for the GoodDays application database. The database uses PostgreSQL 12+.

## 📋 Migration Files

### 001_up.sql
**Purpose:** Create complete database schema
**Status:** Primary migration - use this to initialize database
**Data Impact:** Creates schema only (no data loss)
**Tables:** 29 tables across 7 functional areas

**Tables Included:**
- **Core (9 tables):** user_profiles, tasks, daily_tracking, daily_notes, expenses, study_sessions, self_care_template, self_care_logs, gamification_entries
- **Financial (6 tables):** financial_goals, investment_buckets, monthly_tasks, monthly_task_completions, financial_rules, monthly_snapshots
- **Workouts (6 tables):** exercises, workout_split_presets, workout_day_plans, workout_sets, workout_day_images, personal_records
- **Goals (4 tables):** goals, goal_notes, goal_daily_logs, flashcards
- **Reminders (2 tables):** reminders, reminder_logs
- **Journal (1 table):** journal_entries
- **Weekly Review (1 table):** weekly_reviews
- **Indexes (30+):** Performance optimization

```bash
psql -U postgres -d gooddays -f 001_up.sql
```

### 001_down.sql
**Purpose:** Remove all database tables (rollback)
**Status:** Use to reset database for testing
**Data Impact:** ⚠️ **DESTRUCTIVE** - Deletes all tables and data

Use this to start fresh:
```bash
psql -U postgres -d gooddays -f 001_down.sql
```

### 002_up.sql
**Purpose:** Add meal planning feature (ingredients, templates, weekly plans)
**Status:** Run after 001_up.sql during deployment
**Data Impact:** Creates schema only (no data loss)
**Tables:** 3 new tables for meal management

**Tables Included:**
- **meal_ingredients:** User's ingredient library (macros: protein, carbs, fats, calories)
- **meal_templates:** Reusable meal recipes with ingredient snapshots (immutable at creation)
- **weekly_meal_plans:** Weekly meal planner state (one per user, upsert model)

Run after initializing with 001_up.sql:
```bash
psql -U postgres -d gooddays -f 002_up.sql
```

### 002_down.sql
**Purpose:** Remove meal planning tables (rollback)
**Status:** Use to revert meal feature
**Data Impact:** ⚠️ **DESTRUCTIVE** - Deletes meal_ingredients, meal_templates, weekly_meal_plans

Rollback sequence (if needed):
```bash
psql -U postgres -d gooddays -f 002_down.sql
```

## 🚀 Quick Start

### Create Database
```bash
createdb gooddays
```

### Initialize Schema (Sequential Migrations)
```bash
# Apply primary schema (29 tables)
psql -U postgres -d gooddays -f 001_up.sql

# Apply meal planning feature (3 new tables)
psql -U postgres -d gooddays -f 002_up.sql
```

### Seed Data (Separated Scripts)
```bash
# Seed meals only (ingredients + meal templates)
psql -U postgres -d gooddays -f seed_meals.sql

# Seed workouts only (exercise library + lean bulk split preset)
psql -U postgres -d gooddays -f seed_workouts.sql
```

Notes:
- Run `seed_meals.sql` and `seed_workouts.sql` separately.

### Verify Installation
```bash
psql -U postgres -d gooddays -c "SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'public';"
# Expected: 32 tables (29 from 001 + 3 from 002)
```

### Reset Database (if needed)
```bash
# Rollback in reverse order
psql -U postgres -d gooddays -f 002_down.sql
psql -U postgres -d gooddays -f 001_down.sql

# Reinitialize
psql -U postgres -d gooddays -f 001_up.sql
psql -U postgres -d gooddays -f 002_up.sql
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

### Meal Planning (v2.0)
```
meal_ingredients (user's ingredient library)
  ↓
meal_templates (reusable meal recipes with ingredient snapshots)
  ↓
weekly_meal_plans (weekly planner - one per user)
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

### Meal Planning Tables (v2.0)

#### meal_ingredients
User's personal ingredient library with nutritional information
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PRIMARY KEY | Auto-incrementing |
| user_id | BIGINT FK | References user_profiles.id (CASCADE) |
| name | VARCHAR(255) | Ingredient name (e.g., "Chicken Breast", "Brown Rice") |
| calories_kcal | DECIMAL(6,2) | Calories per standard serving |
| protein_g | DECIMAL(6,2) | Protein in grams |
| carbs_g | DECIMAL(6,2) | Carbohydrates in grams |
| fats_g | DECIMAL(6,2) | Fats in grams |
| created_at | TIMESTAMPTZ | Auto-set on insert |

**Purpose:** Building blocks for meal templates - allows reusable ingredient definitions with macros
**Performance:** Indexed on user_id for fast ingredient list queries

#### meal_templates
Reusable meal recipes with snapshotted ingredients (immutable at creation)
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PRIMARY KEY | Auto-incrementing |
| user_id | BIGINT FK | References user_profiles.id (CASCADE) |
| name | VARCHAR(255) | Meal name (e.g., "Grilled Chicken & Broccoli") |
| timing | VARCHAR(50) | Meal timing: breakfast, lunch, dinner, pre-workout, post-workout, snack |
| ingredients_json | TEXT | JSON snapshot of selected ingredients with macros (immutable) |
| recipe | TEXT | Preparation instructions |
| image_url | VARCHAR(500) | Optional meal image URL |
| created_at | TIMESTAMPTZ | Auto-set on insert |

**Purpose:** Reusable meal recipe definitions - ingredients captured as immutable snapshot (prevents macro calc drift if ingredient later modified)
**Format of ingredients_json:** `[{id, name, caloriesKcal, proteinG, carbsG, fatsG}, ...]`
**Performance:** Indexed on user_id for fast template list queries

#### weekly_meal_plans
Weekly meal planner state - tracks which meal templates assigned to each day (one per user)
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PRIMARY KEY | Auto-incrementing |
| user_id | BIGINT FK UNIQUE | References user_profiles.id (CASCADE) - **ONE per user** |
| plan_json | TEXT | JSON map of day → meal template IDs (e.g., `{"monday": [1, 3], "tuesday": [2]}`) |
| updated_at | TIMESTAMPTZ | Updated on every upsert |

**Purpose:** Weekly meal planner state - efficient upsert model with single record per user
**Format of plan_json:** `{day_name: [mealTemplateIds], ...}` where day_name in [monday, tuesday, ..., sunday]
**Usage Pattern:** GET to fetch plan, PUT to upsert (create if not exists, update if exists)
**Performance:** Indexed on user_id + UNIQUE constraint ensures one-per-user efficiency

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
