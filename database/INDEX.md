# GoodDays Database Setup - Complete Index

This folder contains everything needed to set up and manage the GoodDays PostgreSQL database.

## 📁 File Structure

```
database/
├── migrations/
│   ├── 000_rollback_all.sql              # Clean slate (destructive)
│   ├── 001_core_and_financial_schema.sql # Core + Financial module
│   ├── 002_new_features_schema.sql       # Workouts, Goals, Thesis, etc.
│   ├── 003_seed_financial_data.sql       # Sample financial data
│   ├── migrate.sh                        # Unix/Linux/Mac runner
│   ├── migrate.ps1                       # Windows PowerShell runner
│   └── README.md                         # Detailed migration docs
├── DATABASE_CONFIG.md                    # Connection setup & config
├── SCHEMA_DOCUMENTATION.md               # Complete schema reference
└── INDEX.md                              # This file
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

# 4. Run migrations
cd database\migrations
.\migrate.ps1

# 5. Verify
.\migrate.ps1 -Operation verify
```

### **macOS/Linux (Bash)**
```bash
# 1. Copy environment template
cp .env.example .env.local

# 2. Edit database credentials
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

### Three Migration Phases

**Phase 1 - Core (001_core_and_financial_schema.sql)**
```
13 Core Tables:
  ├─ user_profiles         (accounts & gamification)
  ├─ tasks                 (task management + recurring)
  ├─ daily_tracking        (health metrics: sleep, mood, water, etc.)
  ├─ daily_top_three       (daily priorities)
  ├─ daily_notes           (daily journal)
  ├─ expenses              (spending records)
  ├─ focus_sessions        (pomodoro timer)
  ├─ study_sessions        (study tracking)
  ├─ study_resources       (course materials)
  ├─ study_chapters        (course sections)
  ├─ self_care_template    (wellness checklist template)
  ├─ self_care_logs        (wellness tracking)
  └─ gamification_entries  (points system)

6 Financial Tables:
  ├─ financial_goals       (investment targets)
  ├─ investment_buckets    (6 budget categories)
  ├─ monthly_tasks         (recurring financial actions)
  ├─ monthly_task_completions (task progress)
  ├─ financial_rules       (investment principles)
  └─ monthly_snapshots     (monthly summary)
```

**Phase 2 - New Features (002_new_features_schema.sql)**
```
20 New Tables:
  ├─ workouts              (exercise tracking)
  ├─ workout_templates     (pre-made routines)
  ├─ personal_goals        (life aspirations)
  ├─ goal_milestones       (goal sub-tasks)
  ├─ reminders             (scheduled alerts)
  ├─ notifications         (notification history)
  ├─ journal_entries       (daily reflections)
  ├─ reflection_prompts    (journaling prompts)
  ├─ thesis_protocols      (research projects)
  ├─ thesis_patients       (study participants)
  ├─ thesis_deadlines      (research milestones)
  ├─ thesis_documents      (research papers)
  ├─ thesis_followups      (patient visits)
  ├─ thesis_stats          (research analytics)
  ├─ deadlines             (project deadlines)
  ├─ projects              (project organization)
  ├─ followups             (task follow-ups)
  ├─ dashboard_snapshots   (daily analytics)
  ├─ study_groups          (group learning)
  └─ study_group_members   (group membership)
```

**Phase 3 - Sample Data (003_seed_financial_data.sql)**
```
Includes:
  ├─ 5 Financial goals
  ├─ 6 Investment buckets
  ├─ 10 Monthly tasks
  ├─ 10 Financial rules
  └─ 3 Monthly snapshots
```

**Total: 39 Tables**

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

After running migrations, verify:

```bash
# 1. Check table count (should be 39)
psql -U postgres -d gooddays -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"

# 2. List all tables
psql -U postgres -d gooddays -c "\dt"

# 3. Check core tables exist
psql -U postgres -d gooddays -c "\dt user_profiles"
psql -U postgres -d gooddays -c "\dt investment_buckets"
psql -U postgres -d gooddays -c "\dt workouts"

# 4. Check indexes
psql -U postgres -d gooddays -c "SELECT * FROM pg_indexes WHERE schemaname = 'public';"

# 5. Count seed data
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
5. **Run** migrations: 
   - Windows: `cd database\migrations && .\migrate.ps1`
   - macOS/Linux: `cd database/migrations && ./migrate.sh`
6. **Verify** schema: Check table count = 39
7. **Read** [SCHEMA_DOCUMENTATION.md](SCHEMA_DOCUMENTATION.md) to explore tables
8. **Integrate** into Node.js app (see examples above)

---

## 📊 Database Statistics

| Metric | Value |
|--------|-------|
| Total Tables | 39 |
| Core Tables | 13 |
| Financial Tables | 6 |
| Feature Tables | 20 |
| Total Indexes | 25+ |
| Foreign Keys | 30+ |
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
