'use strict';

const assert =
  require('assert');

const {
  getApplicantDocumentLibrary,
} = require(
  '../services/applicantDocumentLibraryService'
);


const DRIVE_ID =
  '1xwm1bbDD18zAb5jVf8FHa-yoe5gynAKr';

const DRIVE_URL =
  `https://drive.google.com/file/d/${DRIVE_ID}/view`;


function fakeModel(
  records
) {
  return {
    find() {
      return {
        select() {
          return this;
        },

        async lean() {
          return records;
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
        'Applicant One',

      email:
        'one@example.com',
    },

    recruitment: {
      status:
        'applied',
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
        'Applicant Two',

      email:
        'two@example.com',
    },

    recruitment: {
      status:
        'applied',
    },

    lifecycle: {
      archived:
        false,
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
      '2026-09-15T10:00:00.000Z',

    documents: {
      cvResume:
        DRIVE_ID,
    },
  },

  {
    _id:
      'submission-2',

    applicantId:
      'applicant-2',

    submittedAt:
      '2026-09-15T10:01:00.000Z',

    documents: {
      cvResume:
        DRIVE_ID,
    },
  },
];


async function getLibrary(
  documents
) {
  return getApplicantDocumentLibrary({
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
}


async function run() {
  const formOnly =
    await getLibrary(
      []
    );

  assert.strictEqual(
    formOnly.items.length,
    2,
    'Same Form URL belonging to two Applicants must remain visible for both Applicants.'
  );


  const withManaged =
    await getLibrary([
      {
        _id:
          'managed-1',

        applicantId:
          'applicant-1',

        documentGroupId:
          'group-1',

        documentType:
          'cv',

        title:
          'Original Form — CV / Resume',

        version:
          1,

        isCurrent:
          true,

        file: {
          originalFileName:
            '',
          mimeType:
            '',
          sizeBytes:
            0,
        },

        storage: {
          provider:
            'external',

          externalUrl:
            DRIVE_URL,
        },

        source:
          'form_submission',

        sourceSubmissionId:
          'submission-1',

        uploadedAt:
          '2026-09-15T10:00:00.000Z',

        lifecycle: {
          archived:
            false,

          archivedAt:
            null,

          archiveReason:
            '',
        },
      },
    ]);


  /*
   * Applicant 1:
   * managed copy remains, immutable Form duplicate hidden.
   *
   * Applicant 2:
   * same URL must still remain as its own Form item.
   */
  assert.strictEqual(
    withManaged.items.length,
    2
  );


  const applicantIds =
    withManaged.items
      .map(
        item =>
          item.applicant.id
      )
      .sort();


  assert.deepStrictEqual(
    applicantIds,
    [
      'applicant-1',
      'applicant-2',
    ]
  );


  console.log(
    '✅ same URL across Applicants is not globally deduplicated'
  );

  console.log(
    '✅ managed/Form dedup remains scoped to the correct Applicant'
  );

  console.log(
    '✅ bare Drive ids normalize to the managed Drive URL'
  );

  console.log(
    '\nAPPLICANT DOCUMENT LIBRARY DEDUP SCOPE TEST PASSED'
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
