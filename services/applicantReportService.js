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


function firstDefined(
  ...values
) {
  for (
    const value
    of values
  ) {
    if (
      value !== undefined &&
      value !== null &&
      value !== ''
    ) {
      return value;
    }
  }

  return null;
}


function buildSafeApplicantSection(
  applicant
) {
  return {
    identity: {
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

      phoneNumber:
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

    application: {
      applicantCode:
        cleanText(
          applicant
            ?.applicantCode
        ),

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

      technicalExperienceLevel:
        cleanText(
          applicant
            ?.skills
            ?.technicalExperienceLevel
        ),
    },
  };
}


function buildSafeLatestInterview(
  interviewValue
) {
  const interview =
    plainRecord(
      interviewValue
    );

  if (!interview) {
    return null;
  }

  return {
    type:
      cleanText(
        firstDefined(
          interview
            ?.interviewType,

          interview
            ?.type
        )
      ),

    status:
      cleanText(
        interview
          ?.status
      ),

    format:
      cleanText(
        interview
          ?.format
      ),

    scheduledStart:
      safeDateValue(
        firstDefined(
          interview
            ?.scheduledStart,

          interview
            ?.scheduledAt
        )
      ),

    outcome:
      cleanText(
        interview
          ?.outcome
      ),
  };
}


function buildSafeLatestEvaluation(
  evaluationValue
) {
  const evaluation =
    plainRecord(
      evaluationValue
    );

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
        evaluation
          ?.status
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

    createdAt:
      safeDateValue(
        evaluation
          ?.createdAt
      ),

    submittedAt:
      safeDateValue(
        evaluation
          ?.submittedAt
      ),
  };
}


async function buildApplicantSummaryReport({
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
    );

  const evaluations =
    Array.from(
      evaluationRows ||
      []
    );

  return {
    reportType:
      'applicant-summary',

    applicantId:
      id,

    ...buildSafeApplicantSection(
      applicant
    ),

    latestInterview:
      buildSafeLatestInterview(
        interviews[0]
      ),

    latestEvaluation:
      buildSafeLatestEvaluation(
        evaluations[0]
      ),

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
  buildApplicantSummaryReport,
  buildSafeApplicantSection,
  buildSafeLatestInterview,
  buildSafeLatestEvaluation,
  safeDateValue,
};
