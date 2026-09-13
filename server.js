const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');

dotenv.config();

const db = require('./db');
const mongoConnection = require('./mongoConnection');
const applicationStore = require('./applicationStore');

const { authenticateToken } = require('./middleware/auth');
const requireAdmin = require('./middleware/requireAdmin');
const requireApplicantPermission = require('./middleware/requireApplicantPermission');
const swaggerUi = require('swagger-ui-express');
const applicantSwaggerSpec = require('./docs/applicantSwagger');
const applicantDocumentSwagger = require('./docs/applicantDocumentSwagger');

Object.assign(
  applicantSwaggerSpec.paths,
  applicantDocumentSwagger.paths
);

applicantSwaggerSpec.tags = [
  ...(applicantSwaggerSpec.tags || []),
  ...(applicantDocumentSwagger.tags || []),
];

const {
  syncApplicantForm,
  normalizeSheetCsvUrl,
  processSubmission,
} = require('./services/applicantFormSyncService');


/* =========================
   SMTP CONFIGURATION
========================= */

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',

  port: parseInt(
    process.env.SMTP_PORT || '587',
    10
  ),

  secure:
    process.env.SMTP_SECURE === 'true',

  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
});


/* =========================
   EXPRESS APP
========================= */

const app = express();


/* =========================
   MIDDLEWARE
========================= */

const allowedOrigins =
  process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean)
    : [];


if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}


app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);


const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,

  max: 10,

  standardHeaders: true,

  legacyHeaders: false,

  skip: (req) =>
    req.method === 'OPTIONS',

  message: {
    error:
      'Too many attempts, try again in 15 minutes',
  },
});


app.use(
  '/api/auth/login',
  loginLimiter
);


app.use(
  cors({
    origin: (origin, callback) => {
      /*
       * Allow:
       *
       * - server-to-server requests
       * - localhost development
       * - configured production origins
       */

      if (
        !origin ||
        /^http:\/\/localhost:\d+$/.test(
          origin
        ) ||
        allowedOrigins.includes(origin)
      ) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },

    credentials: true,
  })
);


/*
 * Applicant Form webhook is mounted BEFORE
 * the global 2 MB JSON parser.
 *
 * This keeps its public request body limited
 * to 64 KB before parsing/allocation.
 */
const applicantWebhookLimiter =
  rateLimit({
    windowMs:
      60 * 1000,

    max: 30,

    standardHeaders: true,

    legacyHeaders: false,

    skip: (req) =>
      req.method === 'OPTIONS',

    message: {
      success: false,
      error:
        'Too many webhook requests.',
    },
  });


app.use(
  '/api/applicant-form/webhook',

  applicantWebhookLimiter,

  express.json({
    limit: '64kb',
    type: 'application/json',
  }),

  (error, req, res, next) => {
    if (
      error &&
      error.type ===
        'entity.too.large'
    ) {
      return res
        .status(413)
        .json({
          success: false,
          error:
            'Webhook payload is too large.',
        });
    }

    if (
      error instanceof
        SyntaxError &&
      error.status === 400 &&
      'body' in error
    ) {
      return res
        .status(400)
        .json({
          success: false,
          error:
            'Invalid JSON payload.',
        });
    }

    return next(error);
  },

  require(
    './src/routes/applicantFormWebhook.routes'
  )({
    processSubmission,

    webhookSecret:
      process.env
        .APPLICANT_FORM_WEBHOOK_SECRET,

    sourceKey:
      process.env
        .APPLICANT_FORM_SOURCE_KEY ||
      'omah-applicant-form-v2',
  })
);


/*
 * Remaining application APIs use the
 * existing larger authenticated JSON limit.
 */
app.use(
  express.json({
    limit: '2mb',
  })
);


app.use(cookieParser());


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
   API ROUTES
========================= */

app.use(
  '/api/auth',

  require('./src/routes/auth.routes')({
    JWT_SECRET,
    authenticateToken,
    bcrypt,
    db,
    jwt,
  })
);


app.use(
  '/api/users',

  authenticateToken,

  requireAdmin,

  require('./src/routes/users.routes')({
    authenticateToken,
    db,
  })
);


app.use(
  '/api/posts',

  require('./src/routes/posts.routes')({
    db,
  })
);


app.use(
  '/api/emails',

  authenticateToken,

  requireAdmin,

  require('./src/routes/emails.routes')({
    applicationStore,
    authenticateToken,
    db,
    transporter,
  })
);


app.use(
  '/api/calls',

  authenticateToken,

  requireAdmin,

  require('./src/routes/calls.routes')({
    authenticateToken,
    db,
  })
);


app.use(
  '/api/notifications',

  authenticateToken,

  requireAdmin,

  require(
    './src/routes/notifications.routes'
  )({
    authenticateToken,
    db,
  })
);


app.use(
  '/api/messages',

  authenticateToken,

  requireAdmin,

  require('./src/routes/messages.routes')({
    authenticateToken,
    db,
  })
);


app.use(
  '/api/companies',

  authenticateToken,

  requireAdmin,

  require(
    './src/routes/companies.routes'
  )({
    authenticateToken,
    db,
  })
);


/*
 * Applicant routes.
 *
 * The new Google Form synchronization
 * service is injected here.
 */

app.use(
  '/api/applications',

  authenticateToken,

  requireAdmin,

  require(
    './src/routes/applications.routes'
  )({
    DEFAULT_APPLICANT_SHEET_CSV_URL,

    applicationStore,

    authenticateToken,

    db,

    normalizeSheetCsvUrl,

    syncApplicantsFromSheet,
  })
);



/*
 * New Applicant master-profile API.
 *
 * Legacy /api/applications remains untouched
 * during migration.
 */

/*
 * Applicant Document & CV Management.
 *
 * Files remain private and every action
 * requires Applicant Management admin
 * authorization.
 */
app.use(
  '/api/applicants/:applicantId/documents',

  authenticateToken,

  requireAdmin,

  require(
    './src/routes/applicantDocuments.routes'
  )({
    requireApplicantPermission,
  })
);


app.use(
  '/api/applicants',

  authenticateToken,

  requireAdmin,

  require(
    './src/routes/applicants.routes'
  )({
    requireApplicantPermission,
  })
);


/*
 * Applicant API Swagger UI.
 *
 * Documentation is itself admin protected.
 */
function swaggerDocsCsp(
  req,
  res,
  next
) {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'"
  );

  return next();
}

app.use(
  '/api-docs',

  authenticateToken,

  requireAdmin,

  swaggerDocsCsp,

  swaggerUi.serve,

  swaggerUi.setup(
    applicantSwaggerSpec,
    {
      customSiteTitle:
        'OMAH Applicant API',
    }
  )
);

app.use(
  '/api/dev',

  authenticateToken,

  requireAdmin,

  require('./src/routes/dev.routes')({
    authenticateToken,
    db,
  })
);


/* =========================
   HEALTH / READINESS
========================= */

/*
 * Liveness:
 *
 * Confirms that the Node / Express process
 * is alive. No database details are exposed.
 */
app.get(
  '/health',
  (req, res) => {
    res.setHeader(
      'Cache-Control',
      'no-store'
    );

    return res
      .status(200)
      .json({
        status: 'ok',
      });
  }
);


/*
 * Readiness:
 *
 * Confirms that MongoDB is actually ready
 * to serve application traffic.
 */
app.get(
  '/ready',
  (req, res) => {
    res.setHeader(
      'Cache-Control',
      'no-store'
    );

    const connection =
      mongoConnection.getConnection();

    const databaseReady =
      connection &&
      connection.readyState === 1;

    if (!databaseReady) {
      return res
        .status(503)
        .json({
          status:
            'not_ready',

          database:
            'unavailable',
        });
    }

    return res
      .status(200)
      .json({
        status:
          'ready',

        database:
          'connected',
      });
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