'use strict';

const {
  randomUUID,
} = require('crypto');

const ApplicantDocument =
  require(
    '../models/ApplicantDocument'
  );

const {
  DOCUMENT_TYPES,
  STORAGE_PROVIDERS,
  DOCUMENT_SOURCES,
} = ApplicantDocument;

function createError(
  code,
  message
) {
  const error =
    new Error(message);

  error.code = code;

  return error;
}

function text(value) {
  return String(
    value ?? ''
  ).trim();
}

function normalizeDate(
  value,
  fieldName
) {
  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    throw createError(
      'INVALID_DOCUMENT_DATE',
      fieldName +
        ' must be a valid date.'
    );
  }

  return date;
}

function requireApplicantId(
  value
) {
  const applicantId =
    text(value);

  if (!applicantId) {
    throw createError(
      'APPLICANT_ID_REQUIRED',
      'applicantId is required.'
    );
  }

  return applicantId;
}

function requireEnum(
  value,
  allowed,
  fieldName
) {
  const normalized =
    text(value);

  if (
    !allowed.includes(
      normalized
    )
  ) {
    throw createError(
      'INVALID_DOCUMENT_' +
        fieldName
          .toUpperCase(),
      fieldName +
        ' is invalid.'
    );
  }

  return normalized;
}

function normalizeStorage(
  storage
) {
  if (
    !storage ||
    typeof storage !==
      'object' ||
    Array.isArray(storage)
  ) {
    throw createError(
      'DOCUMENT_STORAGE_REQUIRED',
      'storage is required.'
    );
  }

  const provider =
    requireEnum(
      storage.provider,
      STORAGE_PROVIDERS,
      'storage_provider'
    );

  const key =
    text(storage.key);

  const externalUrl =
    text(
      storage.externalUrl
    );

  if (
    provider ===
      'external' &&
    !externalUrl
  ) {
    throw createError(
      'EXTERNAL_URL_REQUIRED',
      'externalUrl is required for external storage.'
    );
  }

  if (
    (
      provider ===
        'local' ||
      provider ===
        's3'
    ) &&
    !key
  ) {
    throw createError(
      'STORAGE_KEY_REQUIRED',
      'storage key is required for managed storage.'
    );
  }

  return {
    provider,
    key,
    externalUrl,
  };
}

function normalizeFile(
  file = {}
) {
  return {
    originalFileName:
      text(
        file.originalFileName
      ),

    storedFileName:
      text(
        file.storedFileName
      ),

    mimeType:
      text(file.mimeType),

    sizeBytes:
      Number.isFinite(
        Number(
          file.sizeBytes
        )
      )
        ? Number(
            file.sizeBytes
          )
        : 0,

    checksumSha256:
      text(
        file.checksumSha256
      ).toLowerCase(),
  };
}

function buildInitialDocumentVersion({
  applicantId,

  documentGroupId =
    randomUUID(),

  documentType,

  title = '',

  file = {},

  storage,

  source,

  sourceSubmissionId =
    null,

  uploadedBy = '',

  uploadedAt =
    new Date(),
}) {
  return {
    applicantId:
      requireApplicantId(
        applicantId
      ),

    documentGroupId:
      text(
        documentGroupId
      ),

    documentType:
      requireEnum(
        documentType,
        DOCUMENT_TYPES,
        'type'
      ),

    title:
      text(title),

    version: 1,

    isCurrent: true,

    file:
      normalizeFile(file),

    storage:
      normalizeStorage(
        storage
      ),

    source:
      requireEnum(
        source,
        DOCUMENT_SOURCES,
        'source'
      ),

    sourceSubmissionId:
      sourceSubmissionId ||
      null,

    uploadedBy:
      text(uploadedBy),

    uploadedAt:
      normalizeDate(
        uploadedAt,
        'uploadedAt'
      ),

    lifecycle: {
      archived: false,
      archivedAt: null,
      archivedBy: '',
      archiveReason: '',
    },
  };
}

function buildNextDocumentVersion({
  currentDocument,

  title,

  file = {},

  storage,

  source =
    'admin_upload',

  sourceSubmissionId =
    null,

  uploadedBy = '',

  uploadedAt =
    new Date(),
}) {
  if (
    !currentDocument ||
    typeof currentDocument !==
      'object'
  ) {
    throw createError(
      'CURRENT_DOCUMENT_REQUIRED',
      'currentDocument is required.'
    );
  }

  if (
    currentDocument
      .lifecycle
      ?.archived === true
  ) {
    throw createError(
      'DOCUMENT_ARCHIVED',
      'An archived document cannot be replaced as the current version.'
    );
  }

  if (
    currentDocument
      .isCurrent !== true
  ) {
    throw createError(
      'CURRENT_VERSION_REQUIRED',
      'A replacement must be created from the current version.'
    );
  }

  const version =
    Number(
      currentDocument.version
    );

  if (
    !Number.isInteger(
      version
    ) ||
    version < 1
  ) {
    throw createError(
      'INVALID_CURRENT_VERSION',
      'Current document version is invalid.'
    );
  }

  const applicantId =
    requireApplicantId(
      currentDocument
        .applicantId
    );

  const documentGroupId =
    text(
      currentDocument
        .documentGroupId
    );

  if (!documentGroupId) {
    throw createError(
      'DOCUMENT_GROUP_REQUIRED',
      'Current documentGroupId is required.'
    );
  }

  const documentType =
    requireEnum(
      currentDocument
        .documentType,
      DOCUMENT_TYPES,
      'type'
    );

  const nextDocument = {
    applicantId,

    documentGroupId,

    documentType,

    title:
      title === undefined
        ? text(
            currentDocument
              .title
          )
        : text(title),

    version:
      version + 1,

    isCurrent: true,

    file:
      normalizeFile(file),

    storage:
      normalizeStorage(
        storage
      ),

    source:
      requireEnum(
        source,
        DOCUMENT_SOURCES,
        'source'
      ),

    sourceSubmissionId:
      sourceSubmissionId ||
      null,

    uploadedBy:
      text(uploadedBy),

    uploadedAt:
      normalizeDate(
        uploadedAt,
        'uploadedAt'
      ),

    lifecycle: {
      archived: false,
      archivedAt: null,
      archivedBy: '',
      archiveReason: '',
    },
  };

  /*
   * Pure transition plan.
   *
   * The current document itself is
   * never mutated here.
   */
  return {
    previousDocumentId:
      currentDocument._id ||
      null,

    previousVersion:
      version,

    previousVersionUpdate: {
      isCurrent: false,
    },

    nextDocument,
  };
}

module.exports = {
  buildInitialDocumentVersion,
  buildNextDocumentVersion,
  normalizeStorage,
  normalizeFile,
};

