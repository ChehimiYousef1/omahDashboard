'use strict';

const assert =
  require('assert');

const {
  APPLICANT_PERMISSIONS,
  canApplicantAction,
} = require(
  '../utils/applicantPermissions'
);


console.log(
  '================================'
);

console.log(
  ' APPLICANT EVALUATION PERMISSION TEST'
);

console.log(
  '================================'
);


assert.ok(
  APPLICANT_PERMISSIONS
    .includes(
      'applicant:evaluations:view'
    )
);

assert.ok(
  APPLICANT_PERMISSIONS
    .includes(
      'applicant:evaluations:manage'
    )
);

console.log(
  '✅ evaluation permissions registered'
);


assert.strictEqual(
  canApplicantAction({
    role:
      'Admin',

    permission:
      'applicant:evaluations:view',
  }),
  true
);

assert.strictEqual(
  canApplicantAction({
    role:
      'Super Admin',

    permission:
      'applicant:evaluations:manage',
  }),
  true
);

console.log(
  '✅ administrative evaluation access allowed'
);


assert.strictEqual(
  canApplicantAction({
    role:
      'User',

    permission:
      'applicant:evaluations:view',
  }),
  false
);

console.log(
  '✅ unauthorized role rejected'
);


console.log('');
console.log(
  'APPLICANT EVALUATION PERMISSION TEST PASSED'
);
