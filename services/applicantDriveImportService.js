'use strict';

const mongoose =
  require('mongoose');

const ApplicantDocument =
  require(
    '../models/ApplicantDocument'
  );

const {
  validateApplicantDocumentFile,
} = require(
  './applicantDocumentValidationService'
);

const {
  buildStorageKey,
} = require(
  './documentStorageService'
);

const {
  createDocumentStorageFactory,
} = require(
  './documentStorageFactory'
);

const {
  buildNextDocumentVersion,
} = require(
  './applicantDocumentVersionService'
);

const {
  createGoogleDriveDocumentService,
} = require(
  './googleDriveDocumentService'
);

function importError(
  code,
  message
) {
  const error =
    new Error(message);

  error.code = code;

  return error;
}

function idText(
  value
) {
  return String(
    value ?? ''
  ).trim();
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

async function importExternalFormDocument({
  applicantId,
  documentId,

  uploadedBy =
    'system:drive-managed-import',

  now =
    new Date(),

  DocumentModel =
    ApplicantDocument,

  storageFactory =
    createDocumentStorageFactory(),

  driveService =
    createGoogleDriveDocumentService(),
} = {}) {
  if (
    !mongoose.Types.ObjectId.isValid(
      applicantId
    )
  ) {
    throw importError(
      'INVALID_APPLICANT_ID',
      'applicantId must be a valid ObjectId.'
    );
  }

  if (
    !mongoose.Types.ObjectId.isValid(
      documentId
    )
  ) {
    throw importError(
      'INVALID_DOCUMENT_ID',
      'documentId must be a valid ObjectId.'
    );
  }

  const current =
    await resolveLean(
      DocumentModel.findOne({
        _id:
          documentId,

        applicantId,

        isCurrent:
          true,

        'lifecycle.archived': {
          $ne:
            true,
        },
      })
    );

  if (!current) {
    throw importError(
      'CURRENT_DOCUMENT_NOT_FOUND',
      'Current Applicant document was not found.'
    );
  }

  if (
    current.storage
      ?.provider !==
      'external'
  ) {
    return {
      status:
        'already-managed',

      document:
        current,
    };
  }

  if (
    current.source !==
      'form_submission'
  ) {
    throw importError(
      'NOT_FORM_DOCUMENT',
      'Only external Form-submission documents can be imported automatically.'
    );
  }

  const externalUrl =
    idText(
      current.storage
        ?.externalUrl
    );

  if (!externalUrl) {
    throw importError(
      'EXTERNAL_URL_MISSING',
      'External Form document URL is missing.'
    );
  }

  const downloaded =
    await driveService
      .downloadFile(
        externalUrl
      );

  const validated =
    validateApplicantDocumentFile({
      file:
        downloaded,

      documentType:
        current.documentType,
    });

  const storageProvider =
    storageFactory
      .getUploadProvider();

  if (
    storageProvider.provider ===
      'external'
  ) {
    throw importError(
      'MANAGED_STORAGE_REQUIRED',
      'Drive imports require local or S3 managed document storage.'
    );
  }

  const nextVersion =
    Number(
      current.version
    ) + 1;

  const storageKey =
    buildStorageKey({
      applicantId:
        idText(
          current.applicantId
        ),

      documentGroupId:
        current.documentGroupId,

      version:
        nextVersion,

      originalFileName:
        downloaded.originalname,
    });

  let stored = null;
  let previousChanged =
    false;

  try {
    stored =
      await storageProvider.put({
        key:
          storageKey,

        body:
          downloaded.buffer,

        contentType:
          validated.mimeType,
      });

    const transition =
      buildNextDocumentVersion({
        currentDocument:
          current,

        title:
          current.title,

        file: {
          originalFileName:
            downloaded.originalname,

          storedFileName:
            storageKey
              .split('/')
              .pop(),

          mimeType:
            validated.mimeType,

          sizeBytes:
            stored.sizeBytes,

          checksumSha256:
            stored.checksumSha256,
        },

        storage: {
          provider:
            stored.provider,

          key:
            stored.key,
        },

        /*
         * Keep original Form provenance.
         */
        source:
          'form_submission',

        sourceSubmissionId:
          current
            .sourceSubmissionId ||
          null,

        uploadedBy,

        uploadedAt:
          now,
      });

    const updateResult =
      await DocumentModel.updateOne(
        {
          _id:
            current._id,

          isCurrent:
            true,

          'lifecycle.archived': {
            $ne:
              true,
          },
        },

        {
          $set:
            transition
              .previousVersionUpdate,
        },

        {
          runValidators:
            true,
        }
      );

    if (
      updateResult
        .matchedCount !==
      1
    ) {
      throw importError(
        'DOCUMENT_VERSION_CONFLICT',
        'Document changed while the managed version was being imported.'
      );
    }

    previousChanged =
      true;

    const created =
      await DocumentModel.create(
        transition.nextDocument
      );

    return {
      status:
        'imported',

      previousDocument:
        current,

      document:
        created,
    };
  } catch (error) {
    if (previousChanged) {
      try {
        await DocumentModel.updateOne(
          {
            _id:
              current._id,
          },

          {
            $set: {
              isCurrent:
                true,
            },
          }
        );
      } catch (
        rollbackError
      ) {
        console.error(
          'Drive import document rollback failed:',
          rollbackError.message
        );
      }
    }

    if (
      stored &&
      typeof storageProvider
        .cleanup ===
        'function'
    ) {
      try {
        await storageProvider.cleanup({
          key:
            storageKey,
        });
      } catch (
        cleanupError
      ) {
        console.error(
          'Drive import storage cleanup failed:',
          cleanupError.message
        );
      }
    }

    throw error;
  }
}

module.exports = {
  importExternalFormDocument,
};
