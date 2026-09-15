'use strict';

const assert = require('assert');
const mongoose = require('mongoose');

const {
  linkSubmissionToApplicant,
  approveSubmissionReference,
  toObjectId,
} = require('../services/applicantSubmissionService');

const APPLICANT_A =
  '507f1f77bcf86cd799439011';

const APPLICANT_B =
  '507f1f77bcf86cd799439012';

const SUBMISSION =
  '507f1f77bcf86cd799439013';

function fakeFindById(document) {
  return function findById() {
    return {
      select: async () => document,
    };
  };
}

async function testNewLink() {
  let receivedUpdate = null;

  const ApplicantModel = {
    exists: async () => ({ _id: APPLICANT_A }),
  };

  const SubmissionModel = {
    findById: fakeFindById({
      _id: SUBMISSION,
      applicantId: null,
    }),

    updateOne: async (filter, update) => {
      receivedUpdate = {
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
    await linkSubmissionToApplicant({
      syncFormDocumentsFn:
        async () => ({
          status:
            'synced',

          inserted:
            0,

          alreadyManaged:
            0,
        }),

      applicantId: APPLICANT_A,
      submissionId: SUBMISSION,
      ApplicantModel,
      SubmissionModel,
    });

  assert.strictEqual(
    result.status,
    'linked'
  );

  assert.ok(receivedUpdate);

  assert.deepStrictEqual(
    Object.keys(receivedUpdate.update.$set),
    ['applicantId']
  );

  console.log(
    '✅ Unlinked submission can be linked'
  );

  console.log(
    '✅ Linking changes relationship metadata only'
  );
}

async function testSameApplicantLink() {
  let updateCalled = false;

  const ApplicantModel = {
    exists: async () => ({ _id: APPLICANT_A }),
  };

  const SubmissionModel = {
    findById: fakeFindById({
      _id: SUBMISSION,
      applicantId:
        new mongoose.Types.ObjectId(
          APPLICANT_A
        ),
    }),

    updateOne: async () => {
      updateCalled = true;

      return {
        modifiedCount: 1,
      };
    },
  };

  const result =
    await linkSubmissionToApplicant({
      syncFormDocumentsFn:
        async () => ({
          status:
            'synced',

          inserted:
            0,

          alreadyManaged:
            0,
        }),

      applicantId: APPLICANT_A,
      submissionId: SUBMISSION,
      ApplicantModel,
      SubmissionModel,
    });

  assert.strictEqual(
    result.status,
    'already-linked'
  );

  assert.strictEqual(
    updateCalled,
    false
  );

  console.log(
    '✅ Re-linking to same applicant is idempotent'
  );
}

async function testDifferentApplicantRejected() {
  const ApplicantModel = {
    exists: async () => ({ _id: APPLICANT_B }),
  };

  const SubmissionModel = {
    findById: fakeFindById({
      _id: SUBMISSION,
      applicantId:
        new mongoose.Types.ObjectId(
          APPLICANT_A
        ),
    }),
  };

  let error = null;

  try {
    await linkSubmissionToApplicant({
      syncFormDocumentsFn:
        async () => ({
          status:
            'synced',

          inserted:
            0,

          alreadyManaged:
            0,
        }),

      applicantId: APPLICANT_B,
      submissionId: SUBMISSION,
      ApplicantModel,
      SubmissionModel,
    });
  } catch (caught) {
    error = caught;
  }

  assert.ok(error);

  assert.strictEqual(
    error.code,
    'SUBMISSION_ALREADY_LINKED'
  );

  console.log(
    '✅ Silent submission reassignment is blocked'
  );
}

async function testApproval() {
  let applicantUpdate = null;

  const ApplicantModel = {
    updateOne: async (filter, update) => {
      applicantUpdate = {
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
    findById: fakeFindById({
      _id: SUBMISSION,
      applicantId:
        new mongoose.Types.ObjectId(
          APPLICANT_A
        ),
    }),
  };

  const result =
    await approveSubmissionReference({
      applicantId: APPLICANT_A,
      submissionId: SUBMISSION,
      ApplicantModel,
      SubmissionModel,
    });

  assert.strictEqual(
    result.status,
    'approved-reference'
  );

  assert.deepStrictEqual(
    Object.keys(
      applicantUpdate.update.$set
    ),
    ['latestApprovedSubmissionId']
  );

  console.log(
    '✅ Approved submission reference can be updated explicitly'
  );

  console.log(
    '✅ Approval does not overwrite Applicant profile fields'
  );
}

async function testWrongApprovalRejected() {
  const ApplicantModel = {};

  const SubmissionModel = {
    findById: fakeFindById({
      _id: SUBMISSION,
      applicantId:
        new mongoose.Types.ObjectId(
          APPLICANT_B
        ),
    }),
  };

  let error = null;

  try {
    await approveSubmissionReference({
      applicantId: APPLICANT_A,
      submissionId: SUBMISSION,
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
    '✅ Unrelated submission cannot be approved'
  );
}

function testObjectIds() {
  const result =
    toObjectId(
      APPLICANT_A,
      'applicantId'
    );

  assert.ok(
    result instanceof
      mongoose.Types.ObjectId
  );

  assert.throws(
    () =>
      toObjectId(
        'invalid-id',
        'applicantId'
      ),
    (error) =>
      error.code ===
      'INVALID_OBJECT_ID'
  );

  console.log(
    '✅ ObjectId validation'
  );
}

async function run() {
  console.log(
    '================================'
  );

  console.log(
    ' APPLICANT / SUBMISSION TEST'
  );

  console.log(
    '================================'
  );

  assert.strictEqual(
    mongoose.connection.readyState,
    0
  );

  await testNewLink();
  await testSameApplicantLink();
  await testDifferentApplicantRejected();
  await testApproval();
  await testWrongApprovalRejected();

  testObjectIds();

  assert.strictEqual(
    mongoose.connection.readyState,
    0
  );

  console.log('');
  console.log(
    '✅ No MongoDB connection used'
  );

  console.log(
    '✅ No MongoDB writes performed'
  );

  console.log('');
  console.log(
    '🎉 TASK 2 TEST PASSED'
  );
}

run().catch((error) => {
  console.error(
    '❌ TASK 2 TEST FAILED'
  );

  console.error(error);

  process.exit(1);
});
