'use strict';

const assert =
  require('assert');

const mongoose =
  require('mongoose');

const {
  normalizeTags,
  createApplicantInternalNote,
  updateApplicantInternalNote,
  deleteApplicantInternalNote,
  replaceApplicantTags,
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
  assert.deepStrictEqual(
    normalizeTags([
      ' Priority ',
      'priority',
      'Needs Review',
    ]),
    [
      'priority',
      'needs-review',
    ]
  );

  console.log(
    '✅ tags normalized and deduplicated'
  );


  let tagUpdate =
    null;

  const ApplicantModel = {
    findById() {
      return queryResult({
        _id:
          APPLICANT_ID,

        lifecycle: {
          archived: false,
        },

        recruitment: {
          tags: [
            'old-tag',
          ],
        },
      });
    },

    async updateOne(
      filter,
      update
    ) {
      tagUpdate = {
        filter,
        update,
      };

      return {
        matchedCount: 1,
        modifiedCount: 1,
      };
    },
  };


  const createdNote = {
    _id:
      NOTE_ID,

    applicantId:
      APPLICANT_ID,

    content:
      'First internal note',

    author: {
      userId:
        'admin-1',

      name:
        'Admin',
    },
  };


  const NoteModel = {
    async create() {
      return [
        createdNote,
      ];
    },

    findOneAndUpdate(
      filter,
      update
    ) {
      if (
        update.$set
          .archived ===
        true
      ) {
        return queryResult({
          ...createdNote,
          archived:
            true,
        });
      }

      return queryResult({
        ...createdNote,
        content:
          update.$set.content,
      });
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


  const created =
    await createApplicantInternalNote({
      applicantId:
        APPLICANT_ID,

      content:
        'First internal note',

      actor,

      ApplicantModel,
      NoteModel,
    });

  assert.strictEqual(
    created.note.content,
    'First internal note'
  );

  console.log(
    '✅ internal note creation works'
  );


  const updated =
    await updateApplicantInternalNote({
      applicantId:
        APPLICANT_ID,

      noteId:
        NOTE_ID,

      content:
        'Updated internal note',

      actor,

      ApplicantModel,
      NoteModel,
    });

  assert.strictEqual(
    updated.note.content,
    'Updated internal note'
  );

  console.log(
    '✅ internal note update works'
  );


  const deleted =
    await deleteApplicantInternalNote({
      applicantId:
        APPLICANT_ID,

      noteId:
        NOTE_ID,

      actor,

      ApplicantModel,
      NoteModel,
    });

  assert.strictEqual(
    deleted.status,
    'note-deleted'
  );

  console.log(
    '✅ internal note delete uses soft archive'
  );


  const tags =
    await replaceApplicantTags({
      applicantId:
        APPLICANT_ID,

      tags: [
        'Priority',
        'Follow Up',
      ],

      ApplicantModel,
    });

  assert.deepStrictEqual(
    tags.tags,
    [
      'priority',
      'follow-up',
    ]
  );

  assert.ok(
    tagUpdate
  );

  assert.deepStrictEqual(
    tagUpdate.update
      .$set[
        'recruitment.tags'
      ],
    [
      'priority',
      'follow-up',
    ]
  );

  console.log(
    '✅ Applicant tags update existing recruitment.tags'
  );


  const ArchivedApplicantModel = {
    findById() {
      return queryResult({
        _id:
          APPLICANT_ID,

        lifecycle: {
          archived: true,
        },

        recruitment: {
          tags: [],
        },
      });
    },
  };


  await assert.rejects(
    () =>
      createApplicantInternalNote({
        applicantId:
          APPLICANT_ID,

        content:
          'Blocked',

        actor,

        ApplicantModel:
          ArchivedApplicantModel,

        NoteModel,
      }),

    error =>
      error?.code ===
        'APPLICANT_NOT_FOUND'
  );

  console.log(
    '✅ archived Applicant mutation blocked'
  );


  assert.strictEqual(
    mongoose.connection.readyState,
    0
  );

  console.log(
    '✅ no MongoDB connection used'
  );

  console.log(
    '\nAPPLICANT INTERNAL NOTES & TAGS SERVICE TEST PASSED'
  );
}


run().catch(
  error => {
    console.error(error);
    process.exitCode = 1;
  }
);
