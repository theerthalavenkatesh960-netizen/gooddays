# GoodDays Database Schema Documentation

## 📊 Entity Relationship Diagram Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      USER PROFILES (Core)                        │
│                    ├─ id, email, name, etc.                     │
│                    ├─ points, level, theme                      │
└──────────────────────────────┬──────────────────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                ▼               ▼               ▼
        ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
        │ TASKS        │  │ DAILY        │  │ EXPENSES     │
        │              │  │ TRACKING     │  │              │
        │ • Core work  │  │              │  │ • Financial  │
        │ • Recurring  │  │ • Metrics    │  │   records    │
        │ • Status     │  │ • Mood       │  │ • Category   │
        └──────────────┘  └──────────────┘  └──────────────┘
                │               │               │
        ┌───────┴───┐   ┌───────┴───┐   ┌─────┴──────┐
        ▼           ▼   ▼           ▼   ▼            ▼
```

---

## 🗂️ Core Tables (601_core_and_financial_schema.sql)

### 1. **user_profiles** - User Accounts
Primary key: `id` (SERIAL)
```sql
id                  SERIAL PRIMARY KEY
email               TEXT UNIQUE NOT NULL
password_hash       TEXT NOT NULL
name                TEXT NOT NULL
phone               TEXT
google_id           TEXT
level               INTEGER (1-5)
points              INTEGER
theme               TEXT ('light', 'dark')
created_at          TIMESTAMPTZ
updated_at          TIMESTAMPTZ
```

**Purpose:** Core user account and profile information
**Indexes:** email, created_at

---

### 2. **tasks** - Task Management
Primary key: `id` (SERIAL)
Foreign key: `user_id` → user_profiles
```sql
id                      SERIAL PRIMARY KEY
user_id                 INTEGER FK
title                   TEXT NOT NULL
category                TEXT
priority                TEXT ('low', 'medium', 'high')
due_date                DATE
recurring               BOOLEAN
recurrence_start_date   DATE
recurrence_end_date     DATE
recurrence_interval     INTEGER
recurrence_unit         TEXT ('day', 'week', 'month')
recurrence_days         TEXT[] (days of week)
recurrence_id           INTEGER
status                  TEXT ('pending', 'completed', 'cancelled')
created_at              TIMESTAMPTZ
completed_at            TIMESTAMPTZ
```

**Purpose:** Core task management with recurring support
**Indexes:** user_id, due_date, status

---

### 3. **daily_tracking** - Daily Metrics
Primary key: `id` (SERIAL)
Foreign key: `user_id` → user_profiles
Unique constraint: `(user_id, date)`
```sql
id                  SERIAL PRIMARY KEY
user_id             INTEGER FK
date                DATE
sleepHours          NUMERIC
workoutMinutes      INTEGER
phoneMinutes        INTEGER
sunlight            BOOLEAN
mood                INTEGER (1-5)
waterCups           INTEGER
waterGoalCups       INTEGER
calories            INTEGER
note                TEXT
created_at          TIMESTAMPTZ
```

**Purpose:** Track daily health and wellness metrics
**Indexes:** user_id, date, mood

---

### 4. **expenses** - Financial Tracking
Primary key: `id` (SERIAL)
Foreign key: `user_id` → user_profiles
```sql
id          SERIAL PRIMARY KEY
user_id     INTEGER FK
amount      NUMERIC NOT NULL
category    TEXT
note        TEXT
date        TIMESTAMPTZ NOT NULL
created_at  TIMESTAMPTZ
```

**Purpose:** Track individual expenses
**Indexes:** user_id, date, category

---

### 5. **focus_sessions** - Pomodoro/Focus Timer
Primary key: `id` (SERIAL)
Foreign key: `user_id` → user_profiles
```sql
id              SERIAL PRIMARY KEY
user_id         INTEGER FK
task_name       TEXT NOT NULL
duration        INTEGER (minutes)
started_at      TIMESTAMPTZ NOT NULL
completed_at    TIMESTAMPTZ NOT NULL
created_at      TIMESTAMPTZ
```

**Purpose:** Track focus/pomodoro sessions
**Indexes:** user_id, started_at

---

### 6. **daily_top_three** - Daily Top 3 Tasks
Primary key: `id` (SERIAL)
Foreign key: `user_id` → user_profiles
Unique constraint: `(user_id, date)`
```sql
id          SERIAL PRIMARY KEY
user_id     INTEGER FK
date        DATE
task_1      TEXT
task_2      TEXT
task_3      TEXT
completed_1 BOOLEAN
completed_2 BOOLEAN
completed_3 BOOLEAN
created_at  TIMESTAMPTZ
```

**Purpose:** Track top 3 daily priorities
**Indexes:** user_id, date

---

### 7. **daily_notes** - Daily Journal
Primary key: `id` (SERIAL)
Foreign key: `user_id` → user_profiles
Unique constraint: `(user_id, date)`
```sql
id          SERIAL PRIMARY KEY
user_id     INTEGER FK
date        DATE
note        TEXT
created_at  TIMESTAMPTZ
```

**Purpose:** Daily reflections and notes
**Indexes:** user_id, date

---

### 8. **study_sessions** - Study Tracking
Primary key: `id` (SERIAL)
Foreign key: `user_id` → user_profiles
Unique constraint: `(user_id, date)`
```sql
id              SERIAL PRIMARY KEY
user_id         INTEGER FK
date            DATE
durationMinutes INTEGER
notes           TEXT
created_at      TIMESTAMPTZ
```

**Purpose:** Track study sessions per day
**Indexes:** user_id, date

---

### 9. **study_resources** - Study Materials
Primary key: `id` (SERIAL)
Foreign key: `user_id` → user_profiles
```sql
id          SERIAL PRIMARY KEY
user_id     INTEGER FK
name        TEXT NOT NULL
created_at  TIMESTAMPTZ
```

**Purpose:** Organize study materials/subjects
**Indexes:** user_id

---

### 10. **study_chapters** - Course Chapters
Primary key: `id` (SERIAL)
Foreign keys: `resource_id` → study_resources, `user_id` → user_profiles
```sql
id          SERIAL PRIMARY KEY
resource_id INTEGER FK
user_id     INTEGER FK
name        TEXT NOT NULL
status      TEXT ('not_started', 'in_progress', 'completed')
video_link  TEXT
created_at  TIMESTAMPTZ
```

**Purpose:** Track individual chapters within resources
**Indexes:** resource_id, status

---

### 11. **self_care_template** - Self-Care Categories
Primary key: `id` (SERIAL)
Foreign key: `user_id` → user_profiles
```sql
id          SERIAL PRIMARY KEY
user_id     INTEGER FK
category    TEXT NOT NULL
item        TEXT NOT NULL
order_index INTEGER
created_at  TIMESTAMPTZ
```

**Purpose:** Define self-care activities
**Indexes:** user_id, category

---

### 12. **self_care_logs** - Self-Care History
Primary key: `id` (SERIAL)
Foreign keys: `user_id` → user_profiles, `template_id` → self_care_template
Unique constraint: `(user_id, date, template_id)`
```sql
id          SERIAL PRIMARY KEY
user_id     INTEGER FK
date        DATE
template_id INTEGER FK
completed   BOOLEAN
created_at  TIMESTAMPTZ
```

**Purpose:** Track completed self-care activities
**Indexes:** user_id, date, template_id

---

### 13. **gamification_entries** - Points System
Primary key: `id` (SERIAL)
Foreign key: `user_id` → user_profiles
```sql
id              SERIAL PRIMARY KEY
user_id         INTEGER FK
activity_type   TEXT NOT NULL
points          INTEGER NOT NULL
date            TIMESTAMPTZ
created_at      TIMESTAMPTZ
```

**Purpose:** Track point awards for achievements
**Indexes:** user_id, date

---

## 💰 Financial Module Tables

### 14. **financial_goals** - Investment Goals
Primary key: `id` (UUID)
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
name            VARCHAR(100) NOT NULL
target_amount   DECIMAL(12,2) NOT NULL
target_date     DATE
created_at      TIMESTAMPTZ
is_active       BOOLEAN DEFAULT TRUE
```

**Purpose:** Define long-term financial targets
**Examples:** Emergency Fund, Travel Fund, Education, Investment Portfolio

---

### 15. **investment_buckets** - Budget Categories
Primary key: `id` (UUID)
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
name            VARCHAR(100) NOT NULL
category        VARCHAR(50) NOT NULL
                CHECK (category IN ('EMERGENCY_FUND', 'HEALTH', 'TRAVEL', 'MISCELLANEOUS', 'WEALTH', 'TRADING'))
monthly_target  DECIMAL(10,2)
color_hex       VARCHAR(7)
icon            VARCHAR(50)
is_active       BOOLEAN DEFAULT TRUE
sort_order      INT
created_at      TIMESTAMPTZ
```

**Purpose:** Organize spending into investment buckets
**Categories:** Emergency Fund, Health, Travel, Wealth, Trading, Miscellaneous

---

### 16. **monthly_tasks** - Recurring Financial Tasks
Primary key: `id` (UUID)
Foreign key: `bucket_id` → investment_buckets
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
bucket_id       UUID FK NOT NULL
title           VARCHAR(200) NOT NULL
description     TEXT
task_type       VARCHAR(50) CHECK (task_type IN (
                  'SIP_PAYMENT', 'EMI_PAYMENT', 'INSURANCE_REVIEW', 
                  'PORTFOLIO_REVIEW', 'EMERGENCY_FUND_CHECK', 'TRAVEL_FUND_CHECK', 'CUSTOM'))
amount          DECIMAL(10,2)
is_recurring    BOOLEAN DEFAULT FALSE
recurrence_day  INT CHECK (1-31)
is_active       BOOLEAN DEFAULT TRUE
created_at      TIMESTAMPTZ
```

**Purpose:** Define recurring financial tasks (SIPs, EMIs, reviews)
**Indexes:** bucket_id, is_active

---

### 17. **monthly_task_completions** - Task Progress
Primary key: `id` (UUID)
Foreign key: `task_id` → monthly_tasks
Unique constraint: `(task_id, month, year)`
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
task_id         UUID FK NOT NULL
month           INT CHECK (1-12)
year            INT CHECK (>=2024)
is_completed    BOOLEAN DEFAULT FALSE
completed_at    TIMESTAMPTZ
actual_amount   DECIMAL(10,2)
notes           VARCHAR(500)
created_at      TIMESTAMPTZ
```

**Purpose:** Track monthly task completion and progress
**Indexes:** task_id, month, year

---

### 18. **financial_rules** - Investment Guidelines
Primary key: `id` (UUID)
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
title           VARCHAR(200) NOT NULL
description     TEXT
category        VARCHAR(50) CHECK (category IN (
                  'INVESTMENT', 'TRADING', 'MINDSET', 'LIFESTYLE'))
display_style   VARCHAR(50) CHECK (display_style IN (
                  'BANNER', 'CARD', 'POPUP', 'SIDEBAR'))
is_active       BOOLEAN DEFAULT TRUE
sort_order      INT
created_at      TIMESTAMPTZ
```

**Purpose:** Store and display financial principles and rules
**Categories:** Investment, Trading, Mindset, Lifestyle
**Examples:** "Pay Yourself First", "Diversification is Key", "No Emotional Trading"

---

### 19. **monthly_snapshots** - Monthly Summary
Primary key: `id` (UUID)
Unique constraint: `(month, year)`
```sql
id                          UUID PRIMARY KEY DEFAULT gen_random_uuid()
month                       INT CHECK (1-12)
year                        INT CHECK (>=2024)
total_income                DECIMAL(10,2)
total_expenses              DECIMAL(10,2)
total_invested              DECIMAL(10,2)
emergency_fund_balance      DECIMAL(10,2)
travel_fund_balance         DECIMAL(10,2)
portfolio_estimated_value   DECIMAL(12,2)
notes                       TEXT
created_at                  TIMESTAMPTZ
```

**Purpose:** Monthly financial summary and analytics
**Indexes:** year, month

---

## 🎯 New Features Tables (002_new_features_schema.sql)

### 20. **workouts** - Exercise Tracking
Primary key: `id` (SERIAL)
Foreign key: `user_id` → user_profiles
Unique constraint: `(user_id, date, exercise_name)`
```sql
id              SERIAL PRIMARY KEY
user_id         INTEGER FK
exercise_name   TEXT NOT NULL
duration        INTEGER (minutes) NOT NULL
intensity       TEXT ('light', 'moderate', 'intense')
calories_burned INTEGER
notes           TEXT
date            DATE NOT NULL
created_at      TIMESTAMPTZ
```

**Purpose:** Log individual workouts
**Indexes:** user_id, date

---

### 21. **workout_templates** - Pre-defined Workouts
Primary key: `id` (SERIAL)
Foreign key: `user_id` → user_profiles
```sql
id          SERIAL PRIMARY KEY
user_id     INTEGER FK
name        TEXT NOT NULL
exercises   JSONB NOT NULL
difficulty  TEXT
duration    INTEGER
created_at  TIMESTAMPTZ
```

**Purpose:** Save and reuse workout routines
**Example exercises:** [{"name": "Running", "duration": 30}, {"name": "Weights", "duration": 45}]

---

### 22. **personal_goals** - Life Aspirations
Primary key: `id` (SERIAL)
Foreign key: `user_id` → user_profiles
```sql
id          SERIAL PRIMARY KEY
user_id     INTEGER FK
title       TEXT NOT NULL
description TEXT
category    TEXT NOT NULL
target_date DATE
status      TEXT ('active', 'completed', 'archived')
priority    TEXT ('low', 'medium', 'high')
progress    INTEGER (0-100)
created_at  TIMESTAMPTZ
completed_at TIMESTAMPTZ
```

**Purpose:** Track personal goals and aspirations
**Indexes:** user_id, status, target_date

---

### 23. **goal_milestones** - Goal Sub-tasks
Primary key: `id` (SERIAL)
Foreign keys: `goal_id` → personal_goals, `user_id` → user_profiles
```sql
id          SERIAL PRIMARY KEY
goal_id     INTEGER FK
user_id     INTEGER FK
title       TEXT NOT NULL
target_date DATE
completed_at TIMESTAMPTZ
order_index INTEGER
created_at  TIMESTAMPTZ
```

**Purpose:** Break goals into achievable milestones
**Indexes:** goal_id, order_index

---

### 24. **reminders** - Scheduled Notifications
Primary key: `id` (SERIAL)
Foreign key: `user_id` → user_profiles
```sql
id              SERIAL PRIMARY KEY
user_id         INTEGER FK
title           TEXT NOT NULL
description     TEXT
reminder_type   TEXT NOT NULL
scheduled_time  TIMESTAMPTZ NOT NULL
frequency       TEXT ('once', 'daily', 'weekly', 'monthly')
is_active       BOOLEAN DEFAULT TRUE
is_completed    BOOLEAN DEFAULT FALSE
created_at      TIMESTAMPTZ
```

**Purpose:** Schedule reminders and notifications
**Indexes:** user_id, scheduled_time

---

### 25. **notifications** - Notification History
Primary key: `id` (SERIAL)
Foreign key: `user_id` → user_profiles
```sql
id          SERIAL PRIMARY KEY
user_id     INTEGER FK
type        TEXT NOT NULL
title       TEXT NOT NULL
message     TEXT
is_read     BOOLEAN DEFAULT FALSE
action_url  TEXT
created_at  TIMESTAMPTZ
```

**Purpose:** Store notification history
**Indexes:** user_id, is_read, created_at

---

### 26. **journal_entries** - Daily Journaling
Primary key: `id` (SERIAL)
Foreign key: `user_id` → user_profiles
Unique constraint: `(user_id, date)`
```sql
id          SERIAL PRIMARY KEY
user_id     INTEGER FK
title       TEXT NOT NULL
content     TEXT NOT NULL
mood        INTEGER (1-5)
tags        TEXT[]
is_private  BOOLEAN DEFAULT TRUE
date        DATE NOT NULL
created_at  TIMESTAMPTZ
```

**Purpose:** Journaling and reflection
**Indexes:** user_id, date, mood

---

### 27. **reflection_prompts** - Journal Prompts
Primary key: `id` (SERIAL)
```sql
id          SERIAL PRIMARY KEY
category    TEXT NOT NULL
prompt      TEXT NOT NULL
order_index INTEGER
is_active   BOOLEAN DEFAULT TRUE
created_at  TIMESTAMPTZ
```

**Purpose:** Provide journal prompts for guided reflection

---

### 28. **thesis_protocols** - Research Projects
Primary key: `id` (SERIAL)
Foreign key: `user_id` → user_profiles
Unique constraint: `name`
```sql
id          SERIAL PRIMARY KEY
user_id     INTEGER FK
name        TEXT NOT NULL UNIQUE
description TEXT
status      TEXT ('draft', 'active', 'completed')
created_at  TIMESTAMPTZ
updated_at  TIMESTAMPTZ
```

**Purpose:** Create research protocol projects
**Indexes:** user_id, status

---

### 29. **thesis_patients** - Study Subjects
Primary key: `id` (SERIAL)
Foreign keys: `protocol_id` → thesis_protocols, `user_id` → user_profiles
Unique constraint: `(protocol_id, patient_id)`
```sql
id              SERIAL PRIMARY KEY
protocol_id     INTEGER FK
user_id         INTEGER FK
patient_id      TEXT NOT NULL
age             INTEGER
gender          TEXT
diagnosis       TEXT
enrollment_date DATE
status          TEXT ('active', 'completed', 'withdrawn')
notes           TEXT
created_at      TIMESTAMPTZ
```

**Purpose:** Track study participants
**Indexes:** protocol_id, status

---

### 30. **thesis_deadlines** - Research Milestones
Primary key: `id` (SERIAL)
Foreign keys: `protocol_id` → thesis_protocols, `user_id` → user_profiles
```sql
id              SERIAL PRIMARY KEY
protocol_id     INTEGER FK
user_id         INTEGER FK
milestone       TEXT NOT NULL
deadline        DATE NOT NULL
priority        TEXT ('low', 'medium', 'high')
status          TEXT ('pending', 'completed', 'overdue')
completed_at    TIMESTAMPTZ
notes           TEXT
created_at      TIMESTAMPTZ
```

**Purpose:** Track thesis project milestones
**Indexes:** protocol_id, deadline, status

---

### 31. **thesis_documents** - Research Papers
Primary key: `id` (SERIAL)
Foreign keys: `protocol_id` → thesis_protocols, `user_id` → user_profiles
```sql
id          SERIAL PRIMARY KEY
protocol_id INTEGER FK
user_id     INTEGER FK
doc_name    TEXT NOT NULL
file_path   TEXT
version     INTEGER
status      TEXT ('draft', 'review', 'published')
created_at  TIMESTAMPTZ
updated_at  TIMESTAMPTZ
```

**Purpose:** Manage thesis documents and versions
**Indexes:** protocol_id, status

---

### 32. **thesis_followups** - Patient Follow-ups
Primary key: `id` (SERIAL)
Foreign keys: `protocol_id` → thesis_protocols, `user_id` → user_profiles, `patient_id` → thesis_patients
```sql
id              SERIAL PRIMARY KEY
protocol_id     INTEGER FK
user_id         INTEGER FK
patient_id      INTEGER FK
followup_date   DATE NOT NULL
followup_type   TEXT ('routine', 'urgent', 'final')
findings        TEXT
next_followup   DATE
status          TEXT ('pending', 'completed', 'missed')
created_at      TIMESTAMPTZ
```

**Purpose:** Track patient follow-up visits
**Indexes:** patient_id, followup_date

---

### 33. **thesis_stats** - Research Analytics
Primary key: `id` (SERIAL)
Foreign keys: `protocol_id` → thesis_protocols, `user_id` → user_profiles
```sql
id                  SERIAL PRIMARY KEY
protocol_id         INTEGER FK
user_id             INTEGER FK
total_patients      INTEGER
active_patients     INTEGER
completed_patients  INTEGER
total_followups     INTEGER
documents_count     INTEGER
last_updated        TIMESTAMPTZ
```

**Purpose:** Aggregated statistics for research projects
**Indexes:** protocol_id

---

### 34. **deadlines** - Project Deadlines
Primary key: `id` (SERIAL)
Foreign key: `user_id` → user_profiles
```sql
id          SERIAL PRIMARY KEY
user_id     INTEGER FK
title       TEXT NOT NULL
project     TEXT
due_date    DATE NOT NULL
priority    TEXT ('low', 'medium', 'high')
status      TEXT ('pending', 'completed', 'overdue')
completed_at TIMESTAMPTZ
notes       TEXT
created_at  TIMESTAMPTZ
```

**Purpose:** General deadline tracking
**Indexes:** user_id, due_date, status

---

### 35. **projects** - User Projects
Primary key: `id` (SERIAL)
Foreign key: `user_id` → user_profiles
Unique constraint: `(user_id, name)`
```sql
id          SERIAL PRIMARY KEY
user_id     INTEGER FK
name        TEXT NOT NULL
description TEXT
status      TEXT ('active', 'completed', 'archived')
progress    INTEGER (0-100)
created_at  TIMESTAMPTZ
```

**Purpose:** Organize deadlines and tasks by project
**Indexes:** user_id

---

### 36. **followups** - Task Follow-ups
Primary key: `id` (SERIAL)
Foreign key: `user_id` → user_profiles
```sql
id          SERIAL PRIMARY KEY
user_id     INTEGER FK
related_to  TEXT NOT NULL
related_id  INTEGER
task_title  TEXT NOT NULL
deadline    DATE NOT NULL
status      TEXT ('pending', 'completed')
priority    TEXT ('low', 'medium', 'high')
notes       TEXT
created_at  TIMESTAMPTZ
```

**Purpose:** Track follow-up tasks
**Indexes:** user_id, deadline

---

### 37. **dashboard_snapshots** - Daily Analytics
Primary key: `id` (SERIAL)
Foreign key: `user_id` → user_profiles
Unique constraint: `(user_id, date)`
```sql
id              SERIAL PRIMARY KEY
user_id         INTEGER FK
date            DATE
completed_tasks INTEGER
points_earned   INTEGER
streak_days     INTEGER
mood_average    NUMERIC
created_at      TIMESTAMPTZ
```

**Purpose:** Daily dashboard metrics
**Indexes:** user_id, date

---

### 38. **study_groups** - Collaborative Learning
Primary key: `id` (SERIAL)
Foreign key: `created_by` → user_profiles
Unique constraint: `name`
```sql
id          SERIAL PRIMARY KEY
name        TEXT NOT NULL UNIQUE
description TEXT
created_by  INTEGER FK
is_active   BOOLEAN DEFAULT TRUE
created_at  TIMESTAMPTZ
```

**Purpose:** Create group study spaces
**Indexes:** is_active

---

### 39. **study_group_members** - Group Membership
Primary key: `id` (SERIAL)
Foreign keys: `study_group_id` → study_groups, `user_id` → user_profiles
Unique constraint: `(study_group_id, user_id)`
```sql
id              SERIAL PRIMARY KEY
study_group_id  INTEGER FK
user_id         INTEGER FK
joined_at       TIMESTAMPTZ
```

**Purpose:** Track group membership
**Indexes:** study_group_id, user_id

---

## 📈 Performance Indexes Summary

### Core Indexes
```sql
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_daily_tracking_user_date ON daily_tracking(user_id, date);
CREATE INDEX idx_expenses_user_id ON expenses(user_id);
```

### Financial Module Indexes
```sql
CREATE INDEX idx_monthly_tasks_bucket_id ON monthly_tasks(bucket_id);
CREATE INDEX idx_monthly_tasks_is_active ON monthly_tasks(is_active);
CREATE INDEX idx_investment_buckets_is_active ON investment_buckets(is_active);
```

### New Features Indexes
```sql
CREATE INDEX idx_workouts_user_date ON workouts(user_id, date);
CREATE INDEX idx_journal_entries_user_date ON journal_entries(user_id, date);
CREATE INDEX idx_thesis_deadlines_deadline ON thesis_deadlines(deadline);
```

---

## 🔗 Foreign Key Relationships

### Cascade Delete Rules
Most foreign keys use `ON DELETE CASCADE` to:
- Auto-delete related data when parent is deleted
- Keep database referential integrity
- Example: Deleting a user deletes all their tasks

### Relationships Map
```
user_profiles (root)
├── tasks
├── daily_tracking
├── expenses
├── focus_sessions
├── study_sessions
├── study_resources
│   └── study_chapters
├── self_care_template
│   └── self_care_logs
├── gamification_entries
├── workouts
├── workout_templates
├── personal_goals
│   └── goal_milestones
├── reminders
├── notifications
├── journal_entries
├── thesis_protocols
│   ├── thesis_patients
│   │   └── thesis_followups
│   ├── thesis_deadlines
│   ├── thesis_documents
│   ├── thesis_stats
├── deadlines
├── projects
├── followups
├── dashboard_snapshots
└── study_groups
    └── study_group_members
```

---

## 📝 Constraints & Validation

### Check Constraints
```sql
-- Investment Buckets
category IN ('EMERGENCY_FUND', 'HEALTH', 'TRAVEL', 'MISCELLANEOUS', 'WEALTH', 'TRADING')

-- Monthly Tasks
task_type IN ('SIP_PAYMENT', 'EMI_PAYMENT', 'INSURANCE_REVIEW', ...)
recurrence_day BETWEEN 1 AND 31

-- Financial Rules
category IN ('INVESTMENT', 'TRADING', 'MINDSET', 'LIFESTYLE')
display_style IN ('BANNER', 'CARD', 'POPUP', 'SIDEBAR')

-- Daily Tracking
mood BETWEEN 1 AND 5

-- Snapshots
month BETWEEN 1 AND 12
year >= 2024
```

### Unique Constraints
```sql
user_profiles(email)
tasks(recurring_id)
daily_tracking(user_id, date)
journal_entries(user_id, date)
study_sessions(user_id, date)
investment_buckets(name)
monthly_task_completions(task_id, month, year)
monthly_snapshots(month, year)
projects(user_id, name)
study_groups(name)
study_group_members(study_group_id, user_id)
```

---

## 🔐 Security & Compliance

### Data Protection
- Password hashing (password_hash, not plain text)
- Private journal entries flagged
- User-scoped data isolation
- Timestamps for audit trails

### GDPR Considerations
- User data isolated by user_id
- Delete operations cascading to clean up
- Audit timestamps on all records
- No sensitive data in plaintext

### Performance Optimization
- Strategic composite indexes on frequent query patterns
- Timestamp indexes for date-based queries
- Foreign key indexes for joins
- Status indexes for filtering

---

## 📚 Analytics Queries

### User Activity Summary
```sql
SELECT 
  u.id, u.name, 
  COUNT(t.id) as total_tasks,
  COUNT(DISTINCT t.due_date) as days_with_tasks,
  AVG(dt.mood) as avg_mood
FROM user_profiles u
LEFT JOIN tasks t ON u.id = t.user_id
LEFT JOIN daily_tracking dt ON u.id = dt.user_id
GROUP BY u.id;
```

### Financial Progress
```sql
SELECT 
  ib.name,
  SUM(mtc.actual_amount) as invested,
  ib.monthly_target * 12 as annual_target
FROM investment_buckets ib
LEFT JOIN monthly_tasks mt ON ib.id = mt.bucket_id
LEFT JOIN monthly_task_completions mtc ON mt.id = mtc.task_id
GROUP BY ib.id;
```

---

**Last Updated:** 2025-01-29
**Total Tables:** 39
**Total Views:** 0 (can be added for analytics)
