'use strict';

const mongoose = require('mongoose');

const {
  Schema,
} = mongoose;

const DOCUMENT_TYPES = Object.freeze([
  'cv',
  'cover_letter',
  'certificate',
  'transcript',
  'portfolio',
  'identity_document',
  'other',
]);

const STORAGE_PROVIDERS =
  Object.freeze([
    'external',
    'local',
    's3',
  ]);

const DOCUMENT_SOURCES =
  Object.freeze([
    'admin_upload',
    'form_submission',
    'legacy_import',
  ]);

const applicantDocumentSchema =
  new Schema(
    {
      applicantId: {
        type:
          Schema.Types.ObjectId,

        ref:
          'Applicant',

        required: true,

        index: true,
      },

      /*
       * All versions of the same logical
       * document share this group id.
       */
      documentGroupId: {
        type: String,
        required: true,
        trim: true,
      },

      documentType: {
        type: String,
        enum: DOCUMENT_TYPES,
        required: true,
        index: true,
      },

      title: {
        type: String,
        trim: true,
        default: '',
        maxlength: 200,
      },

      /*
       * Versions are immutable.
       * Uploading a replacement creates
       * version N + 1.
       */
      version: {
        type: Number,
        required: true,
        min: 1,
      },

      isCurrent: {
        type: Boolean,
        default: true,
        index: true,
      },

      file: {
        originalFileName: {
          type: String,
          trim: true,
          default: '',
          maxlength: 255,
        },

        storedFileName: {
          type: String,
          trim: true,
          default: '',
          maxlength: 255,
        },

        mimeType: {
          type: String,
          trim: true,
          default: '',
          maxlength: 150,
        },

        sizeBytes: {
          type: Number,
          min: 0,
          default: 0,
        },

        /*
         * SHA-256 is stored as lowercase
         * hexadecimal when available.
         */
        checksumSha256: {
          type: String,
          trim: true,
          lowercase: true,
          default: '',
          match: [
            /^$|^[a-f0-9]{64}$/,
            'checksumSha256 must be a SHA-256 hexadecimal value',
          ],
        },
      },

      storage: {
        provider: {
          type: String,
          enum:
            STORAGE_PROVIDERS,
          required: true,
        },

        /*
         * Private storage identifier.
         *
         * Never expose credentials here.
         */
        key: {
          type: String,
          trim: true,
          default: '',
        },

        /*
         * Used for legacy/external
         * documents such as historical
         * Google Drive CV links.
         */
        externalUrl: {
          type: String,
          trim: true,
          default: '',
        },
      },

      source: {
        type: String,
        enum:
          DOCUMENT_SOURCES,
        required: true,
      },

      sourceSubmissionId: {
        type:
          Schema.Types.ObjectId,

        ref:
          'ApplicantFormSubmission',

        default: null,
      },

      uploadedBy: {
        type: String,
        trim: true,
        default: '',
      },

      uploadedAt: {
        type: Date,
        default: Date.now,
      },

      lifecycle: {
        archived: {
          type: Boolean,
          default: false,
          index: true,
        },

        archivedAt: {
          type: Date,
          default: null,
        },

        archivedBy: {
          type: String,
          trim: true,
          default: '',
        },

        archiveReason: {
          type: String,
          trim: true,
          default: '',
          maxlength: 500,
        },
      },
    },
    {
      timestamps: true,

      collection:
        'applicant_documents',
    }
  );

/*
 * One exact version per document group.
 */
applicantDocumentSchema.index(
  {
    documentGroupId: 1,
    version: 1,
  },
  {
    unique: true,
  }
);

/*
 * Efficient Applicant document history.
 */
applicantDocumentSchema.index({
  applicantId: 1,
  documentType: 1,
  uploadedAt: -1,
});

/*
 * A document group may have only one
 * active current version.
 *
 * Archived versions are excluded.
 */
applicantDocumentSchema.index(
  {
    documentGroupId: 1,
    isCurrent: 1,
  },
  {
    unique: true,

    partialFilterExpression: {
      isCurrent: true,
      'lifecycle.archived': false,
    },
  }
);

/*
 * Storage validation.
 *
 * external -> externalUrl required
 * local/s3 -> storage key required
 */
applicantDocumentSchema.pre(
  'validate',
  function validateStorage(next) {
    const provider =
      this.storage?.provider;

    const key =
      String(
        this.storage?.key ?? ''
      ).trim();

    const externalUrl =
      String(
        this.storage?.externalUrl ??
          ''
      ).trim();

    if (
      provider === 'external' &&
      !externalUrl
    ) {
      this.invalidate(
        'storage.externalUrl',
        'externalUrl is required for external storage'
      );
    }

    if (
      (
        provider === 'local' ||
        provider === 's3'
      ) &&
      !key
    ) {
      this.invalidate(
        'storage.key',
        'storage key is required for managed storage'
      );
    }

    next();
  }
);

const ApplicantDocument =
  mongoose.models
    .ApplicantDocument ||
  mongoose.model(
    'ApplicantDocument',
    applicantDocumentSchema
  );

module.exports =
  ApplicantDocument;

module.exports.DOCUMENT_TYPES =
  DOCUMENT_TYPES;

module.exports.STORAGE_PROVIDERS =
  STORAGE_PROVIDERS;

module.exports.DOCUMENT_SOURCES =
  DOCUMENT_SOURCES;

