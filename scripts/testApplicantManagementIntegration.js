'use strict';

const assert =
  require('assert');

const {
  getApplicantAnalytics,
} = require(
  '../services/applicantAnalyticsService'
);


function fakeModel(
  documents
) {
  return {
    find() {
      return {
        select() {
          return this;
        },

        async lean() {
          return documents;
        },
      };
    },
  };
}


const applicants = [
  {
    _id: 'a1',

    applicantCode:
      'APP-001',

    fullName:
      'Applicant One',

    email:
      'one@example.com',

    phoneNumber:
      '123456',

    identity: {
      country:
        'Lebanon',

      city:
        'Beirut',
    },

    education: {
      universityName:
        'Lebanese University',

      degreeLevel:
        'Bachelor',

      major:
        'Computer Science',
    },

    preferences: {
      positionTrack:
        'Full Stack',

      positionType:
        'Internship',
    },

    skills: {
      primaryTechnical: [
        'Node.js',
        'React',
      ],

      programmingLanguages: [
        'JavaScript',
      ],
    },

    recruitment: {
      status:
        'applied',

      source:
        'google-form',

      firstAppliedAt:
        new Date(
          '2026-08-01'
        ),

      tags: [],
    },

    lifecycle: {
      archived: false,
    },

    createdAt:
      new Date(
        '2026-08-01'
      ),
  },

  {
    _id: 'a2',

    applicantCode:
      'APP-002',

    fullName:
      'Applicant Two',

    email:
      'two@example.com',

    phoneNumber:
      '',

    identity: {
      country:
        'Lebanon',

      city:
        'Sidon',
    },

    education: {
      universityName:
        'University B',

      degreeLevel:
        'Master',

      major:
        'Data Science',
    },

    preferences: {
      positionTrack:
        'Data Analytics',

      positionType:
        'Internship',
    },

    skills: {
      primaryTechnical: [
        'Power BI',
      ],

      programmingLanguages: [
        'Python',
      ],
    },

    recruitment: {
      status:
        'offered',

      source:
        'manual',

      firstAppliedAt:
        new Date(
          '2026-09-01'
        ),

      tags: [],
    },

    lifecycle: {
      archived: false,
    },

    createdAt:
      new Date(
        '2026-09-01'
      ),
  },
];


const evaluations = [
  {
    _id: 'e1',

    applicantId:
      'a1',

    status:
      'draft',

    recommendation:
      'hold',

    archived: false,
  },

  {
    _id: 'e2',

    applicantId:
      'a2',

    evaluator: {
      name:
        'Recruiter',

      role:
        'Recruiter',
    },

    status:
      'submitted',

    recommendation:
      'strong_yes',

    averageRating:
      4.7,

    weightedScore:
      93,

    criteria: {
      technicalFit: 5,
      relevantExperience: 4,
      communication: 5,
      motivationCommitment: 4,
      learningPotential: 5,
    },

    strengths:
      'Strong analytical skills',

    concerns:
      '',

    summary:
      'Recommended',

    submittedAt:
      new Date(
        '2026-09-14'
      ),

    archived: false,
  },
];


const interviews = [
  {
    _id: 'i1',

    applicantId:
      'a2',

    type:
      'final',

    status:
      'scheduled',

    format:
      'online',

    outcome:
      'pending',

    scheduledStart:
      new Date(
        '2026-09-17T10:00:00Z'
      ),

    scheduledEnd:
      new Date(
        '2026-09-17T11:00:00Z'
      ),

    organizer: {
      name:
        'Recruiter',
    },

    archived: false,
  },

  {
    _id: 'i2',

    applicantId:
      'a1',

    type:
      'screening',

    status:
      'no_show',

    format:
      'online',

    outcome:
      'pending',

    scheduledStart:
      new Date(
        '2026-09-10T10:00:00Z'
      ),

    archived: false,
  },
];


const activities = [
  {
    _id: 'act1',

    applicantId:
      'a1',

    type:
      'communication.email.sent',

    category:
      'communication',

    title:
      'Email sent',

    occurredAt:
      new Date(
        '2026-09-14'
      ),

    actor: {
      name:
        'Recruiter',
    },

    metadata: {
      subject:
        'Applicant follow-up',
    },
  },

  {
    _id: 'act2',

    applicantId:
      'a2',

    type:
      'status.changed',

    category:
      'status',

    title:
      'Recruitment status changed',

    occurredAt:
      new Date(
        '2026-09-14'
      ),

    actor: {
      name:
        'Recruiter',
    },

    metadata: {
      previousStatus:
        'interview',

      nextStatus:
        'offered',
    },
  },
];


const submissions = [
  {
    _id: 's1',

    applicantId:
      'a1',

    source:
      'google-form',

    submittedAt:
      new Date(
        '2026-08-01'
      ),

    recruitment: {
      status:
        'applied',
    },
  },

  {
    _id: 's2',

    applicantId:
      'a1',

    source:
      'google-form',

    submittedAt:
      new Date(
        '2026-09-01'
      ),

    recruitment: {
      status:
        'reviewing',
    },
  },

  {
    _id: 's3',

    applicantId:
      'a2',

    source:
      'manual',

    submittedAt:
      new Date(
        '2026-09-02'
      ),

    recruitment: {
      status:
        'shortlisted',
    },
  },
];


const documents = [
  {
    _id: 'doc1',

    applicantId:
      'a1',

    documentType:
      'cv',

    source:
      'form_submission',

    isCurrent:
      true,

    uploadedAt:
      new Date(
        '2026-08-01'
      ),

    lifecycle: {
      archived: false,
    },
  },

  {
    _id: 'doc2',

    applicantId:
      'a2',

    documentType:
      'certificate',

    source:
      'admin_upload',

    isCurrent:
      true,

    uploadedAt:
      new Date(
        '2026-09-01'
      ),

    lifecycle: {
      archived: false,
    },
  },
];


const duplicateCases = [
  {
    _id: 'd1',

    sourceApplicantId:
      'a1',

    candidateApplicantId:
      'a2',

    status:
      'open',

    confidence:
      'high',

    strongMatchCount:
      2,

    matchedSignals: [
      'email',
      'phone',
    ],

    detectedAt:
      new Date(
        '2026-09-14'
      ),

    resolution: {
      decision:
        'pending',
    },
  },
];


async function run() {
  const result =
    await getApplicantAnalytics({
      ApplicantModel:
        fakeModel(
          applicants
        ),

      EvaluationModel:
        fakeModel(
          evaluations
        ),

      InterviewModel:
        fakeModel(
          interviews
        ),

      ActivityModel:
        fakeModel(
          activities
        ),

      SubmissionModel:
        fakeModel(
          submissions
        ),

      DocumentModel:
        fakeModel(
          documents
        ),

      DuplicateCaseModel:
        fakeModel(
          duplicateCases
        ),

      now:
        new Date(
          '2026-09-15T12:00:00Z'
        ),
    });


  assert.ok(
    result.management
  );

  console.log(
    '✅ management payload exposed'
  );


  assert.strictEqual(
    result.management
      .actionCenter
      .newNeedingReview,
    1
  );

  assert.strictEqual(
    result.management
      .actionCenter
      .draftEvaluations,
    1
  );

  assert.strictEqual(
    result.management
      .actionCenter
      .upcomingInterviews,
    1
  );

  assert.strictEqual(
    result.management
      .actionCenter
      .awaitingOfferDecision,
    1
  );

  console.log(
    '✅ Action Center integrated'
  );


  assert.strictEqual(
    result.management
      .duplicates
      .unresolved,
    1
  );

  console.log(
    '✅ duplicate cases integrated'
  );


  assert.strictEqual(
    result.management
      .submissions
      .total,
    3
  );

  assert.strictEqual(
    result.management
      .submissions
      .applicantsWithMultipleSubmissions,
    1
  );

  console.log(
    '✅ submission history integrated'
  );


  assert.strictEqual(
    result.management
      .documents
      .applicantsWithCv,
    1
  );

  assert.strictEqual(
    result.management
      .documents
      .applicantsMissingCv,
    1
  );

  console.log(
    '✅ document coverage integrated'
  );


  assert.strictEqual(
    result.management
      .dataQuality
      .fields
      .find(
        field =>
          field.key ===
          'phone'
      )
      .missing,
    1
  );

  console.log(
    '✅ master-profile data quality integrated'
  );


  assert.strictEqual(
    result.management
      .feedback
      .recent.length,
    1
  );

  assert.strictEqual(
    result.management
      .feedback
      .recent[0]
      .applicantName,
    'Applicant Two'
  );

  console.log(
    '✅ recruiter feedback integrated'
  );


  assert.strictEqual(
    result.management
      .communications
      .emailSent,
    1
  );

  assert.strictEqual(
    result.management
      .communications
      .whatsappSent,
    0
  );

  console.log(
    '✅ communication analytics integrated'
  );


  assert.strictEqual(
    result.management
      .recentActivity
      .length,
    2
  );

  console.log(
    '✅ operational activity integrated'
  );


  console.log(
    '✅ no MongoDB connection used'
  );

  console.log(
    '\nAPPLICANT MANAGEMENT INTEGRATION TEST PASSED'
  );
}


run().catch(
  error => {
    console.error(
      error
    );

    process.exitCode =
      1;
  }
);
