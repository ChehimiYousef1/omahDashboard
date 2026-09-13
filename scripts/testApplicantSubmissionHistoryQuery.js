'use strict';

const assert =
  require('assert');

const mongoose =
  require('mongoose');

const {
  getApplicantSubmissionHistory,
} = require(
  '../services/applicantSubmissionHistoryService'
);


const APPLICANT_ID =
  '507f1f77bcf86cd799439011';

const CURRENT_SUBMISSION_ID =
  '507f1f77bcf86cd799439013';

const OLD_SUBMISSION_ID =
  '507f1f77bcf86cd799439014';


function applicantFixture() {
  return {
    _id:
      APPLICANT_ID,

    latestApprovedSubmissionId:
      CURRENT_SUBMISSION_ID,

    identity: {
      fullName:
        'Applicant Example',

      email:
        'person@example.com',

      phoneNumber:
        '+96170000000',

      whatsappNumber:
        '+96170000000',

      country:
        'Lebanon',

      city:
        'Beirut',
    },

    education: {},

    preferences: {
      positionTrack:
        'Full Stack',
    },

    skills: {},

    profiles: {},
  };
}


function submissionFixture({
  id,
  submittedAt,
  city,
}) {
  return {
    _id:
      id,

    submissionKey:
      `key-${id}`,

    source:
      'google-form',

    formVersion:
      2,

    submittedAt,

    personal: {
      fullName:
        'Applicant Example',

      email:
        'person@example.com',

      phoneNumber:
        '+96170000000',

      whatsappNumber:
        '+96170000000',

      country:
        'Lebanon',

      city,
    },

    education: {},

    preferences: {
      positionTrack:
        'Full Stack',
    },

    skills: {},

    profiles: {},

    documents: {},

    rawResponse: {},
  };
}


async function run() {
  console.log(
    '================================'
  );

  console.log(
    ' SUBMISSION HISTORY QUERY TEST'
  );

  console.log(
    '================================'
  );

  let applicantReadCount = 0;
  let submissionReadCount = 0;

  const ApplicantModel = {
    findById: (id) => {
      applicantReadCount += 1;

      assert.strictEqual(
        String(id),
        APPLICANT_ID
      );

      return {
        lean: async () =>
          applicantFixture(),
      };
    },
  };

  const getSubmissions =
    async ({ applicantId }) => {
      submissionReadCount += 1;

      assert.strictEqual(
        String(applicantId),
        APPLICANT_ID
      );

      return [
        submissionFixture({
          id:
            CURRENT_SUBMISSION_ID,

          submittedAt:
            new Date(
              '2026-09-12T10:00:00Z'
            ),

          city:
            'Beirut',
        }),

        submissionFixture({
          id:
            OLD_SUBMISSION_ID,

          submittedAt:
            new Date(
              '2026-08-01T10:00:00Z'
            ),

          city:
            'Sidon',
        }),
      ];
    };

  const result =
    await getApplicantSubmissionHistory({
      applicantId:
        APPLICANT_ID,

      ApplicantModel,

      getSubmissions,
    });

  assert.strictEqual(
    applicantReadCount,
    1
  );

  assert.strictEqual(
    submissionReadCount,
    1
  );

  assert.strictEqual(
    result.totalSubmissions,
    2
  );

  assert.strictEqual(
    result.summary.total,
    2
  );

  assert.strictEqual(
    result.summary.initial,
    1
  );

  assert.strictEqual(
    result.history.length,
    2
  );

  assert.strictEqual(
    result.history[0]
      .comparison
      .isLatestApprovedSource,
    true
  );

  assert.strictEqual(
    result.history[1]
      .comparison
      .status,
    'initial'
  );

  assert.strictEqual(
    mongoose.connection
      .readyState,
    0
  );

  console.log(
    '✅ Applicant loaded read-only'
  );

  console.log(
    '✅ Submission history loaded read-only'
  );

  console.log(
    '✅ History summary generated'
  );

  console.log(
    '✅ Latest approved source identified'
  );

  console.log(
    '✅ Initial submission identified'
  );

  console.log('');
  console.log(
    '✅ No MongoDB connection used'
  );

  console.log(
    '✅ No MongoDB writes performed'
  );

  console.log(
    '✅ No Applicant modified'
  );

  console.log(
    '✅ No Submission modified'
  );

  console.log('');
  console.log(
    'TASK 6.3 QUERY TEST PASSED'
  );
}


run().catch(
  (error) => {
    console.error(
      '❌ TASK 6.3 QUERY TEST FAILED'
    );

    console.error(error);

    process.exit(1);
  }
);
