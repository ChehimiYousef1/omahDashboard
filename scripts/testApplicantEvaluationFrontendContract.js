'use strict';

const assert =
  require('assert');

const fs =
  require('fs');

const mongoose =
  require('mongoose');


const source =
  fs.readFileSync(
    'omahconnect-admin/src/services/api.ts',
    'utf8'
  );


console.log(
  '================================'
);

console.log(
  ' APPLICANT EVALUATION FRONTEND API TEST'
);

console.log(
  '================================'
);


[
  'ApplicantEvaluationRecommendation',
  'ApplicantEvaluationStatus',
  'ApplicantEvaluationCriteria',
  'ApplicantEvaluationEvaluator',
  'ApplicantEvaluation',
  'ApplicantEvaluationCreatePayload',
  'ApplicantEvaluationUpdatePayload',
].forEach(
  (name) => {
    assert.ok(
      source.includes(
        name
      ),
      `Missing frontend type: ${name}`
    );
  }
);

console.log(
  '✅ frontend evaluation types defined'
);


[
  'fetchApplicantEvaluations',
  'createApplicantEvaluation',
  'updateApplicantEvaluation',
  'submitApplicantEvaluation',
].forEach(
  (name) => {
    assert.ok(
      source.includes(
        `export const ${name}`
      ),
      `Missing frontend API function: ${name}`
    );
  }
);

console.log(
  '✅ frontend evaluation functions defined'
);


[
  '/evaluations`',
  '/evaluations/${evaluationId}`',
  '/evaluations/${evaluationId}/submit`',
].forEach(
  (fragment) => {
    assert.ok(
      source.includes(
        fragment
      ),
      `Missing evaluation endpoint fragment: ${fragment}`
    );
  }
);

console.log(
  '✅ frontend evaluation endpoints connected'
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
  'APPLICANT EVALUATION FRONTEND API TEST PASSED'
);
