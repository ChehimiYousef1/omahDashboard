'use strict';

const assert =
  require('assert');

const mongoose =
  require('mongoose');

const {
  changeApplicantStatus,
} = require('../services/applicantStatusService');

async function run() {
  const applicantId =
    new mongoose.Types.ObjectId();

  const activityTime =
    new Date(
      '2026-08-27T14:00:00.000Z'
    );

  /*
   * 1. Valid transition.
   */
  let capturedFilter;
  let capturedUpdate;
  let capturedOptions;

  const ValidTransitionModel = {
    async findOne() {
      return {
        recruitment: {
          status: 'interview',
        },

        lifecycle: {
          archived: false,
        },
      };
    },

    async updateOne(
      filter,
      update,
      options
    ) {
      capturedFilter = filter;
      capturedUpdate = update;
      capturedOptions = options;

      return {
        matchedCount: 1,
        modifiedCount: 1,
      };
    },
  };

  const changed =
    await changeApplicantStatus({
      applicantId,
      nextStatus: 'OFFERED',
      now: activityTime,
      ApplicantModel:
        ValidTransitionModel,
    });

  assert.strictEqual(
    changed.status,
    'status-changed'
  );

  assert.strictEqual(
    changed.previousStatus,
    'interview'
  );

  assert.strictEqual(
    changed.currentStatus,
    'offered'
  );

  assert.strictEqual(
    capturedFilter[
      'recruitment.status'
    ],
    'interview'
  );

  assert.strictEqual(
    capturedUpdate.$set[
      'recruitment.status'
    ],
    'offered'
  );

  assert.strictEqual(
    capturedUpdate.$set[
      'recruitment.lastActivityAt'
    ],
    activityTime
  );

  assert.strictEqual(
    capturedOptions.runValidators,
    true
  );

  console.log(
    '✅ valid status transition'
  );

  /*
   * 2. Invalid transition.
   */
  const InvalidTransitionModel = {
    async findOne() {
      return {
        recruitment: {
          status: 'applied',
        },
      };
    },

    async updateOne() {
      throw new Error(
        'updateOne must not run'
      );
    },
  };

  await assert.rejects(
    () =>
      changeApplicantStatus({
        applicantId,
        nextStatus: 'hired',
        ApplicantModel:
          InvalidTransitionModel,
      }),
    (error) =>
      error.code ===
      'STATUS_TRANSITION_NOT_ALLOWED'
  );

  console.log(
    '✅ invalid transition rejected'
  );

  /*
   * 3. Unknown status.
   */
  await assert.rejects(
    () =>
      changeApplicantStatus({
        applicantId,
        nextStatus:
          'random-status',
        ApplicantModel:
          InvalidTransitionModel,
      }),
    (error) =>
      error.code ===
      'INVALID_APPLICANT_STATUS'
  );

  console.log(
    '✅ invalid status rejected'
  );

  /*
   * 4. Same status = no-op.
   */
  let sameStatusWriteCalled =
    false;

  const SameStatusModel = {
    async findOne() {
      return {
        recruitment: {
          status: 'reviewed',
        },
      };
    },

    async updateOne() {
      sameStatusWriteCalled =
        true;

      return {
        matchedCount: 1,
      };
    },
  };

  const unchanged =
    await changeApplicantStatus({
      applicantId,
      nextStatus: 'reviewed',
      ApplicantModel:
        SameStatusModel,
    });

  assert.strictEqual(
    unchanged.status,
    'status-unchanged'
  );

  assert.strictEqual(
    sameStatusWriteCalled,
    false
  );

  console.log(
    '✅ same status is idempotent'
  );

  /*
   * 5. Archived/missing Applicant.
   */
  const MissingModel = {
    async findOne() {
      return null;
    },
  };

  await assert.rejects(
    () =>
      changeApplicantStatus({
        applicantId,
        nextStatus:
          'reviewed',
        ApplicantModel:
          MissingModel,
      }),
    (error) =>
      error.code ===
      'APPLICANT_NOT_FOUND'
  );

  console.log(
    '✅ archived/missing Applicant rejected'
  );

  /*
   * 6. Concurrent status protection.
   */
  const ConflictModel = {
    async findOne() {
      return {
        recruitment: {
          status: 'reviewed',
        },
      };
    },

    async updateOne() {
      return {
        matchedCount: 0,
        modifiedCount: 0,
      };
    },
  };

  await assert.rejects(
    () =>
      changeApplicantStatus({
        applicantId,
        nextStatus:
          'shortlisted',
        ApplicantModel:
          ConflictModel,
      }),
    (error) =>
      error.code ===
      'STATUS_TRANSITION_CONFLICT'
  );

  console.log(
    '✅ concurrent transition protected'
  );

  console.log(
    '✅ no MongoDB connection used'
  );

  console.log(
    '\nTASK 10 APPLICANT STATUS SERVICE TEST PASSED'
  );
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
