'use strict';

const {
  ApplicantDuplicateCase,
  buildPairKey,
  DUPLICATE_CASE_STATUSES,
} = require('../models/ApplicantDuplicateCase');

const Applicant =
  require('../models/Applicant');

const {
  compareApplicantIdentity,
} = require('./applicantDuplicateService');

/*
|--------------------------------------------------------------------------
| Service Error
|--------------------------------------------------------------------------
*/

function serviceError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

/*
|--------------------------------------------------------------------------
| Evidence Snapshot
|--------------------------------------------------------------------------
*/

function buildEvidenceSnapshot(record = {}) {
  const identity =
    record.identity ||
    record.personal ||
    {};

  const profiles =
    record.profiles || {};

  return {
    fullName:
      String(
        identity.fullName || ''
      ).trim(),

    normalizedEmail:
      String(
        identity.normalizedEmail ||
        identity.email ||
        ''
      )
        .trim()
        .toLowerCase(),

    normalizedPhone:
      String(
        identity.normalizedPhone ||
        identity.phoneNumber ||
        ''
      ).trim(),

    linkedinCanonical:
      String(
        profiles.linkedinCanonical ||
        profiles.linkedin ||
        ''
      )
        .trim()
        .toLowerCase(),
  };
}

/*
|--------------------------------------------------------------------------
| Build Duplicate Case
|--------------------------------------------------------------------------
|
| PURE:
| - no MongoDB access
| - no writes
| - no merge
|
*/

function buildDuplicateCaseData({
  sourceApplicant,
  candidateApplicant,
  detectedBy = 'system',
}) {
  if (
    !sourceApplicant ||
    !sourceApplicant._id
  ) {
    throw serviceError(
      'SOURCE_APPLICANT_REQUIRED',
      'Source Applicant is required.'
    );
  }

  if (
    !candidateApplicant ||
    !candidateApplicant._id
  ) {
    throw serviceError(
      'CANDIDATE_APPLICANT_REQUIRED',
      'Candidate Applicant is required.'
    );
  }

  const comparison =
    compareApplicantIdentity(
      sourceApplicant,
      candidateApplicant
    );

  if (
    !comparison.isPossibleDuplicate
  ) {
    throw serviceError(
      'NOT_DUPLICATE_CANDIDATE',
      'Applicants do not share a strong duplicate signal.'
    );
  }

  return {
    pairKey:
      buildPairKey(
        sourceApplicant._id,
        candidateApplicant._id
      ),

    sourceApplicantId:
      sourceApplicant._id,

    candidateApplicantId:
      candidateApplicant._id,

    status:
      'open',

    confidence:
      comparison.confidence,

    strongMatchCount:
      comparison.strongMatchCount,

    matchedSignals:
      comparison.matchedSignals,

    nameMatches:
      comparison.nameMatches,

    sourceEvidence:
      buildEvidenceSnapshot(
        sourceApplicant
      ),

    candidateEvidence:
      buildEvidenceSnapshot(
        candidateApplicant
      ),

    detectedAt:
      new Date(),

    detectedBy:
      String(
        detectedBy || 'system'
      ).trim() || 'system',
  };
}

/*
|--------------------------------------------------------------------------
| Find Existing Case
|--------------------------------------------------------------------------
*/

async function findDuplicateCase({
  sourceApplicantId,
  candidateApplicantId,
  DuplicateCaseModel =
    ApplicantDuplicateCase,
}) {
  const pairKey =
    buildPairKey(
      sourceApplicantId,
      candidateApplicantId
    );

  return DuplicateCaseModel
    .findOne({
      pairKey,
    })
    .lean();
}

/*
|--------------------------------------------------------------------------
| Create Or Reuse Duplicate Case
|--------------------------------------------------------------------------
|
| Important:
|
| Existing cases are reused.
|
| Especially:
| - keep_separate
| - not_duplicate
| - merge
|
| are NEVER automatically reopened.
|
*/

async function createOrReuseDuplicateCase({
  sourceApplicant,
  candidateApplicant,
  detectedBy = 'system',
  DuplicateCaseModel =
    ApplicantDuplicateCase,
}) {
  const data =
    buildDuplicateCaseData({
      sourceApplicant,
      candidateApplicant,
      detectedBy,
    });

  const existing =
    await DuplicateCaseModel
      .findOne({
        pairKey: data.pairKey,
      })
      .lean();

  if (existing) {
    return {
      created: false,
      duplicateCase: existing,
    };
  }

  try {
    const created =
      await DuplicateCaseModel.create(
        data
      );

    return {
      created: true,
      duplicateCase:
        typeof created.toObject ===
        'function'
          ? created.toObject()
          : created,
    };
  } catch (error) {
    /*
     * Protect against concurrent scans creating
     * the same canonical pair simultaneously.
     */
    if (
      error &&
      error.code === 11000
    ) {
      const concurrentExisting =
        await DuplicateCaseModel
          .findOne({
            pairKey:
              data.pairKey,
          })
          .lean();

      if (concurrentExisting) {
        return {
          created: false,
          duplicateCase:
            concurrentExisting,
        };
      }
    }

    throw error;
  }
}

/*
|--------------------------------------------------------------------------
| Duplicate Review Management
|--------------------------------------------------------------------------
|
| Administrative review only.
|
| IMPORTANT:
| - resolving a case does NOT merge Applicants
| - resolving a case does NOT delete Applicants
| - resolving a case does NOT move submissions
|
*/

const ADMIN_DUPLICATE_DECISIONS =
  Object.freeze([
    'same_person',
    'not_duplicate',
    'keep_separate',
  ]);


function normalizeDuplicateReviewDecision(
  decision
) {
  const normalized =
    String(decision || '')
      .trim()
      .toLowerCase();

  if (
    !ADMIN_DUPLICATE_DECISIONS
      .includes(normalized)
  ) {
    throw serviceError(
      'INVALID_DUPLICATE_DECISION',
      'Duplicate decision must be same_person, not_duplicate, or keep_separate.'
    );
  }

  return normalized;
}


function normalizeDuplicateStatusFilter(
  status = 'open'
) {
  const normalized =
    String(status || 'open')
      .trim()
      .toLowerCase();

  if (normalized === 'all') {
    return null;
  }

  if (
    !DUPLICATE_CASE_STATUSES
      .includes(normalized)
  ) {
    throw serviceError(
      'INVALID_DUPLICATE_STATUS',
      'Duplicate status must be open, under_review, resolved, or all.'
    );
  }

  return normalized;
}


function parseDuplicatePage(
  value,
  fallback = 1
) {
  const parsed =
    Number.parseInt(
      String(value || ''),
      10
    );

  if (
    !Number.isFinite(parsed) ||
    parsed < 1
  ) {
    return fallback;
  }

  return parsed;
}


function parseDuplicateLimit(
  value,
  fallback = 50
) {
  const parsed =
    Number.parseInt(
      String(value || ''),
      10
    );

  if (
    !Number.isFinite(parsed) ||
    parsed < 1
  ) {
    return fallback;
  }

  return Math.min(
    parsed,
    100
  );
}


function buildDuplicateResolutionUpdate({
  decision,
  notes = '',
  resolvedBy,
  resolvedAt = new Date(),
}) {
  const normalizedDecision =
    normalizeDuplicateReviewDecision(
      decision
    );

  const normalizedNotes =
    String(notes || '').trim();

  if (
    normalizedNotes.length > 2000
  ) {
    throw serviceError(
      'DUPLICATE_NOTES_TOO_LONG',
      'Duplicate resolution notes cannot exceed 2000 characters.'
    );
  }

  const reviewer =
    String(
      resolvedBy || ''
    ).trim();

  if (!reviewer) {
    throw serviceError(
      'DUPLICATE_REVIEWER_REQUIRED',
      'Duplicate resolution requires a reviewer.'
    );
  }

  return {
    status:
      'resolved',

    'resolution.decision':
      normalizedDecision,

    'resolution.resolvedAt':
      resolvedAt,

    'resolution.resolvedBy':
      reviewer,

    'resolution.notes':
      normalizedNotes,

    /*
     * Explicitly remain null.
     *
     * A duplicate review decision is NOT
     * an Applicant merge operation.
     */
    'resolution.survivorApplicantId':
      null,

    'resolution.mergedApplicantId':
      null,
  };
}


async function hydrateDuplicateCases({
  duplicateCases,
  ApplicantModel = Applicant,
}) {
  const cases =
    Array.isArray(duplicateCases)
      ? duplicateCases
      : [];

  const applicantIds =
    [
      ...new Set(
        cases
          .flatMap(
            (duplicateCase) => [
              duplicateCase
                .sourceApplicantId,
              duplicateCase
                .candidateApplicantId,
            ]
          )
          .filter(Boolean)
          .map(String)
      ),
    ];

  if (
    applicantIds.length === 0
  ) {
    return cases.map(
      (duplicateCase) => ({
        ...duplicateCase,

        sourceApplicant:
          null,

        candidateApplicant:
          null,
      })
    );
  }

  const applicants =
    await ApplicantModel
      .find({
        _id: {
          $in:
            applicantIds,
        },
      })
      .lean();

  const applicantMap =
    new Map(
      applicants.map(
        (applicant) => [
          String(
            applicant._id
          ),
          applicant,
        ]
      )
    );

  return cases.map(
    (duplicateCase) => ({
      ...duplicateCase,

      sourceApplicant:
        applicantMap.get(
          String(
            duplicateCase
              .sourceApplicantId
          )
        ) || null,

      candidateApplicant:
        applicantMap.get(
          String(
            duplicateCase
              .candidateApplicantId
          )
        ) || null,
    })
  );
}


async function listDuplicateCases({
  status = 'open',
  applicantId = '',
  page = 1,
  limit = 50,
  DuplicateCaseModel =
    ApplicantDuplicateCase,
  ApplicantModel =
    Applicant,
}) {
  const normalizedStatus =
    normalizeDuplicateStatusFilter(
      status
    );

  const normalizedPage =
    parseDuplicatePage(
      page
    );

  const normalizedLimit =
    parseDuplicateLimit(
      limit
    );

  const filter = {};

  if (normalizedStatus) {
    filter.status =
      normalizedStatus;
  }

  const normalizedApplicantId =
    String(
      applicantId || ''
    ).trim();

  if (normalizedApplicantId) {
    filter.$or = [
      {
        sourceApplicantId:
          normalizedApplicantId,
      },
      {
        candidateApplicantId:
          normalizedApplicantId,
      },
    ];
  }

  const skip =
    (
      normalizedPage - 1
    ) *
    normalizedLimit;

  const [
    duplicateCases,
    total,
  ] =
    await Promise.all([
      DuplicateCaseModel
        .find(filter)
        .sort({
          status: 1,
          confidence: -1,
          detectedAt: -1,
          updatedAt: -1,
        })
        .skip(skip)
        .limit(
          normalizedLimit
        )
        .lean(),

      DuplicateCaseModel
        .countDocuments(
          filter
        ),
    ]);

  const hydrated =
    await hydrateDuplicateCases({
      duplicateCases,
      ApplicantModel,
    });

  return {
    duplicateCases:
      hydrated,

    pagination: {
      page:
        normalizedPage,

      limit:
        normalizedLimit,

      total,

      pages:
        total === 0
          ? 0
          : Math.ceil(
              total /
              normalizedLimit
            ),
    },

    filters: {
      status:
        normalizedStatus ||
        'all',

      applicantId:
        normalizedApplicantId,
    },
  };
}


async function getDuplicateCase({
  duplicateCaseId,
  DuplicateCaseModel =
    ApplicantDuplicateCase,
  ApplicantModel =
    Applicant,
}) {
  const duplicateCase =
    await DuplicateCaseModel
      .findById(
        duplicateCaseId
      )
      .lean();

  if (!duplicateCase) {
    throw serviceError(
      'DUPLICATE_CASE_NOT_FOUND',
      'Duplicate case was not found.'
    );
  }

  const hydrated =
    await hydrateDuplicateCases({
      duplicateCases: [
        duplicateCase,
      ],
      ApplicantModel,
    });

  return hydrated[0];
}


function buildDuplicateResolutionAuditChanges({
  previous,
  updated,
}) {
  const changes = [];

  const beforeStatus =
    String(
      previous?.status ??
      ''
    ).trim() || null;

  const afterStatus =
    String(
      updated?.status ??
      ''
    ).trim() || null;

  if (
    beforeStatus !==
    afterStatus
  ) {
    changes.push({
      field:
        'duplicate.status',

      label:
        'Duplicate review status',

      before:
        beforeStatus,

      after:
        afterStatus,
    });
  }


  const beforeDecision =
    String(
      previous
        ?.resolution
        ?.decision ??
      ''
    ).trim() || null;

  const afterDecision =
    String(
      updated
        ?.resolution
        ?.decision ??
      ''
    ).trim() || null;

  if (
    beforeDecision !==
    afterDecision
  ) {
    changes.push({
      field:
        'duplicate.resolution.decision',

      label:
        'Duplicate review decision',

      before:
        beforeDecision,

      after:
        afterDecision,
    });
  }


  return changes;
}


async function resolveDuplicateCase({
  duplicateCaseId,
  decision,
  notes = '',
  resolvedBy,

  includeAuditResult =
    false,

  DuplicateCaseModel =
    ApplicantDuplicateCase,

  ApplicantModel =
    Applicant,
}) {
  const update =
    buildDuplicateResolutionUpdate({
      decision,
      notes,
      resolvedBy,
    });


  const filter = {
    _id:
      duplicateCaseId,

    status: {
      $ne:
        'resolved',
    },
  };


  /*
   * Preserve the original contract and
   * query behavior for existing callers.
   */
  if (!includeAuditResult) {
    const updated =
      await DuplicateCaseModel
        .findOneAndUpdate(
          filter,
          {
            $set:
              update,
          },
          {
            new:
              true,

            runValidators:
              true,
          }
        )
        .lean();


    if (!updated) {
      const existing =
        await DuplicateCaseModel
          .findById(
            duplicateCaseId
          )
          .lean();

      if (!existing) {
        throw serviceError(
          'DUPLICATE_CASE_NOT_FOUND',
          'Duplicate case was not found.'
        );
      }

      throw serviceError(
        'DUPLICATE_CASE_ALREADY_RESOLVED',
        'Duplicate case has already been resolved.'
      );
    }


    const hydrated =
      await hydrateDuplicateCases({
        duplicateCases: [
          updated,
        ],

        ApplicantModel,
      });


    return hydrated[0];
  }


  /*
   * Audit mode requests the atomic
   * pre-update document.
   *
   * The resolved document is then read
   * back for the existing hydrated HTTP
   * response contract.
   */
  const previous =
    await DuplicateCaseModel
      .findOneAndUpdate(
        filter,
        {
          $set:
            update,
        },
        {
          new:
            false,

          runValidators:
            true,
        }
      )
      .lean();


  if (!previous) {
    const existing =
      await DuplicateCaseModel
        .findById(
          duplicateCaseId
        )
        .lean();

    if (!existing) {
      throw serviceError(
        'DUPLICATE_CASE_NOT_FOUND',
        'Duplicate case was not found.'
      );
    }

    throw serviceError(
      'DUPLICATE_CASE_ALREADY_RESOLVED',
      'Duplicate case has already been resolved.'
    );
  }


  const updated =
    await DuplicateCaseModel
      .findById(
        duplicateCaseId
      )
      .lean();


  if (!updated) {
    throw serviceError(
      'DUPLICATE_CASE_AUDIT_READ_FAILED',
      'Resolved duplicate case could not be reloaded for Audit.'
    );
  }


  const hydrated =
    await hydrateDuplicateCases({
      duplicateCases: [
        updated,
      ],

      ApplicantModel,
    });


  const duplicateCase =
    hydrated[0];


  return {
    duplicateCase,

    auditChanges:
      buildDuplicateResolutionAuditChanges({
        previous,
        updated,
      }),

    auditMetadata: {
      notesProvided:
        Boolean(
          String(
            update[
              'resolution.notes'
            ] ||
            ''
          ).trim()
        ),
    },
  };
}

module.exports = {
  serviceError,
  buildEvidenceSnapshot,
  buildDuplicateCaseData,
  findDuplicateCase,
  createOrReuseDuplicateCase,

  ADMIN_DUPLICATE_DECISIONS,
  normalizeDuplicateReviewDecision,
  normalizeDuplicateStatusFilter,
  buildDuplicateResolutionUpdate,
  buildDuplicateResolutionAuditChanges,
  hydrateDuplicateCases,
  listDuplicateCases,
  getDuplicateCase,
  resolveDuplicateCase,
};
