'use strict';

const assert = require('assert');
const mongoose = require('mongoose');

const {
  buildApplicantFromSubmission,
  createApplicantFromSubmission,
} = require(
  '../services/applicantCreationService'
);

const APPLICANT_ID =
  '507f1f77bcf86cd799439011';

const SUBMISSION_ID =
  '507f1f77bcf86cd799439013';

function makeSubmission({
  applicantId = null,
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

    source: 'google-form',

    submittedAt:
      new Date(
        '2026-08-27T09:00:00Z'
      ),

    personal: {
      fullName: 'Test Applicant',

      email:
        ' Test.User@Example.COM ',

      phoneNumber:
        '+961 70 123 456',

      whatsappNumber:
        '+96170123456',

      country: 'Lebanon',

      city: 'Beirut',
    },

    education: {
      universityName:
        'Test University',

      institutionCountry:
        'Lebanon',

      degreeLevel: 'Bachelor',

      major:
        'Computer Science',

      specialization:
        'Software Engineering',

      languages: [
        'Arabic',
        'English',
      ],
    },

    preferences: {
      positionTrack:
        'Software Engineering',

      positionType:
        'Internship',

      duration: '3 months',

      workingDays: [
        'Monday',
        'Tuesday',
      ],

      objectives: [
        'Professional Experience',
      ],
    },

    skills: {
      primaryTechnical: [
        'JavaScript',
        'Node.js',
      ],

      programmingLanguages: [
        'JavaScript',
      ],

      frameworks: [
        'React',
      ],

      databases: [
        'MongoDB',
      ],
    },

    profiles: {
      linkedin:
        'https://www.linkedin.com/in/Test-Applicant/?trk=test',

      github:
        'https://github.com/test-applicant',
    },

    recruitment: {
      status: 'applied',
    },
  };
}

function testMapping() {
  const submission =
    makeSubmission();

  const applicant =
    buildApplicantFromSubmission(
      submission
    );

  assert.strictEqual(
    applicant.identity.fullName,
    'Test Applicant'
  );

  assert.strictEqual(
    applicant.identity.normalizedEmail,
    'test.user@example.com'
  );

  assert.strictEqual(
    applicant.identity.normalizedPhone,
    '+96170123456'
  );

  assert.strictEqual(
    applicant.profiles.linkedinCanonical,
    'linkedin.com/in/test-applicant'
  );

  assert.strictEqual(
    applicant.education.major,
    'Computer Science'
  );

  assert.strictEqual(
    applicant.preferences.positionTrack,
    'Software Engineering'
  );

  assert.deepStrictEqual(
    applicant.skills.frameworks,
    ['React']
  );

  assert.strictEqual(
    String(
      applicant.latestApprovedSubmissionId
    ),
    SUBMISSION_ID
  );

  assert.strictEqual(
    applicant.profileVersion,
    1
  );

  assert.strictEqual(
    applicant.lifecycle.archived,
    false
  );

  console.log(
    '✅ Submission maps to Applicant profile'
  );

  console.log(
    '✅ Identity normalization preserved'
  );

  console.log(
    '✅ Initial approved submission reference set'
  );
}

async function testCreation() {
  let capturedApplicant = null;
  let capturedLink = null;

  const submission =
    makeSubmission();

  const ApplicantModel = {
    create: async (documents) => {
      capturedApplicant =
        documents[0];

      return [
        {
          _id:
            new mongoose.Types.ObjectId(
              APPLICANT_ID
            ),
        },
      ];
    },

    deleteOne: async () => ({
      deletedCount: 1,
    }),
  };

  const SubmissionModel = {
    findById: async () =>
      submission,

    updateOne: async (
      filter,
      update
    ) => {
      capturedLink = {
        filter,
        update,
      };

      return {
        matchedCount: 1,
        modifiedCount: 1,
      };
    },
  };

  const result =
    await createApplicantFromSubmission({
      submissionId:
        SUBMISSION_ID,

      ApplicantModel,
      SubmissionModel,
    });

  assert.strictEqual(
    result.status,
    'created'
  );

  assert.ok(
    capturedApplicant
  );

  assert.ok(
    capturedLink
  );

  assert.deepStrictEqual(
    Object.keys(
      capturedLink.update.$set
    ),
    ['applicantId']
  );

  assert.strictEqual(
    capturedApplicant.identity.fullName,
    'Test Applicant'
  );

  console.log(
    '✅ Applicant can be created from submission'
  );

  console.log(
    '✅ Submission answers are not overwritten'
  );

  console.log(
    '✅ Only applicantId relationship is written'
  );
}

async function testIdempotency() {
  let createCalled = false;

  const submission =
    makeSubmission({
      applicantId:
        APPLICANT_ID,
    });

  const ApplicantModel = {
    exists: async () => ({
      _id: APPLICANT_ID,
    }),

    create: async () => {
      createCalled = true;
      return [];
    },
  };

  const SubmissionModel = {
    findById: async () =>
      submission,
  };

  const result =
    await createApplicantFromSubmission({
      submissionId:
        SUBMISSION_ID,

      ApplicantModel,
      SubmissionModel,
    });

  assert.strictEqual(
    result.status,
    'already-created'
  );

  assert.strictEqual(
    createCalled,
    false
  );

  console.log(
    '✅ Same submission cannot create duplicate Applicant'
  );
}

async function testArchivedApplicantBlocked() {
  let createCalled = false;

  const submission =
    makeSubmission({
      applicantId:
        APPLICANT_ID,
    });

  const ApplicantModel = {
    exists: async () => null,

    create: async () => {
      createCalled = true;
      return [];
    },
  };

  const SubmissionModel = {
    findById: async () =>
      submission,
  };

  let error = null;

  try {
    await createApplicantFromSubmission({
      submissionId:
        SUBMISSION_ID,

      ApplicantModel,
      SubmissionModel,
    });
  } catch (caught) {
    error = caught;
  }

  assert.ok(error);

  assert.strictEqual(
    error.code,
    'LINKED_APPLICANT_UNAVAILABLE'
  );

  assert.strictEqual(
    createCalled,
    false
  );

  console.log(
    '✅ Archived/missing linked Applicant is not silently reused'
  );
}

async function testCreationConflictRollback() {
  let rollbackCalled = false;

  const submission =
    makeSubmission();

  const ApplicantModel = {
    create: async () => [
      {
        _id:
          new mongoose.Types.ObjectId(
            APPLICANT_ID
          ),
      },
    ],

    deleteOne: async () => {
      rollbackCalled = true;

      return {
        deletedCount: 1,
      };
    },
  };

  const SubmissionModel = {
    findById: async () =>
      submission,

    updateOne: async () => ({
      matchedCount: 0,
      modifiedCount: 0,
    }),
  };

  let error = null;

  try {
    await createApplicantFromSubmission({
      submissionId:
        SUBMISSION_ID,

      ApplicantModel,
      SubmissionModel,
    });
  } catch (caught) {
    error = caught;
  }

  assert.ok(error);

  assert.strictEqual(
    error.code,
    'CREATION_CONFLICT'
  );

  assert.strictEqual(
    rollbackCalled,
    true
  );

  console.log(
    '✅ Creation conflict triggers rollback'
  );

  console.log(
    '✅ Orphan Applicant protection works'
  );
}

async function run() {
  console.log(
    '================================'
  );

  console.log(
    ' APPLICANT CREATION TEST'
  );

  console.log(
    '================================'
  );

  assert.strictEqual(
    mongoose.connection.readyState,
    0
  );

  testMapping();

  await testCreation();

  await testIdempotency();

  await testArchivedApplicantBlocked();

  await testCreationConflictRollback();

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

  console.log('');

  console.log(
    'TASK 3 TEST PASSED'
  );
}

run().catch((error) => {
  console.error(
    'TASK 3 TEST FAILED'
  );

  console.error(error);

  process.exit(1);
});
