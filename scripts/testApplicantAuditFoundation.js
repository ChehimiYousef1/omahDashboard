'use strict';

const assert =
  require('assert');

const fs =
  require('fs');

const ApplicantActivity =
  require(
    '../models/ApplicantActivity'
  );

const {
  normalizeAuditChanges,
  sanitizeAuditValue,
  buildApplicantActivity,
} = require(
  '../services/applicantActivityService'
);

const {
  buildApplicantAuditFilter,
  deriveLegacyAuditChanges,
  serializeApplicantAuditEvent,
} = require(
  '../services/applicantAuditService'
);


/*
|--------------------------------------------------------------------------
| Model contract
|--------------------------------------------------------------------------
*/

assert(
  ApplicantActivity.schema
    .path(
      'auditVersion'
    ),
  'ApplicantActivity.auditVersion missing'
);


assert(
  ApplicantActivity.schema
    .path(
      'changes'
    ),
  'ApplicantActivity.changes missing'
);


/*
|--------------------------------------------------------------------------
| Sensitive-field filtering
|--------------------------------------------------------------------------
*/

const normalized =
  normalizeAuditChanges([
    {
      field:
        'recruitment.status',

      before:
        'reviewing',

      after:
        'shortlisted',
    },

    {
      field:
        'passwordHash',

      before:
        'secret-a',

      after:
        'secret-b',
    },
  ]);


assert.strictEqual(
  normalized.length,
  1,
  'Sensitive audit field must be removed'
);


assert.strictEqual(
  normalized[0].field,
  'recruitment.status'
);


const sanitized =
  sanitizeAuditValue({
    safe:
      'visible',

    password:
      'hidden',

    nested: {
      token:
        'hidden-too',

      value:
        42,
    },
  });


assert.strictEqual(
  sanitized.safe,
  'visible'
);

assert.strictEqual(
  Object.prototype.hasOwnProperty.call(
    sanitized,
    'password'
  ),
  false
);

assert.strictEqual(
  Object.prototype.hasOwnProperty.call(
    sanitized.nested,
    'token'
  ),
  false
);

assert.strictEqual(
  sanitized.nested.value,
  42
);


/*
|--------------------------------------------------------------------------
| Activity write compatibility
|--------------------------------------------------------------------------
*/

const activity =
  buildApplicantActivity({
    applicantId:
      '507f1f77bcf86cd799439011',

    type:
      'status.changed',

    title:
      'Recruitment status changed',

    actor: {
      userId:
        'admin-1',

      name:
        'Admin',

      email:
        'admin@example.test',

      role:
        'Super Admin',
    },

    changes: [
      {
        field:
          'recruitment.status',

        before:
          'reviewing',

        after:
          'shortlisted',
      },
    ],
  });


assert.strictEqual(
  activity.auditVersion,
  1
);

assert.strictEqual(
  activity.changes.length,
  1
);

assert.strictEqual(
  activity.changes[0].before,
  'reviewing'
);

assert.strictEqual(
  activity.changes[0].after,
  'shortlisted'
);


/*
|--------------------------------------------------------------------------
| Legacy change derivation
|--------------------------------------------------------------------------
*/

const legacyStatus =
  deriveLegacyAuditChanges({
    type:
      'status.changed',

    metadata: {
      previousStatus:
        'reviewing',

      nextStatus:
        'shortlisted',
    },
  });


assert.deepStrictEqual(
  legacyStatus,
  [
    {
      field:
        'recruitment.status',

      label:
        'Recruitment status',

      before:
        'reviewing',

      after:
        'shortlisted',
    },
  ]
);


const legacyTask =
  deriveLegacyAuditChanges({
    type:
      'task.priority_changed',

    metadata: {
      previousPriority:
        'medium',

      priority:
        'high',
    },
  });


assert.strictEqual(
  legacyTask[0].field,
  'task.priority'
);

assert.strictEqual(
  legacyTask[0].before,
  'medium'
);

assert.strictEqual(
  legacyTask[0].after,
  'high'
);


/*
|--------------------------------------------------------------------------
| Audit serialization
|--------------------------------------------------------------------------
*/

const serialized =
  serializeApplicantAuditEvent({
    _id:
      'event-1',

    type:
      'status.changed',

    category:
      'status',

    title:
      'Recruitment status changed',

    description:
      'reviewing → shortlisted',

    occurredAt:
      new Date(
        '2026-09-21T10:00:00Z'
      ),

    createdAt:
      new Date(
        '2026-09-21T10:00:01Z'
      ),

    actor: {
      userId:
        'admin-1',

      name:
        'Admin',
    },

    source: {
      type:
        'applicant',

      id:
        '507f1f77bcf86cd799439011',
    },

    metadata: {
      previousStatus:
        'reviewing',

      nextStatus:
        'shortlisted',

      authToken:
        'must-not-leak',
    },
  });


assert.strictEqual(
  serialized.action,
  'status.changed'
);

assert.strictEqual(
  serialized.changes.length,
  1
);

assert.strictEqual(
  Object.prototype.hasOwnProperty.call(
    serialized.details,
    'authToken'
  ),
  false,
  'Sensitive metadata leaked through audit endpoint'
);


/*
|--------------------------------------------------------------------------
| Query filter contract
|--------------------------------------------------------------------------
*/

const filter =
  buildApplicantAuditFilter({
    applicantId:
      '507f1f77bcf86cd799439011',

    category:
      'status',

    action:
      'status.changed',

    actorId:
      'admin-1',

    from:
      '2026-09-01T00:00:00Z',

    to:
      '2026-09-30T23:59:59Z',
  });


assert.strictEqual(
  filter.category,
  'status'
);

assert.strictEqual(
  filter.type,
  'status.changed'
);

assert.strictEqual(
  filter['actor.userId'],
  'admin-1'
);

assert(
  filter.occurredAt.$gte
    instanceof Date
);

assert(
  filter.occurredAt.$lte
    instanceof Date
);


/*
|--------------------------------------------------------------------------
| Route / Swagger / grouping
|--------------------------------------------------------------------------
*/

const routes =
  fs.readFileSync(
    'src/routes/applicants.routes.js',
    'utf8'
  );

const swagger =
  require(
    '../docs/applicantSwagger'
  );


assert.deepStrictEqual(
  swagger.security,
  [
    {
      cookieAuth: []
    }
  ],
  'Applicant Swagger must retain global cookie authentication'
);


assert.strictEqual(
  swagger.paths[
    '/api/applicants/{id}/audit'
  ]?.get?.security,
  undefined,
  'Audit endpoint should inherit global Swagger security instead of overriding it'
);


assert(
  routes.includes(
    "'/:id/audit'"
  ),
  'Applicant audit route missing'
);

assert(
  routes.includes(
    'getApplicantAuditHistory'
  ),
  'Applicant audit service not wired'
);


assert(
  swagger.paths[
    '/api/applicants/{id}/audit'
  ],
  'Applicant audit Swagger path missing'
);


assert.deepStrictEqual(
  swagger.paths[
    '/api/applicants/{id}/audit'
  ].get.tags,
  [
    'Applicant Audit & History'
  ]
);


assert(
  (
    swagger.tags ||
    []
  ).some(
    tag =>
      tag.name ===
      'Applicant Audit & History'
  ),
  'Applicant Audit & History top-level Swagger tag missing'
);


console.log(
  '✅ ApplicantActivity audit schema'
);

console.log(
  '✅ structured before/after changes'
);

console.log(
  '✅ sensitive field filtering'
);

console.log(
  '✅ legacy status/task changes derived'
);

console.log(
  '✅ paginated audit filter contract'
);

console.log(
  '✅ Applicant audit API wired'
);

console.log(
  '✅ Applicant Audit & History Swagger group'
);

console.log(
  '\nAPPLICANT AUDIT FOUNDATION TEST PASSED'
);
