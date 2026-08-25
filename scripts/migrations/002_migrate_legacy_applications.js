require('dotenv').config({ quiet: true });

const mongoose = require('mongoose');

const Application = require('../../models/Application');
const ApplicantFormSubmission =
  require('../../models/ApplicantFormSubmission');

function text(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function list(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map(item => text(item))
      .filter(Boolean);
  }

  return text(value)
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function getExtra(extraFields, ...names) {
  if (!extraFields || typeof extraFields !== 'object') {
    return '';
  }

  const normalizedEntries = Object.entries(extraFields).map(
    ([key, value]) => [
      String(key).trim().toLowerCase(),
      value,
    ]
  );

  for (const name of names) {
    const normalizedName = name.toLowerCase();

    const found = normalizedEntries.find(
      ([key]) => key === normalizedName
    );

    if (found) {
      return found[1];
    }
  }

  return '';
}

function parseLegacyDate(value) {
  if (!value) return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  const raw = String(value).trim();

  // DD/MM/YYYY
  const match = raw.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
  );

  if (match) {
    const [, day, month, year] = match;

    const parsed = new Date(
      Number(year),
      Number(month) - 1,
      Number(day)
    );

    return Number.isNaN(parsed.getTime())
      ? null
      : parsed;
  }

  const parsed = new Date(raw);

  return Number.isNaN(parsed.getTime())
    ? null
    : parsed;
}

function mapStatus(status) {
  const value = text(status).toLowerCase();

  switch (value) {
    case 'reviewed':
      return 'reviewing';

    case 'hired':
      return 'accepted';

    case 'interview':
      return 'interview';

    case 'rejected':
      return 'rejected';

    case 'applied':
    default:
      return 'applied';
  }
}

function migrateRecord(old) {
  const extra = old.extraFields || {};

  const graduationValue = getExtra(
    extra,
    'graduation date(expected)',
    'graduation date',
    'expected graduation date'
  );

  const degreeDocument = getExtra(
    extra,
    'degree document',
    'degree certificate'
  );

  return {
    /*
     * Deterministic legacy identifier.
     * Running this migration again will not duplicate records.
     */
    submissionKey: `legacy:${old._id.toString()}`,

    formVersion: 1,

    source: 'google-form',

    submittedAt:
      parseLegacyDate(old.appliedDate) || null,

    personal: {
      fullName: text(old.name),
      email: text(old.email).toLowerCase(),
      phoneNumber: text(old.phone),

      country: text(
        getExtra(extra, 'country')
      ),

      city: '',

      whatsappAvailable: null,
      whatsappNumber: '',
    },

    education: {
      universityName: text(old.education),

      institutionCountry: '',

      degreeLevel: '',

      major: text(
        getExtra(
          extra,
          'degree program',
          'degree program / major',
          'major'
        )
      ),

      specialization: '',

      studyStatus: '',

      graduationDate:
        parseLegacyDate(graduationValue),

      gpa: '',
      gradingScale: '',
      relevantCoursework: '',
      academicProjects: '',

      hasCertifications: null,

      certificateNames: '',

      languages: [],

      englishProficiency: '',

      additionalEducation: '',
    },

    preferences: {
      positionTrack: text(old.jobTitle),

      positionType: '',

      availableStartDate: null,

      duration: '',

      weeklyAvailability: '',

      workingDays: [],

      workingTime: '',

      currentlyEmployed: '',

      currentCommitment: '',

      canCommit: '',

      objectives: [],

      universityRequired: '',

      universityRequiredDuration: '',
    },

    skills: {
      primaryTechnical: list(old.skills),

      otherTechnical: '',

      technicalExperienceLevel: '',

      professionalExperience: '',

      previousExperience: '',

      previousExperienceDetails: '',

      programmingLanguages: [],

      frameworks: [],

      databases: [],

      cloudDevOps: [],

      developmentTools: [],

      softSkills: [],

      dataEngineerSkills: [],

      aiMlEngineerSkills: [],

      dataAnalystSkills: [],

      skillsToImprove: '',

      additionalSkills: '',
    },

    profiles: {
      linkedin: '',

      github: '',

      portfolio: text(old.portfolioUrl),

      socialMedia: '',
    },

    documents: {
      cvResume: text(old.resumeUrl),

      identityDocument: '',

      enrollmentDocument: '',

      degreeCertificate: text(degreeDocument),

      trainingCertificates: [],

      recommendationLetters: [],

      portfolioWorkSamples: [],

      additionalSupportingDocuments: [],
    },

    recruitment: {
      status: mapStatus(old.status),

      rating: null,

      notes: '',
    },

    /*
     * Preserve EVERYTHING from the old record.
     * Nothing gets lost during migration.
     */
    rawResponse: {
      legacyApplicationId: old._id,

      oldJobId: old.jobId || '',

      oldJobTitle: old.jobTitle || '',

      oldCompanyName: old.companyName || '',

      oldUserId: old.userId || '',

      oldCoverLetter: old.coverLetter || '',

      oldSource: old.source || '',

      oldExtraFields: old.extraFields || {},

      migratedFrom: 'applications',
    },
  };
}

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log('✅ Connected to MongoDB');

    const oldApplications =
      await Application.find({}).lean();

    console.log(
      `Old applications found: ${oldApplications.length}`
    );

    let inserted = 0;
    let skipped = 0;
    let failed = 0;

    for (const oldApplication of oldApplications) {
      try {
        const data = migrateRecord(oldApplication);

        const existing =
          await ApplicantFormSubmission.findOne({
            submissionKey: data.submissionKey,
          })
            .select('_id')
            .lean();

        if (existing) {
          skipped++;
          continue;
        }

        await ApplicantFormSubmission.create(data);

        inserted++;
      } catch (error) {
        failed++;

        console.error(
          `❌ Failed legacy record ${oldApplication._id}:`,
          error.message
        );
      }
    }

    console.log('\nMigration summary');
    console.log('-----------------');
    console.log('Old records:', oldApplications.length);
    console.log('Inserted:', inserted);
    console.log('Skipped:', skipped);
    console.log('Failed:', failed);

    const finalCount =
      await ApplicantFormSubmission.countDocuments();

    console.log(
      'New collection total:',
      finalCount
    );
  } finally {
    await mongoose.disconnect();

    console.log(
      '\nMongoDB connection closed.'
    );
  }
}

migrate().catch(error => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});