'use strict';

const INTERVIEW_TYPES =
  Object.freeze([
    'screening',
    'hr',
    'technical',
    'behavioral',
    'managerial',
    'final',
    'other',
  ]);

const INTERVIEW_STATUSES =
  Object.freeze([
    'scheduled',
    'completed',
    'cancelled',
    'no_show',
  ]);

const INTERVIEW_FORMATS =
  Object.freeze([
    'online',
    'onsite',
    'phone',
  ]);

const INTERVIEW_OUTCOMES =
  Object.freeze([
    'pending',
    'recommended',
    'not_recommended',
    'on_hold',
  ]);

const INTERVIEW_STATUS_TRANSITIONS =
  Object.freeze({
    scheduled:
      Object.freeze([
        'completed',
        'cancelled',
        'no_show',
      ]),

    completed:
      Object.freeze([]),

    cancelled:
      Object.freeze([]),

    no_show:
      Object.freeze([]),
  });

function interviewError(
  code,
  message
) {
  const error =
    new Error(message);

  error.code = code;

  return error;
}

function normalizeEnum({
  value,
  allowed,
  code,
  label,
}) {
  const normalized =
    String(value ?? '')
      .trim()
      .toLowerCase();

  if (
    !allowed.includes(
      normalized
    )
  ) {
    throw interviewError(
      code,
      label + ' is invalid.'
    );
  }

  return normalized;
}

function validateInterviewType(
  value
) {
  return normalizeEnum({
    value,

    allowed:
      INTERVIEW_TYPES,

    code:
      'INTERVIEW_TYPE_INVALID',

    label:
      'Interview type',
  });
}

function validateInterviewStatus(
  value
) {
  return normalizeEnum({
    value,

    allowed:
      INTERVIEW_STATUSES,

    code:
      'INTERVIEW_STATUS_INVALID',

    label:
      'Interview status',
  });
}

function validateInterviewFormat(
  value
) {
  return normalizeEnum({
    value,

    allowed:
      INTERVIEW_FORMATS,

    code:
      'INTERVIEW_FORMAT_INVALID',

    label:
      'Interview format',
  });
}

function validateInterviewOutcome(
  value
) {
  return normalizeEnum({
    value,

    allowed:
      INTERVIEW_OUTCOMES,

    code:
      'INTERVIEW_OUTCOME_INVALID',

    label:
      'Interview outcome',
  });
}

function normalizeInterviewDate(
  value,
  fieldName
) {
  const date =
    value instanceof Date
      ? new Date(
          value.getTime()
        )
      : new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    throw interviewError(
      'INTERVIEW_DATE_INVALID',

      fieldName +
        ' must be a valid date/time.'
    );
  }

  return date;
}

function validateInterviewSchedule({
  scheduledStart,
  scheduledEnd,
}) {
  const start =
    normalizeInterviewDate(
      scheduledStart,
      'scheduledStart'
    );

  const end =
    normalizeInterviewDate(
      scheduledEnd,
      'scheduledEnd'
    );

  if (
    end.getTime() <=
    start.getTime()
  ) {
    throw interviewError(
      'INTERVIEW_SCHEDULE_INVALID',

      'Interview end time must be after the start time.'
    );
  }

  return {
    scheduledStart: start,
    scheduledEnd: end,
  };
}

function canTransitionInterviewStatus(
  currentStatus,
  nextStatus
) {
  const current =
    validateInterviewStatus(
      currentStatus
    );

  const next =
    validateInterviewStatus(
      nextStatus
    );

  if (current === next) {
    return true;
  }

  return (
    INTERVIEW_STATUS_TRANSITIONS[
      current
    ] || []
  ).includes(next);
}

module.exports = {
  INTERVIEW_TYPES,
  INTERVIEW_STATUSES,
  INTERVIEW_FORMATS,
  INTERVIEW_OUTCOMES,
  INTERVIEW_STATUS_TRANSITIONS,

  validateInterviewType,
  validateInterviewStatus,
  validateInterviewFormat,
  validateInterviewOutcome,
  normalizeInterviewDate,
  validateInterviewSchedule,
  canTransitionInterviewStatus,
};

