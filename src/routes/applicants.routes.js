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
} = require(
  '../../services/applicantInterviewService'
);


const {
  checkApplicantInterviewAvailability,
} = require(
  '../../services/applicantInterviewAvailabilityService'
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

const CONFLICT_CODES =
  new Set([
    'INTERVIEW_STATUS_CONFLICT',
    'INTERVIEW_NOT_EDITABLE',
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
| Applicant Router
|--------------------------------------------------------------------------
*/

module.exports =
function createApplicantRouter({
  requireApplicantPermission,

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

            meetingLink:
              req.body
                ?.meetingLink ||
              '',

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

            meetingLink:
              req.body
                ?.meetingLink,

            location:
              req.body
                ?.location,

            participants:
              req.body
                ?.participants,

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

