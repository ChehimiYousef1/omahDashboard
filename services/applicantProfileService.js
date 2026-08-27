'use strict';

const Applicant =
  require('../models/Applicant');

const ApplicantFormSubmission =
  require('../models/ApplicantFormSubmission');

const {
  normalizeEmail,
  normalizePhone,
  canonicalizeLinkedIn,
} = require('../utils/applicantIdentity');

const {
  toObjectId,
} = require('./applicantSubmissionService');

/*
|--------------------------------------------------------------------------
| Errors
|--------------------------------------------------------------------------
*/

function serviceError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

/*
|--------------------------------------------------------------------------
| Approved Current-Profile Fields
|--------------------------------------------------------------------------
|
| Destination Applicant field -> source Submission field
|
| Only fields explicitly listed here may be approved.
|
*/

const PROFILE_FIELD_MAP = {
  'identity.fullName':
    'personal.fullName',

  'identity.email':
    'personal.email',

  'identity.phoneNumber':
    'personal.phoneNumber',

  'identity.whatsappNumber':
    'personal.whatsappNumber',

  'identity.country':
    'personal.country',

  'identity.city':
    'personal.city',

  'education.universityName':
    'education.universityName',

  'education.institutionCountry':
    'education.institutionCountry',

  'education.degreeLevel':
    'education.degreeLevel',

  'education.major':
    'education.major',

  'education.specialization':
    'education.specialization',

  'education.studyStatus':
    'education.studyStatus',

  'education.graduationDate':
    'education.graduationDate',

  'education.gpa':
    'education.gpa',

  'education.gradingScale':
    'education.gradingScale',

  'education.relevantCoursework':
    'education.relevantCoursework',

  'education.academicProjects':
    'education.academicProjects',

  'education.hasCertifications':
    'education.hasCertifications',

  'education.certificateNames':
    'education.certificateNames',

  'education.languages':
    'education.languages',

  'education.englishProficiency':
    'education.englishProficiency',

  'education.additionalEducation':
    'education.additionalEducation',

  'preferences.positionTrack':
    'preferences.positionTrack',

  'preferences.positionType':
    'preferences.positionType',

  'preferences.availableStartDate':
    'preferences.availableStartDate',

  'preferences.duration':
    'preferences.duration',

  'preferences.weeklyAvailability':
    'preferences.weeklyAvailability',

  'preferences.workingDays':
    'preferences.workingDays',

  'preferences.workingTime':
    'preferences.workingTime',

  'preferences.currentlyEmployed':
    'preferences.currentlyEmployed',

  'preferences.currentCommitment':
    'preferences.currentCommitment',

  'preferences.canCommit':
    'preferences.canCommit',

  'preferences.objectives':
    'preferences.objectives',

  'preferences.universityRequired':
    'preferences.universityRequired',

  'preferences.universityRequiredDuration':
    'preferences.universityRequiredDuration',

  'skills.primaryTechnical':
    'skills.primaryTechnical',

  'skills.otherTechnical':
    'skills.otherTechnical',

  'skills.technicalExperienceLevel':
    'skills.technicalExperienceLevel',

  'skills.professionalExperience':
    'skills.professionalExperience',

  'skills.previousExperience':
    'skills.previousExperience',

  'skills.previousExperienceDetails':
    'skills.previousExperienceDetails',

  'skills.programmingLanguages':
    'skills.programmingLanguages',

  'skills.frameworks':
    'skills.frameworks',

  'skills.databases':
    'skills.databases',

  'skills.cloudDevOps':
    'skills.cloudDevOps',

  'skills.developmentTools':
    'skills.developmentTools',

  'skills.softSkills':
    'skills.softSkills',

  'skills.dataEngineerSkills':
    'skills.dataEngineerSkills',

  'skills.aiMlEngineerSkills':
    'skills.aiMlEngineerSkills',

  'skills.dataAnalystSkills':
    'skills.dataAnalystSkills',

  'skills.skillsToImprove':
    'skills.skillsToImprove',

  'skills.additionalSkills':
    'skills.additionalSkills',

  'profiles.linkedin':
    'profiles.linkedin',

  'profiles.github':
    'profiles.github',

  'profiles.portfolio':
    'profiles.portfolio',

  'profiles.socialMedia':
    'profiles.socialMedia',
};

/*
|--------------------------------------------------------------------------
| Read Nested Value
|--------------------------------------------------------------------------
*/

function getPathValue(object, path) {
  return String(path)
    .split('.')
    .reduce(
      (current, key) =>
        current == null
          ? undefined
          : current[key],
      object
    );
}

function cloneValue(value) {
  if (Array.isArray(value)) {
    return [...value];
  }

  return value;
}

/*
|--------------------------------------------------------------------------
| Build Approved Profile Update
|--------------------------------------------------------------------------
|
| PURE FUNCTION:
| - no MongoDB
| - no file writes
|
*/

function buildApprovedProfileUpdate({
  submission,
  fields,
}) {
  if (!submission) {
    throw serviceError(
      'SUBMISSION_REQUIRED',
      'Submission is required.'
    );
  }

  if (
    !Array.isArray(fields) ||
    fields.length === 0
  ) {
    throw serviceError(
      'PROFILE_FIELDS_REQUIRED',
      'At least one profile field must be explicitly approved.'
    );
  }

  const uniqueFields =
    [...new Set(fields)];

  const update = {};

  for (
    const destinationPath
    of uniqueFields
  ) {
    const sourcePath =
      PROFILE_FIELD_MAP[
        destinationPath
      ];

    if (!sourcePath) {
      throw serviceError(
        'PROFILE_FIELD_NOT_ALLOWED',
        `Profile field is not allowed: ${destinationPath}`
      );
    }

    const value =
      getPathValue(
        submission,
        sourcePath
      );

    if (value === undefined) {
      throw serviceError(
        'SOURCE_FIELD_UNAVAILABLE',
        `Submission does not contain source field: ${sourcePath}`
      );
    }

    update[destinationPath] =
      cloneValue(value);

    /*
     * Normalized companion fields
     * are system-controlled.
     */
    if (
      destinationPath ===
      'identity.email'
    ) {
      update[
        'identity.normalizedEmail'
      ] = normalizeEmail(value);
    }

    if (
      destinationPath ===
      'identity.phoneNumber'
    ) {
      update[
        'identity.normalizedPhone'
      ] = normalizePhone(value);
    }

    if (
      destinationPath ===
      'profiles.linkedin'
    ) {
      update[
        'profiles.linkedinCanonical'
      ] =
        canonicalizeLinkedIn(value);
    }
  }

  return update;
}

/*
|--------------------------------------------------------------------------
| Approve Current Profile Fields From Submission
|--------------------------------------------------------------------------
|
| Rules:
|
| 1. Applicant must exist and be active.
| 2. Submission must exist.
| 3. Submission must belong to that Applicant.
| 4. Admin/service must explicitly provide approved fields.
| 5. Only whitelisted profile fields may be copied.
| 6. Submission itself is never changed.
| 7. Normalized identity fields stay synchronized.
| 8. profileVersion increments atomically.
| 9. latestApprovedSubmissionId records the source.
|
*/

async function approveProfileFieldsFromSubmission({
  applicantId,
  submissionId,
  fields,
  ApplicantModel = Applicant,
  SubmissionModel =
    ApplicantFormSubmission,
}) {
  const applicantObjectId =
    toObjectId(
      applicantId,
      'applicantId'
    );

  const submissionObjectId =
    toObjectId(
      submissionId,
      'submissionId'
    );

  const submission =
    await SubmissionModel.findById(
      submissionObjectId
    );

  if (!submission) {
    throw serviceError(
      'SUBMISSION_NOT_FOUND',
      'Applicant submission was not found.'
    );
  }

  if (
    !submission.applicantId ||
    String(
      submission.applicantId
    ) !==
      String(applicantObjectId)
  ) {
    throw serviceError(
      'SUBMISSION_NOT_LINKED_TO_APPLICANT',
      'Submission does not belong to this Applicant.'
    );
  }

  const approvedUpdate =
    buildApprovedProfileUpdate({
      submission,
      fields,
    });

  approvedUpdate[
    'latestApprovedSubmissionId'
  ] = submissionObjectId;

  const result =
    await ApplicantModel.updateOne(
      {
        _id: applicantObjectId,

        'lifecycle.archived': {
          $ne: true,
        },
      },
      {
        $set: approvedUpdate,

        $inc: {
          profileVersion: 1,
        },
      }
    );

  if (result.matchedCount !== 1) {
    throw serviceError(
      'APPLICANT_NOT_FOUND',
      'Applicant was not found or is archived.'
    );
  }

  return {
    status: 'profile-updated',

    applicantId:
      String(applicantObjectId),

    submissionId:
      String(submissionObjectId),

    approvedFields:
      [...new Set(fields)],
  };
}

module.exports = {
  PROFILE_FIELD_MAP,
  getPathValue,
  buildApprovedProfileUpdate,
  approveProfileFieldsFromSubmission,
};
