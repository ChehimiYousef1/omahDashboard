const { authenticatedReadLimiter } = require('../../middleware/scrapingDeterrence');

'use strict';

const createAuthRouter =
  require(
    '../routes/auth.routes'
  );

const createUsersRouter =
  require(
    '../routes/users.routes'
  );

const createPostsRouter =
  require(
    '../routes/posts.routes'
  );

const createEmailsRouter =
  require(
    '../routes/emails.routes'
  );

const createCallsRouter =
  require(
    '../routes/calls.routes'
  );

const createNotificationsRouter =
  require(
    '../routes/notifications.routes'
  );

const createMessagesRouter =
  require(
    '../routes/messages.routes'
  );

const createCompaniesRouter =
  require(
    '../routes/companies.routes'
  );

const createApplicationsRouter =
  require(
    '../routes/applications.routes'
  );

const createApplicantDocumentsRouter =
  require(
    '../routes/applicantDocuments.routes'
  );

const createApplicantReportsRouter =
  require(
    '../routes/applicantReports.routes'
  );


const createApplicantTalentPoolRouter =
  require(
    '../routes/applicantTalentPool.routes'
  );

const createApplicantsRouter =
  require(
    '../routes/applicants.routes'
  );

const createDevRouter =
  require(
    '../routes/dev.routes'
  );

const {
  registerSwagger,
} =
  require(
    './registerSwagger'
  );


/*
|--------------------------------------------------------------------------
| OMAH API Route Registry
|--------------------------------------------------------------------------
|
| server.js owns application bootstrap.
|
| This module owns route registration and preserves the authorization
| boundaries of each API domain.
|
*/



const {
  recordApplicantActivity,
} = require(
  '../../services/applicantActivityService'
);


function registerApiRoutes(
  app,
  {
    JWT_SECRET,

    authenticateToken,
    requireAdmin,
    requireApplicantAccess,
    requireApplicantPermission,

    bcrypt,
    jwt,

    db,
    applicationStore,
    transporter,

    DEFAULT_APPLICANT_SHEET_CSV_URL,
    normalizeSheetCsvUrl,
    syncApplicantsFromSheet,
  }
) {
  /*
   * Authentication.
   */
  app.use(
    '/api/auth',

    createAuthRouter({
      JWT_SECRET,
      authenticateToken,
      bcrypt,
      db,
      jwt,
    })
  );


  /*
   * Administrative user directory.
   */
  app.use(
    '/api/users',

    authenticateToken,

    authenticatedReadLimiter,
    requireAdmin,

    createUsersRouter({
      authenticateToken,
      db,
    })
  );


  /*
   * Posts.
   *
   * Existing authorization behavior is intentionally
   * preserved during this structural refactor.
   */
  app.use(
    '/api/posts',

    authenticateToken,

    authenticatedReadLimiter,
    createPostsRouter({
      db,
    })
  );


  /*
   * Campaign outreach.
   */
  app.use(
    '/api/emails',

    authenticateToken,

    requireAdmin,

    createEmailsRouter({
      applicationStore,
      authenticateToken,
      db,
      transporter,
    })
  );


  /*
   * CRM calling.
   */
  app.use(
    '/api/calls',

    authenticateToken,

    requireAdmin,

    createCallsRouter({
      authenticateToken,
      db,
    })
  );


  /*
   * Notification hub.
   */
  app.use(
    '/api/notifications',

    authenticateToken,

    requireAdmin,

    createNotificationsRouter({
      authenticateToken,
      db,
    })
  );


  /*
   * Message center.
   */
  app.use(
    '/api/messages',

    authenticateToken,

    requireAdmin,

    createMessagesRouter({
      authenticateToken,
      db,
    })
  );


  /*
   * Company module.
   */
  app.use(
    '/api/companies',

    authenticateToken,

    authenticatedReadLimiter,
    requireAdmin,

    createCompaniesRouter({
      authenticateToken,
      db,
    })
  );


  /*
   * Legacy Application API.
   *
   * Retained while Applicant Management migration
   * remains in progress.
   */
  app.use(
    '/api/applications',

    authenticateToken,

    authenticatedReadLimiter,
    requireAdmin,

    createApplicationsRouter({
      DEFAULT_APPLICANT_SHEET_CSV_URL,
      applicationStore,
      authenticateToken,
      db,
      normalizeSheetCsvUrl,
      syncApplicantsFromSheet,
    })
  );


  /*
   * Applicant document management.
   *
   * Applicant-specific authorization intentionally
   * replaces the global Admin gate.
   */
  app.use(
    '/api/applicants/:applicantId/documents',

    authenticateToken,

    authenticatedReadLimiter,
    requireApplicantAccess,

    createApplicantDocumentsRouter({
      requireApplicantPermission,

      recordActivity:
        recordApplicantActivity,
    })
  );



  /*
   * Applicant report exports.
   *
   * Read-only protected Applicant reporting.
   */
  app.use(
    '/api/applicants/:applicantId/reports',

    authenticateToken,

    authenticatedReadLimiter,
    requireApplicantAccess,

    createApplicantReportsRouter({
      requireApplicantPermission,
    })
  );


  /*
   * Applicant master-profile API.
   */
  /*
   * Applicant Talent Pool.
   *
   * Mounted before the general Applicant router.
   */
  app.use(
    '/api/applicants/talent-pool',

    authenticateToken,

    authenticatedReadLimiter,
    requireApplicantAccess,

    createApplicantTalentPoolRouter({
      requireAdmin,
      requireApplicantPermission,
    })
  );


  app.use(
    '/api/applicants',

    authenticateToken,

    authenticatedReadLimiter,
    requireApplicantAccess,

    createApplicantsRouter({
      requireApplicantPermission,
      db,
      transporter,
    })
  );


  /*
   * Development/support surfaces.
   *
   * In production these endpoints are disabled by default.
   * They may only be exposed through an explicit environment opt-in.
   */
  const isProduction =
    process.env.NODE_ENV === 'production';

  const swaggerEnabled =
    !isProduction ||
    process.env.SWAGGER_ENABLED === 'true';

  const devApiEnabled =
    !isProduction ||
    process.env.DEV_API_ENABLED === 'true';


  if (swaggerEnabled) {
    registerSwagger(
      app,
      {
        authenticateToken,
        requireAdmin,
      }
    );
  }


  if (devApiEnabled) {
    app.use(
      '/api/dev',

      authenticateToken,

      requireAdmin,

      createDevRouter({
        authenticateToken,
        db,
      })
    );
  }
}


module.exports = {
  registerApiRoutes,
};
