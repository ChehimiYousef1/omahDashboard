const express = require('express');
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
   AUTHENTICATION ENDPOINTS
========================= */

// Signup

// Login

// Logout

// Auth Me


/* =========================
   USER DIRECTORY ENDPOINTS
========================= */

// Get all users

// Toggle User Notification Permissions


/* =========================
   POSTS ENDPOINTS
========================= */


/* =========================
   EMAIL CAMPAIGN ENDPOINTS
========================= */

// Get emails history

// Send simulated emails (Direct or Bulk)


/* =========================
   CRM CALLING ENDPOINTS
========================= */

// Get call logs

// Initiate simulated call


/* =========================
   NOTIFICATION HUB ENDPOINTS
========================= */

// Get notification history

// Send simulated notification

// Resend notification


/* =========================
   MESSAGE CENTER / CHAT
   ENDPOINTS
========================= */

// Get all conversations list

// Get messages for a single conversation

// Flag conversation

// Send Chat Message
// (Admin or Mock User)
// with AI/Spam moderation


/* =========================
   COMPANY MODULE ENDPOINTS
========================= */

// Get all companies

// Get recruiters directory
// (synced with users in db.json)

// Get all jobs

// Get all reports/flags

// Get audit logs

// Get settings

// Save settings

// Verify company

// Suspend company
// (with cascades)

// Send email campaign
// to recruiters

// Toggle Job Featured Star

// Expire/Active job status

// Resolve Report ticket


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
   DATABASE STATS
========================= */

// Get database stats summary


/* =========================
   STATIC FRONTEND
========================= */

const path = require('path');


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