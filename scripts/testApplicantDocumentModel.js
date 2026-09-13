'use strict';

const assert =
  require('assert');

const mongoose =
  require('mongoose');

const ApplicantDocument =
  require(
    '../models/ApplicantDocument'
  );

const {
  DOCUMENT_TYPES,
  STORAGE_PROVIDERS,
  DOCUMENT_SOURCES,
} = ApplicantDocument;

async function run() {
  const applicantId =
    new mongoose.Types.ObjectId();

  const submissionId =
    new mongoose.Types.ObjectId();

  assert(
    DOCUMENT_TYPES.includes(
      'cv'
    )
  );

  assert(
    STORAGE_PROVIDERS.includes(
      's3'
    )
  );

  assert(
    DOCUMENT_SOURCES.includes(
      'legacy_import'
    )
  );

  console.log(
    '✅ enums configured'
  );

  const external =
    new ApplicantDocument({
      applicantId,

      documentGroupId:
        'cv-group-001',

      documentType:
        'cv',

      title:
        'Historical CV',

      version: 1,

      storage: {
        provider:
          'external',

        externalUrl:
          'https://drive.google.com/example',
      },

      source:
        'legacy_import',

      sourceSubmissionId:
        submissionId,
    });

  await external.validate();

  assert.strictEqual(
    external.version,
    1
  );

  assert.strictEqual(
    external.isCurrent,
    true
  );

  assert.strictEqual(
    external.lifecycle.archived,
    false
  );

  console.log(
    '✅ legacy external document valid'
  );

  const s3Document =
    new ApplicantDocument({
      applicantId,

      documentGroupId:
        'cv-group-002',

      documentType:
        'cv',

      version: 1,

      file: {
        originalFileName:
          'candidate-cv.pdf',

        storedFileName:
          'generated-storage-name.pdf',

        mimeType:
          'application/pdf',

        sizeBytes:
          12345,

        checksumSha256:
          'a'.repeat(64),
      },

      storage: {
        provider:
          's3',

        key:
          'applicants/example/cv.pdf',
      },

      source:
        'admin_upload',

      uploadedBy:
        'admin-test-user',
    });

  await s3Document.validate();

  assert.strictEqual(
    s3Document.file.mimeType,
    'application/pdf'
  );

  console.log(
    '✅ managed document valid'
  );

  const invalidExternal =
    new ApplicantDocument({
      applicantId,

      documentGroupId:
        'bad-external',

      documentType:
        'cv',

      version: 1,

      storage: {
        provider:
          'external',
      },

      source:
        'legacy_import',
    });

  await assert.rejects(
    () =>
      invalidExternal.validate(),

    /externalUrl is required/
  );

  console.log(
    '✅ external URL requirement enforced'
  );

  const invalidManaged =
    new ApplicantDocument({
      applicantId,

      documentGroupId:
        'bad-s3',

      documentType:
        'cv',

      version: 1,

      storage: {
        provider:
          's3',
      },

      source:
        'admin_upload',
    });

  await assert.rejects(
    () =>
      invalidManaged.validate(),

    /storage key is required/
  );

  console.log(
    '✅ managed storage key requirement enforced'
  );

  const invalidVersion =
    new ApplicantDocument({
      applicantId,

      documentGroupId:
        'bad-version',

      documentType:
        'cv',

      version: 0,

      storage: {
        provider:
          'external',

        externalUrl:
          'https://example.com/cv.pdf',
      },

      source:
        'legacy_import',
    });

  await assert.rejects(
    () =>
      invalidVersion.validate()
  );

  console.log(
    '✅ invalid version rejected'
  );

  const indexes =
    ApplicantDocument
      .schema
      .indexes();

  const versionIndex =
    indexes.find(
      ([fields]) =>
        fields.documentGroupId ===
          1 &&
        fields.version === 1
    );

  assert(versionIndex);

  assert.strictEqual(
    versionIndex[1].unique,
    true
  );

  console.log(
    '✅ document version uniqueness configured'
  );

  const currentIndex =
    indexes.find(
      ([fields, options]) =>
        fields.documentGroupId ===
          1 &&
        fields.isCurrent ===
          1 &&
        options.unique ===
          true
    );

  assert(currentIndex);

  assert.deepStrictEqual(
    currentIndex[1]
      .partialFilterExpression,
    {
      isCurrent: true,
      'lifecycle.archived':
        false,
    }
  );

  console.log(
    '✅ one-current-version rule configured'
  );

  /*
   * No save(), create(), update(), or
   * Mongo connection is used.
   */
  assert.strictEqual(
    mongoose.connection.readyState,
    0
  );

  console.log(
    '✅ no MongoDB connection used'
  );

  console.log(
    '\nTASK 2 APPLICANT DOCUMENT MODEL TEST PASSED'
  );
}

run().catch(
  (error) => {
    console.error(error);
    process.exitCode = 1;
  }
);

