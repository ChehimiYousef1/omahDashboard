'use strict';

const ApplicantActivity =
  require(
    '../models/ApplicantActivity'
  );

const {
  APPLICANT_ACTIVITY_CATEGORIES,
  APPLICANT_ACTIVITY_TYPES,
} = require(
  '../utils/applicantActivity'
);

const {
  sanitizeAuditValue,
} = require(
  './applicantActivityService'
);

const {
  toObjectId,
} = require(
  './applicantSubmissionService'
);


function auditError(
  code,
  message,
  status = 400
) {
  const error =
    new Error(
      message
    );

  error.code =
    code;

  error.status =
    status;

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


function positiveInteger(
  value,
  fallback,
  {
    min = 1,
    max =
      Number.MAX_SAFE_INTEGER,
  } = {}
) {
  const parsed =
    Number.parseInt(
      value,
      10
    );

  if (
    !Number.isFinite(
      parsed
    )
  ) {
    return fallback;
  }

  return Math.min(
    max,
    Math.max(
      min,
      parsed
    )
  );
}


function optionalDate(
  value,
  fieldName
) {
  const text =
    cleanText(
      value
    );

  if (!text) {
    return null;
  }


  const date =
    new Date(
      text
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    throw auditError(
      'APPLICANT_AUDIT_DATE_INVALID',
      `${fieldName} must be a valid date.`
    );
  }

  return date;
}


function buildApplicantAuditFilter({
  applicantId,
  category,
  action,
  actorId,
  from,
  to,
}) {
  const filter = {
    applicantId:
      toObjectId(
        applicantId,
        'applicantId'
      ),
  };


  const cleanCategory =
    cleanText(
      category
    );

  if (cleanCategory) {
    if (
      !APPLICANT_ACTIVITY_CATEGORIES
        .includes(
          cleanCategory
        )
    ) {
      throw auditError(
        'APPLICANT_AUDIT_CATEGORY_INVALID',
        'Applicant audit category is invalid.'
      );
    }

    filter.category =
      cleanCategory;
  }


  const cleanAction =
    cleanText(
      action
    );

  if (cleanAction) {
    if (
      !APPLICANT_ACTIVITY_TYPES
        .includes(
          cleanAction
        )
    ) {
      throw auditError(
        'APPLICANT_AUDIT_ACTION_INVALID',
        'Applicant audit action is invalid.'
      );
    }

    filter.type =
      cleanAction;
  }


  const cleanActorId =
    cleanText(
      actorId
    );

  if (cleanActorId) {
    filter['actor.userId'] =
      cleanActorId;
  }


  const start =
    optionalDate(
      from,
      'from'
    );

  const end =
    optionalDate(
      to,
      'to'
    );


  if (
    start &&
    end &&
    start >
      end
  ) {
    throw auditError(
      'APPLICANT_AUDIT_DATE_RANGE_INVALID',
      'from cannot be later than to.'
    );
  }


  if (
    start ||
    end
  ) {
    filter.occurredAt =
      {};

    if (start) {
      filter.occurredAt.$gte =
        start;
    }

    if (end) {
      filter.occurredAt.$lte =
        end;
    }
  }


  return filter;
}


/*
|--------------------------------------------------------------------------
| Legacy change derivation
|--------------------------------------------------------------------------
|
| Existing ApplicantActivity events predate changes[].
|
| Where older metadata already contains a clear previous/next transition,
| expose it as structured audit data without rewriting historical records.
|
*/

function deriveLegacyAuditChanges(
  event
) {
  const metadata =
    event?.metadata &&
    typeof event.metadata ===
      'object' &&
    !Array.isArray(
      event.metadata
    )
      ? event.metadata
      : {};


  switch (
    cleanText(
      event?.type
    )
  ) {
    case 'status.changed':
      return [
        {
          field:
            'recruitment.status',

          label:
            'Recruitment status',

          before:
            metadata
              .previousStatus ??
            null,

          after:
            metadata
              .nextStatus ??
            null,
        },
      ];


    case 'profile.tags_updated':
      return [
        {
          field:
            'recruitment.tags',

          label:
            'Applicant tags',

          before:
            metadata
              .previousTags ??
            [],

          after:
            metadata
              .tags ??
            [],
        },
      ];


    case 'task.assigned':
    case 'task.reassigned':
    case 'task.unassigned':
      return [
        {
          field:
            'task.assignee',

          label:
            'Task assignee',

          before:
            metadata
              .previousAssignee ??
            null,

          after:
            metadata
              .assignee ??
            null,
        },
      ];


    case 'task.priority_changed':
      return [
        {
          field:
            'task.priority',

          label:
            'Task priority',

          before:
            metadata
              .previousPriority ??
            null,

          after:
            metadata
              .priority ??
            null,
        },
      ];


    case 'task.started':
    case 'task.completed':
    case 'task.reopened':
    case 'task.cancelled':
      return [
        {
          field:
            'task.status',

          label:
            'Task status',

          before:
            metadata
              .previousTaskStatus ??
            null,

          after:
            metadata
              .taskStatus ??
            null,
        },
      ];


    default:
      return [];
  }
}


function auditChangesForEvent(
  event
) {
  const stored =
    Array.isArray(
      event?.changes
    )
      ? event.changes
      : [];


  const changes =
    stored.length
      ? stored
      : deriveLegacyAuditChanges(
          event
        );


  return changes.map(
    change => ({
      field:
        cleanText(
          change.field
        ),

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
    })
  );
}


function serializeApplicantAuditEvent(
  event
) {
  return {
    id:
      String(
        event?._id ??
        event?.id ??
        ''
      ),

    action:
      cleanText(
        event?.type
      ),

    category:
      cleanText(
        event?.category
      ),

    title:
      cleanText(
        event?.title
      ),

    description:
      cleanText(
        event?.description
      ),

    occurredAt:
      event?.occurredAt ??
      null,

    recordedAt:
      event?.createdAt ??
      event?.occurredAt ??
      null,

    actor:
      sanitizeAuditValue(
        event?.actor ??
        {}
      ),

    source:
      sanitizeAuditValue(
        event?.source ??
        {}
      ),

    changes:
      auditChangesForEvent(
        event
      ),

    details:
      sanitizeAuditValue(
        event?.metadata ??
        {}
      ),

    auditVersion:
      Number(
        event?.auditVersion ||
        1
      ),
  };
}


async function getApplicantAuditHistory({
  applicantId,

  category = '',
  action = '',
  actorId = '',
  from = '',
  to = '',

  page = 1,
  limit = 50,

  ActivityModel =
    ApplicantActivity,
}) {
  const currentPage =
    positiveInteger(
      page,
      1
    );

  const pageSize =
    positiveInteger(
      limit,
      50,
      {
        max: 100,
      }
    );


  const filter =
    buildApplicantAuditFilter({
      applicantId,
      category,
      action,
      actorId,
      from,
      to,
    });


  const skip =
    (
      currentPage -
      1
    ) *
    pageSize;


  const [
    documents,
    total,
  ] =
    await Promise.all([
      ActivityModel
        .find(
          filter
        )
        .sort({
          occurredAt:
            -1,

          _id:
            -1,
        })
        .skip(
          skip
        )
        .limit(
          pageSize
        )
        .lean(),

      ActivityModel
        .countDocuments(
          filter
        ),
    ]);


  return {
    events:
      documents.map(
        serializeApplicantAuditEvent
      ),

    total,

    page:
      currentPage,

    limit:
      pageSize,

    pages:
      total === 0
        ? 0
        : Math.ceil(
            total /
            pageSize
          ),

    filters: {
      category:
        cleanText(
          category
        ),

      action:
        cleanText(
          action
        ),

      actorId:
        cleanText(
          actorId
        ),

      from:
        cleanText(
          from
        ),

      to:
        cleanText(
          to
        ),
    },
  };
}


module.exports = {
  auditError,
  cleanText,
  positiveInteger,
  optionalDate,
  buildApplicantAuditFilter,
  deriveLegacyAuditChanges,
  auditChangesForEvent,
  serializeApplicantAuditEvent,
  getApplicantAuditHistory,
};
