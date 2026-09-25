'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

require('dotenv').config({
  path: path.join(__dirname, '..', '.env'),
});

const ROOT = path.join(__dirname, '..');
const MIGRATIONS_DIR = path.join(ROOT, 'migrations');

const MIGRATION_COLLECTION =
  '_schema_migrations';

const LOCK_COLLECTION =
  '_schema_migration_locks';

const LOCK_ID =
  'global';

const LOCK_TTL_MS =
  10 * 60 * 1000;

const FILE_PATTERN =
  /^(\d{3,6})_([A-Za-z0-9._-]+)\.js$/;


function sha256(content) {
  return crypto
    .createHash('sha256')
    .update(content)
    .digest('hex');
}


function getGitCommit() {
  try {
    return execFileSync(
      'git',
      ['rev-parse', 'HEAD'],
      {
        cwd: ROOT,
        encoding: 'utf8',
        stdio: [
          'ignore',
          'pipe',
          'ignore',
        ],
      }
    ).trim();
  } catch {
    return null;
  }
}


function parseMigrationFilename(filename) {
  const match =
    FILE_PATTERN.exec(filename);

  if (!match) {
    return null;
  }

  return {
    id: match[1],
    name: match[2],
  };
}


function discoverMigrations(
  migrationsDir = MIGRATIONS_DIR
) {
  if (!fs.existsSync(migrationsDir)) {
    return [];
  }

  const files =
    fs.readdirSync(migrationsDir)
      .filter((filename) =>
        parseMigrationFilename(filename)
      )
      .sort((a, b) =>
        a.localeCompare(
          b,
          'en',
          {
            numeric: true,
          }
        )
      );

  const migrations =
    files.map((filename) => {
      const parsed =
        parseMigrationFilename(filename);

      const fullPath =
        path.join(
          migrationsDir,
          filename
        );

      const source =
        fs.readFileSync(
          fullPath,
          'utf8'
        );

      delete require.cache[
        require.resolve(fullPath)
      ];

      const moduleValue =
        require(fullPath);

      return {
        id: parsed.id,
        name: parsed.name,
        filename,
        fullPath,
        checksum: sha256(source),
        description:
          typeof moduleValue.description ===
          'string'
            ? moduleValue.description.trim()
            : '',
        up: moduleValue.up,
      };
    });

  validateMigrationList(migrations);

  return migrations;
}


function validateMigrationList(migrations) {
  const ids =
    new Set();

  for (const migration of migrations) {
    if (ids.has(migration.id)) {
      throw new Error(
        `Duplicate migration id: ${migration.id}`
      );
    }

    ids.add(migration.id);

    if (
      typeof migration.up !==
      'function'
    ) {
      throw new Error(
        `Migration ${migration.filename} must export async up({ db })`
      );
    }

    if (
      !migration.description
    ) {
      throw new Error(
        `Migration ${migration.filename} must export a non-empty description`
      );
    }
  }

  return true;
}


function compareMigrationState(
  migrations,
  appliedRows
) {
  const sourceById =
    new Map(
      migrations.map(
        (migration) => [
          migration.id,
          migration,
        ]
      )
    );

  const appliedById =
    new Map(
      appliedRows.map(
        (row) => [
          String(row.id),
          row,
        ]
      )
    );

  const rows =
    [];

  for (const migration of migrations) {
    const applied =
      appliedById.get(
        migration.id
      );

    if (!applied) {
      rows.push({
        id: migration.id,
        filename:
          migration.filename,
        state: 'pending',
        checksum:
          migration.checksum,
      });

      continue;
    }

    const state =
      applied.checksum ===
      migration.checksum
        ? 'applied'
        : 'checksum-drift';

    rows.push({
      id: migration.id,
      filename:
        migration.filename,
      state,
      checksum:
        migration.checksum,
      appliedChecksum:
        applied.checksum,
      appliedAt:
        applied.appliedAt,
    });
  }

  for (const applied of appliedRows) {
    const id =
      String(applied.id);

    if (!sourceById.has(id)) {
      rows.push({
        id,
        filename:
          applied.filename || null,
        state: 'missing-file',
        appliedChecksum:
          applied.checksum,
        appliedAt:
          applied.appliedAt,
      });
    }
  }

  rows.sort((a, b) =>
    String(a.id).localeCompare(
      String(b.id),
      'en',
      {
        numeric: true,
      }
    )
  );

  return rows;
}


function assertNoDrift(rows) {
  const drift =
    rows.filter(
      (row) =>
        row.state ===
          'checksum-drift' ||
        row.state ===
          'missing-file'
    );

  if (drift.length) {
    const details =
      drift.map(
        (row) =>
          `${row.id}:${row.state}`
      ).join(', ');

    throw new Error(
      `Migration drift detected: ${details}`
    );
  }
}


async function connectMongo() {
  const uri =
    process.env.MONGODB_URI?.trim();

  if (!uri) {
    throw new Error(
      'MONGODB_URI is required for migrate:status and migrate'
    );
  }

  const mongoose =
    require('mongoose');

  const connection =
    mongoose.createConnection(
      uri,
      {
        serverSelectionTimeoutMS:
          10000,
      }
    );

  await connection.asPromise();

  return connection;
}


async function readAppliedMigrations(db) {
  return db.collection(
    MIGRATION_COLLECTION
  )
    .find(
      {},
      {
        projection: {
          _id: 0,
        },
      }
    )
    .sort({
      id: 1,
    })
    .toArray();
}


async function acquireLock(db) {
  const collection =
    db.collection(
      LOCK_COLLECTION
    );

  const owner =
    crypto.randomUUID();

  const now =
    new Date();

  const lockedUntil =
    new Date(
      now.getTime() +
      LOCK_TTL_MS
    );

  try {
    await collection.insertOne({
      _id: LOCK_ID,
      owner,
      lockedAt: now,
      lockedUntil,
    });

    return {
      owner,
      lockedUntil,
    };
  } catch (error) {
    if (
      error &&
      error.code !== 11000
    ) {
      throw error;
    }
  }

  const result =
    await collection.findOneAndUpdate(
      {
        _id: LOCK_ID,
        lockedUntil: {
          $lte: now,
        },
      },
      {
        $set: {
          owner,
          lockedAt: now,
          lockedUntil,
        },
      },
      {
        returnDocument: 'after',
      }
    );

  const doc =
    result &&
    Object.prototype.hasOwnProperty.call(
      result,
      'value'
    )
      ? result.value
      : result;

  if (
    !doc ||
    doc.owner !== owner
  ) {
    throw new Error(
      'Another migration process holds the migration lock'
    );
  }

  return {
    owner,
    lockedUntil,
  };
}


async function releaseLock(
  db,
  owner
) {
  await db.collection(
    LOCK_COLLECTION
  ).deleteOne({
    _id: LOCK_ID,
    owner,
  });
}


function printStatus(rows) {
  if (!rows.length) {
    console.log(
      'No numbered migrations found.'
    );

    return;
  }

  const display =
    rows.map((row) => ({
      id: row.id,
      state: row.state,
      file:
        row.filename || '',
      appliedAt:
        row.appliedAt
          ? new Date(
              row.appliedAt
            ).toISOString()
          : '',
    }));

  console.table(display);
}


async function commandCheck() {
  const migrations =
    discoverMigrations();

  console.log(
    `Migration files valid: ${migrations.length}`
  );

  for (const migration of migrations) {
    console.log(
      `✅ ${migration.id} ${migration.filename}`
    );
  }
}


async function commandStatus() {
  const migrations =
    discoverMigrations();

  const connection =
    await connectMongo();

  try {
    const applied =
      await readAppliedMigrations(
        connection.db
      );

    const rows =
      compareMigrationState(
        migrations,
        applied
      );

    printStatus(rows);

    assertNoDrift(rows);

    const pending =
      rows.filter(
        (row) =>
          row.state ===
          'pending'
      ).length;

    console.log(
      `Pending migrations: ${pending}`
    );
  } finally {
    await connection.close();
  }
}


async function commandUp() {
  const migrations =
    discoverMigrations();

  const connection =
    await connectMongo();

  let lock = null;

  try {
    const db =
      connection.db;

    const applied =
      await readAppliedMigrations(
        db
      );

    const state =
      compareMigrationState(
        migrations,
        applied
      );

    assertNoDrift(state);

    const appliedIds =
      new Set(
        applied.map(
          (row) =>
            String(row.id)
        )
      );

    const pending =
      migrations.filter(
        (migration) =>
          !appliedIds.has(
            migration.id
          )
      );

    if (!pending.length) {
      console.log(
        'No pending migrations.'
      );

      return;
    }

    lock =
      await acquireLock(db);

    console.log(
      `Migration lock acquired: ${lock.owner}`
    );

    await db.collection(
      MIGRATION_COLLECTION
    ).createIndex(
      {
        id: 1,
      },
      {
        unique: true,
        name: 'uniq_migration_id',
      }
    );

    const appCommit =
      getGitCommit();

    for (const migration of pending) {
      console.log(
        `Applying ${migration.id} ${migration.filename}`
      );

      const startedAt =
        new Date();

      await migration.up({
        db,
        client:
          connection.getClient(),
      });

      const finishedAt =
        new Date();

      await db.collection(
        MIGRATION_COLLECTION
      ).insertOne({
        id: migration.id,
        filename:
          migration.filename,
        description:
          migration.description,
        checksum:
          migration.checksum,
        appliedAt:
          finishedAt,
        durationMs:
          finishedAt.getTime() -
          startedAt.getTime(),
        appCommit,
      });

      console.log(
        `✅ Applied ${migration.id}`
      );
    }

    console.log(
      `Applied migrations: ${pending.length}`
    );
  } finally {
    if (
      connection &&
      lock
    ) {
      try {
        await releaseLock(
          connection.db,
          lock.owner
        );

        console.log(
          'Migration lock released.'
        );
      } catch (error) {
        console.error(
          'WARNING: failed to release migration lock:',
          error.message
        );
      }
    }

    await connection.close();
  }
}


async function main() {
  const command =
    process.argv[2] ||
    'status';

  if (command === 'check') {
    await commandCheck();
    return;
  }

  if (command === 'status') {
    await commandStatus();
    return;
  }

  if (command === 'up') {
    await commandUp();
    return;
  }

  throw new Error(
    `Unknown migration command: ${command}. Use check, status, or up.`
  );
}


if (require.main === module) {
  main().catch((error) => {
    console.error(
      `Migration command failed: ${error.message}`
    );

    process.exitCode = 1;
  });
}


module.exports = {
  FILE_PATTERN,
  MIGRATION_COLLECTION,
  LOCK_COLLECTION,
  sha256,
  parseMigrationFilename,
  discoverMigrations,
  validateMigrationList,
  compareMigrationState,
  assertNoDrift,
};
