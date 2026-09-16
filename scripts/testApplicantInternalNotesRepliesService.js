'use strict';

const assert =
  require('assert');

const {
  normalizeReplyContent,

  createApplicantInternalNoteReply,
  updateApplicantInternalNoteReply,
  archiveApplicantInternalNoteReply,
  restoreApplicantInternalNoteReply,

  permanentlyDeleteApplicantInternalNoteReply,
  permanentlyDeleteApplicantInternalNote,
} = require(
  '../services/applicantInternalNotesService'
);


const APPLICANT_ID =
  '507f1f77bcf86cd799439011';

const NOTE_ID =
  '507f1f77bcf86cd799439012';

const REPLY_ID =
  '507f1f77bcf86cd799439013';


function leanResult(
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
    normalizeReplyContent(
      '  Looks good  '
    ),
    'Looks good'
  );

  assert.throws(
    () =>
      normalizeReplyContent(
        '   '
      ),
    error =>
      error?.code ===
        'INTERNAL_NOTE_REPLY_REQUIRED'
  );

  console.log(
    '✅ reply normalization'
  );


  const ApplicantModel = {
    findById() {
      return leanResult({
        _id:
          APPLICANT_ID,

        lifecycle: {
          archived: false,
        },
      });
    },
  };


  let noteArchived =
    false;


  const NoteModel = {
    findOne() {
      return leanResult({
        _id:
          NOTE_ID,

        applicantId:
          APPLICANT_ID,

        archived:
          noteArchived,
      });
    },

    async deleteOne(
      filter
    ) {
      assert.strictEqual(
        filter.archived,
        true
      );

      return {
        deletedCount: 1,
      };
    },
  };


  const replyUpdates = [];

  const ReplyModel = {
    async create(
      docs
    ) {
      return [
        {
          _id:
            REPLY_ID,

          ...docs[0],
        },
      ];
    },

    findOneAndUpdate(
      filter,
      update
    ) {
      replyUpdates.push({
        filter,
        update,
      });

      return leanResult({
        _id:
          REPLY_ID,

        applicantId:
          APPLICANT_ID,

        noteId:
          NOTE_ID,

        content:
          'Reply',

        archived:
          Boolean(
            update
              ?.$set
              ?.archived
          ),
      });
    },

    async deleteOne(
      filter
    ) {
      assert.strictEqual(
        filter.archived,
        true
      );

      return {
        deletedCount: 1,
      };
    },

    async deleteMany(
      filter
    ) {
      assert.strictEqual(
        String(
          filter.noteId
        ),
        NOTE_ID
      );

      return {
        deletedCount: 2,
      };
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
    await createApplicantInternalNoteReply({
      applicantId:
        APPLICANT_ID,

      noteId:
        NOTE_ID,

      content:
        'First reply',

      actor,

      ApplicantModel,
      NoteModel,
      ReplyModel,
    });

  assert.strictEqual(
    created.reply.content,
    'First reply'
  );

  console.log(
    '✅ reply creation'
  );


  await updateApplicantInternalNoteReply({
    applicantId:
      APPLICANT_ID,

    noteId:
      NOTE_ID,

    replyId:
      REPLY_ID,

    content:
      'Updated reply',

    actor,

    ApplicantModel,
    NoteModel,
    ReplyModel,
  });

  assert.strictEqual(
    replyUpdates
      .at(-1)
      .update
      .$set
      .content,
    'Updated reply'
  );

  console.log(
    '✅ reply update'
  );


  await archiveApplicantInternalNoteReply({
    applicantId:
      APPLICANT_ID,

    noteId:
      NOTE_ID,

    replyId:
      REPLY_ID,

    actor,

    ApplicantModel,
    NoteModel,
    ReplyModel,
  });

  assert.strictEqual(
    replyUpdates
      .at(-1)
      .update
      .$set
      .archived,
    true
  );


  await restoreApplicantInternalNoteReply({
    applicantId:
      APPLICANT_ID,

    noteId:
      NOTE_ID,

    replyId:
      REPLY_ID,

    actor,

    ApplicantModel,
    NoteModel,
    ReplyModel,
  });

  assert.strictEqual(
    replyUpdates
      .at(-1)
      .update
      .$set
      .archived,
    false
  );

  console.log(
    '✅ reply archive / restore'
  );


  await assert.rejects(
    () =>
      permanentlyDeleteApplicantInternalNoteReply({
        applicantId:
          APPLICANT_ID,

        noteId:
          NOTE_ID,

        replyId:
          REPLY_ID,

        confirmation:
          'NO',

        ApplicantModel,
        NoteModel,
        ReplyModel,
      }),
    error =>
      error?.code ===
        'INTERNAL_NOTE_DELETE_CONFIRMATION_REQUIRED'
  );


  await permanentlyDeleteApplicantInternalNoteReply({
    applicantId:
      APPLICANT_ID,

    noteId:
      NOTE_ID,

    replyId:
      REPLY_ID,

    confirmation:
      'DELETE',

    ApplicantModel,
    NoteModel,
    ReplyModel,
  });

  console.log(
    '✅ permanent reply deletion protected'
  );


  await assert.rejects(
    () =>
      permanentlyDeleteApplicantInternalNote({
        applicantId:
          APPLICANT_ID,

        noteId:
          NOTE_ID,

        confirmation:
          'DELETE',

        ApplicantModel,
        NoteModel,
        ReplyModel,
      }),
    error =>
      error?.code ===
        'INTERNAL_NOTE_DELETE_NOT_ALLOWED'
  );

  console.log(
    '✅ active note/task hard deletion blocked'
  );


  noteArchived =
    true;


  const hardDelete =
    await permanentlyDeleteApplicantInternalNote({
      applicantId:
        APPLICANT_ID,

      noteId:
        NOTE_ID,

      confirmation:
        'DELETE',

      ApplicantModel,
      NoteModel,
      ReplyModel,
    });

  assert.strictEqual(
    hardDelete.repliesDeleted,
    2
  );

  console.log(
    '✅ archived note/task permanent deletion allowed'
  );


  console.log(
    '\nAPPLICANT INTERNAL NOTES REPLIES SERVICE TEST PASSED'
  );
}


run().catch(
  error => {
    console.error(error);
    process.exitCode = 1;
  }
);
