# Tenant Unification Runbook: purple-wings <- the-purple-wings

## Objective
Unify tenant context so both dashboard/admin and public/embed/API resolve to the same canonical tenant.

- Canonical target tenant slug: `purple-wings`
- Alias/source tenant slug: `the-purple-wings`
- This runbook keeps rollback capability and does **not** require hard deletion.

## Confirmed Tenant IDs
Run:

```bash
npx tsx scripts/tenant-unification-dry-run.ts --source-slug the-purple-wings --target-slug purple-wings --json
```

Current observed IDs:

- Source (alias): `cmomxd61w0000jm04ut0trs1h` (`the-purple-wings`)
- Target (canonical): `cmom8350h0000dde2z5qfks1u` (`purple-wings`)

## Why Clerk Rebinding Is Required
Dashboard tenant resolution uses Clerk org id via `getTenant()` and `requireTenant()`.
If the real Clerk org id stays attached to alias tenant, new writes can continue to split.

Therefore long-term fix is:

1. Move all functional data to canonical tenant.
2. Rebind real Clerk org id to canonical tenant.
3. Keep alias tenant as soft-retired historical shell with no active writes.

## Table Scope for Reassignment
All tenant-scoped tables are discovered dynamically by script from `information_schema.columns` where column in (`tenantId`, `tenant_id`).

At time of this runbook, discovered count: 39 tables.

Current table with rows to update now:

- `Event` only

All other tenant-scoped tables currently report 0 rows for both source and target.

## Ordered Migration Sequence (Apply Window)

1. Pre-flight safety
- Enable maintenance window / freeze admin writes.
- Run dry-run script and save JSON artifact.
- Confirm source/target IDs unchanged since approval.

2. Snapshot (rollback baseline)
- Export `Tenant` rows for both IDs.
- Export all source-tenant rows from each tenant-scoped table where `tenantId = <sourceId>`.
- Export join-derived dependent rows for:
  - `EventRegistration` via `Event`
  - `VolunteerShift` and `VolunteerShiftSignup` via `VolunteerOpportunity`
  - `ClubMembership` via `Club`
  - `ForumReply` via `ForumThread`

3. Functional data reassignment (idempotent)
- For each tenant-scoped table, run:
  - `UPDATE public."<table>" SET "tenantId" = <targetId> WHERE "tenantId" = <sourceId>;`
- Dependency-safe order for current known data:
  - `Event`
  - (then all other tenant-scoped tables in deterministic alphabetical order, as no-op today)

4. Clerk org rebinding (critical)
- In one transaction:
  - Move alias tenant `clerkOrgId` to a unique retired marker (for example `retired_<oldOrgId>_<yyyymmddhhmm>`).
  - Set canonical tenant `clerkOrgId` to the real Clerk org id (`org_...`).
- Keep alias `slug` unchanged (`the-purple-wings`) and set alias `isActive = false`.

5. Post-apply verification
- Re-run dry-run script: `totalRowsToReassignNow` must be 0 and no split tables.
- Validate dashboard counts and public/embed/API counts match.
- Validate `getTenant()` resolves canonical tenant under authenticated dashboard session.

6. Validation hold window
- Keep alias row (soft-retired) for rollback.
- Keep temporary event resolver fallback only during hold window, then remove after sign-off.

## Dry-Run Verification Queries

Use script output as primary proof:

```bash
npx tsx scripts/tenant-unification-dry-run.ts --source-slug the-purple-wings --target-slug purple-wings --json > /tmp/tpw_unification_dry_run.json
```

Direct SQL spot checks:

```sql
SELECT id, slug, clerkOrgId, isActive, createdAt
FROM "Tenant"
WHERE slug IN ('purple-wings', 'the-purple-wings')
ORDER BY createdAt;
```

```sql
SELECT
  COUNT(*) FILTER (WHERE "tenantId" = '<sourceId>') AS source_events,
  COUNT(*) FILTER (WHERE "tenantId" = '<targetId>') AS target_events
FROM "Event";
```

```sql
SELECT
  COUNT(*) FILTER (WHERE e."tenantId" = '<sourceId>') AS source_registrations,
  COUNT(*) FILTER (WHERE e."tenantId" = '<targetId>') AS target_registrations
FROM "EventRegistration" r
JOIN "Event" e ON e.id = r."eventId";
```

## Rollback Strategy

1. Keep snapshots until sign-off.
2. Reverse reassignment updates:
- For each touched table:
  - `UPDATE public."<table>" SET "tenantId" = <sourceId> WHERE "tenantId" = <targetId> AND <row id in snapshot>;`
3. Revert Clerk rebinding transaction:
- Restore original `clerkOrgId` values for source and target tenant rows.
- Restore alias `isActive` flag as needed.
4. Re-run dry-run + smoke checks.

## Guardrails During Migration

- Keep event resolver fallback in place until auth rebinding and dashboard verification pass.
- Freeze settings actions that can mutate slug/org identity during apply window.
- Do not delete alias tenant during validation window.
- Run all writes in explicit transactions with row-count assertions.

## Recommended Long-Term End State

- Canonical tenant (`purple-wings`) owns:
  - all functional data
  - the real Clerk org id used by admins
  - public/embed/API slug already in use
- Alias tenant (`the-purple-wings`) remains as historical shell only:
  - `isActive = false`
  - no functional rows
  - no real Clerk org id linkage

This prevents future split writes and avoids creating another duplicate tenant from auth context.
