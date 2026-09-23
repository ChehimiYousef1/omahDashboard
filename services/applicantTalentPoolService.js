'use strict';

const mongoose =
  require('mongoose');

const Applicant =
  require(
    '../models/Applicant'
  );


const TALENT_POOL_PRIORITIES =
  Object.freeze([
    'normal',
    'medium',
    'high',
  ]);


const TALENT_POOL_EDITABLE_FIELDS =
  Object.freeze([
    'categoryId',
    'roles',
    'priority',
    'ownerId',
    'source',
    'reason',
    'nextReviewAt',
  ]);


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


function cleanText(
  value
) {
  return String(
    value ?? ''
  ).trim();
}


function normalizeStringList(
  value,
  {
    fieldName =
      'values',

    maxItems =
      50,

    maxLength =
      160,
  } = {}
) {
  if (
    value === undefined ||
    value === null
  ) {
    return [];
  }

  if (
    !Array.isArray(value)
  ) {
    throw serviceError(
      'INVALID_TALENT_POOL_INPUT',
      `${fieldName} must be an array.`
    );
  }

  const seen =
    new Set();

  const result =
    [];

  for (
    const raw
    of value
  ) {
    const item =
      cleanText(raw);

    if (!item) {
      continue;
    }

    if (
      item.length >
      maxLength
    ) {
      throw serviceError(
        'INVALID_TALENT_POOL_INPUT',
        `${fieldName} contains a value that is too long.`
      );
    }

    const key =
      item.toLocaleLowerCase(
        'en'
      );

    if (
      seen.has(key)
    ) {
      continue;
    }

    seen.add(key);

    result.push(
      item
    );

    if (
      result.length >
      maxItems
    ) {
      throw serviceError(
        'INVALID_TALENT_POOL_INPUT',
        `${fieldName} exceeds the maximum allowed values.`
      );
    }
  }

  return result;
}


function normalizePriority(
  value
) {
  const priority =
    cleanText(value)
      .toLowerCase();

  if (
    !TALENT_POOL_PRIORITIES
      .includes(priority)
  ) {
    throw serviceError(
      'INVALID_TALENT_POOL_INPUT',
      `Talent Pool priority must be one of: ${TALENT_POOL_PRIORITIES.join(', ')}.`
    );
  }

  return priority;
}


function normalizeObjectId(
  value,
  fieldName
) {
  const id =
    cleanText(value);

  if (
    !mongoose.Types
      .ObjectId
      .isValid(id)
  ) {
    throw serviceError(
      'INVALID_TALENT_POOL_INPUT',
      `${fieldName} must be a valid ObjectId.`
    );
  }

  return id;
}


function normalizeNullableDate(
  value,
  fieldName
) {
  if (
    value === undefined
  ) {
    return undefined;
  }

  if (
    value === null ||
    value === ''
  ) {
    return null;
  }

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    throw serviceError(
      'INVALID_TALENT_POOL_INPUT',
      `${fieldName} must be a valid date.`
    );
  }

  return date;
}


function normalizeReason(
  value,
  fieldName =
    'reason'
) {
  const reason =
    cleanText(value);

  if (
    reason.length >
    2000
  ) {
    throw serviceError(
      'INVALID_TALENT_POOL_INPUT',
      `${fieldName} is too long.`
    );
  }

  return reason;
}


function normalizeMembershipInput(
  input = {},
  {
    partial =
      false,
  } = {}
) {
  if (
    !input ||
    typeof input !==
      'object' ||
    Array.isArray(input)
  ) {
    throw serviceError(
      'INVALID_TALENT_POOL_INPUT',
      'Talent Pool membership payload must be an object.'
    );
  }

  const allowed =
    new Set(
      TALENT_POOL_EDITABLE_FIELDS
    );

  for (
    const key
    of Object.keys(input)
  ) {
    if (
      !allowed.has(key)
    ) {
      throw serviceError(
        'INVALID_TALENT_POOL_INPUT',
        `Unsupported Talent Pool membership field: ${key}`
      );
    }
  }

  const output =
    {};


  if (
    Object.prototype
      .hasOwnProperty
      .call(
        input,
        'categoryId'
      )
  ) {
    output.categoryId =
      normalizeObjectId(
        input.categoryId,
        'categoryId'
      );
  } else if (!partial) {
    throw serviceError(
      'INVALID_TALENT_POOL_INPUT',
      'Talent Pool categoryId is required.'
    );
  }


  if (
    Object.prototype
      .hasOwnProperty
      .call(
        input,
        'roles'
      )
  ) {
    output.roles =
      normalizeStringList(
        input.roles,
        {
          fieldName:
            'roles',

          maxItems:
            30,
        }
      );
  } else if (!partial) {
    output.roles =
      [];
  }


  if (
    Object.prototype
      .hasOwnProperty
      .call(
        input,
        'priority'
      )
  ) {
    output.priority =
      normalizePriority(
        input.priority
      );
  } else if (!partial) {
    output.priority =
      'normal';
  }


  if (
    Object.prototype
      .hasOwnProperty
      .call(
        input,
        'ownerId'
      )
  ) {
    output.ownerId =
      cleanText(
        input.ownerId
      );
  } else if (!partial) {
    output.ownerId =
      '';
  }


  if (
    Object.prototype
      .hasOwnProperty
      .call(
        input,
        'source'
      )
  ) {
    const source =
      cleanText(
        input.source
      );

    if (
      source.length >
      120
    ) {
      throw serviceError(
        'INVALID_TALENT_POOL_INPUT',
        'Talent Pool source is too long.'
      );
    }

    output.source =
      source ||
      'manual';
  } else if (!partial) {
    output.source =
      'manual';
  }


  if (
    Object.prototype
      .hasOwnProperty
      .call(
        input,
        'reason'
      )
  ) {
    output.reason =
      normalizeReason(
        input.reason
      );
  } else if (!partial) {
    output.reason =
      '';
  }


  if (
    Object.prototype
      .hasOwnProperty
      .call(
        input,
        'nextReviewAt'
      )
  ) {
    output.nextReviewAt =
      normalizeNullableDate(
        input.nextReviewAt,
        'nextReviewAt'
      );
  } else if (!partial) {
    output.nextReviewAt =
      null;
  }


  if (
    partial &&
    Object.keys(output)
      .length === 0
  ) {
    throw serviceError(
      'INVALID_TALENT_POOL_INPUT',
      'At least one editable Talent Pool field is required.'
    );
  }


  return output;
}


function startOfLocalDay(
  value
) {
  const date =
    new Date(value);

  date.setHours(
    0,
    0,
    0,
    0
  );

  return date;
}


function deriveReviewStatus(
  talentPool = {},
  {
    now =
      new Date(),
  } = {}
) {
  if (
    !talentPool ||
    talentPool.active !==
      true
  ) {
    return 'inactive';
  }

  const next =
    talentPool.nextReviewAt
      ? new Date(
          talentPool.nextReviewAt
        )
      : null;

  if (
    !next ||
    Number.isNaN(
      next.getTime()
    )
  ) {
    if (
      talentPool
        .lastReviewedAt
    ) {
      return 'reviewed';
    }

    return 'not_scheduled';
  }

  const todayStart =
    startOfLocalDay(
      now
    );

  const tomorrowStart =
    new Date(
      todayStart
    );

  tomorrowStart.setDate(
    tomorrowStart.getDate() +
      1
  );

  if (
    next <
    todayStart
  ) {
    return 'overdue';
  }

  if (
    next <
    tomorrowStart
  ) {
    return 'due';
  }

  return 'scheduled';
}


function safeTalentPoolView(
  applicant
) {
  const source =
    applicant?.talentPool ||
    {};

  return {
    active:
      source.active ===
      true,

    categoryId:
      source.categoryId
        ? String(
            source.categoryId
          )
        : null,

    roles:
      Array.isArray(
        source.roles
      )
        ? [
            ...source.roles,
          ]
        : [],

    priority:
      source.priority ||
      'normal',

    ownerId:
      cleanText(
        source.ownerId
      ),

    source:
      cleanText(
        source.source
      ),

    reason:
      cleanText(
        source.reason
      ),

    addedAt:
      source.addedAt ||
      null,

    addedBy:
      cleanText(
        source.addedBy
      ),

    lastReviewedAt:
      source.lastReviewedAt ||
      null,

    lastReviewedBy:
      cleanText(
        source.lastReviewedBy
      ),

    nextReviewAt:
      source.nextReviewAt ||
      null,

    reviewStatus:
      deriveReviewStatus(
        source
      ),

    removedAt:
      source.removedAt ||
      null,

    removedBy:
      cleanText(
        source.removedBy
      ),

    restoredAt:
      source.restoredAt ||
      null,

    restoredBy:
      cleanText(
        source.restoredBy
      ),
  };
}


module.exports = {
  Applicant,

  TALENT_POOL_PRIORITIES,
  TALENT_POOL_EDITABLE_FIELDS,

  serviceError,
  cleanText,
  normalizeStringList,
  normalizePriority,
  normalizeObjectId,
  normalizeNullableDate,
  normalizeReason,
  normalizeMembershipInput,

  startOfLocalDay,
  deriveReviewStatus,
  safeTalentPoolView,
};
