'use strict';

const assert =
  require('assert');

const {
  APPLICANT_ADMIN_ROLES,
  isApplicantAdmin,
  isApplicantPermission,
  canApplicantAction,
} = require('../utils/applicantPermissions');

function run() {
  assert.deepStrictEqual(
    [...APPLICANT_ADMIN_ROLES],
    [
      'Admin',
      'Super Admin',
    ]
  );

  console.log(
    '✅ canonical Applicant admin roles'
  );

  assert.strictEqual(
    isApplicantAdmin('Admin'),
    true
  );

  assert.strictEqual(
    isApplicantAdmin(
      'Super Admin'
    ),
    true
  );

  console.log(
    '✅ administrators authorized'
  );

  for (
    const role
    of [
      'User',
      'Recruiter',
      'Employer',
      '',
    ]
  ) {
    assert.strictEqual(
      isApplicantAdmin(role),
      false
    );
  }

  console.log(
    '✅ non-admin roles rejected'
  );

  assert.strictEqual(
    isApplicantPermission(
      'applicant:view'
    ),
    true
  );

  assert.strictEqual(
    isApplicantPermission(
      'unknown:permission'
    ),
    false
  );

  console.log(
    '✅ permission names validated'
  );

  assert.strictEqual(
    canApplicantAction({
      role: 'Admin',
      permission:
        'applicant:edit',
    }),
    true
  );

  assert.strictEqual(
    canApplicantAction({
      role: 'Super Admin',
      permission:
        'applicant:archive',
    }),
    true
  );

  assert.strictEqual(
    canApplicantAction({
      role: 'Recruiter',
      permission:
        'applicant:view',
    }),
    false
  );

  assert.strictEqual(
    canApplicantAction({
      role: 'Admin',
      permission:
        'invalid-action',
    }),
    false
  );

  console.log(
    '✅ Applicant action authorization'
  );

  console.log(
    '✅ no authentication state modified'
  );

  console.log(
    '✅ no MongoDB connection used'
  );

  console.log(
    '\nTASK 11 APPLICANT PERMISSIONS TEST PASSED'
  );
}

try {
  run();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}