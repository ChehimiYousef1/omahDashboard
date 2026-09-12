'use strict';

const crypto =
  require('crypto');

const fs =
  require('fs');

const path =
  require('path');

const ROOT =
  path.resolve(
    __dirname,
    '..'
  );

const ENV_PATH =
  path.join(
    ROOT,
    '.env'
  );

function generateSecret(bytes = 48) {
  return crypto
    .randomBytes(bytes)
    .toString('base64url');
}

function parseEnv(text) {
  const map =
    new Map();

  for (
    const line
    of text.split(/\r?\n/)
  ) {
    const trimmed =
      line.trim();

    if (
      !trimmed ||
      trimmed.startsWith('#') ||
      !line.includes('=')
    ) {
      continue;
    }

    const index =
      line.indexOf('=');

    const key =
      line
        .slice(0, index)
        .trim();

    const value =
      line
        .slice(index + 1);

    if (key) {
      map.set(
        key,
        value
      );
    }
  }

  return map;
}

function setOrAppend(
  lines,
  values,
  key,
  value,
  {
    replaceEmpty = true,
  } = {}
) {
  const existing =
    values.get(key);

  /*
   * Preserve non-empty existing values.
   */
  if (
    existing !== undefined &&
    String(existing).trim() !== ''
  ) {
    return {
      status:
        'preserved',
    };
  }

  /*
   * Replace an existing empty KEY=
   * without creating duplicates.
   */
  if (
    existing !== undefined &&
    replaceEmpty
  ) {
    const prefix =
      `${key}=`;

    const index =
      lines.findIndex(
        (line) =>
          line.startsWith(prefix)
      );

    if (index !== -1) {
      lines[index] =
        `${key}=${value}`;

      values.set(
        key,
        value
      );

      return {
        status:
          'filled',
      };
    }
  }

  lines.push(
    `${key}=${value}`
  );

  values.set(
    key,
    value
  );

  return {
    status:
      'added',
  };
}

function main() {
  /*
   * Hard safety rule:
   * never operate outside project root.
   */
  if (
    !fs.existsSync(
      path.join(
        ROOT,
        'package.json'
      )
    )
  ) {
    throw new Error(
      'Project package.json not found.'
    );
  }

  let original = '';

  if (
    fs.existsSync(
      ENV_PATH
    )
  ) {
    original =
      fs.readFileSync(
        ENV_PATH,
        'utf8'
      );
  }

  const lines =
    original
      .replace(/\r\n/g, '\n')
      .split('\n');

  /*
   * Remove only trailing blank lines.
   */
  while (
    lines.length &&
    lines[
      lines.length - 1
    ] === ''
  ) {
    lines.pop();
  }

  const values =
    parseEnv(original);

  const changes = [];

  function ensure(
    key,
    value,
    options
  ) {
    const result =
      setOrAppend(
        lines,
        values,
        key,
        value,
        options
      );

    changes.push({
      key,
      status:
        result.status,
    });
  }

  /*
   * ------------------------------------------------
   * Core backend
   * ------------------------------------------------
   */

  ensure(
    'MONGODB_URI',
    'mongodb://127.0.0.1:27017/omahconnect'
  );

  ensure(
    'PORT',
    '5000'
  );

  ensure(
    'NODE_ENV',
    'development'
  );

  ensure(
    'ALLOWED_ORIGINS',
    'http://localhost:5173'
  );

  /*
   * Generate JWT secret ONLY when
   * missing or empty.
   *
   * Existing JWT secrets are not
   * silently rotated.
   */
  ensure(
    'JWT_SECRET',
    generateSecret(64)
  );

  /*
   * ------------------------------------------------
   * Applicant Google Sheet reconciliation
   * ------------------------------------------------
   */

  /*
   * URL cannot be generated.
   * Preserve existing value; otherwise
   * create an empty placeholder.
   */
  if (
    !values.has(
      'APPLICANT_SHEET_CSV_URL'
    )
  ) {
    lines.push(
      'APPLICANT_SHEET_CSV_URL='
    );

    values.set(
      'APPLICANT_SHEET_CSV_URL',
      ''
    );

    changes.push({
      key:
        'APPLICANT_SHEET_CSV_URL',

      status:
        'placeholder',
    });
  } else {
    changes.push({
      key:
        'APPLICANT_SHEET_CSV_URL',

      status:
        String(
          values.get(
            'APPLICANT_SHEET_CSV_URL'
          )
        ).trim()
          ? 'preserved'
          : 'empty',
    });
  }

  /*
   * Keep automatic writes OFF until
   * explicitly enabled after production
   * deployment verification.
   */
  ensure(
    'APPLICANT_SYNC_WRITE_ENABLED',
    'false'
  );

  ensure(
    'APPLICANT_AUTO_SYNC_ENABLED',
    'false'
  );

  /*
   * ------------------------------------------------
   * Immediate Form webhook
   * ------------------------------------------------
   */

  ensure(
    'APPLICANT_FORM_SOURCE_KEY',
    'omah-applicant-form-v2'
  );

  ensure(
    'APPLICANT_FORM_WEBHOOK_SECRET',
    generateSecret(48)
  );

  /*
   * Atomic-ish local replacement:
   * write temporary file first.
   */
  const tempPath =
    `${ENV_PATH}.tmp`;

  fs.writeFileSync(
    tempPath,
    lines.join('\n') +
      '\n',
    {
      encoding:
        'utf8',

      mode:
        0o600,
    }
  );

  fs.renameSync(
    tempPath,
    ENV_PATH
  );

  fs.chmodSync(
    ENV_PATH,
    0o600
  );

  console.log(
    '========================================'
  );

  console.log(
    ' OMAH ENVIRONMENT CONFIGURATION'
  );

  console.log(
    '========================================'
  );

  for (
    const change
    of changes
  ) {
    console.log(
      `${change.key}: ${change.status}`
    );
  }

  console.log('');

  console.log(
    '✅ .env configuration complete'
  );

  console.log(
    '✅ Existing non-empty values preserved'
  );

  console.log(
    '✅ Missing secrets generated securely'
  );

  console.log(
    '✅ Secret values were not printed'
  );

  console.log(
    '✅ .env permissions set to 600'
  );

  console.log(
    '✅ Automatic Form writes remain disabled'
  );
}

try {
  main();
} catch (error) {
  console.error(
    '❌ Environment setup failed:',
    error.message
  );

  process.exitCode = 1;
}
