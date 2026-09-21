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

      archived: {
        $ne: true,
      },
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

function evaluationAuditNumber(
  value
) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return null;
  }

  const numeric =
    Number(value);

  return Number.isFinite(
    numeric
  )
    ? numeric
    : null;
}


function buildEvaluationAuditChanges({
  previous,
  next,
}) {
  const candidates = [
    {
      field:
        'evaluation.criteria.technicalFit',

      label:
        'Technical fit',

      before:
        evaluationAuditNumber(
          previous
            ?.criteria
            ?.technicalFit
        ),

      after:
        evaluationAuditNumber(
          next
            ?.criteria
            ?.technicalFit
        ),
    },

    {
      field:
        'evaluation.criteria.relevantExperience',

      label:
        'Relevant experience',

      before:
        evaluationAuditNumber(
          previous
            ?.criteria
            ?.relevantExperience
        ),

      after:
        evaluationAuditNumber(
          next
            ?.criteria
            ?.relevantExperience
        ),
    },

    {
      field:
        'evaluation.criteria.communication',

      label:
        'Communication',

      before:
        evaluationAuditNumber(
          previous
            ?.criteria
            ?.communication
        ),

      after:
        evaluationAuditNumber(
          next
            ?.criteria
            ?.communication
        ),
    },

    {
      field:
        'evaluation.criteria.motivationCommitment',

      label:
        'Motivation & commitment',

      before:
        evaluationAuditNumber(
          previous
            ?.criteria
            ?.motivationCommitment
        ),

      after:
        evaluationAuditNumber(
          next
            ?.criteria
            ?.motivationCommitment
        ),
    },

    {
      field:
        'evaluation.criteria.learningPotential',

      label:
        'Learning potential',

      before:
        evaluationAuditNumber(
          previous
            ?.criteria
            ?.learningPotential
        ),

      after:
        evaluationAuditNumber(
          next
            ?.criteria
            ?.learningPotential
        ),
    },

    {
      field:
        'evaluation.averageRating',

      label:
        'Average rating',

      before:
        evaluationAuditNumber(
          previous
            ?.averageRating
        ),

      after:
        evaluationAuditNumber(
          next
            ?.averageRating
        ),
    },

    {
      field:
        'evaluation.weightedScore',

      label:
        'Weighted score',

      before:
        evaluationAuditNumber(
          previous
            ?.weightedScore
        ),

      after:
        evaluationAuditNumber(
          next
            ?.weightedScore
        ),
    },

    {
      field:
        'evaluation.recommendation',

      label:
        'Recommendation',

      before:
        cleanText(
          previous
            ?.recommendation
        ) || null,

      after:
        cleanText(
          next
            ?.recommendation
        ) || null,
    },
  ];

  return candidates.filter(
    change =>
      change.before !==
      change.after
  );
}


async function updateApplicantEvaluationDraft({
  applicantId,
  evaluationId,
  evaluatorId,

  criteria,
  recommendation,
  strengths = '',
  concerns = '',
  summary = '',

  includeAuditResult =
    false,

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

      archived: {
        $ne: true,
      },
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

  const mutationResult = {
    status:
      'evaluation-updated',

    evaluationId:
      String(
        evaluationObjectId
      ),

    ...update,
  };

  if (includeAuditResult) {
    const auditChanges =
      buildEvaluationAuditChanges({
        previous:
          evaluation,

        next:
          update,
      });

    const auditMetadata = {
      strengthsChanged:
        cleanText(
          evaluation
            ?.strengths
        ) !==
        cleanText(
          update.strengths
        ),

      concernsChanged:
        cleanText(
          evaluation
            ?.concerns
        ) !==
        cleanText(
          update.concerns
        ),

      summaryChanged:
        cleanText(
          evaluation
            ?.summary
        ) !==
        cleanText(
          update.summary
        ),
    };

    return {
      result:
        mutationResult,

      auditChanges,

      auditMetadata,
    };
  }

  return mutationResult;
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

      archived: {
        $ne: true,
      },
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
| Reopen Submitted Evaluation
|--------------------------------------------------------------------------
|
| submitted -> draft
|
| The previous submittedAt timestamp remains as historical evidence.
|--------------------------------------------------------------------------
*/

async function reopenApplicantEvaluation({
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

      archived: {
        $ne: true,
      },
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
      'Only the evaluation author may reopen this evaluation.'
    );
  }

  if (
    evaluation.status ===
      'draft'
  ) {
    throw serviceError(
      'EVALUATION_ALREADY_DRAFT',
      'Evaluation is already a draft.'
    );
  }

  const reopenedAt =
    now();

  const result =
    await EvaluationModel.updateOne(
      {
        _id:
          evaluationObjectId,

        applicantId:
          applicantObjectId,

        status:
          'submitted',

        archived: {
          $ne: true,
        },

        'evaluator.userId':
          currentEvaluatorId,
      },
      {
        $set: {
          status:
            'draft',

          reopenedAt,

          reopenedBy:
            currentEvaluatorId,
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
      'EVALUATION_REOPEN_CONFLICT',
      'Evaluation could not be reopened.'
    );
  }

  return {
    status:
      'evaluation-reopened',

    evaluationId:
      String(
        evaluationObjectId
      ),

    reopenedAt,
  };
}


/*
|--------------------------------------------------------------------------
| Archive Evaluation
|--------------------------------------------------------------------------
|
| UI may call this "Delete", but records are never physically deleted.
|--------------------------------------------------------------------------
*/

async function archiveApplicantEvaluation({
  applicantId,
  evaluationId,
  evaluatorId,
  reason = '',

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

      archived: {
        $ne: true,
      },
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
      'Only the evaluation author may delete this evaluation.'
    );
  }

  const archivedAt =
    now();

  const result =
    await EvaluationModel.updateOne(
      {
        _id:
          evaluationObjectId,

        applicantId:
          applicantObjectId,

        archived: {
          $ne: true,
        },

        'evaluator.userId':
          currentEvaluatorId,
      },
      {
        $set: {
          archived:
            true,

          archivedAt,

          archivedBy:
            currentEvaluatorId,

          archiveReason:
            cleanText(
              reason
            ),
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
      'EVALUATION_ARCHIVE_CONFLICT',
      'Evaluation could not be deleted.'
    );
  }

  return {
    status:
      'evaluation-archived',

    evaluationId:
      String(
        evaluationObjectId
      ),

    archivedAt,
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

      archived: {
        $ne: true,
      },
    })
    .sort({
      createdAt: -1,
    });
}


module.exports = {
  buildEvaluationData,
  buildEvaluationAuditChanges,
  normalizeEvaluator,
  validateEvaluationTarget,
  createApplicantEvaluation,
  updateApplicantEvaluationDraft,
  submitApplicantEvaluation,
  reopenApplicantEvaluation,
  archiveApplicantEvaluation,
  listApplicantEvaluations,
};
