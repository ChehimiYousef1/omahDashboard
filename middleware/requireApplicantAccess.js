'use strict';

const {
  canApplicantAction,
} = require(
  '../utils/applicantPermissions'
);


module.exports =
  function requireApplicantAccess(
    req,
    res,
    next
  ) {
    if (!req.user) {
      return res
        .status(401)
        .json({
          success:
            false,

          code:
            'NOT_AUTHENTICATED',

          error:
            'Not authenticated',
        });
    }


    const allowed =
      canApplicantAction({
        role:
          req.user.role,

        status:
          req.user.status,

        consoleAccess:
          req.user.consoleAccess,

        permission:
          'applicant:view',
      });


    if (!allowed) {
      return res
        .status(403)
        .json({
          success:
            false,

          code:
            'APPLICANT_ACCESS_DENIED',

          error:
            'Applicant Management access denied',
        });
    }


    return next();
  };
