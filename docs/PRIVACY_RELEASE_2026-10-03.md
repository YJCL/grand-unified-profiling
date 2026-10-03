# Privacy release: 2026-10-03

## Database boundary

The ten application tables in `public` are server-only. RLS is enabled, with no browser policies, and PUBLIC, anon and authenticated table privileges are revoked. Existing rows are preserved. The existing Prisma connection was verified as the table owner with BYPASSRLS, using `SELECT 1 FROM public."User" WHERE FALSE` before and after applying the migration. Do not use the browser Supabase client for these tables or grant browser privileges to work around an application error.

The same SQL is recorded under `prisma/migrations/20261003150000_private_data_rls/migration.sql`. It was applied through Supabase's migration API. The deployment build does not run Prisma migrations; avoid blindly rerunning database migration history without reconciling the two systems.

## Guest migration

All private API reads and updates require a signed owner session. Existing valid main sessions continue to work. New additional guest profiles receive a separate signed, httpOnly cookie so the main account session is preserved. Registered profiles require the main account login. Registration cannot reset an existing registered account's password.

An older guest represented only by a localStorage ID, without a valid owner cookie, cannot be recovered by ID alone. The recovery screen offers registered-account login, support and explicitly starting a new profile. No existing data is deleted or reassigned by this migration. Support must not restore ownership from a claimed ID alone.

Old six-character transfer codes are rejected; owners with a valid session can issue a new 128-bit random code. Public sharing displays the selected companion and generic text, excluding personal AI-generated analysis. Profile DTOs exclude password hashes, private memory and billing identifiers. Analytics custom events accept only constrained metadata, excluding free text, answers, referrers and query tokens. This does not establish that every external analytics provider or historic record has been audited or deleted.

## Validation and rollback

Run `npm run test:ai-safety`, `npm run test:security`, `npm run lint`, `npx tsc --noEmit` and `npm run build`. Boundary tests use fictional profiles and mocked databases/providers. Production validation is limited to two fictional blocked safety questions and unauthenticated requests against fictional IDs; do not read real conversations or create accounts for this test.

Prefer rolling back application code while keeping the database private. The baseline production application used the same owner/BYPASSRLS Prisma connection, so reverting code does not require reopening browser database access. An application rollback would reintroduce the old ID-only guest vulnerability and must be treated as an emergency risk decision, not a normal restoration procedure. Restoring previous unrestricted table ACLs or disabling RLS requires separate approval; do not do so to make a health check pass.

No payment configuration or paid transactions are part of this release.

## Dependency gate

The existing lockfile had critical Next.js and high-severity dependency advisories. Compatible lockfile updates select Next.js 16.3.8 and sharp 0.35.5; runtime-only `npm audit --omit=dev --audit-level=high` reports zero vulnerabilities. The full audit still fails on development-only braces 3.0.3 and its ESLint dependency chain (GHSA-vfj7-8cjw-p6xm, no upstream patched version at review time). Do not use `npm audit fix --force`, downgrade Next.js, remove the audit gate, or describe the full CI as passing. Verification and full dependency audit run as separate mandatory jobs so the unchanged audit failure does not conceal other validation results. Production rollout remains pending this blocker.
