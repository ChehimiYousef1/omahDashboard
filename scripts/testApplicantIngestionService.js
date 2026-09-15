'use strict';

const assert =
  require('assert');

const mongoose =
  require('mongoose');

const {
  ensureApplicantIngestion,
} = require(
  '../services/applicantIngestionService'
);

const SOURCE_ID =
  '66a000000000000000000001';

const CANDIDATE_ID =
  '66a000000000000000000000002';

const SUBMISSION_ID =
  '66b000000000000000000000001';

function queryResult(value) {
  return {
    lean: async () =>
      value,
  };
}

function makeApplicantModel(
  records
) {
  return {
    findById(id) {
      return queryResult(
        records[
          String(id)
        ] || null
      );
    },
  };
}

async function testNewApplicantNoDuplicates() {
  const source = {
    _id: SOURCE_ID,

    identity: {
      fullName: 'Applicant One',
    },

    profiles: {},
  };

  const ApplicantModel =
    makeApplicantModel({
      [SOURCE_ID]:
        source,
    });

  const result =
    await ensureApplicantIngestion({
      submissionId:
        SUBMISSION_ID,

      ApplicantModel,

      SubmissionModel: {},

      DuplicateCaseModel: {},

      createApplicantFn:
        async () => ({
          status:
            'created',

          applicantId:
            SOURCE_ID,

          submissionId:
            SUBMISSION_ID,
        }),

      findDuplicateCandidatesFn:
        async () => [],

      syncFormDocumentsFn:
        async () => ({
          status:
            'synced',

          inserted:
            0,

          alreadyManaged:
            0,
        }),

      createDuplicateCaseFn:
        async () => {
          throw new Error(
            'Should not create duplicate case.'
          );
        },
    });

  assert.strictEqual(
    result.applicantStatus,
    'created'
  );

  assert.strictEqual(
    result.duplicateCandidates,
    0
  );

  assert.strictEqual(
    result.duplicateCasesCreated,
    0
  );

  console.log(
    '✅ New Applicant with no duplicates'
  );
}

async function testDuplicateCaseCreated() {
  const source = {
    _id: SOURCE_ID,

    identity: {
      fullName:
        'Applicant One',

      normalizedEmail:
        'example@example.com',
    },

    profiles: {},
  };

  const candidate = {
    _id: CANDIDATE_ID,

    identity: {
      fullName:
        'Applicant One',

      normalizedEmail:
        'example@example.com',
    },

    profiles: {},
  };

  const ApplicantModel =
    makeApplicantModel({
      [SOURCE_ID]:
        source,

      [CANDIDATE_ID]:
        candidate,
    });

  let caseCalls = 0;

  const result =
    await ensureApplicantIngestion({
      submissionId:
        SUBMISSION_ID,

      detectedBy:
        'test',

      ApplicantModel,

      SubmissionModel: {},

      DuplicateCaseModel: {},

      createApplicantFn:
        async () => ({
          status:
            'created',

          applicantId:
            SOURCE_ID,

          submissionId:
            SUBMISSION_ID,
        }),

      findDuplicateCandidatesFn:
        async () => [
          {
            applicantId:
              CANDIDATE_ID,

            confidence:
              'possible',

            strongMatchCount: 1,

            matchedSignals: [
              'email',
            ],
          },
        ],

      syncFormDocumentsFn:
        async () => ({
          status:
            'synced',

          inserted:
            0,

          alreadyManaged:
            0,
        }),

      createDuplicateCaseFn:
        async ({
          sourceApplicant,
          candidateApplicant,
        }) => {
          caseCalls++;

          assert.strictEqual(
            String(
              sourceApplicant._id
            ),
            SOURCE_ID
          );

          assert.strictEqual(
            String(
              candidateApplicant._id
            ),
            CANDIDATE_ID
          );

          return {
            created: true,

            duplicateCase: {
              status:
                'open',
            },
          };
        },
    });

  assert.strictEqual(
    caseCalls,
    1
  );

  assert.strictEqual(
    result.duplicateCandidates,
    1
  );

  assert.strictEqual(
    result.duplicateCasesCreated,
    1
  );

  assert.strictEqual(
    result.duplicateCasesReused,
    0
  );

  console.log(
    '✅ Duplicate candidate creates review case'
  );
}

async function testReplayReusesExistingCase() {
  const source = {
    _id: SOURCE_ID,
    identity: {},
    profiles: {},
  };

  const candidate = {
    _id: CANDIDATE_ID,
    identity: {},
    profiles: {},
  };

  const ApplicantModel =
    makeApplicantModel({
      [SOURCE_ID]:
        source,

      [CANDIDATE_ID]:
        candidate,
    });

  const result =
    await ensureApplicantIngestion({
      submissionId:
        SUBMISSION_ID,

      ApplicantModel,

      SubmissionModel: {},

      DuplicateCaseModel: {},

      createApplicantFn:
        async () => ({
          status:
            'already-created',

          applicantId:
            SOURCE_ID,

          submissionId:
            SUBMISSION_ID,
        }),

      findDuplicateCandidatesFn:
        async () => [
          {
            applicantId:
              CANDIDATE_ID,
          },
        ],

      syncFormDocumentsFn:
        async () => ({
          status:
            'synced',

          inserted:
            0,

          alreadyManaged:
            0,
        }),

      createDuplicateCaseFn:
        async () => ({
          created: false,

          duplicateCase: {
            status:
              'resolved',
          },
        }),
    });

  assert.strictEqual(
    result.applicantStatus,
    'already-created'
  );

  assert.strictEqual(
    result.duplicateCasesCreated,
    0
  );

  assert.strictEqual(
    result.duplicateCasesReused,
    1
  );

  console.log(
    '✅ Replay reuses existing DuplicateCase'
  );
}

async function run() {
  console.log(
    '================================'
  );

  console.log(
    ' APPLICANT INGESTION TEST'
  );

  console.log(
    '================================'
  );

  assert.strictEqual(
    mongoose.connection.readyState,
    0
  );

  await testNewApplicantNoDuplicates();

  await testDuplicateCaseCreated();

  await testReplayReusesExistingCase();

  assert.strictEqual(
    mongoose.connection.readyState,
    0
  );

  console.log('');
  console.log(
    '✅ No MongoDB connection'
  );

  console.log(
    '✅ No real Applicant created'
  );

  console.log(
    '✅ No real Submission modified'
  );

  console.log(
    '✅ No real DuplicateCase created'
  );

  console.log(
    '✅ No merge performed'
  );
}

run().catch((error) => {
  console.error(
    '❌ TEST FAILED:',
    error
  );

  process.exitCode = 1;
});
