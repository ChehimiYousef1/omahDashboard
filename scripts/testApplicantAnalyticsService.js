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


async function run() {
  const applicants = [
    {
      _id: 'a1',

      createdAt:
        new Date(
          '2026-07-01T10:00:00Z'
        ),

      lifecycle: {
        archived: false,
      },

      recruitment: {
        status:
          'applied',

        source:
          'google-form',

        firstAppliedAt:
          new Date(
            '2026-07-01T10:00:00Z'
          ),
      },

      preferences: {
        positionTrack:
          'Full-Stack Development',
      },
    },

    {
      _id: 'a2',

      createdAt:
        new Date(
          '2026-08-05T10:00:00Z'
        ),

      lifecycle: {
        archived: false,
      },

      recruitment: {
        status:
          'interview',

        source:
          'manual',

        firstAppliedAt:
          new Date(
            '2026-08-05T10:00:00Z'
          ),
      },

      preferences: {
        positionTrack:
          'Data Analytics',
      },
    },

    {
      _id: 'a3',

      createdAt:
        new Date(
          '2026-08-12T10:00:00Z'
        ),

      lifecycle: {
        archived: false,
      },

      recruitment: {
        status:
          'hired',

        source:
          'google-form',

        firstAppliedAt:
          new Date(
            '2026-08-12T10:00:00Z'
          ),
      },

      preferences: {
        positionTrack:
          'Full-Stack Development',
      },
    },

    {
      _id: 'a4',

      lifecycle: {
        archived: true,
      },

      recruitment: {
        status:
          'rejected',

        source:
          'legacy',
      },

      preferences: {
        positionTrack:
          'Other',
      },
    },
  ];


  const evaluations = [
    {
      applicantId: 'a1',
      status: 'submitted',
      recommendation:
        'recommended',
      averageRating: 4,
      weightedScore: 80,
      archived: false,
    },

    {
      applicantId: 'a3',
      status: 'submitted',
      recommendation:
        'recommended',
      averageRating: 5,
      weightedScore: 90,
      archived: false,
    },
  ];


  const interviews = [
    {
      applicantId: 'a2',
      status: 'scheduled',
      outcome: 'pending',
      archived: false,
    },

    {
      applicantId: 'a3',
      status: 'completed',
      outcome: 'passed',
      archived: false,
    },
  ];


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
    });


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
      .interviews,
    2
  );

  assert.strictEqual(
    result.summary
      .hired,
    1
  );

  assert.strictEqual(
    result.summary
      .averageEvaluationRating,
    4.5
  );

  assert.strictEqual(
    result.summary
      .averageWeightedScore,
    85
  );

  console.log(
    '✅ recruitment KPI calculations'
  );


  assert.deepStrictEqual(
    result.volumeOverTime,
    [
      {
        period:
          '2026-07',
        count: 1,
        cumulative: 1,
      },

      {
        period:
          '2026-08',
        count: 2,
        cumulative: 3,
      },
    ]
  );

  console.log(
    '✅ applicant volume over time'
  );


  const interviewStage =
    result.pipeline.find(
      stage =>
        stage.status ===
        'interview'
    );

  assert.strictEqual(
    interviewStage.count,
    1
  );

  console.log(
    '✅ pipeline distribution'
  );


  const august =
    await getApplicantAnalytics({
      query: {
        from:
          '2026-08-01',

        to:
          '2026-08-31',
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
    });

  assert.strictEqual(
    august.summary
      .totalApplicants,
    2
  );

  console.log(
    '✅ date filtering'
  );


  const fullStack =
    await getApplicantAnalytics({
      query: {
        positionTrack:
          'Full-Stack Development',
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
    });

  assert.strictEqual(
    fullStack.summary
      .totalApplicants,
    2
  );

  console.log(
    '✅ position filtering'
  );

  console.log(
    '✅ no MongoDB connection used'
  );

  console.log(
    '\nAPPLICANT ANALYTICS SERVICE TEST PASSED'
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
