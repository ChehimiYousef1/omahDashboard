'use strict';

const EVALUATION_CRITERIA =
  Object.freeze({
    technicalFit: {
      label: 'Technical Fit',
      weight: 30,
    },

    relevantExperience: {
      label: 'Relevant Experience',
      weight: 20,
    },

    communication: {
      label: 'Communication',
      weight: 15,
    },

    motivationCommitment: {
      label: 'Motivation & Commitment',
      weight: 15,
    },

    learningPotential: {
      label: 'Learning Potential',
      weight: 20,
    },
  });


const EVALUATION_RECOMMENDATIONS =
  Object.freeze([
    'strong_yes',
    'yes',
    'hold',
    'no',
    'strong_no',
  ]);


const EVALUATION_STATUSES =
  Object.freeze([
    'draft',
    'submitted',
  ]);


function evaluationError(
  code,
  message
) {
  const error =
    new Error(message);

  error.code = code;

  return error;
}


function normalizeScore(value) {
  const score =
    Number(value);

  if (
    !Number.isInteger(score) ||
    score < 1 ||
    score > 5
  ) {
    throw evaluationError(
      'EVALUATION_SCORE_INVALID',
      'Evaluation criterion scores must be integers from 1 to 5.'
    );
  }

  return score;
}


function validateCriteriaScores(
  criteria
) {
  if (
    !criteria ||
    typeof criteria !== 'object' ||
    Array.isArray(criteria)
  ) {
    throw evaluationError(
      'EVALUATION_CRITERIA_REQUIRED',
      'Evaluation criteria are required.'
    );
  }

  const normalized = {};

  for (
    const criterion
    of Object.keys(
      EVALUATION_CRITERIA
    )
  ) {
    if (
      criteria[criterion] ===
      undefined
    ) {
      throw evaluationError(
        'EVALUATION_CRITERION_REQUIRED',
        `Missing evaluation criterion: ${criterion}`
      );
    }

    normalized[criterion] =
      normalizeScore(
        criteria[criterion]
      );
  }

  const unexpected =
    Object.keys(criteria)
      .filter(
        (key) =>
          !Object.prototype
            .hasOwnProperty
            .call(
              EVALUATION_CRITERIA,
              key
            )
      );

  if (
    unexpected.length > 0
  ) {
    throw evaluationError(
      'EVALUATION_CRITERION_UNKNOWN',
      `Unknown evaluation criterion: ${unexpected[0]}`
    );
  }

  return normalized;
}


function calculateWeightedScore(
  criteria
) {
  const normalized =
    validateCriteriaScores(
      criteria
    );

  let weighted = 0;

  for (
    const [
      criterion,
      definition,
    ]
    of Object.entries(
      EVALUATION_CRITERIA
    )
  ) {
    weighted +=
      (
        normalized[criterion] /
        5
      ) *
      definition.weight;
  }

  return Number(
    weighted.toFixed(2)
  );
}


function calculateAverageRating(
  criteria
) {
  const normalized =
    validateCriteriaScores(
      criteria
    );

  const values =
    Object.values(normalized);

  const average =
    values.reduce(
      (sum, value) =>
        sum + value,
      0
    ) /
    values.length;

  return Number(
    average.toFixed(2)
  );
}


function validateRecommendation(
  value
) {
  const normalized =
    String(value ?? '')
      .trim()
      .toLowerCase();

  if (
    !EVALUATION_RECOMMENDATIONS
      .includes(normalized)
  ) {
    throw evaluationError(
      'EVALUATION_RECOMMENDATION_INVALID',
      'Evaluation recommendation is invalid.'
    );
  }

  return normalized;
}


function validateEvaluationStatus(
  value
) {
  const normalized =
    String(value ?? '')
      .trim()
      .toLowerCase();

  if (
    !EVALUATION_STATUSES
      .includes(normalized)
  ) {
    throw evaluationError(
      'EVALUATION_STATUS_INVALID',
      'Evaluation status is invalid.'
    );
  }

  return normalized;
}


module.exports = {
  EVALUATION_CRITERIA,
  EVALUATION_RECOMMENDATIONS,
  EVALUATION_STATUSES,
  normalizeScore,
  validateCriteriaScores,
  calculateWeightedScore,
  calculateAverageRating,
  validateRecommendation,
  validateEvaluationStatus,
};
