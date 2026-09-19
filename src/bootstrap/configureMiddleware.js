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


  /*
   * Reverse-proxy awareness is enabled
   * only in production.
   */
  if (
    env.NODE_ENV ===
    'production'
  ) {
    app.set(
      'trust proxy',
      1
    );
  }


  /*
   * Security headers.
   *
   * Existing CSP behavior is intentionally
   * preserved here.
   */
  app.use(
    helmet({
      contentSecurityPolicy:
        false,
    })
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

      message: {
        error:
          'Too many attempts, try again in 15 minutes',
      },
    });


  app.use(
    '/api/auth/login',
    loginLimiter
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
            /^http:\/\/localhost:\d+$/.test(
              origin
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
