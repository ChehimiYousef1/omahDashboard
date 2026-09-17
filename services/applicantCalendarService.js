'use strict';

const Applicant =
  require('../models/Applicant');

const ApplicantInterview =
  require('../models/ApplicantInterview');

const ApplicantInternalNote =
  require('../models/ApplicantInternalNote');


const MAX_CALENDAR_RANGE_DAYS =
  370;

const CALENDAR_SOURCE_TYPES =
  Object.freeze([
    'interview',
    'task',
    'scheduled_note',
    'reminder',
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


function cleanText(
  value
) {
  return String(
    value ??
    ''
  ).trim();
}


function validDate(
  value
) {
  const date =
    new Date(value);

  return Number.isNaN(
    date.getTime()
  )
    ? null
    : date;
}


function parseRange({
  from,
  to,
}) {
  const fromDate =
    validDate(from);

  const toDate =
    validDate(to);

  if (
    !fromDate ||
    !toDate
  ) {
    throw serviceError(
      'APPLICANT_CALENDAR_RANGE_REQUIRED',
      'A valid Calendar from/to date range is required.'
    );
  }

  if (
    toDate <
    fromDate
  ) {
    throw serviceError(
      'APPLICANT_CALENDAR_RANGE_INVALID',
      'Calendar range end must be after its start.'
    );
  }

  const rangeDays =
    (
      toDate.getTime() -
      fromDate.getTime()
    ) /
    86_400_000;

  if (
    rangeDays >
    MAX_CALENDAR_RANGE_DAYS
  ) {
    throw serviceError(
      'APPLICANT_CALENDAR_RANGE_TOO_LARGE',
      `Calendar range cannot exceed ${MAX_CALENDAR_RANGE_DAYS} days.`
    );
  }

  return {
    fromDate,
    toDate,
  };
}


function normalizeFilterSet(
  value
) {
  const values =
    Array.isArray(value)
      ? value
      : cleanText(value)
        ? cleanText(value)
            .split(',')
        : [];

  return new Set(
    values
      .map(item =>
        cleanText(item)
          .toLowerCase()
      )
      .filter(Boolean)
  );
}


function shortText(
  value,
  maxLength = 90
) {
  const text =
    cleanText(value);

  if (
    text.length <=
    maxLength
  ) {
    return text;
  }

  return (
    text.slice(
      0,
      maxLength - 1
    ) +
    '…'
  );
}


function actorSummary(
  actor
) {
  return {
    userId:
      cleanText(
        actor?.userId
      ),

    name:
      cleanText(
        actor?.name
      ),

    email:
      cleanText(
        actor?.email
      ),

    role:
      cleanText(
        actor?.role
      ),
  };
}


function applicantName(
  applicant
) {
  return (
    cleanText(
      applicant
        ?.identity
        ?.fullName
    ) ||
    cleanText(
      applicant
        ?.fullName
    ) ||
    'Applicant'
  );
}


function iso(
  value
) {
  const date =
    validDate(value);

  return date
    ? date.toISOString()
    : null;
}


function eventOverlapsRange(
  start,
  end,
  fromDate,
  toDate
) {
  const startDate =
    validDate(start);

  if (!startDate) {
    return false;
  }

  const endDate =
    validDate(end) ||
    startDate;

  return (
    startDate <=
      toDate &&
    endDate >=
      fromDate
  );
}


function normalizeSyncStatus(
  value,
  fallback =
    'not_synced'
) {
  const status =
    cleanText(value)
      .toLowerCase();

  if (
    status === 'synced' ||
    status === 'created'
  ) {
    return 'synced';
  }

  if (
    status === 'error'
  ) {
    return 'error';
  }

  return fallback;
}


function interviewSyncStatus(
  interview
) {
  const direct =
    cleanText(
      interview?.calendar
        ?.syncStatus
    );

  if (direct) {
    return normalizeSyncStatus(
      direct
    );
  }

  const meetingStatus =
    cleanText(
      interview?.meeting
        ?.status
    );

  const eventId =
    cleanText(
      interview?.meeting
        ?.providerEventId
    );

  if (
    meetingStatus ===
    'error'
  ) {
    return 'error';
  }

  if (eventId) {
    return 'synced';
  }

  return 'not_synced';
}


function buildInterviewEvent({
  interview,
  applicant,
}) {
  const type =
    cleanText(
      interview?.type
    ) ||
    'Interview';

  return {
    id:
      `interview:${String(
        interview._id
      )}`,

    sourceId:
      String(
        interview._id
      ),

    sourceType:
      'interview',

    title:
      `${type
        .replace(/_/g, ' ')
        .replace(
          /\b\w/g,
          character =>
            character.toUpperCase()
        )} Interview — ${applicantName(
        applicant
      )}`,

    applicantId:
      String(
        interview.applicantId
      ),

    applicantName:
      applicantName(
        applicant
      ),

    start:
      iso(
        interview
          .scheduledStart
      ),

    end:
      iso(
        interview
          .scheduledEnd
      ),

    status:
      cleanText(
        interview.status
      ) ||
      'scheduled',

    owner:
      actorSummary(
        interview.organizer ||
        interview.createdBy
      ),

    important:
      false,

    timezone:
      cleanText(
        interview.timezone
      ) ||
      'UTC',

    format:
      cleanText(
        interview.format
      ),

    location:
      cleanText(
        interview.location
      ),

    calendarSyncStatus:
      interviewSyncStatus(
        interview
      ),

    eventUrl:
      cleanText(
        interview?.meeting
          ?.joinUrl ||
        interview
          ?.calendar
          ?.eventUrl ||
        interview
          ?.meetingLink
      ),

    description:
      cleanText(
        interview.notes
      ),
  };
}


function buildInternalItemEvents({
  note,
  applicant,
  fromDate,
  toDate,
}) {
  const events =
    [];

  const kind =
    note.kind ===
      'task'
      ? 'task'
      : 'note';

  const startAt =
    note.schedule
      ?.startAt ||
    null;

  const endAt =
    note.schedule
      ?.endAt ||
    null;

  const reminderAt =
    note.schedule
      ?.reminderAt ||
    null;

  const scheduledStart =
    startAt ||
    endAt;

  const scheduledEnd =
    endAt ||
    startAt;

  const name =
    applicantName(
      applicant
    );

  const content =
    shortText(
      note.content ||
      (
        kind === 'task'
          ? 'Internal task'
          : 'Internal note'
      )
    );

  const owner =
    actorSummary(
      note.author
    );

  const syncStatus =
    normalizeSyncStatus(
      note.calendar
        ?.syncStatus
    );

  if (
    scheduledStart &&
    eventOverlapsRange(
      scheduledStart,
      scheduledEnd,
      fromDate,
      toDate
    )
  ) {
    events.push({
      id:
        `${kind}:${String(
          note._id
        )}`,

      sourceId:
        String(
          note._id
        ),

      sourceType:
        kind === 'task'
          ? 'task'
          : 'scheduled_note',

      title:
        `${
          kind === 'task'
            ? 'Task'
            : 'Scheduled Note'
        } — ${content}`,

      applicantId:
        String(
          note.applicantId
        ),

      applicantName:
        name,

      start:
        iso(
          scheduledStart
        ),

      end:
        iso(
          scheduledEnd
        ),

      status:
        kind === 'task'
          ? cleanText(
              note.taskStatus
            ) ||
            'todo'
          : 'scheduled',

      owner,

      important:
        note.important ===
        true,

      timezone:
        '',

      format:
        '',

      location:
        '',

      calendarSyncStatus:
        syncStatus,

      eventUrl:
        cleanText(
          note.calendar
            ?.eventUrl
        ),

      description:
        cleanText(
          note.content
        ),

      reminderNote:
        cleanText(
          note.schedule
            ?.reminderNote
        ),
    });
  }

  if (
    reminderAt &&
    eventOverlapsRange(
      reminderAt,
      reminderAt,
      fromDate,
      toDate
    )
  ) {
    events.push({
      id:
        `reminder:${String(
          note._id
        )}`,

      sourceId:
        String(
          note._id
        ),

      sourceType:
        'reminder',

      relatedSourceType:
        kind,

      title:
        `Reminder — ${content}`,

      applicantId:
        String(
          note.applicantId
        ),

      applicantName:
        name,

      start:
        iso(
          reminderAt
        ),

      end:
        iso(
          reminderAt
        ),

      status:
        kind === 'task'
          ? cleanText(
              note.taskStatus
            ) ||
            'todo'
          : 'scheduled',

      owner,

      important:
        note.important ===
        true,

      timezone:
        '',

      format:
        '',

      location:
        '',

      calendarSyncStatus:
        syncStatus,

      eventUrl:
        cleanText(
          note.calendar
            ?.eventUrl
        ),

      description:
        cleanText(
          note.schedule
            ?.reminderNote ||
          note.content
        ),

      reminderNote:
        cleanText(
          note.schedule
            ?.reminderNote
        ),
    });
  }

  return events;
}


function applyFilters(
  events,
  {
    sourceTypes,
    statuses,
    syncStatuses,
    owner,
  }
) {
  const sourceSet =
    normalizeFilterSet(
      sourceTypes
    );

  const statusSet =
    normalizeFilterSet(
      statuses
    );

  const syncSet =
    normalizeFilterSet(
      syncStatuses
    );

  const ownerNeedle =
    cleanText(owner)
      .toLowerCase();

  return events.filter(
    event => {
      if (
        sourceSet.size &&
        !sourceSet.has(
          event.sourceType
        )
      ) {
        return false;
      }

      if (
        statusSet.size &&
        !statusSet.has(
          cleanText(
            event.status
          ).toLowerCase()
        )
      ) {
        return false;
      }

      if (
        syncSet.size &&
        !syncSet.has(
          cleanText(
            event
              .calendarSyncStatus
          ).toLowerCase()
        )
      ) {
        return false;
      }

      if (ownerNeedle) {
        const searchable =
          [
            event.owner
              ?.userId,
            event.owner
              ?.name,
            event.owner
              ?.email,
            event.owner
              ?.role,
          ]
            .map(cleanText)
            .join(' ')
            .toLowerCase();

        if (
          !searchable.includes(
            ownerNeedle
          )
        ) {
          return false;
        }
      }

      return true;
    }
  );
}


async function getApplicantCalendarEvents({
  from,
  to,

  sourceTypes,
  statuses,
  syncStatuses,
  owner,

  ApplicantModel =
    Applicant,

  InterviewModel =
    ApplicantInterview,

  NoteModel =
    ApplicantInternalNote,
} = {}) {
  const {
    fromDate,
    toDate,
  } =
    parseRange({
      from,
      to,
    });

  const [
    interviews,
    notes,
  ] =
    await Promise.all([
      resolveLean(
        InterviewModel.find({
          archived: {
            $ne: true,
          },

          scheduledStart: {
            $lte:
              toDate,
          },

          scheduledEnd: {
            $gte:
              fromDate,
          },
        })
      ),

      resolveLean(
        NoteModel.find({
          archived: {
            $ne: true,
          },

          $or: [
            {
              $and: [
                {
                  'schedule.startAt': {
                    $lte:
                      toDate,
                  },
                },
                {
                  'schedule.endAt': {
                    $gte:
                      fromDate,
                  },
                },
              ],
            },

            {
              'schedule.startAt': {
                $gte:
                  fromDate,
                $lte:
                  toDate,
              },
            },

            {
              'schedule.endAt': {
                $gte:
                  fromDate,
                $lte:
                  toDate,
              },
            },

            {
              'schedule.reminderAt': {
                $gte:
                  fromDate,
                $lte:
                  toDate,
              },
            },
          ],
        })
      ),
    ]);

  const applicantIds =
    [
      ...(
        interviews ||
        []
      ),
      ...(
        notes ||
        []
      ),
    ]
      .map(item =>
        cleanText(
          item?.applicantId
        )
      )
      .filter(Boolean);

  const uniqueIds =
    [
      ...new Set(
        applicantIds
      ),
    ];

  const applicants =
    uniqueIds.length
      ? await resolveLean(
          ApplicantModel.find({
            _id: {
              $in:
                uniqueIds,
            },

            'lifecycle.archived': {
              $ne: true,
            },
          })
        )
      : [];

  const applicantMap =
    new Map(
      (
        applicants ||
        []
      ).map(
        applicant => [
          String(
            applicant._id
          ),
          applicant,
        ]
      )
    );

  const events =
    [];

  for (
    const interview
    of (
      interviews ||
      []
    )
  ) {
    const applicant =
      applicantMap.get(
        String(
          interview
            .applicantId
        )
      );

    if (!applicant) {
      continue;
    }

    events.push(
      buildInterviewEvent({
        interview,
        applicant,
      })
    );
  }

  for (
    const note
    of (
      notes ||
      []
    )
  ) {
    const applicant =
      applicantMap.get(
        String(
          note.applicantId
        )
      );

    if (!applicant) {
      continue;
    }

    events.push(
      ...buildInternalItemEvents({
        note,
        applicant,
        fromDate,
        toDate,
      })
    );
  }

  const filtered =
    applyFilters(
      events,
      {
        sourceTypes,
        statuses,
        syncStatuses,
        owner,
      }
    )
      .sort(
        (
          left,
          right
        ) =>
          new Date(
            left.start
          ).getTime() -
          new Date(
            right.start
          ).getTime()
      );

  return {
    range: {
      from:
        fromDate
          .toISOString(),

      to:
        toDate
          .toISOString(),
    },

    events:
      filtered,

    total:
      filtered.length,
  };
}


module.exports = {
  MAX_CALENDAR_RANGE_DAYS,
  CALENDAR_SOURCE_TYPES,

  parseRange,
  normalizeSyncStatus,
  buildInterviewEvent,
  buildInternalItemEvents,
  applyFilters,

  getApplicantCalendarEvents,
};
