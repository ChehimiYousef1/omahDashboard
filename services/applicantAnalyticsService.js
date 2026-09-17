'use strict';

const Applicant =
  require('../models/Applicant');

const ApplicantEvaluation =
  require('../models/ApplicantEvaluation');

const ApplicantInterview =
  require('../models/ApplicantInterview');

const ApplicantInternalNote =
  require('../models/ApplicantInternalNote');

const ApplicantActivity =
  require('../models/ApplicantActivity');

const ApplicantFormSubmission =
  require('../models/ApplicantFormSubmission');

const ApplicantDocument =
  require('../models/ApplicantDocument');

const {
  ApplicantDuplicateCase,
} = require('../models/ApplicantDuplicateCase');

const {
  normalizeApplicantAnalyticsFilters,
  applicationDate,
  applicantMatchesAnalyticsFilters,
} = require(
  './analytics/applicantAnalyticsFilters'
);

const {
  rankedBreakdown,
  monthlySeries,
} = require(
  './analytics/applicantAnalyticsHelpers'
);

const {
  buildPipelineAnalytics,
} = require(
  './analytics/applicantPipelineAnalytics'
);

const {
  buildEvaluationAnalytics,
} = require(
  './analytics/applicantEvaluationAnalytics'
);

const {
  buildInterviewAnalytics,
} = require(
  './analytics/applicantInterviewAnalytics'
);

const {
  buildApplicantSegmentation,
} = require(
  './analytics/applicantSegmentationAnalytics'
);

const {
  buildActivityAnalytics,
} = require(
  './analytics/applicantActivityFlowAnalytics'
);

const {
  buildApplicantManagementAnalytics,
} = require(
  './analytics/applicantManagementAnalytics'
);


const {
  INTERNAL_NOTE_ANALYTICS_PROJECTION,
  buildApplicantNotesTasksAnalytics,
} = require(
  './analytics/applicantNotesTasksAnalytics'
);


const APPLICANT_ANALYTICS_PROJECTION = [
  '_id',
  'createdAt',

  'applicantCode',
  'fullName',
  'email',
  'phoneNumber',

  'identity.fullName',
  'identity.email',
  'identity.phoneNumber',
  'identity.country',
  'identity.city',

  'education.universityName',
  'education.institutionCountry',
  'education.degreeLevel',
  'education.major',
  'education.specialization',
  'education.studyStatus',

  'preferences.positionTrack',
  'preferences.positionType',

  'skills.primaryTechnical',
  'skills.technicalExperienceLevel',
  'skills.programmingLanguages',
  'skills.frameworks',
  'skills.databases',
  'skills.cloudDevOps',
  'skills.developmentTools',
  'skills.softSkills',
  'skills.dataEngineerSkills',
  'skills.aiMlEngineerSkills',
  'skills.dataAnalystSkills',

  'recruitment.status',
  'recruitment.source',
  'recruitment.firstAppliedAt',
  'recruitment.lastAppliedAt',
  'recruitment.tags',

  'lifecycle.archived',
].join(' ');


const EVALUATION_ANALYTICS_PROJECTION = [
  '_id',
  'applicantId',
  'evaluator',
  'strengths',
  'concerns',
  'summary',
  'status',
  'recommendation',
  'criteria',
  'averageRating',
  'weightedScore',
  'submittedAt',
  'createdAt',
  'archived',
].join(' ');


const INTERVIEW_ANALYTICS_PROJECTION = [
  '_id',
  'applicantId',
  'organizer',
  'participants',
  'type',
  'status',
  'format',
  'outcome',
  'scheduledStart',
  'scheduledEnd',
  'completedAt',
  'cancelledAt',
  'createdAt',
  'archived',
].join(' ');


const ACTIVITY_ANALYTICS_PROJECTION = [
  '_id',
  'applicantId',
  'type',
  'category',
  'title',
  'description',
  'occurredAt',
  'actor',
  'source',
  'metadata',
].join(' ');


const SUBMISSION_ANALYTICS_PROJECTION = [
  '_id',
  'applicantId',
  'source',
  'submittedAt',
  'documents.cvResume',
  'recruitment.status',
  'createdAt',
].join(' ');


const DOCUMENT_ANALYTICS_PROJECTION = [
  '_id',
  'applicantId',
  'documentType',
  'source',
  'isCurrent',
  'uploadedAt',
  'createdAt',
  'lifecycle.archived',
].join(' ');


const DUPLICATE_ANALYTICS_PROJECTION = [
  '_id',
  'sourceApplicantId',
  'candidateApplicantId',
  'status',
  'confidence',
  'strongMatchCount',
  'matchedSignals',
  'detectedAt',
  'createdAt',
  'resolution.decision',
].join(' ');


async function leanFind(
  Model,
  filter,
  projection
) {
  if (
    !Model ||
    typeof Model.find !==
      'function'
  ) {
    return [];
  }

  let query =
    Model.find(
      filter
    );

  if (
    query &&
    typeof query.select ===
      'function'
  ) {
    query =
      query.select(
        projection
      );
  }

  if (
    query &&
    typeof query.lean ===
      'function'
  ) {
    return query.lean();
  }

  return query;
}


function serializeFilters(
  filters
) {
  return {
    q:
      filters.q,

    from:
      filters.from
        ? filters.from
            .toISOString()
        : null,

    to:
      filters.to
        ? filters.to
            .toISOString()
        : null,

    status:
      filters.status,

    positionTrack:
      filters.positionTrack,

    positionType:
      filters.positionType,

    country:
      filters.country,

    city:
      filters.city,

    source:
      filters.source,

    skill:
      filters.skill,

    tag:
      filters.tag,

    archived:
      filters.archived,
  };
}


function stageCount(
  pipeline,
  status
) {
  return (
    pipeline.find(
      stage =>
        stage.status ===
        status
    )?.count ||
    0
  );
}


function belongsToCohort(
  record,
  idSet
) {
  return idSet.has(
    String(
      record
        ?.applicantId ??
      ''
    )
  );
}


async function getApplicantAnalytics({
  query = {},

  ApplicantModel =
    Applicant,

  EvaluationModel =
    ApplicantEvaluation,

  InterviewModel =
    ApplicantInterview,

  ActivityModel,
  SubmissionModel,
  DocumentModel,
  DuplicateCaseModel,
  NoteModel,
  now = new Date(),
} = {}) {
  const filters =
    normalizeApplicantAnalyticsFilters(
      query
    );


  /*
   * Existing service tests inject fake
   * Applicant/Evaluation/Interview models.
   *
   * In that case Activity analytics is
   * intentionally disabled unless a fake
   * ActivityModel is explicitly supplied.
   *
   * Production uses the real Activity model.
   */
  const usingProductionModels =
    ApplicantModel ===
      Applicant &&
    EvaluationModel ===
      ApplicantEvaluation &&
    InterviewModel ===
      ApplicantInterview;

  const resolvedActivityModel =
    ActivityModel ||
    (
      usingProductionModels
        ? ApplicantActivity
        : null
    );


  const resolvedSubmissionModel =
    SubmissionModel ||
    (
      usingProductionModels
        ? ApplicantFormSubmission
        : null
    );


  const resolvedDocumentModel =
    DocumentModel ||
    (
      usingProductionModels
        ? ApplicantDocument
        : null
    );


  const resolvedDuplicateCaseModel =
    DuplicateCaseModel ||
    (
      usingProductionModels
        ? ApplicantDuplicateCase
        : null
    );


  const resolvedNoteModel =
    NoteModel ||
    (
      usingProductionModels
        ? ApplicantInternalNote
        : null
    );


  const applicantQuery = {};

  if (
    filters.archived ===
    'false'
  ) {
    applicantQuery[
      'lifecycle.archived'
    ] = {
      $ne: true,
    };
  }

  if (
    filters.archived ===
    'true'
  ) {
    applicantQuery[
      'lifecycle.archived'
    ] = true;
  }


  const loadedApplicants =
    await leanFind(
      ApplicantModel,
      applicantQuery,
      APPLICANT_ANALYTICS_PROJECTION
    );


  const applicants =
    (
      loadedApplicants ||
      []
    ).filter(
      applicant =>
        applicantMatchesAnalyticsFilters(
          applicant,
          filters
        )
    );


  const applicantIds =
    applicants.map(
      applicant =>
        applicant._id
    );


  const applicantIdSet =
    new Set(
      applicantIds.map(
        id =>
          String(id)
      )
    );


  let evaluations = [];
  let interviews = [];
  let activities = [];

  let submissions = [];
  let documents = [];
  let duplicateCases = [];
  let internalNotes = [];


  if (
    applicantIds.length >
    0
  ) {
    const [
      loadedEvaluations,
      loadedInterviews,
      loadedActivities,
    ] =
      await Promise.all([
        leanFind(
          EvaluationModel,

          {
            applicantId: {
              $in:
                applicantIds,
            },

            archived: {
              $ne: true,
            },
          },

          EVALUATION_ANALYTICS_PROJECTION
        ),

        leanFind(
          InterviewModel,

          {
            applicantId: {
              $in:
                applicantIds,
            },

            archived: {
              $ne: true,
            },
          },

          INTERVIEW_ANALYTICS_PROJECTION
        ),

        resolvedActivityModel
          ? leanFind(
              resolvedActivityModel,

              {
                applicantId: {
                  $in:
                    applicantIds,
                },
              },

              ACTIVITY_ANALYTICS_PROJECTION
            )
          : Promise.resolve(
              []
            ),
      ]);


    evaluations =
      (
        loadedEvaluations ||
        []
      ).filter(
        evaluation =>
          evaluation
            ?.archived !==
            true &&
          belongsToCohort(
            evaluation,
            applicantIdSet
          )
      );


    interviews =
      (
        loadedInterviews ||
        []
      ).filter(
        interview =>
          interview
            ?.archived !==
            true &&
          belongsToCohort(
            interview,
            applicantIdSet
          )
      );


    activities =
      (
        loadedActivities ||
        []
      ).filter(
        activity =>
          belongsToCohort(
            activity,
            applicantIdSet
          )
      );
  }


  if (
    applicantIds.length >
    0
  ) {
    const [
      loadedSubmissions,
      loadedDocuments,
      loadedDuplicateCases,
    ] =
      await Promise.all([
        resolvedSubmissionModel
          ? leanFind(
              resolvedSubmissionModel,

              {
                applicantId: {
                  $in:
                    applicantIds,
                },
              },

              SUBMISSION_ANALYTICS_PROJECTION
            )
          : Promise.resolve(
              []
            ),

        resolvedDocumentModel
          ? leanFind(
              resolvedDocumentModel,

              {
                applicantId: {
                  $in:
                    applicantIds,
                },
              },

              DOCUMENT_ANALYTICS_PROJECTION
            )
          : Promise.resolve(
              []
            ),

        resolvedDuplicateCaseModel
          ? leanFind(
              resolvedDuplicateCaseModel,

              {
                $or: [
                  {
                    sourceApplicantId: {
                      $in:
                        applicantIds,
                    },
                  },

                  {
                    candidateApplicantId: {
                      $in:
                        applicantIds,
                    },
                  },
                ],
              },

              DUPLICATE_ANALYTICS_PROJECTION
            )
          : Promise.resolve(
              []
            ),
      ]);


    submissions =
      (
        loadedSubmissions ||
        []
      ).filter(
        submission =>
          belongsToCohort(
            submission,
            applicantIdSet
          )
      );


    documents =
      (
        loadedDocuments ||
        []
      ).filter(
        document =>
          belongsToCohort(
            document,
            applicantIdSet
          )
      );


    duplicateCases =
      (
        loadedDuplicateCases ||
        []
      ).filter(
        duplicateCase =>
          applicantIdSet.has(
            String(
              duplicateCase
                ?.sourceApplicantId ??
              ''
            )
          ) ||
          applicantIdSet.has(
            String(
              duplicateCase
                ?.candidateApplicantId ??
              ''
            )
          )
      );
  }


  if (
    applicantIds.length >
      0 &&
    resolvedNoteModel
  ) {
    internalNotes =
      (
        await leanFind(
          resolvedNoteModel,

          {
            applicantId: {
              $in:
                applicantIds,
            },

            archived: {
              $ne:
                true,
            },
          },

          INTERNAL_NOTE_ANALYTICS_PROJECTION
        ) ||
        []
      ).filter(
        item =>
          belongsToCohort(
            item,
            applicantIdSet
          ) &&
          item?.archived !==
            true
      );
  }


  const pipelineAnalytics =
    buildPipelineAnalytics({
      applicants,
      activities,
    });


  const evaluationAnalytics =
    buildEvaluationAnalytics(
      evaluations
    );


  const interviewAnalytics =
    buildInterviewAnalytics(
      interviews
    );


  const segmentation =
    buildApplicantSegmentation(
      applicants
    );


  const activityAnalytics =
    buildActivityAnalytics(
      activities
    );


  const managementAnalytics =
    buildApplicantManagementAnalytics({
      applicants,
      evaluations,
      interviews,
      activities,
      duplicateCases,
      submissions,
      documents,
      now,
    });


  const notesTasksAnalytics =
    buildApplicantNotesTasksAnalytics({
      items:
        internalNotes,

      now,
    });


  const applicationTrend =
    monthlySeries({
      records:
        applicants,

      getDate:
        applicationDate,
    });


  const sources =
    rankedBreakdown({
      records:
        applicants,

      getValues:
        applicant =>
          applicant
            ?.recruitment
            ?.source,

      limit: 20,
    });


  const activeApplicants =
    applicants.filter(
      applicant =>
        applicant
          ?.lifecycle
          ?.archived !==
        true
    ).length;


  const archivedApplicants =
    applicants.filter(
      applicant =>
        applicant
          ?.lifecycle
          ?.archived ===
        true
    ).length;


  const stages =
    pipelineAnalytics
      .stages;


  const summary = {
    totalApplicants:
      applicants.length,

    activeApplicants,

    archivedApplicants,

    newApplicants:
      stageCount(
        stages,
        'applied'
      ),

    underReview:
      stageCount(
        stages,
        'reviewed'
      ),

    shortlisted:
      stageCount(
        stages,
        'shortlisted'
      ),

    interviewStage:
      stageCount(
        stages,
        'interview'
      ),

    offered:
      stageCount(
        stages,
        'offered'
      ),

    hired:
      stageCount(
        stages,
        'hired'
      ),

    rejected:
      stageCount(
        stages,
        'rejected'
      ),

    /*
     * Backward-compatible field:
     * total Interview records, not current
     * Applicants in Interview stage.
     */
    interviews:
      interviewAnalytics
        .total,

    submittedEvaluations:
      evaluationAnalytics
        .submitted,

    averageEvaluationRating:
      evaluationAnalytics
        .averageRating,

    averageWeightedScore:
      evaluationAnalytics
        .averageWeightedScore,

    interviewCompletionRate:
      interviewAnalytics
        .completionRate,

    interviewNoShowRate:
      interviewAnalytics
        .noShowRate,

    positiveRecommendationRate:
      evaluationAnalytics
        .positiveRecommendationRate,

    recordedStatusTransitions:
      pipelineAnalytics
        .recordedFlow
        .recordedTransitions,
  };


  const trends = {
    applications:
      applicationTrend,

    evaluations:
      evaluationAnalytics
        .trend,

    interviews:
      interviewAnalytics
        .trend,

    activity:
      activityAnalytics
        .trend,
  };


  return {
    analyticsVersion: 2,

    summary,

    /*
     * Backward-compatible properties used
     * by the first Analytics View.
     */
    pipeline:
      pipelineAnalytics
        .stages,

    volumeOverTime:
      applicationTrend,

    sources,

    evaluations:
      evaluationAnalytics,

    interviews:
      interviewAnalytics,

    notesTasks:
      notesTasksAnalytics,


    /*
     * Professional analytics payload.
     */
    pipelineAnalytics,

    trends,

    segmentation,

    activity:
      activityAnalytics,

    management:
      managementAnalytics,

    filters:
      serializeFilters(
        filters
      ),

    metadata: {
      historicalStatusCoverage:
        pipelineAnalytics
          .recordedFlow
          .historicalCoverage,

      firstRecordedStatusTransitionAt:
        pipelineAnalytics
          .recordedFlow
          .firstRecordedAt,

      lastRecordedStatusTransitionAt:
        pipelineAnalytics
          .recordedFlow
          .lastRecordedAt,

      timeInStageAvailable:
        false,

      historicalConversionAvailable:
        false,
    },
  };
}


module.exports = {
  APPLICANT_ANALYTICS_PROJECTION,
  EVALUATION_ANALYTICS_PROJECTION,
  INTERVIEW_ANALYTICS_PROJECTION,
  ACTIVITY_ANALYTICS_PROJECTION,
  SUBMISSION_ANALYTICS_PROJECTION,
  DOCUMENT_ANALYTICS_PROJECTION,
  DUPLICATE_ANALYTICS_PROJECTION,
  INTERNAL_NOTE_ANALYTICS_PROJECTION,

  leanFind,
  serializeFilters,
  stageCount,
  getApplicantAnalytics,
};
