'use strict';

const Applicant =
  require('../models/Applicant');

const ApplicantInterview =
  require(
    '../models/ApplicantInterview'
  );

const {
  toObjectId,
} = require(
  './applicantSubmissionService'
);

const {
  normalizeActor,
  normalizeParticipants,
} = require(
  './applicantInterviewService'
);

const {
  validateInterviewSchedule,
} = require(
  '../utils/applicantInterview'
);

const {
  checkFreeBusy,
} = require(
  './googleCalendarService'
);


function serviceError(
  code,
  message
) {
  const error =
    new Error(message);

  error.code = code;

  return error;
}


function cleanText(value) {
  return String(
    value ?? ''
  ).trim();
}


function unique(values) {
  return [
    ...new Set(
      values
        .map(cleanText)
        .filter(Boolean)
    ),
  ];
}


function buildIdentitySets({
  organizer,
  participants,
}) {
  const userIds =
    unique([
      organizer.userId,

      ...participants.map(
        (participant) =>
          participant.userId
      ),
    ]);

  const emails =
    unique([
      organizer.email,

      ...participants.map(
        (participant) =>
          participant.email
      ),
    ]).map(
      (email) =>
        email.toLowerCase()
    );

  return {
    userIds,
    emails,
  };
}


function buildCalendarIds({
  organizer,
  participants,
  calendarIds,
}) {
  /*
   * Explicit calendar IDs take
   * precedence when supplied.
   */
  if (
    Array.isArray(calendarIds) &&
    calendarIds.length > 0
  ) {
    return unique(
      calendarIds
    );
  }

  /*
   * By default check only organizer
   * and internal interviewers.
   *
   * We deliberately do NOT attempt
   * to read an applicant's private
   * Google Calendar.
   */
  return unique([
    organizer.email,

    ...participants
      .filter(
        (participant) =>
          participant
            .participantType ===
            'interviewer' ||
          participant
            .participantType ===
            'organizer'
      )
      .map(
        (participant) =>
          participant.email
      ),
  ]);
}


function personMatches(
  person,
  identitySets
) {
  const userId =
    cleanText(
      person?.userId
    );

  const email =
    cleanText(
      person?.email
    ).toLowerCase();

  return Boolean(
    (
      userId &&
      identitySets.userIds
        .includes(userId)
    ) ||
    (
      email &&
      identitySets.emails
        .includes(email)
    )
  );
}


function summarizeConflict(
  interview,
  identitySets
) {
  const people = [
    interview.organizer,

    ...(
      Array.isArray(
        interview.participants
      )
        ? interview.participants
        : []
    ),
  ].filter(Boolean);

  const matchedPeople =
    people
      .filter(
        (person) =>
          personMatches(
            person,
            identitySets
          )
      )
      .map(
        (person) => ({
          userId:
            cleanText(
              person.userId
            ),

          name:
            cleanText(
              person.name
            ),

          email:
            cleanText(
              person.email
            ).toLowerCase(),

          role:
            cleanText(
              person.role
            ),
        })
      );

  return {
    interviewId:
      String(
        interview._id || ''
      ),

    applicantId:
      String(
        interview.applicantId ||
        ''
      ),

    type:
      cleanText(
        interview.type
      ),

    scheduledStart:
      interview.scheduledStart,

    scheduledEnd:
      interview.scheduledEnd,

    matchedPeople,
  };
}


async function requireApplicant({
  applicantId,

  ApplicantModel =
    Applicant,
}) {
  const objectId =
    toObjectId(
      applicantId,
      'applicantId'
    );

  const applicant =
    await ApplicantModel.findById(
      objectId
    );

  if (!applicant) {
    throw serviceError(
      'APPLICANT_NOT_FOUND',

      'Applicant was not found.'
    );
  }

  if (
    applicant.lifecycle
      ?.archived === true
  ) {
    throw serviceError(
      'APPLICANT_NOT_FOUND',

      'Applicant was not found or is archived.'
    );
  }

  return {
    objectId,
    applicant,
  };
}


async function findLocalConflicts({
  scheduledStart,
  scheduledEnd,
  organizer,
  participants,
  excludeInterviewId = null,

  InterviewModel =
    ApplicantInterview,
}) {
  const identities =
    buildIdentitySets({
      organizer,
      participants,
    });

  const orConditions = [];

  if (
    identities.userIds.length >
    0
  ) {
    orConditions.push(
      {
        'organizer.userId': {
          $in:
            identities.userIds,
        },
      },

      {
        'participants.userId': {
          $in:
            identities.userIds,
        },
      }
    );
  }

  if (
    identities.emails.length >
    0
  ) {
    orConditions.push(
      {
        'organizer.email': {
          $in:
            identities.emails,
        },
      },

      {
        'participants.email': {
          $in:
            identities.emails,
        },
      }
    );
  }

  if (
    orConditions.length === 0
  ) {
    return [];
  }

  const filter = {
    status:
      'scheduled',

    archived: {
      $ne: true,
    },

    scheduledStart: {
      $lt:
        scheduledEnd,
    },

    scheduledEnd: {
      $gt:
        scheduledStart,
    },

    $or:
      orConditions,
  };

  if (excludeInterviewId) {
    filter._id = {
      $ne:
        toObjectId(
          excludeInterviewId,
          'excludeInterviewId'
        ),
    };
  }

  const query =
    InterviewModel.find(
      filter
    );

  if (
    query &&
    typeof query.select ===
      'function'
  ) {
    query.select(
      '_id applicantId type ' +
      'scheduledStart scheduledEnd ' +
      'organizer participants'
    );
  }

  let interviews;

  if (
    query &&
    typeof query.lean ===
      'function'
  ) {
    interviews =
      await query.lean();
  } else {
    interviews =
      await query;
  }

  return (
    Array.isArray(interviews)
      ? interviews
      : []
  ).map(
    (interview) =>
      summarizeConflict(
        interview,
        identities
      )
  );
}


function summarizeGoogleAvailability(
  googleResult
) {
  const busy = [];
  const errors = [];

  const calendars =
    googleResult
      ?.calendars || {};

  for (
    const [
      calendarId,
      value,
    ]
    of Object.entries(
      calendars
    )
  ) {
    for (
      const interval
      of (
        Array.isArray(
          value?.busy
        )
          ? value.busy
          : []
      )
    ) {
      busy.push({
        calendarId,

        start:
          interval.start,

        end:
          interval.end,
      });
    }

    for (
      const error
      of (
        Array.isArray(
          value?.errors
        )
          ? value.errors
          : []
      )
    ) {
      errors.push({
        calendarId,
        ...error,
      });
    }
  }

  return {
    ...googleResult,
    busy,
    errors,
  };
}


async function checkApplicantInterviewAvailability({
  applicantId,

  scheduledStart,
  scheduledEnd,

  timezone = 'UTC',

  organizer,

  participants = [],

  calendarIds = [],

  excludeInterviewId =
    null,

  ApplicantModel =
    Applicant,

  InterviewModel =
    ApplicantInterview,

  freeBusyChecker =
    checkFreeBusy,
}) {
  await requireApplicant({
    applicantId,
    ApplicantModel,
  });

  const schedule =
    validateInterviewSchedule({
      scheduledStart,
      scheduledEnd,
    });

  const normalizedOrganizer =
    normalizeActor(
      organizer,
      'Organizer'
    );

  const normalizedParticipants =
    Array.isArray(participants) &&
    participants.length > 0
      ? normalizeParticipants(
          participants
        )
      : [];

  const localConflicts =
    await findLocalConflicts({
      scheduledStart:
        schedule.scheduledStart,

      scheduledEnd:
        schedule.scheduledEnd,

      organizer:
        normalizedOrganizer,

      participants:
        normalizedParticipants,

      excludeInterviewId,

      InterviewModel,
    });

  const calendarsToCheck =
    buildCalendarIds({
      organizer:
        normalizedOrganizer,

      participants:
        normalizedParticipants,

      calendarIds,
    });

  const googleRaw =
    await freeBusyChecker({
      timeMin:
        schedule
          .scheduledStart,

      timeMax:
        schedule
          .scheduledEnd,

      timezone:
        cleanText(
          timezone
        ) || 'UTC',

      calendarIds:
        calendarsToCheck,
    });

  const google =
    summarizeGoogleAvailability(
      googleRaw
    );

  const hasLocalConflict =
    localConflicts.length > 0;

  const hasGoogleConflict =
    google.busy.length > 0;

  let status;

  if (
    hasLocalConflict ||
    hasGoogleConflict
  ) {
    status = 'busy';
  } else if (
    google.checked === true &&
    google.errors.length === 0
  ) {
    status = 'available';
  } else {
    /*
     * OMAH found no conflict,
     * but Google Calendar was
     * not fully checked.
     */
    status =
      'omah_available';
  }

  return {
    status,

    available:
      status !== 'busy',

    fullyChecked:
      google.checked === true &&
      google.errors.length === 0,

    scheduledStart:
      schedule.scheduledStart,

    scheduledEnd:
      schedule.scheduledEnd,

    timezone:
      cleanText(
        timezone
      ) || 'UTC',

    calendarsRequested:
      calendarsToCheck,

    local: {
      available:
        !hasLocalConflict,

      conflicts:
        localConflicts,
    },

    google,
  };
}


module.exports = {
  buildIdentitySets,
  buildCalendarIds,
  findLocalConflicts,
  checkApplicantInterviewAvailability,
};
