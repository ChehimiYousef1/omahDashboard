'use strict';

const path = require('path');

const MAX_DOCUMENT_SIZE_BYTES =
  10 * 1024 * 1024;

const ALLOWED_EXTENSIONS =
  Object.freeze([
    '.pdf',
    '.docx',
    '.jpg',
    '.jpeg',
    '.png',
  ]);

const OFFICE_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const TYPE_RULES =
  Object.freeze({
    cv: [
      '.pdf',
      '.docx',
    ],

    cover_letter: [
      '.pdf',
      '.docx',
    ],

    certificate: [
      '.pdf',
      '.jpg',
      '.jpeg',
      '.png',
    ],

    transcript: [
      '.pdf',
      '.jpg',
      '.jpeg',
      '.png',
    ],

    portfolio: [
      '.pdf',
      '.docx',
      '.jpg',
      '.jpeg',
      '.png',
    ],

    identity_document: [
      '.pdf',
      '.jpg',
      '.jpeg',
      '.png',
    ],

    other: [
      '.pdf',
      '.docx',
      '.jpg',
      '.jpeg',
      '.png',
    ],
  });

function validationError(
  code,
  message
) {
  const error =
    new Error(message);

  error.code = code;

  return error;
}

function extensionOf(name) {
  return path
    .extname(
      String(name ?? '')
    )
    .toLowerCase();
}

function startsWith(
  buffer,
  bytes
) {
  if (
    !Buffer.isBuffer(buffer) ||
    buffer.length <
      bytes.length
  ) {
    return false;
  }

  return bytes.every(
    (value, index) =>
      buffer[index] === value
  );
}

function isPdf(buffer) {
  return (
    Buffer.isBuffer(buffer) &&
    buffer
      .subarray(0, 5)
      .toString('ascii') ===
      '%PDF-'
  );
}

function isJpeg(buffer) {
  return startsWith(
    buffer,
    [
      0xff,
      0xd8,
      0xff,
    ]
  );
}

function isPng(buffer) {
  return startsWith(
    buffer,
    [
      0x89,
      0x50,
      0x4e,
      0x47,
      0x0d,
      0x0a,
      0x1a,
      0x0a,
    ]
  );
}

function isDocx(buffer) {
  if (
    !startsWith(
      buffer,
      [
        0x50,
        0x4b,
      ]
    )
  ) {
    return false;
  }

  /*
   * DOCX is a ZIP container.
   * Central-directory filenames remain
   * visible even when file contents are
   * compressed.
   */
  const content =
    buffer.toString('latin1');

  return (
    content.includes(
      '[Content_Types].xml'
    ) &&
    content.includes(
      'word/'
    )
  );
}

function expectedMimeForExtension(
  extension
) {
  switch (extension) {
    case '.pdf':
      return [
        'application/pdf',
      ];

    case '.docx':
      return [
        OFFICE_MIME,
        'application/zip',
      ];

    case '.jpg':
    case '.jpeg':
      return [
        'image/jpeg',
      ];

    case '.png':
      return [
        'image/png',
      ];

    default:
      return [];
  }
}

function signatureMatches(
  extension,
  buffer
) {
  switch (extension) {
    case '.pdf':
      return isPdf(buffer);

    case '.docx':
      return isDocx(buffer);

    case '.jpg':
    case '.jpeg':
      return isJpeg(buffer);

    case '.png':
      return isPng(buffer);

    default:
      return false;
  }
}

function validateApplicantDocumentFile({
  file,
  documentType,
}) {
  if (
    !file ||
    !Buffer.isBuffer(
      file.buffer
    )
  ) {
    throw validationError(
      'DOCUMENT_FILE_REQUIRED',
      'A document file is required.'
    );
  }

  if (
    file.buffer.length === 0
  ) {
    throw validationError(
      'EMPTY_DOCUMENT_FILE',
      'The document file is empty.'
    );
  }

  if (
    file.buffer.length >
    MAX_DOCUMENT_SIZE_BYTES
  ) {
    throw validationError(
      'DOCUMENT_FILE_TOO_LARGE',
      'Document exceeds the 10 MB limit.'
    );
  }

  const normalizedType =
    String(
      documentType ?? ''
    ).trim();

  const typeRules =
    TYPE_RULES[
      normalizedType
    ];

  if (!typeRules) {
    throw validationError(
      'INVALID_DOCUMENT_TYPE',
      'Document type is invalid.'
    );
  }

  const extension =
    extensionOf(
      file.originalname
    );

  if (
    !ALLOWED_EXTENSIONS.includes(
      extension
    ) ||
    !typeRules.includes(
      extension
    )
  ) {
    throw validationError(
      'DOCUMENT_EXTENSION_NOT_ALLOWED',
      'File extension is not allowed for this document type.'
    );
  }

  const mime =
    String(
      file.mimetype ?? ''
    )
      .trim()
      .toLowerCase();

  const allowedMimes =
    expectedMimeForExtension(
      extension
    );

  if (
    !allowedMimes.includes(
      mime
    )
  ) {
    throw validationError(
      'DOCUMENT_MIME_NOT_ALLOWED',
      'File MIME type does not match the allowed document format.'
    );
  }

  if (
    !signatureMatches(
      extension,
      file.buffer
    )
  ) {
    throw validationError(
      'DOCUMENT_SIGNATURE_INVALID',
      'File content does not match its declared document format.'
    );
  }

  return {
    extension,
    mimeType: mime,
    sizeBytes:
      file.buffer.length,
  };
}

module.exports = {
  MAX_DOCUMENT_SIZE_BYTES,
  ALLOWED_EXTENSIONS,
  TYPE_RULES,
  validateApplicantDocumentFile,
  isPdf,
  isDocx,
  isJpeg,
  isPng,
};

