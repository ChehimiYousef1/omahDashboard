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

const {
  syncApplicantForm,
  normalizeSheetCsvUrl,
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


  app.listen(
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
}


/* =========================
   START SERVER
========================= */

startServer()
  .catch((error) => {
    console.error(
      'Failed to start server:',
      error
    );

    process.exit(1);
  });


/* =========================
   EXPORT
========================= */

module.exports = app;