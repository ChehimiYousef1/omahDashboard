'use strict';

const express = require('express');

const Applicant =
  require('../../models/Applicant');

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
  approveProfileFieldsFromSubmission,
} = require(
  '../../services/applicantProfileService'
);

const {
  checkApplicantRelationshipIntegrity,
} = require(
  '../../services/applicantRelationshipService'
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

  linkSubmission =
    linkSubmissionToApplicant,

  approveProfile =
    approveProfileFieldsFromSubmission,

  checkRelationships =
    checkApplicantRelationshipIntegrity,
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
   */
  router.get(
    '/',

    requireApplicantPermission(
      'applicant:view'
    ),

    async (req, res) => {
      try {
        const archived =
          String(
            req.query.archived ||
              'false'
          ).toLowerCase();

        const filter = {};

        if (
          archived === 'true'
        ) {
          filter[
            'lifecycle.archived'
          ] = true;
        } else if (
          archived !== 'all'
        ) {
          filter[
            'lifecycle.archived'
          ] = {
            $ne: true,
          };
        }

        const parsedLimit =
          Number.parseInt(
            req.query.limit,
            10
          );

        const limit =
          Number.isFinite(
            parsedLimit
          )
            ? Math.min(
                Math.max(
                  parsedLimit,
                  1
                ),
                200
              )
            : 50;

        const applicants =
          await ApplicantModel
            .find(filter)
            .sort({
              'recruitment.lastActivityAt':
                -1,

              updatedAt: -1,
            })
            .limit(limit)
            .lean();

        return res.json({
          success: true,
          applicants,
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
        const submissions =
          await getSubmissions({
            applicantId:
              req.params.id,
          });

        return res.json({
          success: true,
          submissions,
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

