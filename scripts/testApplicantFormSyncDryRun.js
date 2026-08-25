'use strict';

require('dotenv').config({
  quiet: true,
});

const mongoose = require('mongoose');

const ApplicantFormSubmission =
  require('../models/ApplicantFormSubmission');

const {
  syncApplicantForm,
} = require('../services/applicantFormSyncService');

async function run() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error(
        'MONGODB_URI is not configured.'
      );
    }

    if (
      !process.env.APPLICANT_SHEET_CSV_URL
    ) {
      throw new Error(
        'APPLICANT_SHEET_CSV_URL is not configured.'
      );
    }

    console.log(
      'Connecting to MongoDB...'
    );

    await mongoose.connect(
      process.env.MONGODB_URI
    );

    console.log(
      '✅ Connected to MongoDB'
    );

    /*
    |--------------------------------------------------------------------------
    | Count BEFORE test
    |--------------------------------------------------------------------------
    */

    const beforeCount =
      await ApplicantFormSubmission
        .countDocuments();

    console.log(
      '\nApplicant submissions before dry run:',
      beforeCount
    );

    /*
    |--------------------------------------------------------------------------
    | DRY RUN
    |--------------------------------------------------------------------------
    |
    | IMPORTANT:
    | dryRun: true means:
    |
    | - fetch sheet        ✅
    | - parse CSV          ✅
    | - map fields         ✅
    | - check duplicates   ✅
    | - INSERT             ❌
    | - UPDATE             ❌
    | - DELETE             ❌
    |
    */

    console.log(
      '\nStarting SAFE dry run...'
    );

    const result =
      await syncApplicantForm({
        sheetUrl:
          process.env
            .APPLICANT_SHEET_CSV_URL,

        dryRun: true,
      });

    /*
    |--------------------------------------------------------------------------
    | Count AFTER test
    |--------------------------------------------------------------------------
    */

    const afterCount =
      await ApplicantFormSubmission
        .countDocuments();

    console.log(
      '\n--- DRY RUN RESULT ---'
    );

    console.log(
      'Rows found:',
      result.rowsFound
    );

    console.log(
      'Would insert:',
      result.wouldInsert
    );

    console.log(
      'Inserted:',
      result.inserted
    );

    console.log(
      'Duplicates:',
      result.duplicates
    );

    console.log(
      'Invalid:',
      result.invalid
    );

    console.log(
      'Failed:',
      result.failed
    );

    if (
      result.errors &&
      result.errors.length > 0
    ) {
      console.log(
        '\nValidation / parsing issues:'
      );

      console.dir(
        result.errors,
        {
          depth: null,
        }
      );
    }

    console.log(
      '\nApplicant submissions after dry run:',
      afterCount
    );

    /*
    |--------------------------------------------------------------------------
    | Safety verification
    |--------------------------------------------------------------------------
    */

    if (beforeCount !== afterCount) {
      throw new Error(
        `SAFETY CHECK FAILED: database count changed from ${beforeCount} to ${afterCount}.`
      );
    }

    if (result.inserted !== 0) {
      throw new Error(
        'SAFETY CHECK FAILED: dry run inserted records.'
      );
    }

    console.log(
      '\n✅ DRY RUN SAFE'
    );

    console.log(
      '✅ Database count did not change'
    );

    console.log(
      '✅ No applications were inserted'
    );
  } catch (error) {
    console.error(
      '\n❌ Dry-run test failed:'
    );

    console.error(
      error.message
    );

    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();

    console.log(
      '\nMongoDB connection closed.'
    );
  }
}

run();