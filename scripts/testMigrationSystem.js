'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  MIGRATION_COLLECTION,
  LOCK_COLLECTION,
  sha256,
  parseMigrationFilename,
  discoverMigrations,
  compareMigrationState,
  assertNoDrift,
} = require('./migrate');


function writeMigration(
  dir,
  filename,
  {
    description = 'test migration',
    withUp = true,
  } = {}
) {
  const lines = [
    "'use strict';",
    '',
    'module.exports = {',
    `  description: ${JSON.stringify(description)},`,
  ];

  if (withUp) {
    lines.push(
      '  async up({ db }) {',
      '    void db;',
      '  },'
    );
  }

  lines.push(
    '};',
    ''
  );

  fs.writeFileSync(
    path.join(
      dir,
      filename
    ),
    lines.join('\n')
  );
}


function expectThrows(
  fn,
  pattern
) {
  let threw = false;

  try {
    fn();
  } catch (error) {
    threw = true;

    if (pattern) {
      assert.match(
        error.message,
        pattern
      );
    }
  }

  assert.strictEqual(
    threw,
    true,
    'Expected function to throw'
  );
}


const tempDir =
  fs.mkdtempSync(
    path.join(
      os.tmpdir(),
      'omah-migrations-'
    )
  );

try {
  assert.deepStrictEqual(
    parseMigrationFilename(
      '001_example.js'
    ),
    {
      id: '001',
      name: 'example',
    }
  );

  assert.strictEqual(
    parseMigrationFilename(
      '_template.js'
    ),
    null
  );

  console.log(
    '✅ migration filename parsing'
  );

  writeMigration(
    tempDir,
    '002_second.js'
  );

  writeMigration(
    tempDir,
    '001_first.js'
  );

  fs.writeFileSync(
    path.join(
      tempDir,
      '_template.js'
    ),
    'module.exports = {};\n'
  );

  const migrations =
    discoverMigrations(
      tempDir
    );

  assert.deepStrictEqual(
    migrations.map(
      (migration) =>
        migration.id
    ),
    [
      '001',
      '002',
    ]
  );

  console.log(
    '✅ deterministic migration discovery/order'
  );

  assert.strictEqual(
    migrations.length,
    2
  );

  console.log(
    '✅ template file ignored'
  );

  const firstChecksum =
    migrations[0].checksum;

  fs.appendFileSync(
    path.join(
      tempDir,
      '001_first.js'
    ),
    '\n// checksum change\n'
  );

  const changed =
    discoverMigrations(
      tempDir
    );

  assert.notStrictEqual(
    changed[0].checksum,
    firstChecksum
  );

  console.log(
    '✅ source checksum detects migration edits'
  );

  const appliedRows = [
    {
      id: '001',
      filename:
        '001_first.js',
      checksum:
        changed[0].checksum,
      appliedAt:
        new Date(
          '2026-01-01T00:00:00Z'
        ),
    },
  ];

  const state =
    compareMigrationState(
      changed,
      appliedRows
    );

  assert.strictEqual(
    state.find(
      (row) =>
        row.id === '001'
    ).state,
    'applied'
  );

  assert.strictEqual(
    state.find(
      (row) =>
        row.id === '002'
    ).state,
    'pending'
  );

  console.log(
    '✅ applied/pending state classification'
  );

  const driftState =
    compareMigrationState(
      changed,
      [
        {
          id: '001',
          filename:
            '001_first.js',
          checksum:
            'different',
        },
      ]
    );

  assert.strictEqual(
    driftState.find(
      (row) =>
        row.id === '001'
    ).state,
    'checksum-drift'
  );

  expectThrows(
    () =>
      assertNoDrift(
        driftState
      ),
    /Migration drift detected/
  );

  console.log(
    '✅ checksum drift blocks migration execution'
  );

  const missingState =
    compareMigrationState(
      changed,
      [
        {
          id: '999',
          filename:
            '999_removed.js',
          checksum:
            sha256('old'),
        },
      ]
    );

  assert.strictEqual(
    missingState.find(
      (row) =>
        row.id === '999'
    ).state,
    'missing-file'
  );

  expectThrows(
    () =>
      assertNoDrift(
        missingState
      ),
    /Migration drift detected/
  );

  console.log(
    '✅ missing applied file blocks migration execution'
  );

  const invalidDir =
    fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        'omah-invalid-migrations-'
      )
    );

  try {
    writeMigration(
      invalidDir,
      '001_invalid.js',
      {
        withUp: false,
      }
    );

    expectThrows(
      () =>
        discoverMigrations(
          invalidDir
        ),
      /must export async up/
    );

    console.log(
      '✅ invalid migration contract rejected'
    );
  } finally {
    fs.rmSync(
      invalidDir,
      {
        recursive: true,
        force: true,
      }
    );
  }

  const blankDescriptionDir =
    fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        'omah-empty-description-'
      )
    );

  try {
    writeMigration(
      blankDescriptionDir,
      '001_invalid.js',
      {
        description: '',
      }
    );

    expectThrows(
      () =>
        discoverMigrations(
          blankDescriptionDir
        ),
      /non-empty description/
    );

    console.log(
      '✅ migration description required'
    );
  } finally {
    fs.rmSync(
      blankDescriptionDir,
      {
        recursive: true,
        force: true,
      }
    );
  }

  assert.strictEqual(
    MIGRATION_COLLECTION,
    '_schema_migrations'
  );

  assert.strictEqual(
    LOCK_COLLECTION,
    '_schema_migration_locks'
  );

  console.log(
    '✅ migration metadata collection contract'
  );

  const packageJson =
    require('../package.json');

  assert.strictEqual(
    packageJson.scripts.migrate,
    'node scripts/migrate.js up'
  );

  assert.strictEqual(
    packageJson.scripts[
      'migrate:status'
    ],
    'node scripts/migrate.js status'
  );

  assert.strictEqual(
    packageJson.scripts[
      'migrate:check'
    ],
    'node scripts/migrate.js check'
  );

  assert.strictEqual(
    packageJson.scripts[
      'test:migrations'
    ],
    'node scripts/testMigrationSystem.js'
  );

  console.log(
    '✅ npm migration commands registered'
  );

  for (
    const file
    of [
      'migrations/README.md',
      'docs/migrations.md',
    ]
  ) {
    assert.strictEqual(
      fs.existsSync(
        path.join(
          __dirname,
          '..',
          file
        )
      ),
      true,
      `${file} must exist`
    );
  }

  console.log(
    '✅ migration documentation present'
  );

  console.log('');
  console.log(
    'DATABASE MIGRATION SYSTEM TEST PASSED'
  );
} finally {
  fs.rmSync(
    tempDir,
    {
      recursive: true,
      force: true,
    }
  );
}
