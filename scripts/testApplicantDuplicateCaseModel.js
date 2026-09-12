'use strict';

const assert = require('assert');
const mongoose = require('mongoose');

const {
  ApplicantDuplicateCase,
  applicantDuplicateCaseSchema,
  buildPairKey,
  DUPLICATE_CASE_STATUSES,
  DUPLICATE_CASE_DECISIONS,
} = require(
  '../models/ApplicantDuplicateCase'
);

async function main() {
  console.log(
    '================================'
  );

  console.log(
    ' APPLICANT DUPLICATE CASE TEST'
  );

  console.log(
    '================================'
  );

  assert.strictEqual(
    mongoose.connection.readyState,
    0
  );

  const applicantA =
    new mongoose.Types.ObjectId();

  const applicantB =
    new mongoose.Types.ObjectId();

  /*
   * Pair-key canonicalization.
   */

  const pairAB =
    buildPairKey(
      applicantA,
      applicantB
    );

  const pairBA =
    buildPairKey(
      applicantB,
      applicantA
    );

  assert.strictEqual(
    pairAB,
    pairBA
  );

  console.log(
    '✅ Applicant pair key is canonical'
  );

  /*
   * Valid duplicate case.
   */

  const duplicateCase =
    new ApplicantDuplicateCase({
      sourceApplicantId:
        applicantA,

      candidateApplicantId:
        applicantB,

      confidence: 'high',

      matchedSignals: [
        'email',
        'phone',
        'email',
      ],

      nameMatches: true,

      sourceEvidence: {
        fullName:
          'Example Applicant',

        normalizedEmail:
          'example@test.com',

        normalizedPhone:
          '+96170123456',

        linkedinCanonical:
          'linkedin.com/in/example',
      },

      candidateEvidence: {
        fullName:
          'Example Applicant',

        normalizedEmail:
          'example@test.com',

        normalizedPhone:
          '+96170123456',
      },
    });

  await duplicateCase.validate();

  assert.strictEqual(
    duplicateCase.pairKey,
    pairAB
  );

  assert.deepStrictEqual(
    duplicateCase.matchedSignals,
    [
      'email',
      'phone',
    ]
  );

  assert.strictEqual(
    duplicateCase.strongMatchCount,
    2
  );

  assert.strictEqual(
    duplicateCase.status,
    'open'
  );

  assert.strictEqual(
    duplicateCase.resolution.decision,
    'pending'
  );

  console.log(
    '✅ Valid duplicate case passes validation'
  );

  console.log(
    '✅ Duplicate signals are de-duplicated'
  );

  console.log(
    '✅ Strong-match count calculated safely'
  );

  /*
   * Same Applicant must fail.
   */

  const selfCase =
    new ApplicantDuplicateCase({
      sourceApplicantId:
        applicantA,

      candidateApplicantId:
        applicantA,

      confidence:
        'possible',

      matchedSignals: [
        'email',
      ],
    });

  await assert.rejects(
    () => selfCase.validate(),
    /cannot be compared with itself/i
  );

  console.log(
    '✅ Self-duplicate case rejected'
  );

  /*
   * No strong evidence must fail.
   */

  const noEvidenceCase =
    new ApplicantDuplicateCase({
      sourceApplicantId:
        applicantA,

      candidateApplicantId:
        applicantB,

      confidence:
        'possible',

      matchedSignals: [],
    });

  await assert.rejects(
    () =>
      noEvidenceCase.validate(),
    /strong duplicate signal/i
  );

  console.log(
    '✅ Case without strong evidence rejected'
  );

  /*
   * Enums.
   */

  assert.deepStrictEqual(
    DUPLICATE_CASE_STATUSES,
    [
      'open',
      'under_review',
      'resolved',
    ]
  );

  assert.ok(
    DUPLICATE_CASE_DECISIONS.includes(
      'merge'
    )
  );

  assert.ok(
    DUPLICATE_CASE_DECISIONS.includes(
      'keep_separate'
    )
  );

  assert.ok(
    DUPLICATE_CASE_DECISIONS.includes(
      'not_duplicate'
    )
  );

  console.log(
    '✅ Review decisions defined'
  );

  /*
   * Unique pair index.
   */

  const indexes =
    applicantDuplicateCaseSchema
      .indexes();

  const pairIndex =
    indexes.find(
      ([fields]) =>
        fields.pairKey === 1
    );

  assert.ok(
    pairIndex,
    'pairKey index missing'
  );

  assert.strictEqual(
    pairIndex[1].unique,
    true
  );

  console.log(
    '✅ Duplicate Applicant pair has unique case index'
  );

  /*
   * No DB connection should have happened.
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
    '✅ No Applicant merged'
  );

  console.log(
    '✅ No Applicant deleted'
  );

  console.log('');
  console.log(
    'TASK 5.2 MODEL TEST PASSED'
  );
}

main().catch((error) => {
  console.error(
    'TASK 5.2 MODEL TEST FAILED'
  );

  console.error(error);

  process.exitCode = 1;
});
