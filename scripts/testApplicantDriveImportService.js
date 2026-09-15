'use strict';

const assert =
  require('assert');

const crypto =
  require('crypto');

const {
  importExternalFormDocument,
} = require(
  '../services/applicantDriveImportService'
);

const APPLICANT_ID =
  '66a000000000000000000001';

const DOCUMENT_ID =
  '66b000000000000000000001';

const SUBMISSION_ID =
  '66c000000000000000000001';

const DRIVE_ID =
  '1xwm1bbDD18zAb5jVf8FHa-yoe5gynAKr';

const current = {
  _id:
    DOCUMENT_ID,

  applicantId:
    APPLICANT_ID,

  documentGroupId:
    'form-test-group',

  documentType:
    'cv',

  title:
    'Original Form — CV / Resume',

  version:
    1,

  isCurrent:
    true,

  source:
    'form_submission',

  sourceSubmissionId:
    SUBMISSION_ID,

  uploadedBy:
    'migration:form-documents',

  uploadedAt:
    new Date(),

  lifecycle: {
    archived:
      false,
  },

  storage: {
    provider:
      'external',

    externalUrl:
      `https://drive.google.com/file/d/${DRIVE_ID}/view`,
  },

  file: {
    originalFileName:
      '',
  },
};

let storedObject = null;
let createdDocument = null;

const DocumentModel = {
  findOne() {
    return {
      async lean() {
        return {
          ...current,
          storage: {
            ...current.storage,
          },
          lifecycle: {
            ...current.lifecycle,
          },
        };
      },
    };
  },

  async updateOne(
    filter,
    update
  ) {
    if (
      filter._id ===
        DOCUMENT_ID &&
      filter.isCurrent ===
        true
    ) {
      current.isCurrent =
        false;

      return {
        matchedCount:
          1,
      };
    }

    if (
      filter._id ===
        DOCUMENT_ID &&
      update?.$set
        ?.isCurrent ===
        true
    ) {
      current.isCurrent =
        true;

      return {
        matchedCount:
          1,
      };
    }

    return {
      matchedCount:
        0,
    };
  },

  async create(record) {
    createdDocument =
      record;

    return {
      _id:
        '66d000000000000000000001',

      ...record,
    };
  },
};

const storageProvider = {
  provider:
    'local',

  async put({
    key,
    body,
    contentType,
  }) {
    storedObject = {
      key,
      body,
      contentType,
    };

    return {
      provider:
        'local',

      key,

      sizeBytes:
        body.length,

      checksumSha256:
        crypto
          .createHash(
            'sha256'
          )
          .update(body)
          .digest('hex'),
    };
  },

  async cleanup() {
    storedObject =
      null;

    return true;
  },
};

const storageFactory = {
  getUploadProvider() {
    return storageProvider;
  },
};

const driveService = {
  async downloadFile(
    url
  ) {
    assert.strictEqual(
      url,
      current
        .storage
        .externalUrl
    );

    return {
      fileId:
        DRIVE_ID,

      originalname:
        'candidate-cv.pdf',

      mimetype:
        'application/pdf',

      buffer:
        Buffer.from(
          '%PDF-1.7\nmock applicant cv'
        ),
    };
  },
};

async function run() {
  const result =
    await importExternalFormDocument({
      applicantId:
        APPLICANT_ID,

      documentId:
        DOCUMENT_ID,

      DocumentModel,

      storageFactory,

      driveService,

      uploadedBy:
        'test:drive-import',
    });

  assert.strictEqual(
    result.status,
    'imported'
  );

  assert.ok(
    storedObject
  );

  assert.ok(
    createdDocument
  );

  assert.strictEqual(
    createdDocument.version,
    2
  );

  assert.strictEqual(
    createdDocument.isCurrent,
    true
  );

  assert.strictEqual(
    createdDocument.storage
      .provider,
    'local'
  );

  assert.ok(
    createdDocument.storage
      .key
  );

  assert.strictEqual(
    createdDocument.source,
    'form_submission'
  );

  assert.strictEqual(
    String(
      createdDocument
        .sourceSubmissionId
    ),
    SUBMISSION_ID
  );

  assert.strictEqual(
    createdDocument
      .file
      .originalFileName,
    'candidate-cv.pdf'
  );

  assert.strictEqual(
    createdDocument
      .file
      .mimeType,
    'application/pdf'
  );

  assert.strictEqual(
    current.isCurrent,
    false
  );

  console.log(
    '✅ external Form document loaded'
  );

  console.log(
    '✅ Drive file download mocked'
  );

  console.log(
    '✅ existing file validation reused'
  );

  console.log(
    '✅ managed storage write mocked'
  );

  console.log(
    '✅ external version retained as history'
  );

  console.log(
    '✅ managed version 2 becomes current'
  );

  console.log(
    '✅ Form submission provenance preserved'
  );

  console.log(
    '✅ no real Google Drive request'
  );

  console.log(
    '✅ no real MongoDB write'
  );

  console.log(
    '✅ no real filesystem write'
  );

  console.log(
    '\nAPPLICANT DRIVE IMPORT SERVICE TEST PASSED'
  );
}

run().catch(
  error => {
    console.error(
      '❌ TEST FAILED:',
      error
    );

    process.exitCode =
      1;
  }
);
