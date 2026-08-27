'use strict';

const {
  isApplicantPermission,
  canApplicantAction,
} = require('../utils/applicantPermissions');

function requireApplicantPermission(
  permission
) {
  if (
    !isApplicantPermission(
      permission
    )
  ) {
    throw new Error(
      'Unknown Applicant permission: ' +
      permission
    );
  }

  return function applicantPermissionMiddleware(
    req,
    res,
    next
  ) {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        code: 'NOT_AUTHENTICATED',
        error: 'Not authenticated',
      });
    }

    const allowed =
      canApplicantAction({
        role: req.user.role,
        permission,
      });

    if (!allowed) {
      return res.status(403).json({
        success: false,
        code:
          'APPLICANT_PERMISSION_DENIED',
        error:
          'Applicant permission denied',
      });
    }

    return next();
  };
}

module.exports =
  requireApplicantPermission;

