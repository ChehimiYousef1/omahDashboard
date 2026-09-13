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

/*
|--------------------------------------------------------------------------
| API Error Mapping
|--------------------------------------------------------------------------
*/

const NOT_FOUND_CODES =
  new Set([
    'APPLICANT_NOT_FOUND',
    'SUBMISSION_NOT_FOUND',
    'APPROVED_SUBMISSION_NOT_FOUND',
    'DUPLICATE_CASE_NOT_FOUND',
  ]);

const CONFLICT_CODES =
  new Set([
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

