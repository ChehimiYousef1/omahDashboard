'use strict';

const assert =
  require('assert');

const mongoose =
  require('mongoose');

const {
  EVALUATION_CRITERIA,
  EVALUATION_RECOMMENDATIONS,
  calculateWeightedScore,
  calculateAverageRating,
  validateCriteriaScores,
  validateRecommendation,
} = require(
  '../utils/applicantEvaluation'
);


console.log(
  '================================'
);

console.log(
  ' APPLICANT EVALUATION SCORING TEST'
);

console.log(
  '================================'
);


assert.deepStrictEqual(
  Object.keys(
    EVALUATION_CRITERIA
  ),
  [
    'technicalFit',
    'relevantExperience',
    'communication',
    'motivationCommitment',
    'learningPotential',
  ]
);

console.log(
  '✅ evaluation criteria defined'
);


const totalWeight =
  Object.values(
    EVALUATION_CRITERIA
  ).reduce(
    (sum, criterion) =>
      sum +
      criterion.weight,
    0
  );

assert.strictEqual(
  totalWeight,
  100
);

console.log(
  '✅ criteria weights total 100%'
);


const perfect = {
  technicalFit: 5,
  relevantExperience: 5,
  communication: 5,
  motivationCommitment: 5,
  learningPotential: 5,
};

assert.strictEqual(
  calculateWeightedScore(
    perfect
  ),
  100
);

assert.strictEqual(
  calculateAverageRating(
    perfect
  ),
  5
);

console.log(
  '✅ perfect evaluation scores 100 / 5.0'
);


const minimum = {
  technicalFit: 1,
  relevantExperience: 1,
  communication: 1,
  motivationCommitment: 1,
  learningPotential: 1,
};

assert.strictEqual(
  calculateWeightedScore(
    minimum
  ),
  20
);

assert.strictEqual(
  calculateAverageRating(
    minimum
  ),
  1
);

console.log(
  '✅ minimum valid evaluation handled'
);


const mixed = {
  technicalFit: 5,
  relevantExperience: 4,
  communication: 3,
  motivationCommitment: 4,
  learningPotential: 5,
};

assert.strictEqual(
  calculateWeightedScore(
    mixed
  ),
  87
);

assert.strictEqual(
  calculateAverageRating(
    mixed
  ),
  4.2
);

console.log(
  '✅ weighted evaluation calculation correct'
);


assert.throws(
  () =>
    validateCriteriaScores({
      ...perfect,
      technicalFit: 6,
    }),
  /1 to 5/i
);

console.log(
  '✅ out-of-range scores rejected'
);


assert.throws(
  () =>
    validateCriteriaScores({
      technicalFit: 5,
    }),
  /missing evaluation criterion/i
);

console.log(
  '✅ incomplete criteria rejected'
);


assert.strictEqual(
  validateRecommendation(
    'STRONG_YES'
  ),
  'strong_yes'
);

assert.ok(
  EVALUATION_RECOMMENDATIONS
    .includes(
      validateRecommendation(
        'hold'
      )
    )
);

console.log(
  '✅ recommendations validated'
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
  'APPLICANT EVALUATION SCORING TEST PASSED'
);
