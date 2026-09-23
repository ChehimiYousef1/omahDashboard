'use strict';

const mongoose = require('mongoose');

const {
  normalizeEmail,
  normalizePhone,
  canonicalizeLinkedIn,
} = require('../utils/applicantIdentity');

const {
  APPLICANT_STATUSES,
} = require('../utils/applicantStatus');

const { Schema } = mongoose;

/*
|--------------------------------------------------------------------------
| Identity
|--------------------------------------------------------------------------
|
| Current administrator-approved identity.
|
| Original submitted values remain inside ApplicantFormSubmission.
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

    whatsappNumber: {
      type: String,
      default: '',
      trim: true,
    },

    country: {
      type: String,
      default: '',
      trim: true,
    },

    city: {
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
| Education
|--------------------------------------------------------------------------
|
| Current approved educational information.
|
| Detailed historical answers remain preserved in submissions.
|
*/

const educationSchema = new Schema(
  {
    universityName: {
      type: String,
      default: '',
      trim: true,
    },

    institutionCountry: {
      type: String,
      default: '',
      trim: true,
    },

    degreeLevel: {
      type: String,
      default: '',
      trim: true,
    },

    major: {
      type: String,
      default: '',
      trim: true,
    },

    specialization: {
      type: String,
      default: '',
      trim: true,
    },

    studyStatus: {
      type: String,
      default: '',
      trim: true,
    },

    graduationDate: {
      type: Date,
      default: null,
    },

    gpa: {
      type: String,
      default: '',
      trim: true,
    },

    gradingScale: {
      type: String,
      default: '',
      trim: true,
    },

    relevantCoursework: {
      type: String,
      default: '',
      trim: true,
    },

    academicProjects: {
      type: String,
      default: '',
      trim: true,
    },

    hasCertifications: {
      type: Boolean,
      default: false,
    },

    certificateNames: {
      type: String,
      default: '',
      trim: true,
    },

    languages: {
      type: [String],
      default: [],
    },

    englishProficiency: {
      type: String,
      default: '',
      trim: true,
    },

    additionalEducation: {
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
| Position / Internship Preferences
|--------------------------------------------------------------------------
*/

const preferencesSchema = new Schema(
  {
    positionTrack: {
      type: String,
      default: '',
      trim: true,
    },

    positionType: {
      type: String,
      default: '',
      trim: true,
    },

    availableStartDate: {
      type: Date,
      default: null,
    },

    duration: {
      type: String,
      default: '',
      trim: true,
    },

    weeklyAvailability: {
      type: String,
      default: '',
      trim: true,
    },

    workingDays: {
      type: [String],
      default: [],
    },

    workingTime: {
      type: String,
      default: '',
      trim: true,
    },

    currentlyEmployed: {
      type: String,
      default: '',
      trim: true,
    },

    currentCommitment: {
      type: String,
      default: '',
      trim: true,
    },

    canCommit: {
      type: String,
      default: '',
      trim: true,
    },

    objectives: {
      type: [String],
      default: [],
    },

    universityRequired: {
      type: String,
      default: '',
      trim: true,
    },

    universityRequiredDuration: {
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
| Skills & Experience
|--------------------------------------------------------------------------
*/

const skillsSchema = new Schema(
  {
    primaryTechnical: {
      type: [String],
      default: [],
    },

    otherTechnical: {
      type: String,
      default: '',
      trim: true,
    },

    technicalExperienceLevel: {
      type: String,
      default: '',
      trim: true,
    },

    professionalExperience: {
      type: String,
      default: '',
      trim: true,
    },

    previousExperience: {
      type: String,
      default: '',
      trim: true,
    },

    previousExperienceDetails: {
      type: String,
      default: '',
      trim: true,
    },

    programmingLanguages: {
      type: [String],
      default: [],
    },

    frameworks: {
      type: [String],
      default: [],
    },

    databases: {
      type: [String],
      default: [],
    },

    cloudDevOps: {
      type: [String],
      default: [],
    },

    developmentTools: {
      type: [String],
      default: [],
    },

    softSkills: {
      type: [String],
      default: [],
    },

    dataEngineerSkills: {
      type: [String],
      default: [],
    },

    aiMlEngineerSkills: {
      type: [String],
      default: [],
    },

    dataAnalystSkills: {
      type: [String],
      default: [],
    },

    skillsToImprove: {
      type: String,
      default: '',
      trim: true,
    },

    additionalSkills: {
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
| Professional Profiles
|--------------------------------------------------------------------------
*/

const profilesSchema = new Schema(
  {
    linkedin: {
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

    github: {
      type: String,
      default: '',
      trim: true,
    },

    portfolio: {
      type: String,
      default: '',
      trim: true,
    },

    socialMedia: {
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
| Full controlled pipeline rules will be implemented in the
| Status Pipeline Management task.
|
*/

const recruitmentSchema = new Schema(
  {
    status: {
      type: String,
      enum: APPLICANT_STATUSES,
      default: 'applied',
      lowercase: true,
      trim: true,
    },

    source: {
      type: String,
      enum: [
        'google-form',
        'manual',
        'api',
        'legacy',
      ],
      default: 'google-form',
    },

    assignedRecruiterId: {
      type: String,
      default: '',
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

    tags: {
      type: [String],
      default: [],
    },
  },
  {
    _id: false,
  }
);

/*
|--------------------------------------------------------------------------
| Lifecycle
|--------------------------------------------------------------------------
|
| Normal applicant removal should use archive / soft delete.
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
      type: String,
      default: '',
      trim: true,
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
| One Applicant may have many immutable ApplicantFormSubmission records.
|
*/


const talentPoolSchema =
  new Schema(
    {
      active: {
        type:
          Boolean,

        default:
          false,
      },

      categoryId: {
        type:
          Schema.Types.ObjectId,

        ref:
          'TalentPoolCategory',

        default:
          null,
      },

      roles: {
        type: [
          {
            type:
              String,

            trim:
              true,
          },
        ],

        default:
          [],
      },

      priority: {
        type:
          String,

        enum: [
          'normal',
          'medium',
          'high',
        ],

        default:
          'normal',
      },

      ownerId: {
        type:
          String,

        trim:
          true,

        default:
          '',
      },

      source: {
        type:
          String,

        trim:
          true,

        default:
          'manual',
      },

      reason: {
        type:
          String,

        trim:
          true,

        maxlength:
          2000,

        default:
          '',
      },

      addedAt: {
        type:
          Date,

        default:
          null,
      },

      addedBy: {
        type:
          String,

        trim:
          true,

        default:
          '',
      },

      lastReviewedAt: {
        type:
          Date,

        default:
          null,
      },

      lastReviewedBy: {
        type:
          String,

        trim:
          true,

        default:
          '',
      },

      nextReviewAt: {
        type:
          Date,

        default:
          null,
      },

      removedAt: {
        type:
          Date,

        default:
          null,
      },

      removedBy: {
        type:
          String,

        trim:
          true,

        default:
          '',
      },

      removalReason: {
        type:
          String,

        trim:
          true,

        maxlength:
          2000,

        default:
          '',
      },

      restoredAt: {
        type:
          Date,

        default:
          null,
      },

      restoredBy: {
        type:
          String,

        trim:
          true,

        default:
          '',
      },
    },
    {
      _id:
        false,
    }
  );


const applicantSchema = new Schema(
  {
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

    education: {
      type: educationSchema,
      default: () => ({}),
    },

    preferences: {
      type: preferencesSchema,
      default: () => ({}),
    },

    skills: {
      type: skillsSchema,
      default: () => ({}),
    },

    profiles: {
      type: profilesSchema,
      default: () => ({}),
    },

    recruitment: {
      type: recruitmentSchema,
      default: () => ({}),
    },

    lifecycle: {
      type: lifecycleSchema,
      default: () => ({}),
    },

    talentPool: {
      type:
        talentPoolSchema,

      default:
        () => ({}),
    },


    profileVersion: {
      type: Number,
      min: 1,
      default: 1,
    },

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
| Identity / Profile Normalization
|--------------------------------------------------------------------------
*/

applicantSchema.pre(
  'validate',
  function normalizeApplicantProfile(next) {
    if (this.identity) {
      this.identity.normalizedEmail = normalizeEmail(
        this.identity.email
      );

      this.identity.normalizedPhone = normalizePhone(
        this.identity.phoneNumber
      );
    }

    if (this.profiles) {
      this.profiles.linkedinCanonical =
        canonicalizeLinkedIn(
          this.profiles.linkedin
        );
    }

    next();
  }
);

/*
|--------------------------------------------------------------------------
| Indexes
|--------------------------------------------------------------------------
|
| These are schema definitions only.
| This script does NOT run syncIndexes() against MongoDB.
|
*/

applicantSchema.index({
  'identity.normalizedEmail': 1,
});

applicantSchema.index({
  'identity.normalizedPhone': 1,
});

applicantSchema.index({
  'profiles.linkedinCanonical': 1,
});

applicantSchema.index({
  'preferences.positionTrack': 1,
});

applicantSchema.index({
  'skills.primaryTechnical': 1,
});

applicantSchema.index({
  'recruitment.status': 1,
});

applicantSchema.index({
  'lifecycle.archived': 1,
  createdAt: -1,
});


applicantSchema.index({
  'talentPool.active': 1,
  'talentPool.nextReviewAt': 1,
});

applicantSchema.index({
  'talentPool.categoryId': 1,
  'talentPool.active': 1,
});

applicantSchema.index({
  'talentPool.roles': 1,
  'talentPool.active': 1,
});

applicantSchema.index({
  'talentPool.priority': 1,
  'talentPool.active': 1,
});

applicantSchema.index({
  'talentPool.ownerId': 1,
  'talentPool.active': 1,
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
