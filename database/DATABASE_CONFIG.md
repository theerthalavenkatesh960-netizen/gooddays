# Database Configuration & Setup Guide

## Quick Start

### 1. Install PostgreSQL

**Windows:**
```PowerShell
# Using Chocolatey
choco install postgresql

# Or download from: https://www.postgresql.org/download/windows/
```

**macOS:**
```bash
# Using Homebrew
brew install postgresql@15
brew services start postgresql@15

# Or download from: https://www.postgresql.org/download/macosx/
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib

sudo service postgresql start
```

### 2. Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Inside psql:
CREATE DATABASE gooddays;
\q
```

### 3. Run Migrations

**Using PowerShell (Windows):**
```PowerShell
cd database\migrations
.\migrate.ps1
```

**Using Bash (macOS/Linux):**
```bash
cd database/migrations
chmod +x migrate.sh
./migrate.sh
```

---

## Environment Configuration

### Development (Local)

Create `.env.local` in the project root:

```env
# Database Configuration
DATABASE_URL=postgresql://postgres:password@localhost:5432/gooddays
DB_USER=postgres
DB_PASSWORD=password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gooddays

# Connection Pool
DB_POOL_MIN=2
DB_POOL_MAX=10

# Node Environment
NODE_ENV=development

# API
API_PORT=5000
API_URL=http://localhost:5000
FRONTEND_URL=http://localhost:5173

# Logging
LOG_LEVEL=debug
```

### Staging

Create `.env.staging`:

```env
DATABASE_URL=postgresql://user:pass@staging-db.example.com:5432/gooddays
DB_USER=gooddays_user
DB_PASSWORD=${STAGING_DB_PASSWORD}
DB_HOST=staging-db.example.com
DB_PORT=5432
DB_NAME=gooddays

DB_POOL_MIN=5
DB_POOL_MAX=20

NODE_ENV=staging

API_PORT=5000
API_URL=https://staging-api.example.com
FRONTEND_URL=https://staging.gooddays.app

LOG_LEVEL=info
```

### Production

Create `.env.production`:

```env
DATABASE_URL=postgresql://user:pass@prod-db.example.com:5432/gooddays
DB_USER=gooddays_user
DB_PASSWORD=${PROD_DB_PASSWORD}
DB_HOST=prod-db.example.com
DB_PORT=5432
DB_NAME=gooddays

DB_POOL_MIN=10
DB_POOL_MAX=50

NODE_ENV=production

API_PORT=5000
API_URL=https://api.gooddays.app
FRONTEND_URL=https://gooddays.app

LOG_LEVEL=error
ENABLE_BACKUPS=true
BACKUP_SCHEDULE=0 2 * * *
```

---

## Connection Strings

### Format

```
postgresql://username:password@host:port/database?sslmode=require
```

### Examples

**Local Development:**
```
postgresql://postgres:password@localhost:5432/gooddays
```

**With SSL (Production):**
```
postgresql://user:password@db.example.com:5432/gooddays?sslmode=require
```

**Heroku:**
```
postgresql://xxxxx:xxxxx@ec2-xxx.compute-1.amazonaws.com:5432/xxxxx?sslmode=require
```

---

## Node.js Database Connection

### Using `pg` Module

```typescript
import { Pool } from 'pg';

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export default pool;
```

### Using Connection String

```typescript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export default pool;
```

### Using Sequelize (ORM)

```typescript
import { Sequelize } from 'sequelize';

const sequelize = new Sequelize(
  process.env.DB_NAME!,
  process.env.DB_USER!,
  process.env.DB_PASSWORD!,
  {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    dialect: 'postgres',
    logging: process.env.LOG_LEVEL === 'debug' ? console.log : false,
    pool: {
      max: 20,
      min: 5,
      acquire: 30000,
      idle: 10000,
    },
  }
);

export default sequelize;
```

### Using TypeORM

```typescript
import { DataSource } from 'typeorm';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  synchronize: false,
  logging: process.env.LOG_LEVEL === 'debug',
  entities: ['src/entities/**/*.ts'],
  migrations: ['src/migrations/**/*.ts'],
});
```

---

## Deployment Considerations

### Connection Pooling

Always use connection pooling in production:

```typescript
const pool = new Pool({
  max: 20,              // Maximum 20 connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### SSL/TLS

**Production must use SSL:**

```typescript
const connectionString = process.env.DATABASE_URL!;
const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: true,
    ca: fs.readFileSync('/path/to/ca-cert.pem').toString(),
  },
});
```

### Backups

**Automated daily backups:**

```bash
#!/bin/bash
# backup.sh
BACKUP_DIR="/backups/postgresql"
DATE=$(date +%Y%m%d_%H%M%S)

pg_dump -U $DB_USER -h $DB_HOST gooddays > $BACKUP_DIR/gooddays_$DATE.sql
gzip $BACKUP_DIR/gooddays_$DATE.sql

# Keep last 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
```

Schedule with cron:
```
0 2 * * * /usr/local/bin/backup.sh >> /var/log/db_backup.log 2>&1
```

### Monitoring

**Monitor database performance:**

```sql
-- Connection count
SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;

-- Slow queries
SELECT query, mean_exec_time, max_exec_time 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;

-- Table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## Common Tasks

### Reset Database

```bash
# Option 1: Using migration script
.\migrate.ps1 -Operation reset

# Option 2: Manual
dropdb -U postgres gooddays
createdb -U postgres gooddays
./migrate.sh
```

### Backup Database

```bash
# Full backup
pg_dump -U postgres gooddays > gooddays_backup.sql

# Compressed backup
pg_dump -U postgres gooddays | gzip > gooddays_backup.sql.gz

# Restore
psql -U postgres gooddays < gooddays_backup.sql
psql -U postgres gooddays < <(gunzip -c gooddays_backup.sql.gz)
```

### List All Tables

```bash
psql -U postgres -d gooddays -c "\dt"
```

### Drop Specific Table

```sql
DROP TABLE IF EXISTS table_name CASCADE;
```

### Export Data to CSV

```sql
COPY table_name TO '/tmp/export.csv' WITH CSV HEADER;
```

### Import Data from CSV

```sql
COPY table_name FROM '/tmp/import.csv' WITH CSV HEADER;
```

---

## Troubleshooting

### Connection Refused

```bash
# Check if PostgreSQL is running
sudo service postgresql status

# Start PostgreSQL
sudo service postgresql start

# Check listening port
sudo netstat -tlnp | grep postgres
```

### Authentication Failed

```bash
# Check pg_hba.conf on Linux/Mac
cat /usr/local/var/postgres/pg_hba.conf

# Update password
psql -U postgres -c "ALTER USER postgres WITH PASSWORD 'newpassword';"
```

### Database Size Growing

```sql
-- Find largest tables
SELECT schemaname, tablename, pg_size_pretty(pg_relation_size(schemaname||'.'||tablename))
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_relation_size(schemaname||'.'||tablename) DESC;

-- Vacuum and analyze
VACUUM ANALYZE;
```

### Port Already in Use

```bash
# Find process using port 5432
lsof -i :5432

# Kill process
kill -9 <PID>
```

---

## Performance Optimization

### Add Missing Indexes

Create indexes for frequently queried columns:

```sql
CREATE INDEX idx_name ON table_name(column_name);
CREATE INDEX idx_composite ON table_name(col1, col2);
```

### Query Optimization

Use `EXPLAIN ANALYZE`:

```sql
EXPLAIN ANALYZE
SELECT u.name, COUNT(t.id) 
FROM user_profiles u 
LEFT JOIN tasks t ON u.id = t.user_id 
GROUP BY u.id 
HAVING COUNT(t.id) > 10;
```

### Connection Pooling Best Practices

- Set `max` to 2-3x expected concurrent connections
- Keep `idleTimeoutMillis` between 10-30 seconds
- Monitor actual pool usage in logs

---

## Security Best Practices

1. **Never commit credentials:**
   - Use `.env` files (add to `.gitignore`)
   - Use environment variables in CI/CD

2. **Use strong passwords:**
   - Minimum 16 characters
   - Mix uppercase, lowercase, numbers, symbols

3. **Least privilege database users:**
   ```sql
   CREATE USER app_user WITH PASSWORD 'secure_password';
   GRANT CONNECT ON DATABASE gooddays TO app_user;
   GRANT USAGE ON SCHEMA public TO app_user;
   GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app_user;
   ```

4. **Enable SSL in production**
5. **Regular backups** (automated, tested)
6. **Monitor database logs** for suspicious activity

---

## References

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [node-postgres (pg) Documentation](https://node-postgres.com/)
- [Connection Pooling Guide](https://wiki.postgresql.org/wiki/Number_Of_Database_Connections)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/sql-syntax.html)

---

**Last Updated:** 2025-01-29
