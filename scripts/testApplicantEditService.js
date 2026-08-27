'use strict';

const assert =
  require('assert');

const mongoose =
  require('mongoose');

const {
  EDITABLE_PROFILE_FIELDS,
  buildManualApplicantUpdate,
  editApplicantProfile,
} = require('../services/applicantEditService');

async function run() {
  /*
   * 1. Whitelist is reused from current-profile rules.
   */
  assert(
    EDITABLE_PROFILE_FIELDS.has(
      'identity.fullName'
    )
  );

  assert(
    EDITABLE_PROFILE_FIELDS.has(
      'skills.frameworks'
    )
  );

  console.log(
    '✅ editable profile whitelist'
  );

  /*
   * 2. Normal editable values.
   */
  const update =
    buildManualApplicantUpdate({
      'identity.fullName':
        'Updated Applicant',

      'skills.frameworks': [
        'React',
        'Node.js',
      ],
    });

  assert.strictEqual(
    update['identity.fullName'],
    'Updated Applicant'
  );

  assert.deepStrictEqual(
    update['skills.frameworks'],
    ['React', 'Node.js']
  );

  console.log(
    '✅ manual editable fields'
  );

  /*
   * 3. Email normalization.
   */
  const emailUpdate =
    buildManualApplicantUpdate({
      'identity.email':
        '  Test.User@Example.COM ',
    });

  assert.strictEqual(
    emailUpdate[
      'identity.normalizedEmail'
    ],
    'test.user@example.com'
  );

  console.log(
    '✅ email normalization'
  );

  /*
   * 4. Phone normalized companion.
   */
  const phoneUpdate =
    buildManualApplicantUpdate({
      'identity.phoneNumber':
        '+961 70 123 456',
    });

  assert.ok(
    Object.prototype.hasOwnProperty.call(
      phoneUpdate,
      'identity.normalizedPhone'
    )
  );

  console.log(
    '✅ phone normalization'
  );

  /*
   * 5. LinkedIn canonicalization.
   */
  const linkedinUpdate =
    buildManualApplicantUpdate({
      'profiles.linkedin':
        'https://www.linkedin.com/in/example/',
    });

  assert.ok(
    Object.prototype.hasOwnProperty.call(
      linkedinUpdate,
      'profiles.linkedinCanonical'
    )
  );

  console.log(
    '✅ LinkedIn canonicalization'
  );

  /*
   * 6. Legitimate clearing must be allowed.
   */
  const clearingUpdate =
    buildManualApplicantUpdate({
      'identity.city': '',
      'education.hasCertifications':
        false,
      'skills.primaryTechnical': [],
    });

  assert.strictEqual(
    clearingUpdate['identity.city'],
    ''
  );

  assert.strictEqual(
    clearingUpdate[
      'education.hasCertifications'
    ],
    false
  );

  assert.deepStrictEqual(
    clearingUpdate[
      'skills.primaryTechnical'
    ],
    []
  );

  console.log(
    '✅ legitimate clearing values'
  );

  /*
   * 7. Protected fields must be rejected.
   */
  const protectedFields = [
    'applicantCode',
    'profileVersion',
    'latestApprovedSubmissionId',
    'recruitment.status',
    'lifecycle.archived',
    'identity.normalizedEmail',
    'identity.normalizedPhone',
    'profiles.linkedinCanonical',
  ];

  for (
    const field
    of protectedFields
  ) {
    assert.throws(
      () =>
        buildManualApplicantUpdate({
          [field]: 'blocked',
        }),
      (error) =>
        error.code ===
        'PROFILE_FIELD_NOT_EDITABLE'
    );
  }

  console.log(
    '✅ protected fields rejected'
  );

  /*
   * 8. Undefined values must be rejected.
   */
  assert.throws(
    () =>
      buildManualApplicantUpdate({
        'identity.city':
          undefined,
      }),
    (error) =>
      error.code ===
      'EDIT_VALUE_UNDEFINED'
  );

  console.log(
    '✅ undefined edit rejected'
  );

  /*
   * 9. Empty changes rejected.
   */
  assert.throws(
    () =>
      buildManualApplicantUpdate({}),
    (error) =>
      error.code ===
      'EDIT_CHANGES_REQUIRED'
  );

  console.log(
    '✅ empty edit rejected'
  );

  /*
   * 10. Mock database update.
   *
   * No MongoDB connection is used.
   */
  const applicantId =
    new mongoose.Types.ObjectId();

  let capturedFilter;
  let capturedUpdate;
  let capturedOptions;

  const MockApplicantModel = {
    async updateOne(
      filter,
      updateOperation,
      options
    ) {
      capturedFilter = filter;
      capturedUpdate =
        updateOperation;
      capturedOptions = options;

      return {
        matchedCount: 1,
        modifiedCount: 1,
      };
    },
  };

  const result =
    await editApplicantProfile({
      applicantId,
      changes: {
        'identity.city':
          'Beirut',
      },
      ApplicantModel:
        MockApplicantModel,
    });

  assert.strictEqual(
    result.status,
    'profile-edited'
  );

  assert.strictEqual(
    capturedUpdate.$set[
      'identity.city'
    ],
    'Beirut'
  );

  assert.strictEqual(
    capturedUpdate.$inc
      .profileVersion,
    1
  );

  assert.strictEqual(
    capturedFilter[
      'lifecycle.archived'
    ].$ne,
    true
  );

  assert.strictEqual(
    Object.prototype.hasOwnProperty.call(
      capturedUpdate.$set,
      'latestApprovedSubmissionId'
    ),
    false
  );

  assert.strictEqual(
    capturedOptions.runValidators,
    true
  );

  console.log(
    '✅ active Applicant update rule'
  );

  console.log(
    '✅ profileVersion increments'
  );

  console.log(
    '✅ latest submission reference untouched'
  );

  console.log(
    '✅ no MongoDB connection used'
  );

  console.log(
    '\nTASK 8 APPLICANT EDIT SERVICE TEST PASSED'
  );
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
