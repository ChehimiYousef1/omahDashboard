'use strict';

const express =
  require('express');

const Applicant =
  require(
    '../../models/Applicant'
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

    ...services,
  };

  const router =
    express.Router();


  /*
   * Static/category routes intentionally come
   * before future /:applicantId membership routes.
   */


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


  return router;
}


module.exports =
  createApplicantTalentPoolRouter;

module.exports.sendTalentPoolError =
  sendTalentPoolError;
