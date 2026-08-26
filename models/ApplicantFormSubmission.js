const mongoose = require('mongoose');

const { Schema } = mongoose;

/*
|--------------------------------------------------------------------------
| Personal Information
|--------------------------------------------------------------------------
*/
const personalSchema = new Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    phoneNumber: {
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

    whatsappAvailable: {
      type: Boolean,
      default: false,
    },

    whatsappNumber: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { _id: false }
);

/*
|--------------------------------------------------------------------------
| Education & Qualifications
|--------------------------------------------------------------------------
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
    },

    academicProjects: {
      type: String,
      default: '',
    },

    hasCertifications: {
      type: Boolean,
      default: false,
    },

    certificateNames: {
      type: String,
      default: '',
    },

    languages: {
      type: [String],
      default: [],
    },

    englishProficiency: {
      type: String,
      default: '',
    },

    additionalEducation: {
      type: String,
      default: '',
    },
  },
  { _id: false }
);

/*
|--------------------------------------------------------------------------
| Internship / Position Preferences
|--------------------------------------------------------------------------
*/
const preferencesSchema = new Schema(
  {
    positionTrack: {
      type: String,
      required: true,
      trim: true,
    },

    positionType: {
      type: String,
      default: '',
    },

    availableStartDate: {
      type: Date,
      default: null,
    },

    duration: {
      type: String,
      default: '',
    },

    weeklyAvailability: {
      type: String,
      default: '',
    },

    workingDays: {
      type: [String],
      default: [],
    },

    workingTime: {
      type: String,
      default: '',
    },

    currentlyEmployed: {
      type: String,
      default: '',
    },

    currentCommitment: {
      type: String,
      default: '',
    },

    canCommit: {
      type: String,
      default: '',
    },

    objectives: {
      type: [String],
      default: [],
    },

    universityRequired: {
      type: String,
      default: '',
    },

    universityRequiredDuration: {
      type: String,
      default: '',
    },
  },
  { _id: false }
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
    },

    technicalExperienceLevel: {
      type: String,
      default: '',
    },

    professionalExperience: {
      type: String,
      default: '',
    },

    previousExperience: {
      type: String,
      default: '',
    },

    previousExperienceDetails: {
      type: String,
      default: '',
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
    },

    additionalSkills: {
      type: String,
      default: '',
    },
  },
  { _id: false }
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
    },

    github: {
      type: String,
      default: '',
    },

    portfolio: {
      type: String,
      default: '',
    },

    socialMedia: {
      type: String,
      default: '',
    },
  },
  { _id: false }
);

/*
|--------------------------------------------------------------------------
| Documents
|--------------------------------------------------------------------------
*/
const documentsSchema = new Schema(
  {
    cvResume: {
      type: String,
      default: '',
    },

    identityDocument: {
      type: String,
      default: '',
    },

    enrollmentDocument: {
      type: String,
      default: '',
    },

    degreeCertificate: {
      type: String,
      default: '',
    },

    trainingCertificates: {
      type: [String],
      default: [],
    },

    recommendationLetters: {
      type: [String],
      default: [],
    },

    portfolioWorkSamples: {
      type: [String],
      default: [],
    },

    additionalSupportingDocuments: {
      type: [String],
      default: [],
    },
  },
  { _id: false }
);

/*
|--------------------------------------------------------------------------
| Recruitment Management
|--------------------------------------------------------------------------
*/
const recruitmentSchema = new Schema(
  {
    status: {
      type: String,
      enum: [
        'applied',
        'reviewing',
        'shortlisted',
        'interview',
        'accepted',
        'rejected',
        'withdrawn',
      ],
      default: 'applied',
    },

    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: null,
    },

    notes: {
      type: String,
      default: '',
    },
  },
  { _id: false }
);

/*
|--------------------------------------------------------------------------
| Main Applicant Form Submission Schema
|--------------------------------------------------------------------------
*/
const applicantFormSubmissionSchema = new Schema(
  {
    submissionKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    /*
     * Master applicant relationship.
     *
     * Optional during migration because historical submissions
     * do not have a master Applicant record yet.
     */
    applicantId: {
      type: Schema.Types.ObjectId,
      ref: 'Applicant',
      default: null,
    },

    formVersion: {
      type: Number,
      default: 2,
    },

    source: {
      type: String,
      enum: ['google-form', 'manual', 'api'],
      default: 'google-form',
    },

    submittedAt: {
      type: Date,
      required: true,
    },

    personal: {
      type: personalSchema,
      required: true,
    },

    education: {
      type: educationSchema,
      default: () => ({}),
    },

    preferences: {
      type: preferencesSchema,
      required: true,
    },

    skills: {
      type: skillsSchema,
      default: () => ({}),
    },

    profiles: {
      type: profilesSchema,
      default: () => ({}),
    },

    documents: {
      type: documentsSchema,
      default: () => ({}),
    },

    recruitment: {
      type: recruitmentSchema,
      default: () => ({}),
    },

    /*
     * Preserve original Google Form row.
     * Very important if a field is not mapped correctly later.
     */
    rawResponse: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,

    // Explicit MongoDB collection name
    collection: 'applicant_form_submissions',
  }
);

/*
|--------------------------------------------------------------------------
| Indexes
|--------------------------------------------------------------------------
*/

applicantFormSubmissionSchema.index({
  applicantId: 1,
  submittedAt: -1,
});

applicantFormSubmissionSchema.index({
  'personal.email': 1,
  submittedAt: -1,
});

applicantFormSubmissionSchema.index({
  'preferences.positionTrack': 1,
});

applicantFormSubmissionSchema.index({
  'recruitment.status': 1,
});

applicantFormSubmissionSchema.index({
  createdAt: -1,
});

/*
|--------------------------------------------------------------------------
| Export
|--------------------------------------------------------------------------
*/

module.exports = mongoose.model(
  'ApplicantFormSubmission',
  applicantFormSubmissionSchema
);