'use strict';

/*
|--------------------------------------------------------------------------
| Applicant Management Permissions
|--------------------------------------------------------------------------
|
| Applicant data contains private recruitment information.
|
| Until a formal recruiter/employer RBAC policy is introduced,
| Applicant Management is restricted to the existing administrative roles.
|
*/

const APPLICANT_ADMIN_ROLES =
  Object.freeze([
    'Admin',
    'Super Admin',
  ]);

const APPLICANT_PERMISSIONS =
  Object.freeze([
    'applicant:view',
    'applicant:edit',
    'applicant:status',
    'applicant:archive',
    'applicant:restore',
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

function normalizeRole(role) {
  return String(role ?? '').trim();
}

function isApplicantAdmin(role) {
  return APPLICANT_ADMIN_ROLES.includes(
    normalizeRole(role)
  );
}

function isApplicantPermission(
  permission
) {
  return APPLICANT_PERMISSIONS.includes(
    String(permission ?? '').trim()
  );
}

function canApplicantAction({
  role,
  permission,
}) {
  if (
    !isApplicantPermission(
      permission
    )
  ) {
    return false;
  }

  return isApplicantAdmin(role);
}

module.exports = {
  APPLICANT_ADMIN_ROLES,
  APPLICANT_PERMISSIONS,
  normalizeRole,
  isApplicantAdmin,
  isApplicantPermission,
  canApplicantAction,
};