'use strict';

const crypto =
  require('crypto');

const {
  getGoogleCalendarConfig,
  createCalendarClient,
  assertCalendarWriteEnabled,
} =
  require('./googleCalendarService');


function cleanText(value) {
  return String(
    value ?? ''
  ).trim();
}


function normalizeEmail(value) {
  return cleanText(
    value
  ).toLowerCase();
}


function uniqueEmails(values) {
  return [
    ...new Set(
      (
        Array.isArray(values)
          ? values
          : []
      )
        .map(
          normalizeEmail
        )
        .filter(Boolean)
    ),
  ];
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
      'GOOGLE_MEET_TIME_INVALID',

      `${fieldName} must be a valid date/time.`
    );
  }

  return date;
}


function interviewTypeLabel(
  type
) {
  const value =
    cleanText(
      type
    )
      .replace(
        /_/g,
        ' '
      );

  if (!value) {
    return 'Interview';
  }

  return value
    .replace(
      /\b\w/g,
      (
        character
      ) =>
        character
          .toUpperCase()
    );
}


function buildAttendees({
  applicantEmail = '',
  participants = [],
  organizerEmail = '',
}) {
  const organizer =
    normalizeEmail(
      organizerEmail
    );

  const participantEmails =
    (
      Array.isArray(
        participants
      )
        ? participants
        : []
    )
      .map(
        (
          participant
        ) =>
          participant
            ?.email
      );

  return uniqueEmails([
    applicantEmail,
    ...participantEmails,
  ])
    .filter(
      (
        email
      ) =>
        email !==
        organizer
    )
    .map(
      (
        email
      ) => ({
        email,
      })
    );
}


function buildGoogleCalendarEvent({
  interviewId,
  interviewType,
  applicantName = '',
  applicantEmail = '',
  scheduledStart,
  scheduledEnd,
  timezone = 'UTC',
  participants = [],
  organizerEmail = '',
  location = '',
  includeConference = false,
  conferenceRequestId = '',
}) {
  const start =
    validDate(
      scheduledStart,
      'scheduledStart'
    );

  const end =
    validDate(
      scheduledEnd,
      'scheduledEnd'
    );

  if (
    end <= start
  ) {
    throw providerError(
      'GOOGLE_MEET_TIME_INVALID',

      'Interview end time must be after the start time.'
    );
  }

  const applicant =
    cleanText(
      applicantName
    );

  const typeLabel =
    interviewTypeLabel(
      interviewType
    );

  const event = {
    summary:
      applicant
        ? `OMAH ${typeLabel} — ${applicant}`
        : `OMAH ${typeLabel}`,

    description:
      'Interview scheduled through OMAH.',

    start: {
      dateTime:
        start
          .toISOString(),

      timeZone:
        cleanText(
          timezone
        ) || 'UTC',
    },

    end: {
      dateTime:
        end
          .toISOString(),

      timeZone:
        cleanText(
          timezone
        ) || 'UTC',
    },

    attendees:
      buildAttendees({
        applicantEmail,
        participants,
        organizerEmail,
      }),
  };


  const normalizedLocation =
    cleanText(
      location
    );

  if (
    normalizedLocation
  ) {
    event.location =
      normalizedLocation;
  }


  if (
    includeConference
  ) {
    const requestId =
      cleanText(
        conferenceRequestId
      ) ||
      [
        'omah',
        cleanText(
          interviewId
        ) || 'interview',
        crypto
          .randomUUID(),
      ]
        .join('-');

    event.conferenceData = {
      createRequest: {
        requestId,

        conferenceSolutionKey: {
          type:
            'hangoutsMeet',
        },
      },
    };
  }


  return event;
}


function extractGoogleMeetJoinUrl(
  eventData = {}
) {
  const direct =
    cleanText(
      eventData
        .hangoutLink
    );

  if (direct) {
    return direct;
  }

  const entryPoints =
    eventData
      .conferenceData
      ?.entryPoints;

  if (
    !Array.isArray(
      entryPoints
    )
  ) {
    return '';
  }

  const video =
    entryPoints.find(
      (
        entryPoint
      ) =>
        entryPoint
          ?.entryPointType ===
          'video'
    );

  return cleanText(
    video?.uri
  );
}


function normalizeGoogleMeetResult(
  eventData = {}
) {
  const joinUrl =
    extractGoogleMeetJoinUrl(
      eventData
    );

  const conferenceStatus =
    cleanText(
      eventData
        .conferenceData
        ?.createRequest
        ?.status
        ?.statusCode
    );

  const eventId =
    cleanText(
      eventData.id
    );

  return {
    provider:
      'google_meet',

    status:
      joinUrl
        ? 'created'
        : conferenceStatus ===
            'failure'
          ? 'error'
          : 'pending',

    providerMeetingId:
      cleanText(
        eventData
          .conferenceData
          ?.conferenceId
      ),

    providerEventId:
      eventId,

    joinUrl,

    eventUrl:
      cleanText(
        eventData
          .htmlLink
      ),

    conferenceStatus,

    syncError:
      conferenceStatus ===
        'failure'
        ? 'Google Meet conference creation failed.'
        : '',
  };
}


async function createGoogleMeetInterview({
  interviewId,
  interviewType,
  applicantName = '',
  applicantEmail = '',
  scheduledStart,
  scheduledEnd,
  timezone = 'UTC',
  participants = [],
  organizerEmail = '',
  location = '',

  conferenceRequestId = '',

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
    buildGoogleCalendarEvent({
      interviewId,
      interviewType,
      applicantName,
      applicantEmail,
      scheduledStart,
      scheduledEnd,
      timezone,
      participants,
      organizerEmail,
      location,

      includeConference:
        true,

      conferenceRequestId,
    });


  const response =
    await calendar
      .events
      .insert({
        calendarId:
          config.calendarId,

        conferenceDataVersion:
          1,

        sendUpdates:
          config.sendUpdates,

        requestBody,
      });


  return normalizeGoogleMeetResult(
    response.data || {}
  );
}


async function updateGoogleMeetInterview({
  providerEventId,

  interviewId,
  interviewType,
  applicantName = '',
  applicantEmail = '',
  scheduledStart,
  scheduledEnd,
  timezone = 'UTC',
  participants = [],
  organizerEmail = '',
  location = '',

  env = process.env,

  calendarClient = null,
}) {
  assertCalendarWriteEnabled(
    env
  );

  const eventId =
    cleanText(
      providerEventId
    );

  if (!eventId) {
    throw providerError(
      'GOOGLE_MEET_EVENT_ID_REQUIRED',

      'Google Calendar event ID is required.'
    );
  }


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
    buildGoogleCalendarEvent({
      interviewId,
      interviewType,
      applicantName,
      applicantEmail,
      scheduledStart,
      scheduledEnd,
      timezone,
      participants,
      organizerEmail,
      location,

      /*
       * Preserve the existing Meet
       * conference during reschedule.
       *
       * Do not generate a second meeting.
       */
      includeConference:
        false,
    });


  const response =
    await calendar
      .events
      .patch({
        calendarId:
          config.calendarId,

        eventId,

        conferenceDataVersion:
          1,

        sendUpdates:
          config.sendUpdates,

        requestBody,
      });


  return normalizeGoogleMeetResult(
    response.data || {}
  );
}


async function cancelGoogleMeetInterview({
  providerEventId,

  env = process.env,

  calendarClient = null,
}) {
  assertCalendarWriteEnabled(
    env
  );

  const eventId =
    cleanText(
      providerEventId
    );

  if (!eventId) {
    throw providerError(
      'GOOGLE_MEET_EVENT_ID_REQUIRED',

      'Google Calendar event ID is required.'
    );
  }


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
      'google_meet',

    status:
      'cancelled',

    providerMeetingId:
      '',

    providerEventId:
      eventId,

    joinUrl:
      '',

    eventUrl:
      '',

    conferenceStatus:
      'cancelled',

    syncError:
      '',
  };
}


module.exports = {
  buildAttendees,
  buildGoogleCalendarEvent,
  extractGoogleMeetJoinUrl,
  normalizeGoogleMeetResult,

  createGoogleMeetInterview,
  updateGoogleMeetInterview,
  cancelGoogleMeetInterview,
};
