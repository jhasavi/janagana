# Release: Website → JanaGana sync (JanaGana)

**Date:** 2026-05-28

## Shipped

- Read-only embed API: `GET /api/embed/events`, `GET /api/embed/past-events` (tenant slug required, CORS `*`).
- Production smoke checks embed endpoint.
- QA contact cleanup: `qa-prod-vercel-*` pattern + `--export-csv`.
- Visitor path matrix: `docs/WEBSITE_JANAGANA_VISITOR_PATHS.md`.

## Partner sites

- Namaste Boston: `~/nb/docs/WEBSITE_JANAGANA_VISITOR_PATHS.md`
- The Purple Wings: `~/tpw/docs/WEBSITE_JANAGANA_VISITOR_PATHS.md`

## QA cleanup (production)

```bash
PRODUCTION_DATABASE_URL="..." npx tsx scripts/cleanup-qa-contacts.ts --export-csv=qa-dry-run.csv
# review, then:
PRODUCTION_DATABASE_URL="..." npx tsx scripts/cleanup-qa-contacts.ts --confirm --allow-production-qa-cleanup --export-csv=qa-deleted.csv
```

## Rollback

Remove `app/api/embed/*` routes; TPW `/events` shows empty upcoming + legacy past only. Portal pages unaffected.
