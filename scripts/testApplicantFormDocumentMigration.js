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
  buildFormDocumentMigrationPlan,
  buildManagedFormDocumentRecord,
  documentGroupIdFor,
  normalizeExternalUrl,
} = require(
  '../services/applicantFormDocumentMigrationService'
);


const driveFileId =
  '1xwm1bbDD18zAb5jVf8FHa-yoe5gynAKr';

assert.strictEqual(
  normalizeExternalUrl(
    driveFileId
  ),
  'https://drive.google.com/file/d/' +
    driveFileId +
    '/view'
);

assert.strictEqual(
  normalizeExternalUrl(
    'Nan'
  ),
  null
);

console.log(
  '✅ bare Google Drive file id normalized safely'
);

console.log(
  '✅ invalid placeholder value rejected'
);


const applicantId =
  new mongoose.Types.ObjectId();

const submissionNew =
  new mongoose.Types.ObjectId();

const submissionOld =
  new mongoose.Types.ObjectId();


const submissions = [
  {
    _id:
      submissionOld,

    applicantId,

    submittedAt:
      new Date(
        '2026-01-01T10:00:00Z'
      ),

    documents: {
      cvResume:
        'https://example.com/cv.pdf',

      trainingCertificates: [
        'https://example.com/training-a.pdf',
      ],
    },
  },

  {
    _id:
      submissionNew,

    applicantId,

    submittedAt:
      new Date(
        '2026-02-01T10:00:00Z'
      ),

    documents: {
      /*
       * Same CV URL in newer submission.
       * Must appear only once.
       */
      cvResume:
        'https://example.com/cv.pdf',

      degreeCertificate:
        'https://example.com/degree.pdf',

      recommendationLetters: [
        'https://example.com/recommendation.pdf',
      ],

      portfolioWorkSamples: [
        'https://example.com/work-1.pdf',
        'ftp://example.com/invalid.pdf',
      ],
    },
  },
];


const existingDocuments = [
  {
    applicantId,

    documentGroupId:
      'existing-degree',

    storage: {
      provider:
        'external',

      externalUrl:
        'https://example.com/degree.pdf',
    },
  },
];


const plan =
  buildFormDocumentMigrationPlan({
    submissions,
    existingDocuments,
  });


assert.strictEqual(
  plan.summary
    .rawDocumentValues,
  7
);

assert.strictEqual(
  plan.summary
    .invalidUrls,
  1
);

assert.strictEqual(
  plan.summary
    .duplicateFormUrls,
  1
);

assert.strictEqual(
  plan.summary
    .alreadyManaged,
  1
);

assert.strictEqual(
  plan.summary
    .wouldCreate,
  4
);


console.log(
  '✅ repeated Form URLs deduplicated'
);

console.log(
  '✅ existing managed external URLs skipped'
);

console.log(
  '✅ unsupported URL protocols skipped'
);

console.log(
  '✅ all supported Form document categories extracted'
);


const cv =
  plan.candidates.find(
    item =>
      item.documentType ===
      'cv'
  );

assert(cv);

assert.strictEqual(
  String(
    cv.submissionId
  ),
  String(
    submissionNew
  )
);

console.log(
  '✅ newest submission provenance retained'
);


const firstGroup =
  documentGroupIdFor({
    applicantId,
    externalUrl:
      'https://example.com/cv.pdf',
  });

const secondGroup =
  documentGroupIdFor({
    applicantId,
    externalUrl:
      'https://example.com/cv.pdf',
  });

assert.strictEqual(
  firstGroup,
  secondGroup
);

console.log(
  '✅ deterministic idempotent document group'
);


const record =
  buildManagedFormDocumentRecord(
    cv
  );

assert.strictEqual(
  record.storage.provider,
  'external'
);

assert.strictEqual(
  record.source,
  'form_submission'
);

assert.strictEqual(
  String(
    record.sourceSubmissionId
  ),
  String(
    submissionNew
  )
);

assert.strictEqual(
  record.version,
  1
);

assert.strictEqual(
  record.isCurrent,
  true
);


const model =
  new ApplicantDocument(
    record
  );

model.validateSync() ===
  undefined ||
  assert.fail(
    model
      .validateSync()
      ?.message
  );


console.log(
  '✅ migrated record satisfies ApplicantDocument schema'
);

console.log(
  '✅ source Form submission remains referenced'
);

console.log(
  '✅ no MongoDB connection used'
);

console.log(
  '\nAPPLICANT FORM DOCUMENT MIGRATION TEST PASSED'
);
