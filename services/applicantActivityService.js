'use strict';

const ApplicantActivity =
  require('../models/ApplicantActivity');

const {
  toObjectId,
} = require(
  './applicantSubmissionService'
);

const {
  APPLICANT_ACTIVITY_TYPES,
  activityCategoryForType,
} = require(
  '../utils/applicantActivity'
);


function activityError(
  code,
  message
) {
  const error =
    new Error(message);

  error.code =
    code;

  return error;
}


function cleanText(value) {
  return String(
    value ?? ''
  ).trim();
}


function normalizeActor(
  actor = {}
) {
  if (
    !actor ||
    typeof actor !==
      'object' ||
    Array.isArray(actor)
  ) {
    return {
      userId: '',
      name: '',
      email: '',
      role: '',
    };
  }

  return {
    userId:
      cleanText(
        actor.userId
      ),

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


function normalizeSource(
  source = {}
) {
  if (
    !source ||
    typeof source !==
      'object' ||
    Array.isArray(source)
  ) {
    return {
      type: '',
      id: '',
    };
  }

  return {
    type:
      cleanText(
        source.type
      ),

    id:
      cleanText(
        source.id
      ),
  };
}


const SENSITIVE_AUDIT_KEYS =
  /(?:password|passwd|token|secret|authorization|cookie|credential|hash)/i;


function isSensitiveAuditField(
  value
) {
  return SENSITIVE_AUDIT_KEYS.test(
    cleanText(value)
  );
}


function sanitizeAuditValue(
  value,
  depth = 0
) {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }


  if (
    typeof value ===
      'boolean' ||
    typeof value ===
      'number'
  ) {
    return value;
  }


  if (
    value instanceof Date
  ) {
    return value.toISOString();
  }


  if (
    typeof value ===
    'string'
  ) {
    return value.length >
      2000
        ? `${value.slice(
            0,
            2000
          )}…`
        : value;
  }


  if (
    depth >= 4
  ) {
    return '[depth-limited]';
  }


  if (
    Array.isArray(value)
  ) {
    return value
      .slice(
        0,
        50
      )
      .map(
        item =>
          sanitizeAuditValue(
            item,
            depth + 1
          )
      );
  }


  if (
    typeof value ===
    'object'
  ) {
    /*
     * ObjectId / BSON-like scalar values.
     */
    if (
      typeof value.toHexString ===
      'function'
    ) {
      return String(
        value.toHexString()
      );
    }


    const result = {};

    for (
      const [
        key,
        child
      ]
      of Object.entries(
        value
      ).slice(
        0,
        50
      )
    ) {
      if (
        isSensitiveAuditField(
          key
        )
      ) {
        continue;
      }


      result[key] =
        sanitizeAuditValue(
          child,
          depth + 1
        );
    }

    return result;
  }


  return cleanText(
    value
  );
}


function normalizeAuditChanges(
  changes = []
) {
  if (
    !Array.isArray(
      changes
    )
  ) {
    return [];
  }


  return changes
    .slice(
      0,
      100
    )
    .map(
      change => {
        if (
          !change ||
          typeof change !==
            'object' ||
          Array.isArray(change)
        ) {
          return null;
        }


        const field =
          cleanText(
            change.field
          );


        if (
          !field ||
          isSensitiveAuditField(
            field
          )
        ) {
          return null;
        }


        return {
          field,

          label:
            cleanText(
              change.label
            ),

          before:
            sanitizeAuditValue(
              change.before
            ),

          after:
            sanitizeAuditValue(
              change.after
            ),
        };
      }
    )
    .filter(Boolean);
}


function buildApplicantActivity({
  applicantId,
  type,
  title,
  description = '',
  occurredAt =
    new Date(),
  actor = {},
  source = {},
  changes = [],
  metadata = {},
}) {
  const applicantObjectId =
    toObjectId(
      applicantId,
      'applicantId'
    );

  const cleanType =
    cleanText(type);

  if (
    !APPLICANT_ACTIVITY_TYPES
      .includes(cleanType)
  ) {
    throw activityError(
      'APPLICANT_ACTIVITY_TYPE_INVALID',
      'Applicant activity type is invalid.'
    );
  }


  const cleanTitle =
    cleanText(title);

  if (!cleanTitle) {
    throw activityError(
      'APPLICANT_ACTIVITY_TITLE_REQUIRED',
      'Applicant activity title is required.'
    );
  }


  const eventDate =
    occurredAt instanceof Date
      ? occurredAt
      : new Date(
          occurredAt
        );

  if (
    Number.isNaN(
      eventDate.getTime()
    )
  ) {
    throw activityError(
      'APPLICANT_ACTIVITY_DATE_INVALID',
      'Applicant activity date is invalid.'
    );
  }


  return {
    applicantId:
      applicantObjectId,

    type:
      cleanType,

    category:
      activityCategoryForType(
        cleanType
      ),

    title:
      cleanTitle,

    description:
      cleanText(
        description
      ),

    occurredAt:
      eventDate,

    actor:
      normalizeActor(
        actor
      ),

    source:
      normalizeSource(
        source
      ),

    auditVersion:
      1,

    changes:
      normalizeAuditChanges(
        changes
      ),

    metadata:
      (
        metadata &&
        typeof metadata ===
          'object' &&
        !Array.isArray(
          metadata
        )
      )
        ? metadata
        : {},
  };
}


async function recordApplicantActivity({
  ActivityModel =
    ApplicantActivity,

  ...input
}) {
  const event =
    buildApplicantActivity(
      input
    );

  return ActivityModel.create(
    event
  );
}


module.exports = {
  cleanText,
  normalizeActor,
  normalizeSource,
  isSensitiveAuditField,
  sanitizeAuditValue,
  normalizeAuditChanges,
  buildApplicantActivity,
  recordApplicantActivity,
};
