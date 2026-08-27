'use strict';

const assert =
  require('assert');

const mongoose =
  require('mongoose');

const {
  checkApplicantRelationshipIntegrity,
} = require(
  '../services/applicantRelationshipService'
);

async function run() {
  const applicantId =
    new mongoose.Types.ObjectId();

  const submissionId =
    new mongoose.Types.ObjectId();

  /*
   * Valid relationship.
   */
  const ApplicantModel = {
    findById() {
      return {
        async select() {
          return {
            _id: applicantId,

            latestApprovedSubmissionId:
              submissionId,

            lifecycle: {
              archived: false,
            },
          };
        },
      };
    },
  };

  const SubmissionModel = {
    async countDocuments(filter) {
      assert.strictEqual(
        String(
          filter.applicantId
        ),
        String(applicantId)
      );

      return 3;
    },

    findById(id) {
      assert.strictEqual(
        String(id),
        String(submissionId)
      );

      return {
        async select() {
          return {
            _id:
              submissionId,

            applicantId:
              applicantId,
          };
        },
      };
    },
  };

  const result =
    await checkApplicantRelationshipIntegrity({
      applicantId,

      ApplicantModel,

      SubmissionModel,
    });

  assert.strictEqual(
    result.status,
    'relationship-valid'
  );

  assert.strictEqual(
    result.submissionCount,
    3
  );

  assert.strictEqual(
    result.latestApprovedSubmissionId,
    String(submissionId)
  );

  console.log(
    '✅ valid Applicant relationship'
  );

  /*
   * Applicant with no approved submission
   * is still valid.
   */
  const NoApprovedApplicantModel = {
    findById() {
      return {
        async select() {
          return {
            _id: applicantId,

            latestApprovedSubmissionId:
              null,
          };
        },
      };
    },
  };

  const NoApprovedSubmissionModel = {
    async countDocuments() {
      return 2;
    },
  };

  const noApproved =
    await checkApplicantRelationshipIntegrity({
      applicantId,

      ApplicantModel:
        NoApprovedApplicantModel,

      SubmissionModel:
        NoApprovedSubmissionModel,
    });

  assert.strictEqual(
    noApproved.submissionCount,
    2
  );

  assert.strictEqual(
    noApproved.latestApprovedSubmissionId,
    null
  );

  console.log(
    '✅ optional approved submission relationship'
  );

  /*
   * Invalid cross-Applicant reference.
   */
  const otherApplicantId =
    new mongoose.Types.ObjectId();

  const InvalidSubmissionModel = {
    async countDocuments() {
      return 1;
    },

    findById() {
      return {
        async select() {
          return {
            _id:
              submissionId,

            applicantId:
              otherApplicantId,
          };
        },
      };
    },
  };

  await assert.rejects(
    () =>
      checkApplicantRelationshipIntegrity({
        applicantId,

        ApplicantModel,

        SubmissionModel:
          InvalidSubmissionModel,
      }),

    (error) =>
      error.code ===
      'APPROVED_SUBMISSION_RELATIONSHIP_INVALID'
  );

  console.log(
    '✅ cross-Applicant approved reference rejected'
  );

  /*
   * Missing approved submission.
   */
  const MissingSubmissionModel = {
    async countDocuments() {
      return 1;
    },

    findById() {
      return {
        async select() {
          return null;
        },
      };
    },
  };

  await assert.rejects(
    () =>
      checkApplicantRelationshipIntegrity({
        applicantId,

        ApplicantModel,

        SubmissionModel:
          MissingSubmissionModel,
      }),

    (error) =>
      error.code ===
      'APPROVED_SUBMISSION_NOT_FOUND'
  );

  console.log(
    '✅ missing approved submission detected'
  );

  console.log(
    '✅ no relationship data modified'
  );

  console.log(
    '✅ no MongoDB connection used'
  );

  console.log(
    '\nTASK 12 APPLICANT DATABASE RELATIONSHIPS TEST PASSED'
  );
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});