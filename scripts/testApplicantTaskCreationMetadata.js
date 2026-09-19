'use strict';

const assert =
  require('assert');

const mongoose =
  require('mongoose');

const {
  createApplicantInternalNote,
} = require(
  '../services/applicantInternalNotesService'
);

const applicantSwaggerSpec =
  require(
    '../docs/applicantSwagger'
  );


function queryResult(
  value
) {
  return {
    lean: async () =>
      value,
  };
}


async function run() {
  const APPLICANT_ID =
    '64b000000000000000000011';

  const NOTE_ID =
    '64b000000000000000000012';


  const ApplicantModel = {
    findById() {
      return queryResult({
        _id:
          new mongoose.Types.ObjectId(
            APPLICANT_ID
          ),

        lifecycle: {
          archived:
            false,
        },

        recruitment: {
          tags:
            [],
        },
      });
    },
  };


  const writes =
    [];

  const NoteModel = {
    async create(
      documents
    ) {
      writes.push(
        ...documents
      );

      return documents.map(
        document => ({
          _id:
            new mongoose.Types.ObjectId(
              NOTE_ID
            ),

          ...document,
        })
      );
    },
  };


  const actor = {
    userId:
      'admin-1',

    name:
      'Admin',

    email:
      'admin@example.com',

    role:
      'Admin',
  };


  let resolverCalls =
    0;


  const created =
    await createApplicantInternalNote({
      applicantId:
        APPLICANT_ID,

      content:
        'Follow up candidate',

      kind:
        'task',

      priority:
        'urgent',

      assigneeUserId:
        'recruiter-1',

      important:
        true,

      schedule: {
        startAt:
          '2026-09-20T09:00:00Z',

        endAt:
          '2026-09-20T10:00:00Z',
      },

      actor,

      resolveUserById:
        async userId => {
          resolverCalls += 1;

          assert.strictEqual(
            userId,
            'recruiter-1'
          );

          return {
            id:
              'recruiter-1',

            name:
              'Recruiter One',

            email:
              'Recruiter@One.Example',

            role:
              'Recruiter',

            status:
              'Active',
          };
        },

      ApplicantModel,
      NoteModel,
    });


  assert.strictEqual(
    resolverCalls,
    1
  );

  assert.strictEqual(
    created.note.kind,
    'task'
  );

  assert.strictEqual(
    created.note.taskStatus,
    'todo'
  );

  assert.strictEqual(
    created.note.priority,
    'urgent'
  );

  assert.deepStrictEqual(
    created.note.assignee,
    {
      userId:
        'recruiter-1',

      name:
        'Recruiter One',

      email:
        'recruiter@one.example',

      role:
        'Recruiter',
    }
  );


  /*
   * Task metadata remains optional.
   */
  const unassigned =
    await createApplicantInternalNote({
      applicantId:
        APPLICANT_ID,

      content:
        'Review CV',

      kind:
        'task',

      actor,

      ApplicantModel,
      NoteModel,
    });


  assert.strictEqual(
    unassigned.note.priority,
    ''
  );

  assert.deepStrictEqual(
    unassigned.note.assignee,
    {}
  );


  /*
   * Notes ignore task-only metadata.
   */
  const note =
    await createApplicantInternalNote({
      applicantId:
        APPLICANT_ID,

      content:
        'Candidate prefers afternoon',

      kind:
        'note',

      priority:
        'urgent',

      assigneeUserId:
        'fake-user',

      actor,

      resolveUserById:
        async () => {
          throw new Error(
            'Note must not resolve task assignee'
          );
        },

      ApplicantModel,
      NoteModel,
    });


  assert.strictEqual(
    note.note.priority,
    ''
  );

  assert.deepStrictEqual(
    note.note.assignee,
    {}
  );


  /*
   * Invalid assignee must fail before persistence.
   */
  const writesBeforeInvalid =
    writes.length;


  await assert.rejects(
    () =>
      createApplicantInternalNote({
        applicantId:
          APPLICANT_ID,

        content:
          'Contact candidate',

        kind:
          'task',

        assigneeUserId:
          'suspended-1',

        actor,

        resolveUserById:
          async () => ({
            id:
              'suspended-1',

            name:
              'Suspended Recruiter',

            email:
              'suspended@example.com',

            role:
              'Recruiter',

            status:
              'Suspended',
          }),

        ApplicantModel,
        NoteModel,
      }),

    error =>
      error?.code ===
        'INTERNAL_TASK_ASSIGNEE_INACTIVE'
  );


  assert.strictEqual(
    writes.length,
    writesBeforeInvalid
  );


  /*
   * Swagger exposes creation metadata.
   */
  const schema =
    applicantSwaggerSpec
      .paths[
        '/api/applicants/{id}/notes'
      ]
      .post
      .requestBody
      .content[
        'application/json'
      ]
      .schema;


  assert(
    schema.properties
      .assigneeUserId
  );

  assert.deepStrictEqual(
    schema.properties
      .priority
      .enum,
    [
      '',
      'low',
      'medium',
      'high',
      'urgent',
    ]
  );


  console.log(
    '✅ creation-time trusted assignee'
  );

  console.log(
    '✅ creation-time priority'
  );

  console.log(
    '✅ optional metadata compatibility'
  );

  console.log(
    '✅ note compatibility'
  );

  console.log(
    '✅ invalid assignee rejected pre-write'
  );

  console.log(
    '✅ Swagger creation metadata'
  );

  console.log(
    '\nAPPLICANT TASK CREATION METADATA TEST PASSED'
  );
}


run().catch(
  error => {
    console.error(error);
    process.exitCode = 1;
  }
);
