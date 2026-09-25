# Database Migration Operations

## Purpose

OMAH Connect has an explicit MongoDB migration framework for controlled
production schema/data changes.

Migrations are not executed automatically when the application starts.

## Commands

Local migration-file validation:

```bash
npm run migrate:check
```

Database migration status:

```bash
npm run migrate:status
```

Apply pending migrations:

```bash
npm run migrate
```

Migration framework regression:

```bash
npm run test:migrations
```

## Production release sequence

The expected production sequence is:

```text
1. identify deployment commit
2. create and verify a fresh backup
3. restore/test backup in a safe target
4. run migration check
5. run migration status against staging
6. apply migrations to staging
7. validate application behavior
8. deploy/apply production change under the release plan
9. verify health/readiness and smoke tests
```

P3 creates and verifies the migration framework only.

No production migration is applied during P3.

## Forward-only policy

The runner supports `up` migrations only.

This avoids an unsafe assumption that every database transformation can be
reversed automatically.

If a deployed migration requires correction:

1. preserve evidence and current data state
2. create a new corrective migration when appropriate
3. use verified backup restore only as part of an approved recovery plan

## Drift protection

Applied migrations record their SHA-256 source checksum.

The runner blocks new migration execution if:

- an applied migration file changed
- an applied migration file disappeared

Never rewrite or delete an already-applied migration.

## Locking

`npm run migrate` obtains a database migration lock before applying pending
changes.

This prevents two deployment processes from applying migrations concurrently.

## Application startup

Normal application startup remains:

```bash
npm start
```

It does not run migrations.

This separation keeps database changes explicit and auditable.
