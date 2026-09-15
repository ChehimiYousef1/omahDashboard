'use strict';

const assert =
  require('assert');

const {
  buildPipelineAnalytics,
} = require(
  '../services/analytics/applicantPipelineAnalytics'
);

const {
  buildEvaluationAnalytics,
} = require(
  '../services/analytics/applicantEvaluationAnalytics'
);

const {
  buildInterviewAnalytics,
} = require(
  '../services/analytics/applicantInterviewAnalytics'
);

const {
  buildApplicantSegmentation,
} = require(
  '../services/analytics/applicantSegmentationAnalytics'
);

const {
  buildActivityAnalytics,
} = require(
  '../services/analytics/applicantActivityFlowAnalytics'
);


const applicants = [
  {
    _id: '1',

    identity: {
      country: 'Lebanon',
      city: 'Beirut',
    },

    education: {
      degreeLevel:
        'Bachelor',

      universityName:
        'Lebanese University',

      major:
        'Computer Science',

      studyStatus:
        'Student',
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

      frameworks: [
        'React',
      ],

      databases: [
        'MongoDB',
      ],

      cloudDevOps: [
        'Docker',
      ],

      technicalExperienceLevel:
        'Intermediate',

      softSkills: [
        'Communication',
      ],
    },

    recruitment: {
      status:
        'applied',

      source:
        'google-form',
    },
  },

  {
    _id: '2',

    identity: {
      country: 'Lebanon',
      city: 'Sidon',
    },

    education: {
      degreeLevel:
        'Master',

      universityName:
        'University A',

      major:
        'Data Science',

      studyStatus:
        'Graduate',
    },

    preferences: {
      positionTrack:
        'Data Analytics',

      positionType:
        'Internship',
    },

    skills: {
      primaryTechnical: [
        'Python',
        'Power BI',
      ],

      programmingLanguages: [
        'Python',
      ],

      databases: [
        'SQL',
      ],

      dataAnalystSkills: [
        'Power BI',
      ],

      technicalExperienceLevel:
        'Advanced',
    },

    recruitment: {
      status:
        'interview',

      source:
        'manual',
    },
  },

  {
    _id: '3',

    identity: {
      country: 'Germany',
      city: 'Hamburg',
    },

    education: {
      degreeLevel:
        'Bachelor',

      universityName:
        'University B',

      major:
        'Software Engineering',

      studyStatus:
        'Graduate',
    },

    preferences: {
      positionTrack:
        'Full Stack',

      positionType:
        'Job',
    },

    skills: {
      primaryTechnical: [
        'Node.js',
      ],

      programmingLanguages: [
        'JavaScript',
      ],

      frameworks: [
        'Express',
      ],

      databases: [
        'MongoDB',
      ],

      technicalExperienceLevel:
        'Advanced',
    },

    recruitment: {
      status:
        'hired',

      source:
        'google-form',
    },
  },
];


const evaluations = [
  {
    status:
      'submitted',

    recommendation:
      'strong_yes',

    averageRating:
      4.6,

    weightedScore:
      92,

    criteria: {
      technicalFit: 5,
      relevantExperience: 4,
      communication: 5,
      motivationCommitment: 4,
      learningPotential: 5,
    },

    submittedAt:
      new Date(
        '2026-08-10'
      ),
  },

  {
    status:
      'submitted',

    recommendation:
      'yes',

    averageRating:
      4,

    weightedScore:
      80,

    criteria: {
      technicalFit: 4,
      relevantExperience: 4,
      communication: 4,
      motivationCommitment: 4,
      learningPotential: 4,
    },

    submittedAt:
      new Date(
        '2026-09-10'
      ),
  },

  {
    status:
      'draft',

    recommendation:
      'hold',

    averageRating:
      3,

    weightedScore:
      60,

    criteria: {
      technicalFit: 3,
      relevantExperience: 3,
      communication: 3,
      motivationCommitment: 3,
      learningPotential: 3,
    },
  },
];


const interviews = [
  {
    type:
      'technical',

    status:
      'completed',

    format:
      'online',

    outcome:
      'recommended',

    scheduledStart:
      new Date(
        '2026-08-05'
      ),
  },

  {
    type:
      'hr',

    status:
      'scheduled',

    format:
      'online',

    outcome:
      'pending',

    scheduledStart:
      new Date(
        '2026-09-05'
      ),
  },

  {
    type:
      'screening',

    status:
      'no_show',

    format:
      'phone',

    outcome:
      'pending',

    scheduledStart:
      new Date(
        '2026-09-07'
      ),
  },
];


const activities = [
  {
    type:
      'status.changed',

    category:
      'status',

    occurredAt:
      new Date(
        '2026-09-01'
      ),

    metadata: {
      previousStatus:
        'applied',

      nextStatus:
        'reviewed',
    },
  },

  {
    type:
      'status.changed',

    category:
      'status',

    occurredAt:
      new Date(
        '2026-09-02'
      ),

    metadata: {
      previousStatus:
        'reviewed',

      nextStatus:
        'shortlisted',
    },
  },

  {
    type:
      'evaluation.submitted',

    category:
      'evaluation',

    occurredAt:
      new Date(
        '2026-09-03'
      ),
  },
];


const pipeline =
  buildPipelineAnalytics({
    applicants,
    activities,
  });

assert.strictEqual(
  pipeline.stages.length,
  7
);

assert.strictEqual(
  pipeline.stages.find(
    stage =>
      stage.status ===
      'applied'
  ).count,
  1
);

assert.strictEqual(
  pipeline.recordedFlow
    .recordedTransitions,
  2
);

console.log(
  '✅ pipeline, funnel, matrices and recorded flow'
);


const evaluationAnalytics =
  buildEvaluationAnalytics(
    evaluations
  );

assert.strictEqual(
  evaluationAnalytics
    .submitted,
  2
);

assert.strictEqual(
  evaluationAnalytics
    .positiveRecommendationRate,
  100
);

assert.strictEqual(
  evaluationAnalytics
    .criteriaAverages
    .length,
  5
);

assert.strictEqual(
  evaluationAnalytics
    .ratingHistogram
    .reduce(
      (
        sum,
        bin
      ) =>
        sum +
        bin.count,
      0
    ),
  2
);

console.log(
  '✅ evaluation averages, radar data, histograms and trends'
);


const interviewAnalytics =
  buildInterviewAnalytics(
    interviews
  );

assert.strictEqual(
  interviewAnalytics
    .total,
  3
);

assert.strictEqual(
  interviewAnalytics
    .statuses
    .length,
  4
);

assert.strictEqual(
  interviewAnalytics
    .types
    .length,
  7
);

assert.strictEqual(
  interviewAnalytics
    .formats
    .length,
  3
);

console.log(
  '✅ all interview statuses, outcomes, types and formats'
);


const segmentation =
  buildApplicantSegmentation(
    applicants
  );

assert.strictEqual(
  segmentation
    .geography
    .countries[0]
    .label,
  'Lebanon'
);

assert.ok(
  segmentation
    .skills
    .primaryTechnical
    .some(
      item =>
        item.label ===
        'Node.js'
    )
);

console.log(
  '✅ geography, education, positions and skills segmentation'
);


const activity =
  buildActivityAnalytics(
    activities
  );

assert.strictEqual(
  activity.statusFlow
    .recordedTransitions,
  2
);

console.log(
  '✅ activity analytics and status Sankey data'
);


console.log(
  '\nPROFESSIONAL APPLICANT ANALYTICS MODULE TEST PASSED'
);
