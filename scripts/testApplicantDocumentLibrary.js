'use strict';

const assert =
  require('assert');

const {
  getApplicantDocumentLibrary,
} = require(
  '../services/applicantDocumentLibraryService'
);


function fakeModel(
  records
) {
  return {
    find() {
      return {
        select() {
          return this;
        },

        lean() {
          return Promise.resolve(
            records
          );
        },
      };
    },
  };
}


const applicants = [
  {
    _id:
      'applicant-1',

    identity: {
      fullName:
        'Managed Applicant',

      email:
        'managed@example.com',

      country:
        'Lebanon',

      city:
        'Beirut',
    },

    preferences: {
      positionTrack:
        'Engineering',

      positionType:
        'Internship',
    },

    recruitment: {
      status:
        'applied',

      source:
        'google-form',
    },

    lifecycle: {
      archived:
        false,
    },
  },

  {
    _id:
      'applicant-2',

    identity: {
      fullName:
        'Form Applicant',

      email:
        'form@example.com',

      country:
        'Lebanon',

      city:
        'Sidon',
    },

    preferences: {
      positionTrack:
        'Data',

      positionType:
        'Internship',
    },

    recruitment: {
      status:
        'reviewed',

      source:
        'google-form',
    },

    lifecycle: {
      archived:
        false,
    },
  },

  {
    _id:
      'applicant-3',

    identity: {
      fullName:
        'No Documents Applicant',

      email:
        'none@example.com',

      country:
        'Lebanon',

      city:
        'Tripoli',
    },

    preferences: {
      positionTrack:
        'Engineering',

      positionType:
        'Full Time',
    },

    recruitment: {
      status:
        'applied',

      source:
        'manual',
    },

    lifecycle: {
      archived:
        false,
    },
  },
];


const documents = [
  {
    _id:
      'document-current',

    applicantId:
      'applicant-1',

    documentGroupId:
      'group-cv',

    documentType:
      'cv',

    title:
      'Current CV',

    version:
      2,

    isCurrent:
      true,

    file: {
      originalFileName:
        'managed-cv.pdf',

      mimeType:
        'application/pdf',

      sizeBytes:
        2000,
    },

    storage: {
      provider:
        'external',

      externalUrl:
        'https://example.com/shared-cv.pdf',
    },

    source:
      'form_submission',

    uploadedAt:
      '2026-09-10T10:00:00.000Z',

    lifecycle: {
      archived:
        false,
    },
  },

  {
    _id:
      'document-history',

    applicantId:
      'applicant-1',

    documentGroupId:
      'group-cv',

    documentType:
      'cv',

    title:
      'Old CV',

    version:
      1,

    isCurrent:
      false,

    file: {
      originalFileName:
        'old-cv.pdf',
    },

    storage: {
      provider:
        'local',
    },

    source:
      'admin_upload',

    uploadedAt:
      '2026-08-10T10:00:00.000Z',

    lifecycle: {
      archived:
        false,
    },
  },

  {
    _id:
      'document-archived',

    applicantId:
      'applicant-1',

    documentGroupId:
      'group-cert',

    documentType:
      'certificate',

    title:
      'Archived Certificate',

    version:
      1,

    isCurrent:
      false,

    file: {
      originalFileName:
        'certificate.pdf',
    },

    storage: {
      provider:
        'local',
    },

    source:
      'admin_upload',

    uploadedAt:
      '2026-07-10T10:00:00.000Z',

    lifecycle: {
      archived:
        true,
    },
  },
];


const submissions = [
  {
    _id:
      'submission-1',

    applicantId:
      'applicant-1',

    submittedAt:
      '2026-09-01T10:00:00.000Z',

    documents: {
      /*
       * Exact duplicate of the active managed
       * external CV. It must be suppressed.
       */
      cvResume:
        'https://example.com/shared-cv.pdf',

      degreeCertificate:
        'https://example.com/degree.pdf',
    },
  },

  {
    _id:
      'submission-2',

    applicantId:
      'applicant-2',

    submittedAt:
      '2026-09-02T10:00:00.000Z',

    documents: {
      cvResume:
        'https://example.com/form-cv.pdf',

      identityDocument:
        'https://example.com/id-card.pdf',
    },
  },
];


(async () => {
  const library =
    await getApplicantDocumentLibrary({
      query: {
        state:
          'current',

        limit:
          100,
      },

      ApplicantModel:
        fakeModel(
          applicants
        ),

      DocumentModel:
        fakeModel(
          documents
        ),

      SubmissionModel:
        fakeModel(
          submissions
        ),
    });


  assert.strictEqual(
    library
      .summary
      .totalApplicants,
    3
  );

  assert.strictEqual(
    library
      .summary
      .managedCurrent,
    1
  );

  assert.strictEqual(
    library
      .summary
      .managedHistorical,
    1
  );

  assert.strictEqual(
    library
      .summary
      .managedArchived,
    1
  );

  assert.strictEqual(
    library
      .summary
      .formSubmitted,
    3
  );

  assert.strictEqual(
    library
      .summary
      .currentInventoryFiles,
    4
  );

  assert.strictEqual(
    library
      .summary
      .applicantsWithAnyDocument,
    2
  );

  assert.strictEqual(
    library
      .summary
      .applicantsWithoutAnyDocument,
    1
  );

  assert.strictEqual(
    library
      .summary
      .applicantsWithCv,
    2
  );

  assert.strictEqual(
    library
      .summary
      .applicantsMissingCv,
    1
  );

  assert.strictEqual(
    library.items.length,
    4
  );

  assert.strictEqual(
    library.items.filter(
      item =>
        item.origin ===
        'form_submission'
    ).length,
    3
  );

  assert.strictEqual(
    library.items.filter(
      item =>
        item.origin ===
          'managed'
    ).length,
    1
  );

  console.log(
    '✅ managed and Form documents unified'
  );

  console.log(
    '✅ duplicate managed/Form external URL suppressed'
  );

  console.log(
    '✅ current inventory summary'
  );

  console.log(
    '✅ Applicant document coverage'
  );


  const cvOnly =
    await getApplicantDocumentLibrary({
      query: {
        category:
          'cv',

        state:
          'current',
      },

      ApplicantModel:
        fakeModel(
          applicants
        ),

      DocumentModel:
        fakeModel(
          documents
        ),

      SubmissionModel:
        fakeModel(
          submissions
        ),
    });

  assert.strictEqual(
    cvOnly
      .pagination
      .total,
    2
  );

  console.log(
    '✅ category filtering'
  );


  const formOnly =
    await getApplicantDocumentLibrary({
      query: {
        origin:
          'form_submission',

        state:
          'current',
      },

      ApplicantModel:
        fakeModel(
          applicants
        ),

      DocumentModel:
        fakeModel(
          documents
        ),

      SubmissionModel:
        fakeModel(
          submissions
        ),
    });

  assert.strictEqual(
    formOnly
      .pagination
      .total,
    3
  );

  console.log(
    '✅ origin filtering'
  );


  const archived =
    await getApplicantDocumentLibrary({
      query: {
        state:
          'archived',
      },

      ApplicantModel:
        fakeModel(
          applicants
        ),

      DocumentModel:
        fakeModel(
          documents
        ),

      SubmissionModel:
        fakeModel(
          submissions
        ),
    });

  assert.strictEqual(
    archived
      .pagination
      .total,
    1
  );

  assert.strictEqual(
    archived
      .items[0]
      .managed
      .documentId,
    'document-archived'
  );

  console.log(
    '✅ archived managed-document filtering'
  );


  const degreeSearch =
    await getApplicantDocumentLibrary({
      query: {
        fileQ:
          'degree',

        state:
          'current',
      },

      ApplicantModel:
        fakeModel(
          applicants
        ),

      DocumentModel:
        fakeModel(
          documents
        ),

      SubmissionModel:
        fakeModel(
          submissions
        ),
    });

  assert.strictEqual(
    degreeSearch
      .pagination
      .total,
    1
  );

  assert.strictEqual(
    degreeSearch
      .items[0]
      .category,
    'degree_certificate'
  );

  console.log(
    '✅ document text search'
  );


  console.log(
    '✅ no MongoDB connection used'
  );

  console.log(
    '\nAPPLICANT DOCUMENT LIBRARY TEST PASSED'
  );
})().catch(
  error => {
    console.error(
      error
    );

    process.exitCode = 1;
  }
);
