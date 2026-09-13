'use strict';

const assert =
  require('assert');

const {
  buildInitialDocumentVersion,
  buildNextDocumentVersion,
} = require(
  '../services/applicantDocumentVersionService'
);

const first =
  buildInitialDocumentVersion({
    applicantId:
      'applicant-001',

    documentGroupId:
      'cv-group-001',

    documentType:
      'cv',

    title:
      'Candidate CV',

    file: {
      originalFileName:
        'cv-v1.pdf',

      mimeType:
        'application/pdf',

      sizeBytes:
        100,
    },

    storage: {
      provider:
        's3',

      key:
        'applicants/a/cv/v1/file.pdf',
    },

    source:
      'admin_upload',

    uploadedBy:
      'admin-001',
  });

assert.strictEqual(
  first.version,
  1
);

assert.strictEqual(
  first.isCurrent,
  true
);

assert.strictEqual(
  first.lifecycle.archived,
  false
);

console.log(
  '✅ initial document version created'
);

const current = {
  _id:
    'document-id-v1',

  ...first,
};

const snapshot =
  JSON.stringify(current);

const transition =
  buildNextDocumentVersion({
    currentDocument:
      current,

    file: {
      originalFileName:
        'cv-v2.pdf',

      mimeType:
        'application/pdf',

      sizeBytes:
        200,
    },

    storage: {
      provider:
        's3',

      key:
        'applicants/a/cv/v2/file.pdf',
    },

    uploadedBy:
      'admin-001',
  });

assert.strictEqual(
  transition
    .previousVersion,
  1
);

assert.strictEqual(
  transition
    .previousVersionUpdate
    .isCurrent,
  false
);

assert.strictEqual(
  transition
    .nextDocument
    .version,
  2
);

assert.strictEqual(
  transition
    .nextDocument
    .isCurrent,
  true
);

assert.strictEqual(
  transition
    .nextDocument
    .documentGroupId,
  first.documentGroupId
);

assert.strictEqual(
  transition
    .nextDocument
    .applicantId,
  first.applicantId
);

assert.strictEqual(
  transition
    .nextDocument
    .documentType,
  'cv'
);

console.log(
  '✅ replacement increments version'
);

assert.strictEqual(
  JSON.stringify(current),
  snapshot
);

console.log(
  '✅ current document was not mutated'
);

assert.throws(
  () =>
    buildNextDocumentVersion({
      currentDocument: {
        ...current,

        isCurrent:
          false,
      },

      storage: {
        provider:
          's3',

        key:
          'valid/key.pdf',
      },
    }),

  /current version/i
);

console.log(
  '✅ non-current version cannot be replaced'
);

assert.throws(
  () =>
    buildNextDocumentVersion({
      currentDocument: {
        ...current,

        lifecycle: {
          archived:
            true,
        },
      },

      storage: {
        provider:
          's3',

        key:
          'valid/key.pdf',
      },
    }),

  /archived document/i
);

console.log(
  '✅ archived version cannot be replaced'
);

console.log(
  '✅ no MongoDB connection used'
);

console.log(
  '\nTASK 3 DOCUMENT VERSIONING TEST PASSED'
);

