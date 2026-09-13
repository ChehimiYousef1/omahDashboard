'use strict';

const assert =
  require('assert');

const mongoose =
  require('mongoose');

const ApplicantEvaluation =
  require(
    '../models/ApplicantEvaluation'
  );


console.log(
  '================================'
);

console.log(
  ' APPLICANT EVALUATION MODEL TEST'
);

console.log(
  '================================'
);


const paths =
  ApplicantEvaluation
    .schema
    .paths;


[
  'applicantId',
  'submissionId',
  'evaluator',
  'criteria',
  'averageRating',
  'weightedScore',
  'recommendation',
  'strengths',
  'concerns',
  'summary',
  'status',
  'submittedAt',
].forEach(
  (field) => {
    assert.ok(
      paths[field],
      `Missing field: ${field}`
    );
  }
);

console.log(
  '✅ evaluation model fields present'
);


assert.strictEqual(
  paths.applicantId
    .options.ref,
  'Applicant'
);

assert.strictEqual(
  paths.submissionId
    .options.ref,
  'ApplicantFormSubmission'
);

console.log(
  '✅ Applicant + application references configured'
);


assert.ok(
  paths.weightedScore
);

assert.strictEqual(
  paths.weightedScore
    .options.min,
  0
);

assert.strictEqual(
  paths.weightedScore
    .options.max,
  100
);

console.log(
  '✅ weighted score bounded 0–100'
);


assert.strictEqual(
  mongoose.connection
    .readyState,
  0
);

console.log(
  '✅ no MongoDB connection used'
);

console.log(
  '✅ no MongoDB writes performed'
);

console.log('');
console.log(
  'APPLICANT EVALUATION MODEL TEST PASSED'
);
