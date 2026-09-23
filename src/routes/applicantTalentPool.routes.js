'use strict';

const express =
  require('express');

const Applicant =
  require(
    '../../models/Applicant'
  );

const {
  listTalentPoolMemberships,
  getTalentPoolMembership,
  addTalentPoolMembership,
  replaceTalentPoolMembership,
  patchTalentPoolMembership,
  removeTalentPoolMembership,
  restoreTalentPoolMembership,
  completeTalentPoolReview,
  scheduleTalentPoolReview,
  getTalentPoolDiscoveryOptions,
  getTalentPoolAnalytics,
} =
  require(
    '../../services/applicantTalentPoolService'
  );


const {
  listTalentPoolCategories,
  getTalentPoolCategory,
  createTalentPoolCategory,
  replaceTalentPoolCategory,
  patchTalentPoolCategory,
  archiveTalentPoolCategory,
  restoreTalentPoolCategory,
} =
  require(
    '../../services/applicantTalentPoolCategoryService'
  );


function sendTalentPoolError(
  res,
  error
) {
  const code =
    error?.code || '';

  if (
    code ===
      'INVALID_APPLICANT_ID' ||
    code ===
      'INVALID_TALENT_POOL_SEARCH' ||
    code ===
      'INVALID_TALENT_POOL_REVIEW_INPUT' ||
    code ===
      'INVALID_TALENT_POOL_REVIEW_DATE' ||
    code ===
      'TALENT_POOL_REVIEW_DATE_REQUIRED' ||
    code ===
      'TALENT_POOL_REVIEW_DATE_PAST' ||
    code ===
      'INVALID_TALENT_POOL_INPUT' ||
    code ===
      'INVALID_TALENT_POOL_CATEGORY_ID' ||
    code ===
      'INVALID_TALENT_POOL_CATEGORY'
  ) {
    return res
      .status(400)
      .json({
        success: false,
        error: error.message,
      });
  }

  if (
    code ===
      'APPLICANT_NOT_FOUND' ||
    code ===
      'TALENT_POOL_MEMBERSHIP_NOT_FOUND' ||
    code ===
      'TALENT_POOL_CATEGORY_NOT_FOUND'
  ) {
    return res
      .status(404)
      .json({
        success: false,
        error: error.message,
      });
  }

  if (
    code ===
      'APPLICANT_ARCHIVED' ||
    code ===
      'TALENT_POOL_MEMBERSHIP_CONFLICT' ||
    code ===
      'TALENT_POOL_CATEGORY_CONFLICT' ||
    code ===
      'TALENT_POOL_CATEGORY_IN_USE'
  ) {
    return res
      .status(409)
      .json({
        success: false,
        error: error.message,
      });
  }

  console.error(
    'Applicant Talent Pool error:',
    error
  );

  return res
    .status(500)
    .json({
      success: false,
      error:
        'Talent Pool request failed.',
    });
}


function parseBoolean(value) {
  return String(
    value ?? ''
  )
    .trim()
    .toLowerCase() === 'true';
}


function createApplicantTalentPoolRouter({
  requireAdmin,
  requireApplicantPermission,
  services = {},
} = {}) {
  if (
    typeof requireAdmin !== 'function'
  ) {
    throw new TypeError(
      'requireAdmin is required'
    );
  }

  if (
    typeof requireApplicantPermission !==
    'function'
  ) {
    throw new TypeError(
      'requireApplicantPermission is required'
    );
  }

  const api = {
    listTalentPoolCategories,
    getTalentPoolCategory,
    createTalentPoolCategory,
    replaceTalentPoolCategory,
    patchTalentPoolCategory,
    archiveTalentPoolCategory,
    restoreTalentPoolCategory,

    listTalentPoolMemberships,
    getTalentPoolMembership,
    addTalentPoolMembership,
    replaceTalentPoolMembership,
    patchTalentPoolMembership,
    removeTalentPoolMembership,
    restoreTalentPoolMembership,

    completeTalentPoolReview,
    scheduleTalentPoolReview,
    getTalentPoolDiscoveryOptions,
    getTalentPoolAnalytics,

    ...services,
  };

  const router =
    express.Router();


  /*
   * GET /api/applicants/talent-pool
   *
   * Server-side Talent Pool discovery:
   * search, filtering, sorting, and pagination.
   */
  router.get(
    '/',

    requireApplicantPermission(
      'applicant:view'
    ),

    async (req, res) => {
      try {
        const result =
          await api
            .listTalentPoolMemberships({
              query:
                req.query,
            });

        return res.json({
          success:
            true,

          talent:
            result.talent,

          pagination:
            result.pagination,

          filters:
            result.filters,
        });
      } catch (error) {
        return sendTalentPoolError(
          res,
          error
        );
      }
    }
  );


  /*
   * Static/category routes intentionally come
   * before future /:applicantId membership routes.
   */


  router.get(
    '/options',
    requireApplicantPermission('applicant:view'),
    async (req, res) => {
      try {
        const options = await api.getTalentPoolDiscoveryOptions();
        return res.json({ success: true, options });
      } catch (error) { return sendTalentPoolError(res, error); }
    }
  );

  router.get(
    '/analytics',
    requireApplicantPermission('applicant:view'),
    async (req, res) => {
      try {
        const analytics = await api.getTalentPoolAnalytics();
        return res.json({ success: true, analytics });
      } catch (error) { return sendTalentPoolError(res, error); }
    }
  );

  router.get(
    '/categories',

    requireApplicantPermission(
      'applicant:view'
    ),

    async (req, res) => {
      try {
        const categories =
          await api
            .listTalentPoolCategories({
              includeArchived:
                parseBoolean(
                  req.query.includeArchived
                ),
            });

        return res.json({
          success: true,
          categories,
        });
      } catch (error) {
        return sendTalentPoolError(
          res,
          error
        );
      }
    }
  );


  router.get(
    '/categories/:categoryId',

    requireApplicantPermission(
      'applicant:view'
    ),

    async (req, res) => {
      try {
        const category =
          await api
            .getTalentPoolCategory({
              categoryId:
                req.params.categoryId,

              includeArchived:
                true,
            });

        return res.json({
          success: true,
          category,
        });
      } catch (error) {
        return sendTalentPoolError(
          res,
          error
        );
      }
    }
  );


  router.post(
    '/categories',

    requireAdmin,

    async (req, res) => {
      try {
        const category =
          await api
            .createTalentPoolCategory({
              input: req.body,
              actor: req.user,
            });

        return res
          .status(201)
          .json({
            success: true,
            category,
          });
      } catch (error) {
        return sendTalentPoolError(
          res,
          error
        );
      }
    }
  );


  router.put(
    '/categories/:categoryId',

    requireAdmin,

    async (req, res) => {
      try {
        const category =
          await api
            .replaceTalentPoolCategory({
              categoryId:
                req.params.categoryId,

              input:
                req.body,

              actor:
                req.user,
            });

        return res.json({
          success: true,
          category,
        });
      } catch (error) {
        return sendTalentPoolError(
          res,
          error
        );
      }
    }
  );


  router.patch(
    '/categories/:categoryId',

    requireAdmin,

    async (req, res) => {
      try {
        const category =
          await api
            .patchTalentPoolCategory({
              categoryId:
                req.params.categoryId,

              input:
                req.body,

              actor:
                req.user,
            });

        return res.json({
          success: true,
          category,
        });
      } catch (error) {
        return sendTalentPoolError(
          res,
          error
        );
      }
    }
  );


  router.delete(
    '/categories/:categoryId',

    requireAdmin,

    async (req, res) => {
      try {
        const category =
          await api
            .archiveTalentPoolCategory({
              categoryId:
                req.params.categoryId,

              actor:
                req.user,

              ApplicantModel:
                Applicant,
            });

        return res.json({
          success: true,
          category,
        });
      } catch (error) {
        return sendTalentPoolError(
          res,
          error
        );
      }
    }
  );


  router.post(
    '/categories/:categoryId/restore',

    requireAdmin,

    async (req, res) => {
      try {
        const category =
          await api
            .restoreTalentPoolCategory({
              categoryId:
                req.params.categoryId,

              actor:
                req.user,
            });

        return res.json({
          success: true,
          category,
        });
      } catch (error) {
        return sendTalentPoolError(
          res,
          error
        );
      }
    }
  );



  /*
   * ==================================================
   * Talent Pool Membership
   * ==================================================
   *
   * Static category routes remain above these
   * dynamic Applicant routes.
   */


  /*
   * GET /api/applicants/talent-pool/:applicantId
   */
  router.get(
    '/:applicantId',

    requireApplicantPermission(
      'applicant:view'
    ),

    async (req, res) => {
      try {
        const talent =
          await api
            .getTalentPoolMembership({
              applicantId:
                req.params
                  .applicantId,
            });

        return res.json({
          success:
            true,

          talent,
        });
      } catch (error) {
        return sendTalentPoolError(
          res,
          error
        );
      }
    }
  );


  /*
   * POST /api/applicants/talent-pool/:applicantId
   *
   * Add Applicant to Talent Pool.
   */
  router.post(
    '/:applicantId',

    requireApplicantPermission(
      'applicant:talent-pool:manage'
    ),

    async (req, res) => {
      try {
        const talent =
          await api
            .addTalentPoolMembership({
              applicantId:
                req.params
                  .applicantId,

              input:
                req.body,

              actor:
                req.user,
            });

        return res
          .status(201)
          .json({
            success:
              true,

            talent,
          });
      } catch (error) {
        return sendTalentPoolError(
          res,
          error
        );
      }
    }
  );


  /*
   * PUT /api/applicants/talent-pool/:applicantId
   *
   * Full editable membership replacement.
   */
  router.put(
    '/:applicantId',

    requireApplicantPermission(
      'applicant:talent-pool:manage'
    ),

    async (req, res) => {
      try {
        const talent =
          await api
            .replaceTalentPoolMembership({
              applicantId:
                req.params
                  .applicantId,

              input:
                req.body,

              actor:
                req.user,
            });

        return res.json({
          success:
            true,

          talent,
        });
      } catch (error) {
        return sendTalentPoolError(
          res,
          error
        );
      }
    }
  );


  /*
   * PATCH /api/applicants/talent-pool/:applicantId
   *
   * Partial membership update.
   */
  router.patch(
    '/:applicantId',

    requireApplicantPermission(
      'applicant:talent-pool:manage'
    ),

    async (req, res) => {
      try {
        const talent =
          await api
            .patchTalentPoolMembership({
              applicantId:
                req.params
                  .applicantId,

              input:
                req.body,

              actor:
                req.user,
            });

        return res.json({
          success:
            true,

          talent,
        });
      } catch (error) {
        return sendTalentPoolError(
          res,
          error
        );
      }
    }
  );


  /*
   * DELETE /api/applicants/talent-pool/:applicantId
   *
   * Soft-remove Talent Pool membership only.
   * NEVER deletes the Applicant.
   */
  router.delete(
    '/:applicantId',

    requireApplicantPermission(
      'applicant:talent-pool:manage'
    ),

    async (req, res) => {
      try {
        const talent =
          await api
            .removeTalentPoolMembership({
              applicantId:
                req.params
                  .applicantId,

              reason:
                req.body
                  ?.removalReason ??
                req.body
                  ?.reason ??
                '',

              actor:
                req.user,
            });

        return res.json({
          success:
            true,

          talent,
        });
      } catch (error) {
        return sendTalentPoolError(
          res,
          error
        );
      }
    }
  );


  /*
   * POST
   * /api/applicants/talent-pool/:applicantId/restore
   */
  router.post(
    '/:applicantId/restore',

    requireApplicantPermission(
      'applicant:talent-pool:manage'
    ),

    async (req, res) => {
      try {
        const talent =
          await api
            .restoreTalentPoolMembership({
              applicantId:
                req.params
                  .applicantId,

              actor:
                req.user,
            });

        return res.json({
          success:
            true,

          talent,
        });
      } catch (error) {
        return sendTalentPoolError(
          res,
          error
        );
      }
    }
  );



  /*
   * ==================================================
   * Talent Pool Review / Revisit Workflow
   * ==================================================
   */


  /*
   * POST
   * /api/applicants/talent-pool/:applicantId/review
   *
   * Marks the Talent Pool review as completed.
   *
   * Optional:
   *   nextReviewAt
   *
   * No Task or external Calendar event is created.
   */
  router.post(
    '/:applicantId/review',

    requireApplicantPermission(
      'applicant:talent-pool:manage'
    ),

    async (req, res) => {
      try {
        const talent =
          await api
            .completeTalentPoolReview({
              applicantId:
                req.params
                  .applicantId,

              input:
                req.body ||
                {},

              actor:
                req.user,
            });

        return res.json({
          success:
            true,

          talent,
        });
      } catch (error) {
        return sendTalentPoolError(
          res,
          error
        );
      }
    }
  );


  /*
   * POST
   * /api/applicants/talent-pool/:applicantId/review/schedule
   *
   * Explicitly schedules the next Talent Pool review.
   *
   * This does NOT:
   *   - mark the review completed
   *   - create an Applicant Task
   *   - create/update Google Calendar
   */
  router.post(
    '/:applicantId/review/schedule',

    requireApplicantPermission(
      'applicant:talent-pool:manage'
    ),

    async (req, res) => {
      try {
        const talent =
          await api
            .scheduleTalentPoolReview({
              applicantId:
                req.params
                  .applicantId,

              input:
                req.body ||
                {},

              actor:
                req.user,
            });

        return res.json({
          success:
            true,

          talent,
        });
      } catch (error) {
        return sendTalentPoolError(
          res,
          error
        );
      }
    }
  );


  return router;
}


module.exports =
  createApplicantTalentPoolRouter;

module.exports.sendTalentPoolError =
  sendTalentPoolError;
