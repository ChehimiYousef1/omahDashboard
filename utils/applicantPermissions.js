'use strict';

/*
|--------------------------------------------------------------------------
| Applicant Management Permissions
|--------------------------------------------------------------------------
|
| Admin and Super Admin retain full Applicant Management access.
|
| A Recruiter may receive explicit access to only the Applicants +
| Calendar administrative workspace by storing:
|
|   consoleAccess: 'applicants_calendar'
|
| on that ACTIVE user account.
|
| This is intentionally account-specific. Merely having the Recruiter
| role does not grant Applicant Management access.
|
*/

const APPLICANT_ADMIN_ROLES =
  Object.freeze([
    'Admin',
    'Super Admin',
  ]);


const RESTRICTED_APPLICANT_CONSOLE_ACCESS =
  'applicants_calendar';


const APPLICANT_PERMISSIONS =
  Object.freeze([
    'applicant:view',
    'applicant:edit',
    'applicant:status',
    'applicant:archive',
    'applicant:restore',
    'applicant:delete',
    'applicant:notes:view',
    'applicant:notes:manage',
    'applicant:submissions:view',
    'applicant:documents:view',
    'applicant:documents:manage',
    'applicant:evaluations:view',
    'applicant:evaluations:manage',
    'applicant:interviews:view',
    'applicant:interviews:manage',
    'applicant:communicate',
    'applicant:sync',
  ]);


function normalizeRole(
  role
) {
  return String(
    role ?? ''
  ).trim();
}


function normalizeStatus(
  status
) {
  return String(
    status ?? ''
  )
    .trim()
    .toLowerCase();
}


function normalizeConsoleAccess(
  consoleAccess
) {
  return String(
    consoleAccess ?? ''
  )
    .trim()
    .toLowerCase();
}


function isApplicantAdmin(
  role
) {
  return APPLICANT_ADMIN_ROLES
    .includes(
      normalizeRole(
        role
      )
    );
}


function isRestrictedApplicantRecruiter({
  role,
  status,
  consoleAccess,
} = {}) {
  return (
    normalizeRole(
      role
    ) ===
      'Recruiter' &&

    normalizeStatus(
      status
    ) ===
      'active' &&

    normalizeConsoleAccess(
      consoleAccess
    ) ===
      RESTRICTED_APPLICANT_CONSOLE_ACCESS
  );
}


function resolveConsoleAccess(
  user
) {
  if (
    isApplicantAdmin(
      user?.role
    )
  ) {
    return 'full';
  }

  if (
    isRestrictedApplicantRecruiter(
      user
    )
  ) {
    return RESTRICTED_APPLICANT_CONSOLE_ACCESS;
  }

  return 'none';
}


function isApplicantPermission(
  permission
) {
  return APPLICANT_PERMISSIONS
    .includes(
      String(
        permission ?? ''
      ).trim()
    );
}


function canApplicantAction({
  role,
  status,
  consoleAccess,
  permission,
}) {
  if (
    !isApplicantPermission(
      permission
    )
  ) {
    return false;
  }

  if (
    isApplicantAdmin(
      role
    )
  ) {
    return true;
  }

  return isRestrictedApplicantRecruiter({
    role,
    status,
    consoleAccess,
  });
}


module.exports = {
  APPLICANT_ADMIN_ROLES,
  APPLICANT_PERMISSIONS,
  RESTRICTED_APPLICANT_CONSOLE_ACCESS,

  normalizeRole,
  normalizeStatus,
  normalizeConsoleAccess,

  isApplicantAdmin,
  isRestrictedApplicantRecruiter,
  resolveConsoleAccess,

  isApplicantPermission,
  canApplicantAction,
};
