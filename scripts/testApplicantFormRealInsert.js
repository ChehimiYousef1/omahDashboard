'use strict';

require('dotenv').config({
  quiet: true,
});

const mongoose = require('mongoose');

const ApplicantFormSubmission =
  require('../models/ApplicantFormSubmission');

const {
  syncApplicantForm,
  fetchSheetCsv,
  csvToObjects,
} = require('../services/applicantFormSyncService');

const {
  mapApplicantFormResponse,
} = require('../services/applicantFormMapper');

/*
|--------------------------------------------------------------------------
| Controlled Real Insert Test
|--------------------------------------------------------------------------
|
| PURPOSE:
| Test exactly ONE new Google Form response against the real MongoDB
| collection.
|
| SAFETY RULES:
|
| 1. Exactly one response must exist in the Google Sheet.
| 2. The response must use the designated fake test email.
| 3. Dry-run must report exactly one would-be insert.
| 4. There must be no duplicates, invalid rows, or failures.
| 5. Real insertion requires the explicit --confirm-insert flag.
| 6. Expected database count increase is exactly +1.
|
|--------------------------------------------------------------------------
*/

const EXPECTED_TEST_EMAIL =
  'test.applicant@example.com';

function hasConfirmationFlag() {
  return process.argv.includes(
    '--confirm-insert'
  );
}

async function run() {
  let connected = false;

  try {
    /*
    |--------------------------------------------------------------------------
    | Environment checks
    |--------------------------------------------------------------------------
    */

    if (!process.env.MONGODB_URI) {
      throw new Error(
        'MONGODB_URI is not configured.'
      );
    }

    if (
      !process.env
        .APPLICANT_SHEET_CSV_URL
    ) {
      throw new Error(
        'APPLICANT_SHEET_CSV_URL is not configured.'
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Read Google Sheet BEFORE touching MongoDB
    |--------------------------------------------------------------------------
    */

    console.log(
      'Checking Google Form response sheet...'
    );

    const {
      csvText,
    } = await fetchSheetCsv(
      process.env
        .APPLICANT_SHEET_CSV_URL
    );

    const rows =
      csvToObjects(csvText);

    console.log(
      'Google Form responses:',
      rows.length
    );

    /*
     * Empty sheet is completely safe.
     */
    if (rows.length === 0) {
      console.log(
        '\n✅ SAFE STOP'
      );

      console.log(
        'No Google Form responses exist.'
      );

      console.log(
        'Nothing was inserted.'
      );

      return;
    }

    /*
     * This controlled test is ONLY for
     * exactly one response.
     */
    if (rows.length !== 1) {
      throw new Error(
        `Safety stop: expected exactly 1 test response, but found ${rows.length}.`
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Verify fake test applicant
    |--------------------------------------------------------------------------
    */

    const mapped =
      mapApplicantFormResponse(
        rows[0]
      );

    const actualEmail =
      String(
        mapped.personal?.email || ''
      )
        .trim()
        .toLowerCase();

    if (
      actualEmail !==
      EXPECTED_TEST_EMAIL
    ) {
      throw new Error(
        'Safety stop: the Google Form response is not the designated test applicant.'
      );
    }

    console.log(
      '✅ Test applicant verified'
    );

    /*
    |--------------------------------------------------------------------------
    | Connect to MongoDB
    |--------------------------------------------------------------------------
    */

    console.log(
      '\nConnecting to MongoDB...'
    );

    await mongoose.connect(
      process.env.MONGODB_URI
    );

    connected = true;

    console.log(
      '✅ Connected to MongoDB'
    );

    /*
    |--------------------------------------------------------------------------
    | Count before
    |--------------------------------------------------------------------------
    */

    const beforeCount =
      await ApplicantFormSubmission
        .countDocuments();

    console.log(
      '\nApplicant submissions before:',
      beforeCount
    );

    /*
    |--------------------------------------------------------------------------
    | Mandatory dry-run first
    |--------------------------------------------------------------------------
    */

    console.log(
      '\nRunning mandatory dry-run...'
    );

    const dryRunResult =
      await syncApplicantForm({
        sheetUrl:
          process.env
            .APPLICANT_SHEET_CSV_URL,

        dryRun: true,
      });

    console.log(
      '\n--- DRY RUN ---'
    );

    console.log(
      'Rows found:',
      dryRunResult.rowsFound
    );

    console.log(
      'Would insert:',
      dryRunResult.wouldInsert
    );

    console.log(
      'Duplicates:',
      dryRunResult.duplicates
    );

    console.log(
      'Invalid:',
      dryRunResult.invalid
    );

    console.log(
      'Failed:',
      dryRunResult.failed
    );

    /*
    |--------------------------------------------------------------------------
    | Dry-run safety assertions
    |--------------------------------------------------------------------------
    */

    if (
      dryRunResult.rowsFound !== 1
    ) {
      throw new Error(
        'Safety stop: dry-run did not find exactly one response.'
      );
    }

    if (
      dryRunResult.wouldInsert !== 1
    ) {
      throw new Error(
        'Safety stop: dry-run did not report exactly one insert.'
      );
    }

    if (
      dryRunResult.duplicates !== 0
    ) {
      throw new Error(
        'Safety stop: test response is already in MongoDB.'
      );
    }

    if (
      dryRunResult.invalid !== 0
    ) {
      throw new Error(
        'Safety stop: test response failed validation.'
      );
    }

    if (
      dryRunResult.failed !== 0
    ) {
      throw new Error(
        'Safety stop: dry-run encountered an error.'
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Require explicit confirmation
    |--------------------------------------------------------------------------
    */

    if (!hasConfirmationFlag()) {
      console.log(
        '\n✅ DRY-RUN PASSED'
      );

      console.log(
        'Real insertion was NOT performed.'
      );

      console.log(
        '\nTo perform the controlled insert, run:'
      );

      console.log(
        'node scripts/testApplicantFormRealInsert.js --confirm-insert'
      );

      return;
    }

    /*
    |--------------------------------------------------------------------------
    | Real insert
    |--------------------------------------------------------------------------
    */

    console.log(
      '\n⚠️ Performing controlled test insert...'
    );

    const realResult =
      await syncApplicantForm({
        sheetUrl:
          process.env
            .APPLICANT_SHEET_CSV_URL,

        dryRun: false,
      });

    /*
    |--------------------------------------------------------------------------
    | Count after
    |--------------------------------------------------------------------------
    */

    const afterCount =
      await ApplicantFormSubmission
        .countDocuments();

    console.log(
      '\n--- REAL INSERT RESULT ---'
    );

    console.log(
      'Inserted:',
      realResult.inserted
    );

    console.log(
      'Duplicates:',
      realResult.duplicates
    );

    console.log(
      'Invalid:',
      realResult.invalid
    );

    console.log(
      'Failed:',
      realResult.failed
    );

    console.log(
      '\nApplicant submissions before:',
      beforeCount
    );

    console.log(
      'Applicant submissions after:',
      afterCount
    );

    /*
    |--------------------------------------------------------------------------
    | Final safety assertions
    |--------------------------------------------------------------------------
    */

    if (
      realResult.inserted !== 1
    ) {
      throw new Error(
        `Expected exactly 1 inserted record, but received ${realResult.inserted}.`
      );
    }

    if (
      realResult.invalid !== 0 ||
      realResult.failed !== 0
    ) {
      throw new Error(
        'Real insert completed with validation or synchronization errors.'
      );
    }

    if (
      afterCount !==
      beforeCount + 1
    ) {
      throw new Error(
        `Database count expected ${beforeCount + 1}, but found ${afterCount}.`
      );
    }

    console.log(
      '\n✅ CONTROLLED INSERT PASSED'
    );

    console.log(
      `✅ Database count increased exactly once: ${beforeCount} → ${afterCount}`
    );

    console.log(
      '✅ Test applicant inserted successfully'
    );

  } catch (error) {
    console.error(
      '\n❌ TEST STOPPED'
    );

    console.error(
      error.message
    );

    process.exitCode = 1;

  } finally {
    if (connected) {
      await mongoose.disconnect();

      console.log(
        '\nMongoDB connection closed.'
      );
    }
  }
}

run();