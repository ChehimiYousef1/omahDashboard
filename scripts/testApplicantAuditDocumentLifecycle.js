'use strict';

const assert =
  require('assert');

const express =
  require('express');

const request =
  require('supertest');

const {
  APPLICANT_ACTIVITY_TYPES,
} = require(
  '../utils/applicantActivity'
);

const {
  buildDocumentCurrentAuditChanges,
  buildDocumentArchiveAuditChanges,
  buildDocumentRestoreAuditChanges,
} = require(
  '../services/applicantDocumentService'
);

const createRouter =
  require(
    '../src/routes/applicantDocuments.routes'
  );


assert(
  APPLICANT_ACTIVITY_TYPES.includes(
    'document.current_changed'
  )
);

assert(
  APPLICANT_ACTIVITY_TYPES.includes(
    'document.archived'
  )
);

assert(
  APPLICANT_ACTIVITY_TYPES.includes(
    'document.restored'
  )
);

console.log(
  '✅ Document lifecycle event types registered'
);


/*
|--------------------------------------------------------------------------
| Pure Audit change semantics
|--------------------------------------------------------------------------
*/

assert.deepStrictEqual(
  buildDocumentCurrentAuditChanges({
    previous: {
      _id:
        'document-v1',
    },

    target: {
      _id:
        'document-v2',
    },
  }),
  [
    {
      field:
        'document.currentDocumentId',

      label:
        'Current document',

      before:
        'document-v1',

      after:
        'document-v2',
    },
  ]
);


assert.deepStrictEqual(
  buildDocumentCurrentAuditChanges({
    previous: {
      _id:
        'document-v2',
    },

    target: {
      _id:
        'document-v2',
    },
  }),
  []
);


const archiveChanges =
  buildDocumentArchiveAuditChanges({
    target: {
      _id:
        'document-v2',

      isCurrent:
        true,
    },

    replacementVersion: {
      _id:
        'document-v1',
    },
  });


assert.deepStrictEqual(
  archiveChanges,
  [
    {
      field:
        'document.archived',

      label:
        'Document archived',

      before:
        false,

      after:
        true,
    },
    {
      field:
        'document.currentDocumentId',

      label:
        'Current document',

      before:
        'document-v2',

      after:
        'document-v1',
    },
  ]
);


assert.deepStrictEqual(
  buildDocumentRestoreAuditChanges({
    previous: {
      isCurrent:
        false,
    },
  }),
  [
    {
      field:
        'document.archived',

      label:
        'Document archived',

      before:
        true,

      after:
        false,
    },
  ]
);


console.log(
  '✅ current document transition semantics'
);

console.log(
  '✅ archive false → true semantics'
);

console.log(
  '✅ automatic replacement transition captured'
);

console.log(
  '✅ restore true → false semantics'
);


/*
|--------------------------------------------------------------------------
| Router behavior with Audit envelopes
|--------------------------------------------------------------------------
*/

const events = [];

const privateReason =
  'Private archive reason that must not appear in Audit';


const services = {
  async createApplicantDocument() {
    throw new Error(
      'not used'
    );
  },

  async replaceApplicantDocument() {
    throw new Error(
      'not used'
    );
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

  async setCurrentDocumentVersion(
    input
  ) {
    assert.strictEqual(
      input.includeAuditResult,
      true
    );

    if (
      input.documentId ===
        'already-current'
    ) {
      return {
        document: {
          _id:
            'already-current',

          documentType:
            'cv',

          version:
            2,

          source:
            'admin_upload',

          isCurrent:
            true,
        },

        auditChanges:
          [],

        auditMetadata: {
          changed:
            false,

          documentType:
            'cv',

          version:
            2,

          source:
            'admin_upload',
        },
      };
    }

    return {
      document: {
        _id:
          input.documentId,

        documentType:
          'cv',

        version:
          2,

        source:
          'admin_upload',

        isCurrent:
          true,
      },

      auditChanges: [
        {
          field:
            'document.currentDocumentId',

          label:
            'Current document',

          before:
            'document-v1',

          after:
            input.documentId,
        },
      ],

      auditMetadata: {
        changed:
          true,

        documentType:
          'cv',

        version:
          2,

        source:
          'admin_upload',
      },
    };
  },

  async archiveApplicantDocument(
    input
  ) {
    assert.strictEqual(
      input.includeAuditResult,
      true
    );

    assert.strictEqual(
      input.reason,
      privateReason
    );

    return {
      result: {
        archived:
          true,
      },

      auditChanges: [
        {
          field:
            'document.archived',

          label:
            'Document archived',

          before:
            false,

          after:
            true,
        },
        {
          field:
            'document.currentDocumentId',

          label:
            'Current document',

          before:
            input.documentId,

          after:
            'document-v1',
        },
      ],

      auditMetadata: {
        documentType:
          'cv',

        version:
          2,

        source:
          'admin_upload',

        archiveReasonProvided:
          true,

        wasCurrent:
          true,

        replacementDocumentId:
          'document-v1',
      },
    };
  },

  async restoreApplicantDocument(
    input
  ) {
    assert.strictEqual(
      input.includeAuditResult,
      true
    );

    return {
      result: {
        restored:
          true,

        isCurrent:
          false,
      },

      auditChanges: [
        {
          field:
            'document.archived',

          label:
            'Document archived',

          before:
            true,

          after:
            false,
        },
      ],

      auditMetadata: {
        documentType:
          'cv',

        version:
          2,

        source:
          'admin_upload',

        changed:
          true,
      },
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
  let response =
    await request(app)
      .post(
        '/api/applicants/applicant-1/documents/document-v2/current'
      )
      .expect(200);


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


  /*
   * Already-current is intentionally
   * idempotent and must not create
   * another Audit event.
   */
  response =
    await request(app)
      .post(
        '/api/applicants/applicant-1/documents/already-current/current'
      )
      .expect(200);


  assert.strictEqual(
    response.body
      .document
      ._id,
    'already-current'
  );


  response =
    await request(app)
      .post(
        '/api/applicants/applicant-1/documents/document-v2/archive'
      )
      .send({
        reason:
          privateReason,
      })
      .expect(200);


  assert.deepStrictEqual(
    response.body.result,
    {
      archived:
        true,
    }
  );


  response =
    await request(app)
      .post(
        '/api/applicants/applicant-1/documents/document-v2/restore'
      )
      .expect(200);


  assert.deepStrictEqual(
    response.body.result,
    {
      restored:
        true,

      isCurrent:
        false,
    }
  );


  assert.strictEqual(
    events.length,
    3
  );


  const current =
    events[0];

  assert.strictEqual(
    current.type,
    'document.current_changed'
  );

  assert.strictEqual(
    current.applicantId,
    'applicant-1'
  );

  assert.strictEqual(
    current.source.type,
    'document'
  );

  assert.strictEqual(
    current.source.id,
    'document-v2'
  );

  assert.deepStrictEqual(
    current.changes,
    [
      {
        field:
          'document.currentDocumentId',

        label:
          'Current document',

        before:
          'document-v1',

        after:
          'document-v2',
      },
    ]
  );


  const archived =
    events[1];

  assert.strictEqual(
    archived.type,
    'document.archived'
  );

  assert.strictEqual(
    archived.metadata
      .archiveReasonProvided,
    true
  );

  assert.strictEqual(
    archived.metadata
      .wasCurrent,
    true
  );

  assert.strictEqual(
    archived.metadata
      .replacementDocumentId,
    'document-v1'
  );


  const restored =
    events[2];

  assert.strictEqual(
    restored.type,
    'document.restored'
  );

  assert.deepStrictEqual(
    restored.changes,
    [
      {
        field:
          'document.archived',

        label:
          'Document archived',

        before:
          true,

        after:
          false,
      },
    ]
  );


  const serialized =
    JSON.stringify(
      events
    );


  assert.strictEqual(
    serialized.includes(
      privateReason
    ),
    false
  );


  for (
    const forbidden
    of [
      'storageKey',
      'checksumSha256',
      'externalUrl',
      'signedUrl',
      'downloadUrl',
    ]
  ) {
    assert.strictEqual(
      serialized.includes(
        forbidden
      ),
      false,
      `Sensitive operational field leaked into Audit: ${forbidden}`
    );
  }


  console.log(
    '✅ document.current_changed event recorded'
  );

  console.log(
    '✅ already-current produces no event'
  );

  console.log(
    '✅ document.archived event recorded'
  );

  console.log(
    '✅ automatic current replacement captured'
  );

  console.log(
    '✅ archive reason represented only as boolean'
  );

  console.log(
    '✅ document.restored event recorded'
  );

  console.log(
    '✅ restored document remains non-current'
  );

  console.log(
    '✅ storage/checksum/URL details excluded'
  );

  console.log(
    '✅ HTTP response contracts preserved'
  );

  console.log(
    '\nAPPLICANT AUDIT B3E2 TEST PASSED'
  );
}


run().catch(
  error => {
    console.error(error);
    process.exitCode = 1;
  }
);
