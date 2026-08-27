'use strict';

const APPLICANT_STATUSES =
  Object.freeze([
    'applied',
    'reviewed',
    'interview',
    'hired',
    'rejected',
  ]);

const APPLICANT_STATUS_TRANSITIONS =
  Object.freeze({
    applied: Object.freeze([
      'reviewed',
      'interview',
      'rejected',
    ]),

    reviewed: Object.freeze([
      'applied',
      'interview',
      'rejected',
    ]),

    interview: Object.freeze([
      'reviewed',
      'hired',
      'rejected',
    ]),

    hired: Object.freeze([
      'interview',
    ]),

    rejected: Object.freeze([
      'applied',
      'reviewed',
    ]),
  });

function normalizeApplicantStatus(status) {
  return String(status ?? '')
    .trim()
    .toLowerCase();
}

function isApplicantStatus(status) {
  return APPLICANT_STATUSES.includes(
    normalizeApplicantStatus(status)
  );
}

function canTransitionApplicantStatus(
  currentStatus,
  nextStatus
) {
  const current =
    normalizeApplicantStatus(
      currentStatus
    );

  const next =
    normalizeApplicantStatus(
      nextStatus
    );

  if (
    !isApplicantStatus(current) ||
    !isApplicantStatus(next)
  ) {
    return false;
  }

  if (current === next) {
    return true;
  }

  return (
    APPLICANT_STATUS_TRANSITIONS[
      current
    ]?.includes(next) === true
  );
}

module.exports = {
  APPLICANT_STATUSES,
  APPLICANT_STATUS_TRANSITIONS,
  normalizeApplicantStatus,
  isApplicantStatus,
  canTransitionApplicantStatus,
};
