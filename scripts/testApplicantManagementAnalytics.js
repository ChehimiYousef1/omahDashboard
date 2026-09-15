'use strict';

const assert =
  require('assert');

const {
  buildApplicantManagementAnalytics,
} = require(
  '../services/analytics/applicantManagementAnalytics'
);


const applicants = [
  {
    _id: 'a1',

    identity: {
      fullName: 'Applicant One',
      email: 'one@example.com',
      phoneNumber: '111',
      country: 'Lebanon',
      city: 'Beirut',
    },

    education: {
      universityName:
        'Lebanese University',

      degreeLevel:
        'Bachelor',
    },

    preferences: {
      positionTrack:
        'Full Stack',
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
    _id: 'a2',

    identity: {
      fullName:
        'Applicant Two',

      email:
        'two@example.com',

      phoneNumber:
        '',

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
    },

    preferences: {
      positionTrack:
        'Data Analytics',
    },

    skills: {
      primaryTechnical: [
        'Power BI',
      ],
    },

    recruitment: {
      status:
        'offered',
    },
  },
];


const evaluations = [
  {
    _id: 'e1',
    applicantId: 'a1',
    status: 'draft',
    recommendation: 'hold',
  },

  {
    _id: 'e2',
    applicantId: 'a2',
    status: 'submitted',
    recommendation: 'strong_yes',
    averageRating: 4.8,
    weightedScore: 94,
    strengths: 'Strong technical skills',
    concerns: '',
    summary: 'Recommended',
    evaluator: {
      name: 'Recruiter One',
      role: 'Recruiter',
    },
    submittedAt:
      new Date(
        '2026-09-14T10:00:00Z'
      ),
  },
];


const interviews = [
  {
    _id: 'i1',
    applicantId: 'a2',
    type: 'final',
    status: 'scheduled',
    format: 'online',
    outcome: 'pending',
    scheduledStart:
      new Date(
        '2026-09-17T10:00:00Z'
      ),
    scheduledEnd:
      new Date(
        '2026-09-17T11:00:00Z'
      ),
    organizer: {
      name: 'Recruiter One',
      role: 'Recruiter',
    },
  },

  {
    _id: 'i2',
    applicantId: 'a1',
    type: 'screening',
    status: 'no_show',
    format: 'online',
    outcome: 'pending',
    scheduledStart:
      new Date(
        '2026-09-10T10:00:00Z'
      ),
  },
];


const duplicateCases = [
  {
    _id: 'd1',
    sourceApplicantId: 'a1',
    candidateApplicantId: 'a2',
    status: 'open',
    confidence: 'high',
    strongMatchCount: 2,
    matchedSignals: [
      'email',
      'phone',
    ],
    detectedAt:
      new Date(
        '2026-09-14'
      ),
    resolution: {
      decision: 'pending',
    },
  },
];


const submissions = [
  {
    applicantId: 'a1',
    source: 'google-form',
    submittedAt:
      new Date(
        '2026-08-01'
      ),
    recruitment: {
      status: 'applied',
    },
  },

  {
    applicantId: 'a1',
    source: 'google-form',
    submittedAt:
      new Date(
        '2026-09-01'
      ),
    recruitment: {
      status: 'reviewing',
    },
  },

  {
    applicantId: 'a2',
    source: 'manual',
    submittedAt:
      new Date(
        '2026-09-02'
      ),
    recruitment: {
      status: 'shortlisted',
    },
  },
];


const documents = [
  {
    applicantId: 'a1',
    documentType: 'cv',
    source: 'form_submission',
    isCurrent: true,
    uploadedAt:
      new Date(
        '2026-08-01'
      ),
    lifecycle: {
      archived: false,
    },
  },

  {
    applicantId: 'a2',
    documentType: 'certificate',
    source: 'admin_upload',
    isCurrent: true,
    uploadedAt:
      new Date(
        '2026-09-01'
      ),
    lifecycle: {
      archived: false,
    },
  },
];


const activities = [
  {
    _id: 'ac1',
    applicantId: 'a1',
    type: 'communication.email.sent',
    category: 'communication',
    title: 'Email sent',
    occurredAt:
      new Date(
        '2026-09-14'
      ),
    actor: {
      name: 'Recruiter One',
    },
    metadata: {
      subject: 'Interview',
    },
  },

  {
    _id: 'ac2',
    applicantId: 'a2',
    type: 'status.changed',
    category: 'status',
    title: 'Recruitment status changed',
    occurredAt:
      new Date(
        '2026-09-14'
      ),
    actor: {
      name: 'Recruiter One',
    },
  },
];


const result =
  buildApplicantManagementAnalytics({
    applicants,
    evaluations,
    interviews,
    activities,
    duplicateCases,
    submissions,
    documents,

    now:
      new Date(
        '2026-09-15T12:00:00Z'
      ),
  });


assert.strictEqual(
  result.actionCenter
    .newNeedingReview,
  1
);

assert.strictEqual(
  result.actionCenter
    .draftEvaluations,
  1
);

assert.strictEqual(
  result.actionCenter
    .upcomingInterviews,
  1
);

assert.strictEqual(
  result.actionCenter
    .awaitingOfferDecision,
  1
);

console.log(
  '✅ Action Center priorities'
);


assert.strictEqual(
  result.duplicates
    .unresolved,
  1
);

assert.strictEqual(
  result.duplicates
    .highConfidenceUnresolved,
  1
);

console.log(
  '✅ duplicate management analytics'
);


assert.strictEqual(
  result.submissions
    .total,
  3
);

assert.strictEqual(
  result.submissions
    .applicantsWithMultipleSubmissions,
  1
);

console.log(
  '✅ immutable submission analytics'
);


assert.strictEqual(
  result.documents
    .applicantsWithCv,
  1
);

assert.strictEqual(
  result.documents
    .applicantsMissingCv,
  1
);

console.log(
  '✅ document and CV coverage analytics'
);


assert.strictEqual(
  result.dataQuality
    .incompleteProfiles,
  1
);

assert.strictEqual(
  result.dataQuality
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
  '✅ transparent profile data-quality analytics'
);


assert.strictEqual(
  result.feedback
    .recent.length,
  1
);

assert.strictEqual(
  result.feedback
    .recent[0]
    .recommendation,
  'strong_yes'
);

console.log(
  '✅ recent recruiter feedback analytics'
);


assert.strictEqual(
  result.communications
    .emailSent,
  1
);

assert.strictEqual(
  result.communications
    .whatsappSent,
  0
);

console.log(
  '✅ email and WhatsApp activity analytics'
);


assert.strictEqual(
  result.recentActivity
    .length,
  2
);

console.log(
  '✅ recent operational activity'
);


console.log(
  '\nAPPLICANT MANAGEMENT ANALYTICS TEST PASSED'
);
