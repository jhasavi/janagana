# Database Migration Guide

This guide covers database operations for the OrgFlow platform, including migrations, seeding, and production deployment strategies.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Development Workflow](#development-workflow)
- [Running Migrations](#running-migrations)
- [Seeding the Database](#seeding-the-database)
- [Resetting the Database](#resetting-the-database)
- [Production Deployment](#production-deployment)
- [Backup Strategy](#backup-strategy)
- [Troubleshooting](#troubleshooting)

## Overview

OrgFlow uses PostgreSQL as the primary database, managed through Prisma ORM. The database schema includes:

- **50 models** covering platform functionality
- **Multi-tenant architecture** with tenant isolation
- **Webhook and API key management** for integrations
- **Comprehensive audit logging** and activity tracking

## Prerequisites

Before working with the database, ensure you have:

- PostgreSQL running locally (via Docker or native installation)
- Node.js 20+ installed
- Environment variables configured in `apps/api/.env.local`
- Database URL set: `DATABASE_URL=postgresql://postgres:password@localhost:5432/orgflow_dev`

## Development Workflow

### 1. Schema Changes

When making schema changes to `packages/database/prisma/schema.prisma`:

```bash
# Navigate to database package
cd packages/database

# Generate the Prisma client (preview changes)
npm run generate

# Create and apply a new migration
npm run migrate -- --name <migration-name>
```

Example:
```bash
npm run migrate -- --name add_webhook_models
```

This will:
1. Generate the SQL migration file in `prisma/migrations/`
2. Apply the migration to your local database
3. Regenerate the Prisma client

### 2. Seeding Data

After migrations, seed the database with sample data:

```bash
cd packages/database
npm run seed
```

The seed script creates:
- **Green Earth Foundation** (non-profit): 30 members, 5 events, 4 volunteer opportunities, 4 clubs
- **Pro Business Network** (for-profit): 20 members, 3 events, 2 volunteer opportunities, 3 clubs
- Platform plans and configurations

## Running Migrations

### Development

Create and apply migrations in development:

```bash
cd packages/database
npm run migrate -- --name <descriptive-name>
```

The migration will be:
- Created in `prisma/migrations/`
- Applied to your local database
- Committed to version control

### Production

Apply migrations in production:

```bash
cd packages/database
npm run migrate:prod
```

**Important**: Production migrations:
- Do NOT create new migration files
- Only apply existing migrations
- Should be run during deployment with zero downtime

### Migration Best Practices

1. **Descriptive names**: Use clear, descriptive migration names
   ```bash
   npm run migrate -- --name add_webhook_delivery_tracking
   ```

2. **Non-breaking changes**: Prefer additive changes over destructive ones
   - ✅ Add new columns with defaults
   - ✅ Add new tables
   - ❌ Drop columns (use soft deletes instead)
   - ❌ Rename columns (add new, migrate data, then remove old)

3. **Test locally**: Always test migrations on a local copy of production data

4. **Review SQL**: Check the generated SQL in `prisma/migrations/`

## Seeding the Database

### Running the Seed

```bash
cd packages/database
npm run seed
```

### Seed Data Overview

The seed creates two complete organizations:

#### Green Earth Foundation (Non-Profit)
- **Slug**: `green-earth`
- **Type**: NON_PROFIT
- **Admin Users**: 3 (Owner, Admin, Staff)
- **Membership Tiers**: 4
  - Community Supporter (Free - $0)
  - Friend (Basic - $25/year)
  - Member (Standard - $75/year)
  - Sustaining Member (Premium - $150/year)
- **Members**: 30 across all tiers
- **Events**: 5 (2 past with attendance, 3 upcoming with registrations)
- **Volunteer Opportunities**: 4 (2 open, 1 closed, 1 upcoming)
- **Clubs**: 4 (Environment, Youth, Fundraising, Social)
- **Email Campaigns**: 2 (1 sent, 1 draft)
- **Announcements**: 2 active
- **Payments**: 20+ payment records
- **Audit Logs**: 50+ activity entries

#### Pro Business Network (For-Profit)
- **Slug**: `pro-network`
- **Type**: FOR_PROFIT
- **Admin Users**: 2 (Owner, Admin)
- **Membership Tiers**: 3
  - Starter ($49/month)
  - Professional ($149/month)
  - Executive ($299/month)
- **Members**: 20
- **Events**: 3 networking events with paid tickets
- **Volunteer Opportunities**: 2 community service programs
- **Clubs**: 3 (Industry, Leadership, Social)

### Customizing Seed Data

To modify seed data, edit `packages/database/prisma/seed.ts`:

```typescript
// Add custom organizations
const customTenant = await prisma.tenant.upsert({
  where: { slug: 'your-org' },
  update: {},
  create: {
    slug: 'your-org',
    name: 'Your Organization',
    // ... other fields
  },
});
```

## Resetting the Database

### Development Reset

Reset the database (drops all data and re-runs migrations):

```bash
cd packages/database
npm run reset
```

**Warning**: This will:
- Drop all tables
- Re-run all migrations
- Re-seed the database
- **DELETE ALL DATA**

Use this only in development environments.

### Manual Reset

If the automated reset fails, manually reset:

```bash
# Drop the database
psql postgres://postgres:password@localhost:5432/postgres -c "DROP DATABASE IF EXISTS orgflow_dev;"

# Recreate the database
psql postgres://postgres:password@localhost:5432/postgres -c "CREATE DATABASE orgflow_dev;"

# Run migrations
cd packages/database
npm run migrate

# Seed the database
npm run seed
```

## Production Deployment

### Pre-Deployment Checklist

Before deploying database changes to production:

- [ ] Review all migration SQL files
- [ ] Test migrations on a staging environment
- [ ] Create a database backup
- [ ] Notify team of potential downtime
- [ ] Have rollback plan ready

### Deployment Process

1. **Backup Production Database**
   ```bash
   pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Apply Migrations**
   ```bash
   cd packages/database
   npm run migrate:prod
   ```

3. **Verify Migration Success**
   ```bash
   # Check migration status
   npx prisma migrate status
   
   # Verify data integrity
   npx prisma studio
   ```

4. **Monitor Application Logs**
   - Check for any errors related to database queries
   - Monitor performance metrics
   - Verify application functionality

### Rollback Strategy

If a migration causes issues:

1. **Stop the deployment**
2. **Restore from backup**
   ```bash
   psql $DATABASE_URL < backup_20240409_120000.sql
   ```

3. **Investigate the issue**
4. **Fix the migration**
5. **Re-test in staging**
6. **Retry deployment**

## Backup Strategy

### Development

Backups are optional in development but recommended:

```bash
# Manual backup
pg_dump $DATABASE_URL > dev_backup.sql

# Restore backup
psql $DATABASE_URL < dev_backup.sql
```

### Production

#### Automated Backups

Configure automated backups based on your hosting provider:

**Supabase / Neon / Railway**:
- Enable automatic daily backups in dashboard
- Configure point-in-time recovery (PITR)
- Set retention period (7-30 days)

**AWS RDS**:
- Enable automated backups
- Configure backup window
- Set retention period
- Enable read replicas for failover

#### Manual Backup

```bash
# Full backup
pg_dump $DATABASE_URL > production_backup_$(date +%Y%m%d).sql

# Schema-only backup
pg_dump --schema-only $DATABASE_URL > schema_backup.sql

# Data-only backup
pg_dump --data-only $DATABASE_URL > data_backup.sql
```

#### Backup Retention

- **Daily backups**: Keep 7 days
- **Weekly backups**: Keep 4 weeks
- **Monthly backups**: Keep 12 months
- **Pre-migration backups**: Keep 90 days

### Disaster Recovery

In case of database failure:

1. **Identify the issue**
   - Check database logs
   - Verify connectivity
   - Check disk space

2. **Restore from backup**
   ```bash
   # Choose the most recent clean backup
   psql $DATABASE_URL < production_backup_YYYYMMDD.sql
   ```

3. **Replay transactions** (if using PITR)
   ```bash
   # Point-in-time recovery
   psql $DATABASE_URL -c "SELECT pg_restore_point();"
   ```

4. **Verify data integrity**
   - Run data validation scripts
   - Check record counts
   - Verify critical business data

## Troubleshooting

### Common Issues

#### Migration Fails

**Symptom**: Migration command fails with error

**Solutions**:
1. Check database connection
   ```bash
   psql $DATABASE_URL
   ```

2. Review migration SQL for syntax errors
   ```bash
   cat prisma/migrations/<migration>/migration.sql
   ```

3. Check for conflicting changes
   - Another migration may have changed the same table
   - Review recent migrations

4. Reset database (development only)
   ```bash
   npm run reset
   ```

#### Seed Fails

**Symptom**: Seed script fails with error

**Solutions**:
1. Ensure migrations are applied
   ```bash
   npm run migrate
   ```

2. Check for duplicate data
   - Seed uses `upsert` to handle duplicates
   - Check for unique constraint violations

3. Verify environment variables
   ```bash
   echo $DATABASE_URL
   ```

#### Prisma Client Out of Sync

**Symptom**: TypeScript errors about missing Prisma models

**Solution**: Regenerate Prisma client
```bash
cd packages/database
npm run generate
```

#### Connection Issues

**Symptom**: Cannot connect to database

**Solutions**:
1. Verify PostgreSQL is running
   ```bash
   # Docker
   docker ps | grep postgres
   
   # Native
   pg_isready
   ```

2. Check DATABASE_URL format
   ```
   postgresql://user:password@host:port/database
   ```

3. Verify database exists
   ```bash
   psql postgres://postgres:password@localhost:5432/postgres -l
   ```

### Getting Help

If you encounter issues not covered here:

1. Check [Prisma Documentation](https://www.prisma.io/docs)
2. Review [PostgreSQL Documentation](https://www.postgresql.org/docs/)
3. Check application logs for detailed error messages
4. Review migration SQL files for issues

## Additional Resources

- [Prisma Migrate Guide](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Prisma Seed Guide](https://www.prisma.io/docs/guides/database/seed-database)
- [PostgreSQL Backup Guide](https://www.postgresql.org/docs/current/backup.html)
- [Database Schema Reference](../packages/database/prisma/schema.prisma)

## Quick Reference

### Common Commands

```bash
# Navigate to database package
cd packages/database

# Generate Prisma client
npm run generate

# Create and apply migration
npm run migrate -- --name <name>

# Apply production migrations
npm run migrate:prod

# Seed database
npm run seed

# Open Prisma Studio
npm run studio

# Reset database (dev only)
npm run reset

# Check migration status
npx prisma migrate status

# Format schema
npx prisma format
```

### Environment Variables

```bash
# Development
DATABASE_URL=postgresql://postgres:password@localhost:5432/orgflow_dev

# Production (example)
DATABASE_URL=postgresql://user:pass@host:5432/orgflow_prod?sslmode=require
```
