'use strict';

const assert =
  require('assert');

const mongoose =
  require('mongoose');

const {
  syncFormSubmissionDocuments,
} = require(
  '../services/applicantFormDocumentMigrationService'
);


const APPLICANT_ID =
  '66a000000000000000000000001';

const SUBMISSION_ID =
  '66b000000000000000000000001';

const DRIVE_ID =
  '1xwm1bbDD18zAb5jVf8FHa-yoe5gynAKr';


function queryResult(
  value
) {
  return {
    select() {
      return this;
    },

    async lean() {
      return value;
    },
  };
}


const submission = {
  _id:
    SUBMISSION_ID,

  applicantId:
    APPLICANT_ID,

  submittedAt:
    new Date(
      '2026-09-15T10:00:00Z'
    ),

  documents: {
    cvResume:
      DRIVE_ID,

    degreeCertificate:
      'https://example.com/degree.pdf',

    additionalSupportingDocuments: [
      'Nan',
    ],
  },
};


const storedDocuments = [];


const SubmissionModel = {
  findById() {
    return queryResult(
      submission
    );
  },
};


const DocumentModel = {
  find() {
    return queryResult(
      storedDocuments
    );
  },

  async updateOne(
    filter,
    update
  ) {
    const existing =
      storedDocuments.find(
        item =>
          item.documentGroupId ===
            filter.documentGroupId &&
          item.version ===
            filter.version
      );

    if (existing) {
      return {
        matchedCount:
          1,

        upsertedCount:
          0,
      };
    }

    storedDocuments.push(
      update.$setOnInsert
    );

    return {
      matchedCount:
        0,

      upsertedCount:
        1,

      upsertedId:
        'fake-id',
    };
  },
};


async function run() {
  assert.strictEqual(
    mongoose.connection.readyState,
    0
  );


  const first =
    await syncFormSubmissionDocuments({
      submissionId:
        SUBMISSION_ID,

      applicantId:
        APPLICANT_ID,

      SubmissionModel,

      DocumentModel,
    });


  assert.strictEqual(
    first.inserted,
    2
  );

  assert.strictEqual(
    first.invalidUrls,
    1
  );

  assert.strictEqual(
    storedDocuments.length,
    2
  );


  const cv =
    storedDocuments.find(
      item =>
        item.documentType ===
          'cv'
    );

  assert.ok(cv);

  assert.strictEqual(
    cv.storage.externalUrl,
    `https://drive.google.com/file/d/${DRIVE_ID}/view`
  );

  assert.strictEqual(
    String(
      cv.sourceSubmissionId
    ),
    SUBMISSION_ID
  );

  assert.strictEqual(
    cv.source,
    'form_submission'
  );


  const second =
    await syncFormSubmissionDocuments({
      submissionId:
        SUBMISSION_ID,

      applicantId:
        APPLICANT_ID,

      SubmissionModel,

      DocumentModel,
    });


  assert.strictEqual(
    second.inserted,
    0
  );

  assert.strictEqual(
    second.alreadyManaged,
    2
  );

  assert.strictEqual(
    storedDocuments.length,
    2
  );


  await assert.rejects(
    () =>
      syncFormSubmissionDocuments({
        submissionId:
          SUBMISSION_ID,

        applicantId:
          '66a000000000000000000000099',

        SubmissionModel,

        DocumentModel,
      }),

    error =>
      error?.code ===
      'SUBMISSION_APPLICANT_MISMATCH'
  );


  assert.strictEqual(
    mongoose.connection.readyState,
    0
  );


  console.log(
    '✅ new linked submission auto-syncs Form documents'
  );

  console.log(
    '✅ bare Drive id normalized'
  );

  console.log(
    '✅ invalid placeholder skipped'
  );

  console.log(
    '✅ replay creates zero duplicates'
  );

  console.log(
    '✅ Applicant ownership mismatch rejected'
  );

  console.log(
    '✅ no MongoDB connection'
  );

  console.log(
    '\nAPPLICANT FORM DOCUMENT AUTO-SYNC TEST PASSED'
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
