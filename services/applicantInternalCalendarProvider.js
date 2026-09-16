'use strict';

const {
  getGoogleCalendarConfig,
  createCalendarClient,
  assertCalendarWriteEnabled,
} = require(
  './googleCalendarService'
);


const MAX_SUMMARY_LENGTH =
  120;

const GOOGLE_MAX_REMINDER_MINUTES =
  40320;


function cleanText(value) {
  return String(
    value ?? ''
  ).trim();
}


function providerError(
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


function validDate(
  value,
  fieldName
) {
  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    throw providerError(
      'APPLICANT_INTERNAL_CALENDAR_TIME_INVALID',

      `${fieldName} must be a valid date/time.`
    );
  }

  return date;
}


function itemTypeLabel(
  kind
) {
  return cleanText(
    kind
  ) === 'task'
    ? 'Task'
    : 'Note';
}


function compactText(
  value,
  maxLength =
    MAX_SUMMARY_LENGTH
) {
  const normalized =
    cleanText(
      value
    )
      .replace(
        /\s+/g,
        ' '
      );

  if (
    normalized.length <=
    maxLength
  ) {
    return normalized;
  }

  return (
    normalized.slice(
      0,
      Math.max(
        1,
        maxLength - 1
      )
    ) +
    '…'
  );
}


function calendarSummary({
  kind = 'note',
  content = '',
  applicantName = '',
}) {
  const type =
    itemTypeLabel(
      kind
    );

  const body =
    compactText(
      content,
      72
    );

  const applicant =
    compactText(
      applicantName,
      36
    );

  const suffix =
    body ||
    applicant ||
    'Applicant follow-up';

  return compactText(
    `OMAH ${type} — ${suffix}`
  );
}


function buildDescription({
  kind = 'note',
  content = '',
  applicantName = '',
  reminderNote = '',
}) {
  const lines = [
    `Internal OMAH ${itemTypeLabel(kind).toLowerCase()}.`,
  ];

  const applicant =
    cleanText(
      applicantName
    );

  if (applicant) {
    lines.push(
      `Applicant: ${applicant}`
    );
  }

  const body =
    cleanText(
      content
    );

  if (body) {
    lines.push(
      '',
      body
    );
  }

  const reminder =
    cleanText(
      reminderNote
    );

  if (reminder) {
    lines.push(
      '',
      `Reminder note: ${reminder}`
    );
  }

  lines.push(
    '',
    'Created from OMAH Applicant Management.'
  );

  return lines.join(
    '\n'
  );
}


function reminderConfiguration({
  startAt,
  reminderAt,
}) {
  if (
    !reminderAt
  ) {
    return undefined;
  }

  const start =
    validDate(
      startAt,
      'startAt'
    );

  const reminder =
    validDate(
      reminderAt,
      'reminderAt'
    );

  const milliseconds =
    start.getTime() -
    reminder.getTime();

  if (
    milliseconds <= 0
  ) {
    /*
     * Internal reminders may exist at or after
     * the event start. Google reminder offsets,
     * however, are defined as minutes before
     * the event.
     *
     * Keep the internal reminder but omit the
     * Google reminder override in that case.
     */
    return undefined;
  }

  const minutes =
    Math.round(
      milliseconds /
      60000
    );

  if (
    minutes < 1 ||
    minutes >
      GOOGLE_MAX_REMINDER_MINUTES
  ) {
    return undefined;
  }

  return {
    useDefault: false,

    overrides: [
      {
        method:
          'popup',

        minutes,
      },
    ],
  };
}


function buildApplicantInternalCalendarEvent({
  applicantId = '',
  applicantName = '',

  noteId = '',
  kind = 'note',
  content = '',

  startAt,
  endAt,

  reminderAt = null,
  reminderNote = '',

  timezone = 'UTC',
}) {
  const start =
    validDate(
      startAt,
      'startAt'
    );

  const end =
    validDate(
      endAt,
      'endAt'
    );

  if (
    end <= start
  ) {
    throw providerError(
      'APPLICANT_INTERNAL_CALENDAR_RANGE_INVALID',

      'Calendar event end time must be after the start time.'
    );
  }

  const event = {
    summary:
      calendarSummary({
        kind,
        content,
        applicantName,
      }),

    description:
      buildDescription({
        kind,
        content,
        applicantName,
        reminderNote,
      }),

    start: {
      dateTime:
        start.toISOString(),

      timeZone:
        cleanText(
          timezone
        ) ||
        'UTC',
    },

    end: {
      dateTime:
        end.toISOString(),

      timeZone:
        cleanText(
          timezone
        ) ||
        'UTC',
    },

    extendedProperties: {
      private: {
        omahSource:
          'applicant_internal_item',

        applicantId:
          cleanText(
            applicantId
          ),

        noteId:
          cleanText(
            noteId
          ),

        kind:
          cleanText(
            kind
          ) === 'task'
            ? 'task'
            : 'note',
      },
    },
  };

  const reminders =
    reminderConfiguration({
      startAt:
        start.toISOString(),

      reminderAt,
    });

  if (reminders) {
    event.reminders =
      reminders;
  }

  /*
   * Deliberately no attendees and no
   * conferenceData.
   *
   * Internal Notes/Tasks must not invite
   * the Applicant or create Google Meet.
   */

  return event;
}


function normalizeCalendarResult(
  eventData = {}
) {
  const eventId =
    cleanText(
      eventData.id
    );

  if (!eventId) {
    throw providerError(
      'APPLICANT_INTERNAL_CALENDAR_RESPONSE_INVALID',

      'Google Calendar did not return an event ID.'
    );
  }

  return {
    provider:
      'google_calendar',

    eventId,

    eventUrl:
      cleanText(
        eventData.htmlLink
      ),

    syncStatus:
      'synced',

    syncedAt:
      new Date(),

    syncError:
      '',
  };
}


function requireEventId(
  value
) {
  const eventId =
    cleanText(
      value
    );

  if (!eventId) {
    throw providerError(
      'APPLICANT_INTERNAL_CALENDAR_EVENT_ID_REQUIRED',

      'Google Calendar event ID is required.'
    );
  }

  return eventId;
}


async function createApplicantInternalCalendarEvent({
  applicantId = '',
  applicantName = '',

  noteId = '',
  kind = 'note',
  content = '',

  startAt,
  endAt,

  reminderAt = null,
  reminderNote = '',

  timezone = 'UTC',

  env = process.env,

  calendarClient = null,
}) {
  assertCalendarWriteEnabled(
    env
  );

  const config =
    getGoogleCalendarConfig(
      env
    );

  const calendar =
    calendarClient ||
    createCalendarClient(
      env
    );

  const requestBody =
    buildApplicantInternalCalendarEvent({
      applicantId,
      applicantName,

      noteId,
      kind,
      content,

      startAt,
      endAt,

      reminderAt,
      reminderNote,

      timezone,
    });

  const response =
    await calendar
      .events
      .insert({
        calendarId:
          config.calendarId,

        sendUpdates:
          config.sendUpdates,

        requestBody,
      });

  return normalizeCalendarResult(
    response.data ||
    {}
  );
}


async function updateApplicantInternalCalendarEvent({
  providerEventId,

  applicantId = '',
  applicantName = '',

  noteId = '',
  kind = 'note',
  content = '',

  startAt,
  endAt,

  reminderAt = null,
  reminderNote = '',

  timezone = 'UTC',

  env = process.env,

  calendarClient = null,
}) {
  assertCalendarWriteEnabled(
    env
  );

  const eventId =
    requireEventId(
      providerEventId
    );

  const config =
    getGoogleCalendarConfig(
      env
    );

  const calendar =
    calendarClient ||
    createCalendarClient(
      env
    );

  const requestBody =
    buildApplicantInternalCalendarEvent({
      applicantId,
      applicantName,

      noteId,
      kind,
      content,

      startAt,
      endAt,

      reminderAt,
      reminderNote,

      timezone,
    });

  const response =
    await calendar
      .events
      .patch({
        calendarId:
          config.calendarId,

        eventId,

        sendUpdates:
          config.sendUpdates,

        requestBody,
      });

  return normalizeCalendarResult(
    response.data ||
    {}
  );
}


async function deleteApplicantInternalCalendarEvent({
  providerEventId,

  env = process.env,

  calendarClient = null,
}) {
  assertCalendarWriteEnabled(
    env
  );

  const eventId =
    requireEventId(
      providerEventId
    );

  const config =
    getGoogleCalendarConfig(
      env
    );

  const calendar =
    calendarClient ||
    createCalendarClient(
      env
    );

  await calendar
    .events
    .delete({
      calendarId:
        config.calendarId,

      eventId,

      sendUpdates:
        config.sendUpdates,
    });

  return {
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
}


module.exports = {
  MAX_SUMMARY_LENGTH,
  GOOGLE_MAX_REMINDER_MINUTES,

  compactText,
  calendarSummary,
  buildDescription,
  reminderConfiguration,

  buildApplicantInternalCalendarEvent,
  normalizeCalendarResult,

  createApplicantInternalCalendarEvent,
  updateApplicantInternalCalendarEvent,
  deleteApplicantInternalCalendarEvent,
};
