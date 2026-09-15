'use strict';

const Applicant =
  require('../models/Applicant');

const ApplicantFormSubmission =
  require('../models/ApplicantFormSubmission');

const {
  ApplicantDuplicateCase,
} = require(
  '../models/ApplicantDuplicateCase'
);

const {
  createApplicantFromSubmission,
} = require(
  './applicantCreationService'
);

const {
  findDuplicateCandidates,
} = require(
  './applicantDuplicateService'
);

const {
  createOrReuseDuplicateCase,
} = require(
  './applicantDuplicateCaseService'
);

const {
  syncFormSubmissionDocuments,
} = require(
  './applicantFormDocumentManagedSyncService'
);

function serviceError(
  code,
  message
) {
  const error =
    new Error(message);

  error.code = code;

  return error;
}

async function findApplicantById(
  ApplicantModel,
  applicantId
) {
  const query =
    ApplicantModel.findById(
      applicantId
    );

  if (
    query &&
    typeof query.lean === 'function'
  ) {
    return query.lean();
  }

  return query;
}

/*
|--------------------------------------------------------------------------
| Ensure Applicant Ingestion
|--------------------------------------------------------------------------
|
| Purpose:
|
| 1. Create/link the master Applicant for a submission.
| 2. Safely replay an already-linked submission.
| 3. Run identity duplicate detection.
| 4. Create/reuse DuplicateCase records.
|
| Important:
|
| - Never merges Applicants.
| - Never deletes submissions.
| - Never overwrites submission answers.
| - Duplicate candidates never prevent Applicant creation.
| - Existing duplicate cases are reused.
|
*/

async function ensureApplicantIngestion({
  submissionId,

  detectedBy =
    'system',

  ApplicantModel =
    Applicant,

  SubmissionModel =
    ApplicantFormSubmission,

  DuplicateCaseModel =
    ApplicantDuplicateCase,

  createApplicantFn =
    createApplicantFromSubmission,

  findDuplicateCandidatesFn =
    findDuplicateCandidates,

  createDuplicateCaseFn =
    createOrReuseDuplicateCase,

  syncFormDocumentsFn =
    syncFormSubmissionDocuments,
}) {
  if (!submissionId) {
    throw serviceError(
      'SUBMISSION_ID_REQUIRED',
      'Submission ID is required.'
    );
  }

  /*
   * This operation is idempotent.
   *
   * Existing active link:
   *   -> already-created
   *
   * Missing link:
   *   -> create + link Applicant
   */

  const creation =
    await createApplicantFn({
      submissionId,
      ApplicantModel,
      SubmissionModel,
    });

  const sourceApplicant =
    await findApplicantById(
      ApplicantModel,
      creation.applicantId
    );

  if (!sourceApplicant) {
    throw serviceError(
      'CREATED_APPLICANT_UNAVAILABLE',
      'Linked Applicant could not be loaded.'
    );
  }

  /*
   * Read-only identity scan.
   */

  const candidates =
    await findDuplicateCandidatesFn({
      record:
        sourceApplicant,

      excludeApplicantId:
        sourceApplicant._id,

      ApplicantModel,
    });

  let duplicateCasesCreated = 0;
  let duplicateCasesReused = 0;

  /*
   * Duplicate evidence never causes
   * an automatic merge.
   */

  for (const candidate of candidates) {
    const candidateApplicant =
      await findApplicantById(
        ApplicantModel,
        candidate.applicantId
      );

    if (!candidateApplicant) {
      throw serviceError(
        'DUPLICATE_CANDIDATE_UNAVAILABLE',
        'Duplicate candidate could not be loaded.'
      );
    }

    const result =
      await createDuplicateCaseFn({
        sourceApplicant,
        candidateApplicant,
        detectedBy,
        DuplicateCaseModel,
      });

    if (result.created) {
      duplicateCasesCreated++;
    } else {
      duplicateCasesReused++;
    }
  }

  /*
   * Once the Applicant relationship is guaranteed,
   * synchronize Form attachments into the managed
   * document system.
   *
   * If this fails, the immutable submission and
   * Applicant link remain preserved. A later replay
   * can safely repair the missing document records.
   */
  const documentSync =
    await syncFormDocumentsFn({
      submissionId,

      applicantId:
        creation.applicantId,

      SubmissionModel,

      uploadedBy:
        'system:applicant-ingestion',
    });


  return {
    submissionId:
      String(submissionId),

    applicantId:
      String(
        creation.applicantId
      ),

    applicantStatus:
      creation.status,

    documentSync,

    duplicateCandidates:
      candidates.length,

    duplicateCasesCreated,

    duplicateCasesReused,
  };
}

module.exports = {
  serviceError,
  ensureApplicantIngestion,
};
