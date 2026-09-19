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
 * Convert environment flags to
 * real booleans safely.
 */

function isEnvEnabled(value) {
  return (
    String(value || '')
      .trim()
      .toLowerCase() === 'true'
  );
}


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
   SERVER STARTUP
========================= */

let httpServer = null;
let isShuttingDown = false;


async function startServer() {
  /*
   * Initialize existing application
   * storage first.
   */

  await applicationStore.init(
    mongoConnection
  );


  const PORT =
    process.env.PORT || 5000;


  httpServer = app.listen(
    PORT,
    () => {
      console.log(
        `🚀 Server running on port ${PORT}`
      );


      console.log(
        `📦 Applications storage: ${
          applicationStore.isUsingMongo()
            ? 'MongoDB'
            : 'JSON file (data/applications.json)'
        }`
      );


      /*
       * ==================================================
       * GOOGLE FORM AUTO SYNC SAFETY GATE
       * ==================================================
       *
       * Auto sync requires BOTH:
       *
       * APPLICANT_AUTO_SYNC_ENABLED=true
       *
       * AND
       *
       * APPLICANT_SYNC_WRITE_ENABLED=true
       *
       * During development both remain false.
       */


      const autoSyncEnabled =
        isEnvEnabled(
          process.env
            .APPLICANT_AUTO_SYNC_ENABLED
        );


      const writeEnabled =
        isEnvEnabled(
          process.env
            .APPLICANT_SYNC_WRITE_ENABLED
        );


      /*
       * Auto sync completely disabled.
       */

      if (!autoSyncEnabled) {
        console.log(
          '📋 Applicant sheet auto-sync: disabled'
        );

        return;
      }


      /*
       * Additional protection:
       *
       * Even if someone accidentally
       * enables auto-sync, MongoDB writing
       * must also be explicitly enabled.
       */

      if (!writeEnabled) {
        console.warn(
          '⚠️ Applicant sheet auto-sync not started because APPLICANT_SYNC_WRITE_ENABLED=false'
        );

        return;
      }


      /*
       * Do NOT fall back to the old
       * Google Sheet URL.
       */

      const sheetUrl =
        process.env
          .APPLICANT_SHEET_CSV_URL;


      if (!sheetUrl) {
        console.warn(
          '⚠️ Applicant sheet auto-sync skipped: APPLICANT_SHEET_CSV_URL is not configured.'
        );

        return;
      }


      /*
       * Only reaches this point when
       * BOTH safety flags are true.
       */

      syncApplicantsFromSheet(
        sheetUrl,
        {
          dryRun: false,
        }
      )
        .then((result) => {
          console.log(
            `📋 Applicant sheet sync: imported ${result.inserted} new applicant(s)`
          );


          console.log(
            `📋 Applicant sheet sync: skipped ${result.duplicates} duplicate(s)`
          );


          console.log(
            `📋 Applicant sheet sync: ${result.invalid} invalid response(s), ${result.failed} failed row(s)`
          );
        })
        .catch((error) => {
          console.warn(
            '⚠️ Applicant sheet auto-sync skipped:',
            error.message
          );
        });
    }
  );
/*
 * Handle asynchronous HTTP server failures
 * such as EADDRINUSE.
 */
  httpServer.once(
    'error',
    async (error) => {
      console.error(
        'HTTP server error:',
        error?.code ||
        error?.message ||
        'UNKNOWN_ERROR'
      );

      try {
        await mongoConnection.disconnect();
      } catch {
        // Startup failure is already being handled.
      }

      process.exit(1);
    }
  );

  return httpServer;
}


/* =========================
   GRACEFUL SHUTDOWN
========================= */

async function shutdownServer(
  signal
) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  console.log(
    `${signal} received. Shutting down gracefully...`
  );

  /*
   * Safety timeout prevents a deployment
   * from hanging indefinitely.
   */
  const forceShutdownTimer =
    setTimeout(
      () => {
        console.error(
          'Graceful shutdown timed out.'
        );

        if (
          httpServer &&
          typeof httpServer
            .closeAllConnections ===
            'function'
        ) {
          httpServer
            .closeAllConnections();
        }

        process.exit(1);
      },
      10000
    );

  forceShutdownTimer.unref();

  try {
    if (
      httpServer &&
      httpServer.listening
    ) {
      await new Promise(
        (resolve, reject) => {
          httpServer.close(
            (error) => {
              if (error) {
                reject(error);
                return;
              }

              resolve();
            }
          );
        }
      );

      console.log(
        '✅ HTTP server closed'
      );
    }

    await mongoConnection.disconnect();

    console.log(
      '✅ MongoDB disconnected'
    );

    clearTimeout(
      forceShutdownTimer
    );

    console.log(
      '✅ Graceful shutdown complete'
    );

    process.exit(0);
  } catch (error) {
    clearTimeout(
      forceShutdownTimer
    );

    console.error(
      'Shutdown error:',
      error?.message ||
      'UNKNOWN_ERROR'
    );

    process.exit(1);
  }
}


process.once(
  'SIGTERM',
  () => {
    void shutdownServer(
      'SIGTERM'
    );
  }
);


process.once(
  'SIGINT',
  () => {
    void shutdownServer(
      'SIGINT'
    );
  }
);



/* =========================
   START SERVER
========================= */

startServer()
  .catch((error) => {
    console.error(
      'Failed to start server:',
      error?.message ||
      'UNKNOWN_ERROR'
    );

    process.exit(1);
  });


/* =========================
   EXPORT
========================= */

module.exports = app;