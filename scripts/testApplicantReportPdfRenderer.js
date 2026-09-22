'use strict';

const assert =
  require('assert');

const {
  renderApplicantSummaryPdf,
} = require(
  '../services/applicantPdfRenderer'
);


async function run() {
  const pdf =
    await renderApplicantSummaryPdf({
      identity: {
        fullName:
          'PDF Test Applicant',

        email:
          'pdf@example.com',
      },

      application: {
        applicantCode:
          'APP-PDF',

        status:
          'interview',

        profileVersion:
          1,
      },

      education: {},

      skills: {},

      latestInterview:
        null,

      latestEvaluation:
        null,

      report: {
        generatedAt:
          '2026-09-22T12:00:00.000Z',

        generatedBy: {
          name:
            'Admin User',

          role:
            'Admin',
        },
      },
    });

  assert.ok(
    Buffer.isBuffer(pdf),
    'Renderer must return Buffer'
  );

  assert.strictEqual(
    pdf
      .subarray(0, 5)
      .toString(),
    '%PDF-'
  );

  assert.ok(
    pdf.length >
      1000,
    'Generated PDF is unexpectedly small'
  );

  console.log(
    '✅ renderer returns Buffer'
  );

  console.log(
    '✅ valid %PDF signature'
  );

  console.log(
    '✅ non-empty PDF document'
  );

  console.log(
    '\nAPPLICANT PDF RENDERER TEST PASSED'
  );
}


run().catch(
  error => {
    console.error(error);
    process.exitCode = 1;
  }
);
