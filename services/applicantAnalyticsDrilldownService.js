'use strict';

const Applicant =
  require('../models/Applicant');

const ApplicantEvaluation =
  require('../models/ApplicantEvaluation');

const ApplicantInterview =
  require('../models/ApplicantInterview');

const ApplicantFormSubmission =
  require('../models/ApplicantFormSubmission');

const ApplicantDocument =
  require('../models/ApplicantDocument');

const {
  ApplicantDuplicateCase,
} = require(
  '../models/ApplicantDuplicateCase'
);

const {
  normalizeApplicantAnalyticsFilters,
  applicantMatchesAnalyticsFilters,
} = require(
  './analytics/applicantAnalyticsFilters'
);

const {
  PROFILE_QUALITY_FIELDS,
  buildCvApplicantIds,
} = require(
  './analytics/applicantManagementAnalytics'
);

const {
  APPLICANT_ANALYTICS_PROJECTION,
  EVALUATION_ANALYTICS_PROJECTION,
  INTERVIEW_ANALYTICS_PROJECTION,
  DOCUMENT_ANALYTICS_PROJECTION,
  DUPLICATE_ANALYTICS_PROJECTION,
  leanFind,
  serializeFilters,
} = require(
  './applicantAnalyticsService'
);


const SUBMISSION_CV_PROJECTION = [
  '_id',
  'applicantId',
  'documents.cvResume',
].join(' ');


const APPLICANT_ANALYTICS_DRILLDOWN_TYPES =
  Object.freeze([
    'missing_cv',
    'incomplete_profile',
    'draft_evaluation',
    'no_show',
    'overdue_interview',
    'no_submitted_evaluation',
    'no_interview',
    'high_confidence_duplicate',
  ]);


const DRILLDOWN_METADATA = {
  missing_cv: {
    label:
      'Applicants Missing CV',

    description:
      'Applicants without either a current active managed CV or a CV recorded in a linked Form submission.',
  },

  incomplete_profile: {
    label:
      'Incomplete Applicant Profiles',

    description:
      'Applicants missing one or more fields from the explicit Applicant data-quality definition.',
  },

  draft_evaluation: {
    label:
      'Draft Evaluations',

    description:
      'Applicants with one or more evaluation records still in draft status.',
  },

  no_show: {
    label:
      'Interview No-Shows',

    description:
      'Applicants with interview records marked as no-show.',
  },

  overdue_interview: {
    label:
      'Overdue Scheduled Interviews',

    description:
      'Applicants with interviews still marked scheduled even though their scheduled start time has passed.',
  },

  no_submitted_evaluation: {
    label:
      'Applicants Without Submitted Evaluation',

    description:
      'Applicants who do not currently have a submitted evaluation record.',
  },

  no_interview: {
    label:
      'Applicants Without Interview',

    description:
      'Applicants who do not currently have an interview record.',
  },

  high_confidence_duplicate: {
    label:
      'High-Confidence Duplicate Cases',

    description:
      'Unresolved duplicate-review cases classified with high confidence.',
  },
};


function idOf(
  value
) {
  return String(
    value ?? ''
  );
}


function text(
  value
) {
  return typeof value ===
    'string'
    ? value.trim()
    : '';
}


function validDate(
  value
) {
  if (!value) {
    return null;
  }

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  return Number.isNaN(
    date.getTime()
  )
    ? null
    : date;
}


function normalizePage(
  value
) {
  const parsed =
    Number.parseInt(
      String(value || '1'),
      10
    );

  return Number.isFinite(parsed) &&
    parsed > 0
    ? parsed
    : 1;
}


function normalizeLimit(
  value
) {
  const parsed =
    Number.parseInt(
      String(value || '50'),
      10
    );

  if (
    !Number.isFinite(parsed) ||
    parsed < 1
  ) {
    return 50;
  }

  return Math.min(
    parsed,
    100
  );
}


function buildApplicantQuery(
  filters
) {
  const query = {};

  if (
    filters.archived ===
    'false'
  ) {
    query[
      'lifecycle.archived'
    ] = {
      $ne: true,
    };
  }

  if (
    filters.archived ===
    'true'
  ) {
    query[
      'lifecycle.archived'
    ] = true;
  }

  return query;
}


function belongsToCohort(
  record,
  applicantIdSet
) {
  return applicantIdSet.has(
    idOf(
      record?.applicantId
    )
  );
}


function applicantSummary(
  applicant
) {
  if (!applicant) {
    return null;
  }

  return {
    id:
      idOf(
        applicant._id
      ),

    applicantCode:
      text(
        applicant
          .applicantCode
      ),

    fullName:
      text(
        applicant.fullName ||
        applicant
          ?.identity
          ?.fullName
      ) ||
      'Applicant',

    email:
      text(
        applicant.email ||
        applicant
          ?.identity
          ?.email
      ),

    country:
      text(
        applicant
          ?.identity
          ?.country
      ),

    city:
      text(
        applicant
          ?.identity
          ?.city
      ),

    positionTrack:
      text(
        applicant
          ?.preferences
          ?.positionTrack
      ),

    positionType:
      text(
        applicant
          ?.preferences
          ?.positionType
      ),

    status:
      text(
        applicant
          ?.recruitment
          ?.status
      ),

    firstAppliedAt:
      applicant
        ?.recruitment
        ?.firstAppliedAt ||
      applicant
        ?.createdAt ||
      null,
  };
}


function applicantMap(
  applicants
) {
  return new Map(
    applicants.map(
      applicant => [
        idOf(
          applicant._id
        ),
        applicant,
      ]
    )
  );
}


function latestDate(
  values
) {
  let latest = null;

  for (
    const value of values
  ) {
    const date =
      validDate(
        value
      );

    if (
      date &&
      (
        !latest ||
        date > latest
      )
    ) {
      latest = date;
    }
  }

  return latest
    ? latest.toISOString()
    : null;
}


function groupRecordsByApplicant({
  records,
  applicantsById,
  reason,
  getDate,
} = {}) {
  const grouped =
    new Map();

  for (
    const record of records
  ) {
    const applicantId =
      idOf(
        record?.applicantId
      );

    const applicant =
      applicantsById.get(
        applicantId
      );

    if (!applicant) {
      continue;
    }

    const current =
      grouped.get(
        applicantId
      ) || {
        applicant,
        records: [],
      };

    current.records.push(
      record
    );

    grouped.set(
      applicantId,
      current
    );
  }

  return [
    ...grouped.values(),
  ].map(
    group => ({
      kind:
        'applicant',

      applicant:
        applicantSummary(
          group.applicant
        ),

      reason,

      recordCount:
        group.records.length,

      latestAt:
        latestDate(
          group.records.map(
            record =>
              getDate
                ? getDate(
                    record
                  )
                : null
          )
        ),

      missingFields:
        [],
    })
  );
}


function sortApplicantItems(
  items
) {
  return items
    .slice()
    .sort(
      (
        left,
        right
      ) =>
        (
          left
            ?.applicant
            ?.fullName ||
          ''
        ).localeCompare(
          right
            ?.applicant
            ?.fullName ||
          ''
        )
    );
}


function paginate(
  items,
  page,
  limit
) {
  const total =
    items.length;

  const pages =
    total === 0
      ? 0
      : Math.ceil(
          total /
          limit
        );

  const safePage =
    pages === 0
      ? 1
      : Math.min(
          page,
          pages
        );

  const start =
    (
      safePage -
      1
    ) *
    limit;

  return {
    items:
      items.slice(
        start,
        start + limit
      ),

    pagination: {
      page:
        safePage,

      limit,

      total,

      pages,
    },
  };
}


async function getApplicantAnalyticsDrilldown({
  query = {},

  ApplicantModel =
    Applicant,

  EvaluationModel =
    ApplicantEvaluation,

  InterviewModel =
    ApplicantInterview,

  SubmissionModel,

  DocumentModel =
    ApplicantDocument,

  DuplicateCaseModel =
    ApplicantDuplicateCase,

  now =
    new Date(),
} = {}) {
  const resolvedSubmissionModel =
    SubmissionModel ||
    (
      ApplicantModel ===
        Applicant
        ? ApplicantFormSubmission
        : null
    );


  const type =
    text(
      query.type
    );

  if (
    !APPLICANT_ANALYTICS_DRILLDOWN_TYPES
      .includes(
        type
      )
  ) {
    const error =
      new Error(
        'Unsupported Applicant analytics drill-down type.'
      );

    error.code =
      'APPLICANT_ANALYTICS_DRILLDOWN_TYPE_INVALID';

    throw error;
  }


  const {
    type:
      ignoredType,

    page:
      rawPage,

    limit:
      rawLimit,

    ...filterQuery
  } = query;

  void ignoredType;


  const filters =
    normalizeApplicantAnalyticsFilters(
      filterQuery
    );

  const page =
    normalizePage(
      rawPage
    );

  const limit =
    normalizeLimit(
      rawLimit
    );


  const loadedApplicants =
    await leanFind(
      ApplicantModel,
      buildApplicantQuery(
        filters
      ),
      APPLICANT_ANALYTICS_PROJECTION
    );


  const applicants =
    (
      loadedApplicants ||
      []
    ).filter(
      applicant =>
        applicantMatchesAnalyticsFilters(
          applicant,
          filters
        )
    );


  const applicantIds =
    applicants.map(
      applicant =>
        applicant._id
    );

  const applicantIdSet =
    new Set(
      applicantIds.map(
        id =>
          idOf(id)
      )
    );

  const applicantsById =
    applicantMap(
      applicants
    );


  const metadata =
    DRILLDOWN_METADATA[
      type
    ];


  if (
    applicantIds.length ===
    0
  ) {
    return {
      type,
      label:
        metadata.label,
      description:
        metadata.description,
      recordCount: 0,
      applicantCount: 0,
      items: [],
      pagination: {
        page: 1,
        limit,
        total: 0,
        pages: 0,
      },
      filters:
        serializeFilters(
          filters
        ),
    };
  }


  let items = [];
  let recordCount = 0;
  let applicantCount = 0;


  if (
    type ===
    'missing_cv'
  ) {
    const [
      loadedDocuments,
      loadedSubmissions,
    ] =
      await Promise.all([
        leanFind(
          DocumentModel,
          {
            applicantId: {
              $in:
                applicantIds,
            },
          },
          DOCUMENT_ANALYTICS_PROJECTION
        ),

        resolvedSubmissionModel
          ? leanFind(
              resolvedSubmissionModel,
              {
                applicantId: {
                  $in:
                    applicantIds,
                },
              },
              SUBMISSION_CV_PROJECTION
            )
          : Promise.resolve(
              []
            ),
      ]);


    const documents =
      (
        loadedDocuments ||
        []
      ).filter(
        document =>
          belongsToCohort(
            document,
            applicantIdSet
          )
      );


    const submissions =
      (
        loadedSubmissions ||
        []
      ).filter(
        submission =>
          belongsToCohort(
            submission,
            applicantIdSet
          )
      );


    const currentCvIds =
      buildCvApplicantIds({
        documents,
        submissions,
      });


    items =
      applicants
        .filter(
          applicant =>
            !currentCvIds.has(
              idOf(
                applicant._id
              )
            )
        )
        .map(
          applicant => ({
            kind:
              'applicant',

            applicant:
              applicantSummary(
                applicant
              ),

            reason:
              'No current active CV or Form-submitted CV',

            recordCount:
              1,

            latestAt:
              null,

            missingFields:
              [],
          })
        );

    recordCount =
      items.length;

    applicantCount =
      items.length;
  }


  if (
    type ===
    'incomplete_profile'
  ) {
    items =
      applicants
        .map(
          applicant => {
            const missingFields =
              PROFILE_QUALITY_FIELDS
                .filter(
                  definition =>
                    !definition.present(
                      applicant
                    )
                )
                .map(
                  definition =>
                    definition.label
                );

            if (
              missingFields.length ===
              0
            ) {
              return null;
            }

            return {
              kind:
                'applicant',

              applicant:
                applicantSummary(
                  applicant
                ),

              reason:
                `${missingFields.length} defined profile field${
                  missingFields.length ===
                  1
                    ? ''
                    : 's'
                } missing`,

              recordCount:
                1,

              latestAt:
                null,

              missingFields,
            };
          }
        )
        .filter(Boolean);

    recordCount =
      items.length;

    applicantCount =
      items.length;
  }


  if (
    type ===
      'draft_evaluation' ||
    type ===
      'no_submitted_evaluation'
  ) {
    const evaluations =
      (
        await leanFind(
          EvaluationModel,
          {
            applicantId: {
              $in:
                applicantIds,
            },

            archived: {
              $ne:
                true,
            },
          },
          EVALUATION_ANALYTICS_PROJECTION
        ) ||
        []
      ).filter(
        evaluation =>
          evaluation
            ?.archived !==
            true &&
          belongsToCohort(
            evaluation,
            applicantIdSet
          )
      );


    if (
      type ===
      'draft_evaluation'
    ) {
      const draftRecords =
        evaluations.filter(
          evaluation =>
            evaluation
              ?.status ===
            'draft'
        );

      items =
        groupRecordsByApplicant({
          records:
            draftRecords,

          applicantsById,

          reason:
            'Evaluation still in draft',

          getDate:
            evaluation =>
              evaluation
                ?.createdAt,
        });

      recordCount =
        draftRecords.length;

      applicantCount =
        items.length;
    }


    if (
      type ===
      'no_submitted_evaluation'
    ) {
      const submittedIds =
        new Set(
          evaluations
            .filter(
              evaluation =>
                evaluation
                  ?.status ===
                'submitted'
            )
            .map(
              evaluation =>
                idOf(
                  evaluation
                    .applicantId
                )
            )
        );

      items =
        applicants
          .filter(
            applicant =>
              !submittedIds.has(
                idOf(
                  applicant._id
                )
              )
          )
          .map(
            applicant => ({
              kind:
                'applicant',

              applicant:
                applicantSummary(
                  applicant
                ),

              reason:
                'No submitted evaluation',

              recordCount:
                1,

              latestAt:
                null,

              missingFields:
                [],
            })
          );

      recordCount =
        items.length;

      applicantCount =
        items.length;
    }
  }


  if (
    type ===
      'no_show' ||
    type ===
      'overdue_interview' ||
    type ===
      'no_interview'
  ) {
    const interviews =
      (
        await leanFind(
          InterviewModel,
          {
            applicantId: {
              $in:
                applicantIds,
            },

            archived: {
              $ne:
                true,
            },
          },
          INTERVIEW_ANALYTICS_PROJECTION
        ) ||
        []
      ).filter(
        interview =>
          interview
            ?.archived !==
            true &&
          belongsToCohort(
            interview,
            applicantIdSet
          )
      );


    if (
      type ===
      'no_show'
    ) {
      const matching =
        interviews.filter(
          interview =>
            interview
              ?.status ===
            'no_show'
        );

      items =
        groupRecordsByApplicant({
          records:
            matching,

          applicantsById,

          reason:
            'Interview marked as no-show',

          getDate:
            interview =>
              interview
                ?.scheduledStart,
        });

      recordCount =
        matching.length;

      applicantCount =
        items.length;
    }


    if (
      type ===
      'overdue_interview'
    ) {
      const matching =
        interviews.filter(
          interview => {
            const scheduled =
              validDate(
                interview
                  ?.scheduledStart
              );

            return (
              interview
                ?.status ===
                'scheduled' &&
              scheduled &&
              scheduled <
                now
            );
          }
        );

      items =
        groupRecordsByApplicant({
          records:
            matching,

          applicantsById,

          reason:
            'Scheduled interview is overdue',

          getDate:
            interview =>
              interview
                ?.scheduledStart,
        });

      recordCount =
        matching.length;

      applicantCount =
        items.length;
    }


    if (
      type ===
      'no_interview'
    ) {
      const interviewedIds =
        new Set(
          interviews.map(
            interview =>
              idOf(
                interview
                  .applicantId
              )
          )
        );

      items =
        applicants
          .filter(
            applicant =>
              !interviewedIds.has(
                idOf(
                  applicant._id
                )
              )
          )
          .map(
            applicant => ({
              kind:
                'applicant',

              applicant:
                applicantSummary(
                  applicant
                ),

              reason:
                'No interview record',

              recordCount:
                1,

              latestAt:
                null,

              missingFields:
                [],
            })
          );

      recordCount =
        items.length;

      applicantCount =
        items.length;
    }
  }


  if (
    type ===
    'high_confidence_duplicate'
  ) {
    const duplicateCases =
      (
        await leanFind(
          DuplicateCaseModel,
          {
            $or: [
              {
                sourceApplicantId: {
                  $in:
                    applicantIds,
                },
              },

              {
                candidateApplicantId: {
                  $in:
                    applicantIds,
                },
              },
            ],
          },
          DUPLICATE_ANALYTICS_PROJECTION
        ) ||
        []
      ).filter(
        duplicate =>
          (
            applicantIdSet.has(
              idOf(
                duplicate
                  ?.sourceApplicantId
              )
            ) ||
            applicantIdSet.has(
              idOf(
                duplicate
                  ?.candidateApplicantId
              )
            )
          ) &&
          duplicate
            ?.status !==
            'resolved' &&
          duplicate
            ?.confidence ===
            'high'
      );


    const pairIds =
      [
        ...new Set(
          duplicateCases
            .flatMap(
              duplicate => [
                idOf(
                  duplicate
                    .sourceApplicantId
                ),

                idOf(
                  duplicate
                    .candidateApplicantId
                ),
              ]
            )
            .filter(Boolean)
        ),
      ];


    let pairApplicants =
      applicants;

    if (
      pairIds.length >
      0
    ) {
      pairApplicants =
        await leanFind(
          ApplicantModel,
          {
            _id: {
              $in:
                pairIds,
            },
          },
          APPLICANT_ANALYTICS_PROJECTION
        ) ||
        [];
    }


    const pairLookup =
      applicantMap(
        pairApplicants
      );


    items =
      duplicateCases.map(
        duplicate => ({
          kind:
            'duplicate',

          id:
            idOf(
              duplicate._id
            ),

          status:
            text(
              duplicate.status
            ),

          confidence:
            text(
              duplicate.confidence
            ),

          strongMatchCount:
            Number(
              duplicate
                .strongMatchCount ||
              0
            ),

          matchedSignals:
            duplicate
              .matchedSignals ||
            [],

          detectedAt:
            duplicate
              .detectedAt ||
            duplicate
              .createdAt ||
            null,

          sourceApplicant:
            applicantSummary(
              pairLookup.get(
                idOf(
                  duplicate
                    .sourceApplicantId
                )
              )
            ),

          candidateApplicant:
            applicantSummary(
              pairLookup.get(
                idOf(
                  duplicate
                    .candidateApplicantId
                )
              )
            ),
        })
      );


    recordCount =
      duplicateCases.length;

    applicantCount =
      pairIds.length;
  }


  if (
    type !==
    'high_confidence_duplicate'
  ) {
    items =
      sortApplicantItems(
        items
      );
  }


  const paginated =
    paginate(
      items,
      page,
      limit
    );


  return {
    type,

    label:
      metadata.label,

    description:
      metadata.description,

    recordCount,

    applicantCount,

    items:
      paginated.items,

    pagination:
      paginated
        .pagination,

    filters:
      serializeFilters(
        filters
      ),
  };
}


module.exports = {
  APPLICANT_ANALYTICS_DRILLDOWN_TYPES,
  DRILLDOWN_METADATA,
  applicantSummary,
  getApplicantAnalyticsDrilldown,
};
