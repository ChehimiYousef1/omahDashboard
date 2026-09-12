'use strict';

const assert = require('assert');
const mongoose = require('mongoose');

const {
  buildEvidenceSnapshot,
  buildDuplicateCaseData,
  createOrReuseDuplicateCase,
} = require(
  '../services/applicantDuplicateCaseService'
);

const applicantAId =
  new mongoose.Types.ObjectId();

const applicantBId =
  new mongoose.Types.ObjectId();

const APPLICANT_A = {
  _id: applicantAId,

  identity: {
    fullName:
      'Example Applicant',

    normalizedEmail:
      'example@test.com',

    normalizedPhone:
      '+96170123456',
  },

  profiles: {
    linkedinCanonical:
      'linkedin.com/in/example',
  },
};

const APPLICANT_B = {
  _id: applicantBId,

  identity: {
    fullName:
      'Example Applicant',

    normalizedEmail:
      'example@test.com',

    normalizedPhone:
      '+96170123456',
  },

  profiles: {
    linkedinCanonical:
      'linkedin.com/in/other',
  },
};

async function main() {
  console.log(
    '================================'
  );

  console.log(
    ' DUPLICATE CASE SERVICE TEST'
  );

  console.log(
    '================================'
  );

  assert.strictEqual(
    mongoose.connection.readyState,
    0
  );

  /*
   * Evidence.
   */

  const evidence =
    buildEvidenceSnapshot(
      APPLICANT_A
    );

  assert.strictEqual(
    evidence.normalizedEmail,
    'example@test.com'
  );

  assert.strictEqual(
    evidence.normalizedPhone,
    '+96170123456'
  );

  console.log(
    '✅ Evidence snapshot created'
  );

  /*
   * Case payload.
   */

  const data =
    buildDuplicateCaseData({
      sourceApplicant:
        APPLICANT_A,

      candidateApplicant:
        APPLICANT_B,

      detectedBy:
        'admin-test',
    });

  assert.strictEqual(
    data.confidence,
    'high'
  );

  assert.strictEqual(
    data.strongMatchCount,
    2
  );

  assert.deepStrictEqual(
    data.matchedSignals,
    [
      'email',
      'phone',
    ]
  );

  assert.strictEqual(
    data.status,
    'open'
  );

  console.log(
    '✅ Duplicate case payload generated'
  );

  /*
   * First detection creates case.
   */

  let existing = null;
  let createCount = 0;

  const MockDuplicateCaseModel = {
    findOne() {
      return {
        async lean() {
          return existing;
        },
      };
    },

    async create(payload) {
      createCount++;

      existing = {
        _id:
          'duplicate-case-1',

        ...payload,

        resolution: {
          decision:
            'pending',
        },
      };

      return {
        toObject() {
          return existing;
        },
      };
    },
  };

  const first =
    await createOrReuseDuplicateCase({
      sourceApplicant:
        APPLICANT_A,

      candidateApplicant:
        APPLICANT_B,

      DuplicateCaseModel:
        MockDuplicateCaseModel,
    });

  assert.strictEqual(
    first.created,
    true
  );

  assert.strictEqual(
    createCount,
    1
  );

  console.log(
    '✅ First detection creates review case'
  );

  /*
   * Second detection reuses it.
   */

  const second =
    await createOrReuseDuplicateCase({
      sourceApplicant:
        APPLICANT_B,

      candidateApplicant:
        APPLICANT_A,

      DuplicateCaseModel:
        MockDuplicateCaseModel,
    });

  assert.strictEqual(
    second.created,
    false
  );

  assert.strictEqual(
    createCount,
    1
  );

  assert.strictEqual(
    second.duplicateCase._id,
    'duplicate-case-1'
  );

  console.log(
    '✅ Reverse Applicant pair reuses same case'
  );

  /*
   * Resolved case must not reopen.
   */

  existing = {
    ...existing,

    status:
      'resolved',

    resolution: {
      decision:
        'not_duplicate',

      resolvedBy:
        'admin-test',
    },
  };

  const resolved =
    await createOrReuseDuplicateCase({
      sourceApplicant:
        APPLICANT_A,

      candidateApplicant:
        APPLICANT_B,

      DuplicateCaseModel:
        MockDuplicateCaseModel,
    });

  assert.strictEqual(
    resolved.created,
    false
  );

  assert.strictEqual(
    resolved
      .duplicateCase
      .resolution
      .decision,
    'not_duplicate'
  );

  assert.strictEqual(
    createCount,
    1
  );

  console.log(
    '✅ Resolved case is never automatically reopened'
  );

  /*
   * Non-duplicate must fail.
   */

  const differentApplicant = {
    _id:
      new mongoose.Types.ObjectId(),

    identity: {
      fullName:
        'Another Person',

      normalizedEmail:
        'different@test.com',

      normalizedPhone:
        '+96199999999',
    },

    profiles: {
      linkedinCanonical:
        'linkedin.com/in/different',
    },
  };

  assert.throws(
    () =>
      buildDuplicateCaseData({
        sourceApplicant:
          APPLICANT_A,

        candidateApplicant:
          differentApplicant,
      }),

    /strong duplicate signal/i
  );

  console.log(
    '✅ Non-duplicate case rejected'
  );

  /*
   * MongoDB must remain disconnected.
   */

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

  console.log(
    '✅ No automatic merge performed'
  );

  console.log(
    '✅ No Applicant deleted'
  );

  console.log('');
  console.log(
    'TASK 5.3 SERVICE TEST PASSED'
  );
}

main().catch((error) => {
  console.error(
    'TASK 5.3 SERVICE TEST FAILED'
  );

  console.error(error);

  process.exitCode = 1;
});
