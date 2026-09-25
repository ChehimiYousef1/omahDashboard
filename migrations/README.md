# Database Migrations

OMAH Connect uses a forward-only MongoDB migration runner.

## Goals

The migration framework provides:

- deterministic ordered migration discovery
- migration-file checksums
- applied-migration history
- checksum drift detection
- missing-file detection
- a production migration lock
- explicit status/check commands
- no automatic migration execution during application startup

## File naming

Create migrations using a numeric prefix:

```text
001_short_description.js
002_next_change.js
003_another_change.js
```

Supported numeric prefixes are 3 to 6 digits.

The `_template.js` file is ignored by the runner.

## Migration module contract

```js
'use strict';

module.exports = {
  description: 'Human-readable purpose',

  async up({ db }) {
    // Perform an idempotent or carefully bounded schema/data change.
  },
};
```

`up` is required.

The runner intentionally does not provide an automatic `down` command. A
production application rollback must not silently reverse database state.

## Commands

Validate local migration files without connecting to MongoDB:

```bash
npm run migrate:check
```

Show migration state from the configured database:

```bash
npm run migrate:status
```

Apply pending migrations:

```bash
npm run migrate
```

Run migration-system contract tests without a database:

```bash
npm run test:migrations
```

## Safety

Before applying a migration to production:

1. create and verify a fresh backup
2. test the migration against a safe staging/restored database
3. inspect `npm run migrate:status`
4. deploy migration-compatible application code
5. apply migrations in a controlled maintenance/release step
6. verify `/health`, `/ready`, and application smoke tests

P3 creates the framework only. It does not apply a production migration.

## Metadata collections

Applied migration metadata is stored in:

```text
_schema_migrations
```

The production migration lock is stored in:

```text
_schema_migration_locks
```

Application business code should not depend on these collections.

## Checksum policy

Each applied migration records a SHA-256 checksum of its source file.

Never edit an already-applied migration.

If an applied migration needs correction, create a new migration.

A checksum mismatch is treated as migration drift and blocks `up`.

## Missing-file policy

If the database contains an applied migration whose source file no longer
exists in the repository, status reports drift and `up` is blocked.

Do not delete applied migration files.

## Locking

Only one migration process may execute at a time.

The lock includes an owner id and expiration time so an abandoned process does
not block migrations forever. A healthy migration process releases the lock
when it finishes.
