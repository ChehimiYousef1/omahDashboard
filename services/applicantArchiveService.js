'use strict';

const Applicant =
  require('../models/Applicant');

const {
  toObjectId,
} = require('./applicantSubmissionService');

/*
|--------------------------------------------------------------------------
| Errors
|--------------------------------------------------------------------------
*/

function serviceError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

/*
|--------------------------------------------------------------------------
| Normalize Actor / Reason
|--------------------------------------------------------------------------
*/

function normalizeActorId(actorId) {
  const value =
    String(actorId ?? '').trim();

  if (!value) {
    throw serviceError(
      'ARCHIVE_ACTOR_REQUIRED',
      'The administrator performing the archive operation is required.'
    );
  }

  return value;
}

function normalizeArchiveReason(reason) {
  return String(reason ?? '').trim();
}

/*
|--------------------------------------------------------------------------
| Archive Applicant
|--------------------------------------------------------------------------
|
| Soft-delete only.
|
| This service deliberately never calls:
|
| - deleteOne()
| - deleteMany()
| - findByIdAndDelete()
| - findOneAndDelete()
|
| Applicant submissions and related historical records remain untouched.
|
*/

async function archiveApplicant({
  applicantId,
  archivedBy,
  reason = '',
  now = new Date(),
  ApplicantModel = Applicant,
}) {
  const applicantObjectId =
    toObjectId(
      applicantId,
      'applicantId'
    );

  const actorId =
    normalizeActorId(
      archivedBy
    );

  const archiveReason =
    normalizeArchiveReason(
      reason
    );

  const archivedAt =
    now instanceof Date
      ? now
      : new Date(now);

  if (
    Number.isNaN(
      archivedAt.getTime()
    )
  ) {
    throw serviceError(
      'ARCHIVE_DATE_INVALID',
      'Archive date is invalid.'
    );
  }

  const result =
    await ApplicantModel.updateOne(
      {
        _id: applicantObjectId,

        'lifecycle.archived': {
          $ne: true,
        },
      },
      {
        $set: {
          'lifecycle.archived':
            true,

          'lifecycle.archivedAt':
            archivedAt,

          'lifecycle.archivedBy':
            actorId,

          'lifecycle.archiveReason':
            archiveReason,
        },
      },
      {
        runValidators: true,
      }
    );

  if (result.matchedCount !== 1) {
    throw serviceError(
      'APPLICANT_NOT_ARCHIVABLE',
      'Applicant was not found or is already archived.'
    );
  }

  return {
    status: 'applicant-archived',

    applicantId:
      String(applicantObjectId),

    archivedAt,

    archivedBy: actorId,

    archiveReason,
  };
}

/*
|--------------------------------------------------------------------------
| Restore Applicant
|--------------------------------------------------------------------------
|
| Restoring makes the Applicant active again.
|
| Historical submissions remain untouched.
|
*/

async function restoreApplicant({
  applicantId,
  ApplicantModel = Applicant,
}) {
  const applicantObjectId =
    toObjectId(
      applicantId,
      'applicantId'
    );

  const result =
    await ApplicantModel.updateOne(
      {
        _id: applicantObjectId,

        'lifecycle.archived':
          true,
      },
      {
        $set: {
          'lifecycle.archived':
            false,

          'lifecycle.archivedAt':
            null,

          'lifecycle.archivedBy':
            '',

          'lifecycle.archiveReason':
            '',
        },
      },
      {
        runValidators: true,
      }
    );

  if (result.matchedCount !== 1) {
    throw serviceError(
      'APPLICANT_NOT_RESTORABLE',
      'Applicant was not found or is not archived.'
    );
  }

  return {
    status: 'applicant-restored',

    applicantId:
      String(applicantObjectId),
  };
}

module.exports = {
  normalizeActorId,
  normalizeArchiveReason,
  archiveApplicant,
  restoreApplicant,
};
