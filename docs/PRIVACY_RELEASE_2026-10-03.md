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

The existing lockfile had critical Next.js and high-severity dependency advisories. Compatible lockfile updates select Next.js 16.3.8 and sharp 0.35.5.

The remaining development-only chain was `eslint-config-next -> @next/eslint-plugin-next -> fast-glob -> micromatch -> braces`. GHSA-vfj7-8cjw-p6xm has no upstream braces patch at review time: deeply nested attacker-controlled brace patterns can exhaust the recursive AST walker and terminate its Node process. In this project that input came from the lint configuration's `settings.next.rootDir`, not a production HTTP request. It was still removed rather than accepting an audit exception.

The installed Next lint plugin imports fast-glob in exactly one helper, `dist/utils/get-root-dirs.js`, using only `globSync(pattern, { onlyDirectories: true })`. A scoped npm override replaces that dependency with `tools/next-lint-glob`, which delegates to tinyglobby 0.2.17 (fdir/picomatch, without micromatch/braces). The adapter preserves absolute Windows/POSIX paths, relative paths and directory-only results, disables tinyglobby's recursive expansion of literal directories, and removes trailing separators to match the old caller contract. It intentionally rejects unsupported options and does not claim to implement the complete fast-glob API. No Next lint rule is removed or disabled.

`test:lint-glob` exercises the actual Next consumer and its internal-link rule with fictional directory fixtures, including wildcard/brace/array/Windows root settings. It also fails if a future Next update adds another unverified fast-glob caller. Both full and runtime dependency audits remain mandatory, without an advisory allowlist. Audit and application verification run as separate jobs for clear results.

Sources: https://github.com/advisories/GHSA-vfj7-8cjw-p6xm ; https://github.com/vercel/next.js/blob/canary/packages/eslint-plugin-next/src/utils/get-root-dirs.ts ; https://github.com/SuperchupuDev/tinyglobby
