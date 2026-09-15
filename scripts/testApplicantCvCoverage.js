'use strict';

const assert =
  require('assert');

const {
  buildCvApplicantIds,
  buildDataQuality,
  buildDocumentAnalytics,
  buildActionCenter,
} = require(
  '../services/analytics/applicantManagementAnalytics'
);

const {
  getApplicantAnalyticsDrilldown,
} = require(
  '../services/applicantAnalyticsDrilldownService'
);


const applicants = [
  {
    _id: 'applicant-managed',
    identity: {
      fullName:
        'Managed CV Applicant',
      email:
        'managed@example.com',
      phoneNumber:
        '111',
      country:
        'Lebanon',
      city:
        'Beirut',
    },
    preferences: {
      positionTrack:
        'Engineering',
    },
    education: {
      universityName:
        'University',
      degreeLevel:
        'Bachelor',
    },
    skills: {
      primaryTechnical: [
        'Node.js',
      ],
    },
    recruitment: {
      status:
        'applied',
    },
  },

  {
    _id: 'applicant-form',
    identity: {
      fullName:
        'Form CV Applicant',
      email:
        'form@example.com',
      phoneNumber:
        '222',
      country:
        'Lebanon',
      city:
        'Beirut',
    },
    preferences: {
      positionTrack:
        'Engineering',
    },
    education: {
      universityName:
        'University',
      degreeLevel:
        'Bachelor',
    },
    skills: {
      primaryTechnical: [
        'React',
      ],
    },
    recruitment: {
      status:
        'applied',
    },
  },

  {
    _id: 'applicant-missing',
    identity: {
      fullName:
        'Missing CV Applicant',
      email:
        'missing@example.com',
      phoneNumber:
        '333',
      country:
        'Lebanon',
      city:
        'Beirut',
    },
    preferences: {
      positionTrack:
        'Engineering',
    },
    education: {
      universityName:
        'University',
      degreeLevel:
        'Bachelor',
    },
    skills: {
      primaryTechnical: [
        'Python',
      ],
    },
    recruitment: {
      status:
        'applied',
    },
  },
];


const documents = [
  {
    _id:
      'document-1',

    applicantId:
      'applicant-managed',

    documentType:
      'cv',

    isCurrent:
      true,

    lifecycle: {
      archived:
        false,
    },
  },
];


const submissions = [
  {
    _id:
      'submission-form',

    applicantId:
      'applicant-form',

    documents: {
      cvResume:
        'https://example.com/form-cv.pdf',
    },
  },

  {
    _id:
      'submission-empty',

    applicantId:
      'applicant-missing',

    documents: {
      cvResume:
        '',
    },
  },
];


const cvIds =
  buildCvApplicantIds({
    documents,
    submissions,
  });

assert.strictEqual(
  cvIds.has(
    'applicant-managed'
  ),
  true
);

assert.strictEqual(
  cvIds.has(
    'applicant-form'
  ),
  true
);

assert.strictEqual(
  cvIds.has(
    'applicant-missing'
  ),
  false
);

console.log(
  '✅ managed CV recognized'
);

console.log(
  '✅ Form-submitted CV recognized'
);

console.log(
  '✅ empty Form CV not counted'
);


const quality =
  buildDataQuality({
    applicants,
    documents,
    submissions,
  });

assert.strictEqual(
  quality
    .cvCoverage
    .applicantsWithCv,
  2
);

assert.strictEqual(
  quality
    .cvCoverage
    .applicantsMissingCv,
  1
);

console.log(
  '✅ Data Quality CV coverage uses both sources'
);


const documentAnalytics =
  buildDocumentAnalytics({
    applicants,
    documents,
    submissions,
  });

assert.strictEqual(
  documentAnalytics
    .applicantsWithCv,
  2
);

assert.strictEqual(
  documentAnalytics
    .applicantsMissingCv,
  1
);

console.log(
  '✅ Document Analytics CV coverage uses both sources'
);


const actionCenter =
  buildActionCenter({
    applicants,
    documents,
    submissions,
  });

assert.strictEqual(
  actionCenter
    .applicantsMissingCv,
  1
);

console.log(
  '✅ Action Center Missing CV uses both sources'
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


(async () => {
  const result =
    await getApplicantAnalyticsDrilldown({
      query: {
        type:
          'missing_cv',
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
    result.applicantCount,
    1
  );

  assert.strictEqual(
    result.items[0]
      .applicant
      .id,
    'applicant-missing'
  );

  console.log(
    '✅ exact Missing CV drill-down uses both sources'
  );

  console.log(
    '\nAPPLICANT CV COVERAGE TEST PASSED'
  );
})().catch(
  error => {
    console.error(
      error
    );

    process.exitCode = 1;
  }
);
