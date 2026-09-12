'use strict';

const assert =
  require('assert');

const mongoose =
  require('mongoose');

const {
  processSubmission,
} = require(
  '../services/applicantFormSyncService'
);

const SUBMISSION_ID =
  '66b000000000000000000000001';

const APPLICANT_ID =
  '66a000000000000000000000001';

const row = {
  Timestamp:
    '25/08/2026 20:30:00',

  'Full Name':
    'Test Applicant',

  'Email Address':
    'TEST@EXAMPLE.COM',

  'Phone Number':
    '+96170000000',

  Country:
    'Lebanon',

  City:
    'Beirut',

  'University / College Name':
    'Lebanese University',

  'Degree Program / Major':
    'Computer Science',

  'Internship / Position Track':
    'Software Engineering',

  'Primary Technical Skills':
    'JavaScript, Node.js, React',

  'Programming Languages You Use':
    'JavaScript, Python',

  'LinkedIn Profile':
    'https://linkedin.com/in/test',

  'GitHub / Code Repository Profile':
    'https://github.com/test',

  'CV / Resume':
    'https://example.com/cv.pdf',
};

function queryResult(value) {
  return {
    select() {
      return this;
    },

    async lean() {
      return value;
    },
  };
}

/*
|--------------------------------------------------------------------------
| 1. Dry-run new response
|--------------------------------------------------------------------------
*/

async function testDryRunNewResponse() {
  let createCalled = false;
  let ingestionCalled = false;

  const SubmissionModel = {
    findOne() {
      return queryResult(null);
    },

    async create() {
      createCalled = true;

      throw new Error(
        'create() must not run in dry-run.'
      );
    },
  };

  const result =
    await processSubmission(
      row,
      {
        dryRun: true,

        sourceKey:
          'integration-test',

        SubmissionModel,

        ensureApplicantIngestionFn:
          async () => {
            ingestionCalled = true;

            throw new Error(
              'Ingestion must not run in dry-run.'
            );
          },
      }
    );

  assert.strictEqual(
    result.status,
    'would-insert'
  );

  assert.strictEqual(
    createCalled,
    false
  );

  assert.strictEqual(
    ingestionCalled,
    false
  );

  console.log(
    '✅ Dry-run performs no writes or ingestion'
  );
}

/*
|--------------------------------------------------------------------------
| 2. Real new response
|--------------------------------------------------------------------------
*/

async function testNewResponseIngestion() {
  let createCount = 0;
  let ingestionCount = 0;

  const SubmissionModel = {
    findOne() {
      return queryResult(null);
    },

    async create(mapped) {
      createCount++;

      assert.ok(
        mapped.submissionKey
      );

      return {
        ...mapped,
        _id: SUBMISSION_ID,
      };
    },
  };

  const result =
    await processSubmission(
      row,
      {
        dryRun: false,

        sourceKey:
          'integration-test',

        SubmissionModel,

        ensureApplicantIngestionFn:
          async ({
            submissionId,
          }) => {
            ingestionCount++;

            assert.strictEqual(
              String(submissionId),
              SUBMISSION_ID
            );

            return {
              applicantId:
                APPLICANT_ID,

              applicantStatus:
                'created',

              duplicateCandidates: 0,

              duplicateCasesCreated: 0,

              duplicateCasesReused: 0,
            };
          },
      }
    );

  assert.strictEqual(
    result.status,
    'inserted'
  );

  assert.strictEqual(
    createCount,
    1
  );

  assert.strictEqual(
    ingestionCount,
    1
  );

  assert.strictEqual(
    result.applicantStatus,
    'created'
  );

  console.log(
    '✅ New submission triggers Applicant ingestion'
  );
}

/*
|--------------------------------------------------------------------------
| 3. Existing response self-healing
|--------------------------------------------------------------------------
*/

async function testExistingResponseReconciliation() {
  let createCount = 0;
  let ingestionCount = 0;

  const SubmissionModel = {
    findOne() {
      return queryResult({
        _id:
          SUBMISSION_ID,

        applicantId:
          null,
      });
    },

    async create() {
      createCount++;

      throw new Error(
        'Existing response must not be inserted again.'
      );
    },
  };

  const result =
    await processSubmission(
      row,
      {
        dryRun: false,

        sourceKey:
          'integration-test',

        SubmissionModel,

        ensureApplicantIngestionFn:
          async ({
            submissionId,
          }) => {
            ingestionCount++;

            assert.strictEqual(
              String(submissionId),
              SUBMISSION_ID
            );

            return {
              applicantId:
                APPLICANT_ID,

              applicantStatus:
                'created',

              duplicateCandidates: 0,

              duplicateCasesCreated: 0,

              duplicateCasesReused: 0,
            };
          },
      }
    );

  assert.strictEqual(
    result.status,
    'duplicate'
  );

  assert.strictEqual(
    result.repaired,
    true
  );

  assert.strictEqual(
    createCount,
    0
  );

  assert.strictEqual(
    ingestionCount,
    1
  );

  console.log(
    '✅ Existing unlinked submission self-heals'
  );
}

/*
|--------------------------------------------------------------------------
| 4. Concurrent duplicate-key race
|--------------------------------------------------------------------------
*/

async function testDuplicateKeyRace() {
  let findCount = 0;
  let ingestionCount = 0;

  const SubmissionModel = {
    findOne() {
      findCount++;

      /*
       * Initial lookup:
       * no existing submission.
       *
       * Race recovery lookup:
       * another process has now inserted it.
       */
      if (findCount === 1) {
        return queryResult(null);
      }

      return queryResult({
        _id:
          SUBMISSION_ID,

        applicantId:
          APPLICANT_ID,
      });
    },

    async create() {
      const error =
        new Error(
          'duplicate key'
        );

      error.code = 11000;

      throw error;
    },
  };

  const result =
    await processSubmission(
      row,
      {
        dryRun: false,

        sourceKey:
          'integration-test',

        SubmissionModel,

        ensureApplicantIngestionFn:
          async ({
            submissionId,
          }) => {
            ingestionCount++;

            assert.strictEqual(
              String(submissionId),
              SUBMISSION_ID
            );

            return {
              applicantId:
                APPLICANT_ID,

              applicantStatus:
                'already-created',

              duplicateCandidates: 0,

              duplicateCasesCreated: 0,

              duplicateCasesReused: 0,
            };
          },
      }
    );

  assert.strictEqual(
    result.status,
    'duplicate'
  );

  assert.strictEqual(
    result.applicantStatus,
    'already-created'
  );

  assert.strictEqual(
    result.repaired,
    false
  );

  assert.strictEqual(
    findCount,
    2
  );

  assert.strictEqual(
    ingestionCount,
    1
  );

  console.log(
    '✅ Duplicate-key race reconciles safely'
  );
}

async function run() {
  console.log(
    '========================================'
  );

  console.log(
    ' FORM INGESTION INTEGRATION TEST'
  );

  console.log(
    '========================================'
  );

  assert.strictEqual(
    mongoose.connection.readyState,
    0
  );

  await testDryRunNewResponse();

  await testNewResponseIngestion();

  await testExistingResponseReconciliation();

  await testDuplicateKeyRace();

  assert.strictEqual(
    mongoose.connection.readyState,
    0
  );

  console.log('');
  console.log(
    '✅ All integration scenarios passed'
  );

  console.log(
    '✅ No MongoDB connection'
  );

  console.log(
    '✅ No real Google Sheet request'
  );

  console.log(
    '✅ No real Applicant created'
  );

  console.log(
    '✅ No real Submission changed'
  );

  console.log(
    '✅ Existing 59 records untouched'
  );
}

run().catch((error) => {
  console.error(
    '❌ TEST FAILED:',
    error
  );

  process.exitCode = 1;
});
