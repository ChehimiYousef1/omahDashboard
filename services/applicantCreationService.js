'use strict';

const Applicant = require('../models/Applicant');
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
| Service Error
|--------------------------------------------------------------------------
*/

function serviceError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function cloneArray(value) {
  return Array.isArray(value)
    ? [...value]
    : [];
}

/*
|--------------------------------------------------------------------------
| Build Applicant From Submission
|--------------------------------------------------------------------------
|
| This function is PURE:
| - no database access
| - no database writes
|
| The selected submission becomes the initial approved source for the
| new Applicant because creating the Applicant from this submission is
| an explicit administrator/service action.
|
*/

function buildApplicantFromSubmission(submission) {
  if (!submission) {
    throw serviceError(
      'SUBMISSION_REQUIRED',
      'Submission is required.'
    );
  }

  if (
    !submission.personal ||
    !String(
      submission.personal.fullName || ''
    ).trim()
  ) {
    throw serviceError(
      'INVALID_SUBMISSION',
      'Submission must contain applicant full name.'
    );
  }

  const personal =
    submission.personal || {};

  const education =
    submission.education || {};

  const preferences =
    submission.preferences || {};

  const skills =
    submission.skills || {};

  const profiles =
    submission.profiles || {};

  const recruitment =
    submission.recruitment || {};

  const submittedAt =
    submission.submittedAt || null;

  return {
    identity: {
      fullName:
        personal.fullName || '',

      email:
        personal.email || '',

      normalizedEmail:
        normalizeEmail(
          personal.email
        ),

      phoneNumber:
        personal.phoneNumber || '',

      normalizedPhone:
        normalizePhone(
          personal.phoneNumber
        ),

      whatsappNumber:
        personal.whatsappNumber || '',

      country:
        personal.country || '',

      city:
        personal.city || '',
    },

    education: {
      universityName:
        education.universityName || '',

      institutionCountry:
        education.institutionCountry || '',

      degreeLevel:
        education.degreeLevel || '',

      major:
        education.major || '',

      specialization:
        education.specialization || '',

      studyStatus:
        education.studyStatus || '',

      graduationDate:
        education.graduationDate || null,

      gpa:
        education.gpa || '',

      gradingScale:
        education.gradingScale || '',

      relevantCoursework:
        education.relevantCoursework || '',

      academicProjects:
        education.academicProjects || '',

      hasCertifications:
        Boolean(
          education.hasCertifications
        ),

      certificateNames:
        education.certificateNames || '',

      languages:
        cloneArray(
          education.languages
        ),

      englishProficiency:
        education.englishProficiency || '',

      additionalEducation:
        education.additionalEducation || '',
    },

    preferences: {
      positionTrack:
        preferences.positionTrack || '',

      positionType:
        preferences.positionType || '',

      availableStartDate:
        preferences.availableStartDate ||
        null,

      duration:
        preferences.duration || '',

      weeklyAvailability:
        preferences.weeklyAvailability || '',

      workingDays:
        cloneArray(
          preferences.workingDays
        ),

      workingTime:
        preferences.workingTime || '',

      currentlyEmployed:
        preferences.currentlyEmployed || '',

      currentCommitment:
        preferences.currentCommitment || '',

      canCommit:
        preferences.canCommit || '',

      objectives:
        cloneArray(
          preferences.objectives
        ),

      universityRequired:
        preferences.universityRequired || '',

      universityRequiredDuration:
        preferences.universityRequiredDuration ||
        '',
    },

    skills: {
      primaryTechnical:
        cloneArray(
          skills.primaryTechnical
        ),

      otherTechnical:
        skills.otherTechnical || '',

      technicalExperienceLevel:
        skills.technicalExperienceLevel ||
        '',

      professionalExperience:
        skills.professionalExperience ||
        '',

      previousExperience:
        skills.previousExperience || '',

      previousExperienceDetails:
        skills.previousExperienceDetails ||
        '',

      programmingLanguages:
        cloneArray(
          skills.programmingLanguages
        ),

      frameworks:
        cloneArray(
          skills.frameworks
        ),

      databases:
        cloneArray(
          skills.databases
        ),

      cloudDevOps:
        cloneArray(
          skills.cloudDevOps
        ),

      developmentTools:
        cloneArray(
          skills.developmentTools
        ),

      softSkills:
        cloneArray(
          skills.softSkills
        ),

      dataEngineerSkills:
        cloneArray(
          skills.dataEngineerSkills
        ),

      aiMlEngineerSkills:
        cloneArray(
          skills.aiMlEngineerSkills
        ),

      dataAnalystSkills:
        cloneArray(
          skills.dataAnalystSkills
        ),

      skillsToImprove:
        skills.skillsToImprove || '',

      additionalSkills:
        skills.additionalSkills || '',
    },

    profiles: {
      linkedin:
        profiles.linkedin || '',

      linkedinCanonical:
        canonicalizeLinkedIn(
          profiles.linkedin
        ),

      github:
        profiles.github || '',

      portfolio:
        profiles.portfolio || '',

      socialMedia:
        profiles.socialMedia || '',
    },

    recruitment: {
      status:
        recruitment.status ||
        'applied',

      source:
        submission.source ||
        'google-form',

      firstAppliedAt:
        submittedAt,

      lastAppliedAt:
        submittedAt,

      lastActivityAt:
        submittedAt,
    },

    lifecycle: {
      archived: false,
    },

    profileVersion: 1,

    latestApprovedSubmissionId:
      submission._id || null,
  };
}

/*
|--------------------------------------------------------------------------
| Create Applicant From Submission
|--------------------------------------------------------------------------
|
| Rules:
|
| 1. Submission must exist.
| 2. Already-linked submission does not create another Applicant.
| 3. Archived/missing linked Applicant is not silently reused.
| 4. No duplicate identity matching happens here.
| 5. Applicant is populated from the explicitly selected submission.
| 6. Submission answers remain immutable.
| 7. Only applicantId relationship metadata is added to the submission.
| 8. If linking fails after creation, the newly-created Applicant is
|    removed as rollback to avoid leaving an orphan Applicant.
|
*/

async function createApplicantFromSubmission({
  submissionId,
  ApplicantModel = Applicant,
  SubmissionModel =
    ApplicantFormSubmission,
}) {
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

  /*
   * Idempotency:
   *
   * If the submission already belongs to an active Applicant,
   * never create another master Applicant.
   */
  if (submission.applicantId) {
    const applicantExists =
      await ApplicantModel.exists({
        _id: submission.applicantId,
        'lifecycle.archived': {
          $ne: true,
        },
      });

    if (applicantExists) {
      return {
        status: 'already-created',

        applicantId:
          String(
            submission.applicantId
          ),

        submissionId:
          String(
            submissionObjectId
          ),
      };
    }

    throw serviceError(
      'LINKED_APPLICANT_UNAVAILABLE',
      'Submission is linked to an archived or missing Applicant and requires manual review.'
    );
  }

  const applicantData =
    buildApplicantFromSubmission(
      submission
    );

  let createdApplicant = null;

  try {
    const created =
      await ApplicantModel.create([
        applicantData,
      ]);

    createdApplicant =
      created[0];

    const linkResult =
      await SubmissionModel.updateOne(
        {
          _id: submissionObjectId,
          applicantId: null,
        },
        {
          $set: {
            applicantId:
              createdApplicant._id,
          },
        }
      );

    if (
      linkResult.modifiedCount !== 1
    ) {
      throw serviceError(
        'CREATION_CONFLICT',
        'Submission relationship changed while Applicant was being created.'
      );
    }

    return {
      status: 'created',

      applicantId:
        String(
          createdApplicant._id
        ),

      submissionId:
        String(
          submissionObjectId
        ),
    };
  } catch (error) {
    /*
     * Roll back only the newly-created Applicant.
     *
     * This is creation rollback, not normal applicant deletion.
     */
    if (
      createdApplicant &&
      createdApplicant._id
    ) {
      try {
        await ApplicantModel.deleteOne({
          _id:
            createdApplicant._id,
        });
      } catch {
        /*
         * Preserve the original error.
         * Cleanup failure should be handled
         * operationally if it occurs.
         */
      }
    }

    throw error;
  }
}

module.exports = {
  buildApplicantFromSubmission,
  createApplicantFromSubmission,
};
