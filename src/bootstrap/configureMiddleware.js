'use strict';

const express =
  require('express');

const helmet =
  require('helmet');

const rateLimit =
  require('express-rate-limit');

const cors =
  require('cors');

const cookieParser =
  require('cookie-parser');

const createApplicantFormWebhookRouter =
  require(
    '../routes/applicantFormWebhook.routes'
  );


/*
|--------------------------------------------------------------------------
| Global HTTP Middleware
|--------------------------------------------------------------------------
|
| IMPORTANT:
|
| Applicant Form webhook parsing MUST remain before the global 2 MB parser.
| The public webhook intentionally has its own 64 KB request-body limit.
|
*/


function applicantWebhookJsonErrorHandler(
  error,
  req,
  res,
  next
) {
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
}


function configureMiddleware(
  app,
  {
    processSubmission,

    env = process.env,
  }
) {
  const allowedOrigins =
    env.ALLOWED_ORIGINS
      ? env.ALLOWED_ORIGINS
          .split(',')
          .map(
            origin =>
              origin.trim()
          )
          .filter(Boolean)
      : [];


  const isProduction =
    env.NODE_ENV ===
    'production';


  /*
   * Production origin configuration is fail-closed.
   *
   * Browser credential traffic must use explicitly
   * configured HTTPS origins. Development keeps its
   * localhost convenience separately below.
   */
  if (isProduction) {
    if (
      allowedOrigins.length === 0
    ) {
      throw new Error(
        'ALLOWED_ORIGINS must contain at least one HTTPS origin in production.'
      );
    }

    for (
      const configuredOrigin
      of allowedOrigins
    ) {
      if (
        configuredOrigin ===
        '*'
      ) {
        throw new Error(
          'ALLOWED_ORIGINS must not contain * in production.'
        );
      }

      let parsedOrigin;

      try {
        parsedOrigin =
          new URL(
            configuredOrigin
          );
      } catch {
        throw new Error(
          `Invalid production origin: ${configuredOrigin}`
        );
      }

      if (
        parsedOrigin.protocol !==
        'https:'
      ) {
        throw new Error(
          `Production origin must use HTTPS: ${configuredOrigin}`
        );
      }

      if (
        [
          'localhost',
          '127.0.0.1',
          '::1',
        ].includes(
          parsedOrigin.hostname
        )
      ) {
        throw new Error(
          `Production origin must not target localhost: ${configuredOrigin}`
        );
      }
    }
  }


  app.disable(
    'x-powered-by'
  );


  /*
   * Reverse-proxy awareness is enabled
   * only in production.
   */
  if (
    isProduction
  ) {
    app.set(
      'trust proxy',
      1
    );
  }


  /*
   * Security headers.
   *
   * Development keeps CSP disabled so Vite/Swagger
   * tooling remains usable. Production enables a
   * restrictive CSP for the deployed SPA/API.
   */
  const productionCspDirectives = {
    defaultSrc: [
      "'self'",
    ],

    baseUri: [
      "'self'",
    ],

    objectSrc: [
      "'none'",
    ],

    frameAncestors: [
      "'none'",
    ],

    formAction: [
      "'self'",
    ],

    scriptSrc: [
      "'self'",
    ],

    scriptSrcAttr: [
      "'none'",
    ],

    styleSrc: [
      "'self'",
      "'unsafe-inline'",
      'https:',
    ],

    imgSrc: [
      "'self'",
      'data:',
      'blob:',
      'https:',
    ],

    fontSrc: [
      "'self'",
      'data:',
      'https:',
    ],

    connectSrc: [
      "'self'",
      'https:',
    ],

    frameSrc: [
      "'self'",
      'blob:',
      'https:',
    ],

    workerSrc: [
      "'self'",
      'blob:',
    ],

    mediaSrc: [
      "'self'",
      'blob:',
      'data:',
      'https:',
    ],

    upgradeInsecureRequests:
      [],
  };


  app.use(
    helmet({
      contentSecurityPolicy:
        isProduction
          ? {
              directives:
                productionCspDirectives,
            }
          : false,
    })
  );


  /* P8 BOT / AI CRAWLER CONTROLS */

  /*
   * OMAHCONNECT is a private administrative application.
   * Prevent indexing at the HTTP layer in addition to the
   * frontend robots meta tag and robots.txt.
   */
  app.use(
    (req, res, next) => {
      res.setHeader(
        'X-Robots-Tag',
        'noindex, nofollow, noarchive, nosnippet, noimageindex'
      );

      return next();
    }
  );


  /*
   * User-Agent blocking is an application-level deterrent.
   * It intentionally targets known crawler identities rather
   * than generic words such as "bot", which would create
   * unnecessary false positives.
   *
   * robots.txt remains reachable so compliant crawlers can
   * read the explicit site-wide Disallow directive.
   */
  const blockedCrawlerUserAgents = [
    'gptbot',
    'oai-searchbot',
    'oai-adsbot',
    'chatgpt-user',
    'claudebot',
    'claude-user',
    'claude-searchbot',
    'ccbot',
    'perplexitybot',
    'bytespider',
    'googlebot',
    'bingbot',
    'duckduckbot',
    'baiduspider',
    'yandexbot',
    'amazonbot',
    'applebot',
    'facebookbot',
    'meta-externalagent',
  ];


  app.use(
    (req, res, next) => {
      if (
        !isProduction ||
        req.path ===
          '/robots.txt'
      ) {
        return next();
      }

      const userAgent =
        String(
          req.get(
            'user-agent'
          ) ||
          ''
        ).toLowerCase();

      const blocked =
        blockedCrawlerUserAgents
          .some(
            crawler =>
              userAgent.includes(
                crawler
              )
          );

      if (!blocked) {
        return next();
      }

      return res
        .status(403)
        .json({
          success: false,
          code:
            'CRAWLER_BLOCKED',
          error:
            'Automated crawler access is not allowed.',
        });
    }
  );


  /*
   * Authentication rate limit.
   */
  const loginLimiter =
    rateLimit({
      windowMs:
        15 * 60 * 1000,

      max:
        10,

      standardHeaders:
        true,

      legacyHeaders:
        false,

      skip:
        req =>
          req.method ===
          'OPTIONS',

      skipSuccessfulRequests:
        true,

      message: {
        success: false,

        code:
          'RATE_LIMITED',

        error:
          'Too many attempts, try again in 15 minutes',
      },
    });


  app.use(
    '/api/auth/login',
    loginLimiter
  );

  /* P9 SCRAPING DETERRENCE */

  /*
   * Private API responses must not be retained by browser,
   * intermediary, or CDN caches. This also covers document
   * download redirects and authorization failures.
   */
  app.use(
    '/api',
    (_req, res, next) => {
      res.setHeader(
        'Cache-Control',
        'private, no-store'
      );

      res.setHeader(
        'Pragma',
        'no-cache'
      );

      res.setHeader(
        'Expires',
        '0'
      );

      res.setHeader(
        'Surrogate-Control',
        'no-store'
      );

      return next();
    }
  );


  /* P7 TIERED ABUSE PROTECTION */

  const signupLimiter =
    rateLimit({
      windowMs:
        60 * 60 * 1000,

      max:
        5,

      standardHeaders:
        true,

      legacyHeaders:
        false,

      skip:
        req =>
          req.method ===
          'OPTIONS',

      message: {
        success: false,

        code:
          'RATE_LIMITED',

        error:
          'Too many signup attempts. Try again later.',
      },
    });


  const apiBurstLimiter =
    rateLimit({
      windowMs:
        15 * 60 * 1000,

      max:
        1200,

      standardHeaders:
        true,

      legacyHeaders:
        false,

      skip:
        req =>
          req.method ===
          'OPTIONS',

      message: {
        success: false,

        code:
          'RATE_LIMITED',

        error:
          'Too many API requests. Try again later.',
      },
    });


  const apiMutationLimiter =
    rateLimit({
      windowMs:
        15 * 60 * 1000,

      max:
        600,

      standardHeaders:
        true,

      legacyHeaders:
        false,

      skip:
        req =>
          [
            'GET',
            'HEAD',
            'OPTIONS',
          ].includes(
            req.method
          ),

      message: {
        success: false,

        code:
          'RATE_LIMITED',

        error:
          'Too many write requests. Try again later.',
      },
    });


  const outboundCommunicationLimiter =
    rateLimit({
      windowMs:
        15 * 60 * 1000,

      max:
        30,

      standardHeaders:
        true,

      legacyHeaders:
        false,

      skip:
        req =>
          [
            'GET',
            'HEAD',
            'OPTIONS',
          ].includes(
            req.method
          ),

      message: {
        success: false,

        code:
          'RATE_LIMITED',

        error:
          'Too many communication requests. Try again later.',
      },
    });


  const bulkCampaignLimiter =
    rateLimit({
      windowMs:
        60 * 60 * 1000,

      max:
        10,

      standardHeaders:
        true,

      legacyHeaders:
        false,

      skip:
        req =>
          [
            'GET',
            'HEAD',
            'OPTIONS',
          ].includes(
            req.method
          ),

      message: {
        success: false,

        code:
          'RATE_LIMITED',

        error:
          'Too many campaign requests. Try again later.',
      },
    });


  const externalActionLimiter =
    rateLimit({
      windowMs:
        15 * 60 * 1000,

      max:
        60,

      standardHeaders:
        true,

      legacyHeaders:
        false,

      skip:
        req =>
          [
            'GET',
            'HEAD',
            'OPTIONS',
          ].includes(
            req.method
          ),

      message: {
        success: false,

        code:
          'RATE_LIMITED',

        error:
          'Too many external-service actions. Try again later.',
      },
    });


  const documentMutationLimiter =
    rateLimit({
      windowMs:
        15 * 60 * 1000,

      max:
        60,

      standardHeaders:
        true,

      legacyHeaders:
        false,

      skip:
        req =>
          [
            'GET',
            'HEAD',
            'OPTIONS',
          ].includes(
            req.method
          ),

      message: {
        success: false,

        code:
          'RATE_LIMITED',

        error:
          'Too many document changes. Try again later.',
      },
    });


  const reportGenerationLimiter =
    rateLimit({
      windowMs:
        15 * 60 * 1000,

      max:
        30,

      standardHeaders:
        true,

      legacyHeaders:
        false,

      skip:
        req =>
          req.method ===
          'OPTIONS',

      message: {
        success: false,

        code:
          'RATE_LIMITED',

        error:
          'Too many report requests. Try again later.',
      },
    });


  const sheetSyncLimiter =
    rateLimit({
      windowMs:
        60 * 60 * 1000,

      max:
        6,

      standardHeaders:
        true,

      legacyHeaders:
        false,

      skip:
        req =>
          [
            'GET',
            'HEAD',
            'OPTIONS',
          ].includes(
            req.method
          ),

      message: {
        success: false,

        code:
          'RATE_LIMITED',

        error:
          'Too many synchronization requests. Try again later.',
      },
    });


  const destructiveActionLimiter =
    rateLimit({
      windowMs:
        60 * 60 * 1000,

      max:
        10,

      standardHeaders:
        true,

      legacyHeaders:
        false,

      skip:
        req =>
          [
            'GET',
            'HEAD',
            'OPTIONS',
          ].includes(
            req.method
          ),

      message: {
        success: false,

        code:
          'RATE_LIMITED',

        error:
          'Too many destructive actions. Try again later.',
      },
    });


  /*
   * Browser-like scrapers can avoid crawler User-Agent
   * detection, so safe/read requests receive a separate
   * IP ceiling in addition to the broad P7 API limiter.
   */
  const apiReadLimiter =
    rateLimit({
      windowMs:
        15 * 60 * 1000,

      max:
        600,

      standardHeaders:
        true,

      legacyHeaders:
        false,

      skip:
        req =>
          ![
            'GET',
            'HEAD',
          ].includes(
            req.method
          ),

      message: {
        success: false,

        code:
          'SCRAPING_RATE_LIMITED',

        error:
          'Too many read requests. Try again later.',
      },
    });


  app.use(
    '/api/auth/signup',
    signupLimiter
  );


  app.use(
    '/api',
    apiBurstLimiter,
    apiMutationLimiter,
    apiReadLimiter
  );


  app.use(
    '/api/emails',
    bulkCampaignLimiter
  );

  app.use(
    '/api/companies/communications',
    bulkCampaignLimiter
  );

  app.use(
    '/api/notifications',
    outboundCommunicationLimiter
  );

  app.use(
    '/api/messages/send',
    outboundCommunicationLimiter
  );

  app.use(
    '/api/calls/initiate',
    externalActionLimiter
  );

  app.use(
    '/api/applications/sync-sheet',
    sheetSyncLimiter
  );


  app.use(
    '/api/applicants/:applicantId/documents',
    documentMutationLimiter
  );

  app.use(
    '/api/applicants/:applicantId/reports',
    reportGenerationLimiter
  );

  app.use(
    '/api/applicants/:id/communications',
    outboundCommunicationLimiter
  );

  app.use(
    '/api/applicants/:id/notes/:noteId/calendar',
    externalActionLimiter
  );

  app.use(
    '/api/applicants/:id/interviews',
    externalActionLimiter
  );

  app.use(
    '/api/applicants/:id/permanent',
    destructiveActionLimiter
  );



  /*
   * Production Origin boundary.
   *
   * CORS headers alone are a browser response policy;
   * reject credentialed browser requests from unknown
   * origins before they reach application routes.
   * Requests without Origin remain valid for trusted
   * server-to-server clients and health infrastructure.
   */
  app.use(
    (req, res, next) => {
      const requestOrigin =
        req.get(
          'Origin'
        );

      if (
        isProduction &&
        requestOrigin &&
        !allowedOrigins.includes(
          requestOrigin
        )
      ) {
        return res
          .status(403)
          .json({
            success: false,
            error:
              'Origin is not allowed.',
          });
      }

      return next();
    }
  );


  /*
   * CORS.
   */
  app.use(
    cors({
      origin:
        (
          origin,
          callback
        ) => {
          /*
           * Allow:
           *
           * - server-to-server requests
           * - localhost development
           * - configured production origins
           */
          if (
            !origin ||
            (
              !isProduction &&
              /^http:\/\/(?:localhost|127\.0\.0\.1):\d+$/.test(
                origin
              )
            ) ||
            allowedOrigins.includes(
              origin
            )
          ) {
            callback(
              null,
              true
            );

            return;
          }

          callback(
            null,
            false
          );
        },

      credentials:
        true,
    })
  );


  /*
   * Applicant Form webhook.
   *
   * MUST stay before the global JSON parser.
   */
  const applicantWebhookLimiter =
    rateLimit({
      windowMs:
        60 * 1000,

      max:
        30,

      standardHeaders:
        true,

      legacyHeaders:
        false,

      skip:
        req =>
          req.method ===
          'OPTIONS',

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
      limit:
        '64kb',

      type:
        'application/json',
    }),

    applicantWebhookJsonErrorHandler,

    createApplicantFormWebhookRouter({
      processSubmission,

      webhookSecret:
        env
          .APPLICANT_FORM_WEBHOOK_SECRET,

      sourceKey:
        env
          .APPLICANT_FORM_SOURCE_KEY ||
        'omah-applicant-form-v2',
    })
  );


  /*
   * Remaining APIs retain the existing
   * authenticated 2 MB JSON limit.
   */
  app.use(
    express.json({
      limit:
        '2mb',
    })
  );


  /*
   * JWT authentication reads auth_token
   * from cookies.
   */
  app.use(
    cookieParser()
  );
}


module.exports = {
  applicantWebhookJsonErrorHandler,
  configureMiddleware,
};
