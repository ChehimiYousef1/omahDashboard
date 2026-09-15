'use strict';

const assert =
  require('assert');

const {
  APPLICANT_STATUSES,
  getApplicantStatusLabel,
  getApplicantAllowedTransitions,
  getApplicantPipelineDefinition,
  canTransitionApplicantStatus,
} = require(
  '../utils/applicantStatus'
);


assert.deepStrictEqual(
  APPLICANT_STATUSES,
  [
    'applied',
    'reviewed',
    'shortlisted',
    'interview',
    'offered',
    'hired',
    'rejected',
  ]
);

console.log(
  '✅ canonical Applicant pipeline stages'
);


assert.strictEqual(
  getApplicantStatusLabel(
    'applied'
  ),
  'New'
);

assert.strictEqual(
  getApplicantStatusLabel(
    'reviewed'
  ),
  'Under Review'
);

assert.strictEqual(
  getApplicantStatusLabel(
    'offered'
  ),
  'Offered'
);

console.log(
  '✅ business-facing stage labels'
);


assert.deepStrictEqual(
  getApplicantAllowedTransitions(
    'interview'
  ),
  [
    'shortlisted',
    'offered',
    'rejected',
  ]
);

console.log(
  '✅ allowed transitions exposed safely'
);


assert.strictEqual(
  canTransitionApplicantStatus(
    'applied',
    'reviewed'
  ),
  true
);

assert.strictEqual(
  canTransitionApplicantStatus(
    'applied',
    'interview'
  ),
  false
);

assert.strictEqual(
  canTransitionApplicantStatus(
    'interview',
    'offered'
  ),
  true
);

assert.strictEqual(
  canTransitionApplicantStatus(
    'offered',
    'hired'
  ),
  true
);

assert.strictEqual(
  canTransitionApplicantStatus(
    'hired',
    'rejected'
  ),
  false
);

console.log(
  '✅ controlled transition rules'
);


const definition =
  getApplicantPipelineDefinition();

assert.strictEqual(
  definition.stages.length,
  7
);

assert.strictEqual(
  definition.stages[0]
    .label,
  'New'
);

assert.deepStrictEqual(
  definition.transitions
    .shortlisted,
  [
    'reviewed',
    'interview',
    'rejected',
  ]
);

console.log(
  '✅ serializable pipeline definition'
);

console.log(
  'APPLICANT PIPELINE TEST PASSED'
);
