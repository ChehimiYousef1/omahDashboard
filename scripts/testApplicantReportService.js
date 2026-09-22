'use strict';

const assert =
  require('assert');

const {
  buildApplicantSummaryReport,
} = require(
  '../services/applicantReportService'
);


async function run() {
  const applicantId =
    '64b64c000000000000000001';

  const ApplicantModel = {
    findById(id) {
      assert.strictEqual(
        id,
        applicantId
      );

      return {
        async lean() {
          return {
            _id:
              applicantId,

            applicantCode:
              'APP-001',

            identity: {
              fullName:
                'Test Applicant',

              email:
                'test@example.com',

              normalizedEmail:
                'secret-normalized@example.com',

              phoneNumber:
                '+961123456',

              normalizedPhone:
                '+961123456',

              country:
                'Lebanon',

              city:
                'Beirut',
            },

            education: {
              universityName:
                'Test University',

              degreeLevel:
                'Bachelor',

              major:
                'Computer Science',

              languages: [
                'Arabic',
                'English',
              ],
            },

            preferences: {
              positionTrack:
                'Software Development',

              positionType:
                'Internship',
            },

            skills: {
              primaryTechnical: [
                'JavaScript',
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
            },

            recruitment: {
              status:
                'interview',

              source:
                'google-form',

              firstAppliedAt:
                new Date(
                  '2026-09-01T10:00:00Z'
                ),
            },

            lifecycle: {
              archiveReason:
                'private-reason',
            },

            profileVersion:
              3,
          };
        },
      };
    },
  };

  const listInterviews =
    async () => [
      {
        interviewType:
          'technical',

        status:
          'completed',

        format:
          'online',

        scheduledStart:
          new Date(
            '2026-09-20T10:00:00Z'
          ),

        outcome:
          'positive',

        notes:
          'private interview notes',

        meeting: {
          url:
            'https://secret.example.test',
        },
      },
    ];

  const listEvaluations =
    async () => [
      {
        evaluator: {
          name:
            'Recruiter One',

          role:
            'Recruiter',
        },

        criteria: {
          technicalFit:
            5,

          relevantExperience:
            4,

          communication:
            5,

          motivationCommitment:
            4,

          learningPotential:
            5,
        },

        averageRating:
          4.6,

        weightedScore:
          92,

        recommendation:
          'strong_hire',

        status:
          'submitted',

        strengths:
          'private strengths',

        concerns:
          'private concerns',

        summary:
          'private summary',
      },
    ];

  const report =
    await buildApplicantSummaryReport({
      applicantId,

      ApplicantModel,

      listInterviews,

      listEvaluations,

      generatedBy: {
        name:
          'Admin User',

        role:
          'Admin',
      },

      now:
        () =>
          new Date(
            '2026-09-22T12:00:00Z'
          ),
    });

  assert.strictEqual(
    report.reportType,
    'applicant-summary'
  );

  assert.strictEqual(
    report
      .identity
      .fullName,
    'Test Applicant'
  );

  assert.strictEqual(
    report
      .latestInterview
      .status,
    'completed'
  );

  assert.strictEqual(
    report
      .latestEvaluation
      .weightedScore,
    92
  );

  assert.strictEqual(
    report
      .report
      .generatedBy
      .name,
    'Admin User'
  );

  const serialized =
    JSON.stringify(report);

  for (
    const forbidden
    of [
      'normalizedEmail',
      'normalizedPhone',
      'private-reason',
      'private interview notes',
      'secret.example.test',
      'private strengths',
      'private concerns',
      'private summary',
      'storageKey',
      'checksum',
    ]
  ) {
    assert.strictEqual(
      serialized.includes(
        forbidden
      ),
      false,
      `Forbidden report value leaked: ${forbidden}`
    );
  }

  console.log(
    '✅ Applicant profile whitelist'
  );

  console.log(
    '✅ latest Interview summary'
  );

  console.log(
    '✅ latest Evaluation summary'
  );

  console.log(
    '✅ sensitive/private fields excluded'
  );

  console.log(
    '✅ no MongoDB connection used'
  );

  console.log(
    '\nAPPLICANT REPORT SERVICE TEST PASSED'
  );
}


run().catch(
  error => {
    console.error(error);
    process.exitCode = 1;
  }
);
