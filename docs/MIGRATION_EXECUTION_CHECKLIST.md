# Contact-First Migration Execution Checklist

## Pre-Migration Checklist (1-2 Days Before)

### Planning & Communication
- [ ] Schedule maintenance window with stakeholders
- [ ] Communicate maintenance window to all users
- [ ] Set expected downtime (estimate: 30-60 minutes)
- [ ] Identify rollback trigger conditions
- [ ] Prepare rollback communication plan

### Environment Preparation
- [ ] Verify staging environment is up-to-date with production
- [ ] Test migration script in staging environment
  ```bash
  DRY_RUN=true npx tsx scripts/migrate-contact-first.ts
  npx tsx scripts/migrate-contact-first.ts
  npx tsx scripts/validate-migration.ts
  ```
- [ ] Test rollback script in staging environment
  ```bash
  DRY_RUN=true npx tsx scripts/rollback-contact-first.ts
  ```
- [ ] Document any staging environment issues and fixes

### Backup Preparation
- [ ] Create full database backup
  ```bash
  # Using pg_dump or your backup tool
  pg_dump -h host -U user -d database > backup_before_migration.sql
  ```
- [ ] Verify backup integrity
- [ ] Store backup in secure location
- [ ] Document backup location and restore procedure

### Code Preparation
- [ ] Ensure all schema changes are committed to main branch
- [ ] Verify no pending database migrations
- [ ] Tag current commit for easy rollback
  ```bash
  git tag -a pre-contact-first-migration -m "Before Contact-first migration"
  git push origin pre-contact-first-migration
  ```

### Team Preparation
- [ ] Assign migration lead
- [ ] Assign validation lead
- [ ] Prepare communication channels (Slack, email, etc.)
- [ ] Document emergency contacts

## Migration Execution (During Maintenance Window)

### Step 1: Pre-Migration Verification (5 minutes)
- [ ] Verify application is in maintenance mode
- [ ] Verify no active user sessions
- [ ] Verify database is accessible
- [ ] Run pre-migration health check
  ```bash
  npx tsx scripts/validate-migration.ts  # Should show no Contact records
  ```

### Step 2: Database Schema Migration (5-10 minutes)
- [ ] Run Prisma migration
  ```bash
  npx prisma migrate deploy
  ```
- [ ] Verify migration success
- [ ] Check for any migration errors
- [ ] If error: Stop and investigate, consider rollback

### Step 3: Data Migration (15-30 minutes)
- [ ] Run dry-run migration first
  ```bash
  DRY_RUN=true npx tsx scripts/migrate-contact-first.ts
  ```
- [ ] Review dry-run output for any issues
- [ ] Run actual migration
  ```bash
  npx tsx scripts/migrate-contact-first.ts
  ```
- [ ] Monitor migration progress
- [ ] Check for any errors during migration
- [ ] If error: Stop and investigate, consider rollback

### Step 4: Post-Migration Validation (5-10 minutes)
- [ ] Run validation script
  ```bash
  npx tsx scripts/validate-migration.ts
  ```
- [ ] Review validation results
- [ ] Check for any failed validations
- [ ] If failures: Investigate and fix, or rollback

### Step 5: Application Verification (5-10 minutes)
- [ ] Restart application
- [ ] Verify application starts successfully
- [ ] Check for any runtime errors
- [ ] Verify database connections
- [ ] Test basic user authentication
- [ ] Test basic data retrieval

### Step 6: Smoke Testing (10-15 minutes)
- [ ] Test People (CRM) page loads
- [ ] Test Memberships page loads
- [ ] Test Events page loads
- [ ] Test Volunteering page loads
- [ ] Test creating a new Contact
- [ ] Test creating a new MembershipEnrollment
- [ ] Test event registration
- [ ] Test volunteer signup
- [ ] Verify all existing data is accessible

### Step 7: Final Verification (5 minutes)
- [ ] Verify no database errors in logs
- [ ] Verify no application errors in logs
- [ ] Verify all critical features work
- [ ] Document any issues found

## Post-Migration Steps

### Immediate Post-Migration
- [ ] Take application out of maintenance mode
- [ ] Communicate successful migration to stakeholders
- [ ] Communicate successful migration to users
- [ ] Monitor application for 1 hour for any issues
- [ ] Monitor error logs for any unexpected errors

### Short-Term Monitoring (24-48 hours)
- [ ] Monitor application performance
- [ ] Monitor error rates
- [ ] Monitor user feedback
- [ ] Check for any data inconsistencies
- [ ] Be prepared to rollback if critical issues found

### Documentation
- [ ] Document migration execution time
- [ ] Document any issues encountered
- [ ] Document any fixes applied
- [ ] Update migration plan with lessons learned
- [ ] Archive migration logs

## Rollback Procedure

### Rollback Triggers
Rollback should be considered if:
- Migration script fails with critical error
- Validation shows data loss or corruption
- Application fails to start after migration
- Critical features are broken
- Data inconsistencies are found that cannot be quickly fixed

### Rollback Steps
1. **Stop Application**
   ```bash
   # Stop the application
   ```

2. **Rollback Data**
   ```bash
   npx tsx scripts/rollback-contact-first.ts
   ```

3. **Rollback Schema** (if needed)
   ```bash
   # This may require manual SQL or reverting to previous migration
   # Consult migration plan for specific steps
   ```

4. **Restore Database** (if rollback script fails)
   ```bash
   # Restore from backup
   psql -h host -U user -d database < backup_before_migration.sql
   ```

5. **Rollback Code**
   ```bash
   git checkout pre-contact-first-migration
   ```

6. **Restart Application**
   ```bash
   # Restart the application
   ```

7. **Verify Rollback**
   - Test application starts
   - Test basic features
   - Verify data integrity

8. **Communicate Rollback**
   - Notify stakeholders
   - Notify users
   - Document rollback reason

## Emergency Contacts

| Role | Name | Contact |
|------|------|---------|
| Migration Lead | | |
| Database Admin | | |
| DevOps Lead | | |
| Product Owner | | |

## Important Notes

- **Never skip the backup step** - this is your safety net
- **Always test in staging first** - production should be a repeat of staging
- **Monitor throughout the process** - catch issues early
- **Have rollback ready** - know when to use it
- **Document everything** - lessons learned for future migrations

## Estimated Timeline

| Phase | Duration |
|-------|----------|
| Pre-Migration Checklist | 1-2 days |
| Migration Execution | 30-60 minutes |
| Post-Migration Monitoring | 24-48 hours |
| Total | 2-3 days |

## Success Criteria

Migration is considered successful if:
- [ ] All validation checks pass
- [ ] Application starts without errors
- [ ] All smoke tests pass
- [ ] No data loss detected
- [ ] No critical functionality broken
- [ ] Error rates remain normal
- [ ] User feedback is positive
