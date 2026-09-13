'use strict';

const Applicant =
  require('../models/Applicant');

const {
  getApplicantSubmissions,
  toObjectId,
} = require(
  './applicantSubmissionService'
);


/*
|--------------------------------------------------------------------------
| Applicant Submission History
|--------------------------------------------------------------------------
|
| PURE comparison helpers.
|
| These functions:
|
| - compare immutable submission values with the current Applicant profile
| - never modify ApplicantFormSubmission
| - never modify Applicant
| - never connect to MongoDB
|
*/

const FIELD_MAP = [
  // Identity
  {
    label: 'Full Name',
    submissionPath: 'personal.fullName',
    applicantPath: 'identity.fullName',
  },
  {
    label: 'Email',
    submissionPath: 'personal.email',
    applicantPath: 'identity.email',
    type: 'email',
  },
  {
    label: 'Phone Number',
    submissionPath: 'personal.phoneNumber',
    applicantPath: 'identity.phoneNumber',
  },
  {
    label: 'WhatsApp Number',
    submissionPath: 'personal.whatsappNumber',
    applicantPath: 'identity.whatsappNumber',
  },
  {
    label: 'Country',
    submissionPath: 'personal.country',
    applicantPath: 'identity.country',
  },
  {
    label: 'City',
    submissionPath: 'personal.city',
    applicantPath: 'identity.city',
  },

  // Education
  {
    label: 'University',
    submissionPath: 'education.universityName',
    applicantPath: 'education.universityName',
  },
  {
    label: 'Institution Country',
    submissionPath: 'education.institutionCountry',
    applicantPath: 'education.institutionCountry',
  },
  {
    label: 'Degree Level',
    submissionPath: 'education.degreeLevel',
    applicantPath: 'education.degreeLevel',
  },
  {
    label: 'Major',
    submissionPath: 'education.major',
    applicantPath: 'education.major',
  },
  {
    label: 'Specialization',
    submissionPath: 'education.specialization',
    applicantPath: 'education.specialization',
  },
  {
    label: 'Study Status',
    submissionPath: 'education.studyStatus',
    applicantPath: 'education.studyStatus',
  },
  {
    label: 'Graduation Date',
    submissionPath: 'education.graduationDate',
    applicantPath: 'education.graduationDate',
    type: 'date',
  },
  {
    label: 'GPA',
    submissionPath: 'education.gpa',
    applicantPath: 'education.gpa',
  },
  {
    label: 'Grading Scale',
    submissionPath: 'education.gradingScale',
    applicantPath: 'education.gradingScale',
  },
  {
    label: 'Relevant Coursework',
    submissionPath: 'education.relevantCoursework',
    applicantPath: 'education.relevantCoursework',
  },
  {
    label: 'Academic Projects',
    submissionPath: 'education.academicProjects',
    applicantPath: 'education.academicProjects',
  },
  {
    label: 'Has Certifications',
    submissionPath: 'education.hasCertifications',
    applicantPath: 'education.hasCertifications',
  },
  {
    label: 'Certificate Names',
    submissionPath: 'education.certificateNames',
    applicantPath: 'education.certificateNames',
  },
  {
    label: 'Languages',
    submissionPath: 'education.languages',
    applicantPath: 'education.languages',
    type: 'array',
  },
  {
    label: 'English Proficiency',
    submissionPath: 'education.englishProficiency',
    applicantPath: 'education.englishProficiency',
  },
  {
    label: 'Additional Education',
    submissionPath: 'education.additionalEducation',
    applicantPath: 'education.additionalEducation',
  },

  // Preferences
  {
    label: 'Position Track',
    submissionPath: 'preferences.positionTrack',
    applicantPath: 'preferences.positionTrack',
  },
  {
    label: 'Position Type',
    submissionPath: 'preferences.positionType',
    applicantPath: 'preferences.positionType',
  },
  {
    label: 'Available Start Date',
    submissionPath: 'preferences.availableStartDate',
    applicantPath: 'preferences.availableStartDate',
    type: 'date',
  },
  {
    label: 'Duration',
    submissionPath: 'preferences.duration',
    applicantPath: 'preferences.duration',
  },
  {
    label: 'Weekly Availability',
    submissionPath: 'preferences.weeklyAvailability',
    applicantPath: 'preferences.weeklyAvailability',
  },
  {
    label: 'Working Days',
    submissionPath: 'preferences.workingDays',
    applicantPath: 'preferences.workingDays',
    type: 'array',
  },
  {
    label: 'Working Time',
    submissionPath: 'preferences.workingTime',
    applicantPath: 'preferences.workingTime',
  },
  {
    label: 'Currently Employed',
    submissionPath: 'preferences.currentlyEmployed',
    applicantPath: 'preferences.currentlyEmployed',
  },
  {
    label: 'Current Commitment',
    submissionPath: 'preferences.currentCommitment',
    applicantPath: 'preferences.currentCommitment',
  },
  {
    label: 'Can Commit',
    submissionPath: 'preferences.canCommit',
    applicantPath: 'preferences.canCommit',
  },
  {
    label: 'Objectives',
    submissionPath: 'preferences.objectives',
    applicantPath: 'preferences.objectives',
    type: 'array',
  },
  {
    label: 'University Required',
    submissionPath: 'preferences.universityRequired',
    applicantPath: 'preferences.universityRequired',
  },
  {
    label: 'University Required Duration',
    submissionPath: 'preferences.universityRequiredDuration',
    applicantPath: 'preferences.universityRequiredDuration',
  },

  // Skills
  {
    label: 'Primary Technical Skills',
    submissionPath: 'skills.primaryTechnical',
    applicantPath: 'skills.primaryTechnical',
    type: 'array',
  },
  {
    label: 'Other Technical Skills',
    submissionPath: 'skills.otherTechnical',
    applicantPath: 'skills.otherTechnical',
  },
  {
    label: 'Technical Experience Level',
    submissionPath: 'skills.technicalExperienceLevel',
    applicantPath: 'skills.technicalExperienceLevel',
  },
  {
    label: 'Professional Experience',
    submissionPath: 'skills.professionalExperience',
    applicantPath: 'skills.professionalExperience',
  },
  {
    label: 'Previous Experience',
    submissionPath: 'skills.previousExperience',
    applicantPath: 'skills.previousExperience',
  },
  {
    label: 'Previous Experience Details',
    submissionPath: 'skills.previousExperienceDetails',
    applicantPath: 'skills.previousExperienceDetails',
  },
  {
    label: 'Programming Languages',
    submissionPath: 'skills.programmingLanguages',
    applicantPath: 'skills.programmingLanguages',
    type: 'array',
  },
  {
    label: 'Frameworks',
    submissionPath: 'skills.frameworks',
    applicantPath: 'skills.frameworks',
    type: 'array',
  },
  {
    label: 'Databases',
    submissionPath: 'skills.databases',
    applicantPath: 'skills.databases',
    type: 'array',
  },
  {
    label: 'Cloud / DevOps',
    submissionPath: 'skills.cloudDevOps',
    applicantPath: 'skills.cloudDevOps',
    type: 'array',
  },
  {
    label: 'Development Tools',
    submissionPath: 'skills.developmentTools',
    applicantPath: 'skills.developmentTools',
    type: 'array',
  },
  {
    label: 'Soft Skills',
    submissionPath: 'skills.softSkills',
    applicantPath: 'skills.softSkills',
    type: 'array',
  },
  {
    label: 'Data Engineer Skills',
    submissionPath: 'skills.dataEngineerSkills',
    applicantPath: 'skills.dataEngineerSkills',
    type: 'array',
  },
  {
    label: 'AI / ML Engineer Skills',
    submissionPath: 'skills.aiMlEngineerSkills',
    applicantPath: 'skills.aiMlEngineerSkills',
    type: 'array',
  },
  {
    label: 'Data Analyst Skills',
    submissionPath: 'skills.dataAnalystSkills',
    applicantPath: 'skills.dataAnalystSkills',
    type: 'array',
  },
  {
    label: 'Skills To Improve',
    submissionPath: 'skills.skillsToImprove',
    applicantPath: 'skills.skillsToImprove',
  },
  {
    label: 'Additional Skills',
    submissionPath: 'skills.additionalSkills',
    applicantPath: 'skills.additionalSkills',
  },

  // Profiles
  {
    label: 'LinkedIn',
    submissionPath: 'profiles.linkedin',
    applicantPath: 'profiles.linkedin',
  },
  {
    label: 'GitHub',
    submissionPath: 'profiles.github',
    applicantPath: 'profiles.github',
  },
  {
    label: 'Portfolio',
    submissionPath: 'profiles.portfolio',
    applicantPath: 'profiles.portfolio',
  },
  {
    label: 'Social Media',
    submissionPath: 'profiles.socialMedia',
    applicantPath: 'profiles.socialMedia',
  },
];


function getPath(
  source,
  path
) {
  return String(path)
    .split('.')
    .reduce(
      (value, key) =>
        value == null
          ? undefined
          : value[key],
      source
    );
}


function normalizeDate(value) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null;
  }

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return String(value).trim();
  }

  return date
    .toISOString()
    .slice(0, 10);
}


function normalizeScalar(
  value,
  type
) {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  if (type === 'date') {
    return normalizeDate(value);
  }

  if (typeof value === 'string') {
    const trimmed =
      value.trim();

    return type === 'email'
      ? trimmed.toLowerCase()
      : trimmed;
  }

  return value;
}


function normalizeComparable(
  value,
  type
) {
  if (
    type === 'array' ||
    Array.isArray(value)
  ) {
    const items =
      Array.isArray(value)
        ? value
        : [];

    return items
      .map((item) =>
        normalizeScalar(
          item,
          undefined
        )
      )
      .filter(
        (item) =>
          item !== null &&
          item !== ''
      )
      .map((item) =>
        String(item)
      )
      .sort();
  }

  return normalizeScalar(
    value,
    type
  );
}


function valuesEqual(
  left,
  right,
  type
) {
  const normalizedLeft =
    normalizeComparable(
      left,
      type
    );

  const normalizedRight =
    normalizeComparable(
      right,
      type
    );

  if (
    Array.isArray(
      normalizedLeft
    ) ||
    Array.isArray(
      normalizedRight
    )
  ) {
    return (
      JSON.stringify(
        normalizedLeft
      ) ===
      JSON.stringify(
        normalizedRight
      )
    );
  }

  return (
    normalizedLeft ===
    normalizedRight
  );
}


function buildSubmissionComparison({
  applicant,
  submission,
  isInitial = false,
}) {
  if (!applicant) {
    throw new Error(
      'Applicant is required.'
    );
  }

  if (!submission) {
    throw new Error(
      'Submission is required.'
    );
  }

  const changedFields = [];
  let matchedFields = 0;

  FIELD_MAP.forEach(
    (field) => {
      const submittedValue =
        getPath(
          submission,
          field.submissionPath
        );

      const currentValue =
        getPath(
          applicant,
          field.applicantPath
        );

      if (
        valuesEqual(
          submittedValue,
          currentValue,
          field.type
        )
      ) {
        matchedFields += 1;
        return;
      }

      changedFields.push({
        label:
          field.label,

        submissionPath:
          field.submissionPath,

        applicantPath:
          field.applicantPath,

        submittedValue:
          submittedValue ??
          null,

        currentValue:
          currentValue ??
          null,
      });
    }
  );

  const changeCount =
    changedFields.length;

  let status =
    'matches_current';

  if (isInitial) {
    status = 'initial';
  } else if (
    changeCount > 0
  ) {
    status = 'changed';
  }

  return {
    status,

    changeCount,

    matchedFieldCount:
      matchedFields,

    comparedFieldCount:
      FIELD_MAP.length,

    changedFields,

    isLatestApprovedSource:
      Boolean(
        applicant
          .latestApprovedSubmissionId &&
        submission._id &&
        String(
          applicant
            .latestApprovedSubmissionId
        ) ===
          String(
            submission._id
          )
      ),
  };
}


function submissionTimestamp(
  submission
) {
  const value =
    submission?.submittedAt ||
    submission?.createdAt;

  const timestamp =
    value
      ? new Date(value)
          .getTime()
      : 0;

  return Number.isFinite(
    timestamp
  )
    ? timestamp
    : 0;
}


function buildSubmissionHistory({
  applicant,
  submissions,
}) {
  if (!applicant) {
    throw new Error(
      'Applicant is required.'
    );
  }

  const list =
    Array.isArray(submissions)
      ? submissions
      : [];

  if (list.length === 0) {
    return [];
  }

  let initialIndex = 0;
  let oldestTimestamp =
    submissionTimestamp(
      list[0]
    );

  for (
    let index = 1;
    index < list.length;
    index += 1
  ) {
    const timestamp =
      submissionTimestamp(
        list[index]
      );

    if (
      timestamp <
      oldestTimestamp
    ) {
      oldestTimestamp =
        timestamp;

      initialIndex =
        index;
    }
  }

  return list.map(
    (
      submission,
      index
    ) => ({
      submission,

      comparison:
        buildSubmissionComparison({
          applicant,
          submission,
          isInitial:
            index ===
            initialIndex,
        }),
    })
  );
}



/*
|--------------------------------------------------------------------------
| Read Submission History Bundle
|--------------------------------------------------------------------------
|
| READ-ONLY DATABASE OPERATION.
|
| Reads:
| - current Applicant profile
| - immutable ApplicantFormSubmission history
|
| Writes:
| - NONE
|
*/

async function getApplicantSubmissionHistory({
  applicantId,
  ApplicantModel = Applicant,
  getSubmissions =
    getApplicantSubmissions,
}) {
  const applicantObjectId =
    toObjectId(
      applicantId,
      'applicantId'
    );

  let applicantQuery =
    ApplicantModel.findById(
      applicantObjectId
    );

  if (
    applicantQuery &&
    typeof applicantQuery
      .lean === 'function'
  ) {
    applicantQuery =
      applicantQuery.lean();
  }

  const applicant =
    await applicantQuery;

  if (!applicant) {
    const error =
      new Error(
        'Applicant was not found.'
      );

    error.code =
      'APPLICANT_NOT_FOUND';

    throw error;
  }

  const submissions =
    await getSubmissions({
      applicantId:
        applicantObjectId,
    });

  const plainSubmissions =
    Array.isArray(submissions)
      ? submissions.map(
          (submission) =>
            submission &&
            typeof submission
              .toObject ===
              'function'
              ? submission
                  .toObject()
              : submission
        )
      : [];

  const history =
    buildSubmissionHistory({
      applicant,
      submissions:
        plainSubmissions,
    });

  const changedCount =
    history.filter(
      (item) =>
        item.comparison
          .status ===
        'changed'
    ).length;

  const matchingCount =
    history.filter(
      (item) =>
        item.comparison
          .status ===
        'matches_current'
    ).length;

  const initialCount =
    history.filter(
      (item) =>
        item.comparison
          .status ===
        'initial'
    ).length;

  return {
    applicantId:
      String(
        applicantObjectId
      ),

    totalSubmissions:
      plainSubmissions.length,

    summary: {
      total:
        plainSubmissions.length,

      changed:
        changedCount,

      matchesCurrent:
        matchingCount,

      initial:
        initialCount,
    },

    submissions:
      plainSubmissions,

    history,
  };
}


module.exports = {
  getApplicantSubmissionHistory,
  FIELD_MAP,
  getPath,
  normalizeComparable,
  valuesEqual,
  buildSubmissionComparison,
  buildSubmissionHistory,
};
