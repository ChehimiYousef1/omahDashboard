'use strict';

const Applicant =
  require('../models/Applicant');

const ApplicantFormSubmission =
  require('../models/ApplicantFormSubmission');

const ApplicantEvaluation =
  require('../models/ApplicantEvaluation');

const {
  toObjectId,
} = require(
  './applicantSubmissionService'
);

const {
  calculateAverageRating,
  calculateWeightedScore,
  validateCriteriaScores,
  validateEvaluationStatus,
  validateRecommendation,
} = require(
  '../utils/applicantEvaluation'
);


/*
|--------------------------------------------------------------------------
| Errors
|--------------------------------------------------------------------------
*/

function serviceError(
  code,
  message
) {
  const error =
    new Error(message);

  error.code = code;

  return error;
}


/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function cleanText(value) {
  return String(
    value ?? ''
  ).trim();
}


function normalizeEvaluator(
  evaluator
) {
  if (
    !evaluator ||
    typeof evaluator !==
      'object' ||
    Array.isArray(evaluator)
  ) {
    throw serviceError(
      'EVALUATOR_REQUIRED',
      'Evaluation requires an evaluator.'
    );
  }

  const userId =
    cleanText(
      evaluator.userId
    );

  if (!userId) {
    throw serviceError(
      'EVALUATOR_REQUIRED',
      'Evaluation requires an evaluator user ID.'
    );
  }

  return {
    userId,

    name:
      cleanText(
        evaluator.name
      ),

    role:
      cleanText(
        evaluator.role
      ),
  };
}


/*
|--------------------------------------------------------------------------
| Build Evaluation Data
|--------------------------------------------------------------------------
|
| PURE FUNCTION
|
| weightedScore and averageRating are always server-calculated.
| Client-provided calculated scores are never trusted.
|
*/

function buildEvaluationData({
  criteria,
  recommendation,
  strengths,
  concerns,
  summary,
  status = 'draft',
  evaluator,
}) {
  const normalizedCriteria =
    validateCriteriaScores(
      criteria
    );

  return {
    evaluator:
      normalizeEvaluator(
        evaluator
      ),

    criteria:
      normalizedCriteria,

    averageRating:
      calculateAverageRating(
        normalizedCriteria
      ),

    weightedScore:
      calculateWeightedScore(
        normalizedCriteria
      ),

    recommendation:
      validateRecommendation(
        recommendation
      ),

    strengths:
      cleanText(
        strengths
      ),

    concerns:
      cleanText(
        concerns
      ),

    summary:
      cleanText(
        summary
      ),

    status:
      validateEvaluationStatus(
        status
      ),
  };
}


/*
|--------------------------------------------------------------------------
| Validate Applicant + Submission
|--------------------------------------------------------------------------
*/

async function validateEvaluationTarget({
  applicantId,
  submissionId,

  ApplicantModel =
    Applicant,

  SubmissionModel =
    ApplicantFormSubmission,
}) {
  const applicantObjectId =
    toObjectId(
      applicantId,
      'applicantId'
    );

  const submissionObjectId =
    toObjectId(
      submissionId,
      'submissionId'
    );

  const applicant =
    await ApplicantModel.findById(
      applicantObjectId
    );

  if (
    !applicant ||
    applicant.lifecycle
      ?.archived === true
  ) {
    throw serviceError(
      'APPLICANT_NOT_FOUND',
      'Applicant was not found or is archived.'
    );
  }

  const submission =
    await SubmissionModel.findById(
      submissionObjectId
    );

  if (!submission) {
    throw serviceError(
      'SUBMISSION_NOT_FOUND',
      'Applicant submission was not found.'
    );
  }

  if (
    !submission.applicantId ||
    String(
      submission.applicantId
    ) !==
      String(
        applicantObjectId
      )
  ) {
    throw serviceError(
      'SUBMISSION_NOT_LINKED_TO_APPLICANT',
      'Submission does not belong to this Applicant.'
    );
  }

  return {
    applicantObjectId,
    submissionObjectId,
    applicant,
    submission,
  };
}


/*
|--------------------------------------------------------------------------
| Create Evaluation
|--------------------------------------------------------------------------
*/

async function createApplicantEvaluation({
  applicantId,
  submissionId,
  evaluator,

  criteria,
  recommendation,
  strengths = '',
  concerns = '',
  summary = '',
  status = 'draft',

  ApplicantModel =
    Applicant,

  SubmissionModel =
    ApplicantFormSubmission,

  EvaluationModel =
    ApplicantEvaluation,

  now =
    () => new Date(),
}) {
  const target =
    await validateEvaluationTarget({
      applicantId,
      submissionId,
      ApplicantModel,
      SubmissionModel,
    });

  const evaluationData =
    buildEvaluationData({
      evaluator,
      criteria,
      recommendation,
      strengths,
      concerns,
      summary,
      status,
    });

  const existing =
    await EvaluationModel.findOne({
      applicantId:
        target
          .applicantObjectId,

      submissionId:
        target
          .submissionObjectId,

      'evaluator.userId':
        evaluationData
          .evaluator
          .userId,
    });

  if (existing) {
    throw serviceError(
      'EVALUATION_ALREADY_EXISTS',
      'This evaluator already has an evaluation for this Applicant submission.'
    );
  }

  const submittedAt =
    evaluationData.status ===
      'submitted'
      ? now()
      : null;

  const evaluation =
    await EvaluationModel.create({
      applicantId:
        target
          .applicantObjectId,

      submissionId:
        target
          .submissionObjectId,

      ...evaluationData,

      submittedAt,
    });

  return evaluation;
}


/*
|--------------------------------------------------------------------------
| Edit Draft Evaluation
|--------------------------------------------------------------------------
|
| Submitted evaluations are immutable.
|
*/

async function updateApplicantEvaluationDraft({
  applicantId,
  evaluationId,
  evaluatorId,

  criteria,
  recommendation,
  strengths = '',
  concerns = '',
  summary = '',

  EvaluationModel =
    ApplicantEvaluation,
}) {
  const applicantObjectId =
    toObjectId(
      applicantId,
      'applicantId'
    );

  const evaluationObjectId =
    toObjectId(
      evaluationId,
      'evaluationId'
    );

  const evaluation =
    await EvaluationModel.findOne({
      _id:
        evaluationObjectId,

      applicantId:
        applicantObjectId,
    });

  if (!evaluation) {
    throw serviceError(
      'EVALUATION_NOT_FOUND',
      'Applicant evaluation was not found.'
    );
  }

  const ownerId =
    cleanText(
      evaluation.evaluator
        ?.userId
    );

  const currentEvaluatorId =
    cleanText(
      evaluatorId
    );

  if (
    !currentEvaluatorId ||
    ownerId !==
      currentEvaluatorId
  ) {
    throw serviceError(
      'EVALUATION_EVALUATOR_MISMATCH',
      'Only the evaluation author may edit this draft.'
    );
  }

  if (
    evaluation.status !==
      'draft'
  ) {
    throw serviceError(
      'EVALUATION_SUBMITTED_IMMUTABLE',
      'Submitted evaluations cannot be edited.'
    );
  }

  const normalizedCriteria =
    validateCriteriaScores(
      criteria
    );

  const update = {
    criteria:
      normalizedCriteria,

    averageRating:
      calculateAverageRating(
        normalizedCriteria
      ),

    weightedScore:
      calculateWeightedScore(
        normalizedCriteria
      ),

    recommendation:
      validateRecommendation(
        recommendation
      ),

    strengths:
      cleanText(
        strengths
      ),

    concerns:
      cleanText(
        concerns
      ),

    summary:
      cleanText(
        summary
      ),
  };

  const result =
    await EvaluationModel.updateOne(
      {
        _id:
          evaluationObjectId,

        applicantId:
          applicantObjectId,

        status:
          'draft',

        'evaluator.userId':
          currentEvaluatorId,
      },
      {
        $set:
          update,
      },
      {
        runValidators:
          true,
      }
    );

  if (
    result.matchedCount !==
      1
  ) {
    throw serviceError(
      'EVALUATION_UPDATE_CONFLICT',
      'Evaluation draft could not be updated.'
    );
  }

  return {
    status:
      'evaluation-updated',

    evaluationId:
      String(
        evaluationObjectId
      ),

    ...update,
  };
}


/*
|--------------------------------------------------------------------------
| Submit Evaluation
|--------------------------------------------------------------------------
|
| Draft -> submitted
|
| Once submitted, later edit calls are rejected.
|
*/

async function submitApplicantEvaluation({
  applicantId,
  evaluationId,
  evaluatorId,

  EvaluationModel =
    ApplicantEvaluation,

  now =
    () => new Date(),
}) {
  const applicantObjectId =
    toObjectId(
      applicantId,
      'applicantId'
    );

  const evaluationObjectId =
    toObjectId(
      evaluationId,
      'evaluationId'
    );

  const evaluation =
    await EvaluationModel.findOne({
      _id:
        evaluationObjectId,

      applicantId:
        applicantObjectId,
    });

  if (!evaluation) {
    throw serviceError(
      'EVALUATION_NOT_FOUND',
      'Applicant evaluation was not found.'
    );
  }

  const ownerId =
    cleanText(
      evaluation.evaluator
        ?.userId
    );

  const currentEvaluatorId =
    cleanText(
      evaluatorId
    );

  if (
    !currentEvaluatorId ||
    ownerId !==
      currentEvaluatorId
  ) {
    throw serviceError(
      'EVALUATION_EVALUATOR_MISMATCH',
      'Only the evaluation author may submit this evaluation.'
    );
  }

  if (
    evaluation.status ===
      'submitted'
  ) {
    throw serviceError(
      'EVALUATION_ALREADY_SUBMITTED',
      'Evaluation has already been submitted.'
    );
  }

  const submittedAt =
    now();

  const result =
    await EvaluationModel.updateOne(
      {
        _id:
          evaluationObjectId,

        applicantId:
          applicantObjectId,

        status:
          'draft',

        'evaluator.userId':
          currentEvaluatorId,
      },
      {
        $set: {
          status:
            'submitted',

          submittedAt,
        },
      },
      {
        runValidators:
          true,
      }
    );

  if (
    result.matchedCount !==
      1
  ) {
    throw serviceError(
      'EVALUATION_SUBMIT_CONFLICT',
      'Evaluation could not be submitted.'
    );
  }

  return {
    status:
      'evaluation-submitted',

    evaluationId:
      String(
        evaluationObjectId
      ),

    submittedAt,
  };
}


/*
|--------------------------------------------------------------------------
| List Applicant Evaluations
|--------------------------------------------------------------------------
|
| READ ONLY
|
*/

async function listApplicantEvaluations({
  applicantId,

  EvaluationModel =
    ApplicantEvaluation,
}) {
  const applicantObjectId =
    toObjectId(
      applicantId,
      'applicantId'
    );

  return EvaluationModel
    .find({
      applicantId:
        applicantObjectId,
    })
    .sort({
      createdAt: -1,
    });
}


module.exports = {
  buildEvaluationData,
  normalizeEvaluator,
  validateEvaluationTarget,
  createApplicantEvaluation,
  updateApplicantEvaluationDraft,
  submitApplicantEvaluation,
  listApplicantEvaluations,
};
