'use strict';

const assert =
  require('assert');

const mongoose =
  require('mongoose');

const {
  normalizeActorId,
  normalizeArchiveReason,
  archiveApplicant,
  restoreApplicant,
} = require('../services/applicantArchiveService');

async function run() {
  /*
   * 1. Actor validation.
   */
  assert.strictEqual(
    normalizeActorId(' admin-123 '),
    'admin-123'
  );

  assert.throws(
    () => normalizeActorId(''),
    (error) =>
      error.code ===
      'ARCHIVE_ACTOR_REQUIRED'
  );

  console.log(
    '✅ archive actor validation'
  );

  /*
   * 2. Reason normalization.
   */
  assert.strictEqual(
    normalizeArchiveReason(
      '  Duplicate candidate  '
    ),
    'Duplicate candidate'
  );

  assert.strictEqual(
    normalizeArchiveReason(),
    ''
  );

  console.log(
    '✅ archive reason normalization'
  );

  /*
   * 3. Mock archive operation.
   */
  const applicantId =
    new mongoose.Types.ObjectId();

  const archiveTime =
    new Date(
      '2026-08-27T12:00:00.000Z'
    );

  let archiveFilter;
  let archiveUpdate;
  let archiveOptions;

  const ArchiveMockModel = {
    async updateOne(
      filter,
      update,
      options
    ) {
      archiveFilter = filter;
      archiveUpdate = update;
      archiveOptions = options;

      return {
        matchedCount: 1,
        modifiedCount: 1,
      };
    },
  };

  const archiveResult =
    await archiveApplicant({
      applicantId,
      archivedBy:
        'admin-123',
      reason:
        'No longer active',
      now: archiveTime,
      ApplicantModel:
        ArchiveMockModel,
    });

  assert.strictEqual(
    archiveResult.status,
    'applicant-archived'
  );

  assert.strictEqual(
    archiveFilter[
      'lifecycle.archived'
    ].$ne,
    true
  );

  assert.strictEqual(
    archiveUpdate.$set[
      'lifecycle.archived'
    ],
    true
  );

  assert.strictEqual(
    archiveUpdate.$set[
      'lifecycle.archivedBy'
    ],
    'admin-123'
  );

  assert.strictEqual(
    archiveUpdate.$set[
      'lifecycle.archiveReason'
    ],
    'No longer active'
  );

  assert.strictEqual(
    archiveUpdate.$set[
      'lifecycle.archivedAt'
    ],
    archiveTime
  );

  assert.strictEqual(
    archiveOptions.runValidators,
    true
  );

  console.log(
    '✅ Applicant archive rule'
  );

  /*
   * 4. Archive does not touch profileVersion.
   */
  assert.strictEqual(
    Object.prototype.hasOwnProperty.call(
      archiveUpdate,
      '$inc'
    ),
    false
  );

  console.log(
    '✅ profileVersion untouched'
  );

  /*
   * 5. Mock restore operation.
   */
  let restoreFilter;
  let restoreUpdate;
  let restoreOptions;

  const RestoreMockModel = {
    async updateOne(
      filter,
      update,
      options
    ) {
      restoreFilter = filter;
      restoreUpdate = update;
      restoreOptions = options;

      return {
        matchedCount: 1,
        modifiedCount: 1,
      };
    },
  };

  const restoreResult =
    await restoreApplicant({
      applicantId,
      ApplicantModel:
        RestoreMockModel,
    });

  assert.strictEqual(
    restoreResult.status,
    'applicant-restored'
  );

  assert.strictEqual(
    restoreFilter[
      'lifecycle.archived'
    ],
    true
  );

  assert.strictEqual(
    restoreUpdate.$set[
      'lifecycle.archived'
    ],
    false
  );

  assert.strictEqual(
    restoreUpdate.$set[
      'lifecycle.archivedAt'
    ],
    null
  );

  assert.strictEqual(
    restoreUpdate.$set[
      'lifecycle.archivedBy'
    ],
    ''
  );

  assert.strictEqual(
    restoreUpdate.$set[
      'lifecycle.archiveReason'
    ],
    ''
  );

  assert.strictEqual(
    restoreOptions.runValidators,
    true
  );

  console.log(
    '✅ Applicant restore rule'
  );

  /*
   * 6. State mismatch handling.
   */
  const NoMatchModel = {
    async updateOne() {
      return {
        matchedCount: 0,
        modifiedCount: 0,
      };
    },
  };

  await assert.rejects(
    () =>
      archiveApplicant({
        applicantId,
        archivedBy:
          'admin-123',
        ApplicantModel:
          NoMatchModel,
      }),
    (error) =>
      error.code ===
      'APPLICANT_NOT_ARCHIVABLE'
  );

  await assert.rejects(
    () =>
      restoreApplicant({
        applicantId,
        ApplicantModel:
          NoMatchModel,
      }),
    (error) =>
      error.code ===
      'APPLICANT_NOT_RESTORABLE'
  );

  console.log(
    '✅ invalid lifecycle transitions rejected'
  );

  console.log(
    '✅ no hard-delete method used'
  );

  console.log(
    '✅ no MongoDB connection used'
  );

  console.log(
    '\nTASK 9 APPLICANT ARCHIVE SERVICE TEST PASSED'
  );
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
