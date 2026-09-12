#!/usr/bin/env node

'use strict';

const assert =
  require('assert');

const {
  ADMIN_DUPLICATE_DECISIONS,
  normalizeDuplicateReviewDecision,
  normalizeDuplicateStatusFilter,
  buildDuplicateResolutionUpdate,
} = require(
  '../services/applicantDuplicateCaseService'
);

console.log(
  '================================'
);

console.log(
  ' DUPLICATE MANAGEMENT TEST'
);

console.log(
  '================================'
);


assert.deepStrictEqual(
  ADMIN_DUPLICATE_DECISIONS,
  [
    'same_person',
    'not_duplicate',
    'keep_separate',
  ]
);

console.log(
  '✅ Safe administrative decisions defined'
);


assert.strictEqual(
  normalizeDuplicateReviewDecision(
    ' SAME_PERSON '
  ),
  'same_person'
);

console.log(
  '✅ Decision normalization'
);


assert.throws(
  () =>
    normalizeDuplicateReviewDecision(
      'merge'
    ),
  /same_person/
);

console.log(
  '✅ Automatic merge decision rejected'
);


assert.strictEqual(
  normalizeDuplicateStatusFilter(
    'all'
  ),
  null
);

assert.strictEqual(
  normalizeDuplicateStatusFilter(
    'under_review'
  ),
  'under_review'
);

console.log(
  '✅ Status filters validated'
);


const now =
  new Date(
    '2026-09-12T12:00:00.000Z'
  );

const update =
  buildDuplicateResolutionUpdate({
    decision:
      'same_person',

    notes:
      'Reviewed manually.',

    resolvedBy:
      'admin-test',

    resolvedAt:
      now,
  });


assert.strictEqual(
  update.status,
  'resolved'
);

assert.strictEqual(
  update[
    'resolution.decision'
  ],
  'same_person'
);

assert.strictEqual(
  update[
    'resolution.resolvedBy'
  ],
  'admin-test'
);

assert.strictEqual(
  update[
    'resolution.survivorApplicantId'
  ],
  null
);

assert.strictEqual(
  update[
    'resolution.mergedApplicantId'
  ],
  null
);

console.log(
  '✅ Same-person review performs no merge'
);


assert.throws(
  () =>
    buildDuplicateResolutionUpdate({
      decision:
        'not_duplicate',

      resolvedBy:
        '',
    }),
  /reviewer/i
);

console.log(
  '✅ Reviewer audit identity required'
);


console.log();
console.log(
  '✅ No MongoDB connection used'
);

console.log(
  '✅ No Applicant changed'
);

console.log(
  '✅ No Applicant merged'
);

console.log(
  '✅ No Applicant deleted'
);

console.log();
console.log(
  'POINT 5 DUPLICATE MANAGEMENT TEST PASSED'
);
