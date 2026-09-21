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


const events = [];

const sensitive = {
  fileName:
    'private-candidate.pdf',

  checksum:
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',

  storageKey:
    'applicants/private/storage/key',

  externalUrl:
    'https://private.example/document',
};


const services = {
  async createApplicantDocument(
    input
  ) {
    assert(
      input.file
    );

    return {
      _id:
        'document-v1',

      documentGroupId:
        'group-1',

      documentType:
        'cv',

      title:
        'Candidate CV',

      version:
        1,

      isCurrent:
        true,

      source:
        'admin_upload',

      uploadedAt:
        new Date(
          '2026-09-21T12:00:00.000Z'
        ),

      file: {
        originalFileName:
          sensitive.fileName,

        checksumSha256:
          sensitive.checksum,
      },

      storage: {
        key:
          sensitive.storageKey,

        externalUrl:
          sensitive.externalUrl,
      },
    };
  },


  async replaceApplicantDocument(
    input
  ) {
    assert(
      input.file
    );

    assert.strictEqual(
      input.documentId,
      'document-v1'
    );

    return {
      _id:
        'document-v2',

      documentGroupId:
        'group-1',

      documentType:
        'cv',

      title:
        'Candidate CV',

      version:
        2,

      isCurrent:
        true,

      source:
        'admin_upload',

      uploadedAt:
        new Date(
          '2026-09-21T12:10:00.000Z'
        ),

      file: {
        originalFileName:
          sensitive.fileName,

        checksumSha256:
          sensitive.checksum,
      },

      storage: {
        key:
          sensitive.storageKey,

        externalUrl:
          sensitive.externalUrl,
      },
    };
  },


  async getApplicantDocuments() {
    return [];
  },

  async getDocumentVersions() {
    return [];
  },

  async getDocumentDownload() {
    throw new Error(
      'not used'
    );
  },

  async setCurrentDocumentVersion() {
    throw new Error(
      'not used'
    );
  },

  async archiveApplicantDocument() {
    throw new Error(
      'not used'
    );
  },

  async restoreApplicantDocument() {
    throw new Error(
      'not used'
    );
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
  (
    req,
    res,
    next
  ) => {
    req.user = {
      id:
        'admin-test',

      name:
        'Audit Tester',

      email:
        'audit@example.com',

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

    recordActivity:
      async payload => {
        events.push(
          payload
        );
      },

    activityLogger: {
      error() {},
    },
  })
);


async function run() {
  const pdf =
    Buffer.from(
      '%PDF-1.7\nB3E1'
    );


  let response =
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
    response.body.success,
    true
  );

  assert.strictEqual(
    response.body
      .document
      ._id,
    'document-v1'
  );


  response =
    await request(app)
      .post(
        '/api/applicants/applicant-1/documents/document-v1/versions'
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
            'candidate-v2.pdf',

          contentType:
            'application/pdf',
        }
      )
      .expect(201);


  assert.strictEqual(
    response.body.success,
    true
  );

  assert.strictEqual(
    response.body
      .document
      ._id,
    'document-v2'
  );


  assert.strictEqual(
    events.length,
    2
  );


  const uploaded =
    events[0];

  assert.strictEqual(
    uploaded.type,
    'document.uploaded'
  );

  assert.strictEqual(
    uploaded.applicantId,
    'applicant-1'
  );

  assert.strictEqual(
    uploaded.actor.userId,
    'admin-test'
  );

  assert.strictEqual(
    uploaded.source.type,
    'document'
  );

  assert.strictEqual(
    uploaded.source.id,
    'document-v1'
  );

  assert.deepStrictEqual(
    uploaded.changes,
    [
      {
        field:
          'document.exists',

        label:
          'Document exists',

        before:
          false,

        after:
          true,
      },
    ]
  );


  const replaced =
    events[1];

  assert.strictEqual(
    replaced.type,
    'document.replaced'
  );

  assert.strictEqual(
    replaced.source.id,
    'document-v2'
  );


  const versionChange =
    replaced.changes.find(
      change =>
        change.field ===
          'document.version'
    );

  assert(
    versionChange
  );

  assert.strictEqual(
    versionChange.before,
    1
  );

  assert.strictEqual(
    versionChange.after,
    2
  );


  const currentIdChange =
    replaced.changes.find(
      change =>
        change.field ===
          'document.currentDocumentId'
    );

  assert(
    currentIdChange
  );

  assert.strictEqual(
    currentIdChange.before,
    'document-v1'
  );

  assert.strictEqual(
    currentIdChange.after,
    'document-v2'
  );


  assert.strictEqual(
    replaced.metadata
      .documentType,
    'cv'
  );

  assert.strictEqual(
    replaced.metadata
      .version,
    2
  );


  const serialized =
    JSON.stringify(
      events
    );


  for (
    const forbidden
    of Object.values(
      sensitive
    )
  ) {
    assert.strictEqual(
      serialized.includes(
        forbidden
      ),
      false,
      `Sensitive document value leaked into Audit: ${forbidden}`
    );
  }


  console.log(
    '✅ document.uploaded event recorded'
  );

  console.log(
    '✅ document.replaced event recorded'
  );

  console.log(
    '✅ upload existence before → after captured'
  );

  console.log(
    '✅ replacement version before → after captured'
  );

  console.log(
    '✅ current document id transition captured'
  );

  console.log(
    '✅ actor + Document provenance attached'
  );

  console.log(
    '✅ storage/file/checksum/URL details excluded'
  );

  console.log(
    '✅ upload/replacement HTTP responses preserved'
  );

  console.log(
    '\nAPPLICANT AUDIT B3E1 TEST PASSED'
  );
}


run().catch(
  error => {
    console.error(error);
    process.exitCode = 1;
  }
);
