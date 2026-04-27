# JanaGana — Contributing Guide

---

## Code Style

- **TypeScript strict mode** — never use `any`; define proper interfaces
- **Server Actions** — all data mutations live in `lib/actions/`; no API routes for mutations
- **Prisma** — every query must include `where: { tenantId }` for tenant isolation
- **Zod** — validate all server action inputs before touching the database
- **shadcn/ui** — use existing UI components; never write custom CSS
- **Lucide React** — only icon library

## Commit Conventions

```
feat(members): add CSV import action
fix(onboarding): resolve Clerk session race condition
chore(deps): upgrade @clerk/nextjs to 6.x
docs(setup): update COMPLETE_GUIDE with Sentry setup
test(e2e): add volunteer shift test
```

Format: `type(scope): description`  
Types: `feat`, `fix`, `chore`, `docs`, `test`, `refactor`, `perf`

## Pull Request Process

1. Branch from `main`: `git checkout -b feat/your-feature`
2. Run before opening PR:
   ```bash
   npm run typecheck
   npm run lint
   npm run test:e2e
   ```
3. Fill in the PR template (description, type of change, test coverage).
4. At least one reviewer must approve.
5. CI must be green (typecheck, lint, E2E).
6. Squash and merge.

## Adding a New Feature

1. **Schema change**: update `prisma/schema.prisma`, run `npm run db:migrate`.
2. **Server Action**: add to `lib/actions/[domain].ts` — follow the `{ success, data|error }` return shape.
3. **UI**: create page in `app/(dashboard)/dashboard/[domain]/`, use Server Component by default.
4. **Sidebar**: add entry in `components/dashboard/sidebar.tsx`.
5. **E2E**: add test in `e2e/tests/`.
6. **Docs**: update `TODO.md` and relevant docs file if a user-facing feature.

## Environment Variables

Never commit secrets. All env vars go in `.env.local` (gitignored). Use `.env.example` as the template.

## Testing

- E2E tests: Playwright in `e2e/tests/`
- Run: `npm run test:e2e`
- For E2E to work you need `E2E_CLERK_EMAIL` and `E2E_CLERK_PASSWORD` in `.env`

## Questions?

Open a GitHub Discussion or ping the team in Slack.
