'use strict';

const rateLimit =
  require(
    'express-rate-limit'
  );


const DEFAULT_WINDOW_MS =
  15 * 60 * 1000;

const DEFAULT_MAX_READS =
  300;


function authenticatedUserKey(
  req
) {
  const userId =
    req.user?.id ??
    req.user?._id;

  if (
    userId === undefined ||
    userId === null ||
    String(userId).trim() ===
      ''
  ) {
    /*
     * This middleware must be mounted only after
     * authenticateToken. A fail-closed shared key avoids
     * accidentally giving unauthenticated requests an
     * unlimited bucket if a mount is ever misordered.
     */
    return 'authenticated:missing-user';
  }

  return (
    `authenticated:${String(userId)}`
  );
}


function createAuthenticatedReadLimiter({
  windowMs =
    DEFAULT_WINDOW_MS,

  max =
    DEFAULT_MAX_READS,
} = {}) {
  return rateLimit({
    windowMs,
    max,

    standardHeaders:
      true,

    legacyHeaders:
      false,

    keyGenerator:
      authenticatedUserKey,

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
}


const authenticatedReadLimiter =
  createAuthenticatedReadLimiter();


module.exports = {
  DEFAULT_WINDOW_MS,
  DEFAULT_MAX_READS,
  authenticatedUserKey,
  createAuthenticatedReadLimiter,
  authenticatedReadLimiter,
};
