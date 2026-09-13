'use strict';

const assert =
  require('assert');

const mongoose =
  require('mongoose');

const {
  Types,
} = mongoose;

const {
  buildEvaluationData,
  createApplicantEvaluation,
  updateApplicantEvaluationDraft,
  submitApplicantEvaluation,
  listApplicantEvaluations,
} = require(
  '../services/applicantEvaluationService'
);


async function main() {

console.log(
  '================================'
);

console.log(
  ' APPLICANT EVALUATION SERVICE TEST'
);

console.log(
  '================================'
);


const applicantId =
  new Types.ObjectId();

const submissionId =
  new Types.ObjectId();

const evaluationId =
  new Types.ObjectId();


const criteria = {
  technicalFit: 5,
  relevantExperience: 4,
  communication: 3,
  motivationCommitment: 4,
  learningPotential: 5,
};


const built =
  buildEvaluationData({
    evaluator: {
      userId:
        'admin-1',

      name:
        'Recruiter One',

      role:
        'Admin',
    },

    criteria,

    recommendation:
      'YES',

    strengths:
      'Strong technical background.',

    concerns:
      'Limited domain exposure.',

    summary:
      'Good candidate.',

    status:
      'draft',
  });


assert.strictEqual(
  built.weightedScore,
  87
);

assert.strictEqual(
  built.averageRating,
  4.2
);

assert.strictEqual(
  built.recommendation,
  'yes'
);

assert.strictEqual(
  built.status,
  'draft'
);

console.log(
  '✅ server-calculated evaluation data'
);


let createdPayload =
  null;

const fakeApplicantModel = {
  async findById(id) {
    assert.strictEqual(
      String(id),
      String(applicantId)
    );

    return {
      _id:
        applicantId,

      lifecycle: {
        archived:
          false,
      },
    };
  },
};


const immutableSubmission = {
  _id:
    submissionId,

  applicantId,

  personal: {
    fullName:
      'Candidate Example',
  },
};


const submissionSnapshot =
  JSON.stringify(
    immutableSubmission
  );


const fakeSubmissionModel = {
  async findById(id) {
    assert.strictEqual(
      String(id),
      String(submissionId)
    );

    return immutableSubmission;
  },
};


const fakeEvaluationCreateModel = {
  async findOne(query) {
    assert.strictEqual(
      String(
        query.applicantId
      ),
      String(applicantId)
    );

    assert.strictEqual(
      String(
        query.submissionId
      ),
      String(submissionId)
    );

    assert.strictEqual(
      query[
        'evaluator.userId'
      ],
      'admin-1'
    );

    return null;
  },

  async create(payload) {
    createdPayload =
      payload;

    return {
      _id:
        evaluationId,

      ...payload,
    };
  },
};


const created =
  await createApplicantEvaluation({
    applicantId:
      String(applicantId),

    submissionId:
      String(submissionId),

    evaluator: {
      userId:
        'admin-1',

      name:
        'Recruiter One',

      role:
        'Admin',
    },

    criteria,

    recommendation:
      'yes',

    strengths:
      'Strong technical background.',

    concerns:
      'Limited domain exposure.',

    summary:
      'Good candidate.',

    ApplicantModel:
      fakeApplicantModel,

    SubmissionModel:
      fakeSubmissionModel,

    EvaluationModel:
      fakeEvaluationCreateModel,
  });


assert.ok(
  createdPayload
);

assert.strictEqual(
  created.weightedScore,
  87
);

assert.strictEqual(
  created.averageRating,
  4.2
);

assert.strictEqual(
  created.submittedAt,
  null
);

assert.strictEqual(
  JSON.stringify(
    immutableSubmission
  ),
  submissionSnapshot
);

console.log(
  '✅ evaluation created for linked submission'
);

console.log(
  '✅ immutable submission unchanged'
);


await assert.rejects(
  () =>
    createApplicantEvaluation({
      applicantId:
        String(applicantId),

      submissionId:
        String(submissionId),

      evaluator: {
        userId:
          'admin-1',
      },

      criteria,

      recommendation:
        'yes',

      ApplicantModel:
        fakeApplicantModel,

      SubmissionModel: {
        async findById() {
          return {
            _id:
              submissionId,

            applicantId:
              new Types.ObjectId(),
          };
        },
      },

      EvaluationModel:
        fakeEvaluationCreateModel,
    }),

  (error) =>
    error.code ===
      'SUBMISSION_NOT_LINKED_TO_APPLICANT'
);

console.log(
  '✅ another Applicant submission rejected'
);


await assert.rejects(
  () =>
    createApplicantEvaluation({
      applicantId:
        String(applicantId),

      submissionId:
        String(submissionId),

      evaluator: {
        userId:
          'admin-1',
      },

      criteria,

      recommendation:
        'yes',

      ApplicantModel:
        fakeApplicantModel,

      SubmissionModel:
        fakeSubmissionModel,

      EvaluationModel: {
        async findOne() {
          return {
            _id:
              evaluationId,
          };
        },
      },
    }),

  (error) =>
    error.code ===
      'EVALUATION_ALREADY_EXISTS'
);

console.log(
  '✅ duplicate evaluator/application evaluation rejected'
);


let draftUpdate =
  null;

const draftEvaluationModel = {
  async findOne(query) {
    assert.strictEqual(
      String(
        query.applicantId
      ),
      String(applicantId)
    );

    return {
      _id:
        evaluationId,

      applicantId,

      status:
        'draft',

      evaluator: {
        userId:
          'admin-1',
      },
    };
  },

  async updateOne(
    filter,
    update
  ) {
    assert.strictEqual(
      filter.status,
      'draft'
    );

    assert.strictEqual(
      String(
        filter.applicantId
      ),
      String(applicantId)
    );

    draftUpdate =
      update;

    return {
      matchedCount:
        1,
    };
  },
};


const updated =
  await updateApplicantEvaluationDraft({
    applicantId:
      String(applicantId),

    evaluationId:
      String(evaluationId),

    evaluatorId:
      'admin-1',

    criteria,

    recommendation:
      'hold',

    strengths:
      'Updated strengths.',

    concerns:
      'Updated concerns.',

    summary:
      'Updated summary.',

    EvaluationModel:
      draftEvaluationModel,
  });


assert.strictEqual(
  updated.weightedScore,
  87
);

assert.strictEqual(
  updated.recommendation,
  'hold'
);

assert.ok(
  draftUpdate.$set
);

console.log(
  '✅ draft evaluation can be edited'
);


await assert.rejects(
  () =>
    updateApplicantEvaluationDraft({
      applicantId:
        String(
          new Types.ObjectId()
        ),

      evaluationId:
        String(evaluationId),

      evaluatorId:
        'admin-1',

      criteria,

      recommendation:
        'yes',

      EvaluationModel: {
        async findOne() {
          return null;
        },
      },
    }),

  (error) =>
    error.code ===
      'EVALUATION_NOT_FOUND'
);

console.log(
  '✅ evaluation cannot cross Applicant boundary'
);


await assert.rejects(
  () =>
    updateApplicantEvaluationDraft({
      applicantId:
        String(applicantId),

      evaluationId:
        String(evaluationId),

      evaluatorId:
        'admin-1',

      criteria,

      recommendation:
        'yes',

      EvaluationModel: {
        async findOne() {
          return {
            applicantId,

            status:
              'submitted',

            evaluator: {
              userId:
                'admin-1',
            },
          };
        },
      },
    }),

  (error) =>
    error.code ===
      'EVALUATION_SUBMITTED_IMMUTABLE'
);

console.log(
  '✅ submitted evaluation is immutable'
);


const submittedAt =
  new Date(
    '2026-09-13T12:00:00.000Z'
  );

let submitUpdate =
  null;

const submitModel = {
  async findOne(query) {
    assert.strictEqual(
      String(
        query.applicantId
      ),
      String(applicantId)
    );

    return {
      _id:
        evaluationId,

      applicantId,

      status:
        'draft',

      evaluator: {
        userId:
          'admin-1',
      },
    };
  },

  async updateOne(
    filter,
    update
  ) {
    assert.strictEqual(
      filter.status,
      'draft'
    );

    assert.strictEqual(
      String(
        filter.applicantId
      ),
      String(applicantId)
    );

    submitUpdate =
      update;

    return {
      matchedCount:
        1,
    };
  },
};


const submitted =
  await submitApplicantEvaluation({
    applicantId:
      String(applicantId),

    evaluationId:
      String(evaluationId),

    evaluatorId:
      'admin-1',

    EvaluationModel:
      submitModel,

    now:
      () => submittedAt,
  });


assert.strictEqual(
  submitted.status,
  'evaluation-submitted'
);

assert.strictEqual(
  submitUpdate
    .$set
    .status,
  'submitted'
);

assert.strictEqual(
  submitUpdate
    .$set
    .submittedAt,
  submittedAt
);

console.log(
  '✅ draft evaluation submits once'
);


let sortDefinition =
  null;

const fakeListModel = {
  find(query) {
    assert.strictEqual(
      String(
        query.applicantId
      ),
      String(applicantId)
    );

    return {
      async sort(sort) {
        sortDefinition =
          sort;

        return [
          {
            _id:
              evaluationId,
          },
        ];
      },
    };
  },
};


const listed =
  await listApplicantEvaluations({
    applicantId:
      String(applicantId),

    EvaluationModel:
      fakeListModel,
  });


assert.strictEqual(
  listed.length,
  1
);

assert.deepStrictEqual(
  sortDefinition,
  {
    createdAt: -1,
  }
);

console.log(
  '✅ evaluation history listed newest first'
);


assert.strictEqual(
  mongoose.connection
    .readyState,
  0
);

console.log(
  '✅ no MongoDB connection used'
);

console.log(
  '✅ no real MongoDB writes performed'
);

console.log('');
console.log(
  'APPLICANT EVALUATION SERVICE TEST PASSED'
);

}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
