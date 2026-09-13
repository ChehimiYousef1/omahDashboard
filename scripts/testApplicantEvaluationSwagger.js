'use strict';

const assert =
  require('assert');

const mongoose =
  require('mongoose');

const swagger =
  require('../docs/applicantSwagger');


console.log(
  '================================'
);

console.log(
  ' APPLICANT EVALUATION SWAGGER TEST'
);

console.log(
  '================================'
);


const paths =
  swagger.paths;


assert.ok(
  paths[
    '/api/applicants/{id}/evaluations'
  ]?.get
);

assert.ok(
  paths[
    '/api/applicants/{id}/evaluations'
  ]?.post
);

assert.ok(
  paths[
    '/api/applicants/{id}/evaluations/{evaluationId}'
  ]?.patch
);

assert.ok(
  paths[
    '/api/applicants/{id}/evaluations/{evaluationId}/submit'
  ]?.post
);

console.log(
  '✅ all evaluation APIs documented'
);


const schemas =
  swagger.components.schemas;


[
  'ApplicantEvaluationCriteria',
  'ApplicantEvaluationEvaluator',
  'ApplicantEvaluation',
  'ApplicantEvaluationCreateRequest',
  'ApplicantEvaluationUpdateRequest',
  'ApplicantEvaluationListResponse',
  'ApplicantEvaluationCreateResponse',
  'ApplicantEvaluationMutationResponse',
].forEach(
  (schema) => {
    assert.ok(
      schemas[schema],
      `Missing schema: ${schema}`
    );
  }
);

console.log(
  '✅ evaluation schemas documented'
);


const criteria =
  schemas
    .ApplicantEvaluationCriteria;

assert.deepStrictEqual(
  criteria.required,
  [
    'technicalFit',
    'relevantExperience',
    'communication',
    'motivationCommitment',
    'learningPotential',
  ]
);

for (
  const criterion
  of criteria.required
) {
  assert.strictEqual(
    criteria.properties[
      criterion
    ].minimum,
    1
  );

  assert.strictEqual(
    criteria.properties[
      criterion
    ].maximum,
    5
  );
}

console.log(
  '✅ scoring criteria documented as 1–5'
);


const evaluation =
  schemas.ApplicantEvaluation;

assert.strictEqual(
  evaluation
    .properties
    .weightedScore
    .maximum,
  100
);

assert.strictEqual(
  evaluation
    .properties
    .averageRating
    .maximum,
  5
);

console.log(
  '✅ calculated scores documented'
);


const createProperties =
  schemas
    .ApplicantEvaluationCreateRequest
    .properties;

assert.strictEqual(
  Object.prototype
    .hasOwnProperty
    .call(
      createProperties,
      'weightedScore'
    ),
  false
);

assert.strictEqual(
  Object.prototype
    .hasOwnProperty
    .call(
      createProperties,
      'averageRating'
    ),
  false
);

assert.strictEqual(
  Object.prototype
    .hasOwnProperty
    .call(
      createProperties,
      'evaluator'
    ),
  false
);

console.log(
  '✅ client cannot provide calculated score or evaluator'
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
  'APPLICANT EVALUATION SWAGGER TEST PASSED'
);
