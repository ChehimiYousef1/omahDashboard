'use strict';

const crypto = require('crypto');

const ApplicantFormSubmission =
  require('../models/ApplicantFormSubmission');

const {
  mapApplicantFormResponse,
  getValue,
  text,
} = require('./applicantFormMapper');

/*
|--------------------------------------------------------------------------
| Configuration
|--------------------------------------------------------------------------
*/

const FETCH_TIMEOUT_MS = 20000;
const MAX_CSV_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

/*
|--------------------------------------------------------------------------
| Google Sheet URL normalization
|--------------------------------------------------------------------------
|
| Supports:
|
| 1. Normal Google Sheet URL:
|    /spreadsheets/d/<ID>/edit?gid=123
|
| 2. Export URL:
|    /spreadsheets/d/<ID>/export?format=csv&gid=123
|
| 3. Published Google Sheet URL:
|    /spreadsheets/d/e/<PUBLISHED_ID>/pub?...&output=csv
|
| IMPORTANT:
| Published /d/e/... URLs must NOT be rewritten as /d/e/export.
|
|--------------------------------------------------------------------------
*/

function normalizeSheetCsvUrl(url) {
  const raw = text(url);

  if (!raw) {
    throw new Error(
      'Google Sheet CSV URL is missing.'
    );
  }

  let parsed;

  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(
      'Google Sheet CSV URL is invalid.'
    );
  }

  if (
    parsed.hostname !== 'docs.google.com'
  ) {
    throw new Error(
      'Applicant Sheet URL must use docs.google.com.'
    );
  }

  /*
   * Published Google Sheet:
   *
   * /spreadsheets/d/e/.../pub
   */
  if (
    parsed.pathname.includes(
      '/spreadsheets/d/e/'
    )
  ) {
    if (
      !parsed.pathname.endsWith('/pub')
    ) {
      throw new Error(
        'Unsupported published Google Sheet URL.'
      );
    }

    parsed.searchParams.set(
      'output',
      'csv'
    );

    return parsed.toString();
  }

  /*
   * Standard Google Sheet
   */
  const sheetIdMatch =
    parsed.pathname.match(
      /\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/
    );

  if (!sheetIdMatch) {
    throw new Error(
      'Unable to determine Google Sheet ID.'
    );
  }

  const sheetId =
    sheetIdMatch[1];

  /*
   * Detect gid from:
   *
   * ?gid=
   * #gid=
   */
  let gid =
    parsed.searchParams.get('gid');

  if (!gid && parsed.hash) {
    const hashMatch =
      parsed.hash.match(
        /gid=(\d+)/
      );

    if (hashMatch) {
      gid = hashMatch[1];
    }
  }

  gid = gid || '0';

  return (
    `https://docs.google.com/spreadsheets/d/` +
    `${sheetId}/export?format=csv&gid=${gid}`
  );
}

/*
|--------------------------------------------------------------------------
| CSV parser
|--------------------------------------------------------------------------
|
| Handles:
| - quoted fields
| - commas inside quotes
| - escaped double quotes
| - newlines inside quoted Google Form answers
| - CRLF / LF
|
|--------------------------------------------------------------------------
*/

function parseCsv(csvText) {
  if (
    typeof csvText !== 'string' ||
    csvText.length === 0
  ) {
    return [];
  }

  const rows = [];

  let row = [];
  let field = '';
  let insideQuotes = false;

  for (
    let index = 0;
    index < csvText.length;
    index++
  ) {
    const character =
      csvText[index];

    /*
     * Double quote
     */
    if (character === '"') {
      if (
        insideQuotes &&
        csvText[index + 1] === '"'
      ) {
        // Escaped quote: ""
        field += '"';
        index++;

        continue;
      }

      insideQuotes =
        !insideQuotes;

      continue;
    }

    /*
     * Comma outside quoted field
     */
    if (
      character === ',' &&
      !insideQuotes
    ) {
      row.push(field);
      field = '';

      continue;
    }

    /*
     * New line outside quoted field
     */
    if (
      (character === '\n' ||
        character === '\r') &&
      !insideQuotes
    ) {
      /*
       * Handle Windows CRLF
       */
      if (
        character === '\r' &&
        csvText[index + 1] === '\n'
      ) {
        index++;
      }

      row.push(field);

      field = '';

      /*
       * Ignore completely empty lines.
       */
      const hasContent =
        row.some(
          (value) =>
            text(value) !== ''
        );

      if (hasContent) {
        rows.push(row);
      }

      row = [];

      continue;
    }

    field += character;
  }

  /*
   * Last CSV value / row
   */
  row.push(field);

  if (
    row.some(
      (value) =>
        text(value) !== ''
    )
  ) {
    rows.push(row);
  }

  return rows;
}

/*
|--------------------------------------------------------------------------
| Convert CSV to response objects
|--------------------------------------------------------------------------
*/

function csvToObjects(csvText) {
  const rows =
    parseCsv(csvText);

  if (rows.length === 0) {
    return [];
  }

  const headers =
    rows[0].map(
      (header) =>
        text(header)
    );

  /*
   * Sheet may contain only headers
   * when no Google Form response exists.
   */
  if (rows.length === 1) {
    return [];
  }

  return rows
    .slice(1)
    .filter(
      (row) =>
        row.some(
          (value) =>
            text(value) !== ''
        )
    )
    .map((row) => {
      const object = {};

      headers.forEach(
        (header, index) => {
          if (!header) {
            return;
          }

          object[header] =
            row[index] ?? '';
        }
      );

      return object;
    });
}

/*
|--------------------------------------------------------------------------
| Fetch Google Sheet CSV
|--------------------------------------------------------------------------
*/

async function fetchSheetCsv(sheetUrl) {
  const csvUrl =
    normalizeSheetCsvUrl(
      sheetUrl
    );

  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () => controller.abort(),
      FETCH_TIMEOUT_MS
    );

  try {
    const response =
      await fetch(csvUrl, {
        method: 'GET',

        redirect: 'follow',

        signal:
          controller.signal,

        headers: {
          Accept:
            'text/csv,text/plain,*/*',
        },
      });

    if (!response.ok) {
      throw new Error(
        `Google Sheet request failed with HTTP ${response.status}.`
      );
    }

    const csvText =
      await response.text();

    if (
      Buffer.byteLength(
        csvText,
        'utf8'
      ) >
      MAX_CSV_SIZE_BYTES
    ) {
      throw new Error(
        'Google Sheet CSV is larger than the allowed 10 MB.'
      );
    }

    return {
      csvUrl,
      csvText,
    };
  } catch (error) {
    if (
      error.name ===
      'AbortError'
    ) {
      throw new Error(
        'Google Sheet request timed out.'
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

/*
|--------------------------------------------------------------------------
| Stable submission key
|--------------------------------------------------------------------------
|
| Important behavior:
|
| SAME Google Form response:
| email + timestamp + position
| -> same submissionKey
| -> duplicate skipped
|
| Same applicant submits again later:
| timestamp changes
| -> different submissionKey
| -> legitimate new submission
|
|--------------------------------------------------------------------------
*/

function normalizeKeyPart(value) {
  return text(value)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function buildSubmissionKey({
  email,
  submittedAt,
  positionTrack,
  sourceKey = 'google-form-v2',
}) {
  if (!submittedAt) {
    throw new Error(
      'Cannot generate submissionKey without a valid submission timestamp.'
    );
  }

  const canonicalValue = [
    normalizeKeyPart(
      sourceKey
    ),

    normalizeKeyPart(
      email
    ),

    submittedAt.toISOString(),

    normalizeKeyPart(
      positionTrack
    ),
  ].join('::');

  return (
    'gform:' +
    crypto
      .createHash('sha256')
      .update(
        canonicalValue,
        'utf8'
      )
      .digest('hex')
  );
}

/*
|--------------------------------------------------------------------------
| Validation
|--------------------------------------------------------------------------
|
| We validate only fields required to identify a genuine submission.
|
| Optional Google Form values are allowed to remain:
|
| ""
| []
| null
|
|--------------------------------------------------------------------------
*/

function validateMappedSubmission(
  mapped
) {
  const errors = [];

  if (
    !mapped.submittedAt ||
    !(
      mapped.submittedAt
      instanceof Date
    ) ||
    Number.isNaN(
      mapped.submittedAt.getTime()
    )
  ) {
    errors.push(
      'Invalid or missing Timestamp'
    );
  }

  if (
    !text(
      mapped.personal?.fullName
    )
  ) {
    errors.push(
      'Missing Full Name'
    );
  }

  if (
    !text(
      mapped.personal?.email
    )
  ) {
    errors.push(
      'Missing Email Address'
    );
  }

  if (
    !text(
      mapped.preferences
        ?.positionTrack
    )
  ) {
    errors.push(
      'Missing Internship / Position Track'
    );
  }

  return errors;
}

/*
|--------------------------------------------------------------------------
| Process ONE Google Form response
|--------------------------------------------------------------------------
*/

async function processSubmission(
  row,
  {
    dryRun = true,
    sourceKey =
      'google-form-v2',
  } = {}
) {
  const mapped =
    mapApplicantFormResponse(
      row
    );

  const validationErrors =
    validateMappedSubmission(
      mapped
    );

  if (
    validationErrors.length >
    0
  ) {
    return {
      status: 'invalid',

      reason:
        validationErrors.join(
          '; '
        ),
    };
  }

  const submissionKey =
    buildSubmissionKey({
      email:
        mapped.personal.email,

      submittedAt:
        mapped.submittedAt,

      positionTrack:
        mapped.preferences
          .positionTrack,

      sourceKey,
    });

  /*
   * Add the internal key only after
   * mapping + validation.
   */
  mapped.submissionKey =
    submissionKey;

  /*
   * Read-only duplicate check.
   */
  const existing =
    await ApplicantFormSubmission
      .exists({
        submissionKey,
      });

  if (existing) {
    return {
      status: 'duplicate',
      submissionKey,
    };
  }

  /*
   * Safe testing mode:
   *
   * NO INSERT
   */
  if (dryRun) {
    return {
      status: 'would-insert',
      submissionKey,
    };
  }

  try {
    await ApplicantFormSubmission
      .create(mapped);

    return {
      status: 'inserted',
      submissionKey,
    };
  } catch (error) {
    /*
     * MongoDB duplicate key.
     *
     * Protects against race conditions
     * if two sync jobs run at the same time.
     */
    if (
      error &&
      error.code === 11000
    ) {
      return {
        status: 'duplicate',
        submissionKey,
      };
    }

    throw error;
  }
}

/*
|--------------------------------------------------------------------------
| Main synchronization
|--------------------------------------------------------------------------
*/

async function syncApplicantForm({
  sheetUrl,
  dryRun = true,
} = {}) {
  if (!sheetUrl) {
    throw new Error(
      'sheetUrl is required.'
    );
  }

  const {
    csvUrl,
    csvText,
  } =
    await fetchSheetCsv(
      sheetUrl
    );

  const rows =
    csvToObjects(
      csvText
    );

  const result = {
    dryRun,

    rowsFound:
      rows.length,

    inserted: 0,

    wouldInsert: 0,

    duplicates: 0,

    invalid: 0,

    failed: 0,

    /*
     * Do NOT return full applicant
     * data here because it contains PII.
     */
    errors: [],
  };

  /*
   * Hash the normalized Sheet URL.
   *
   * This keeps submissions from
   * different forms logically separate
   * without storing the URL itself in
   * submissionKey.
   */
  const sourceKey =
    crypto
      .createHash('sha256')
      .update(csvUrl)
      .digest('hex');

  for (
    let index = 0;
    index < rows.length;
    index++
  ) {
    const row =
      rows[index];

    try {
      const outcome =
        await processSubmission(
          row,
          {
            dryRun,
            sourceKey,
          }
        );

      switch (
        outcome.status
      ) {
        case 'inserted':
          result.inserted++;
          break;

        case 'would-insert':
          result.wouldInsert++;
          break;

        case 'duplicate':
          result.duplicates++;
          break;

        case 'invalid':
          result.invalid++;

          result.errors.push({
            row:
              index + 2,

            reason:
              outcome.reason,
          });

          break;

        default:
          result.failed++;

          result.errors.push({
            row:
              index + 2,

            reason:
              'Unknown synchronization result.',
          });
      }
    } catch (error) {
      result.failed++;

      /*
       * Don't log applicant values.
       */
      result.errors.push({
        row:
          index + 2,

        reason:
          error.message ||
          'Unknown error',
      });
    }
  }

  return result;
}

/*
|--------------------------------------------------------------------------
| Exports
|--------------------------------------------------------------------------
*/

module.exports = {
  normalizeSheetCsvUrl,
  parseCsv,
  csvToObjects,
  fetchSheetCsv,
  buildSubmissionKey,
  validateMappedSubmission,
  processSubmission,
  syncApplicantForm,
};