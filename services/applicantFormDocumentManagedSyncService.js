'use strict';

const ApplicantDocument =
  require(
    '../models/ApplicantDocument'
  );

const {
  syncFormSubmissionDocuments:
    syncExternalFormDocuments,
} = require(
  './applicantFormDocumentMigrationService'
);

const {
  importExternalFormDocument,
} = require(
  './applicantDriveImportService'
);

const {
  extractDriveFileId,
} = require(
  './googleDriveDocumentService'
);


function text(value) {
  return String(
    value ?? ''
  ).trim();
}


function envEnabled(
  env = process.env
) {
  return (
    text(
      env
        .GOOGLE_DRIVE_DOCUMENT_IMPORT_ENABLED
    ).toLowerCase() ===
    'true'
  );
}


async function resolveLean(
  query
) {
  if (
    query &&
    typeof query.lean ===
      'function'
  ) {
    return query.lean();
  }

  return query;
}


async function syncFormSubmissionDocuments({
  submissionId,
  applicantId = null,

  SubmissionModel,
  DocumentModel =
    ApplicantDocument,

  uploadedBy =
    'system:form-document-sync',

  env =
    process.env,

  syncExternalFn =
    syncExternalFormDocuments,

  importDocumentFn =
    importExternalFormDocument,

  storageFactory,
  driveService,
} = {}) {
  /*
   * Step 1:
   * Preserve the existing deterministic,
   * idempotent external-reference sync.
   */
  const syncResult =
    await syncExternalFn({
      submissionId,
      applicantId,

      ...(SubmissionModel
        ? {
            SubmissionModel,
          }
        : {}),

      DocumentModel,

      uploadedBy,
    });


  /*
   * Managed Drive import is explicitly
   * opt-in.
   *
   * Existing tests and environments remain
   * side-effect free unless enabled.
   */
  if (!envEnabled(env)) {
    return {
      ...syncResult,

      managedImportEnabled:
        false,

      managedImported:
        0,

      managedImportSkipped:
        0,

      managedImportFailed:
        0,
    };
  }


  const linkedApplicantId =
    text(
      syncResult
        ?.applicantId ||
      applicantId
    );

  const sourceSubmissionId =
    text(
      syncResult
        ?.submissionId ||
      submissionId
    );


  /*
   * Only process CURRENT external documents
   * belonging to this Form submission.
   *
   * Once a managed v2 becomes current,
   * it disappears from this query and replay
   * becomes idempotent.
   */
  let query =
    DocumentModel.find({
      applicantId:
        linkedApplicantId,

      source:
        'form_submission',

      sourceSubmissionId:
        sourceSubmissionId,

      isCurrent:
        true,

      'lifecycle.archived': {
        $ne: true,
      },

      'storage.provider':
        'external',
    });


  if (
    query &&
    typeof query.select ===
      'function'
  ) {
    query =
      query.select(
        '_id applicantId documentType storage.externalUrl'
      );
  }


  const documents =
    (
      await resolveLean(
        query
      )
    ) || [];


  let managedImported =
    0;

  let managedImportSkipped =
    0;

  let managedImportFailed =
    0;

  const managedImportFailures =
    [];


  for (
    const document
    of documents
  ) {
    const externalUrl =
      text(
        document
          ?.storage
          ?.externalUrl
      );


    /*
     * Never server-fetch arbitrary external URLs.
     *
     * Only recognized Google Drive IDs are
     * eligible for authenticated import.
     */
    if (
      !extractDriveFileId(
        externalUrl
      )
    ) {
      managedImportSkipped +=
        1;

      continue;
    }


    try {
      const result =
        await importDocumentFn({
          applicantId:
            String(
              document
                .applicantId
            ),

          documentId:
            String(
              document._id
            ),

          uploadedBy:
            'system:form-drive-import',

          DocumentModel,

          ...(storageFactory
            ? {
                storageFactory,
              }
            : {}),

          ...(driveService
            ? {
                driveService,
              }
            : {}),
        });


      if (
        result?.status ===
          'imported'
      ) {
        managedImported +=
          1;
      } else {
        managedImportSkipped +=
          1;
      }
    } catch (error) {
      /*
       * Applicant ingestion/linking must not be
       * destroyed because an old/missing Drive
       * attachment cannot be imported.
       *
       * The external current version remains
       * untouched and can be retried later.
       */
      managedImportFailed +=
        1;

      managedImportFailures.push({
        documentId:
          String(
            document._id
          ),

        code:
          error?.code ||
          'UNKNOWN_ERROR',
      });


      console.warn(
        'Applicant Form managed document import skipped:',
        {
          documentId:
            String(
              document._id
            ),

          code:
            error?.code ||
            'UNKNOWN_ERROR',
        }
      );
    }
  }


  return {
    ...syncResult,

    managedImportEnabled:
      true,

    managedImported,

    managedImportSkipped,

    managedImportFailed,

    managedImportFailures,
  };
}


module.exports = {
  envEnabled,
  syncFormSubmissionDocuments,
};
