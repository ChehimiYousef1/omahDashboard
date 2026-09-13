'use strict';

const assert =
  require('assert');

const express =
  require('express');

const request =
  require('supertest');

const createRouter =
  require(
    '../src/routes/applicantDocuments.routes'
  );

function apiError(
  code,
  message
) {
  const error =
    new Error(message);

  error.code = code;

  return error;
}

const calls = [];

const services = {
  async getApplicantDocuments({
    applicantId,
    includeArchived,
  }) {
    calls.push([
      'list',
      applicantId,
      includeArchived,
    ]);

    if (
      applicantId ===
      'missing'
    ) {
      throw apiError(
        'DOCUMENT_NOT_FOUND',
        'Document not found.'
      );
    }

    return [
      {
        _id:
          'document-1',

        documentType:
          'cv',

        version: 1,

        isCurrent:
          true,
      },
    ];
  },

  async createApplicantDocument(
    input
  ) {
    calls.push([
      'create',
      input,
    ]);

    assert(
      input.file
    );

    assert.strictEqual(
      input.file.originalname,
      'candidate.pdf'
    );

    assert.strictEqual(
      input.documentType,
      'cv'
    );

    assert.strictEqual(
      input.uploadedBy,
      'admin-test'
    );

    return {
      _id:
        'created-document',

      documentType:
        input.documentType,

      version: 1,
    };
  },

  async replaceApplicantDocument(
    input
  ) {
    calls.push([
      'replace',
      input,
    ]);

    assert(
      input.file
    );

    return {
      _id:
        'version-2',

      version: 2,
      isCurrent: true,
    };
  },

  async getDocumentVersions(
    input
  ) {
    calls.push([
      'versions',
      input,
    ]);

    return [
      {
        _id:
          input.documentId,

        version: 2,
      },

      {
        _id:
          'older-version',

        version: 1,
      },
    ];
  },

  async getDocumentDownload(
    input
  ) {
    calls.push([
      'download',
      input,
    ]);

    return {
      document: {
        file: {
          originalFileName:
            'candidate.pdf',
        },
      },

      descriptor: {
        kind:
          'external_url',

        url:
          'https://example.com/private-document',
      },
    };
  },

  async setCurrentDocumentVersion(
    input
  ) {
    calls.push([
      'current',
      input,
    ]);

    if (
      input.documentId ===
      'conflict'
    ) {
      throw apiError(
        'DOCUMENT_VERSION_CONFLICT',
        'Version conflict.'
      );
    }

    return {
      _id:
        input.documentId,

      isCurrent: true,
    };
  },

  async archiveApplicantDocument(
    input
  ) {
    calls.push([
      'archive',
      input,
    ]);

    assert.strictEqual(
      input.archivedBy,
      'admin-test'
    );

    return {
      archived: true,
    };
  },

  async restoreApplicantDocument(
    input
  ) {
    calls.push([
      'restore',
      input,
    ]);

    return {
      restored: true,
      isCurrent: false,
    };
  },
};

const allowPermission =
  () =>
    (
      req,
      res,
      next
    ) =>
      next();

const app =
  express();

app.use(
  express.json()
);

app.use(
  (
    req,
    res,
    next
  ) => {
    req.user = {
      id:
        'admin-test',

      role:
        'Admin',
    };

    next();
  }
);

app.use(
  '/api/applicants/:applicantId/documents',

  createRouter({
    requireApplicantPermission:
      allowPermission,

    services,
  })
);

async function run() {
  let response;

  response =
    await request(app)
      .get(
        '/api/applicants/applicant-1/documents'
      )
      .expect(200);

  assert.strictEqual(
    response.body.success,
    true
  );

  assert.strictEqual(
    response.body
      .documents.length,
    1
  );

  console.log(
    '✅ GET document list works'
  );

  response =
    await request(app)
      .get(
        '/api/applicants/applicant-1/documents?includeArchived=true'
      )
      .expect(200);

  assert.strictEqual(
    calls.some(
      ([name, , value]) =>
        name === 'list' &&
        value === true
    ),
    true
  );

  console.log(
    '✅ includeArchived query works'
  );

  const pdf =
    Buffer.from(
      '%PDF-1.7\nOMAH HTTP TEST'
    );

  response =
    await request(app)
      .post(
        '/api/applicants/applicant-1/documents'
      )
      .field(
        'documentType',
        'cv'
      )
      .field(
        'title',
        'Candidate CV'
      )
      .attach(
        'file',
        pdf,
        {
          filename:
            'candidate.pdf',

          contentType:
            'application/pdf',
        }
      )
      .expect(201);

  assert.strictEqual(
    response.body
      .document
      .version,
    1
  );

  console.log(
    '✅ multipart document upload route works'
  );

  response =
    await request(app)
      .post(
        '/api/applicants/applicant-1/documents/document-1/versions'
      )
      .attach(
        'file',
        pdf,
        {
          filename:
            'candidate-v2.pdf',

          contentType:
            'application/pdf',
        }
      )
      .expect(201);

  assert.strictEqual(
    response.body
      .document
      .version,
    2
  );

  console.log(
    '✅ replacement-version route works'
  );

  response =
    await request(app)
      .get(
        '/api/applicants/applicant-1/documents/document-1/versions'
      )
      .expect(200);

  assert.strictEqual(
    response.body
      .versions.length,
    2
  );

  console.log(
    '✅ version-history route works'
  );

  response =
    await request(app)
      .get(
        '/api/applicants/applicant-1/documents/document-1/download'
      )
      .redirects(0)
      .expect(302);

  assert.strictEqual(
    response.headers.location,
    'https://example.com/private-document'
  );

  console.log(
    '✅ authenticated download redirect works'
  );

  response =
    await request(app)
      .post(
        '/api/applicants/applicant-1/documents/document-1/current'
      )
      .expect(200);

  assert.strictEqual(
    response.body
      .document
      .isCurrent,
    true
  );

  console.log(
    '✅ set-current route works'
  );

  response =
    await request(app)
      .post(
        '/api/applicants/applicant-1/documents/document-1/archive'
      )
      .send({
        reason:
          'Superseded CV',
      })
      .expect(200);

  assert.strictEqual(
    response.body
      .result
      .archived,
    true
  );

  console.log(
    '✅ archive route works'
  );

  response =
    await request(app)
      .post(
        '/api/applicants/applicant-1/documents/document-1/restore'
      )
      .expect(200);

  assert.strictEqual(
    response.body
      .result
      .restored,
    true
  );

  assert.strictEqual(
    response.body
      .result
      .isCurrent,
    false
  );

  console.log(
    '✅ restore route works'
  );

  response =
    await request(app)
      .get(
        '/api/applicants/missing/documents'
      )
      .expect(404);

  assert.strictEqual(
    response.body.code,
    'DOCUMENT_NOT_FOUND'
  );

  console.log(
    '✅ service not-found errors map to HTTP 404'
  );

  response =
    await request(app)
      .post(
        '/api/applicants/applicant-1/documents/conflict/current'
      )
      .expect(409);

  assert.strictEqual(
    response.body.code,
    'DOCUMENT_VERSION_CONFLICT'
  );

  console.log(
    '✅ concurrency conflicts map to HTTP 409'
  );

  console.log(
    '✅ tests used mocked services only'
  );

  console.log(
    '✅ no MongoDB or S3 connection used'
  );

  console.log(
    '\nTASK 12 DOCUMENT API BEHAVIOR TEST PASSED'
  );
}

run().catch(
  (error) => {
    console.error(error);
    process.exitCode = 1;
  }
);

