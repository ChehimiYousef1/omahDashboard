'use strict';

const Applicant =
  require('../models/Applicant');

const ApplicantFormSubmission =
  require('../models/ApplicantFormSubmission');

const {
  toObjectId,
} = require('./applicantSubmissionService');

function serviceError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

/*
|--------------------------------------------------------------------------
| Applicant Relationship Integrity
|--------------------------------------------------------------------------
|
| Read-only relationship validation.
|
| Verifies:
|
| Applicant
|   1
|   └── many ApplicantFormSubmission
|
| and:
|
| Applicant.latestApprovedSubmissionId
|   └── must point to a submission belonging to that same Applicant.
|
*/

async function checkApplicantRelationshipIntegrity({
  applicantId,
  ApplicantModel = Applicant,
  SubmissionModel =
    ApplicantFormSubmission,
}) {
  const applicantObjectId =
    toObjectId(
      applicantId,
      'applicantId'
    );

  const applicant =
    await ApplicantModel
      .findById(
        applicantObjectId
      )
      .select(
        '_id latestApprovedSubmissionId lifecycle.archived'
      );

  if (!applicant) {
    throw serviceError(
      'APPLICANT_NOT_FOUND',
      'Applicant was not found.'
    );
  }

  const submissionCount =
    await SubmissionModel.countDocuments({
      applicantId:
        applicantObjectId,
    });

  const approvedSubmissionId =
    applicant.latestApprovedSubmissionId;

  if (!approvedSubmissionId) {
    return {
      status:
        'relationship-valid',

      applicantId:
        String(applicantObjectId),

      submissionCount,

      latestApprovedSubmissionId:
        null,
    };
  }

  const approvedSubmission =
    await SubmissionModel
      .findById(
        approvedSubmissionId
      )
      .select(
        '_id applicantId'
      );

  if (!approvedSubmission) {
    throw serviceError(
      'APPROVED_SUBMISSION_NOT_FOUND',
      'The latest approved submission no longer exists.'
    );
  }

  if (
    !approvedSubmission.applicantId ||
    String(
      approvedSubmission.applicantId
    ) !==
      String(applicantObjectId)
  ) {
    throw serviceError(
      'APPROVED_SUBMISSION_RELATIONSHIP_INVALID',
      'The latest approved submission does not belong to this Applicant.'
    );
  }

  return {
    status:
      'relationship-valid',

    applicantId:
      String(applicantObjectId),

    submissionCount,

    latestApprovedSubmissionId:
      String(
        approvedSubmission._id
      ),
  };
}

module.exports = {
  checkApplicantRelationshipIntegrity,
};