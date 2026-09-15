'use strict';

const express = require('express');

const Applicant =
  require('../../models/Applicant');

const {
  getApplicantSearchOptions,
  searchApplicants,
} = require(
  '../../services/applicantSearchService'
);


const {
  getApplicantAnalytics,
} = require(
  '../../services/applicantAnalyticsService'
);


const {
  APPLICANT_ANALYTICS_DRILLDOWN_TYPES,
  getApplicantAnalyticsDrilldown,
} = require(
  '../../services/applicantAnalyticsDrilldownService'
);


const {
  getApplicantDocumentLibrary,
} = require(
  '../../services/applicantDocumentLibraryService'
);

const {
  editApplicantProfile,
} = require(
  '../../services/applicantEditService'
);

const {
  changeApplicantStatus,
} = require(
  '../../services/applicantStatusService'
);


const {
  getApplicantPipelineDefinition,
} = require(
  '../../utils/applicantStatus'
);

const {
  archiveApplicant,
  restoreApplicant,
} = require(
  '../../services/applicantArchiveService'
);

const {
  getApplicantSubmissions,
  linkSubmissionToApplicant,
  toObjectId,
} = require(
  '../../services/applicantSubmissionService'
);

const {
  getApplicantSubmissionHistory,
} = require(
  '../../services/applicantSubmissionHistoryService'
);


const {
  approveProfileFieldsFromSubmission,
} = require(
  '../../services/applicantProfileService'
);

const {
  checkApplicantRelationshipIntegrity,
} = require(
  '../../services/applicantRelationshipService'
);

const {
  listDuplicateCases,
  getDuplicateCase,
  resolveDuplicateCase,
} = require(
  '../../services/applicantDuplicateCaseService'
);

const {
  createApplicantEvaluation,
  updateApplicantEvaluationDraft,
  submitApplicantEvaluation,
  reopenApplicantEvaluation,
  archiveApplicantEvaluation,
  listApplicantEvaluations,
} = require(
  '../../services/applicantEvaluationService'
);

const {
  createApplicantInterview,
  listApplicantInterviews,
  updateApplicantInterview,
  completeApplicantInterview,
  cancelApplicantInterview,
  markApplicantInterviewNoShow,
  archiveApplicantInterview,
  permanentlyDeleteApplicantInterview,
} = require(
  '../../services/applicantInterviewService'
);


const {
  checkApplicantInterviewAvailability,
} = require(
  '../../services/applicantInterviewAvailabilityService'
);


const {
  getMeetingProviderStatuses,
} = require(
  '../../services/interviewMeetingProviderService'
);


const {
  sendApplicantEmail,
  sendApplicantWhatsApp,
} = require(
  '../../services/applicantCommunicationService'
);


const {
  getApplicantTimeline,
} = require(
  '../../services/applicantTimelineService'
);


const {
  recordApplicantActivity,
} = require(
  '../../services/applicantActivityService'
);


const {
  getWhatsAppCloudStatus,
} = require(
  '../../services/whatsappCloudService'
);


/*
|--------------------------------------------------------------------------
| API Error Mapping
|--------------------------------------------------------------------------
*/

const NOT_FOUND_CODES =
  new Set([
    'INTERVIEW_NOT_FOUND',
    'APPLICANT_NOT_FOUND',
    'SUBMISSION_NOT_FOUND',
    'APPROVED_SUBMISSION_NOT_FOUND',
    'DUPLICATE_CASE_NOT_FOUND',
    'EVALUATION_NOT_FOUND',
  ]);

const SERVICE_UNAVAILABLE_CODES =
  new Set([
    'APPLICANT_EMAIL_TRANSPORT_UNAVAILABLE',
    'APPLICANT_EMAIL_SENDER_REQUIRED',
    'WHATSAPP_DISABLED',
    'WHATSAPP_NOT_CONFIGURED',
  ]);


const BAD_GATEWAY_CODES =
  new Set([
    'WHATSAPP_PROVIDER_ERROR',
  ]);


const CONFLICT_CODES =
  new Set([
    'INTERVIEW_STATUS_CONFLICT',
    'INTERVIEW_NOT_EDITABLE',
    'INTERVIEW_PERMANENT_DELETE_NOT_ALLOWED',
    'INTERVIEW_PERMANENT_DELETE_PROVIDER_CLEANUP_FAILED',
    'INTERVIEW_PERMANENT_DELETE_CONFLICT',
    'APPLICANT_NOT_ARCHIVABLE',
    'APPLICANT_NOT_RESTORABLE',
    'SUBMISSION_ALREADY_LINKED',
    'LINK_CONFLICT',
    'STATUS_TRANSITION_NOT_ALLOWED',
    'STATUS_TRANSITION_CONFLICT',
    'CURRENT_STATUS_INVALID',
    'APPROVED_SUBMISSION_RELATIONSHIP_INVALID',
    'DUPLICATE_CASE_ALREADY_RESOLVED',
    'SUBMISSION_NOT_LINKED_TO_APPLICANT',
    'EVALUATION_ALREADY_EXISTS',
    'EVALUATION_SUBMITTED_IMMUTABLE',
    'EVALUATION_ALREADY_SUBMITTED',
    'EVALUATION_UPDATE_CONFLICT',
    'EVALUATION_SUBMIT_CONFLICT',
    'EVALUATION_ARCHIVE_CONFLICT',
    'EVALUATION_REOPEN_CONFLICT',
    'EVALUATION_ALREADY_DRAFT',
  ]);

function statusForError(error) {
  if (
    NOT_FOUND_CODES.has(
      error?.code
    )
  ) {
    return 404;
  }

  if (
    CONFLICT_CODES.has(
      error?.code
    )
  ) {
    return 409;
  }

  if (
    SERVICE_UNAVAILABLE_CODES.has(
      error?.code
    )
  ) {
    return 503;
  }

  if (
    BAD_GATEWAY_CODES.has(
      error?.code
    )
  ) {
    return 502;
  }

  if (
    error?.code ||
    error?.name ===
      'ValidationError' ||
    error?.name ===
      'CastError'
  ) {
    return 400;
  }

  return 500;
}

function sendError(res, error) {
  const status =
    statusForError(error);

  if (status === 500) {
    console.error(
      'Applicant API error:',
      error
    );
  }

  return res
    .status(status)
    .json({
      success: false,

      code:
        error?.code ||
        'INTERNAL_ERROR',

      error:
        status === 500
          ? 'Internal server error'
          : error.message,
    });
}

/*
|--------------------------------------------------------------------------
| Applicant Activity Helpers
|--------------------------------------------------------------------------
|
| Activity logging is deliberately best-effort.
|
| A successful Applicant operation must not be reported as failed merely
| because its audit/timeline event could not be persisted afterwards.
|
*/

function applicantRequestActor(req) {
  return {
    userId:
      String(
        req?.user?.id ??
        ''
      ).trim(),

    name:
      String(
        req?.user?.name ??
        req?.user?.email ??
        ''
      ).trim(),

    email:
      String(
        req?.user?.email ??
        ''
      ).trim(),

    role:
      String(
        req?.user?.role ??
        ''
      ).trim(),
  };
}


async function recordApplicantActivitySafely({
  recordActivity,
  logger = console,
  ...payload
}) {
  if (
    typeof recordActivity !==
      'function'
  ) {
    return false;
  }

  try {
    await recordActivity(
      payload
    );

    return true;
  } catch (error) {
    logger?.error?.(
      'Applicant activity logging failed:',
      error?.message ||
        error
    );

    return false;
  }
}


/*
|--------------------------------------------------------------------------
| Applicant Router
|--------------------------------------------------------------------------
*/

module.exports =
function createApplicantRouter({
  requireApplicantPermission,

  transporter =
    null,

  sendCommunicationEmail =
    sendApplicantEmail,

  sendCommunicationWhatsApp =
    sendApplicantWhatsApp,

  getTimeline =
    getApplicantTimeline,

  getAnalytics =
    getApplicantAnalytics,

  getAnalyticsDrilldown =
    getApplicantAnalyticsDrilldown,

  getDocumentLibrary =
    getApplicantDocumentLibrary,

  recordActivity =
    recordApplicantActivity,

  activityLogger =
    console,

  ApplicantModel =
    Applicant,

  editProfile =
    editApplicantProfile,

  changeStatus =
    changeApplicantStatus,

  archive =
    archiveApplicant,

  restore =
    restoreApplicant,

  getSubmissions =
    getApplicantSubmissions,

  getSubmissionHistory =
    getApplicantSubmissionHistory,

  linkSubmission =
    linkSubmissionToApplicant,

  approveProfile =
    approveProfileFieldsFromSubmission,

  checkRelationships =
    checkApplicantRelationshipIntegrity,

  listDuplicates =
    listDuplicateCases,

  getDuplicate =
    getDuplicateCase,

  resolveDuplicate =
    resolveDuplicateCase,

  createEvaluation =
    createApplicantEvaluation,

  updateEvaluation =
    updateApplicantEvaluationDraft,

  submitEvaluation =
    submitApplicantEvaluation,

  reopenEvaluation =
    reopenApplicantEvaluation,

  archiveEvaluation =
    archiveApplicantEvaluation,

  listEvaluations =
    listApplicantEvaluations,
} = {}) {
  if (
    typeof
      requireApplicantPermission !==
    'function'
  ) {
    throw new Error(
      'requireApplicantPermission is required'
    );
  }

  const router =
    express.Router();

  /*
   * GET /api/applicants
   *
   * Advanced server-side search, filtering,
   * sorting, and pagination.
   */
  router.get(
    '/',

    requireApplicantPermission(
      'applicant:view'
    ),

    async (req, res) => {
      try {
        const result =
          await searchApplicants({
            query: req.query,
            ApplicantModel,
          });

        return res.json({
          success: true,

          applicants:
            result.applicants,

          pagination:
            result.pagination,

          filters:
            result.filters,
        });
      } catch (error) {
        return sendError(
          res,
          error
        );
      }
    }
  );

  /*
   * GET /api/applicants/search-options
   *
   * Returns distinct values used by the
   * advanced Applicant filtering UI.
   */
  router.get(
    '/search-options',

    requireApplicantPermission(
      'applicant:view'
    ),

    async (req, res) => {
      try {
        const options =
          await getApplicantSearchOptions({
            ApplicantModel,
          });

        return res.json({
          success: true,
          options,
        });
      } catch (error) {
        return sendError(
          res,
          error
        );
      }
    }
  );


  /*
   * GET /api/applicants/pipeline
   *
   * Returns the canonical Applicant recruitment
   * pipeline definition used by both backend
   * validation and frontend movement controls.
   */
  router.get(
    '/pipeline',

    requireApplicantPermission(
      'applicant:view'
    ),

    (req, res) => {
      const pipeline =
        getApplicantPipelineDefinition();

      return res.json({
        success: true,
        pipeline,
      });
    }
  );


  /*
   * GET /api/applicants/documents/library
   *
   * Central read-only document inventory.
   *
   * Combines current/versioned ApplicantDocument
   * records with immutable Form submission
   * document references.
   */
  router.get(
    '/documents/library',

    requireApplicantPermission(
      'applicant:documents:view'
    ),

    async (req, res) => {
      try {
        const library =
          await getDocumentLibrary({
            query:
              req.query,
          });

        return res.json({
          success: true,
          library,
        });
      } catch (error) {
        return sendError(
          res,
          error
        );
      }
    }
  );


  /*
   * GET /api/applicants/analytics/drilldown
   *
   * Read-only operational Applicant analytics
   * drill-down. Uses the same Applicant cohort
   * filters as the main analytics endpoint.
   */
  router.get(
    '/analytics/drilldown',

    requireApplicantPermission(
      'applicant:view'
    ),

    async (req, res) => {
      try {
        const type =
          String(
            req.query
              ?.type ||
            ''
          ).trim();

        if (
          !APPLICANT_ANALYTICS_DRILLDOWN_TYPES
            .includes(
              type
            )
        ) {
          return res
            .status(400)
            .json({
              success: false,
              error:
                'Unsupported Applicant analytics drill-down type.',
            });
        }

        const drilldown =
          await getAnalyticsDrilldown({
            query:
              req.query,
          });

        return res.json({
          success: true,
          drilldown,
        });
      } catch (error) {
        return sendError(
          res,
          error
        );
      }
    }
  );


  /*
   * GET /api/applicants/analytics
   *
   * Server-side recruitment analytics.
   *
   * Historical time-in-stage and time-to-hire
   * are intentionally not calculated because
   * legacy Applicants do not have complete
   * status-transition history.
   */
  router.get(
    '/analytics',

    requireApplicantPermission(
      'applicant:view'
    ),

    async (req, res) => {
      try {
        const analytics =
          await getAnalytics({
            query:
              req.query,
          });

        return res.json({
          success: true,
          analytics,
        });
      } catch (error) {
        return sendError(
          res,
          error
        );
      }
    }
  );


  /*
   * ==================================================
   * DUPLICATE REVIEW MANAGEMENT
   * ==================================================
   *
   * Review endpoints only.
   *
   * They never merge or delete Applicants.
   */

  /*
   * GET /api/applicants/duplicates
   */
  router.get(
    '/duplicates',

    requireApplicantPermission(
      'applicant:view'
    ),

    async (req, res) => {
      try {
        const result =
          await listDuplicates({
            status:
              req.query.status,

            applicantId:
              req.query
                .applicantId,

            page:
              req.query.page,

            limit:
              req.query.limit,
          });

        return res.json({
          success: true,
          ...result,
        });
      } catch (error) {
        return sendError(
          res,
          error
        );
      }
    }
  );


  /*
   * GET /api/applicants/duplicates/:caseId
   */
  router.get(
    '/duplicates/:caseId',

    requireApplicantPermission(
      'applicant:view'
    ),

    async (req, res) => {
      try {
        const duplicateCase =
          await getDuplicate({
            duplicateCaseId:
              req.params.caseId,
          });

        return res.json({
          success: true,
          duplicateCase,
        });
      } catch (error) {
        return sendError(
          res,
          error
        );
      }
    }
  );


  /*
   * PATCH
   * /api/applicants/duplicates/:caseId/resolve
   *
   * IMPORTANT:
   *
   * same_person only records the
   * administrative decision.
   *
   * It does NOT merge Applicants.
   */
  router.patch(
    '/duplicates/:caseId/resolve',

    requireApplicantPermission(
      'applicant:edit'
    ),

    async (req, res) => {
      try {
        const duplicateCase =
          await resolveDuplicate({
            duplicateCaseId:
              req.params.caseId,

            decision:
              req.body?.decision,

            notes:
              req.body?.notes ||
              '',

            resolvedBy:
              req.user.id,
          });

        return res.json({
          success: true,
          duplicateCase,
        });
      } catch (error) {
        return sendError(
          res,
          error
        );
      }
    }
  );


  /*
   * ==================================================
   * APPLICANT EVALUATIONS
   * ==================================================
   */

  /*
   * GET /api/applicants/:id/evaluations
   */
  router.get(
    '/:id/evaluations',

    requireApplicantPermission(
      'applicant:evaluations:view'
    ),

    async (req, res) => {
      try {
        const evaluations =
          await listEvaluations({
            applicantId:
              req.params.id,
          });

        return res.json({
          success: true,
          evaluations,
        });
      } catch (error) {
        return sendError(
          res,
          error
        );
      }
    }
  );


  /*
   * POST /api/applicants/:id/evaluations
   */
  router.post(
    '/:id/evaluations',

    requireApplicantPermission(
      'applicant:evaluations:manage'
    ),

    async (req, res) => {
      try {
        const evaluation =
          await createEvaluation({
            applicantId:
              req.params.id,

            submissionId:
              req.body?.submissionId,

            evaluator: {
              userId:
                req.user.id,

              name:
                req.user.name ||
                req.user.email ||
                '',

              email:
                req.user.email ||
                '',

              role:
                req.user.role ||
                '',
            },

            criteria:
              req.body?.criteria,

            recommendation:
              req.body?.recommendation,

            strengths:
              req.body?.strengths ||
              '',

            concerns:
              req.body?.concerns ||
              '',

            summary:
              req.body?.summary ||
              '',

            status:
              req.body?.status ||
              'draft',
          });

        return res
          .status(201)
          .json({
            success: true,
            evaluation,
          });
      } catch (error) {
        return sendError(
          res,
          error
        );
      }
    }
  );


  /*
   * PATCH
   * /api/applicants/:id/evaluations/:evaluationId
   */
  router.patch(
    '/:id/evaluations/:evaluationId',

    requireApplicantPermission(
      'applicant:evaluations:manage'
    ),

    async (req, res) => {
      try {
        const result =
          await updateEvaluation({
            applicantId:
              req.params.id,

            evaluationId:
              req.params
                .evaluationId,

            evaluatorId:
              req.user.id,

            criteria:
              req.body?.criteria,

            recommendation:
              req.body?.recommendation,

            strengths:
              req.body?.strengths ||
              '',

            concerns:
              req.body?.concerns ||
              '',

            summary:
              req.body?.summary ||
              '',
          });

        return res.json({
          success: true,
          result,
        });
      } catch (error) {
        return sendError(
          res,
          error
        );
      }
    }
  );


  /*
   * POST
   * /api/applicants/:id/evaluations/:evaluationId/submit
   */
  router.post(
    '/:id/evaluations/:evaluationId/submit',

    requireApplicantPermission(
      'applicant:evaluations:manage'
    ),

    async (req, res) => {
      try {
        const result =
          await submitEvaluation({
            applicantId:
              req.params.id,

            evaluationId:
              req.params
                .evaluationId,

            evaluatorId:
              req.user.id,
          });

        return res.json({
          success: true,
          result,
        });
      } catch (error) {
        return sendError(
          res,
          error
        );
      }
    }
  );


  /*
   * POST
   * /api/applicants/:id/evaluations/:evaluationId/reopen
   *
   * submitted -> draft
   */
  router.post(
    '/:id/evaluations/:evaluationId/reopen',

    requireApplicantPermission(
      'applicant:evaluations:manage'
    ),

    async (req, res) => {
      try {
        const result =
          await reopenEvaluation({
            applicantId:
              req.params.id,

            evaluationId:
              req.params
                .evaluationId,

            evaluatorId:
              req.user.id,
          });

        return res.json({
          success: true,
          result,
        });
      } catch (error) {
        return sendError(
          res,
          error
        );
      }
    }
  );


  /*
   * DELETE
   * /api/applicants/:id/evaluations/:evaluationId
   *
   * Soft-delete only.
   */
  router.delete(
    '/:id/evaluations/:evaluationId',

    requireApplicantPermission(
      'applicant:evaluations:manage'
    ),

    async (req, res) => {
      try {
        const result =
          await archiveEvaluation({
            applicantId:
              req.params.id,

            evaluationId:
              req.params
                .evaluationId,

            evaluatorId:
              req.user.id,

            reason:
              req.body?.reason ||
              '',
          });

        return res.json({
          success: true,
          result,
        });
      } catch (error) {
        return sendError(
          res,
          error
        );
      }
    }
  );




  /*
   * ==================================================
   * APPLICANT INTERVIEWS
   * ==================================================
   */

  /*
   * GET /api/applicants/interviews/providers
   *
   * Read-only runtime meeting-provider
   * configuration status.
   *
   * Does not expose OAuth secrets.
   */
  router.get(
    '/interviews/providers',

    requireApplicantPermission(
      'applicant:interviews:view'
    ),

    (req, res) => {
      try {
        const providers =
          getMeetingProviderStatuses();

        return res.json({
          success: true,
          providers,
        });
      } catch (error) {
        return sendError(
          res,
          error
        );
      }
    }
  );


  /*
   * GET /api/applicants/:id/interviews
   */
  router.get(
    '/:id/interviews',

    requireApplicantPermission(
      'applicant:interviews:view'
    ),

    async (req, res) => {
      try {
        const interviews =
          await listApplicantInterviews({
            applicantId:
              req.params.id,

            includeArchived:
              String(
                req.query
                  ?.includeArchived ||
                  'false'
              ).toLowerCase() ===
              'true',
          });

        return res.json({
          success: true,
          interviews,
        });
      } catch (error) {
        return sendError(
          res,
          error
        );
      }
    }
  );


  /*
   * POST
   * /api/applicants/:id/interviews/availability
   *
   * Read-only availability check.
   *
   * Does not create or update an
   * interview or Calendar event.
   */
  router.post(
    '/:id/interviews/availability',

    requireApplicantPermission(
      'applicant:interviews:manage'
    ),

    async (req, res) => {
      try {
        const availability =
          await checkApplicantInterviewAvailability({
            applicantId:
              req.params.id,

            scheduledStart:
              req.body
                ?.scheduledStart,

            scheduledEnd:
              req.body
                ?.scheduledEnd,

            timezone:
              req.body
                ?.timezone ||
              'UTC',

            participants:
              req.body
                ?.participants ||
              [],

            calendarIds:
              req.body
                ?.calendarIds ||
              [],

            excludeInterviewId:
              req.body
                ?.excludeInterviewId ||
              null,

            organizer: {
              userId:
                req.user.id,

              name:
                req.user.name ||
                req.user.email ||
                'Admin',

              email:
                req.user.email ||
                '',

              role:
                req.user.role ||
                'Admin',
            },
          });

        return res.json({
          success: true,
          availability,
        });
      } catch (error) {
        return sendError(
          res,
          error
        );
      }
    }
  );


  /*
   * POST /api/applicants/:id/interviews
   */
  router.post(
    '/:id/interviews',

    requireApplicantPermission(
      'applicant:interviews:manage'
    ),

    async (req, res) => {
      try {
        const interview =
          await createApplicantInterview({
            applicantId:
              req.params.id,

            submissionId:
              req.body
                ?.submissionId ??
              null,

            type:
              req.body?.type,

            scheduledStart:
              req.body
                ?.scheduledStart,

            scheduledEnd:
              req.body
                ?.scheduledEnd,

            timezone:
              req.body
                ?.timezone ||
              'UTC',

            format:
              req.body
                ?.format ||
              'online',

            meetingProvider:
              req.body
                ?.meetingProvider,

            location:
              req.body
                ?.location ||
              '',

            participants:
              req.body
                ?.participants,

            notes:
              req.body
                ?.notes ||
              '',

            createdBy: {
              userId:
                req.user.id,

              name:
                req.user.name ||
                req.user.email ||
                '',

              role:
                req.user.role ||
                '',
            },

            notificationTransporter:
              transporter,
          });

        return res
          .status(201)
          .json({
            success: true,
            interview,
          });
      } catch (error) {
        return sendError(
          res,
          error
        );
      }
    }
  );


  /*
   * PATCH
   * /api/applicants/:id/interviews/:interviewId
   *
   * Edit/reschedule only while scheduled.
   */
  router.patch(
    '/:id/interviews/:interviewId',

    requireApplicantPermission(
      'applicant:interviews:manage'
    ),

    async (req, res) => {
      try {
        const interview =
          await updateApplicantInterview({
            applicantId:
              req.params.id,

            interviewId:
              req.params
                .interviewId,

            type:
              req.body?.type,

            scheduledStart:
              req.body
                ?.scheduledStart,

            scheduledEnd:
              req.body
                ?.scheduledEnd,

            timezone:
              req.body
                ?.timezone,

            format:
              req.body
                ?.format,

            meetingProvider:
              req.body
                ?.meetingProvider,

            location:
              req.body
                ?.location,

            participants:
              req.body
                ?.participants,

            notes:
              req.body?.notes,

            notificationTransporter:
              transporter,
          });

        return res.json({
          success: true,
          interview,
        });
      } catch (error) {
        return sendError(
          res,
          error
        );
      }
    }
  );


  /*
   * POST
   * /api/applicants/:id/interviews/:interviewId/complete
   */
  router.post(
    '/:id/interviews/:interviewId/complete',

    requireApplicantPermission(
      'applicant:interviews:manage'
    ),

    async (req, res) => {
      try {
        const interview =
          await completeApplicantInterview({
            applicantId:
              req.params.id,

            interviewId:
              req.params
                .interviewId,

            outcome:
              req.body
                ?.outcome ||
              'pending',

            feedback:
              req.body
                ?.feedback ||
              '',

            notes:
              req.body?.notes,
          });

        return res.json({
          success: true,
          interview,
        });
      } catch (error) {
        return sendError(
          res,
          error
        );
      }
    }
  );


  /*
   * POST
   * /api/applicants/:id/interviews/:interviewId/cancel
   */
  router.post(
    '/:id/interviews/:interviewId/cancel',

    requireApplicantPermission(
      'applicant:interviews:manage'
    ),

    async (req, res) => {
      try {
        const interview =
          await cancelApplicantInterview({
            applicantId:
              req.params.id,

            interviewId:
              req.params
                .interviewId,

            reason:
              req.body
                ?.reason ||
              '',

            notificationTransporter:
              transporter,
          });

        return res.json({
          success: true,
          interview,
        });
      } catch (error) {
        return sendError(
          res,
          error
        );
      }
    }
  );


  /*
   * POST
   * /api/applicants/:id/interviews/:interviewId/no-show
   */
  router.post(
    '/:id/interviews/:interviewId/no-show',

    requireApplicantPermission(
      'applicant:interviews:manage'
    ),

    async (req, res) => {
      try {
        const interview =
          await markApplicantInterviewNoShow({
            applicantId:
              req.params.id,

            interviewId:
              req.params
                .interviewId,

            notes:
              req.body?.notes,
          });

        return res.json({
          success: true,
          interview,
        });
      } catch (error) {
        return sendError(
          res,
          error
        );
      }
    }
  );


  /*
   * DELETE
   * /api/applicants/:id/interviews/:interviewId/permanent
   *
   * Hard-delete only after lifecycle/provider
   * safety checks succeed.
   */
  router.delete(
    '/:id/interviews/:interviewId/permanent',

    requireApplicantPermission(
      'applicant:interviews:manage'
    ),

    async (req, res) => {
      try {
        const result =
          await permanentlyDeleteApplicantInterview({
            applicantId:
              req.params.id,

            interviewId:
              req.params
                .interviewId,
          });

        return res.json({
          success: true,
          result,
        });
      } catch (error) {
        return sendError(
          res,
          error
        );
      }
    }
  );


  /*
   * DELETE
   * /api/applicants/:id/interviews/:interviewId
   *
   * Soft-delete only.
   */
  router.delete(
    '/:id/interviews/:interviewId',

    requireApplicantPermission(
      'applicant:interviews:manage'
    ),

    async (req, res) => {
      try {
        const interview =
          await archiveApplicantInterview({
            applicantId:
              req.params.id,

            interviewId:
              req.params
                .interviewId,

            archivedBy:
              req.user.id,

            reason:
              req.body
                ?.reason ||
              '',
          });

        return res.json({
          success: true,
          interview,
        });
      } catch (error) {
        return sendError(
          res,
          error
        );
      }
    }
  );


  /*
   * GET
   * /api/applicants/communications/providers
   *
   * Read-only communication provider status.
   * Does not expose credentials or secrets.
   */
  router.get(
    '/communications/providers',

    requireApplicantPermission(
      'applicant:communicate'
    ),

    (req, res) => {
      try {
        const whatsapp =
          getWhatsAppCloudStatus();

        const emailReady =
          Boolean(
            transporter &&
            typeof transporter.sendMail ===
              'function'
          );

        return res.json({
          success: true,

          providers: {
            email: {
              provider:
                'smtp',

              ready:
                emailReady,
            },

            whatsapp: {
              provider:
                whatsapp.provider,

              enabled:
                whatsapp.enabled,

              configured:
                whatsapp.configured,

              ready:
                whatsapp.ready,
            },
          },
        });
      } catch (error) {
        return sendError(
          res,
          error
        );
      }
    }
  );


  /*
   * GET /api/applicants/:id/activity
   *
   * Unified chronological Applicant timeline.
   *
   * Combines native historical records with
   * append-only ApplicantActivity events.
   */
  router.get(
    '/:id/activity',

    requireApplicantPermission(
      'applicant:view'
    ),

    async (req, res) => {
      try {
        const result =
          await getTimeline({
            applicantId:
              req.params.id,

            category:
              req.query?.category,

            type:
              req.query?.type,

            limit:
              req.query?.limit,
          });

        return res.json({
          success: true,
          ...result,
        });
      } catch (error) {
        return sendError(
          res,
          error
        );
      }
    }
  );


  /*
   * POST
   * /api/applicants/:id/communications/email
   *
   * Sends an email to the address stored on the
   * Applicant master profile.
   */
  router.post(
    '/:id/communications/email',

    requireApplicantPermission(
      'applicant:communicate'
    ),

    async (req, res) => {
      try {
        const result =
          await sendCommunicationEmail({
            applicantId:
              req.params.id,

            subject:
              req.body?.subject,

            body:
              req.body?.body,

            transporter,

            ApplicantModel,
          });

        await recordApplicantActivitySafely({
          recordActivity,
          logger:
            activityLogger,

          applicantId:
            result.applicantId,

          type:
            'communication.email.sent',

          title:
            'Email sent',

          occurredAt:
            new Date(),

          actor:
            applicantRequestActor(
              req
            ),

          source: {
            type:
              'email',
            id:
              '',
          },

          metadata: {
            subject:
              String(
                req.body?.subject ??
                ''
              ).trim(),
          },
        });

        return res.json({
          success: true,
          result,
        });
      } catch (error) {
        return sendError(
          res,
          error
        );
      }
    }
  );


  /*
   * POST
   * /api/applicants/:id/communications/whatsapp
   *
   * Sends a WhatsApp message directly through
   * the configured WhatsApp provider.
   */
  router.post(
    '/:id/communications/whatsapp',

    requireApplicantPermission(
      'applicant:communicate'
    ),

    async (req, res) => {
      try {
        const result =
          await sendCommunicationWhatsApp({
            applicantId:
              req.params.id,

            message:
              req.body?.message,

            ApplicantModel,
          });

        await recordApplicantActivitySafely({
          recordActivity,
          logger:
            activityLogger,

          applicantId:
            result.applicantId,

          type:
            'communication.whatsapp.sent',

          title:
            'WhatsApp message sent',

          occurredAt:
            new Date(),

          actor:
            applicantRequestActor(
              req
            ),

          source: {
            type:
              'whatsapp',
            id:
              result.messageId ||
              '',
          },

          metadata: {
            provider:
              result.provider ||
              '',
          },
        });

        return res.json({
          success: true,
          result,
        });
      } catch (error) {
        return sendError(
          res,
          error
        );
      }
    }
  );


  /*
   * PATCH /api/applicants/:id/profile
   */
  router.patch(
    '/:id/profile',

    requireApplicantPermission(
      'applicant:edit'
    ),

    async (req, res) => {
      try {
        const result =
          await editProfile({
            applicantId:
              req.params.id,

            changes:
              req.body?.changes ??
              req.body,
          });

        await recordApplicantActivitySafely({
          recordActivity,
          logger:
            activityLogger,

          applicantId:
            result.applicantId,

          type:
            'profile.updated',

          title:
            'Applicant profile updated',

          occurredAt:
            new Date(),

          actor:
            applicantRequestActor(
              req
            ),

          source: {
            type:
              'applicant',
            id:
              result.applicantId,
          },

          metadata: {
            editedFields:
              result.editedFields ||
              [],
          },
        });

        return res.json({
          success: true,
          result,
        });
      } catch (error) {
        return sendError(
          res,
          error
        );
      }
    }
  );

  /*
   * PATCH /api/applicants/:id/status
   */
  router.patch(
    '/:id/status',

    requireApplicantPermission(
      'applicant:status'
    ),

    async (req, res) => {
      try {
        const result =
          await changeStatus({
            applicantId:
              req.params.id,

            nextStatus:
              req.body?.status,
          });

        if (
          result.status ===
            'status-changed'
        ) {
          await recordApplicantActivitySafely({
            recordActivity,
            logger:
              activityLogger,

            applicantId:
              result.applicantId,

            type:
              'status.changed',

            title:
              'Recruitment status changed',

            description:
              `${result.previousStatus} → ${result.currentStatus}`,

            occurredAt:
              result.changedAt ||
              new Date(),

            actor:
              applicantRequestActor(
                req
              ),

            source: {
              type:
                'applicant',
              id:
                result.applicantId,
            },

            metadata: {
              previousStatus:
                result.previousStatus,

              nextStatus:
                result.currentStatus,
            },
          });
        }

        return res.json({
          success: true,
          result,
        });
      } catch (error) {
        return sendError(
          res,
          error
        );
      }
    }
  );

  /*
   * POST /api/applicants/:id/archive
   */
  router.post(
    '/:id/archive',

    requireApplicantPermission(
      'applicant:archive'
    ),

    async (req, res) => {
      try {
        const result =
          await archive({
            applicantId:
              req.params.id,

            archivedBy:
              req.user.id,

            reason:
              req.body?.reason ||
              '',
          });

        await recordApplicantActivitySafely({
          recordActivity,
          logger:
            activityLogger,

          applicantId:
            result.applicantId,

          type:
            'applicant.archived',

          title:
            'Applicant archived',

          description:
            result.archiveReason ||
            '',

          occurredAt:
            result.archivedAt ||
            new Date(),

          actor:
            applicantRequestActor(
              req
            ),

          source: {
            type:
              'applicant',
            id:
              result.applicantId,
          },

          metadata: {
            reason:
              result.archiveReason ||
              '',
          },
        });

        return res.json({
          success: true,
          result,
        });
      } catch (error) {
        return sendError(
          res,
          error
        );
      }
    }
  );

  /*
   * POST /api/applicants/:id/restore
   */
  router.post(
    '/:id/restore',

    requireApplicantPermission(
      'applicant:restore'
    ),

    async (req, res) => {
      try {
        const result =
          await restore({
            applicantId:
              req.params.id,
          });

        await recordApplicantActivitySafely({
          recordActivity,
          logger:
            activityLogger,

          applicantId:
            result.applicantId,

          type:
            'applicant.restored',

          title:
            'Applicant restored',

          occurredAt:
            new Date(),

          actor:
            applicantRequestActor(
              req
            ),

          source: {
            type:
              'applicant',
            id:
              result.applicantId,
          },
        });

        return res.json({
          success: true,
          result,
        });
      } catch (error) {
        return sendError(
          res,
          error
        );
      }
    }
  );

  /*
   * GET /api/applicants/:id/submissions
   */
  router.get(
    '/:id/submissions',

    requireApplicantPermission(
      'applicant:submissions:view'
    ),

    async (req, res) => {
      try {
        const result =
          await getSubmissionHistory({
            applicantId:
              req.params.id,

            ApplicantModel,

            getSubmissions,
          });

        return res.json({
          success: true,

          submissions:
            result.submissions,

          history:
            result.history,

          summary:
            result.summary,
        });
      } catch (error) {
        return sendError(
          res,
          error
        );
      }
    }
  );

  /*
   * PATCH /api/applicants/:id/approve-profile
   */
  router.patch(
    '/:id/approve-profile',

    requireApplicantPermission(
      'applicant:edit'
    ),

    async (req, res) => {
      try {
        const {
          submissionId,
          fields,
        } = req.body || {};

        const result =
          await approveProfile({
            applicantId:
              req.params.id,

            submissionId,

            fields,
          });

        return res.json({
          success: true,
          result,
        });
      } catch (error) {
        return sendError(
          res,
          error
        );
      }
    }
  );

  /*
   * POST
   * /api/applicants/:id/submissions/:submissionId/link
   */
  router.post(
    '/:id/submissions/:submissionId/link',

    requireApplicantPermission(
      'applicant:edit'
    ),

    async (req, res) => {
      try {
        const result =
          await linkSubmission({
            applicantId:
              req.params.id,

            submissionId:
              req.params
                .submissionId,
          });

        return res.json({
          success: true,
          result,
        });
      } catch (error) {
        return sendError(
          res,
          error
        );
      }
    }
  );

  /*
   * GET
   * /api/applicants/:id/relationship-integrity
   */
  router.get(
    '/:id/relationship-integrity',

    requireApplicantPermission(
      'applicant:view'
    ),

    async (req, res) => {
      try {
        const result =
          await checkRelationships({
            applicantId:
              req.params.id,
          });

        return res.json({
          success: true,
          result,
        });
      } catch (error) {
        return sendError(
          res,
          error
        );
      }
    }
  );

  /*
   * GET /api/applicants/:id
   *
   * Keep this after the more specific routes.
   */
  router.get(
    '/:id',

    requireApplicantPermission(
      'applicant:view'
    ),

    async (req, res) => {
      try {
        const applicantId =
          toObjectId(
            req.params.id,
            'applicantId'
          );

        const applicant =
          await ApplicantModel
            .findById(
              applicantId
            )
            .lean();

        if (!applicant) {
          const error =
            new Error(
              'Applicant was not found.'
            );

          error.code =
            'APPLICANT_NOT_FOUND';

          throw error;
        }

        return res.json({
          success: true,
          applicant,
        });
      } catch (error) {
        return sendError(
          res,
          error
        );
      }
    }
  );

  return router;
};

