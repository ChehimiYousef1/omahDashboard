'use strict';

const multer =
  require('multer');

const {
  MAX_DOCUMENT_SIZE_BYTES,
} = require(
  '../services/applicantDocumentValidationService'
);

const upload =
  multer({
    storage:
      multer.memoryStorage(),

    limits: {
      files: 1,
      fileSize:
        MAX_DOCUMENT_SIZE_BYTES,

      fields: 10,

      fieldSize:
        256 * 1024,
    },
  });

function uploadApplicantDocument(
  req,
  res,
  next
) {
  upload.single('file')(
    req,
    res,
    (error) => {
      if (!error) {
        return next();
      }

      const tooLarge =
        error.code ===
        'LIMIT_FILE_SIZE';

      return res
        .status(400)
        .json({
          success: false,

          code:
            tooLarge
              ? 'DOCUMENT_FILE_TOO_LARGE'
              : 'DOCUMENT_UPLOAD_INVALID',

          error:
            tooLarge
              ? 'Document exceeds the 10 MB limit.'
              : 'Invalid document upload.',
        });
    }
  );
}

module.exports =
  uploadApplicantDocument;

