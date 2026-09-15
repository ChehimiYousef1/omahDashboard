'use strict';

const {
  rankedBreakdown,
} = require(
  './applicantAnalyticsHelpers'
);


function ranked(
  applicants,
  getValues,
  limit = 10
) {
  return rankedBreakdown({
    records:
      applicants,

    getValues,

    limit,
  });
}


function buildApplicantSegmentation(
  applicants = []
) {
  return {
    positions: {
      tracks:
        ranked(
          applicants,
          applicant =>
            applicant
              ?.preferences
              ?.positionTrack,
          15
        ),

      types:
        ranked(
          applicants,
          applicant =>
            applicant
              ?.preferences
              ?.positionType,
          10
        ),
    },

    geography: {
      countries:
        ranked(
          applicants,
          applicant =>
            applicant
              ?.identity
              ?.country,
          15
        ),

      cities:
        ranked(
          applicants,
          applicant =>
            applicant
              ?.identity
              ?.city,
          15
        ),
    },

    education: {
      degreeLevels:
        ranked(
          applicants,
          applicant =>
            applicant
              ?.education
              ?.degreeLevel,
          10
        ),

      universities:
        ranked(
          applicants,
          applicant =>
            applicant
              ?.education
              ?.universityName,
          15
        ),

      majors:
        ranked(
          applicants,
          applicant =>
            applicant
              ?.education
              ?.major,
          15
        ),

      studyStatuses:
        ranked(
          applicants,
          applicant =>
            applicant
              ?.education
              ?.studyStatus,
          10
        ),
    },

    experience: {
      technicalLevels:
        ranked(
          applicants,
          applicant =>
            applicant
              ?.skills
              ?.technicalExperienceLevel,
          10
        ),
    },

    skills: {
      primaryTechnical:
        ranked(
          applicants,
          applicant =>
            applicant
              ?.skills
              ?.primaryTechnical,
          15
        ),

      programmingLanguages:
        ranked(
          applicants,
          applicant =>
            applicant
              ?.skills
              ?.programmingLanguages,
          15
        ),

      frameworks:
        ranked(
          applicants,
          applicant =>
            applicant
              ?.skills
              ?.frameworks,
          15
        ),

      databases:
        ranked(
          applicants,
          applicant =>
            applicant
              ?.skills
              ?.databases,
          15
        ),

      cloudDevOps:
        ranked(
          applicants,
          applicant =>
            applicant
              ?.skills
              ?.cloudDevOps,
          15
        ),

      dataAnalytics:
        ranked(
          applicants,
          applicant =>
            applicant
              ?.skills
              ?.dataAnalystSkills,
          15
        ),

      dataEngineering:
        ranked(
          applicants,
          applicant =>
            applicant
              ?.skills
              ?.dataEngineerSkills,
          15
        ),

      aiMl:
        ranked(
          applicants,
          applicant =>
            applicant
              ?.skills
              ?.aiMlEngineerSkills,
          15
        ),

      softSkills:
        ranked(
          applicants,
          applicant =>
            applicant
              ?.skills
              ?.softSkills,
          15
        ),
    },
  };
}


module.exports = {
  buildApplicantSegmentation,
};
