'use strict';

const crypto =
  require('crypto');

const ApplicantFormSubmission =
  require('../models/ApplicantFormSubmission');

const ApplicantDocument =
  require('../models/ApplicantDocument');

const {
  buildInitialDocumentVersion,
} = require(
  './applicantDocumentVersionService'
);


const FORM_DOCUMENT_MIGRATION_DEFINITIONS =
  Object.freeze([
    {
      field:
        'cvResume',
      documentType:
        'cv',
      title:
        'Original Form — CV / Resume',
      multiple:
        false,
    },

    {
      field:
        'identityDocument',
      documentType:
        'identity_document',
      title:
        'Original Form — Identity Document',
      multiple:
        false,
    },

    {
      field:
        'enrollmentDocument',
      documentType:
        'transcript',
      title:
        'Original Form — University / Enrollment Document',
      multiple:
        false,
    },

    {
      field:
        'degreeCertificate',
      documentType:
        'certificate',
      title:
        'Original Form — Degree / Graduation Certificate',
      multiple:
        false,
    },

    {
      field:
        'trainingCertificates',
      documentType:
        'certificate',
      title:
        'Original Form — Training Certificate',
      multiple:
        true,
    },

    {
      field:
        'recommendationLetters',
      documentType:
        'other',
      title:
        'Original Form — Recommendation Letter',
      multiple:
        true,
    },

    {
      field:
        'portfolioWorkSamples',
      documentType:
        'portfolio',
      title:
        'Original Form — Portfolio / Work Sample',
      multiple:
        true,
    },

    {
      field:
        'additionalSupportingDocuments',
      documentType:
        'other',
      title:
        'Original Form — Additional Supporting Document',
      multiple:
        true,
    },
  ]);


function text(
  value
) {
  return typeof value ===
    'string'
    ? value.trim()
    : '';
}


function idOf(
  value
) {
  return String(
    value ?? ''
  ).trim();
}


function valueList(
  value
) {
  if (
    Array.isArray(
      value
    )
  ) {
    return value
      .map(text)
      .filter(Boolean);
  }

  const single =
    text(value);

  return single
    ? [single]
    : [];
}


function normalizeExternalUrl(
  value
) {
  const raw =
    text(value);

  if (!raw) {
    return null;
  }


  /*
   * Historical Google Form / Sheet imports can
   * contain the Google Drive file id itself rather
   * than a full URL.
   *
   * Drive file ids commonly use letters, digits,
   * underscores and hyphens and are substantially
   * longer than placeholder values such as "Nan".
   */
  if (
    /^[A-Za-z0-9_-]{20,100}$/
      .test(raw)
  ) {
    return (
      'https://drive.google.com/file/d/' +
      raw +
      '/view'
    );
  }


  try {
    const url =
      new URL(raw);

    if (
      url.protocol !==
        'http:' &&
      url.protocol !==
        'https:'
    ) {
      return null;
    }

    /*
     * A fragment does not identify a different
     * stored file and can break idempotent matching.
     *
     * Query parameters are preserved because some
     * providers require them for access.
     */
    url.hash = '';

    return url.toString();
  } catch {
    return null;
  }
}


function externalFileName(
  externalUrl
) {
  try {
    const url =
      new URL(
        externalUrl
      );

    const last =
      decodeURIComponent(
        url.pathname
          .split('/')
          .filter(Boolean)
          .pop() ||
        ''
      );

    if (
      !last ||
      last.length > 255
    ) {
      return '';
    }

    /*
     * Google Drive-style URLs often finish in
     * "view" rather than a useful filename.
     */
    if (
      !last.includes('.')
    ) {
      return '';
    }

    return last;
  } catch {
    return '';
  }
}


function candidateKey({
  applicantId,
  externalUrl,
}) {
  return (
    idOf(applicantId) +
    '|' +
    externalUrl
  );
}


function documentGroupIdFor({
  applicantId,
  externalUrl,
}) {
  const digest =
    crypto
      .createHash(
        'sha256'
      )
      .update(
        candidateKey({
          applicantId,
          externalUrl,
        })
      )
      .digest(
        'hex'
      );

  return (
    'form-' +
    digest.slice(
      0,
      40
    )
  );
}


function dateValue(
  value
) {
  if (!value) {
    return 0;
  }

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  const time =
    date.getTime();

  return Number.isNaN(
    time
  )
    ? 0
    : time;
}


function buildFormDocumentMigrationPlan({
  submissions = [],
  existingDocuments = [],
} = {}) {
  const existingUrls =
    new Set();

  const existingGroups =
    new Set();

  for (
    const document
    of existingDocuments
  ) {
    const applicantId =
      idOf(
        document
          ?.applicantId
      );

    const externalUrl =
      normalizeExternalUrl(
        document
          ?.storage
          ?.externalUrl
      );

    if (
      applicantId &&
      externalUrl
    ) {
      existingUrls.add(
        candidateKey({
          applicantId,
          externalUrl,
        })
      );
    }

    const groupId =
      text(
        document
          ?.documentGroupId
      );

    if (groupId) {
      existingGroups.add(
        groupId
      );
    }
  }


  /*
   * Newest submissions first:
   * if the same exact URL appears in multiple
   * submissions, retain the newest provenance.
   */
  const orderedSubmissions =
    [...submissions]
      .sort(
        (
          left,
          right
        ) =>
          dateValue(
            right
              ?.submittedAt ||
            right
              ?.createdAt
          ) -
          dateValue(
            left
              ?.submittedAt ||
            left
              ?.createdAt
          )
      );


  const seen =
    new Set();

  const candidates = [];

  const summary = {
    submissionsScanned:
      orderedSubmissions.length,

    linkedSubmissions:
      0,

    rawDocumentValues:
      0,

    invalidUrls:
      0,

    duplicateFormUrls:
      0,

    alreadyManaged:
      0,

    wouldCreate:
      0,
  };


  for (
    const submission
    of orderedSubmissions
  ) {
    const applicantId =
      idOf(
        submission
          ?.applicantId
      );

    if (!applicantId) {
      continue;
    }

    summary.linkedSubmissions +=
      1;


    for (
      const definition
      of FORM_DOCUMENT_MIGRATION_DEFINITIONS
    ) {
      const values =
        valueList(
          submission
            ?.documents
            ?.[
              definition.field
            ]
        );


      values.forEach(
        (
          rawValue,
          index
        ) => {
          summary.rawDocumentValues +=
            1;

          const externalUrl =
            normalizeExternalUrl(
              rawValue
            );

          if (!externalUrl) {
            summary.invalidUrls +=
              1;

            return;
          }


          const key =
            candidateKey({
              applicantId,
              externalUrl,
            });


          if (
            seen.has(
              key
            )
          ) {
            summary.duplicateFormUrls +=
              1;

            return;
          }

          seen.add(
            key
          );


          const documentGroupId =
            documentGroupIdFor({
              applicantId,
              externalUrl,
            });


          if (
            existingUrls.has(
              key
            ) ||
            existingGroups.has(
              documentGroupId
            )
          ) {
            summary.alreadyManaged +=
              1;

            return;
          }


          const countForField =
            values.length;

          const title =
            definition.multiple &&
            countForField > 1
              ? (
                  definition.title +
                  ' ' +
                  (index + 1)
                )
              : definition.title;


          candidates.push({
            applicantId,

            submissionId:
              idOf(
                submission._id
              ),

            field:
              definition.field,

            documentType:
              definition.documentType,

            title,

            externalUrl,

            documentGroupId,

            originalFileName:
              externalFileName(
                externalUrl
              ),

            uploadedAt:
              submission
                ?.submittedAt ||
              submission
                ?.createdAt ||
              new Date(),
          });
        }
      );
    }
  }


  summary.wouldCreate =
    candidates.length;


  return {
    candidates,
    summary,
  };
}


function buildManagedFormDocumentRecord(
  candidate,
  {
    uploadedBy =
      'migration:form-documents',
  } = {}
) {
  return buildInitialDocumentVersion({
    applicantId:
      candidate.applicantId,

    documentGroupId:
      candidate.documentGroupId,

    documentType:
      candidate.documentType,

    title:
      candidate.title,

    file: {
      originalFileName:
        candidate
          .originalFileName ||
        '',
    },

    storage: {
      provider:
        'external',

      externalUrl:
        candidate.externalUrl,
    },

    source:
      'form_submission',

    sourceSubmissionId:
      candidate.submissionId,

    uploadedBy,

    uploadedAt:
      candidate.uploadedAt,
  });
}



function formDocumentSyncError(
  code,
  message
) {
  const error =
    new Error(message);

  error.code =
    code;

  return error;
}


async function resolveLeanQuery(
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


/*
|--------------------------------------------------------------------------
| Synchronize ONE linked Form submission into ApplicantDocument
|--------------------------------------------------------------------------
|
| Production-safe properties:
|
| - immutable ApplicantFormSubmission remains untouched
| - deterministic documentGroupId
| - Applicant + URL identity
| - idempotent replay
| - duplicate-key race safe
| - external references only; no Drive download is attempted
| - invalid Form values are skipped
|
*/
async function syncFormSubmissionDocuments({
  submissionId,
  applicantId = null,

  SubmissionModel =
    ApplicantFormSubmission,

  DocumentModel =
    ApplicantDocument,

  uploadedBy =
    'system:form-document-sync',
} = {}) {
  const sourceSubmissionId =
    idOf(
      submissionId
    );

  if (!sourceSubmissionId) {
    throw formDocumentSyncError(
      'SUBMISSION_ID_REQUIRED',
      'Submission ID is required for Form document synchronization.'
    );
  }


  let submissionQuery =
    SubmissionModel.findById(
      sourceSubmissionId
    );

  if (
    submissionQuery &&
    typeof submissionQuery.select ===
      'function'
  ) {
    submissionQuery =
      submissionQuery.select(
        '_id applicantId documents submittedAt createdAt'
      );
  }

  const submission =
    await resolveLeanQuery(
      submissionQuery
    );

  if (!submission) {
    throw formDocumentSyncError(
      'SUBMISSION_NOT_FOUND',
      'Applicant Form submission was not found.'
    );
  }


  const linkedApplicantId =
    idOf(
      submission.applicantId
    );

  if (!linkedApplicantId) {
    throw formDocumentSyncError(
      'SUBMISSION_NOT_LINKED',
      'Applicant Form submission must be linked before its documents can be synchronized.'
    );
  }


  const expectedApplicantId =
    idOf(
      applicantId
    );

  if (
    expectedApplicantId &&
    expectedApplicantId !==
      linkedApplicantId
  ) {
    throw formDocumentSyncError(
      'SUBMISSION_APPLICANT_MISMATCH',
      'Submission is linked to a different Applicant.'
    );
  }


  let documentsQuery =
    DocumentModel.find({
      applicantId:
        linkedApplicantId,
    });

  if (
    documentsQuery &&
    typeof documentsQuery.select ===
      'function'
  ) {
    documentsQuery =
      documentsQuery.select(
        'applicantId documentGroupId storage.externalUrl'
      );
  }

  const existingDocuments =
    (
      await resolveLeanQuery(
        documentsQuery
      )
    ) || [];


  const plan =
    buildFormDocumentMigrationPlan({
      submissions: [
        submission,
      ],

      existingDocuments,
    });


  let inserted = 0;
  let raceSkipped = 0;


  for (
    const candidate
    of plan.candidates
  ) {
    const record =
      buildManagedFormDocumentRecord(
        candidate,
        {
          uploadedBy,
        }
      );

    try {
      const result =
        await DocumentModel.updateOne(
          {
            documentGroupId:
              record.documentGroupId,

            version:
              1,
          },
          {
            $setOnInsert:
              record,
          },
          {
            upsert:
              true,

            runValidators:
              true,
          }
        );

      if (
        result?.upsertedCount ===
          1 ||
        result?.upsertedId
      ) {
        inserted += 1;
      }
    } catch (error) {
      /*
       * Two simultaneous reconciliation processes
       * may both reach the deterministic insert.
       * The unique group/version index makes this
       * safe. If the other process won, treat it
       * as an idempotent skip.
       */
      if (
        error &&
        error.code ===
          11000
      ) {
        raceSkipped +=
          1;

        continue;
      }

      throw error;
    }
  }


  return {
    status:
      'synced',

    submissionId:
      sourceSubmissionId,

    applicantId:
      linkedApplicantId,

    inserted,

    alreadyManaged:
      plan.summary
        .alreadyManaged +
      raceSkipped,

    invalidUrls:
      plan.summary
        .invalidUrls,

    duplicateFormUrls:
      plan.summary
        .duplicateFormUrls,

    rawDocumentValues:
      plan.summary
        .rawDocumentValues,
  };
}

module.exports = {
  FORM_DOCUMENT_MIGRATION_DEFINITIONS,
  normalizeExternalUrl,
  documentGroupIdFor,
  buildFormDocumentMigrationPlan,
  buildManagedFormDocumentRecord,
  syncFormSubmissionDocuments,
};
