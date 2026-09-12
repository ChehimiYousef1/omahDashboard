'use strict';

const mongoose = require('mongoose');

const { Schema } = mongoose;

const DUPLICATE_CASE_STATUSES = [
  'open',
  'under_review',
  'resolved',
];

const DUPLICATE_CASE_DECISIONS = [
  'pending',
  'same_person',
  'keep_separate',
  'not_duplicate',
  'link_submissions',
  'merge',
];

const DUPLICATE_CONFIDENCE_LEVELS = [
  'possible',
  'high',
];

const DUPLICATE_MATCH_SIGNALS = [
  'email',
  'phone',
  'linkedin',
];

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function buildPairKey(
  applicantA,
  applicantB
) {
  const first =
    String(applicantA || '').trim();

  const second =
    String(applicantB || '').trim();

  if (!first || !second) {
    throw new Error(
      'Both Applicant IDs are required.'
    );
  }

  if (first === second) {
    throw new Error(
      'An Applicant cannot be compared with itself.'
    );
  }

  return [first, second]
    .sort()
    .join(':');
}

/*
|--------------------------------------------------------------------------
| Evidence Snapshot
|--------------------------------------------------------------------------
|
| Keeps the identity evidence that existed when the duplicate case
| was detected.
|
| Applicant profiles can change later, so the review history should
| still explain why the case originally existed.
|
*/

const evidenceIdentitySchema =
  new Schema(
    {
      fullName: {
        type: String,
        default: '',
        trim: true,
      },

      normalizedEmail: {
        type: String,
        default: '',
        lowercase: true,
        trim: true,
      },

      normalizedPhone: {
        type: String,
        default: '',
        trim: true,
      },

      linkedinCanonical: {
        type: String,
        default: '',
        lowercase: true,
        trim: true,
      },
    },
    {
      _id: false,
    }
  );

/*
|--------------------------------------------------------------------------
| Resolution
|--------------------------------------------------------------------------
*/

const resolutionSchema =
  new Schema(
    {
      decision: {
        type: String,
        enum:
          DUPLICATE_CASE_DECISIONS,
        default: 'pending',
      },

      resolvedAt: {
        type: Date,
        default: null,
      },

      resolvedBy: {
        type: String,
        default: '',
        trim: true,
      },

      notes: {
        type: String,
        default: '',
        trim: true,
        maxlength: 2000,
      },

      survivorApplicantId: {
        type: Schema.Types.ObjectId,
        ref: 'Applicant',
        default: null,
      },

      mergedApplicantId: {
        type: Schema.Types.ObjectId,
        ref: 'Applicant',
        default: null,
      },
    },
    {
      _id: false,
    }
  );

/*
|--------------------------------------------------------------------------
| Applicant Duplicate Case
|--------------------------------------------------------------------------
|
| Important:
|
| - A case is only a review record.
| - Creating a case does NOT merge Applicants.
| - Creating a case does NOT delete Applicants.
| - Existing submissions remain preserved.
|
*/

const applicantDuplicateCaseSchema =
  new Schema(
    {
      pairKey: {
        type: String,
        required: true,
        trim: true,
      },

      sourceApplicantId: {
        type: Schema.Types.ObjectId,
        ref: 'Applicant',
        required: true,
      },

      candidateApplicantId: {
        type: Schema.Types.ObjectId,
        ref: 'Applicant',
        required: true,
      },

      status: {
        type: String,
        enum:
          DUPLICATE_CASE_STATUSES,
        default: 'open',
        index: true,
      },

      confidence: {
        type: String,
        enum:
          DUPLICATE_CONFIDENCE_LEVELS,
        required: true,
      },

      strongMatchCount: {
        type: Number,
        min: 1,
        max: 3,
        required: true,
      },

      matchedSignals: {
        type: [
          {
            type: String,
            enum:
              DUPLICATE_MATCH_SIGNALS,
          },
        ],
        default: [],
      },

      nameMatches: {
        type: Boolean,
        default: false,
      },

      sourceEvidence: {
        type: evidenceIdentitySchema,
        default: () => ({}),
      },

      candidateEvidence: {
        type: evidenceIdentitySchema,
        default: () => ({}),
      },

      detectedAt: {
        type: Date,
        default: Date.now,
      },

      detectedBy: {
        type: String,
        default: 'system',
        trim: true,
      },

      resolution: {
        type: resolutionSchema,
        default: () => ({}),
      },
    },
    {
      timestamps: true,
      collection:
        'applicant_duplicate_cases',
    }
  );

/*
|--------------------------------------------------------------------------
| Validation
|--------------------------------------------------------------------------
*/

applicantDuplicateCaseSchema.pre(
  'validate',
  function prepareDuplicateCase(next) {
    try {
      this.pairKey =
        buildPairKey(
          this.sourceApplicantId,
          this.candidateApplicantId
        );

      if (
        !Array.isArray(
          this.matchedSignals
        ) ||
        this.matchedSignals.length === 0
      ) {
        throw new Error(
          'At least one strong duplicate signal is required.'
        );
      }

      const uniqueSignals =
        [
          ...new Set(
            this.matchedSignals
          ),
        ];

      this.matchedSignals =
        uniqueSignals;

      this.strongMatchCount =
        uniqueSignals.length;

      next();
    } catch (error) {
      next(error);
    }
  }
);

/*
|--------------------------------------------------------------------------
| Indexes
|--------------------------------------------------------------------------
|
| pairKey is canonical:
|
| Applicant A + Applicant B
| Applicant B + Applicant A
|
| produce the same value.
|
| This prevents duplicate review cases for the same Applicant pair.
|
*/

applicantDuplicateCaseSchema.index(
  {
    pairKey: 1,
  },
  {
    unique: true,
  }
);

applicantDuplicateCaseSchema.index({
  sourceApplicantId: 1,
  status: 1,
});

applicantDuplicateCaseSchema.index({
  candidateApplicantId: 1,
  status: 1,
});

applicantDuplicateCaseSchema.index({
  status: 1,
  confidence: 1,
  updatedAt: -1,
});

/*
|--------------------------------------------------------------------------
| Model
|--------------------------------------------------------------------------
*/

const ApplicantDuplicateCase =
  mongoose.models.ApplicantDuplicateCase ||
  mongoose.model(
    'ApplicantDuplicateCase',
    applicantDuplicateCaseSchema
  );

module.exports = {
  ApplicantDuplicateCase,
  applicantDuplicateCaseSchema,

  buildPairKey,

  DUPLICATE_CASE_STATUSES,
  DUPLICATE_CASE_DECISIONS,
  DUPLICATE_CONFIDENCE_LEVELS,
  DUPLICATE_MATCH_SIGNALS,
};
