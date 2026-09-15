'use strict';

const mongoose = require('mongoose');

const Applicant = require('../models/Applicant');
const ApplicantFormSubmission =
  require('../models/ApplicantFormSubmission');

const {
  syncFormSubmissionDocuments,
} = require(
  './applicantFormDocumentManagedSyncService'
);

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
| ObjectId Validation
|--------------------------------------------------------------------------
*/

function toObjectId(value, fieldName) {
  if (value instanceof mongoose.Types.ObjectId) {
    return value;
  }

  const text = String(value || '').trim();

  if (!/^[a-fA-F0-9]{24}$/.test(text)) {
    throw serviceError(
      'INVALID_OBJECT_ID',
      `${fieldName} must be a valid MongoDB ObjectId.`
    );
  }

  return new mongoose.Types.ObjectId(text);
}

/*
|--------------------------------------------------------------------------
| Link Submission -> Applicant
|--------------------------------------------------------------------------
|
| Rules:
|
| 1. Applicant must exist.
| 2. Submission must exist.
| 3. An unlinked submission may be linked.
| 4. Linking again to the same applicant is idempotent.
| 5. A submission already linked to another applicant is NOT silently moved.
| 6. Submitted application data is never changed here.
|
*/

async function linkSubmissionToApplicant({
  applicantId,
  submissionId,
  ApplicantModel = Applicant,
  SubmissionModel = ApplicantFormSubmission,

  syncFormDocumentsFn =
    syncFormSubmissionDocuments,
}) {
  const applicantObjectId =
    toObjectId(applicantId, 'applicantId');

  const submissionObjectId =
    toObjectId(submissionId, 'submissionId');

  const applicantExists =
    await ApplicantModel.exists({
      _id: applicantObjectId,
      'lifecycle.archived': { $ne: true },
    });

  if (!applicantExists) {
    throw serviceError(
      'APPLICANT_NOT_FOUND',
      'Applicant was not found or is archived.'
    );
  }

  const submission =
    await SubmissionModel
      .findById(submissionObjectId)
      .select('_id applicantId');

  if (!submission) {
    throw serviceError(
      'SUBMISSION_NOT_FOUND',
      'Applicant submission was not found.'
    );
  }

  if (submission.applicantId) {
    const existingApplicantId =
      String(submission.applicantId);

    if (
      existingApplicantId ===
      String(applicantObjectId)
    ) {
      await syncFormDocumentsFn({
        submissionId:
          submissionObjectId,

        applicantId:
          applicantObjectId,

        SubmissionModel,

        uploadedBy:
          'system:manual-submission-link',
      });

      return {
        status: 'already-linked',
        applicantId:
          String(applicantObjectId),
        submissionId:
          String(submissionObjectId),
      };
    }

    throw serviceError(
      'SUBMISSION_ALREADY_LINKED',
      'Submission is already linked to another applicant.'
    );
  }

  const result =
    await SubmissionModel.updateOne(
      {
        _id: submissionObjectId,
        applicantId: null,
      },
      {
        $set: {
          applicantId:
            applicantObjectId,
        },
      }
    );

  if (result.modifiedCount !== 1) {
    throw serviceError(
      'LINK_CONFLICT',
      'Submission could not be linked because its relationship changed.'
    );
  }

  await syncFormDocumentsFn({
    submissionId:
      submissionObjectId,

    applicantId:
      applicantObjectId,

    SubmissionModel,

    uploadedBy:
      'system:manual-submission-link',
  });

  return {
    status: 'linked',
    applicantId:
      String(applicantObjectId),
    submissionId:
      String(submissionObjectId),
  };
}

/*
|--------------------------------------------------------------------------
| Approve Submission Reference
|--------------------------------------------------------------------------
|
| This operation only changes which submission is considered the latest
| administrator-approved source for the Applicant.
|
| IMPORTANT:
| It does NOT copy submission fields into the Applicant profile.
| Current-profile field approval will be handled separately.
|
*/

async function approveSubmissionReference({
  applicantId,
  submissionId,
  ApplicantModel = Applicant,
  SubmissionModel = ApplicantFormSubmission,
}) {
  const applicantObjectId =
    toObjectId(applicantId, 'applicantId');

  const submissionObjectId =
    toObjectId(submissionId, 'submissionId');

  const submission =
    await SubmissionModel
      .findById(submissionObjectId)
      .select('_id applicantId');

  if (!submission) {
    throw serviceError(
      'SUBMISSION_NOT_FOUND',
      'Applicant submission was not found.'
    );
  }

  if (
    !submission.applicantId ||
    String(submission.applicantId) !==
      String(applicantObjectId)
  ) {
    throw serviceError(
      'SUBMISSION_NOT_LINKED_TO_APPLICANT',
      'Submission must belong to the applicant before it can be approved.'
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
          latestApprovedSubmissionId:
            submissionObjectId,
        },
      }
    );

  if (result.matchedCount !== 1) {
    throw serviceError(
      'APPLICANT_NOT_FOUND',
      'Applicant was not found or is archived.'
    );
  }

  return {
    status: 'approved-reference',
    applicantId:
      String(applicantObjectId),
    submissionId:
      String(submissionObjectId),
  };
}

/*
|--------------------------------------------------------------------------
| Read Applicant Submission History
|--------------------------------------------------------------------------
*/

async function getApplicantSubmissions({
  applicantId,
  SubmissionModel = ApplicantFormSubmission,
}) {
  const applicantObjectId =
    toObjectId(applicantId, 'applicantId');

  return SubmissionModel
    .find({
      applicantId:
        applicantObjectId,
    })
    .sort({
      submittedAt: -1,
      createdAt: -1,
    });
}

module.exports = {
  linkSubmissionToApplicant,
  approveSubmissionReference,
  getApplicantSubmissions,
  toObjectId,
};
