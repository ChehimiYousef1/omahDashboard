'use strict';

const mongoose =
  require('mongoose');

const Applicant =
  require('../models/Applicant');

const {
  listApplicantInterviews,
} = require(
  './applicantInterviewService'
);

const {
  listApplicantEvaluations,
} = require(
  './applicantEvaluationService'
);


function cleanText(
  value
) {
  return String(
    value ?? ''
  ).trim();
}


function cleanArray(
  value
) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(cleanText)
    .filter(Boolean);
}


function safeDateValue(
  value
) {
  if (!value) {
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
    return null;
  }

  return date.toISOString();
}


function plainRecord(
  value
) {
  if (!value) {
    return null;
  }

  if (
    typeof value.toObject ===
      'function'
  ) {
    return value.toObject({
      virtuals: false,
      getters: false,
      depopulate: true,
    });
  }

  return value;
}


function reportError(
  code,
  message
) {
  const error =
    new Error(message);

  error.code =
    code;

  return error;
}


function safeInterview(
  value
) {
  const interview =
    plainRecord(value);

  if (!interview) {
    return null;
  }

  return {
    type:
      cleanText(
        interview.interviewType ||
        interview.type
      ),

    status:
      cleanText(
        interview.status
      ),

    format:
      cleanText(
        interview.format
      ),

    scheduledStart:
      safeDateValue(
        interview.scheduledStart ||
        interview.scheduledAt
      ),

    outcome:
      cleanText(
        interview.outcome
      ),
  };
}


function safeEvaluation(
  value
) {
  const evaluation =
    plainRecord(value);

  if (!evaluation) {
    return null;
  }

  return {
    evaluator: {
      name:
        cleanText(
          evaluation
            ?.evaluator
            ?.name
        ),

      role:
        cleanText(
          evaluation
            ?.evaluator
            ?.role
        ),
    },

    status:
      cleanText(
        evaluation.status
      ),

    criteria: {
      technicalFit:
        evaluation
          ?.criteria
          ?.technicalFit ??
        null,

      relevantExperience:
        evaluation
          ?.criteria
          ?.relevantExperience ??
        null,

      communication:
        evaluation
          ?.criteria
          ?.communication ??
        null,

      motivationCommitment:
        evaluation
          ?.criteria
          ?.motivationCommitment ??
        null,

      learningPotential:
        evaluation
          ?.criteria
          ?.learningPotential ??
        null,
    },

    averageRating:
      evaluation
        ?.averageRating ??
      null,

    weightedScore:
      evaluation
        ?.weightedScore ??
      null,

    recommendation:
      cleanText(
        evaluation
          ?.recommendation
      ),

    submittedAt:
      safeDateValue(
        evaluation
          ?.submittedAt
      ),

    createdAt:
      safeDateValue(
        evaluation
          ?.createdAt
      ),
  };
}


async function buildApplicantRecruitmentReport({
  applicantId,

  generatedBy = {},

  now =
    () =>
      new Date(),

  ApplicantModel =
    Applicant,

  listInterviews =
    listApplicantInterviews,

  listEvaluations =
    listApplicantEvaluations,
} = {}) {
  const id =
    cleanText(
      applicantId
    );

  if (
    !mongoose.Types
      .ObjectId
      .isValid(id)
  ) {
    throw reportError(
      'INVALID_APPLICANT_ID',
      'Applicant id is invalid.'
    );
  }

  const applicant =
    await ApplicantModel
      .findById(id)
      .lean();

  if (!applicant) {
    throw reportError(
      'APPLICANT_NOT_FOUND',
      'Applicant was not found.'
    );
  }

  const [
    interviewRows,
    evaluationRows,
  ] =
    await Promise.all([
      listInterviews({
        applicantId:
          id,

        includeArchived:
          false,
      }),

      listEvaluations({
        applicantId:
          id,
      }),
    ]);

  const interviews =
    Array.from(
      interviewRows ||
      []
    )
      .map(safeInterview)
      .filter(Boolean);

  const evaluations =
    Array.from(
      evaluationRows ||
      []
    )
      .map(safeEvaluation)
      .filter(Boolean);

  return {
    reportType:
      'applicant-recruitment-report',

    applicantId:
      id,

    candidate: {
      fullName:
        cleanText(
          applicant
            ?.identity
            ?.fullName
        ),

      email:
        cleanText(
          applicant
            ?.identity
            ?.email
        ),

      phone:
        cleanText(
          applicant
            ?.identity
            ?.phoneNumber
        ),

      country:
        cleanText(
          applicant
            ?.identity
            ?.country
        ),

      city:
        cleanText(
          applicant
            ?.identity
            ?.city
        ),
    },

    recruitment: {
      applicantCode:
        cleanText(
          applicant
            ?.applicantCode
        ),

      status:
        cleanText(
          applicant
            ?.recruitment
            ?.status
        ),

      source:
        cleanText(
          applicant
            ?.recruitment
            ?.source
        ),

      firstAppliedAt:
        safeDateValue(
          applicant
            ?.recruitment
            ?.firstAppliedAt
        ),

      lastAppliedAt:
        safeDateValue(
          applicant
            ?.recruitment
            ?.lastAppliedAt
        ),

      profileVersion:
        Number(
          applicant
            ?.profileVersion ||
          1
        ),
    },

    preferences: {
      positionTrack:
        cleanText(
          applicant
            ?.preferences
            ?.positionTrack
        ),

      positionType:
        cleanText(
          applicant
            ?.preferences
            ?.positionType
        ),

      availableStartDate:
        safeDateValue(
          applicant
            ?.preferences
            ?.availableStartDate
        ),

      duration:
        cleanText(
          applicant
            ?.preferences
            ?.duration
        ),

      weeklyAvailability:
        cleanText(
          applicant
            ?.preferences
            ?.weeklyAvailability
        ),

      workingDays:
        cleanArray(
          applicant
            ?.preferences
            ?.workingDays
        ),

      workingTime:
        cleanText(
          applicant
            ?.preferences
            ?.workingTime
        ),

      canCommit:
        applicant
          ?.preferences
          ?.canCommit ??
        null,

      objectives:
        cleanArray(
          applicant
            ?.preferences
            ?.objectives
        ),
    },

    education: {
      universityName:
        cleanText(
          applicant
            ?.education
            ?.universityName
        ),

      institutionCountry:
        cleanText(
          applicant
            ?.education
            ?.institutionCountry
        ),

      degreeLevel:
        cleanText(
          applicant
            ?.education
            ?.degreeLevel
        ),

      major:
        cleanText(
          applicant
            ?.education
            ?.major
        ),

      specialization:
        cleanText(
          applicant
            ?.education
            ?.specialization
        ),

      studyStatus:
        cleanText(
          applicant
            ?.education
            ?.studyStatus
        ),

      graduationDate:
        safeDateValue(
          applicant
            ?.education
            ?.graduationDate
        ),

      languages:
        cleanArray(
          applicant
            ?.education
            ?.languages
        ),

      englishProficiency:
        cleanText(
          applicant
            ?.education
            ?.englishProficiency
        ),
    },

    skills: {
      primaryTechnical:
        cleanArray(
          applicant
            ?.skills
            ?.primaryTechnical
        ),

      programmingLanguages:
        cleanArray(
          applicant
            ?.skills
            ?.programmingLanguages
        ),

      frameworks:
        cleanArray(
          applicant
            ?.skills
            ?.frameworks
        ),

      databases:
        cleanArray(
          applicant
            ?.skills
            ?.databases
        ),

      cloudDevOps:
        cleanArray(
          applicant
            ?.skills
            ?.cloudDevOps
        ),

      developmentTools:
        cleanArray(
          applicant
            ?.skills
            ?.developmentTools
        ),

      softSkills:
        cleanArray(
          applicant
            ?.skills
            ?.softSkills
        ),

      technicalExperienceLevel:
        cleanText(
          applicant
            ?.skills
            ?.technicalExperienceLevel
        ),

      professionalExperience:
        cleanText(
          applicant
            ?.skills
            ?.professionalExperience
        ),
    },

    interviews,

    evaluations,

    assessment: {
      interviewCount:
        interviews.length,

      evaluationCount:
        evaluations.length,

      latestRecommendation:
        evaluations[0]
          ?.recommendation ||
        '',

      latestWeightedScore:
        evaluations[0]
          ?.weightedScore ??
        null,

      latestAverageRating:
        evaluations[0]
          ?.averageRating ??
        null,
    },

    report: {
      generatedAt:
        safeDateValue(
          now()
        ),

      generatedBy: {
        name:
          cleanText(
            generatedBy
              ?.name
          ),

        role:
          cleanText(
            generatedBy
              ?.role
          ),
      },
    },
  };
}


module.exports = {
  buildApplicantRecruitmentReport,
  safeInterview,
  safeEvaluation,
};
