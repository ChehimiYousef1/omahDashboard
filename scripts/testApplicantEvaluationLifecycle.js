'use strict';

const assert =
  require('assert');

const mongoose =
  require('mongoose');

const {
  reopenApplicantEvaluation,
  archiveApplicantEvaluation,
} = require(
  '../services/applicantEvaluationService'
);


console.log(
  '================================'
);

console.log(
  ' APPLICANT EVALUATION LIFECYCLE TEST'
);

console.log(
  '================================'
);


const applicantId =
  new mongoose.Types
    .ObjectId();

const evaluationId =
  new mongoose.Types
    .ObjectId();

const state = {
  _id:
    evaluationId,

  applicantId,

  evaluator: {
    userId:
      'admin-1',
  },

  status:
    'submitted',

  submittedAt:
    new Date(
      '2026-09-13T10:00:00.000Z'
    ),

  reopenedAt:
    null,

  reopenedBy:
    '',

  archived:
    false,

  archivedAt:
    null,

  archivedBy:
    '',

  archiveReason:
    '',
};


function matches(
  filter
) {
  if (
    String(
      filter._id
    ) !==
    String(
      state._id
    )
  ) {
    return false;
  }

  if (
    String(
      filter.applicantId
    ) !==
    String(
      state.applicantId
    )
  ) {
    return false;
  }

  if (
    filter.status &&
    filter.status !==
      state.status
  ) {
    return false;
  }

  if (
    filter[
      'evaluator.userId'
    ] &&
    filter[
      'evaluator.userId'
    ] !==
      state.evaluator
        .userId
  ) {
    return false;
  }

  if (
    filter.archived?.$ne ===
      true &&
    state.archived ===
      true
  ) {
    return false;
  }

  return true;
}


const EvaluationModel = {
  async findOne(
    filter
  ) {
    return matches(
      filter
    )
      ? {
          ...state,
          evaluator: {
            ...state.evaluator,
          },
        }
      : null;
  },

  async updateOne(
    filter,
    update
  ) {
    if (
      !matches(
        filter
      )
    ) {
      return {
        matchedCount:
          0,
      };
    }

    Object.assign(
      state,
      update.$set
    );

    return {
      matchedCount:
        1,
    };
  },
};


async function main() {
  const reopenedAt =
    new Date(
      '2026-09-13T11:00:00.000Z'
    );

  const reopenResult =
    await reopenApplicantEvaluation({
      applicantId:
        String(
          applicantId
        ),

      evaluationId:
        String(
          evaluationId
        ),

      evaluatorId:
        'admin-1',

      EvaluationModel,

      now:
        () =>
          reopenedAt,
    });


  assert.strictEqual(
    reopenResult.status,
    'evaluation-reopened'
  );

  assert.strictEqual(
    state.status,
    'draft'
  );

  assert.strictEqual(
    state.reopenedBy,
    'admin-1'
  );

  assert.strictEqual(
    state.reopenedAt,
    reopenedAt
  );

  assert.ok(
    state.submittedAt,
    'Previous submittedAt must remain preserved'
  );

  console.log(
    '✅ submitted evaluation can reopen to draft'
  );


  let alreadyDraft =
    false;

  try {
    await reopenApplicantEvaluation({
      applicantId:
        String(
          applicantId
        ),

      evaluationId:
        String(
          evaluationId
        ),

      evaluatorId:
        'admin-1',

      EvaluationModel,
    });
  } catch (error) {
    alreadyDraft =
      error.code ===
      'EVALUATION_ALREADY_DRAFT';
  }

  assert.strictEqual(
    alreadyDraft,
    true
  );

  console.log(
    '✅ already-draft reopen rejected'
  );


  const archivedAt =
    new Date(
      '2026-09-13T12:00:00.000Z'
    );

  const archiveResult =
    await archiveApplicantEvaluation({
      applicantId:
        String(
          applicantId
        ),

      evaluationId:
        String(
          evaluationId
        ),

      evaluatorId:
        'admin-1',

      reason:
        'Recruiter removed evaluation.',

      EvaluationModel,

      now:
        () =>
          archivedAt,
    });


  assert.strictEqual(
    archiveResult.status,
    'evaluation-archived'
  );

  assert.strictEqual(
    state.archived,
    true
  );

  assert.strictEqual(
    state.archivedBy,
    'admin-1'
  );

  assert.strictEqual(
    state.archiveReason,
    'Recruiter removed evaluation.'
  );

  assert.strictEqual(
    state.archivedAt,
    archivedAt
  );

  console.log(
    '✅ evaluation delete is soft archive'
  );


  let archivedNotFound =
    false;

  try {
    await reopenApplicantEvaluation({
      applicantId:
        String(
          applicantId
        ),

      evaluationId:
        String(
          evaluationId
        ),

      evaluatorId:
        'admin-1',

      EvaluationModel,
    });
  } catch (error) {
    archivedNotFound =
      error.code ===
      'EVALUATION_NOT_FOUND';
  }

  assert.strictEqual(
    archivedNotFound,
    true
  );

  console.log(
    '✅ archived evaluation excluded from active lifecycle'
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
    '✅ no MongoDB writes performed'
  );

  console.log('');
  console.log(
    'APPLICANT EVALUATION LIFECYCLE TEST PASSED'
  );
}


main().catch(
  (error) => {
    console.error(
      error
    );

    process.exitCode =
      1;
  }
);
