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
  getApplicantCalendarEvents,
} = require(
  '../../services/applicantCalendarService'
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
  permanentlyDeleteApplicant,
} = require(
  '../../services/applicantPermanentDeleteService'
);


const {
  listApplicantInternalNotes,
  createApplicantInternalNote,
  updateApplicantInternalNote,

  deleteApplicantInternalNote,

  archiveApplicantInternalNote,
  restoreApplicantInternalNote,
  permanentlyDeleteApplicantInternalNote,

  setApplicantInternalNoteImportance,
  setApplicantInternalNoteLike,
  setApplicantInternalNoteStar,
  setApplicantInternalTaskAssignee,
  setApplicantInternalTaskPriority,
  setApplicantInternalTaskStatus,
  updateApplicantInternalNoteSchedule,

  listApplicantInternalNoteReplies,
  createApplicantInternalNoteReply,
  updateApplicantInternalNoteReply,
  archiveApplicantInternalNoteReply,
  restoreApplicantInternalNoteReply,
  permanentlyDeleteApplicantInternalNoteReply,

  replaceApplicantTags,
} = require(
  '../../services/applicantInternalNotesService'
);


const {
  addApplicantInternalItemToCalendar,
  updateApplicantInternalItemCalendar,
  removeApplicantInternalItemFromCalendar,
} = require(
  '../../services/applicantInternalCalendarSyncService'
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
  getApplicantAuditHistory,
} = require(
  '../../services/applicantAuditService'
);

const {
  taskAssigneeActivityForTransition,
  taskPriorityActivityForTransition,
  taskStatusActivityForTransition,
} = require(
  '../../utils/applicantActivity'
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
    'INTERNAL_NOTE_NOT_FOUND',
    'INTERNAL_NOTE_REPLY_NOT_FOUND',
    'INTERNAL_TASK_NOT_FOUND',
  ]);

const SERVICE_UNAVAILABLE_CODES =
  new Set([
    'APPLICANT_EMAIL_TRANSPORT_UNAVAILABLE',
    'APPLICANT_EMAIL_SENDER_REQUIRED',
    'WHATSAPP_DISABLED',
    'WHATSAPP_NOT_CONFIGURED',
      'GOOGLE_CALENDAR_DISABLED',
    'GOOGLE_CALENDAR_NOT_CONFIGURED',
    'GOOGLE_CALENDAR_WRITE_DISABLED',
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
    'APPLICANT_PERMANENT_DELETE_NOT_ALLOWED',
    'APPLICANT_PERMANENT_DELETE_ACTIVE_INTERVIEWS',
    'APPLICANT_PERMANENT_DELETE_PROVIDER_MEETING_ACTIVE',
    'APPLICANT_PERMANENT_DELETE_STORAGE_INVALID',
    'APPLICANT_PERMANENT_DELETE_STORAGE_CLEANUP_FAILED',
    'APPLICANT_PERMANENT_DELETE_CONFLICT',
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
    'INTERNAL_NOTE_DELETE_NOT_ALLOWED',
    'INTERNAL_NOTE_DELETE_CONFLICT',
    'INTERNAL_NOTE_DELETE_CALENDAR_LINKED',
    'INTERNAL_NOTE_REPLY_DELETE_NOT_ALLOWED',
    'APPLICANT_PERMANENT_DELETE_INTERNAL_CALENDAR_ACTIVE',
      'INTERNAL_CALENDAR_ALREADY_LINKED',
    'INTERNAL_CALENDAR_NOT_LINKED',
    'INTERNAL_CALENDAR_PERSIST_CONFLICT',
    'INTERNAL_CALENDAR_CREATE_ROLLBACK_FAILED',
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

  db =
    null,

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

  getCalendarEvents =
    getApplicantCalendarEvents,

  getAnalyticsDrilldown =
    getApplicantAnalyticsDrilldown,

  getDocumentLibrary =
    getApplicantDocumentLibrary,

  recordActivity =
    recordApplicantActivity,

  setInternalTaskAssignee =
    setApplicantInternalTaskAssignee,

  setInternalTaskPriority =
    setApplicantInternalTaskPriority,

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


  permanentlyDelete =
    permanentlyDeleteApplicant,

  listInternalNotes =
    listApplicantInternalNotes,

  createInternalNote =
    createApplicantInternalNote,

  updateInternalNote =
    updateApplicantInternalNote,

  deleteInternalNote =
    deleteApplicantInternalNote,

  archiveInternalNote =
    archiveApplicantInternalNote,

  restoreInternalNote =
    restoreApplicantInternalNote,

  permanentlyDeleteInternalNote =
    permanentlyDeleteApplicantInternalNote,

  setInternalNoteImportance =
    setApplicantInternalNoteImportance,

  setInternalNoteLike =
    setApplicantInternalNoteLike,

  setInternalNoteStar =
    setApplicantInternalNoteStar,

  setInternalTaskStatus =
    setApplicantInternalTaskStatus,

  updateInternalNoteSchedule =
    updateApplicantInternalNoteSchedule,

  addInternalItemToCalendar =
    addApplicantInternalItemToCalendar,

  updateInternalItemCalendar =
    updateApplicantInternalItemCalendar,

  removeInternalItemFromCalendar =
    removeApplicantInternalItemFromCalendar,

  listInternalNoteReplies =
    listApplicantInternalNoteReplies,

  createInternalNoteReply =
    createApplicantInternalNoteReply,

  updateInternalNoteReply =
    updateApplicantInternalNoteReply,

  archiveInternalNoteReply =
    archiveApplicantInternalNoteReply,

  restoreInternalNoteReply =
    restoreApplicantInternalNoteReply,

  permanentlyDeleteInternalNoteReply =
    permanentlyDeleteApplicantInternalNoteReply,

  replaceTags =
    replaceApplicantTags,

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
        const resolution =
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

            includeAuditResult:
              true,
          });

        /*
         * Preserve compatibility with injected
         * duplicate-resolution implementations
         * that still return the original
         * duplicateCase directly.
         */
        const hasAuditEnvelope =
          resolution &&
          typeof resolution ===
            'object' &&
          Object.prototype
            .hasOwnProperty
            .call(
              resolution,
              'duplicateCase'
            );

        const duplicateCase =
          hasAuditEnvelope
            ? resolution
                .duplicateCase
            : resolution;

        const auditChanges =
          hasAuditEnvelope &&
          Array.isArray(
            resolution
              ?.auditChanges
          )
            ? resolution
                .auditChanges
            : [];


        /*
         * A duplicate review concerns both
         * Applicants.
         *
         * Write the same administrative
         * decision to both Applicant histories.
         */
        if (hasAuditEnvelope) {
          const sourceApplicantId =
            String(
              duplicateCase
                ?.sourceApplicantId ||
              ''
            ).trim();

          const candidateApplicantId =
            String(
              duplicateCase
                ?.candidateApplicantId ||
              ''
            ).trim();

          const applicantIds =
            [
              ...new Set(
                [
                  sourceApplicantId,
                  candidateApplicantId,
                ].filter(Boolean)
              ),
            ];


          for (
            const applicantId
            of applicantIds
          ) {
            const counterpartApplicantId =
              applicantId ===
                sourceApplicantId
                ? candidateApplicantId
                : sourceApplicantId;


            await recordApplicantActivitySafely({
              recordActivity,

              logger:
                activityLogger,

              applicantId,

              type:
                'duplicate.resolved',

              title:
                'Duplicate review resolved',

              occurredAt:
                duplicateCase
                  ?.resolution
                  ?.resolvedAt ||
                new Date(),

              actor:
                applicantRequestActor(
                  req
                ),

              source: {
                type:
                  'duplicate_case',

                id:
                  String(
                    duplicateCase
                      ?._id ||
                    req.params.caseId
                  ),
              },

              changes:
                auditChanges,

              metadata: {
                notesProvided:
                  resolution
                    ?.auditMetadata
                    ?.notesProvided ===
                  true,

                counterpartApplicantId:
                  counterpartApplicantId ||
                  '',
              },
            });
          }
        }


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

        await recordApplicantActivitySafely({
          recordActivity,

          logger:
            activityLogger,

          applicantId:
            req.params.id,

          type:
            'evaluation.created',

          title:
            'Applicant evaluation created',

          occurredAt:
            new Date(),

          actor:
            applicantRequestActor(
              req
            ),

          source: {
            type:
              'evaluation',

            id:
              String(
                evaluation?._id ||
                ''
              ),
          },

          changes: [
            {
              field:
                'evaluation.exists',

              label:
                'Evaluation exists',

              before:
                false,

              after:
                true,
            },

            {
              field:
                'evaluation.status',

              label:
                'Evaluation status',

              before:
                null,

              after:
                evaluation?.status ||
                'draft',
            },
          ],

          metadata: {
            recommendation:
              evaluation
                ?.recommendation ||
              '',

            weightedScore:
              evaluation
                ?.weightedScore ??
              null,

            averageRating:
              evaluation
                ?.averageRating ??
              null,

            submissionId:
              String(
                evaluation
                  ?.submissionId ||
                req.body
                  ?.submissionId ||
                ''
              ),
          },
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
        const evaluationUpdate =
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

            includeAuditResult:
              true,
          });

        /*
         * Preserve compatibility with injected/legacy
         * updateEvaluation implementations that return
         * the original mutation result directly.
         */
        const hasAuditEnvelope =
          evaluationUpdate &&
          typeof evaluationUpdate ===
            'object' &&
          Object.prototype
            .hasOwnProperty
            .call(
              evaluationUpdate,
              'result'
            );

        const result =
          hasAuditEnvelope
            ? evaluationUpdate.result
            : evaluationUpdate;

        const auditChanges =
          hasAuditEnvelope &&
          Array.isArray(
            evaluationUpdate
              ?.auditChanges
          )
            ? evaluationUpdate
                .auditChanges
            : [];

        const auditMetadata =
          hasAuditEnvelope &&
          evaluationUpdate
            ?.auditMetadata &&
          typeof evaluationUpdate
            .auditMetadata ===
            'object'
            ? evaluationUpdate
                .auditMetadata
            : {};

        const freeTextChanged =
          auditMetadata
            .strengthsChanged ===
            true ||
          auditMetadata
            .concernsChanged ===
            true ||
          auditMetadata
            .summaryChanged ===
            true;

        if (
          auditChanges.length > 0 ||
          freeTextChanged
        ) {
          await recordApplicantActivitySafely({
            recordActivity,

            logger:
              activityLogger,

            applicantId:
              req.params.id,

            type:
              'evaluation.updated',

            title:
              'Applicant evaluation updated',

            occurredAt:
              new Date(),

            actor:
              applicantRequestActor(
                req
              ),

            source: {
              type:
                'evaluation',

              id:
                result
                  ?.evaluationId ||
                req.params
                  .evaluationId,
            },

            changes:
              auditChanges,

            metadata: {
              strengthsChanged:
                Boolean(
                  auditMetadata
                    .strengthsChanged
                ),

              concernsChanged:
                Boolean(
                  auditMetadata
                    .concernsChanged
                ),

              summaryChanged:
                Boolean(
                  auditMetadata
                    .summaryChanged
                ),
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

        await recordApplicantActivitySafely({
          recordActivity,

          logger:
            activityLogger,

          applicantId:
            req.params.id,

          type:
            'evaluation.submitted',

          title:
            'Applicant evaluation submitted',

          occurredAt:
            result.submittedAt ||
            new Date(),

          actor:
            applicantRequestActor(
              req
            ),

          source: {
            type:
              'evaluation',

            id:
              result.evaluationId ||
              req.params
                .evaluationId,
          },

          changes: [
            {
              field:
                'evaluation.status',

              label:
                'Evaluation status',

              before:
                'draft',

              after:
                'submitted',
            },
          ],

          metadata: {
            submittedAt:
              result.submittedAt ||
              null,
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

        await recordApplicantActivitySafely({
          recordActivity,

          logger:
            activityLogger,

          applicantId:
            req.params.id,

          type:
            'evaluation.reopened',

          title:
            'Applicant evaluation reopened',

          occurredAt:
            result.reopenedAt ||
            new Date(),

          actor:
            applicantRequestActor(
              req
            ),

          source: {
            type:
              'evaluation',

            id:
              result.evaluationId ||
              req.params
                .evaluationId,
          },

          changes: [
            {
              field:
                'evaluation.status',

              label:
                'Evaluation status',

              before:
                'submitted',

              after:
                'draft',
            },
          ],

          metadata: {
            reopenedAt:
              result.reopenedAt ||
              null,
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

        await recordApplicantActivitySafely({
          recordActivity,

          logger:
            activityLogger,

          applicantId:
            req.params.id,

          type:
            'evaluation.archived',

          title:
            'Applicant evaluation archived',

          occurredAt:
            result.archivedAt ||
            new Date(),

          actor:
            applicantRequestActor(
              req
            ),

          source: {
            type:
              'evaluation',

            id:
              result.evaluationId ||
              req.params
                .evaluationId,
          },

          changes: [
            {
              field:
                'evaluation.archived',

              label:
                'Evaluation archived',

              before:
                false,

              after:
                true,
            },
          ],

          metadata: {
            archivedAt:
              result.archivedAt ||
              null,

            archiveReasonProvided:
              Boolean(
                String(
                  req.body?.reason ??
                  ''
                ).trim()
              ),
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

        await recordApplicantActivitySafely({
          recordActivity,

          logger:
            activityLogger,

          applicantId:
            req.params.id,

          type:
            'interview.created',

          title:
            'Interview scheduled',

          occurredAt:
            new Date(),

          actor:
            applicantRequestActor(
              req
            ),

          source: {
            type:
              'interview',

            id:
              String(
                interview?._id ||
                ''
              ),
          },

          changes: [
            {
              field:
                'interview.exists',

              label:
                'Interview exists',

              before:
                false,

              after:
                true,
            },

            {
              field:
                'interview.status',

              label:
                'Interview status',

              before:
                null,

              after:
                interview?.status ||
                'scheduled',
            },
          ],

          metadata: {
            interviewType:
              interview?.type ||
              '',

            format:
              interview?.format ||
              '',
          },
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
        const {
          interview,
          auditChanges,
          auditMetadata,
        } =
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

            includeAuditResult:
              true,
          });

        const structuredInterviewChanges =
          Array.isArray(
            auditChanges
          )
            ? auditChanges
            : [];

        if (
          structuredInterviewChanges
            .length > 0 ||
          auditMetadata
            ?.notesChanged ===
            true
        ) {
          await recordApplicantActivitySafely({
            recordActivity,

            logger:
              activityLogger,

            applicantId:
              req.params.id,

            type:
              'interview.updated',

            title:
              auditMetadata
                ?.rescheduled
                ? 'Interview rescheduled'
                : 'Interview updated',

            occurredAt:
              new Date(),

            actor:
              applicantRequestActor(
                req
              ),

            source: {
              type:
                'interview',

              id:
                req.params
                  .interviewId,
            },

            changes:
              structuredInterviewChanges,

            metadata: {
              rescheduled:
                Boolean(
                  auditMetadata
                    ?.rescheduled
                ),

              notesChanged:
                Boolean(
                  auditMetadata
                    ?.notesChanged
                ),
            },
          });
        }

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

        await recordApplicantActivitySafely({
          recordActivity,

          logger:
            activityLogger,

          applicantId:
            req.params.id,

          type:
            'interview.completed',

          title:
            'Interview completed',

          occurredAt:
            new Date(),

          actor:
            applicantRequestActor(
              req
            ),

          source: {
            type:
              'interview',

            id:
              req.params.interviewId,
          },

          changes: [
            {
              field:
                'interview.status',

              label:
                'Interview status',

              before:
                'scheduled',

              after:
                'completed',
            },
          ],

          metadata: {
            outcome:
              interview?.outcome ||
              'pending',
          },
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

        await recordApplicantActivitySafely({
          recordActivity,

          logger:
            activityLogger,

          applicantId:
            req.params.id,

          type:
            'interview.cancelled',

          title:
            'Interview cancelled',

          occurredAt:
            new Date(),

          actor:
            applicantRequestActor(
              req
            ),

          source: {
            type:
              'interview',

            id:
              req.params.interviewId,
          },

          changes: [
            {
              field:
                'interview.status',

              label:
                'Interview status',

              before:
                'scheduled',

              after:
                'cancelled',
            },
          ],

          metadata: {
            cancellationReason:
              interview
                ?.cancellationReason ||
              '',
          },
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

        await recordApplicantActivitySafely({
          recordActivity,

          logger:
            activityLogger,

          applicantId:
            req.params.id,

          type:
            'interview.no_show',

          title:
            'Interview marked as no-show',

          occurredAt:
            new Date(),

          actor:
            applicantRequestActor(
              req
            ),

          source: {
            type:
              'interview',

            id:
              req.params.interviewId,
          },

          changes: [
            {
              field:
                'interview.status',

              label:
                'Interview status',

              before:
                'scheduled',

              after:
                'no_show',
            },
          ],
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

        await recordApplicantActivitySafely({
          recordActivity,

          logger:
            activityLogger,

          applicantId:
            req.params.id,

          type:
            'interview.deleted_permanently',

          title:
            'Interview permanently deleted',

          occurredAt:
            new Date(),

          actor:
            applicantRequestActor(
              req
            ),

          source: {
            type:
              'interview',

            id:
              result.interviewId ||
              req.params.interviewId,
          },

          changes: [
            {
              field:
                'interview.exists',

              label:
                'Interview exists',

              before:
                true,

              after:
                false,
            },
          ],
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

        await recordApplicantActivitySafely({
          recordActivity,

          logger:
            activityLogger,

          applicantId:
            req.params.id,

          type:
            'interview.archived',

          title:
            'Interview archived',

          occurredAt:
            new Date(),

          actor:
            applicantRequestActor(
              req
            ),

          source: {
            type:
              'interview',

            id:
              req.params.interviewId,
          },

          changes: [
            {
              field:
                'interview.archived',

              label:
                'Interview archived',

              before:
                false,

              after:
                true,
            },
          ],

          metadata: {
            archiveReason:
              interview
                ?.archiveReason ||
              '',
          },
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
   * ==================================================
   * INTERNAL NOTES, TASKS & TAGS
   * ==================================================
   *
   * Internal recruitment-only information.
   * Never written to immutable Form submissions.
   */

  /*
   * GET /api/applicants/:id/notes
   */
  router.get(
    '/:id/notes',

    requireApplicantPermission(
      'applicant:notes:view'
    ),

    async (req, res) => {
      try {
        const result =
          await listInternalNotes({
            applicantId:
              req.params.id,

            includeArchived:
              req.query
                ?.includeArchived ===
              'true',
          });

        return res.json({
          success: true,
          notes:
            result.notes,
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
   * POST /api/applicants/:id/notes
   */
  router.post(
    '/:id/notes',

    requireApplicantPermission(
      'applicant:notes:manage'
    ),

    async (req, res) => {
      try {
        const result =
          await createInternalNote({
            applicantId:
              req.params.id,

            content:
              req.body?.content,

            kind:
              req.body?.kind,

            important:
              req.body?.important ??
              false,

            schedule:
              req.body?.schedule ??
              {},

            priority:
              req.body?.priority ??
              '',

            assigneeUserId:
              req.body?.assigneeUserId ??
              '',

            resolveUserById:
              async userId => {
                const user =
                  await db?.getUserById?.(
                    userId
                  );

                return user
                  ?.applicantTaskAssigneeEnabled ===
                  true
                    ? user
                    : null;
              },

            actor:
              applicantRequestActor(
                req
              ),
          });

        await recordApplicantActivitySafely({
          recordActivity,
          logger:
            activityLogger,

          applicantId:
            req.params.id,

          type:
            result.note?.kind ===
              'task'
              ? 'task.created'
              : 'note.created',

          title:
            result.note?.kind ===
              'task'
              ? 'Internal task created'
              : 'Internal note created',

          occurredAt:
            new Date(),

          actor:
            applicantRequestActor(
              req
            ),

          source: {
            type:
              'internal_note',

            id:
              String(
                result.note
                  ?._id ||
                ''
              ),
          },
        });

        return res
          .status(201)
          .json({
            success: true,
            note:
              result.note,
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
   * PATCH /api/applicants/:id/notes/:noteId
   */
  router.patch(
    '/:id/notes/:noteId',

    requireApplicantPermission(
      'applicant:notes:manage'
    ),

    async (req, res) => {
      try {
        const result =
          await updateInternalNote({
            applicantId:
              req.params.id,

            noteId:
              req.params.noteId,

            content:
              req.body?.content,

            actor:
              applicantRequestActor(
                req
              ),
          });

        await recordApplicantActivitySafely({
          recordActivity,
          logger:
            activityLogger,

          applicantId:
            req.params.id,

          type:
            result.note?.kind ===
              'task'
              ? 'task.updated'
              : 'note.updated',

          title:
            result.note?.kind ===
              'task'
              ? 'Internal task updated'
              : 'Internal note updated',

          occurredAt:
            new Date(),

          actor:
            applicantRequestActor(
              req
            ),

          source: {
            type:
              'internal_note',

            id:
              String(
                result.note
                  ?._id ||
                ''
              ),
          },
        });

        return res.json({
          success: true,
          note:
            result.note,
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
   * DELETE /api/applicants/:id/notes/:noteId
   *
   * Soft-delete only.
   */
  router.delete(
    '/:id/notes/:noteId',

    requireApplicantPermission(
      'applicant:notes:manage'
    ),

    async (req, res) => {
      try {
        const result =
          await deleteInternalNote({
            applicantId:
              req.params.id,

            noteId:
              req.params.noteId,

            actor:
              applicantRequestActor(
                req
              ),
          });

        await recordApplicantActivitySafely({
          recordActivity,
          logger:
            activityLogger,

          applicantId:
            req.params.id,

          type:
            'note.deleted',

          title:
            'Internal note deleted',

          occurredAt:
            result.archivedAt ||
            new Date(),

          actor:
            applicantRequestActor(
              req
            ),

          source: {
            type:
              'internal_note',

            id:
              result.noteId,
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
   * ==================================================
   * INTERNAL NOTE / TASK WORKFLOW
   * ==================================================
   */

  router.post(
    '/:id/notes/:noteId/archive',

    requireApplicantPermission(
      'applicant:notes:manage'
    ),

    async (req, res) => {
      try {
        const result =
          await archiveInternalNote({
            applicantId:
              req.params.id,

            noteId:
              req.params.noteId,

            actor:
              applicantRequestActor(
                req
              ),
          });

        const kind =
          result.note?.kind ===
            'task'
            ? 'task'
            : 'note';

        await recordApplicantActivitySafely({
          recordActivity,
          logger:
            activityLogger,

          applicantId:
            req.params.id,

          type:
            `${kind}.archived`,

          title:
            kind === 'task'
              ? 'Internal task archived'
              : 'Internal note archived',

          occurredAt:
            result.note
              ?.archivedAt ||
            new Date(),

          actor:
            applicantRequestActor(
              req
            ),

          source: {
            type:
              'internal_note',

            id:
              String(
                result.note?._id ||
                req.params.noteId
              ),
          },
        });

        return res.json({
          success: true,
          note:
            result.note,
        });
      } catch (error) {
        return sendError(
          res,
          error
        );
      }
    }
  );


  router.post(
    '/:id/notes/:noteId/restore',

    requireApplicantPermission(
      'applicant:notes:manage'
    ),

    async (req, res) => {
      try {
        const result =
          await restoreInternalNote({
            applicantId:
              req.params.id,

            noteId:
              req.params.noteId,

            actor:
              applicantRequestActor(
                req
              ),
          });

        const kind =
          result.note?.kind ===
            'task'
            ? 'task'
            : 'note';

        await recordApplicantActivitySafely({
          recordActivity,
          logger:
            activityLogger,

          applicantId:
            req.params.id,

          type:
            `${kind}.restored`,

          title:
            kind === 'task'
              ? 'Internal task restored'
              : 'Internal note restored',

          occurredAt:
            new Date(),

          actor:
            applicantRequestActor(
              req
            ),

          source: {
            type:
              'internal_note',

            id:
              String(
                result.note?._id ||
                req.params.noteId
              ),
          },
        });

        return res.json({
          success: true,
          note:
            result.note,
        });
      } catch (error) {
        return sendError(
          res,
          error
        );
      }
    }
  );


  router.delete(
    '/:id/notes/:noteId/permanent',

    requireApplicantPermission(
      'applicant:notes:manage'
    ),

    async (req, res) => {
      try {
        const result =
          await permanentlyDeleteInternalNote({
            applicantId:
              req.params.id,

            noteId:
              req.params.noteId,

            confirmation:
              req.body?.confirmation,
          });

        await recordApplicantActivitySafely({
          recordActivity,
          logger:
            activityLogger,

          applicantId:
            req.params.id,

          type:
            result.kind ===
              'task'
              ? 'task.permanently_deleted'
              : 'note.permanently_deleted',

          title:
            result.kind ===
              'task'
              ? 'Internal task permanently deleted'
              : 'Internal note permanently deleted',

          occurredAt:
            new Date(),

          actor:
            applicantRequestActor(
              req
            ),

          source: {
            type:
              'internal_note',

            id:
              result.noteId,
          },

          metadata: {
            repliesDeleted:
              result.repliesDeleted,
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


  router.patch(
    '/:id/notes/:noteId/importance',

    requireApplicantPermission(
      'applicant:notes:manage'
    ),

    async (req, res) => {
      try {
        const result =
          await setInternalNoteImportance({
            applicantId:
              req.params.id,

            noteId:
              req.params.noteId,

            important:
              req.body?.important,

            actor:
              applicantRequestActor(
                req
              ),
          });

        const kind =
          result.note?.kind ===
            'task'
            ? 'task'
            : 'note';

        await recordApplicantActivitySafely({
          recordActivity,
          logger:
            activityLogger,

          applicantId:
            req.params.id,

          type:
            `${kind}.updated`,

          title:
            result.note?.important
              ? `Internal ${kind} marked important`
              : `Internal ${kind} marked normal`,

          occurredAt:
            new Date(),

          actor:
            applicantRequestActor(
              req
            ),

          source: {
            type:
              'internal_note',

            id:
              String(
                result.note?._id ||
                req.params.noteId
              ),
          },

          changes:
            result.auditChanges ||
            [],

          metadata: {
            important:
              result.note
                ?.important ===
              true,

            previousStateKnown:
              result.previousStateKnown ===
              true,
          },
        });

        return res.json({
          success: true,
          note:
            result.note,
        });
      } catch (error) {
        return sendError(
          res,
          error
        );
      }
    }
  );


  router.patch(
    '/:id/notes/:noteId/like',

    requireApplicantPermission(
      'applicant:notes:manage'
    ),

    async (req, res) => {
      try {
        const result =
          await setInternalNoteLike({
            applicantId:
              req.params.id,

            noteId:
              req.params.noteId,

            liked:
              req.body?.liked,

            actor:
              applicantRequestActor(
                req
              ),
          });

        return res.json({
          success: true,
          note:
            result.note,
        });
      } catch (error) {
        return sendError(
          res,
          error
        );
      }
    }
  );


  router.patch(
    '/:id/notes/:noteId/star',

    requireApplicantPermission(
      'applicant:notes:manage'
    ),

    async (req, res) => {
      try {
        const result =
          await setInternalNoteStar({
            applicantId:
              req.params.id,

            noteId:
              req.params.noteId,

            starred:
              req.body?.starred,

            actor:
              applicantRequestActor(
                req
              ),
          });

        return res.json({
          success: true,
          note:
            result.note,
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
   * Recruitment task assignment.
   *
   * The client submits only assigneeUserId.
   * User identity is resolved from the trusted OMAH
   * account directory before the assignee snapshot
   * is stored on the task.
   *
   * Empty assigneeUserId explicitly unassigns.
   */
  router.patch(
    '/:id/notes/:noteId/task-assignee',

    requireApplicantPermission(
      'applicant:notes:manage'
    ),

    async (req, res) => {
      try {
        if (
          !db ||
          typeof db.getUserById !==
            'function'
        ) {
          const error =
            new Error(
              'Task assignee user lookup is unavailable.'
            );

          error.code =
            'INTERNAL_TASK_ASSIGNEE_RESOLVER_REQUIRED';

          throw error;
        }

        const result =
          await setInternalTaskAssignee({
            applicantId:
              req.params.id,

            noteId:
              req.params.noteId,

            assigneeUserId:
              req.body?.assigneeUserId,

            actor:
              applicantRequestActor(
                req
              ),

            resolveUserById:
              async userId => {
                const user =
                  await db.getUserById(
                    userId
                  );

                return user
                  ?.applicantTaskAssigneeEnabled ===
                  true
                    ? user
                    : null;
              },
          });

        const activity =
          taskAssigneeActivityForTransition({
            previousAssignee:
              result.previousAssignee,

            assignee:
              result.assignee,

            changed:
              result.changed,
          });

        if (activity) {
          await recordApplicantActivitySafely({
            recordActivity,

            logger:
              activityLogger,

            applicantId:
              req.params.id,

            type:
              activity.type,

            title:
              activity.title,

            occurredAt:
              new Date(),

            actor:
              applicantRequestActor(
                req
              ),

            source: {
              type:
                'internal_note',

              id:
                String(
                  result.note?._id ||
                  req.params.noteId
                ),
            },

            changes: [
              {
                field:
                  'task.assignee',

                label:
                  'Task assignee',

                before:
                  result.previousAssignee,

                after:
                  result.assignee,
              },
            ],

            metadata: {
              ...activity.metadata,

              previousStateKnown:
                result.previousStateKnown ===
                true,
            },
          });
        }

        return res.json({
          success: true,

          status:
            result.status,

          note:
            result.note,
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
   * Recruitment task priority.
   *
   * Allowed values:
   * low | medium | high | urgent
   *
   * Empty priority clears explicit priority.
   */
  router.patch(
    '/:id/notes/:noteId/task-priority',

    requireApplicantPermission(
      'applicant:notes:manage'
    ),

    async (req, res) => {
      try {
        const result =
          await setInternalTaskPriority({
            applicantId:
              req.params.id,

            noteId:
              req.params.noteId,

            priority:
              req.body?.priority,

            actor:
              applicantRequestActor(
                req
              ),
          });

        const activity =
          taskPriorityActivityForTransition({
            previousPriority:
              result.previousPriority,

            priority:
              result.priority,

            changed:
              result.changed,
          });

        if (activity) {
          await recordApplicantActivitySafely({
            recordActivity,

            logger:
              activityLogger,

            applicantId:
              req.params.id,

            type:
              activity.type,

            title:
              activity.title,

            occurredAt:
              new Date(),

            actor:
              applicantRequestActor(
                req
              ),

            source: {
              type:
                'internal_note',

              id:
                String(
                  result.note?._id ||
                  req.params.noteId
                ),
            },

            changes: [
              {
                field:
                  'task.priority',

                label:
                  'Task priority',

                before:
                  result.previousPriority,

                after:
                  result.priority,
              },
            ],

            metadata: {
              ...activity.metadata,

              previousStateKnown:
                result.previousStateKnown ===
                true,
            },
          });
        }

        return res.json({
          success: true,

          status:
            result.status,

          note:
            result.note,
        });
      } catch (error) {
        return sendError(
          res,
          error
        );
      }
    }
  );


  router.patch(
    '/:id/notes/:noteId/task-status',

    requireApplicantPermission(
      'applicant:notes:manage'
    ),

    async (req, res) => {
      try {
        const result =
          await setInternalTaskStatus({
            applicantId:
              req.params.id,

            noteId:
              req.params.noteId,

            taskStatus:
              req.body?.taskStatus,

            actor:
              applicantRequestActor(
                req
              ),
          });

        const activity =
          taskStatusActivityForTransition({
            previousTaskStatus:
              result.previousTaskStatus,

            taskStatus:
              result.taskStatus,

            changed:
              result.changed,
          });

        if (activity) {
          await recordApplicantActivitySafely({
            recordActivity,

            logger:
              activityLogger,

            applicantId:
              req.params.id,

            type:
              activity.type,

            title:
              activity.title,

            occurredAt:
              activity.type ===
                'task.completed'
                ? (
                    result.note
                      ?.completedAt ||
                    new Date()
                  )
                : new Date(),

            actor:
              applicantRequestActor(
                req
              ),

            source: {
              type:
                'internal_note',

              id:
                String(
                  result.note?._id ||
                  req.params.noteId
                ),
            },

            changes: [
              {
                field:
                  'task.status',

                label:
                  'Task status',

                before:
                  result.previousTaskStatus,

                after:
                  result.taskStatus,
              },
            ],

            metadata: {
              ...activity.metadata,

              previousStateKnown:
                result.previousStateKnown ===
                true,
            },
          });
        }

        return res.json({
          success: true,
          note:
            result.note,
        });
      } catch (error) {
        return sendError(
          res,
          error
        );
      }
    }
  );


  router.patch(
    '/:id/notes/:noteId/schedule',

    requireApplicantPermission(
      'applicant:notes:manage'
    ),

    async (req, res) => {
      try {
        const result =
          await updateInternalNoteSchedule({
            applicantId:
              req.params.id,

            noteId:
              req.params.noteId,

            schedule:
              req.body?.schedule ??
              {},

            actor:
              applicantRequestActor(
                req
              ),
          });

        const kind =
          result.note?.kind ===
            'task'
            ? 'task'
            : 'note';

        await recordApplicantActivitySafely({
          recordActivity,
          logger:
            activityLogger,

          applicantId:
            req.params.id,

          type:
            `${kind}.updated`,

          title:
            kind === 'task'
              ? 'Internal task schedule updated'
              : 'Internal note reminder updated',

          occurredAt:
            new Date(),

          actor:
            applicantRequestActor(
              req
            ),

          source: {
            type:
              'internal_note',

            id:
              String(
                result.note?._id ||
                req.params.noteId
              ),
          },

          changes:
            result.auditChanges ||
            [],

          metadata: {
            previousStateKnown:
              result.previousStateKnown ===
              true,

            startAt:
              result.note
                ?.schedule
                ?.startAt ||
              null,

            endAt:
              result.note
                ?.schedule
                ?.endAt ||
              null,

            reminderAt:
              result.note
                ?.schedule
                ?.reminderAt ||
              null,
          },
        });

        return res.json({
          success: true,
          note:
            result.note,
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
   * EXPLICIT INTERNAL NOTE / TASK CALENDAR SYNC
   * ==================================================
   *
   * These endpoints are the only API surface that
   * may synchronize an internal item with Google
   * Calendar.
   *
   * Saving/editing a note, task, date, or reminder
   * never performs an external Calendar write.
   */


  /*
   * POST /api/applicants/:id/notes/:noteId/calendar
   *
   * Explicitly create a Google Calendar event.
   */
  router.post(
    '/:id/notes/:noteId/calendar',

    requireApplicantPermission(
      'applicant:notes:manage'
    ),

    async (req, res) => {
      try {
        const result =
          await addInternalItemToCalendar({
            applicantId:
              req.params.id,

            noteId:
              req.params.noteId,

            timezone:
              req.body?.timezone ||
              'UTC',

            actor:
              applicantRequestActor(
                req
              ),
          });

        const kind =
          result.note?.kind ===
            'task'
            ? 'task'
            : 'note';

        await recordApplicantActivitySafely({
          recordActivity,
          logger:
            activityLogger,

          applicantId:
            req.params.id,

          type:
            `${kind}.calendar_added`,

          title:
            kind === 'task'
              ? 'Internal task added to Calendar'
              : 'Internal note added to Calendar',

          occurredAt:
            new Date(),

          actor:
            applicantRequestActor(
              req
            ),

          source: {
            type:
              'internal_note',

            id:
              String(
                result.note?._id ||
                req.params.noteId
              ),
          },

          metadata: {
            provider:
              result.note
                ?.calendar
                ?.provider ||
              'google_calendar',

            syncStatus:
              result.note
                ?.calendar
                ?.syncStatus ||
              'synced',
          },
        });

        return res
          .status(201)
          .json({
            success: true,

            note:
              result.note,
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
   * PATCH /api/applicants/:id/notes/:noteId/calendar
   *
   * Explicitly update the already-linked event.
   */
  router.patch(
    '/:id/notes/:noteId/calendar',

    requireApplicantPermission(
      'applicant:notes:manage'
    ),

    async (req, res) => {
      try {
        const result =
          await updateInternalItemCalendar({
            applicantId:
              req.params.id,

            noteId:
              req.params.noteId,

            timezone:
              req.body?.timezone ||
              'UTC',

            actor:
              applicantRequestActor(
                req
              ),
          });

        const kind =
          result.note?.kind ===
            'task'
            ? 'task'
            : 'note';

        await recordApplicantActivitySafely({
          recordActivity,
          logger:
            activityLogger,

          applicantId:
            req.params.id,

          type:
            `${kind}.calendar_updated`,

          title:
            kind === 'task'
              ? 'Internal task Calendar event updated'
              : 'Internal note Calendar event updated',

          occurredAt:
            new Date(),

          actor:
            applicantRequestActor(
              req
            ),

          source: {
            type:
              'internal_note',

            id:
              String(
                result.note?._id ||
                req.params.noteId
              ),
          },

          metadata: {
            provider:
              result.note
                ?.calendar
                ?.provider ||
              'google_calendar',

            syncStatus:
              result.note
                ?.calendar
                ?.syncStatus ||
              'synced',
          },
        });

        return res.json({
          success: true,

          note:
            result.note,
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
   * DELETE /api/applicants/:id/notes/:noteId/calendar
   *
   * Explicitly remove the linked Google event.
   *
   * This is also allowed for archived records by
   * the synchronization service so external cleanup
   * remains possible before permanent deletion.
   */
  router.delete(
    '/:id/notes/:noteId/calendar',

    requireApplicantPermission(
      'applicant:notes:manage'
    ),

    async (req, res) => {
      try {
        const result =
          await removeInternalItemFromCalendar({
            applicantId:
              req.params.id,

            noteId:
              req.params.noteId,

            actor:
              applicantRequestActor(
                req
              ),
          });

        const kind =
          result.note?.kind ===
            'task'
            ? 'task'
            : 'note';

        await recordApplicantActivitySafely({
          recordActivity,
          logger:
            activityLogger,

          applicantId:
            req.params.id,

          type:
            `${kind}.calendar_removed`,

          title:
            kind === 'task'
              ? 'Internal task removed from Calendar'
              : 'Internal note removed from Calendar',

          occurredAt:
            new Date(),

          actor:
            applicantRequestActor(
              req
            ),

          source: {
            type:
              'internal_note',

            id:
              String(
                result.note?._id ||
                req.params.noteId
              ),
          },

          metadata: {
            provider:
              'google_calendar',

            syncStatus:
              'not_synced',
          },
        });

        return res.json({
          success: true,

          note:
            result.note,
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
   * Replies
   */

  router.get(
    '/:id/notes/:noteId/replies',

    requireApplicantPermission(
      'applicant:notes:view'
    ),

    async (req, res) => {
      try {
        const result =
          await listInternalNoteReplies({
            applicantId:
              req.params.id,

            noteId:
              req.params.noteId,

            includeArchived:
              req.query
                ?.includeArchived ===
              'true',
          });

        return res.json({
          success: true,
          replies:
            result.replies,
        });
      } catch (error) {
        return sendError(
          res,
          error
        );
      }
    }
  );


  router.post(
    '/:id/notes/:noteId/replies',

    requireApplicantPermission(
      'applicant:notes:manage'
    ),

    async (req, res) => {
      try {
        const result =
          await createInternalNoteReply({
            applicantId:
              req.params.id,

            noteId:
              req.params.noteId,

            content:
              req.body?.content,

            actor:
              applicantRequestActor(
                req
              ),
          });

        await recordApplicantActivitySafely({
          recordActivity,
          logger:
            activityLogger,

          applicantId:
            req.params.id,

          type:
            'note.reply_created',

          title:
            'Internal note/task reply added',

          occurredAt:
            new Date(),

          actor:
            applicantRequestActor(
              req
            ),

          source: {
            type:
              'internal_note_reply',

            id:
              String(
                result.reply?._id ||
                ''
              ),
          },

          metadata: {
            noteId:
              req.params.noteId,
          },
        });

        return res
          .status(201)
          .json({
            success: true,
            reply:
              result.reply,
          });
      } catch (error) {
        return sendError(
          res,
          error
        );
      }
    }
  );


  router.patch(
    '/:id/notes/:noteId/replies/:replyId',

    requireApplicantPermission(
      'applicant:notes:manage'
    ),

    async (req, res) => {
      try {
        const result =
          await updateInternalNoteReply({
            applicantId:
              req.params.id,

            noteId:
              req.params.noteId,

            replyId:
              req.params.replyId,

            content:
              req.body?.content,

            actor:
              applicantRequestActor(
                req
              ),
          });

        await recordApplicantActivitySafely({
          recordActivity,
          logger:
            activityLogger,

          applicantId:
            req.params.id,

          type:
            'note.reply_updated',

          title:
            'Internal reply updated',

          occurredAt:
            new Date(),

          actor:
            applicantRequestActor(
              req
            ),

          source: {
            type:
              'internal_note_reply',

            id:
              String(
                result.reply?._id ||
                req.params.replyId
              ),
          },

          metadata: {
            noteId:
              req.params.noteId,
          },
        });

        return res.json({
          success: true,
          reply:
            result.reply,
        });
      } catch (error) {
        return sendError(
          res,
          error
        );
      }
    }
  );


  router.post(
    '/:id/notes/:noteId/replies/:replyId/archive',

    requireApplicantPermission(
      'applicant:notes:manage'
    ),

    async (req, res) => {
      try {
        const result =
          await archiveInternalNoteReply({
            applicantId:
              req.params.id,

            noteId:
              req.params.noteId,

            replyId:
              req.params.replyId,

            actor:
              applicantRequestActor(
                req
              ),
          });

        await recordApplicantActivitySafely({
          recordActivity,
          logger:
            activityLogger,

          applicantId:
            req.params.id,

          type:
            'note.reply_archived',

          title:
            'Internal reply archived',

          occurredAt:
            result.reply
              ?.archivedAt ||
            new Date(),

          actor:
            applicantRequestActor(
              req
            ),

          source: {
            type:
              'internal_note_reply',

            id:
              String(
                result.reply?._id ||
                req.params.replyId
              ),
          },

          metadata: {
            noteId:
              req.params.noteId,
          },
        });

        return res.json({
          success: true,
          reply:
            result.reply,
        });
      } catch (error) {
        return sendError(
          res,
          error
        );
      }
    }
  );


  router.post(
    '/:id/notes/:noteId/replies/:replyId/restore',

    requireApplicantPermission(
      'applicant:notes:manage'
    ),

    async (req, res) => {
      try {
        const result =
          await restoreInternalNoteReply({
            applicantId:
              req.params.id,

            noteId:
              req.params.noteId,

            replyId:
              req.params.replyId,

            actor:
              applicantRequestActor(
                req
              ),
          });

        await recordApplicantActivitySafely({
          recordActivity,
          logger:
            activityLogger,

          applicantId:
            req.params.id,

          type:
            'note.reply_restored',

          title:
            'Internal reply restored',

          occurredAt:
            new Date(),

          actor:
            applicantRequestActor(
              req
            ),

          source: {
            type:
              'internal_note_reply',

            id:
              String(
                result.reply?._id ||
                req.params.replyId
              ),
          },

          metadata: {
            noteId:
              req.params.noteId,
          },
        });

        return res.json({
          success: true,
          reply:
            result.reply,
        });
      } catch (error) {
        return sendError(
          res,
          error
        );
      }
    }
  );


  router.delete(
    '/:id/notes/:noteId/replies/:replyId/permanent',

    requireApplicantPermission(
      'applicant:notes:manage'
    ),

    async (req, res) => {
      try {
        const result =
          await permanentlyDeleteInternalNoteReply({
            applicantId:
              req.params.id,

            noteId:
              req.params.noteId,

            replyId:
              req.params.replyId,

            confirmation:
              req.body?.confirmation,
          });

        await recordApplicantActivitySafely({
          recordActivity,
          logger:
            activityLogger,

          applicantId:
            req.params.id,

          type:
            'note.reply_permanently_deleted',

          title:
            'Internal reply permanently deleted',

          occurredAt:
            new Date(),

          actor:
            applicantRequestActor(
              req
            ),

          source: {
            type:
              'internal_note_reply',

            id:
              result.replyId,
          },

          metadata: {
            noteId:
              req.params.noteId,
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
   * PUT /api/applicants/:id/tags
   *
   * Reuses Applicant.recruitment.tags.
   */
  router.put(
    '/:id/tags',

    requireApplicantPermission(
      'applicant:notes:manage'
    ),

    async (req, res) => {
      try {
        const result =
          await replaceTags({
            applicantId:
              req.params.id,

            tags:
              req.body?.tags,
          });

        await recordApplicantActivitySafely({
          recordActivity,
          logger:
            activityLogger,

          applicantId:
            result.applicantId,

          type:
            'profile.tags_updated',

          title:
            'Applicant tags updated',

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

          changes: [
            {
              field:
                'recruitment.tags',

              label:
                'Applicant tags',

              before:
                result.previousTags,

              after:
                result.tags,
            },
          ],

          metadata: {
            previousTags:
              result.previousTags,

            tags:
              result.tags,
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
   * GET /api/applicants/:id/audit
   *
   * Paginated audit and change history.
   *
   * Uses the same append-only ApplicantActivity
   * collection as the Activity timeline, while
   * exposing structured actors, actions, and
   * before/after changes for administrative review.
   */
  router.get(
    '/:id/audit',

    requireApplicantPermission(
      'applicant:view'
    ),

    async (req, res) => {
      try {
        const result =
          await getApplicantAuditHistory({
            applicantId:
              req.params.id,

            category:
              req.query?.category,

            action:
              req.query?.action,

            actorId:
              req.query?.actorId,

            from:
              req.query?.from,

            to:
              req.query?.to,

            page:
              req.query?.page,

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

          changes:
            result.auditChanges ||
            [],

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

            changes: [
              {
                field:
                  'recruitment.status',

                label:
                  'Recruitment status',

                before:
                  result.previousStatus,

                after:
                  result.currentStatus,
              },
            ],

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

          changes: [
            {
              field:
                'lifecycle.archived',

              label:
                'Applicant archived',

              before:
                false,

              after:
                true,
            },
          ],

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

          changes: [
            {
              field:
                'lifecycle.archived',

              label:
                'Applicant archived',

              before:
                true,

              after:
                false,
            },
          ],
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
   * DELETE /api/applicants/:id/permanent
   *
   * Permanent deletion is available only
   * for an already archived Applicant.
   *
   * Immutable ApplicantFormSubmission
   * records remain preserved.
   */
  router.delete(
    '/:id/permanent',

    requireApplicantPermission(
      'applicant:delete'
    ),

    async (req, res) => {
      try {
        const result =
          await permanentlyDelete({
            applicantId:
              req.params.id,

            confirmation:
              req.body
                ?.confirmation,
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

        const approval =
          await approveProfile({
            applicantId:
              req.params.id,

            submissionId,

            fields,

            includeAuditResult:
              true,
          });

        /*
         * Preserve compatibility with injected
         * approveProfile implementations that
         * still return the original result.
         */
        const hasAuditEnvelope =
          approval &&
          typeof approval ===
            'object' &&
          Object.prototype
            .hasOwnProperty
            .call(
              approval,
              'result'
            );

        const result =
          hasAuditEnvelope
            ? approval.result
            : approval;

        const auditChanges =
          hasAuditEnvelope &&
          Array.isArray(
            approval
              ?.auditChanges
          )
            ? approval
                .auditChanges
            : [];


        /*
         * Only the precise Audit-capable service
         * emits profile.approved here.
         *
         * Manual profile editing continues to use
         * profile.updated in its own route.
         */
        if (hasAuditEnvelope) {
          await recordApplicantActivitySafely({
            recordActivity,

            logger:
              activityLogger,

            applicantId:
              result
                ?.applicantId ||
              req.params.id,

            type:
              'profile.approved',

            title:
              'Applicant profile fields approved',

            occurredAt:
              new Date(),

            actor:
              applicantRequestActor(
                req
              ),

            source: {
              type:
                'submission',

              id:
                result
                  ?.submissionId ||
                submissionId ||
                '',
            },

            changes:
              auditChanges,

            metadata: {
              approvedFields:
                result
                  ?.approvedFields ||
                [],

              changedFieldCount:
                auditChanges.length,
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

        /*
         * Only record a relationship mutation.
         *
         * `already-linked` is intentionally
         * idempotent and must not create a
         * second Audit event.
         */
        if (
          result?.status ===
          'linked'
        ) {
          await recordApplicantActivitySafely({
            recordActivity,

            logger:
              activityLogger,

            applicantId:
              req.params.id,

            type:
              'submission.linked',

            title:
              'Submission linked to Applicant',

            occurredAt:
              new Date(),

            actor:
              applicantRequestActor(
                req
              ),

            source: {
              type:
                'submission',

              id:
                result
                  ?.submissionId ||
                req.params
                  .submissionId,
            },

            changes: [
              {
                field:
                  'submission.applicantId',

                label:
                  'Linked Applicant',

                before:
                  null,

                after:
                  result
                    ?.applicantId ||
                  req.params.id,
              },
            ],

            metadata: {
              linkStatus:
                result.status,
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
  /*
   * GET /api/applicants/calendar/events
   *
   * Read-only operational Calendar aggregation.
   *
   * IMPORTANT:
   * This endpoint only reads OMAH records.
   * It never creates, updates, or deletes an
   * external Google Calendar event.
   */
  router.get(
    '/calendar/events',

    requireApplicantPermission(
      'applicant:view'
    ),

    async (req, res) => {
      try {
        const result =
          await getCalendarEvents({
            from:
              req.query?.from,

            to:
              req.query?.to,

            sourceTypes:
              req.query?.sourceTypes,

            statuses:
              req.query?.statuses,

            syncStatuses:
              req.query?.syncStatuses,

            owner:
              req.query?.owner,
          });

        return res.json({
          success:
            true,

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

