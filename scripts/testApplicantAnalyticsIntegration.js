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

    createdAt:
      new Date(
        '2026-07-01'
      ),

    identity: {
      fullName:
        'Applicant One',

      email:
        'one@example.com',

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
        'React',
        'Node.js',
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

      technicalExperienceLevel:
        'Intermediate',
    },

    recruitment: {
      status:
        'applied',

      source:
        'google-form',

      firstAppliedAt:
        new Date(
          '2026-07-01'
        ),

      tags: [
        'student',
      ],
    },

    lifecycle: {
      archived: false,
    },
  },

  {
    _id: 'a2',

    createdAt:
      new Date(
        '2026-08-01'
      ),

    identity: {
      fullName:
        'Applicant Two',

      email:
        'two@example.com',

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

      firstAppliedAt:
        new Date(
          '2026-08-01'
        ),

      tags: [],
    },

    lifecycle: {
      archived: false,
    },
  },

  {
    _id: 'a3',

    createdAt:
      new Date(
        '2026-09-01'
      ),

    identity: {
      fullName:
        'Applicant Three',

      email:
        'three@example.com',

      country:
        'Germany',

      city:
        'Hamburg',
    },

    education: {
      universityName:
        'University C',

      degreeLevel:
        'Bachelor',

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

      firstAppliedAt:
        new Date(
          '2026-09-01'
        ),

      tags: [],
    },

    lifecycle: {
      archived: false,
    },
  },
];


const evaluations = [
  {
    applicantId: 'a2',

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

    archived: false,
  },

  {
    applicantId: 'a3',

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

    archived: false,
  },
];


const interviews = [
  {
    applicantId: 'a2',

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
        '2026-08-15'
      ),

    archived: false,
  },

  {
    applicantId: 'a3',

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
        '2026-09-15'
      ),

    archived: false,
  },
];


const activities = [
  {
    applicantId: 'a2',

    type:
      'status.changed',

    category:
      'status',

    occurredAt:
      new Date(
        '2026-08-05'
      ),

    metadata: {
      previousStatus:
        'reviewed',

      nextStatus:
        'shortlisted',
    },
  },

  {
    applicantId: 'a2',

    type:
      'status.changed',

    category:
      'status',

    occurredAt:
      new Date(
        '2026-08-07'
      ),

    metadata: {
      previousStatus:
        'shortlisted',

      nextStatus:
        'interview',
    },
  },

  {
    applicantId: 'a3',

    type:
      'evaluation.submitted',

    category:
      'evaluation',

    occurredAt:
      new Date(
        '2026-09-10'
      ),

    metadata: {},
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
    });


  assert.strictEqual(
    result.analyticsVersion,
    2
  );

  assert.strictEqual(
    result.summary
      .totalApplicants,
    3
  );

  assert.strictEqual(
    result.summary
      .newApplicants,
    1
  );

  assert.strictEqual(
    result.summary
      .interviewStage,
    1
  );

  assert.strictEqual(
    result.summary
      .hired,
    1
  );

  console.log(
    '✅ all recruitment stages integrated'
  );


  assert.strictEqual(
    result.evaluations
      .submitted,
    2
  );

  assert.strictEqual(
    result.evaluations
      .criteriaAverages
      .length,
    5
  );

  assert.strictEqual(
    result.evaluations
      .ratingHistogram
      .reduce(
        (
          total,
          bin
        ) =>
          total +
          bin.count,
        0
      ),
    2
  );

  console.log(
    '✅ evaluation radar and histogram analytics integrated'
  );


  assert.strictEqual(
    result.interviews
      .total,
    2
  );

  assert.strictEqual(
    result.interviews
      .types.length,
    7
  );

  assert.strictEqual(
    result.interviews
      .formats.length,
    3
  );

  console.log(
    '✅ complete interview analytics integrated'
  );


  assert.strictEqual(
    result.pipelineAnalytics
      .recordedFlow
      .recordedTransitions,
    2
  );

  assert.strictEqual(
    result.activity
      .total,
    3
  );

  console.log(
    '✅ recorded recruitment flow and activity analytics integrated'
  );


  assert.ok(
    result.segmentation
      .geography
      .countries
      .some(
        item =>
          item.label ===
          'Lebanon'
      )
  );

  assert.ok(
    result.segmentation
      .skills
      .primaryTechnical
      .some(
        item =>
          item.label ===
          'Node.js'
      )
  );

  console.log(
    '✅ segmentation analytics integrated'
  );


  assert.strictEqual(
    result.metadata
      .timeInStageAvailable,
    false
  );

  assert.strictEqual(
    result.metadata
      .historicalConversionAvailable,
    false
  );

  console.log(
    '✅ unsupported legacy historical metrics remain protected'
  );


  const filtered =
    await getApplicantAnalytics({
      query: {
        country:
          'Lebanon',

        positionType:
          'Internship',
      },

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
    });


  assert.strictEqual(
    filtered.summary
      .totalApplicants,
    2
  );

  console.log(
    '✅ professional analytics filters integrated'
  );


  console.log(
    '✅ no MongoDB connection used'
  );

  console.log(
    '\nPROFESSIONAL APPLICANT ANALYTICS INTEGRATION TEST PASSED'
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
