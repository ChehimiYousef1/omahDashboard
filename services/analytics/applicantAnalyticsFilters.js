'use strict';

const {
  APPLICANT_STATUSES,
} = require(
  '../../utils/applicantStatus'
);

const {
  normalizedText,
  asDate,
} = require(
  './applicantAnalyticsHelpers'
);


function analyticsFilterError(
  code,
  message
) {
  const error =
    new Error(message);

  error.code =
    code;

  error.statusCode =
    400;

  return error;
}


function scalar(
  value,
  name
) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return '';
  }

  if (
    Array.isArray(value) ||
    typeof value ===
      'object'
  ) {
    throw analyticsFilterError(
      'INVALID_ANALYTICS_FILTER',
      `${name} must contain one value.`
    );
  }

  return String(value)
    .trim();
}


function dateValue(
  value,
  name,
  endOfDay = false
) {
  const raw =
    scalar(
      value,
      name
    );

  if (!raw) {
    return null;
  }

  if (
    !/^\d{4}-\d{2}-\d{2}$/
      .test(raw)
  ) {
    throw analyticsFilterError(
      'INVALID_ANALYTICS_DATE',
      `${name} must use YYYY-MM-DD format.`
    );
  }

  const date =
    new Date(
      endOfDay
        ? `${raw}T23:59:59.999Z`
        : `${raw}T00:00:00.000Z`
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    throw analyticsFilterError(
      'INVALID_ANALYTICS_DATE',
      `${name} is invalid.`
    );
  }

  return date;
}


function normalizeApplicantAnalyticsFilters(
  query = {}
) {
  const status =
    normalizedText(
      scalar(
        query.status,
        'status'
      )
    );

  if (
    status &&
    !APPLICANT_STATUSES
      .includes(status)
  ) {
    throw analyticsFilterError(
      'INVALID_ANALYTICS_STATUS',
      `Unknown Applicant status: ${status}`
    );
  }

  const archived =
    normalizedText(
      scalar(
        query.archived,
        'archived'
      ) ||
      'false'
    );

  if (
    ![
      'false',
      'true',
      'all',
    ].includes(
      archived
    )
  ) {
    throw analyticsFilterError(
      'INVALID_ANALYTICS_ARCHIVE_FILTER',
      'archived must be false, true, or all.'
    );
  }

  const from =
    dateValue(
      query.from,
      'from'
    );

  const to =
    dateValue(
      query.to,
      'to',
      true
    );

  if (
    from &&
    to &&
    from >
      to
  ) {
    throw analyticsFilterError(
      'INVALID_ANALYTICS_DATE_RANGE',
      'from cannot be after to.'
    );
  }

  return {
    q:
      scalar(
        query.q,
        'q'
      ),

    from,
    to,

    status,

    positionTrack:
      scalar(
        query.positionTrack,
        'positionTrack'
      ),

    positionType:
      scalar(
        query.positionType,
        'positionType'
      ),

    country:
      scalar(
        query.country,
        'country'
      ),

    city:
      scalar(
        query.city,
        'city'
      ),

    source:
      scalar(
        query.source,
        'source'
      ),

    skill:
      scalar(
        query.skill,
        'skill'
      ),

    tag:
      scalar(
        query.tag,
        'tag'
      ),

    archived,
  };
}


function applicationDate(
  applicant
) {
  return (
    asDate(
      applicant
        ?.recruitment
        ?.firstAppliedAt
    ) ||
    asDate(
      applicant?.createdAt
    )
  );
}


function same(
  left,
  right
) {
  return (
    normalizedText(
      left
    ) ===
    normalizedText(
      right
    )
  );
}


function includesValue(
  values,
  expected
) {
  const needle =
    normalizedText(
      expected
    );

  return (
    Array.isArray(values) &&
    values.some(
      value =>
        normalizedText(
          value
        ) ===
        needle
    )
  );
}


function allApplicantSkills(
  applicant
) {
  return [
    ...(
      applicant
        ?.skills
        ?.primaryTechnical ||
      []
    ),

    ...(
      applicant
        ?.skills
        ?.programmingLanguages ||
      []
    ),

    ...(
      applicant
        ?.skills
        ?.frameworks ||
      []
    ),

    ...(
      applicant
        ?.skills
        ?.databases ||
      []
    ),

    ...(
      applicant
        ?.skills
        ?.cloudDevOps ||
      []
    ),

    ...(
      applicant
        ?.skills
        ?.dataEngineerSkills ||
      []
    ),

    ...(
      applicant
        ?.skills
        ?.aiMlEngineerSkills ||
      []
    ),

    ...(
      applicant
        ?.skills
        ?.dataAnalystSkills ||
      []
    ),
  ];
}


function applicantMatchesAnalyticsFilters(
  applicant,
  filters
) {
  const archived =
    applicant
      ?.lifecycle
      ?.archived ===
    true;

  if (
    filters.archived ===
      'false' &&
    archived
  ) {
    return false;
  }

  if (
    filters.archived ===
      'true' &&
    !archived
  ) {
    return false;
  }

  if (
    filters.status &&
    !same(
      applicant
        ?.recruitment
        ?.status,
      filters.status
    )
  ) {
    return false;
  }

  if (
    filters.positionTrack &&
    !same(
      applicant
        ?.preferences
        ?.positionTrack,
      filters.positionTrack
    )
  ) {
    return false;
  }

  if (
    filters.positionType &&
    !same(
      applicant
        ?.preferences
        ?.positionType,
      filters.positionType
    )
  ) {
    return false;
  }

  if (
    filters.country &&
    !same(
      applicant
        ?.identity
        ?.country,
      filters.country
    )
  ) {
    return false;
  }

  if (
    filters.city &&
    !same(
      applicant
        ?.identity
        ?.city,
      filters.city
    )
  ) {
    return false;
  }

  if (
    filters.source &&
    !same(
      applicant
        ?.recruitment
        ?.source,
      filters.source
    )
  ) {
    return false;
  }

  if (
    filters.tag &&
    !includesValue(
      applicant
        ?.recruitment
        ?.tags,
      filters.tag
    )
  ) {
    return false;
  }

  if (
    filters.skill &&
    !includesValue(
      allApplicantSkills(
        applicant
      ),
      filters.skill
    )
  ) {
    return false;
  }

  if (
    filters.q
  ) {
    const haystack =
      [
        applicant
          ?.identity
          ?.fullName,

        applicant
          ?.identity
          ?.email,

        applicant
          ?.identity
          ?.country,

        applicant
          ?.identity
          ?.city,

        applicant
          ?.preferences
          ?.positionTrack,

        applicant
          ?.education
          ?.universityName,

        ...allApplicantSkills(
          applicant
        ),
      ]
        .join(' ')
        .toLowerCase();

    if (
      !haystack.includes(
        filters.q
          .toLowerCase()
      )
    ) {
      return false;
    }
  }

  const date =
    applicationDate(
      applicant
    );

  if (
    filters.from &&
    (
      !date ||
      date <
        filters.from
    )
  ) {
    return false;
  }

  if (
    filters.to &&
    (
      !date ||
      date >
        filters.to
    )
  ) {
    return false;
  }

  return true;
}


module.exports = {
  analyticsFilterError,
  normalizeApplicantAnalyticsFilters,
  applicationDate,
  allApplicantSkills,
  applicantMatchesAnalyticsFilters,
};
