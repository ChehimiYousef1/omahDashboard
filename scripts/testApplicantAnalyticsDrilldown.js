'use strict';

const assert =
  require('assert');

const {
  getApplicantAnalyticsDrilldown,
} = require(
  '../services/applicantAnalyticsDrilldownService'
);


function fakeModel(rows) {
  return {
    find() {
      return {
        select() {
          return this;
        },

        lean() {
          return Promise.resolve(
            rows
          );
        },
      };
    },
  };
}


function applicant(
  id,
  name
) {
  return {
    _id:
      id,

    applicantCode:
      `APP-${id}`,

    identity: {
      fullName:
        name,

      email:
        `${id}@example.com`,

      phoneNumber:
        '12345678',

      country:
        'Lebanon',

      city:
        'Beirut',
    },

    education: {
      universityName:
        'University',

      degreeLevel:
        'Bachelor',

      major:
        'Computer Science',
    },

    preferences: {
      positionTrack:
        'Backend Developer',

      positionType:
        'Internship',
    },

    skills: {
      primaryTechnical: [
        'Node.js',
      ],

      technicalExperienceLevel:
        'Intermediate',

      programmingLanguages: [
        'JavaScript',
      ],
    },

    recruitment: {
      status:
        'applied',

      source:
        'manual',

      firstAppliedAt:
        new Date(
          '2026-09-01T10:00:00Z'
        ),

      tags: [],
    },

    lifecycle: {
      archived:
        false,
    },

    createdAt:
      new Date(
        '2026-09-01T10:00:00Z'
      ),
  };
}


async function run() {
  const a1 =
    applicant(
      'a1',
      'Applicant One'
    );

  const a2 =
    applicant(
      'a2',
      'Applicant Two'
    );

  const a3 =
    applicant(
      'a3',
      'Applicant Three'
    );

  a3.identity.city = '';


  const models = {
    ApplicantModel:
      fakeModel([
        a1,
        a2,
        a3,
      ]),

    EvaluationModel:
      fakeModel([
        {
          _id: 'e1',
          applicantId: 'a1',
          status: 'draft',
          archived: false,
          createdAt:
            new Date(
              '2026-09-10T10:00:00Z'
            ),
        },

        {
          _id: 'e2',
          applicantId: 'a2',
          status: 'submitted',
          archived: false,
        },
      ]),

    InterviewModel:
      fakeModel([
        {
          _id: 'i1',
          applicantId: 'a1',
          status: 'no_show',
          archived: false,
          scheduledStart:
            new Date(
              '2026-09-10T09:00:00Z'
            ),
        },

        {
          _id: 'i2',
          applicantId: 'a2',
          status: 'scheduled',
          archived: false,
          scheduledStart:
            new Date(
              '2026-09-14T09:00:00Z'
            ),
        },
      ]),

    DocumentModel:
      fakeModel([
        {
          _id: 'd1',
          applicantId: 'a2',
          documentType: 'cv',
          isCurrent: true,
          lifecycle: {
            archived: false,
          },
        },
      ]),

    DuplicateCaseModel:
      fakeModel([
        {
          _id:
            'dup1',

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
        },
      ]),

    now:
      new Date(
        '2026-09-15T10:00:00Z'
      ),
  };


  const expected = [
    [
      'missing_cv',
      2,
    ],

    [
      'draft_evaluation',
      1,
    ],

    [
      'no_show',
      1,
    ],

    [
      'overdue_interview',
      1,
    ],

    [
      'no_interview',
      1,
    ],

    [
      'high_confidence_duplicate',
      1,
    ],
  ];


  for (
    const [
      type,
      count,
    ] of expected
  ) {
    const result =
      await getApplicantAnalyticsDrilldown({
        ...models,

        query: {
          type,
        },
      });

    assert.strictEqual(
      result.recordCount,
      count,
      `${type} record count`
    );

    console.log(
      `✅ exact ${type} drill-down`
    );
  }


  const incomplete =
    await getApplicantAnalyticsDrilldown({
      ...models,

      query: {
        type:
          'incomplete_profile',
      },
    });

  assert.ok(
    incomplete.items.some(
      item =>
        item.kind ===
          'applicant' &&
        item.applicant.id ===
          'a3' &&
        item.missingFields
          .includes(
            'City'
          )
    )
  );

  console.log(
    '✅ incomplete profile exposes missing fields'
  );


  const noSubmitted =
    await getApplicantAnalyticsDrilldown({
      ...models,

      query: {
        type:
          'no_submitted_evaluation',
      },
    });

  assert.strictEqual(
    noSubmitted.applicantCount,
    2
  );

  console.log(
    '✅ exact no-submitted-evaluation drill-down'
  );


  console.log(
    '✅ no MongoDB connection used'
  );

  console.log(
    '\nAPPLICANT ANALYTICS DRILL-DOWN TEST PASSED'
  );
}


run().catch(
  error => {
    console.error(
      error
    );

    process.exit(1);
  }
);
