# GoodDays Database Setup - Complete Index

This folder contains everything needed to set up and manage the GoodDays PostgreSQL database.

## 📁 File Structure

```
database/
├── migrations/
│   ├── 000_rollback_all.sql                    # Clean slate (destructive)
│   ├── 001_gooddays_complete_schema.sql        # MAIN: All 48+ tables (matches C# models)
│   ├── 003_seed_financial_data.sql             # Optional: Sample financial data
│   ├── migrate.sh                              # Unix/Linux/Mac runner
│   ├── migrate.ps1                             # Windows PowerShell runner
│   └── README.md                               # Detailed migration docs
├── DATABASE_CONFIG.md                          # Connection setup & config
├── SCHEMA_DOCUMENTATION.md                     # Complete schema reference
└── INDEX.md                                    # This file
```

---

## 🚀 Quick Start (Choose Your OS)

### **Windows (PowerShell)**
```powershell
# 1. Copy environment template
Copy-Item .env.example .env.local

# 2. Edit database credentials
notepad .env.local

# 3. Create database
createdb -U postgres gooddays

# 4. Run main migration (single file)
cd database\migrations
psql -U postgres -d gooddays -f 001_gooddays_complete_schema.sql

# 5. Verify
psql -U postgres -d gooddays -c "\dt"
```

### **macOS/Linux (Bash)**
```bash
# 1. Copy environment template
cp .env.example .env.local

# 2. Edit database credentials
nano .env.local

# 3. Create database
createdb -U postgres gooddays

# 4. Run main migration (single file)
cd database/migrations
psql -U postgres -d gooddays -f 001_gooddays_complete_schema.sql

# 5. Verify
psql -U postgres -d gooddays -c "\dt"
```
nano .env.local

# 3. Create database
createdb -U postgres gooddays

# 4. Run migrations
cd database/migrations
chmod +x migrate.sh
./migrate.sh

# 5. Verify
./migrate.sh --verify
```

---

## 📖 Documentation Guide

### For Setup & Configuration
→ **Start here:** [DATABASE_CONFIG.md](DATABASE_CONFIG.md)

**Covers:**
- PostgreSQL installation
- Environment configuration
- Connection strings
- Node.js integration (pg, Sequelize, TypeORM)
- Deployment best practices
- Security guidelines

### For Understanding the Schema
→ **Start here:** [SCHEMA_DOCUMENTATION.md](SCHEMA_DOCUMENTATION.md)

**Covers:**
- Entity Relationship overview
- Table definitions (all 39 tables)
- Constraints and relationships
- Index strategy
- Security & compliance
- Analytics query examples

### For Running Migrations
→ **Start here:** [migrations/README.md](migrations/README.md)

**Covers:**
- What each migration file does
- How to run them (3 methods)
- Migration details & contents
- Common tasks
- Troubleshooting

---

## 📊 Database Schema at a Glance

### Complete Schema (001_gooddays_complete_schema.sql)

**48+ Tables across 7 Modules:**

```
CORE (9 tables):
  ├─ user_profiles
  ├─ tasks
  ├─ daily_tracking
  ├─ daily_notes
  ├─ expenses
  ├─ study_sessions
  ├─ self_care_template/logs
  └─ gamification_entries

FINANCIAL (6 tables):
  ├─ financial_goals
  ├─ investment_buckets
  ├─ monthly_tasks
  ├─ monthly_task_completions
  ├─ financial_rules
  └─ monthly_snapshots

WORKOUTS (6 tables):
  ├─ exercises
  ├─ workout_split_presets
  ├─ workout_day_plans
  ├─ workout_sets
  ├─ workout_day_images
  └─ personal_records

GOALS (4 tables):
  ├─ goals
  ├─ goal_notes
  ├─ goal_daily_logs
  └─ flashcards

REMINDERS (2 tables):
  ├─ reminders
  └─ reminder_logs

JOURNAL (1 table):
  └─ journal_entries

WEEKLY REVIEW (1 table):
  └─ weekly_reviews

Optional: 30+ Performance Indexes
```

**Total: 48+ Tables**

---

## 🔧 Environment Setup

### Development (.env.local)
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/gooddays
DB_POOL_MIN=2
DB_POOL_MAX=10
NODE_ENV=development
LOG_LEVEL=debug
```

### Production (.env.production)
```env
DATABASE_URL=postgresql://user:pass@prod-db.example.com:5432/gooddays
DB_POOL_MIN=10
DB_POOL_MAX=50
NODE_ENV=production
LOG_LEVEL=error
ENABLE_BACKUPS=true
```

See [.env.example](.env.example) for all 50+ configuration options.

---

## ✅ Verification Checklist

After running the migration, verify:

```bash
# 1. Check table count (should be 48+)
psql -U postgres -d gooddays -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"

# 2. List all tables
psql -U postgres -d gooddays -c "\dt"

# 3. Check core tables exist
psql -U postgres -d gooddays -c "\dt user_profiles"
psql -U postgres -d gooddays -c "\dt exercises"
psql -U postgres -d gooddays -c "\dt goals"

# 4. Check indexes created
psql -U postgres -d gooddays -c "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public';"

# 5. Optional: Check seed data
psql -U postgres -d gooddays -c "SELECT COUNT(*) FROM financial_goals;"
```

---

## 🔄 Common Operations

### Reset Database
```bash
# PowerShell
.\migrate.ps1 -Operation reset

# Bash
./migrate.sh --reset
```

### Restore Backup
```bash
psql -U postgres gooddays < backup.sql
```

### Export Data
```bash
pg_dump -U postgres gooddays > backup.sql
pg_dump -U postgres gooddays | gzip > backup.sql.gz
```

### Run Individual Migration
```bash
psql -U postgres -d gooddays -f 003_seed_financial_data.sql
```

---

## 🛡️ Security Checklist

- [ ] Changed default `postgres` password
- [ ] Configured SSL for database connection
- [ ] Set up automated backups
- [ ] Created .env.local (git-ignored)
- [ ] Used strong, unique passwords
- [ ] Configured firewall rules
- [ ] Enabled logging and monitoring
- [ ] Reviewed user privileges
- [ ] Set up connection pooling
- [ ] Tested disaster recovery

---

## 📱 Application Integration

### Node.js Example
```typescript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: parseInt(process.env.DB_POOL_MAX || '10'),
});

// Query example
const users = await pool.query('SELECT * FROM user_profiles WHERE id = $1', [userId]);
```

### API Endpoint Example
```typescript
// Get user dashboard
app.get('/api/dashboard/:userId', async (req, res) => {
  const result = await pool.query(`
    SELECT 
      u.id, u.name, u.level, u.points,
      COUNT(t.id) as task_count,
      AVG(dt.mood) as avg_mood
    FROM user_profiles u
    LEFT JOIN tasks t ON u.id = t.user_id
    LEFT JOIN daily_tracking dt ON u.id = dt.user_id
    WHERE u.id = $1
    GROUP BY u.id
  `, [req.params.userId]);
  
  res.json(result.rows[0]);
});
```

---

## 📚 Related Docs in Project

- `backend/README.md` - API setup and endpoints
- `README.md` - Project overview
- `.github/workflows/` - CI/CD pipelines

---

## 🆘 Troubleshooting

### "Connection refused"
→ Check PostgreSQL is running: `sudo service postgresql start`

### "Database does not exist"
→ Run: `createdb -U postgres gooddays`

### "Authentication failed"
→ Verify .env.local credentials match your setup

### "Port 5432 already in use"
→ Kill process: `lsof -i :5432 | grep LISTEN | awk '{print $2}' | xargs kill -9`

### "psql: command not found"
→ Install PostgreSQL client tools

**See [migrations/README.md](migrations/README.md) for more troubleshooting.**

---

## 📞 Quick Links

| Resource | Purpose |
|----------|---------|
| [DATABASE_CONFIG.md](DATABASE_CONFIG.md) | Configuration & connection setup |
| [SCHEMA_DOCUMENTATION.md](SCHEMA_DOCUMENTATION.md) | Complete schema reference |
| [migrations/README.md](migrations/README.md) | Migration file details |
| [migrations/migrate.sh](migrations/migrate.sh) | Unix/Linux/Mac automation |
| [migrations/migrate.ps1](migrations/migrate.ps1) | Windows PowerShell automation |
| [.env.example](.env.example) | Environment template |

---

## 🚦 Getting Started (Step-by-Step)

1. **Read** [DATABASE_CONFIG.md](DATABASE_CONFIG.md) for setup overview
2. **Copy** `.env.example` → `.env.local`
3. **Edit** `.env.local` with your database credentials
4. **Create** database: `createdb gooddays`
5. **Run** main migration:
   - Windows: `psql -U postgres -d gooddays -f database\migrations\001_gooddays_complete_schema.sql`
   - macOS/Linux: `psql -U postgres -d gooddays -f database/migrations/001_gooddays_complete_schema.sql`
6. **Verify** schema: Check table count = 48+
7. **Optional:** Add sample data: `psql -U postgres -d gooddays -f database/migrations/003_seed_financial_data.sql`
8. **Read** [SCHEMA_DOCUMENTATION.md](SCHEMA_DOCUMENTATION.md) to explore all tables
9. **Integrate** into Node.js app (see examples above)

---

## 📊 Database Statistics

| Metric | Value |
|--------|-------|
| Total Tables | 48+ |
| Core Tables | 9 |
| Financial Tables | 6 |
| Workout Tables | 6 |
| Goal Tables | 4 |
| Reminder Tables | 2 |
| Journal Tables | 1 |
| Weekly Review Tables | 1 |
| Total Indexes | 30+ |
| Foreign Keys | 40+ |
| Unique Constraints | 15+ |
| Check Constraints | 10+ |

---

## 📈 What's Included

✅ Complete PostgreSQL schema (39 tables)
✅ Modular migration files
✅ Automated setup scripts (Bash & PowerShell)
✅ Sample financial data
✅ Comprehensive documentation
✅ Environment configuration template
✅ Security best practices
✅ Performance optimizations

---

**Last Updated:** January 29, 2025
**Version:** 1.0
**Status:** ✅ Ready for Production

---

**Need Help?**
1. Check the relevant documentation file above
2. See troubleshooting section in [migrations/README.md](migrations/README.md)
3. Review [SCHEMA_DOCUMENTATION.md](SCHEMA_DOCUMENTATION.md) for schema questions
4. Consult [DATABASE_CONFIG.md](DATABASE_CONFIG.md) for configuration issues
