const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');

dotenv.config();

const db = require('./db');
const mongoConnection = require('./mongoConnection');
const applicationStore = require('./applicationStore');

const { authenticateToken } = require('./middleware/auth');
const requireAdmin = require('./middleware/requireAdmin');
const requireApplicantAccess = require('./middleware/requireApplicantAccess');
const requireApplicantPermission = require('./middleware/requireApplicantPermission');

const {
  createMailer,
} = require('./config/mailer');

const {
  configureMiddleware,
} = require('./src/bootstrap/configureMiddleware');

const {
  registerApiRoutes,
} = require('./src/bootstrap/registerApiRoutes');

const {
  registerHealthRoutes,
} = require('./src/bootstrap/registerHealthRoutes');

const {
  startServerLifecycle,
} = require('./src/bootstrap/serverLifecycle');
const {
  syncApplicantForm,
  normalizeSheetCsvUrl,
  processSubmission,
} = require('./services/applicantFormSyncService');


/* =========================
   EXPRESS APP
========================= */

const app = express();

const transporter =
  createMailer();


/* =========================
   MIDDLEWARE
========================= */

configureMiddleware(
  app,
  {
    processSubmission,
  }
);


/* =========================
   JWT CONFIGURATION
========================= */

const JWT_SECRET =
  process.env.JWT_SECRET;


if (!JWT_SECRET) {
  throw new Error(
    'JWT_SECRET is required'
  );
}


/* =========================
   APPLICATION MODULE
   CONFIGURATION
========================= */

/*
 * IMPORTANT:
 *
 * The Google Sheet URL now comes
 * from .env.
 *
 * We intentionally do NOT keep
 * the old Google Sheet URL
 * hardcoded in server.js.
 */

const DEFAULT_APPLICANT_SHEET_CSV_URL =
  process.env.APPLICANT_SHEET_CSV_URL ||
  '';



/*
 * Compatibility wrapper used by
 * applications.routes.js.
 *
 * All:
 *
 * - CSV fetching
 * - CSV parsing
 * - form mapping
 * - validation
 * - duplicate detection
 * - MongoDB inserts
 *
 * are now handled by:
 *
 * services/applicantFormSyncService.js
 */

async function syncApplicantsFromSheet(
  sheetUrl,
  {
    dryRun = true,
  } = {}
) {
  if (!sheetUrl) {
    throw new Error(
      'APPLICANT_SHEET_CSV_URL is not configured.'
    );
  }

  return syncApplicantForm({
    sheetUrl,
    dryRun,

    sourceKey:
      process.env
        .APPLICANT_FORM_SOURCE_KEY ||
      'omah-applicant-form-v2',
  });
}


/* =========================
   STATIC FRONTEND
========================= */

app.use(
  express.static(
    path.join(
      __dirname,
      'omahconnect-admin/dist'
    )
  )
);


/* =========================
   API ROUTES + SWAGGER
========================= */

registerApiRoutes(
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
);


/* =========================
   HEALTH / READINESS
========================= */

registerHealthRoutes(
  app,
  {
    mongoConnection,
  }
);


/* =========================
   SUPPORT SURFACE 404 BOUNDARY
========================= */

/*
 * API documentation and developer-only APIs are
 * registered earlier when enabled.
 *
 * Any request reaching this point did not match an
 * enabled support route and must not fall through to
 * the React SPA.
 */
app.use(
  '/api-docs',
  (_req, res) => {
    res.sendStatus(404);
  }
);

app.use(
  '/api/dev',
  (_req, res) => {
    res.sendStatus(404);
  }
);


/* =========================
   SPA FALLBACK
========================= */

app.get(
  /.*/,
  (req, res) => {
    res.sendFile(
      path.join(
        __dirname,
        'omahconnect-admin/dist',
        'index.html'
      )
    );
  }
);


/* =========================
   SERVER LIFECYCLE
========================= */

startServerLifecycle({
  app,

  applicationStore,

  mongoConnection,

  syncApplicantsFromSheet,
});


/* =========================
   EXPORT
========================= */

module.exports = app;
