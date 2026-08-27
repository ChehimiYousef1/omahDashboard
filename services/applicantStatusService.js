'use strict';

const Applicant =
  require('../models/Applicant');

const {
  normalizeApplicantStatus,
  isApplicantStatus,
  canTransitionApplicantStatus,
} = require('../utils/applicantStatus');

const {
  toObjectId,
} = require('./applicantSubmissionService');

function serviceError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

async function changeApplicantStatus({
  applicantId,
  nextStatus,
  now = new Date(),
  ApplicantModel = Applicant,
}) {
  const applicantObjectId =
    toObjectId(
      applicantId,
      'applicantId'
    );

  const normalizedNextStatus =
    normalizeApplicantStatus(
      nextStatus
    );

  if (
    !isApplicantStatus(
      normalizedNextStatus
    )
  ) {
    throw serviceError(
      'INVALID_APPLICANT_STATUS',
      `Invalid Applicant status: ${nextStatus}`
    );
  }

  const activityAt =
    now instanceof Date
      ? now
      : new Date(now);

  if (
    Number.isNaN(
      activityAt.getTime()
    )
  ) {
    throw serviceError(
      'STATUS_DATE_INVALID',
      'Status activity date is invalid.'
    );
  }

  const applicant =
    await ApplicantModel.findOne({
      _id: applicantObjectId,

      'lifecycle.archived': {
        $ne: true,
      },
    });

  if (!applicant) {
    throw serviceError(
      'APPLICANT_NOT_FOUND',
      'Applicant was not found or is archived.'
    );
  }

  const currentStatus =
    normalizeApplicantStatus(
      applicant.recruitment?.status
    );

  if (!isApplicantStatus(currentStatus)) {
    throw serviceError(
      'CURRENT_STATUS_INVALID',
      `Applicant has an invalid current status: ${currentStatus}`
    );
  }

  /*
   * Same status = idempotent no-op.
   */
  if (
    currentStatus ===
    normalizedNextStatus
  ) {
    return {
      status: 'status-unchanged',

      applicantId:
        String(applicantObjectId),

      previousStatus:
        currentStatus,

      currentStatus:
        currentStatus,
    };
  }

  if (
    !canTransitionApplicantStatus(
      currentStatus,
      normalizedNextStatus
    )
  ) {
    throw serviceError(
      'STATUS_TRANSITION_NOT_ALLOWED',
      `Applicant status cannot change from ${currentStatus} to ${normalizedNextStatus}.`
    );
  }

  /*
   * Current status is included in the update
   * filter to protect against concurrent changes.
   */
  const result =
    await ApplicantModel.updateOne(
      {
        _id: applicantObjectId,

        'lifecycle.archived': {
          $ne: true,
        },

        'recruitment.status':
          currentStatus,
      },
      {
        $set: {
          'recruitment.status':
            normalizedNextStatus,

          'recruitment.lastActivityAt':
            activityAt,
        },
      },
      {
        runValidators: true,
      }
    );

  if (result.matchedCount !== 1) {
    throw serviceError(
      'STATUS_TRANSITION_CONFLICT',
      'Applicant status changed before this update could be completed.'
    );
  }

  return {
    status: 'status-changed',

    applicantId:
      String(applicantObjectId),

    previousStatus:
      currentStatus,

    currentStatus:
      normalizedNextStatus,

    changedAt:
      activityAt,
  };
}

module.exports = {
  changeApplicantStatus,
};
