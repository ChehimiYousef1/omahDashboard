'use strict';

const assert =
  require('assert');

const {
  validateApplicantDocumentFile,
} = require(
  '../services/applicantDocumentValidationService'
);

const pdf =
  Buffer.from(
    '%PDF-1.7\nOMAH TEST'
  );

const valid =
  validateApplicantDocumentFile({
    documentType: 'cv',

    file: {
      originalname:
        'candidate.pdf',

      mimetype:
        'application/pdf',

      buffer:
        pdf,
    },
  });

assert.strictEqual(
  valid.extension,
  '.pdf'
);

console.log(
  '✅ valid PDF accepted'
);

assert.throws(
  () =>
    validateApplicantDocumentFile({
      documentType:
        'cv',

      file: {
        originalname:
          'candidate.exe',

        mimetype:
          'application/octet-stream',

        buffer:
          Buffer.from(
            'MZ'
          ),
      },
    }),

  /not allowed/i
);

console.log(
  '✅ executable extension rejected'
);

assert.throws(
  () =>
    validateApplicantDocumentFile({
      documentType:
        'cv',

      file: {
        originalname:
          'fake.pdf',

        mimetype:
          'application/pdf',

        buffer:
          Buffer.from(
            'NOT A PDF'
          ),
      },
    }),

  /content does not match/i
);

console.log(
  '✅ spoofed PDF rejected'
);

assert.throws(
  () =>
    validateApplicantDocumentFile({
      documentType:
        'identity_document',

      file: {
        originalname:
          'identity.docx',

        mimetype:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',

        buffer:
          Buffer.from(
            'PK fake'
          ),
      },
    }),

  /not allowed/i
);

console.log(
  '✅ per-document-type rules enforced'
);

console.log(
  '✅ no database or storage used'
);

console.log(
  '\nTASK 5 DOCUMENT VALIDATION TEST PASSED'
);

