'use strict';

const Applicant =
  require('../models/Applicant');

const ApplicantInternalNote =
  require(
    '../models/ApplicantInternalNote'
  );


const ApplicantInternalNoteReply =
  require(
    '../models/ApplicantInternalNoteReply'
  );

const {
  toObjectId,
} = require(
  './applicantSubmissionService'
);


const MAX_NOTE_LENGTH =
  4000;

const MAX_TAGS =
  20;

const MAX_TAG_LENGTH =
  40;



const INTERNAL_ITEM_KINDS =
  Object.freeze([
    'note',
    'task',
  ]);

const INTERNAL_TASK_STATUSES =
  Object.freeze([
    'todo',
    'completed',
  ]);

const MAX_REMINDER_NOTE_LENGTH =
  1000;


const MAX_REPLY_LENGTH =
  2000;


const DEFAULT_APPLICANT_TAG_TAXONOMY =
  Object.freeze([
    'priority',
    'strong-candidate',
    'needs-review',
    'follow-up',
    'interview-ready',
    'missing-documents',
    'referral',
    'university-candidate',
    'hold',
    'do-not-contact',
  ]);


function serviceError(
  code,
  message
) {
  const error =
    new Error(message);

  error.code =
    code;

  return error;
}


function cleanText(
  value
) {
  return String(
    value ??
    ''
  ).trim();
}


function plainDocument(
  value
) {
  if (
    value &&
    typeof value.toObject ===
      'function'
  ) {
    return value.toObject();
  }

  return value;
}


async function resolveLean(
  query
) {
  if (
    query &&
    typeof query.lean ===
      'function'
  ) {
    return query.lean();
  }

  return query;
}


function normalizeActor(
  actor
) {
  if (
    !actor ||
    typeof actor !==
      'object' ||
    Array.isArray(actor)
  ) {
    throw serviceError(
      'NOTE_ACTOR_REQUIRED',
      'Administrator information is required.'
    );
  }

  const userId =
    cleanText(
      actor.userId
    );

  if (!userId) {
    throw serviceError(
      'NOTE_ACTOR_REQUIRED',
      'Administrator user ID is required.'
    );
  }

  return {
    userId,

    name:
      cleanText(
        actor.name
      ),

    email:
      cleanText(
        actor.email
      ).toLowerCase(),

    role:
      cleanText(
        actor.role
      ),
  };
}


function normalizeNoteContent(
  content
) {
  const normalized =
    cleanText(
      content
    );

  if (!normalized) {
    throw serviceError(
      'NOTE_CONTENT_REQUIRED',
      'Internal note cannot be empty.'
    );
  }

  if (
    normalized.length >
    MAX_NOTE_LENGTH
  ) {
    throw serviceError(
      'NOTE_CONTENT_TOO_LONG',
      `Internal note cannot exceed ${MAX_NOTE_LENGTH} characters.`
    );
  }

  return normalized;
}


function normalizeReplyContent(
  content
) {
  const normalized =
    cleanText(
      content
    );

  if (!normalized) {
    throw serviceError(
      'INTERNAL_NOTE_REPLY_REQUIRED',
      'Reply cannot be empty.'
    );
  }

  if (
    normalized.length >
    MAX_REPLY_LENGTH
  ) {
    throw serviceError(
      'INTERNAL_NOTE_REPLY_TOO_LONG',
      `Reply cannot exceed ${MAX_REPLY_LENGTH} characters.`
    );
  }

  return normalized;
}


function normalizeInternalItemKind(
  value = 'note'
) {
  const normalized =
    cleanText(
      value ||
      'note'
    ).toLowerCase();

  if (
    !INTERNAL_ITEM_KINDS
      .includes(
        normalized
      )
  ) {
    throw serviceError(
      'INTERNAL_ITEM_KIND_INVALID',
      'Internal item kind must be note or task.'
    );
  }

  return normalized;
}


function normalizeTaskStatus(
  value = 'todo'
) {
  const normalized =
    cleanText(
      value ||
      'todo'
    ).toLowerCase();

  if (
    !INTERNAL_TASK_STATUSES
      .includes(
        normalized
      )
  ) {
    throw serviceError(
      'INTERNAL_TASK_STATUS_INVALID',
      'Task status must be todo or completed.'
    );
  }

  return normalized;
}


function normalizeBoolean(
  value,
  fieldName
) {
  if (
    typeof value !==
    'boolean'
  ) {
    throw serviceError(
      'INTERNAL_NOTE_BOOLEAN_INVALID',
      `${fieldName} must be true or false.`
    );
  }

  return value;
}


function normalizeOptionalDate(
  value,
  fieldName
) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return null;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    throw serviceError(
      'INTERNAL_NOTE_DATE_INVALID',
      `${fieldName} must be a valid date/time.`
    );
  }

  return date;
}


function normalizeSchedule(
  schedule = {}
) {
  if (
    !schedule ||
    typeof schedule !==
      'object' ||
    Array.isArray(
      schedule
    )
  ) {
    throw serviceError(
      'INTERNAL_NOTE_SCHEDULE_INVALID',
      'Schedule must be an object.'
    );
  }

  const startAt =
    normalizeOptionalDate(
      schedule.startAt,
      'startAt'
    );

  const endAt =
    normalizeOptionalDate(
      schedule.endAt,
      'endAt'
    );

  const reminderAt =
    normalizeOptionalDate(
      schedule.reminderAt,
      'reminderAt'
    );

  const reminderNote =
    cleanText(
      schedule.reminderNote
    );

  if (
    reminderNote.length >
    MAX_REMINDER_NOTE_LENGTH
  ) {
    throw serviceError(
      'INTERNAL_NOTE_REMINDER_TOO_LONG',
      `Reminder note cannot exceed ${MAX_REMINDER_NOTE_LENGTH} characters.`
    );
  }

  if (
    startAt &&
    endAt &&
    endAt <= startAt
  ) {
    throw serviceError(
      'INTERNAL_NOTE_TIME_RANGE_INVALID',
      'End date/time must be after the start date/time.'
    );
  }

  return {
    startAt,
    endAt,
    reminderAt,
    reminderNote,
  };
}


function normalizeTag(
  value
) {
  const original =
    cleanText(
      value
    );

  if (!original) {
    throw serviceError(
      'APPLICANT_TAG_INVALID',
      'Tag cannot be empty.'
    );
  }

  const normalized =
    original
      .toLowerCase()
      .replace(
        /[\s_]+/g,
        '-'
      )
      .replace(
        /[^a-z0-9-]/g,
        ''
      )
      .replace(
        /-+/g,
        '-'
      )
      .replace(
        /^-+|-+$/g,
        ''
      );

  if (!normalized) {
    throw serviceError(
      'APPLICANT_TAG_INVALID',
      'Tag must contain letters or numbers.'
    );
  }

  if (
    normalized.length >
    MAX_TAG_LENGTH
  ) {
    throw serviceError(
      'APPLICANT_TAG_INVALID',
      `Tag cannot exceed ${MAX_TAG_LENGTH} characters.`
    );
  }

  return normalized;
}


function normalizeTags(
  tags
) {
  if (!Array.isArray(tags)) {
    throw serviceError(
      'APPLICANT_TAGS_INVALID',
      'Tags must be an array.'
    );
  }

  const normalized =
    [
      ...new Set(
        tags.map(
          normalizeTag
        )
      ),
    ];

  if (
    normalized.length >
    MAX_TAGS
  ) {
    throw serviceError(
      'APPLICANT_TAG_LIMIT_EXCEEDED',
      `An Applicant cannot have more than ${MAX_TAGS} tags.`
    );
  }

  return normalized;
}


async function requireApplicant({
  applicantId,

  allowArchived =
    false,

  ApplicantModel =
    Applicant,
}) {
  const applicantObjectId =
    toObjectId(
      applicantId,
      'applicantId'
    );

  const applicant =
    await resolveLean(
      ApplicantModel.findById(
        applicantObjectId
      )
    );

  if (!applicant) {
    throw serviceError(
      'APPLICANT_NOT_FOUND',
      'Applicant was not found.'
    );
  }

  if (
    !allowArchived &&
    applicant.lifecycle
      ?.archived === true
  ) {
    throw serviceError(
      'APPLICANT_NOT_FOUND',
      'Applicant was not found or is archived.'
    );
  }

  return {
    applicantObjectId,
    applicant,
  };
}


async function listApplicantInternalNotes({
  applicantId,

  includeArchived =
    false,

  ApplicantModel =
    Applicant,

  NoteModel =
    ApplicantInternalNote,
} = {}) {
  const target =
    await requireApplicant({
      applicantId,
      ApplicantModel,
      allowArchived:
        true,
    });

  const filter = {
    applicantId:
      target.applicantObjectId,
  };

  if (!includeArchived) {
    filter.archived = {
      $ne: true,
    };
  }

  let query =
    NoteModel.find(
      filter
    );

  if (
    query &&
    typeof query.sort ===
      'function'
  ) {
    query =
      query.sort({
        createdAt: -1,
        _id: -1,
      });
  }

  const notes =
    await resolveLean(
      query
    );

  return {
    applicantId:
      String(
        target.applicantObjectId
      ),

    notes:
      notes ||
      [],
  };
}


async function createApplicantInternalNote({
  applicantId,
  content,
  actor,

  kind =
    'note',

  important =
    false,

  schedule =
    {},

  ApplicantModel =
    Applicant,

  NoteModel =
    ApplicantInternalNote,
} = {}) {
  const target =
    await requireApplicant({
      applicantId,
      ApplicantModel,
    });

  const normalizedActor =
    normalizeActor(
      actor
    );

  const normalizedContent =
    normalizeNoteContent(
      content
    );

  const normalizedKind =
    normalizeInternalItemKind(
      kind
    );

  const normalizedImportant =
    typeof important ===
      'boolean'
      ? important
      : normalizeBoolean(
          important,
          'important'
        );

  const normalizedSchedule =
    normalizeSchedule(
      schedule
    );

  const created =
    await NoteModel.create([
      {
        applicantId:
          target.applicantObjectId,

        content:
          normalizedContent,

        kind:
          normalizedKind,

        taskStatus:
          'todo',

        important:
          normalizedImportant,

        schedule:
          normalizedSchedule,

        author:
          normalizedActor,
      },
    ]);

  return {
    status:
      'note-created',

    note:
      plainDocument(
        created[0]
      ),
  };
}


async function updateApplicantInternalNote({
  applicantId,
  noteId,
  content,
  actor,

  ApplicantModel =
    Applicant,

  NoteModel =
    ApplicantInternalNote,
} = {}) {
  const target =
    await requireApplicant({
      applicantId,
      ApplicantModel,
    });

  const noteObjectId =
    toObjectId(
      noteId,
      'noteId'
    );

  const normalizedActor =
    normalizeActor(
      actor
    );

  const normalizedContent =
    normalizeNoteContent(
      content
    );

  const updated =
    await resolveLean(
      NoteModel
        .findOneAndUpdate(
          {
            _id:
              noteObjectId,

            applicantId:
              target.applicantObjectId,

            archived: {
              $ne: true,
            },
          },

          {
            $set: {
              content:
                normalizedContent,

              /*
               * Preserve any existing Calendar
               * event link but mark its provider
               * copy stale.
               *
               * External Calendar updates remain
               * explicit recruiter actions.
               */
              'calendar.syncStatus':
                'not_synced',

              'calendar.syncedAt':
                null,

              'calendar.syncError':
                '',

              updatedBy:
                normalizedActor,
            },
          },

          {
            new: true,
            runValidators: true,
          }
        )
    );

  if (!updated) {
    throw serviceError(
      'INTERNAL_NOTE_NOT_FOUND',
      'Internal note was not found.'
    );
  }

  return {
    status:
      'note-updated',

    note:
      updated,
  };
}


async function deleteApplicantInternalNote({
  applicantId,
  noteId,
  actor,

  ApplicantModel =
    Applicant,

  NoteModel =
    ApplicantInternalNote,
} = {}) {
  const target =
    await requireApplicant({
      applicantId,
      ApplicantModel,
    });

  const noteObjectId =
    toObjectId(
      noteId,
      'noteId'
    );

  const normalizedActor =
    normalizeActor(
      actor
    );

  const archivedAt =
    new Date();

  const updated =
    await resolveLean(
      NoteModel
        .findOneAndUpdate(
          {
            _id:
              noteObjectId,

            applicantId:
              target.applicantObjectId,

            archived: {
              $ne: true,
            },
          },

          {
            $set: {
              archived:
                true,

              archivedAt,

              archivedBy:
                normalizedActor,
            },
          },

          {
            new: true,
            runValidators: true,
          }
        )
    );

  if (!updated) {
    throw serviceError(
      'INTERNAL_NOTE_NOT_FOUND',
      'Internal note was not found.'
    );
  }

  return {
    status:
      'note-deleted',

    noteId:
      String(
        noteObjectId
      ),

    archivedAt,
  };
}



async function archiveApplicantInternalNote({
  applicantId,
  noteId,
  actor,

  ApplicantModel =
    Applicant,

  NoteModel =
    ApplicantInternalNote,
} = {}) {
  const target =
    await requireApplicant({
      applicantId,
      ApplicantModel,
    });

  const noteObjectId =
    toObjectId(
      noteId,
      'noteId'
    );

  const normalizedActor =
    normalizeActor(
      actor
    );

  const archivedAt =
    new Date();

  const note =
    await resolveLean(
      NoteModel
        .findOneAndUpdate(
          {
            _id:
              noteObjectId,

            applicantId:
              target.applicantObjectId,

            archived: {
              $ne: true,
            },
          },

          {
            $set: {
              archived:
                true,

              archivedAt,

              archivedBy:
                normalizedActor,

              updatedBy:
                normalizedActor,
            },
          },

          {
            new: true,
            runValidators: true,
          }
        )
    );

  if (!note) {
    throw serviceError(
      'INTERNAL_NOTE_NOT_FOUND',
      'Internal note or task was not found.'
    );
  }

  return {
    status:
      'internal-item-archived',

    note,
  };
}


async function restoreApplicantInternalNote({
  applicantId,
  noteId,
  actor,

  ApplicantModel =
    Applicant,

  NoteModel =
    ApplicantInternalNote,
} = {}) {
  const target =
    await requireApplicant({
      applicantId,
      ApplicantModel,
    });

  const noteObjectId =
    toObjectId(
      noteId,
      'noteId'
    );

  const normalizedActor =
    normalizeActor(
      actor
    );

  const note =
    await resolveLean(
      NoteModel
        .findOneAndUpdate(
          {
            _id:
              noteObjectId,

            applicantId:
              target.applicantObjectId,

            archived:
              true,
          },

          {
            $set: {
              archived:
                false,

              archivedAt:
                null,

              archivedBy: {},

              updatedBy:
                normalizedActor,
            },
          },

          {
            new: true,
            runValidators: true,
          }
        )
    );

  if (!note) {
    throw serviceError(
      'INTERNAL_NOTE_NOT_FOUND',
      'Archived internal note or task was not found.'
    );
  }

  return {
    status:
      'internal-item-restored',

    note,
  };
}


async function setApplicantInternalNoteImportance({
  applicantId,
  noteId,
  important,
  actor,

  ApplicantModel =
    Applicant,

  NoteModel =
    ApplicantInternalNote,
} = {}) {
  const target =
    await requireApplicant({
      applicantId,
      ApplicantModel,
    });

  const noteObjectId =
    toObjectId(
      noteId,
      'noteId'
    );

  const normalizedActor =
    normalizeActor(
      actor
    );

  const normalizedImportant =
    normalizeBoolean(
      important,
      'important'
    );

  const note =
    await resolveLean(
      NoteModel
        .findOneAndUpdate(
          {
            _id:
              noteObjectId,

            applicantId:
              target.applicantObjectId,

            archived: {
              $ne: true,
            },
          },

          {
            $set: {
              important:
                normalizedImportant,

              updatedBy:
                normalizedActor,
            },
          },

          {
            new: true,
            runValidators: true,
          }
        )
    );

  if (!note) {
    throw serviceError(
      'INTERNAL_NOTE_NOT_FOUND',
      'Internal note or task was not found.'
    );
  }

  return {
    status:
      normalizedImportant
        ? 'internal-item-important'
        : 'internal-item-normal',

    note,
  };
}


async function setApplicantInternalNoteLike({
  applicantId,
  noteId,
  liked,
  actor,

  ApplicantModel =
    Applicant,

  NoteModel =
    ApplicantInternalNote,
} = {}) {
  const target =
    await requireApplicant({
      applicantId,
      ApplicantModel,
    });

  const noteObjectId =
    toObjectId(
      noteId,
      'noteId'
    );

  const normalizedActor =
    normalizeActor(
      actor
    );

  const normalizedLiked =
    normalizeBoolean(
      liked,
      'liked'
    );

  const update =
    normalizedLiked
      ? {
          $addToSet: {
            likedBy:
              normalizedActor
                .userId,
          },

          $set: {
            updatedBy:
              normalizedActor,
          },
        }
      : {
          $pull: {
            likedBy:
              normalizedActor
                .userId,
          },

          $set: {
            updatedBy:
              normalizedActor,
          },
        };

  const note =
    await resolveLean(
      NoteModel
        .findOneAndUpdate(
          {
            _id:
              noteObjectId,

            applicantId:
              target.applicantObjectId,

            archived: {
              $ne: true,
            },
          },

          update,

          {
            new: true,
            runValidators: true,
          }
        )
    );

  if (!note) {
    throw serviceError(
      'INTERNAL_NOTE_NOT_FOUND',
      'Internal note or task was not found.'
    );
  }

  return {
    status:
      normalizedLiked
        ? 'internal-item-liked'
        : 'internal-item-unliked',

    note,
  };
}


async function setApplicantInternalNoteStar({
  applicantId,
  noteId,
  starred,
  actor,

  ApplicantModel =
    Applicant,

  NoteModel =
    ApplicantInternalNote,
} = {}) {
  const target =
    await requireApplicant({
      applicantId,
      ApplicantModel,
    });

  const noteObjectId =
    toObjectId(
      noteId,
      'noteId'
    );

  const normalizedActor =
    normalizeActor(
      actor
    );

  const normalizedStarred =
    normalizeBoolean(
      starred,
      'starred'
    );

  const update =
    normalizedStarred
      ? {
          $addToSet: {
            starredBy:
              normalizedActor
                .userId,
          },

          $set: {
            updatedBy:
              normalizedActor,
          },
        }
      : {
          $pull: {
            starredBy:
              normalizedActor
                .userId,
          },

          $set: {
            updatedBy:
              normalizedActor,
          },
        };

  const note =
    await resolveLean(
      NoteModel
        .findOneAndUpdate(
          {
            _id:
              noteObjectId,

            applicantId:
              target.applicantObjectId,

            archived: {
              $ne: true,
            },
          },

          update,

          {
            new: true,
            runValidators: true,
          }
        )
    );

  if (!note) {
    throw serviceError(
      'INTERNAL_NOTE_NOT_FOUND',
      'Internal note or task was not found.'
    );
  }

  return {
    status:
      normalizedStarred
        ? 'internal-item-starred'
        : 'internal-item-unstarred',

    note,
  };
}


async function setApplicantInternalTaskStatus({
  applicantId,
  noteId,
  taskStatus,
  actor,

  ApplicantModel =
    Applicant,

  NoteModel =
    ApplicantInternalNote,
} = {}) {
  const target =
    await requireApplicant({
      applicantId,
      ApplicantModel,
    });

  const noteObjectId =
    toObjectId(
      noteId,
      'noteId'
    );

  const normalizedActor =
    normalizeActor(
      actor
    );

  const normalizedStatus =
    normalizeTaskStatus(
      taskStatus
    );

  const completed =
    normalizedStatus ===
    'completed';

  const note =
    await resolveLean(
      NoteModel
        .findOneAndUpdate(
          {
            _id:
              noteObjectId,

            applicantId:
              target.applicantObjectId,

            kind:
              'task',

            archived: {
              $ne: true,
            },
          },

          {
            $set: {
              taskStatus:
                normalizedStatus,

              completedAt:
                completed
                  ? new Date()
                  : null,

              completedBy:
                completed
                  ? normalizedActor
                  : {},

              updatedBy:
                normalizedActor,
            },
          },

          {
            new: true,
            runValidators: true,
          }
        )
    );

  if (!note) {
    throw serviceError(
      'INTERNAL_TASK_NOT_FOUND',
      'Active internal task was not found.'
    );
  }

  return {
    status:
      completed
        ? 'internal-task-completed'
        : 'internal-task-reopened',

    note,
  };
}


async function updateApplicantInternalNoteSchedule({
  applicantId,
  noteId,
  schedule,
  actor,

  ApplicantModel =
    Applicant,

  NoteModel =
    ApplicantInternalNote,
} = {}) {
  const target =
    await requireApplicant({
      applicantId,
      ApplicantModel,
    });

  const noteObjectId =
    toObjectId(
      noteId,
      'noteId'
    );

  const normalizedActor =
    normalizeActor(
      actor
    );

  const normalizedSchedule =
    normalizeSchedule(
      schedule
    );

  const note =
    await resolveLean(
      NoteModel
        .findOneAndUpdate(
          {
            _id:
              noteObjectId,

            applicantId:
              target.applicantObjectId,

            archived: {
              $ne: true,
            },
          },

          {
            $set: {
              schedule:
                normalizedSchedule,

              /*
               * Scheduling changes do not write
               * to Google automatically.
               *
               * Preserve the event link and let
               * the recruiter explicitly choose
               * Update Calendar.
               */
              'calendar.syncStatus':
                'not_synced',

              'calendar.syncedAt':
                null,

              'calendar.syncError':
                '',

              updatedBy:
                normalizedActor,
            },
          },

          {
            new: true,
            runValidators: true,
          }
        )
    );

  if (!note) {
    throw serviceError(
      'INTERNAL_NOTE_NOT_FOUND',
      'Internal note or task was not found.'
    );
  }

  return {
    status:
      'internal-item-schedule-updated',

    note,
  };
}



async function requireInternalNote({
  applicantObjectId,
  noteId,

  includeArchived =
    false,

  NoteModel =
    ApplicantInternalNote,
}) {
  const noteObjectId =
    toObjectId(
      noteId,
      'noteId'
    );

  const filter = {
    _id:
      noteObjectId,

    applicantId:
      applicantObjectId,
  };

  if (!includeArchived) {
    filter.archived = {
      $ne: true,
    };
  }

  const note =
    await resolveLean(
      NoteModel.findOne(
        filter
      )
    );

  if (!note) {
    throw serviceError(
      'INTERNAL_NOTE_NOT_FOUND',
      'Internal note or task was not found.'
    );
  }

  return {
    noteObjectId,
    note,
  };
}


async function listApplicantInternalNoteReplies({
  applicantId,
  noteId,

  includeArchived =
    false,

  ApplicantModel =
    Applicant,

  NoteModel =
    ApplicantInternalNote,

  ReplyModel =
    ApplicantInternalNoteReply,
} = {}) {
  const target =
    await requireApplicant({
      applicantId,
      ApplicantModel,
      allowArchived:
        true,
    });

  const parent =
    await requireInternalNote({
      applicantObjectId:
        target.applicantObjectId,

      noteId,

      includeArchived,

      NoteModel,
    });

  const filter = {
    applicantId:
      target.applicantObjectId,

    noteId:
      parent.noteObjectId,
  };

  if (!includeArchived) {
    filter.archived = {
      $ne: true,
    };
  }

  let query =
    ReplyModel.find(
      filter
    );

  if (
    query &&
    typeof query.sort ===
      'function'
  ) {
    query =
      query.sort({
        createdAt: 1,
        _id: 1,
      });
  }

  const replies =
    await resolveLean(
      query
    );

  return {
    applicantId:
      String(
        target.applicantObjectId
      ),

    noteId:
      String(
        parent.noteObjectId
      ),

    replies:
      replies || [],
  };
}


async function createApplicantInternalNoteReply({
  applicantId,
  noteId,
  content,
  actor,

  ApplicantModel =
    Applicant,

  NoteModel =
    ApplicantInternalNote,

  ReplyModel =
    ApplicantInternalNoteReply,
} = {}) {
  const target =
    await requireApplicant({
      applicantId,
      ApplicantModel,
    });

  const parent =
    await requireInternalNote({
      applicantObjectId:
        target.applicantObjectId,

      noteId,

      NoteModel,
    });

  const normalizedActor =
    normalizeActor(
      actor
    );

  const normalizedContent =
    normalizeReplyContent(
      content
    );

  const created =
    await ReplyModel.create([
      {
        applicantId:
          target.applicantObjectId,

        noteId:
          parent.noteObjectId,

        content:
          normalizedContent,

        author:
          normalizedActor,
      },
    ]);

  return {
    status:
      'internal-note-reply-created',

    reply:
      plainDocument(
        created[0]
      ),
  };
}


async function updateApplicantInternalNoteReply({
  applicantId,
  noteId,
  replyId,
  content,
  actor,

  ApplicantModel =
    Applicant,

  NoteModel =
    ApplicantInternalNote,

  ReplyModel =
    ApplicantInternalNoteReply,
} = {}) {
  const target =
    await requireApplicant({
      applicantId,
      ApplicantModel,
    });

  const parent =
    await requireInternalNote({
      applicantObjectId:
        target.applicantObjectId,

      noteId,

      NoteModel,
    });

  const replyObjectId =
    toObjectId(
      replyId,
      'replyId'
    );

  const normalizedActor =
    normalizeActor(
      actor
    );

  const normalizedContent =
    normalizeReplyContent(
      content
    );

  const reply =
    await resolveLean(
      ReplyModel
        .findOneAndUpdate(
          {
            _id:
              replyObjectId,

            applicantId:
              target.applicantObjectId,

            noteId:
              parent.noteObjectId,

            archived: {
              $ne: true,
            },
          },

          {
            $set: {
              content:
                normalizedContent,

              updatedBy:
                normalizedActor,
            },
          },

          {
            new: true,
            runValidators: true,
          }
        )
    );

  if (!reply) {
    throw serviceError(
      'INTERNAL_NOTE_REPLY_NOT_FOUND',
      'Internal note reply was not found.'
    );
  }

  return {
    status:
      'internal-note-reply-updated',

    reply,
  };
}


async function archiveApplicantInternalNoteReply({
  applicantId,
  noteId,
  replyId,
  actor,

  ApplicantModel =
    Applicant,

  NoteModel =
    ApplicantInternalNote,

  ReplyModel =
    ApplicantInternalNoteReply,
} = {}) {
  const target =
    await requireApplicant({
      applicantId,
      ApplicantModel,
    });

  const parent =
    await requireInternalNote({
      applicantObjectId:
        target.applicantObjectId,

      noteId,

      NoteModel,
    });

  const replyObjectId =
    toObjectId(
      replyId,
      'replyId'
    );

  const normalizedActor =
    normalizeActor(
      actor
    );

  const archivedAt =
    new Date();

  const reply =
    await resolveLean(
      ReplyModel
        .findOneAndUpdate(
          {
            _id:
              replyObjectId,

            applicantId:
              target.applicantObjectId,

            noteId:
              parent.noteObjectId,

            archived: {
              $ne: true,
            },
          },

          {
            $set: {
              archived:
                true,

              archivedAt,

              archivedBy:
                normalizedActor,

              updatedBy:
                normalizedActor,
            },
          },

          {
            new: true,
            runValidators: true,
          }
        )
    );

  if (!reply) {
    throw serviceError(
      'INTERNAL_NOTE_REPLY_NOT_FOUND',
      'Internal note reply was not found.'
    );
  }

  return {
    status:
      'internal-note-reply-archived',

    reply,
  };
}


async function restoreApplicantInternalNoteReply({
  applicantId,
  noteId,
  replyId,
  actor,

  ApplicantModel =
    Applicant,

  NoteModel =
    ApplicantInternalNote,

  ReplyModel =
    ApplicantInternalNoteReply,
} = {}) {
  const target =
    await requireApplicant({
      applicantId,
      ApplicantModel,
    });

  const parent =
    await requireInternalNote({
      applicantObjectId:
        target.applicantObjectId,

      noteId,

      NoteModel,
    });

  const replyObjectId =
    toObjectId(
      replyId,
      'replyId'
    );

  const normalizedActor =
    normalizeActor(
      actor
    );

  const reply =
    await resolveLean(
      ReplyModel
        .findOneAndUpdate(
          {
            _id:
              replyObjectId,

            applicantId:
              target.applicantObjectId,

            noteId:
              parent.noteObjectId,

            archived:
              true,
          },

          {
            $set: {
              archived:
                false,

              archivedAt:
                null,

              archivedBy: {},

              updatedBy:
                normalizedActor,
            },
          },

          {
            new: true,
            runValidators: true,
          }
        )
    );

  if (!reply) {
    throw serviceError(
      'INTERNAL_NOTE_REPLY_NOT_FOUND',
      'Archived internal note reply was not found.'
    );
  }

  return {
    status:
      'internal-note-reply-restored',

    reply,
  };
}


async function permanentlyDeleteApplicantInternalNoteReply({
  applicantId,
  noteId,
  replyId,
  confirmation,

  ApplicantModel =
    Applicant,

  NoteModel =
    ApplicantInternalNote,

  ReplyModel =
    ApplicantInternalNoteReply,
} = {}) {
  if (
    cleanText(
      confirmation
    ) !==
    'DELETE'
  ) {
    throw serviceError(
      'INTERNAL_NOTE_DELETE_CONFIRMATION_REQUIRED',
      'Permanent deletion requires DELETE confirmation.'
    );
  }

  const target =
    await requireApplicant({
      applicantId,
      ApplicantModel,
    });

  const parent =
    await requireInternalNote({
      applicantObjectId:
        target.applicantObjectId,

      noteId,

      includeArchived:
        true,

      NoteModel,
    });

  const replyObjectId =
    toObjectId(
      replyId,
      'replyId'
    );

  const result =
    await ReplyModel.deleteOne({
      _id:
        replyObjectId,

      applicantId:
        target.applicantObjectId,

      noteId:
        parent.noteObjectId,

      archived:
        true,
    });

  if (
    result?.deletedCount !==
    1
  ) {
    throw serviceError(
      'INTERNAL_NOTE_REPLY_DELETE_NOT_ALLOWED',
      'Reply must be archived before permanent deletion.'
    );
  }

  return {
    status:
      'internal-note-reply-permanently-deleted',

    replyId:
      String(
        replyObjectId
      ),
  };
}


async function permanentlyDeleteApplicantInternalNote({
  applicantId,
  noteId,
  confirmation,

  ApplicantModel =
    Applicant,

  NoteModel =
    ApplicantInternalNote,

  ReplyModel =
    ApplicantInternalNoteReply,
} = {}) {
  if (
    cleanText(
      confirmation
    ) !==
    'DELETE'
  ) {
    throw serviceError(
      'INTERNAL_NOTE_DELETE_CONFIRMATION_REQUIRED',
      'Permanent deletion requires DELETE confirmation.'
    );
  }

  const target =
    await requireApplicant({
      applicantId,
      ApplicantModel,
    });

  const parent =
    await requireInternalNote({
      applicantObjectId:
        target.applicantObjectId,

      noteId,

      includeArchived:
        true,

      NoteModel,
    });

  if (
    parent.note
      ?.archived !== true
  ) {
    throw serviceError(
      'INTERNAL_NOTE_DELETE_NOT_ALLOWED',
      'Internal note or task must be archived before permanent deletion.'
    );
  }

  /*
   * Never silently orphan a provider-backed
   * Calendar event.
   *
   * Calendar removal must be an explicit action
   * before permanent deletion.
   */
  if (
    cleanText(
      parent.note
        ?.calendar
        ?.eventId
    )
  ) {
    throw serviceError(
      'INTERNAL_NOTE_DELETE_CALENDAR_LINKED',
      'Remove this note or task from Google Calendar before permanent deletion.'
    );
  }

  /*
   * Remove dependent replies first so a successful
   * parent deletion cannot knowingly leave orphans.
   *
   * This operation is service-controlled and only
   * reachable after explicit DELETE confirmation.
   */
  const replyResult =
    await ReplyModel.deleteMany({
      applicantId:
        target.applicantObjectId,

      noteId:
        parent.noteObjectId,
    });

  const result =
    await NoteModel.deleteOne({
      _id:
        parent.noteObjectId,

      applicantId:
        target.applicantObjectId,

      archived:
        true,
    });

  if (
    result?.deletedCount !==
    1
  ) {
    throw serviceError(
      'INTERNAL_NOTE_DELETE_CONFLICT',
      'Internal note or task changed before permanent deletion could complete.'
    );
  }

  return {
    status:
      'internal-note-permanently-deleted',

    noteId:
      String(
        parent.noteObjectId
      ),

    kind:
      parent.note?.kind ===
        'task'
        ? 'task'
        : 'note',

    repliesDeleted:
      Number(
        replyResult
          ?.deletedCount ||
        0
      ),
  };
}


async function replaceApplicantTags({
  applicantId,
  tags,

  ApplicantModel =
    Applicant,
} = {}) {
  const target =
    await requireApplicant({
      applicantId,
      ApplicantModel,
    });

  const normalizedTags =
    normalizeTags(
      tags
    );

  const previousTags =
    normalizeTags(
      target.applicant
        ?.recruitment
        ?.tags ||
      []
    );

  const changedAt =
    new Date();

  const result =
    await ApplicantModel.updateOne(
      {
        _id:
          target.applicantObjectId,

        'lifecycle.archived': {
          $ne: true,
        },
      },

      {
        $set: {
          'recruitment.tags':
            normalizedTags,

          'recruitment.lastActivityAt':
            changedAt,
        },
      },

      {
        runValidators:
          true,
      }
    );

  if (
    result.matchedCount !==
    1
  ) {
    throw serviceError(
      'APPLICANT_NOT_FOUND',
      'Applicant was not found or is archived.'
    );
  }

  return {
    status:
      'tags-updated',

    applicantId:
      String(
        target.applicantObjectId
      ),

    previousTags,
    tags:
      normalizedTags,

    changedAt,
  };
}


module.exports = {
  MAX_NOTE_LENGTH,
  MAX_TAGS,
  MAX_TAG_LENGTH,
  MAX_REMINDER_NOTE_LENGTH,
  MAX_REPLY_LENGTH,

  INTERNAL_ITEM_KINDS,
  INTERNAL_TASK_STATUSES,

  DEFAULT_APPLICANT_TAG_TAXONOMY,

  normalizeActor,
  normalizeNoteContent,
  normalizeReplyContent,
  normalizeInternalItemKind,
  normalizeTaskStatus,
  normalizeOptionalDate,
  normalizeSchedule,
  normalizeTag,
  normalizeTags,

  listApplicantInternalNotes,
  createApplicantInternalNote,
  updateApplicantInternalNote,

  /*
   * Legacy soft-delete service.
   * Route semantics will be migrated in Pass 1B.
   */
  deleteApplicantInternalNote,

  archiveApplicantInternalNote,
  restoreApplicantInternalNote,
  setApplicantInternalNoteImportance,
  setApplicantInternalNoteLike,
  setApplicantInternalNoteStar,
  setApplicantInternalTaskStatus,
  updateApplicantInternalNoteSchedule,

  listApplicantInternalNoteReplies,
  createApplicantInternalNoteReply,
  updateApplicantInternalNoteReply,
  archiveApplicantInternalNoteReply,
  restoreApplicantInternalNoteReply,
  permanentlyDeleteApplicantInternalNoteReply,

  permanentlyDeleteApplicantInternalNote,

  replaceApplicantTags,
};
