'use strict';

const assert = require('assert');
const mongoose = require('mongoose');

const {
  buildApprovedProfileUpdate,
  approveProfileFieldsFromSubmission,
} = require(
  '../services/applicantProfileService'
);

const APPLICANT_ID =
  '507f1f77bcf86cd799439011';

const OTHER_APPLICANT_ID =
  '507f1f77bcf86cd799439012';

const SUBMISSION_ID =
  '507f1f77bcf86cd799439013';

function makeSubmission({
  applicantId =
    APPLICANT_ID,
} = {}) {
  return {
    _id:
      new mongoose.Types.ObjectId(
        SUBMISSION_ID
      ),

    applicantId:
      applicantId
        ? new mongoose.Types.ObjectId(
            applicantId
          )
        : null,

    personal: {
      fullName:
        'Updated Applicant',

      email:
        ' Updated.User@Example.COM ',

      phoneNumber:
        '+961 71 234 567',

      whatsappNumber:
        '+96171234567',

      country:
        'Lebanon',

      city:
        'Beirut',
    },

    education: {
      major:
        'Computer Science',

      languages: [
        'Arabic',
        'English',
      ],
    },

    preferences: {
      positionTrack:
        'Backend Development',

      workingDays: [
        'Monday',
        'Wednesday',
      ],
    },

    skills: {
      primaryTechnical: [
        'Node.js',
        'MongoDB',
      ],

      frameworks: [
        'Express',
      ],
    },

    profiles: {
      linkedin:
        'https://www.linkedin.com/in/Updated-Applicant/?trk=test',

      github:
        'https://github.com/updated',
    },
  };
}

/*
|--------------------------------------------------------------------------
| Selective Update
|--------------------------------------------------------------------------
*/

function testSelectiveUpdate() {
  const submission =
    makeSubmission();

  const update =
    buildApprovedProfileUpdate({
      submission,

      fields: [
        'identity.email',
        'identity.phoneNumber',
        'education.major',
        'skills.frameworks',
        'profiles.linkedin',
      ],
    });

  assert.strictEqual(
    update['identity.email'],
    ' Updated.User@Example.COM '
  );

  assert.strictEqual(
    update[
      'identity.normalizedEmail'
    ],
    'updated.user@example.com'
  );

  assert.strictEqual(
    update[
      'identity.normalizedPhone'
    ],
    '+96171234567'
  );

  assert.strictEqual(
    update[
      'profiles.linkedinCanonical'
    ],
    'linkedin.com/in/updated-applicant'
  );

  assert.deepStrictEqual(
    update['skills.frameworks'],
    ['Express']
  );

  assert.strictEqual(
    Object.prototype.hasOwnProperty.call(
      update,
      'identity.fullName'
    ),
    false
  );

  console.log(
    '✅ Only explicitly approved fields are copied'
  );

  console.log(
    '✅ Normalized identity fields stay synchronized'
  );
}

/*
|--------------------------------------------------------------------------
| Array Copy Safety
|--------------------------------------------------------------------------
*/

function testArrayClone() {
  const submission =
    makeSubmission();

  const update =
    buildApprovedProfileUpdate({
      submission,

      fields: [
        'skills.primaryTechnical',
      ],
    });

  update[
    'skills.primaryTechnical'
  ].push('Injected');

  assert.deepStrictEqual(
    submission.skills.primaryTechnical,
    ['Node.js', 'MongoDB']
  );

  console.log(
    '✅ Submission arrays remain immutable'
  );
}

/*
|--------------------------------------------------------------------------
| Protected Field
|--------------------------------------------------------------------------
*/

function testProtectedField() {
  const submission =
    makeSubmission();

  assert.throws(
    () =>
      buildApprovedProfileUpdate({
        submission,

        fields: [
          'recruitment.status',
        ],
      }),

    (error) =>
      error.code ===
      'PROFILE_FIELD_NOT_ALLOWED'
  );

  assert.throws(
    () =>
      buildApprovedProfileUpdate({
        submission,

        fields: [
          'profileVersion',
        ],
      }),

    (error) =>
      error.code ===
      'PROFILE_FIELD_NOT_ALLOWED'
  );

  console.log(
    '✅ Protected fields cannot be updated through profile approval'
  );
}

/*
|--------------------------------------------------------------------------
| Explicit Approval Required
|--------------------------------------------------------------------------
*/

function testExplicitFieldsRequired() {
  assert.throws(
    () =>
      buildApprovedProfileUpdate({
        submission:
          makeSubmission(),

        fields: [],
      }),

    (error) =>
      error.code ===
      'PROFILE_FIELDS_REQUIRED'
  );

  console.log(
    '✅ Silent full-profile overwrite is blocked'
  );
}

/*
|--------------------------------------------------------------------------
| Service Update
|--------------------------------------------------------------------------
*/

async function testProfileApproval() {
  let capturedUpdate = null;

  const submission =
    makeSubmission();

  const ApplicantModel = {
    updateOne: async (
      filter,
      update
    ) => {
      capturedUpdate = {
        filter,
        update,
      };

      return {
        matchedCount: 1,
        modifiedCount: 1,
      };
    },
  };

  const SubmissionModel = {
    findById: async () =>
      submission,
  };

  const result =
    await approveProfileFieldsFromSubmission({
      applicantId:
        APPLICANT_ID,

      submissionId:
        SUBMISSION_ID,

      fields: [
        'identity.email',
        'education.major',
      ],

      ApplicantModel,
      SubmissionModel,
    });

  assert.strictEqual(
    result.status,
    'profile-updated'
  );

  assert.strictEqual(
    capturedUpdate.update.$inc
      .profileVersion,
    1
  );

  assert.strictEqual(
    String(
      capturedUpdate.update.$set
        .latestApprovedSubmissionId
    ),
    SUBMISSION_ID
  );

  assert.strictEqual(
    capturedUpdate.update.$set[
      'education.major'
    ],
    'Computer Science'
  );

  assert.strictEqual(
    Object.prototype.hasOwnProperty.call(
      capturedUpdate.update.$set,
      'identity.fullName'
    ),
    false
  );

  console.log(
    '✅ Explicit profile approval updates selected fields'
  );

  console.log(
    '✅ profileVersion increments'
  );

  console.log(
    '✅ Approved submission source is recorded'
  );
}

/*
|--------------------------------------------------------------------------
| Wrong Applicant
|--------------------------------------------------------------------------
*/

async function testWrongApplicantRejected() {
  const ApplicantModel = {
    updateOne: async () => {
      throw new Error(
        'Should not be called'
      );
    },
  };

  const SubmissionModel = {
    findById: async () =>
      makeSubmission({
        applicantId:
          OTHER_APPLICANT_ID,
      }),
  };

  let error = null;

  try {
    await approveProfileFieldsFromSubmission({
      applicantId:
        APPLICANT_ID,

      submissionId:
        SUBMISSION_ID,

      fields: [
        'identity.email',
      ],

      ApplicantModel,
      SubmissionModel,
    });
  } catch (caught) {
    error = caught;
  }

  assert.ok(error);

  assert.strictEqual(
    error.code,
    'SUBMISSION_NOT_LINKED_TO_APPLICANT'
  );

  console.log(
    '✅ Another Applicant submission cannot update profile'
  );
}

/*
|--------------------------------------------------------------------------
| Archived Applicant
|--------------------------------------------------------------------------
*/

async function testArchivedApplicantBlocked() {
  const ApplicantModel = {
    updateOne: async () => ({
      matchedCount: 0,
      modifiedCount: 0,
    }),
  };

  const SubmissionModel = {
    findById: async () =>
      makeSubmission(),
  };

  let error = null;

  try {
    await approveProfileFieldsFromSubmission({
      applicantId:
        APPLICANT_ID,

      submissionId:
        SUBMISSION_ID,

      fields: [
        'identity.email',
      ],

      ApplicantModel,
      SubmissionModel,
    });
  } catch (caught) {
    error = caught;
  }

  assert.ok(error);

  assert.strictEqual(
    error.code,
    'APPLICANT_NOT_FOUND'
  );

  console.log(
    '✅ Archived Applicant profile cannot be updated'
  );
}

async function run() {
  console.log(
    '================================'
  );

  console.log(
    ' CURRENT PROFILE RULES TEST'
  );

  console.log(
    '================================'
  );

  assert.strictEqual(
    mongoose.connection.readyState,
    0
  );

  testSelectiveUpdate();
  testArrayClone();
  testProtectedField();
  testExplicitFieldsRequired();

  await testProfileApproval();
  await testWrongApplicantRejected();
  await testArchivedApplicantBlocked();

  assert.strictEqual(
    mongoose.connection.readyState,
    0
  );

  console.log('');

  console.log(
    '✅ No MongoDB connection used'
  );

  console.log(
    '✅ No real MongoDB writes performed'
  );

  console.log(
    '✅ Submission history remained unchanged'
  );

  console.log('');

  console.log(
    'TASK 5 TEST PASSED'
  );
}

run().catch((error) => {
  console.error(
    'TASK 5 TEST FAILED'
  );

  console.error(error);

  process.exit(1);
});
