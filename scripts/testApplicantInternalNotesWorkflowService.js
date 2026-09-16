'use strict';

const assert =
  require('assert');

const {
  normalizeInternalItemKind,
  normalizeTaskStatus,
  normalizeSchedule,
  createApplicantInternalNote,
  archiveApplicantInternalNote,
  restoreApplicantInternalNote,
  setApplicantInternalNoteImportance,
  setApplicantInternalNoteLike,
  setApplicantInternalNoteStar,
  setApplicantInternalTaskStatus,
  updateApplicantInternalNoteSchedule,
} = require(
  '../services/applicantInternalNotesService'
);


const APPLICANT_ID =
  '507f1f77bcf86cd799439011';

const NOTE_ID =
  '507f1f77bcf86cd799439012';


function queryResult(
  value
) {
  return {
    async lean() {
      return value;
    },
  };
}


async function run() {
  assert.strictEqual(
    normalizeInternalItemKind(
      'TASK'
    ),
    'task'
  );

  assert.strictEqual(
    normalizeTaskStatus(
      'completed'
    ),
    'completed'
  );

  assert.throws(
    () =>
      normalizeInternalItemKind(
        'meeting'
      ),
    error =>
      error?.code ===
        'INTERNAL_ITEM_KIND_INVALID'
  );

  const schedule =
    normalizeSchedule({
      startAt:
        '2026-09-18T09:00:00.000Z',

      endAt:
        '2026-09-18T10:00:00.000Z',

      reminderAt:
        '2026-09-18T08:30:00.000Z',

      reminderNote:
        'Follow up before the deadline',
    });

  assert(
    schedule.startAt instanceof
      Date
  );

  assert.throws(
    () =>
      normalizeSchedule({
        startAt:
          '2026-09-18T10:00:00Z',

        endAt:
          '2026-09-18T09:00:00Z',
      }),
    error =>
      error?.code ===
        'INTERNAL_NOTE_TIME_RANGE_INVALID'
  );

  console.log(
    '✅ workflow normalization'
  );


  const calls = [];

  const ApplicantModel = {
    findById() {
      return queryResult({
        _id:
          APPLICANT_ID,

        lifecycle: {
          archived: false,
        },
      });
    },
  };


  const updatedNote = {
    _id:
      NOTE_ID,

    applicantId:
      APPLICANT_ID,

    kind:
      'task',

    content:
      'Follow up',

    taskStatus:
      'todo',

    important:
      true,

    likedBy: [],
    starredBy: [],

    archived:
      false,
  };


  const NoteModel = {
    async create(
      documents
    ) {
      calls.push({
        action:
          'create',

        documents,
      });

      return [
        {
          ...updatedNote,
          ...documents[0],
        },
      ];
    },

    findOneAndUpdate(
      filter,
      update,
      options
    ) {
      calls.push({
        action:
          'update',

        filter,
        update,
        options,
      });

      return queryResult(
        updatedNote
      );
    },
  };


  const actor = {
    userId:
      'admin-1',

    name:
      'Admin User',

    email:
      'admin@example.com',

    role:
      'Admin',
  };


  const created =
    await createApplicantInternalNote({
      applicantId:
        APPLICANT_ID,

      content:
        'Follow up',

      kind:
        'task',

      important:
        true,

      schedule: {
        startAt:
          '2026-09-18T09:00:00Z',

        endAt:
          '2026-09-18T10:00:00Z',
      },

      actor,

      ApplicantModel,
      NoteModel,
    });

  assert.strictEqual(
    created.note.kind,
    'task'
  );

  assert.strictEqual(
    created.note.important,
    true
  );

  assert.strictEqual(
    calls[0]
      .documents[0]
      .taskStatus,
    'todo'
  );

  console.log(
    '✅ task creation'
  );


  await setApplicantInternalNoteLike({
    applicantId:
      APPLICANT_ID,

    noteId:
      NOTE_ID,

    liked:
      true,

    actor,

    ApplicantModel,
    NoteModel,
  });

  assert.strictEqual(
    calls.at(-1)
      .update
      .$addToSet
      .likedBy,
    'admin-1'
  );

  await setApplicantInternalNoteLike({
    applicantId:
      APPLICANT_ID,

    noteId:
      NOTE_ID,

    liked:
      false,

    actor,

    ApplicantModel,
    NoteModel,
  });

  assert.strictEqual(
    calls.at(-1)
      .update
      .$pull
      .likedBy,
    'admin-1'
  );

  console.log(
    '✅ like / unlike'
  );


  await setApplicantInternalNoteStar({
    applicantId:
      APPLICANT_ID,

    noteId:
      NOTE_ID,

    starred:
      true,

    actor,

    ApplicantModel,
    NoteModel,
  });

  assert.strictEqual(
    calls.at(-1)
      .update
      .$addToSet
      .starredBy,
    'admin-1'
  );

  console.log(
    '✅ star / unstar workflow'
  );


  await setApplicantInternalNoteImportance({
    applicantId:
      APPLICANT_ID,

    noteId:
      NOTE_ID,

    important:
      true,

    actor,

    ApplicantModel,
    NoteModel,
  });

  assert.strictEqual(
    calls.at(-1)
      .update
      .$set
      .important,
    true
  );

  console.log(
    '✅ important / normal workflow'
  );


  await setApplicantInternalTaskStatus({
    applicantId:
      APPLICANT_ID,

    noteId:
      NOTE_ID,

    taskStatus:
      'completed',

    actor,

    ApplicantModel,
    NoteModel,
  });

  assert.strictEqual(
    calls.at(-1)
      .filter
      .kind,
    'task'
  );

  assert.strictEqual(
    calls.at(-1)
      .update
      .$set
      .taskStatus,
    'completed'
  );

  console.log(
    '✅ complete / reopen workflow'
  );


  await updateApplicantInternalNoteSchedule({
    applicantId:
      APPLICANT_ID,

    noteId:
      NOTE_ID,

    schedule: {
      reminderAt:
        '2026-09-19T14:00:00Z',

      reminderNote:
        'Ask for portfolio update',
    },

    actor,

    ApplicantModel,
    NoteModel,
  });

  assert.strictEqual(
    calls.at(-1)
      .update
      .$set
      .schedule
      .reminderNote,
    'Ask for portfolio update'
  );

  console.log(
    '✅ dates + reminder workflow'
  );


  await archiveApplicantInternalNote({
    applicantId:
      APPLICANT_ID,

    noteId:
      NOTE_ID,

    actor,

    ApplicantModel,
    NoteModel,
  });

  assert.strictEqual(
    calls.at(-1)
      .update
      .$set
      .archived,
    true
  );


  await restoreApplicantInternalNote({
    applicantId:
      APPLICANT_ID,

    noteId:
      NOTE_ID,

    actor,

    ApplicantModel,
    NoteModel,
  });

  assert.strictEqual(
    calls.at(-1)
      .update
      .$set
      .archived,
    false
  );

  console.log(
    '✅ archive / restore workflow'
  );


  console.log(
    '\nAPPLICANT NOTES/TASKS WORKFLOW SERVICE TEST PASSED'
  );
}


run().catch(
  error => {
    console.error(error);
    process.exitCode = 1;
  }
);
