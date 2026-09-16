'use strict';

const Applicant =
  require('../models/Applicant');

const ApplicantInternalNote =
  require(
    '../models/ApplicantInternalNote'
  );

const {
  toObjectId,
} = require(
  './applicantSubmissionService'
);

const {
  createApplicantInternalCalendarEvent,
  updateApplicantInternalCalendarEvent,
  deleteApplicantInternalCalendarEvent,
} = require(
  './applicantInternalCalendarProvider'
);


const MAX_SYNC_ERROR_LENGTH =
  500;


function cleanText(value) {
  return String(
    value ?? ''
  ).trim();
}


function serviceError(
  code,
  message
) {
  const error =
    new Error(
      message
    );

  error.code =
    code;

  return error;
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
  const userId =
    cleanText(
      actor?.userId
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
        actor?.name
      ),

    email:
      cleanText(
        actor?.email
      ).toLowerCase(),

    role:
      cleanText(
        actor?.role
      ),
  };
}


function boundedSyncError(
  error
) {
  const message =
    cleanText(
      error?.message ||
      error
    ) ||
    'Google Calendar synchronization failed.';

  return message.slice(
    0,
    MAX_SYNC_ERROR_LENGTH
  );
}


function applicantDisplayName(
  applicant
) {
  return (
    cleanText(
      applicant?.identity
        ?.fullName
    ) ||
    cleanText(
      applicant?.fullName
    ) ||
    'Applicant'
  );
}


function requireScheduleRange(
  note
) {
  const start =
    note?.schedule
      ?.startAt;

  const end =
    note?.schedule
      ?.endAt;

  if (
    !start ||
    !end
  ) {
    throw serviceError(
      'INTERNAL_CALENDAR_SCHEDULE_REQUIRED',
      'Start and End/Due date-time are required before adding this note or task to Google Calendar.'
    );
  }

  const startDate =
    new Date(
      start
    );

  const endDate =
    new Date(
      end
    );

  if (
    Number.isNaN(
      startDate.getTime()
    ) ||
    Number.isNaN(
      endDate.getTime()
    ) ||
    endDate <=
      startDate
  ) {
    throw serviceError(
      'INTERNAL_CALENDAR_SCHEDULE_INVALID',
      'A valid Start and End/Due range is required before Calendar synchronization.'
    );
  }

  return {
    startAt:
      startDate,

    endAt:
      endDate,
  };
}


async function requireSyncTarget({
  applicantId,
  noteId,

  allowArchivedApplicant =
    false,

  allowArchivedNote =
    false,

  ApplicantModel =
    Applicant,

  NoteModel =
    ApplicantInternalNote,
}) {
  const applicantObjectId =
    toObjectId(
      applicantId,
      'applicantId'
    );

  const noteObjectId =
    toObjectId(
      noteId,
      'noteId'
    );

  const applicant =
    await resolveLean(
      ApplicantModel.findById(
        applicantObjectId
      )
    );

  if (
    !applicant ||
    (
      !allowArchivedApplicant &&
      applicant.lifecycle
        ?.archived === true
    )
  ) {
    throw serviceError(
      'APPLICANT_NOT_FOUND',
      'Applicant was not found or is archived.'
    );
  }

  const noteFilter = {
    _id:
      noteObjectId,

    applicantId:
      applicantObjectId,
  };

  if (
    !allowArchivedNote
  ) {
    noteFilter.archived = {
      $ne: true,
    };
  }

  const note =
    await resolveLean(
      NoteModel.findOne(
        noteFilter
      )
    );

  if (!note) {
    throw serviceError(
      'INTERNAL_NOTE_NOT_FOUND',
      allowArchivedNote
        ? 'Internal note or task was not found.'
        : 'Active internal note or task was not found.'
    );
  }

  return {
    applicantObjectId,
    noteObjectId,
    applicant,
    note,
  };
}

function providerPayload({
  target,
  timezone,
}) {
  const range =
    requireScheduleRange(
      target.note
    );

  return {
    applicantId:
      String(
        target
          .applicantObjectId
      ),

    applicantName:
      applicantDisplayName(
        target.applicant
      ),

    noteId:
      String(
        target
          .noteObjectId
      ),

    kind:
      target.note.kind ===
        'task'
        ? 'task'
        : 'note',

    content:
      cleanText(
        target.note.content
      ),

    startAt:
      range.startAt,

    endAt:
      range.endAt,

    reminderAt:
      target.note.schedule
        ?.reminderAt ||
      null,

    reminderNote:
      cleanText(
        target.note.schedule
          ?.reminderNote
      ),

    timezone:
      cleanText(
        timezone
      ) ||
      'UTC',
  };
}


async function persistCalendarState({
  target,
  calendar,
  actor,

  NoteModel =
    ApplicantInternalNote,
}) {
  const note =
    await resolveLean(
      NoteModel
        .findOneAndUpdate(
          {
            _id:
              target.noteObjectId,

            applicantId:
              target.applicantObjectId,

            archived: {
              $ne: true,
            },
          },

          {
            $set: {
              calendar,

              updatedBy:
                actor,
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
      'INTERNAL_CALENDAR_PERSIST_CONFLICT',
      'Internal note or task changed before Calendar state could be saved.'
    );
  }

  return note;
}


async function persistCalendarError({
  target,
  error,
  actor,

  NoteModel =
    ApplicantInternalNote,
}) {
  try {
    return await resolveLean(
      NoteModel
        .findOneAndUpdate(
          {
            _id:
              target.noteObjectId,

            applicantId:
              target.applicantObjectId,

            archived: {
              $ne: true,
            },
          },

          {
            $set: {
              'calendar.syncStatus':
                'error',

              'calendar.syncError':
                boundedSyncError(
                  error
                ),

              'calendar.syncedAt':
                null,

              updatedBy:
                actor,
            },
          },

          {
            new: true,
            runValidators: true,
          }
        )
    );
  } catch {
    /*
     * The original provider error is more
     * important than a secondary attempt to
     * persist diagnostic state.
     */
    return null;
  }
}


async function addApplicantInternalItemToCalendar({
  applicantId,
  noteId,
  actor,

  timezone =
    'UTC',

  ApplicantModel =
    Applicant,

  NoteModel =
    ApplicantInternalNote,

  createCalendarEvent =
    createApplicantInternalCalendarEvent,

  deleteCalendarEvent =
    deleteApplicantInternalCalendarEvent,
} = {}) {
  const normalizedActor =
    normalizeActor(
      actor
    );

  const target =
    await requireSyncTarget({
      applicantId,
      noteId,
      ApplicantModel,
      NoteModel,
    });

  const existingEventId =
    cleanText(
      target.note.calendar
        ?.eventId
    );

  if (existingEventId) {
    throw serviceError(
      'INTERNAL_CALENDAR_ALREADY_LINKED',
      'This note or task is already linked to a Google Calendar event.'
    );
  }

  const payload =
    providerPayload({
      target,
      timezone,
    });

  let providerResult;

  try {
    providerResult =
      await createCalendarEvent(
        payload
      );
  } catch (error) {
    await persistCalendarError({
      target,
      error,
      actor:
        normalizedActor,
      NoteModel,
    });

    throw error;
  }

  const calendar = {
    provider:
      'google_calendar',

    eventId:
      cleanText(
        providerResult
          ?.eventId
      ),

    eventUrl:
      cleanText(
        providerResult
          ?.eventUrl
      ),

    syncStatus:
      'synced',

    syncedAt:
      providerResult
        ?.syncedAt ||
      new Date(),

    syncError:
      '',
  };

  if (!calendar.eventId) {
    const error =
      serviceError(
        'INTERNAL_CALENDAR_PROVIDER_RESPONSE_INVALID',
        'Google Calendar did not return an event ID.'
      );

    await persistCalendarError({
      target,
      error,
      actor:
        normalizedActor,
      NoteModel,
    });

    throw error;
  }

  try {
    const note =
      await persistCalendarState({
        target,
        calendar,
        actor:
          normalizedActor,
        NoteModel,
      });

    return {
      status:
        'internal-calendar-added',

      note,
    };
  } catch (
    persistError
  ) {
    /*
     * Calendar creation succeeded but local
     * persistence failed.
     *
     * Attempt compensation so we do not
     * knowingly leave an orphaned external
     * event.
     */
    try {
      await deleteCalendarEvent({
        providerEventId:
          calendar.eventId,
      });
    } catch (
      rollbackError
    ) {
      const error =
        serviceError(
          'INTERNAL_CALENDAR_CREATE_ROLLBACK_FAILED',
          'Google Calendar event was created, local persistence failed, and automatic Calendar rollback also failed.'
        );

      error.cause =
        rollbackError;

      throw error;
    }

    throw persistError;
  }
}


async function updateApplicantInternalItemCalendar({
  applicantId,
  noteId,
  actor,

  timezone =
    'UTC',

  ApplicantModel =
    Applicant,

  NoteModel =
    ApplicantInternalNote,

  updateCalendarEvent =
    updateApplicantInternalCalendarEvent,
} = {}) {
  const normalizedActor =
    normalizeActor(
      actor
    );

  const target =
    await requireSyncTarget({
      applicantId,
      noteId,
      ApplicantModel,
      NoteModel,
    });

  const eventId =
    cleanText(
      target.note.calendar
        ?.eventId
    );

  if (!eventId) {
    throw serviceError(
      'INTERNAL_CALENDAR_NOT_LINKED',
      'This note or task is not linked to Google Calendar.'
    );
  }

  const payload = {
    ...providerPayload({
      target,
      timezone,
    }),

    providerEventId:
      eventId,
  };

  let providerResult;

  try {
    providerResult =
      await updateCalendarEvent(
        payload
      );
  } catch (error) {
    await persistCalendarError({
      target,
      error,
      actor:
        normalizedActor,
      NoteModel,
    });

    throw error;
  }

  const calendar = {
    provider:
      'google_calendar',

    eventId,

    eventUrl:
      cleanText(
        providerResult
          ?.eventUrl ||
        target.note.calendar
          ?.eventUrl
      ),

    syncStatus:
      'synced',

    syncedAt:
      providerResult
        ?.syncedAt ||
      new Date(),

    syncError:
      '',
  };

  const note =
    await persistCalendarState({
      target,
      calendar,
      actor:
        normalizedActor,
      NoteModel,
    });

  return {
    status:
      'internal-calendar-updated',

    note,
  };
}


async function removeApplicantInternalItemFromCalendar({
  applicantId,
  noteId,
  actor,

  ApplicantModel =
    Applicant,

  NoteModel =
    ApplicantInternalNote,

  deleteCalendarEvent =
    deleteApplicantInternalCalendarEvent,
} = {}) {
  const normalizedActor =
    normalizeActor(
      actor
    );

  const target =
    await requireSyncTarget({
      applicantId,
      noteId,

      /*
       * Removal is intentionally allowed for
       * archived Applicants and archived items.
       *
       * This lets administrators clean up the
       * external Calendar link before permanent
       * deletion without restoring records first.
       */
      allowArchivedApplicant:
        true,

      allowArchivedNote:
        true,

      ApplicantModel,
      NoteModel,
    });

  const eventId =
    cleanText(
      target.note.calendar
        ?.eventId
    );

  if (!eventId) {
    throw serviceError(
      'INTERNAL_CALENDAR_NOT_LINKED',
      'This note or task is not linked to Google Calendar.'
    );
  }

  try {
    await deleteCalendarEvent({
      providerEventId:
        eventId,
    });
  } catch (error) {
    await persistCalendarError({
      target,
      error,
      actor:
        normalizedActor,
      NoteModel,
    });

    throw error;
  }

  const calendar = {
    provider:
      '',

    eventId:
      '',

    eventUrl:
      '',

    syncStatus:
      'not_synced',

    syncedAt:
      null,

    syncError:
      '',
  };

  const note =
    await persistCalendarState({
      target,
      calendar,
      actor:
        normalizedActor,
      NoteModel,
    });

  return {
    status:
      'internal-calendar-removed',

    note,
  };
}


module.exports = {
  MAX_SYNC_ERROR_LENGTH,

  boundedSyncError,
  applicantDisplayName,
  requireScheduleRange,

  addApplicantInternalItemToCalendar,
  updateApplicantInternalItemCalendar,
  removeApplicantInternalItemFromCalendar,
};
