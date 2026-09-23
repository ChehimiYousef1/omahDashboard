'use strict';

/*
 * B5H — Applicant Talent Pool Audit recorder
 *
 * Reuses the existing ApplicantActivity / Audit & History
 * infrastructure. No second Talent Pool history store exists.
 */
const {
  recordApplicantActivity,
} = require(
  '../../services/applicantActivityService'
);


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




/*
|--------------------------------------------------------------------------
| B5H — Talent Pool Applicant Audit helpers
|--------------------------------------------------------------------------
|
| Applicant remains the source of truth.
| Audit events are written to the existing ApplicantActivity stream.
| Free-text retention/removal reason content is never copied into
| structured Audit history; only safe booleans are recorded.
|
*/

const TALENT_POOL_AUDIT_FIELDS =
  Object.freeze([
    {
      key:
        'active',

      field:
        'talentPool.active',

      label:
        'Active membership',
    },

    {
      key:
        'categoryId',

      field:
        'talentPool.categoryId',

      label:
        'Category',
    },

    {
      key:
        'roles',

      field:
        'talentPool.roles',

      label:
        'Roles',
    },

    {
      key:
        'priority',

      field:
        'talentPool.priority',

      label:
        'Priority',
    },

    {
      key:
        'ownerId',

      field:
        'talentPool.ownerId',

      label:
        'Owner',
    },

    {
      key:
        'nextReviewAt',

      field:
        'talentPool.nextReviewAt',

      label:
        'Next review',
    },

    {
      key:
        'lastReviewedAt',

      field:
        'talentPool.lastReviewedAt',

      label:
        'Last reviewed',
    },

    {
      key:
        'reviewStatus',

      field:
        'talentPool.reviewStatus',

      label:
        'Review status',
    },

    {
      key:
        'reasonProvided',

      field:
        'talentPool.reasonProvided',

      label:
        'Retention reason provided',
    },
  ]);


function talentPoolAuditText(
  value
) {
  return String(
    value ?? ''
  ).trim();
}


function talentPoolAuditDate(
  value
) {
  if (!value) {
    return null;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date.toISOString();
}


function talentPoolAuditReviewStatus(
  source = {},
  now = new Date()
) {
  if (
    source.active !==
    true
  ) {
    return 'inactive';
  }

  const next =
    source.nextReviewAt
      ? new Date(
          source.nextReviewAt
        )
      : null;

  if (
    !next ||
    Number.isNaN(
      next.getTime()
    )
  ) {
    return source.lastReviewedAt
      ? 'reviewed'
      : 'not_scheduled';
  }

  const today =
    new Date(now);

  today.setHours(
    0,
    0,
    0,
    0
  );

  const tomorrow =
    new Date(today);

  tomorrow.setDate(
    tomorrow.getDate() +
      1
  );

  if (
    next <
    today
  ) {
    return 'overdue';
  }

  if (
    next <
    tomorrow
  ) {
    return 'due';
  }

  return 'scheduled';
}


function talentPoolAuditSnapshot(
  applicant,
  {
    now =
      new Date(),
  } = {}
) {
  const source =
    applicant
      ?.talentPool ||
    {};

  return {
    active:
      source.active ===
      true,

    categoryId:
      source.categoryId
        ? String(
            source.categoryId
          )
        : null,

    roles:
      Array.isArray(
        source.roles
      )
        ? [
            ...source.roles,
          ]
        : [],

    priority:
      talentPoolAuditText(
        source.priority
      ) ||
      'normal',

    ownerId:
      talentPoolAuditText(
        source.ownerId
      ),

    nextReviewAt:
      talentPoolAuditDate(
        source.nextReviewAt
      ),

    lastReviewedAt:
      talentPoolAuditDate(
        source.lastReviewedAt
      ),

    reviewStatus:
      talentPoolAuditReviewStatus(
        source,
        now
      ),

    reasonProvided:
      Boolean(
        talentPoolAuditText(
          source.reason
        )
      ),
  };
}


function sameTalentPoolAuditValue(
  left,
  right
) {
  return (
    JSON.stringify(left) ===
    JSON.stringify(right)
  );
}


function talentPoolAuditChanges(
  before,
  after
) {
  const changes =
    [];

  for (
    const definition
    of TALENT_POOL_AUDIT_FIELDS
  ) {
    const previous =
      before
        ? before[
            definition.key
          ]
        : null;

    const next =
      after
        ? after[
            definition.key
          ]
        : null;

    if (
      sameTalentPoolAuditValue(
        previous,
        next
      )
    ) {
      continue;
    }

    changes.push({
      field:
        definition.field,

      label:
        definition.label,

      before:
        previous,

      after:
        next,
    });
  }

  return changes;
}


function talentPoolAuditDescriptor(
  method,
  pathValue
) {
  const verb =
    talentPoolAuditText(
      method
    ).toUpperCase();

  const path =
    `/${
      talentPoolAuditText(
        pathValue
      )
        .replace(
          /^\/+/,
          ''
        )
    }`
      .replace(
        /\/+$/,
        ''
      ) ||
    '/';

  if (
    verb ===
      'POST' &&
    path ===
      '/review/schedule'
  ) {
    return {
      type:
        'talent_pool.review_scheduled',

      title:
        'Talent Pool review scheduled',
    };
  }

  if (
    verb ===
      'POST' &&
    path ===
      '/review'
  ) {
    return {
      type:
        'talent_pool.review_completed',

      title:
        'Talent Pool review completed',
    };
  }

  if (
    verb ===
      'POST' &&
    path ===
      '/restore'
  ) {
    return {
      type:
        'talent_pool.restored',

      title:
        'Applicant restored to Talent Pool',
    };
  }

  if (
    verb ===
      'POST' &&
    (
      path === '/' ||
      path === ''
    )
  ) {
    return {
      type:
        'talent_pool.added',

      title:
        'Applicant added to Talent Pool',
    };
  }

  if (
    (
      verb ===
        'PUT' ||
      verb ===
        'PATCH'
    ) &&
    (
      path === '/' ||
      path === ''
    )
  ) {
    return {
      type:
        'talent_pool.updated',

      title:
        'Talent Pool membership updated',
    };
  }

  if (
    verb ===
      'DELETE' &&
    (
      path === '/' ||
      path === ''
    )
  ) {
    return {
      type:
        'talent_pool.removed',

      title:
        'Applicant removed from Talent Pool',
    };
  }

  return null;
}


function talentPoolAuditActor(
  user = {}
) {
  return {
    userId:
      talentPoolAuditText(
        user.id ||
        user._id
      ),

    name:
      talentPoolAuditText(
        user.name ||
        user.fullName
      ),

    email:
      talentPoolAuditText(
        user.email
      ),

    role:
      talentPoolAuditText(
        user.role
      ),
  };
}


async function readTalentPoolAuditApplicant({
  applicantId,
  ApplicantModel =
    Applicant,
} = {}) {
  if (!applicantId) {
    return null;
  }

  let query =
    ApplicantModel
      .findById(
        applicantId
      );

  if (
    query &&
    typeof query.select ===
      'function'
  ) {
    query =
      query.select(
        '_id talentPool'
      );
  }

  if (
    query &&
    typeof query.lean ===
      'function'
  ) {
    query =
      query.lean();
  }

  return query;
}


async function recordTalentPoolActivitySafely({
  recordActivity,
  logger =
    console,

  applicantId,
  descriptor,
  before,
  after,
  actor,
} = {}) {
  if (
    typeof recordActivity !==
      'function' ||
    !descriptor ||
    !applicantId
  ) {
    return;
  }

  try {
    const changes =
      talentPoolAuditChanges(
        before,
        after
      );

    await recordActivity({
      applicantId,

      type:
        descriptor.type,

      title:
        descriptor.title,

      description:
        '',

      occurredAt:
        new Date(),

      actor:
        actor ||
        {},

      source: {
        type:
          'talent_pool',

        id:
          String(
            applicantId
          ),
      },

      changes,

      metadata: {
        changedFieldCount:
          changes.length,

        reasonProvided:
          Boolean(
            after
              ?.reasonProvided
          ),
      },
    });
  } catch (error) {
    logger
      ?.error?.(
        'Talent Pool Audit recording failed:',
        error
      );
  }
}


function createApplicantTalentPoolRouter({
  recordActivity =
    recordApplicantActivity,

  activityLogger =
    console,


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

  /*
   * B5H — Talent Pool mutation Audit middleware
   *
   * Static routes stay before this block.
   * Successful Applicant-specific mutations are mirrored into the
   * existing Applicant Audit & History stream.
   *
   * Audit failures never change the successful Talent Pool HTTP result.
   */
  router.use(
    '/:applicantId',

    async (
      req,
      res,
      next
    ) => {
      const descriptor =
        talentPoolAuditDescriptor(
          req.method,
          req.path
        );

      if (!descriptor) {
        return next();
      }

      let before =
        null;

      try {
        const applicant =
          await readTalentPoolAuditApplicant({
            applicantId:
              req.params
                .applicantId,
          });

        before =
          talentPoolAuditSnapshot(
            applicant
          );
      } catch {
        /*
         * Do not replace the route's own validation/error semantics.
         */
      }

      res.once(
        'finish',
        () => {
          if (
            res.statusCode <
              200 ||
            res.statusCode >=
              400
          ) {
            return;
          }

          setImmediate(
            async () => {
              try {
                const applicant =
                  await readTalentPoolAuditApplicant({
                    applicantId:
                      req.params
                        .applicantId,
                  });

                const after =
                  talentPoolAuditSnapshot(
                    applicant
                  );

                await recordTalentPoolActivitySafely({
                  recordActivity,

                  logger:
                    activityLogger,

                  applicantId:
                    req.params
                      .applicantId,

                  descriptor,
                  before,
                  after,

                  actor:
                    talentPoolAuditActor(
                      req.user
                    ),
                });
              } catch (error) {
                activityLogger
                  ?.error?.(
                    'Talent Pool post-response Audit failed:',
                    error
                  );
              }
            }
          );
        }
      );

      return next();
    }
  );



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

module.exports.talentPoolAuditSnapshot =
  talentPoolAuditSnapshot;

module.exports.talentPoolAuditChanges =
  talentPoolAuditChanges;

module.exports.talentPoolAuditDescriptor =
  talentPoolAuditDescriptor;

module.exports.recordTalentPoolActivitySafely =
  recordTalentPoolActivitySafely;
