'use strict';

const mongoose = require('mongoose');

const {
  normalizeEmail,
  normalizePhone,
} = require('../utils/applicantIdentity');

const { Schema } = mongoose;

/*
|--------------------------------------------------------------------------
| Identity
|--------------------------------------------------------------------------
|
| This represents the CURRENT approved identity of the applicant.
| Original Google Form values remain inside ApplicantFormSubmission.
|
*/
const identitySchema = new Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      default: '',
      lowercase: true,
      trim: true,
    },

    normalizedEmail: {
      type: String,
      default: '',
      lowercase: true,
      trim: true,
    },

    phoneNumber: {
      type: String,
      default: '',
      trim: true,
    },

    normalizedPhone: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    _id: false,
  }
);

/*
|--------------------------------------------------------------------------
| Recruitment State
|--------------------------------------------------------------------------
|
| We intentionally do not lock the status to a final enum yet.
| The official recruitment pipeline will be defined later.
|
*/
const recruitmentSchema = new Schema(
  {
    status: {
      type: String,
      default: 'applied',
      lowercase: true,
      trim: true,
    },

    firstAppliedAt: {
      type: Date,
      default: null,
    },

    lastAppliedAt: {
      type: Date,
      default: null,
    },

    lastActivityAt: {
      type: Date,
      default: null,
    },
  },
  {
    _id: false,
  }
);

/*
|--------------------------------------------------------------------------
| Lifecycle / Archive
|--------------------------------------------------------------------------
|
| Applicants should normally be archived rather than permanently deleted.
|
*/
const lifecycleSchema = new Schema(
  {
    archived: {
      type: Boolean,
      default: false,
    },

    archivedAt: {
      type: Date,
      default: null,
    },

    archivedBy: {
      type: Schema.Types.ObjectId,
      default: null,
    },

    archiveReason: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    _id: false,
  }
);

/*
|--------------------------------------------------------------------------
| Master Applicant
|--------------------------------------------------------------------------
|
| One Applicant = one real person.
|
| One Applicant may later be connected to many immutable
| ApplicantFormSubmission records.
|
*/
const applicantSchema = new Schema(
  {
    /*
     * Human-readable code.
     *
     * We keep it optional for now because the safe code-generation
     * strategy will be implemented separately.
     */
    applicantCode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true,
    },

    identity: {
      type: identitySchema,
      required: true,
    },

    recruitment: {
      type: recruitmentSchema,
      default: () => ({}),
    },

    lifecycle: {
      type: lifecycleSchema,
      default: () => ({}),
    },

    /*
     * Increment later whenever the approved current profile changes.
     */
    profileVersion: {
      type: Number,
      min: 1,
      default: 1,
    },

    /*
     * Optional reference to the submission currently used as the
     * primary/latest approved source.
     *
     * Individual field provenance will be designed later.
     */
    latestApprovedSubmissionId: {
      type: Schema.Types.ObjectId,
      ref: 'ApplicantFormSubmission',
      default: null,
    },
  },
  {
    timestamps: true,

    collection: 'applicants',
  }
);

/*
|--------------------------------------------------------------------------
| Identity Normalization
|--------------------------------------------------------------------------
|
| Keep normalized identity fields synchronized with the approved
| display values before validation/save.
|
*/

applicantSchema.pre('validate', function normalizeApplicantIdentity(next) {
  if (this.identity) {
    this.identity.normalizedEmail = normalizeEmail(
      this.identity.email
    );

    this.identity.normalizedPhone = normalizePhone(
      this.identity.phoneNumber
    );
  }

  next();
});

/*
|--------------------------------------------------------------------------
| Initial Indexes
|--------------------------------------------------------------------------
*/

applicantSchema.index({
  'identity.normalizedEmail': 1,
});

applicantSchema.index({
  'identity.normalizedPhone': 1,
});

applicantSchema.index({
  'recruitment.status': 1,
});

applicantSchema.index({
  'lifecycle.archived': 1,
  createdAt: -1,
});

/*
|--------------------------------------------------------------------------
| Export
|--------------------------------------------------------------------------
*/

module.exports = mongoose.model(
  'Applicant',
  applicantSchema
);
