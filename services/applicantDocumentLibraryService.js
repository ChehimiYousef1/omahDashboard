'use strict';

const Applicant =
  require('../models/Applicant');

const ApplicantDocument =
  require('../models/ApplicantDocument');

const ApplicantFormSubmission =
  require(
    '../models/ApplicantFormSubmission'
  );

const {
  normalizeApplicantAnalyticsFilters,
  applicantMatchesAnalyticsFilters,
} = require(
  './analytics/applicantAnalyticsFilters'
);

const {
  leanFind,
} = require(
  './applicantAnalyticsService'
);

const {
  buildCvApplicantIds,
} = require(
  './analytics/applicantManagementAnalytics'
);


const APPLICANT_DOCUMENT_LIBRARY_CATEGORIES =
  Object.freeze([
    'cv',
    'identity_document',
    'enrollment_document',
    'degree_certificate',
    'training_certificate',
    'recommendation_letter',
    'portfolio',
    'cover_letter',
    'transcript',
    'certificate',
    'supporting_document',
    'other',
  ]);


const FORM_DOCUMENT_DEFINITIONS =
  Object.freeze([
    {
      field:
        'cvResume',

      category:
        'cv',

      label:
        'CV / Resume',

      multiple:
        false,
    },

    {
      field:
        'identityDocument',

      category:
        'identity_document',

      label:
        'Identity Document / ID Card',

      multiple:
        false,
    },

    {
      field:
        'enrollmentDocument',

      category:
        'enrollment_document',

      label:
        'Enrollment Document',

      multiple:
        false,
    },

    {
      field:
        'degreeCertificate',

      category:
        'degree_certificate',

      label:
        'Degree Certificate',

      multiple:
        false,
    },

    {
      field:
        'trainingCertificates',

      category:
        'training_certificate',

      label:
        'Training Certificate',

      multiple:
        true,
    },

    {
      field:
        'recommendationLetters',

      category:
        'recommendation_letter',

      label:
        'Recommendation Letter',

      multiple:
        true,
    },

    {
      field:
        'portfolioWorkSamples',

      category:
        'portfolio',

      label:
        'Portfolio / Work Sample',

      multiple:
        true,
    },

    {
      field:
        'additionalSupportingDocuments',

      category:
        'supporting_document',

      label:
        'Additional Supporting Document',

      multiple:
        true,
    },
  ]);


const CATEGORY_LABELS =
  Object.freeze({
    cv:
      'CV / Resume',

    identity_document:
      'Identity Document',

    enrollment_document:
      'Enrollment Document',

    degree_certificate:
      'Degree Certificate',

    training_certificate:
      'Training Certificate',

    recommendation_letter:
      'Recommendation Letter',

    portfolio:
      'Portfolio / Work Sample',

    cover_letter:
      'Cover Letter',

    transcript:
      'Transcript',

    certificate:
      'Certificate',

    supporting_document:
      'Supporting Document',

    other:
      'Other',
  });


const APPLICANT_LIBRARY_PROJECTION = [
  '_id',
  'applicantCode',
  'fullName',
  'email',

  'identity.fullName',
  'identity.email',
  'identity.country',
  'identity.city',

  'preferences.positionTrack',
  'preferences.positionType',

  'skills.primaryTechnical',

  'recruitment.status',
  'recruitment.source',
  'recruitment.firstAppliedAt',
  'recruitment.lastAppliedAt',
  'recruitment.tags',

  'createdAt',
  'lifecycle.archived',
].join(' ');


const DOCUMENT_LIBRARY_PROJECTION = [
  '_id',
  'applicantId',
  'documentGroupId',
  'documentType',
  'title',
  'version',
  'isCurrent',

  'file.originalFileName',
  'file.mimeType',
  'file.sizeBytes',

  'storage.provider',
  'storage.externalUrl',

  'source',
  'sourceSubmissionId',

  'uploadedAt',
  'createdAt',

  'lifecycle.archived',
  'lifecycle.archivedAt',
  'lifecycle.archiveReason',
].join(' ');


const SUBMISSION_LIBRARY_PROJECTION = [
  '_id',
  'applicantId',
  'submittedAt',
  'createdAt',

  'documents.cvResume',
  'documents.identityDocument',
  'documents.enrollmentDocument',
  'documents.degreeCertificate',
  'documents.trainingCertificates',
  'documents.recommendationLetters',
  'documents.portfolioWorkSamples',
  'documents.additionalSupportingDocuments',
].join(' ');


function text(
  value
) {
  return typeof value ===
    'string'
    ? value.trim()
    : '';
}


function idOf(
  value
) {
  return String(
    value ?? ''
  ).trim();
}


function normalizePage(
  value
) {
  const parsed =
    Number.parseInt(
      String(
        value || '1'
      ),
      10
    );

  return Number.isFinite(
    parsed
  ) &&
    parsed > 0
    ? parsed
    : 1;
}


function normalizeLimit(
  value
) {
  const parsed =
    Number.parseInt(
      String(
        value || '50'
      ),
      10
    );

  if (
    !Number.isFinite(
      parsed
    ) ||
    parsed < 1
  ) {
    return 50;
  }

  return Math.min(
    parsed,
    100
  );
}


function normalizeEnum({
  value,
  allowed,
  fallback,
}) {
  const normalized =
    text(
      value
    ).toLowerCase();

  return allowed.includes(
    normalized
  )
    ? normalized
    : fallback;
}


function safeExternalUrl(
  value
) {
  const raw =
    text(value);

  if (!raw) {
    return null;
  }

  /*
   * Historical Google Form imports may store
   * only a Google Drive file id.
   */
  if (
    /^[A-Za-z0-9_-]{20,100}$/
      .test(raw)
  ) {
    return (
      'https://drive.google.com/file/d/' +
      raw +
      '/view'
    );
  }

  try {
    const url =
      new URL(raw);

    if (
      url.protocol !==
        'http:' &&
      url.protocol !==
        'https:'
    ) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}


function valueList(
  value
) {
  if (
    Array.isArray(
      value
    )
  ) {
    return value
      .map(text)
      .filter(Boolean);
  }

  const single =
    text(value);

  return single
    ? [single]
    : [];
}


function dateValue(
  value
) {
  if (!value) {
    return 0;
  }

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  const time =
    date.getTime();

  return Number.isNaN(
    time
  )
    ? 0
    : time;
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
      $ne:
        true,
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


function applicantSummary(
  applicant
) {
  return {
    id:
      idOf(
        applicant
          ?._id
      ),

    applicantCode:
      text(
        applicant
          ?.applicantCode
      ),

    fullName:
      text(
        applicant
          ?.fullName ||
        applicant
          ?.identity
          ?.fullName
      ),

    email:
      text(
        applicant
          ?.email ||
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
  };
}


function managedCategory(
  document
) {
  const type =
    text(
      document
        ?.documentType
    );

  return (
    APPLICANT_DOCUMENT_LIBRARY_CATEGORIES
      .includes(type)
      ? type
      : 'other'
  );
}


function managedState(
  document
) {
  if (
    document
      ?.lifecycle
      ?.archived ===
    true
  ) {
    return 'archived';
  }

  if (
    document
      ?.isCurrent ===
    true
  ) {
    return 'current';
  }

  return 'historical';
}


function buildManagedItems({
  documents,
  applicantsById,
}) {
  return documents
    .map(
      document => {
        const applicantId =
          idOf(
            document
              ?.applicantId
          );

        const applicant =
          applicantsById.get(
            applicantId
          );

        if (!applicant) {
          return null;
        }

        const category =
          managedCategory(
            document
          );

        return {
          id:
            'managed:' +
            idOf(
              document._id
            ),

          origin:
            'managed',

          state:
            managedState(
              document
            ),

          category,

          categoryLabel:
            CATEGORY_LABELS[
              category
            ] ||
            category,

          title:
            text(
              document.title
            ) ||
            CATEGORY_LABELS[
              category
            ] ||
            'Document',

          fileName:
            text(
              document
                ?.file
                ?.originalFileName
            ),

          mimeType:
            text(
              document
                ?.file
                ?.mimeType
            ),

          sizeBytes:
            Number(
              document
                ?.file
                ?.sizeBytes ||
              0
            ),

          date:
            document
              ?.uploadedAt ||
            document
              ?.createdAt ||
            null,

          applicant:
            applicantSummary(
              applicant
            ),

          managed: {
            documentId:
              idOf(
                document._id
              ),

            documentGroupId:
              text(
                document
                  ?.documentGroupId
              ),

            documentType:
              text(
                document
                  ?.documentType
              ),

            source:
              text(
                document
                  ?.source
              ),

            version:
              Number(
                document
                  ?.version ||
                1
              ),

            isCurrent:
              document
                ?.isCurrent ===
                true,

            archived:
              document
                ?.lifecycle
                ?.archived ===
                true,

            archiveReason:
              text(
                document
                  ?.lifecycle
                  ?.archiveReason
              ),
          },

          form: null,

          available:
            true,
        };
      }
    )
    .filter(Boolean);
}


function buildFormItems({
  submissions,
  applicantsById,
  managedCurrentExternalUrls,
}) {
  const seenUrls =
    new Set();

  const result = [];

  const ordered =
    submissions
      .slice()
      .sort(
        (
          left,
          right
        ) =>
          dateValue(
            right
              ?.submittedAt ||
            right
              ?.createdAt
          ) -
          dateValue(
            left
              ?.submittedAt ||
            left
              ?.createdAt
          )
      );


  for (
    const submission
    of ordered
  ) {
    const applicantId =
      idOf(
        submission
          ?.applicantId
      );

    const applicant =
      applicantsById.get(
        applicantId
      );

    if (!applicant) {
      continue;
    }


    for (
      const definition
      of FORM_DOCUMENT_DEFINITIONS
    ) {
      const values =
        valueList(
          submission
            ?.documents
            ?.[
              definition.field
            ]
        );

      values.forEach(
        (
          rawValue,
          index
        ) => {
          const externalUrl =
            safeExternalUrl(
              rawValue
            );

          const externalUrlKey =
            externalUrl
              ? (
                  applicantId +
                  '|' +
                  externalUrl
                )
              : '';

          /*
           * If this exact external Form file
           * already exists as the active current
           * managed document, do not duplicate it
           * in the central library.
           */
          if (
            externalUrl &&
            managedCurrentExternalUrls
              .has(
                externalUrlKey
              )
          ) {
            return;
          }

          /*
           * Repeated submissions can carry the
           * exact same attachment. Present it once.
           */
          if (
            externalUrl &&
            seenUrls.has(
              externalUrlKey
            )
          ) {
            return;
          }

          if (externalUrl) {
            seenUrls.add(
              externalUrlKey
            );
          }

          const title =
            definition.multiple &&
            values.length > 1
              ? (
                  definition.label +
                  ' ' +
                  (index + 1)
                )
              : definition.label;

          result.push({
            id:
              [
                'form',
                idOf(
                  submission._id
                ),
                definition.field,
                index,
              ].join(':'),

            origin:
              'form_submission',

            state:
              'submitted',

            category:
              definition.category,

            categoryLabel:
              CATEGORY_LABELS[
                definition.category
              ] ||
              definition.label,

            title,

            fileName:
              '',

            mimeType:
              '',

            sizeBytes:
              0,

            date:
              submission
                ?.submittedAt ||
              submission
                ?.createdAt ||
              null,

            applicant:
              applicantSummary(
                applicant
              ),

            managed:
              null,

            form: {
              submissionId:
                idOf(
                  submission._id
                ),

              field:
                definition.field,

              externalUrl,

              readOnly:
                true,
            },

            available:
              Boolean(
                externalUrl
              ),
          });
        }
      );
    }
  }


  return result;
}


function itemMatchesState(
  item,
  state
) {
  if (
    state ===
    'all'
  ) {
    return true;
  }

  /*
   * Original Form documents are immutable
   * source records, so they participate in
   * the normal current library view.
   */
  if (
    state ===
    'current'
  ) {
    return (
      item.origin ===
        'form_submission' ||
      item.state ===
        'current'
    );
  }

  return (
    item.state ===
    state
  );
}


function itemMatchesDocumentFilters(
  item,
  {
    origin,
    category,
    state,
    fileQ,
  }
) {
  if (
    origin !==
      'all' &&
    item.origin !==
      origin
  ) {
    return false;
  }

  if (
    category !==
      'all' &&
    item.category !==
      category
  ) {
    return false;
  }

  if (
    !itemMatchesState(
      item,
      state
    )
  ) {
    return false;
  }

  if (fileQ) {
    const haystack =
      [
        item.title,
        item.fileName,
        item.categoryLabel,
        item
          ?.managed
          ?.source,
      ]
        .map(text)
        .join(' ')
        .toLowerCase();

    if (
      !haystack.includes(
        fileQ
      )
    ) {
      return false;
    }
  }

  return true;
}


function breakdown(
  items,
  getKey
) {
  const counts =
    new Map();

  for (
    const item
    of items
  ) {
    const key =
      text(
        getKey(
          item
        )
      ) ||
      'unknown';

    counts.set(
      key,
      (
        counts.get(
          key
        ) ||
        0
      ) + 1
    );
  }

  return Array.from(
    counts.entries()
  )
    .map(
      ([
        key,
        count,
      ]) => ({
        key,
        label:
          CATEGORY_LABELS[
            key
          ] ||
          key,
        count,
      })
    )
    .sort(
      (
        left,
        right
      ) =>
        right.count -
        left.count ||
        left.label.localeCompare(
          right.label
        )
    );
}


async function getApplicantDocumentLibrary({
  query = {},

  ApplicantModel =
    Applicant,

  DocumentModel =
    ApplicantDocument,

  SubmissionModel =
    ApplicantFormSubmission,
} = {}) {
  const {
    page:
      rawPage,

    limit:
      rawLimit,

    origin:
      rawOrigin,

    category:
      rawCategory,

    state:
      rawState,

    fileQ:
      rawFileQ,

    ...cohortQuery
  } = query;


  const filters =
    normalizeApplicantAnalyticsFilters(
      cohortQuery
    );


  const page =
    normalizePage(
      rawPage
    );

  const limit =
    normalizeLimit(
      rawLimit
    );

  const origin =
    normalizeEnum({
      value:
        rawOrigin,

      allowed: [
        'all',
        'managed',
        'form_submission',
      ],

      fallback:
        'all',
    });

  const categoryCandidate =
    text(
      rawCategory
    ).toLowerCase();

  const category =
    categoryCandidate ===
      'all' ||
    APPLICANT_DOCUMENT_LIBRARY_CATEGORIES
      .includes(
        categoryCandidate
      )
      ? (
          categoryCandidate ||
          'all'
        )
      : 'all';

  const state =
    normalizeEnum({
      value:
        rawState,

      allowed: [
        'current',
        'historical',
        'archived',
        'all',
      ],

      fallback:
        'current',
    });

  const fileQ =
    text(
      rawFileQ
    ).toLowerCase();


  const loadedApplicants =
    await leanFind(
      ApplicantModel,
      buildApplicantQuery(
        filters
      ),
      APPLICANT_LIBRARY_PROJECTION
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
        idOf
      )
    );


  const applicantsById =
    new Map(
      applicants.map(
        applicant => [
          idOf(
            applicant._id
          ),
          applicant,
        ]
      )
    );


  if (
    applicantIds.length ===
    0
  ) {
    return {
      summary: {
        totalApplicants:
          0,
        applicantsWithAnyDocument:
          0,
        applicantsWithoutAnyDocument:
          0,
        applicantsWithCv:
          0,
        applicantsMissingCv:
          0,

        totalManagedVersions:
          0,
        managedCurrent:
          0,
        managedHistorical:
          0,
        managedArchived:
          0,
        formSubmitted:
          0,
        currentInventoryFiles:
          0,
      },

      items: [],

      pagination: {
        page: 1,
        limit,
        total: 0,
        pages: 0,
      },

      breakdowns: {
        categories: [],
        origins: [],
        managedSources: [],
      },

      filterOptions: {
        categories:
          APPLICANT_DOCUMENT_LIBRARY_CATEGORIES,
        origins: [
          'all',
          'managed',
          'form_submission',
        ],
        states: [
          'current',
          'historical',
          'archived',
          'all',
        ],
      },

      filters: {
        ...filters,
        origin,
        category:
          category ||
          'all',
        state,
        fileQ,
      },
    };
  }


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

        DOCUMENT_LIBRARY_PROJECTION
      ),

      leanFind(
        SubmissionModel,

        {
          applicantId: {
            $in:
              applicantIds,
          },
        },

        SUBMISSION_LIBRARY_PROJECTION
      ),
    ]);


  const documents =
    (
      loadedDocuments ||
      []
    ).filter(
      document =>
        applicantIdSet.has(
          idOf(
            document
              ?.applicantId
          )
        )
    );


  const submissions =
    (
      loadedSubmissions ||
      []
    ).filter(
      submission =>
        applicantIdSet.has(
          idOf(
            submission
              ?.applicantId
          )
        )
    );


  const managedCurrentExternalUrls =
    new Set(
      documents
        .filter(
          document =>
            document
              ?.isCurrent ===
              true &&
            document
              ?.lifecycle
              ?.archived !==
              true
        )
        .map(
          document => {
            const externalUrl =
              safeExternalUrl(
                document
                  ?.storage
                  ?.externalUrl
              );

            return externalUrl
              ? (
                  idOf(
                    document
                      ?.applicantId
                  ) +
                  '|' +
                  externalUrl
                )
              : '';
          }
        )
        .filter(Boolean)
    );


  const managedItems =
    buildManagedItems({
      documents,
      applicantsById,
    });


  const formItems =
    buildFormItems({
      submissions,
      applicantsById,
      managedCurrentExternalUrls,
    });


  const currentManagedItems =
    managedItems.filter(
      item =>
        item.state ===
        'current'
    );


  const currentInventoryItems =
    [
      ...currentManagedItems,
      ...formItems,
    ];


  const applicantsWithAnyDocument =
    new Set(
      currentInventoryItems
        .map(
          item =>
            item
              ?.applicant
              ?.id
        )
        .filter(Boolean)
    );


  const cvApplicantIds =
    buildCvApplicantIds({
      documents,
      submissions,
    });


  const allItems =
    [
      ...managedItems,
      ...formItems,
    ];


  const filteredItems =
    allItems
      .filter(
        item =>
          itemMatchesDocumentFilters(
            item,
            {
              origin,
              category:
                category ||
                'all',
              state,
              fileQ,
            }
          )
      )
      .sort(
        (
          left,
          right
        ) =>
          dateValue(
            right.date
          ) -
          dateValue(
            left.date
          ) ||
          left.title.localeCompare(
            right.title
          )
      );


  const total =
    filteredItems.length;

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
    summary: {
      totalApplicants:
        applicants.length,

      applicantsWithAnyDocument:
        applicantsWithAnyDocument
          .size,

      applicantsWithoutAnyDocument:
        applicants.length -
        applicantsWithAnyDocument
          .size,

      applicantsWithCv:
        applicants.filter(
          applicant =>
            cvApplicantIds.has(
              idOf(
                applicant._id
              )
            )
        ).length,

      applicantsMissingCv:
        applicants.filter(
          applicant =>
            !cvApplicantIds.has(
              idOf(
                applicant._id
              )
            )
        ).length,

      totalManagedVersions:
        managedItems.length,

      managedCurrent:
        managedItems.filter(
          item =>
            item.state ===
            'current'
        ).length,

      managedHistorical:
        managedItems.filter(
          item =>
            item.state ===
            'historical'
        ).length,

      managedArchived:
        managedItems.filter(
          item =>
            item.state ===
            'archived'
        ).length,

      formSubmitted:
        formItems.length,

      currentInventoryFiles:
        currentInventoryItems
          .length,
    },


    items:
      filteredItems.slice(
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


    breakdowns: {
      categories:
        breakdown(
          currentInventoryItems,
          item =>
            item.category
        ),

      origins:
        breakdown(
          currentInventoryItems,
          item =>
            item.origin
        ),

      managedSources:
        breakdown(
          currentManagedItems,
          item =>
            item
              ?.managed
              ?.source
        ),
    },


    filterOptions: {
      categories:
        APPLICANT_DOCUMENT_LIBRARY_CATEGORIES,

      origins: [
        'all',
        'managed',
        'form_submission',
      ],

      states: [
        'current',
        'historical',
        'archived',
        'all',
      ],
    },


    filters: {
      ...filters,
      origin,
      category:
        category ||
        'all',
      state,
      fileQ,
    },
  };
}


module.exports = {
  APPLICANT_DOCUMENT_LIBRARY_CATEGORIES,
  FORM_DOCUMENT_DEFINITIONS,
  safeExternalUrl,
  buildManagedItems,
  buildFormItems,
  getApplicantDocumentLibrary,
};
