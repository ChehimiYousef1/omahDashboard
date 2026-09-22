'use strict';

const assert =
  require('assert');

const {
  buildApplicantRecruitmentReport,
} = require(
  '../services/applicantRecruitmentReportService'
);

const {
  renderApplicantRecruitmentPdf,
} = require(
  '../services/applicantRecruitmentPdfRenderer'
);

const reportSwagger =
  require(
    '../docs/applicantReportSwagger'
);


async function run() {
  const applicantId =
    '64b64c000000000000000002';

  const ApplicantModel = {
    findById() {
      return {
        async lean() {
          return {
            applicantCode:
              'APP-B4C',

            identity: {
              fullName:
                'Recruitment Test Applicant',

              email:
                'candidate@example.com',

              phoneNumber:
                '+961000000',

              normalizedEmail:
                'private-normalized@example.com',

              country:
                'Lebanon',

              city:
                'Beirut',
            },

            preferences: {
              positionTrack:
                'Full-Stack Development',

              positionType:
                'Remote',

              weeklyAvailability:
                '20 hours',

              workingDays: [
                'Monday',
                'Tuesday',
              ],
            },

            education: {
              universityName:
                'Test University',

              degreeLevel:
                'Bachelor',

              major:
                'Computer Science',
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
                'reviewed',

              source:
                'google-form',
            },

            lifecycle: {
              archiveReason:
                'private archive reason',
            },

            profileVersion:
              2,
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

        outcome:
          'positive',

        notes:
          'private interview notes',

        meetingUrl:
          'https://private.example.test',
      },
    ];

  const listEvaluations =
    async () => [
      {
        evaluator: {
          name:
            'Admin User',

          role:
            'Super Admin',
        },

        status:
          'submitted',

        criteria: {
          technicalFit:
            5,

          relevantExperience:
            5,

          communication:
            4,

          motivationCommitment:
            5,

          learningPotential:
            5,
        },

        averageRating:
          4.8,

        weightedScore:
          96,

        recommendation:
          'strong_yes',

        strengths:
          'private strengths',

        concerns:
          'private concerns',

        summary:
          'private evaluation summary',
      },
    ];

  const report =
    await buildApplicantRecruitmentReport({
      applicantId,

      ApplicantModel,

      listInterviews,

      listEvaluations,

      generatedBy: {
        name:
          'Admin User',

        role:
          'Super Admin',
      },

      now:
        () =>
          new Date(
            '2026-09-22T16:00:00Z'
          ),
    });

  assert.strictEqual(
    report.reportType,
    'applicant-recruitment-report'
  );

  assert.strictEqual(
    report.interviews.length,
    1
  );

  assert.strictEqual(
    report.evaluations.length,
    1
  );

  assert.strictEqual(
    report
      .assessment
      .latestWeightedScore,
    96
  );

  const serialized =
    JSON.stringify(report);

  for (
    const forbidden
    of [
      'normalizedEmail',
      'private-normalized@example.com',
      'private archive reason',
      'private interview notes',
      'private.example.test',
      'private strengths',
      'private concerns',
      'private evaluation summary',
      'storageKey',
      'checksum',
    ]
  ) {
    assert.strictEqual(
      serialized.includes(
        forbidden
      ),
      false,
      `Sensitive value leaked: ${forbidden}`
    );
  }

  const pdf =
    await renderApplicantRecruitmentPdf(
      report
    );

  assert.ok(
    Buffer.isBuffer(pdf)
  );

  assert.strictEqual(
    pdf
      .subarray(0, 5)
      .toString(),
    '%PDF-'
  );

  assert.ok(
    pdf.length > 1000
  );

  const path =
    '/api/applicants/{applicantId}/reports/recruitment.pdf';

  assert.ok(
    reportSwagger
      .paths[path]
      ?.get
  );

  assert.deepStrictEqual(
    reportSwagger
      .paths[path]
      .get
      .tags,
    [
      'Applicant Reports & Export',
    ]
  );

  console.log(
    '✅ detailed recruitment report data'
  );

  console.log(
    '✅ Interview history whitelisted'
  );

  console.log(
    '✅ Evaluation history whitelisted'
  );

  console.log(
    '✅ private/free-text content excluded'
  );

  console.log(
    '✅ Recruitment PDF generated'
  );

  console.log(
    '✅ Recruitment Swagger documented'
  );

  console.log(
    '\nAPPLICANT RECRUITMENT REPORT TEST PASSED'
  );
}


run().catch(
  error => {
    console.error(error);
    process.exitCode = 1;
  }
);
