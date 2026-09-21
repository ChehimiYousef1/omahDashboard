'use strict';

const assert =
  require('assert');

const fs =
  require('fs');

const mongoose =
  require('mongoose');

const {
  buildEvaluationAuditChanges,
  updateApplicantEvaluationDraft,
} = require(
  '../services/applicantEvaluationService'
);


/*
|--------------------------------------------------------------------------
| Pure structured comparison
|--------------------------------------------------------------------------
*/

const previous = {
  criteria: {
    technicalFit:
      3,

    relevantExperience:
      3,

    communication:
      3,

    motivationCommitment:
      3,

    learningPotential:
      3,
  },

  averageRating:
    3,

  weightedScore:
    60,

  recommendation:
    'hold',

  strengths:
    'Private strengths',

  concerns:
    'Private concerns',

  summary:
    'Private summary',
};


const next = {
  criteria: {
    technicalFit:
      5,

    relevantExperience:
      4,

    communication:
      3,

    motivationCommitment:
      3,

    learningPotential:
      3,
  },

  averageRating:
    3.6,

  weightedScore:
    75,

  recommendation:
    'yes',

  strengths:
    'Changed private strengths',

  concerns:
    'Private concerns',

  summary:
    'Changed private summary',
};


const changes =
  buildEvaluationAuditChanges({
    previous,
    next,
  });


const fields =
  changes.map(
    change =>
      change.field
  );


assert.deepStrictEqual(
  fields,
  [
    'evaluation.criteria.technicalFit',
    'evaluation.criteria.relevantExperience',
    'evaluation.averageRating',
    'evaluation.weightedScore',
    'evaluation.recommendation',
  ]
);


assert.strictEqual(
  fields.includes(
    'evaluation.criteria.communication'
  ),
  false
);

assert.strictEqual(
  fields.includes(
    'evaluation.criteria.motivationCommitment'
  ),
  false
);

assert.strictEqual(
  fields.includes(
    'evaluation.criteria.learningPotential'
  ),
  false
);


for (
  const forbidden
  of [
    'evaluation.strengths',
    'evaluation.concerns',
    'evaluation.summary',
  ]
) {
  assert.strictEqual(
    fields.includes(
      forbidden
    ),
    false
  );
}


console.log(
  '✅ changed criteria detected'
);

console.log(
  '✅ unchanged criteria excluded'
);

console.log(
  '✅ calculated score changes detected'
);

console.log(
  '✅ recommendation change detected'
);

console.log(
  '✅ free-text content excluded from structured changes'
);


/*
|--------------------------------------------------------------------------
| Runtime optional Audit result
|--------------------------------------------------------------------------
*/

async function runtimeTest() {
  const applicantId =
    new mongoose.Types.ObjectId();

  const evaluationId =
    new mongoose.Types.ObjectId();

  const existing = {
    _id:
      evaluationId,

    applicantId,

    archived:
      false,

    status:
      'draft',

    evaluator: {
      userId:
        'admin-1',

      name:
        'Evaluator',
    },

    criteria: {
      technicalFit:
        3,

      relevantExperience:
        3,

      communication:
        3,

      motivationCommitment:
        3,

      learningPotential:
        3,
    },

    averageRating:
      3,

    weightedScore:
      60,

    recommendation:
      'hold',

    strengths:
      'Old private strengths',

    concerns:
      'Same private concerns',

    summary:
      'Old private summary',
  };


  let writtenUpdate =
    null;


  const EvaluationModel = {
    async findOne() {
      return existing;
    },

    async updateOne(
      filter,
      update
    ) {
      writtenUpdate =
        update;

      return {
        matchedCount:
          1,
      };
    },
  };


  const result =
    await updateApplicantEvaluationDraft({
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

      criteria: {
        technicalFit:
          4,

        relevantExperience:
          3,

        communication:
          4,

        motivationCommitment:
          3,

        learningPotential:
          4,
      },

      recommendation:
        'yes',

      strengths:
        'New private strengths',

      concerns:
        'Same private concerns',

      summary:
        'New private summary',

      includeAuditResult:
        true,

      EvaluationModel,
    });


  assert(
    writtenUpdate &&
    writtenUpdate.$set
  );


  assert.strictEqual(
    result.result.status,
    'evaluation-updated'
  );

  assert.strictEqual(
    result.result.evaluationId,
    String(
      evaluationId
    )
  );

  assert(
    Array.isArray(
      result.auditChanges
    )
  );


  for (
    const field
    of [
      'evaluation.criteria.technicalFit',
      'evaluation.criteria.communication',
      'evaluation.criteria.learningPotential',
      'evaluation.averageRating',
      'evaluation.weightedScore',
      'evaluation.recommendation',
    ]
  ) {
    assert(
      result.auditChanges.some(
        change =>
          change.field ===
          field
      ),
      'Missing runtime Audit field: ' +
        field
    );
  }


  assert.strictEqual(
    result.auditMetadata
      .strengthsChanged,
    true
  );

  assert.strictEqual(
    result.auditMetadata
      .concernsChanged,
    false
  );

  assert.strictEqual(
    result.auditMetadata
      .summaryChanged,
    true
  );


  const serialized =
    JSON.stringify(
      {
        auditChanges:
          result.auditChanges,

        auditMetadata:
          result.auditMetadata,
      }
    );

  assert.strictEqual(
    serialized.includes(
      'New private strengths'
    ),
    false
  );

  assert.strictEqual(
    serialized.includes(
      'Old private strengths'
    ),
    false
  );

  assert.strictEqual(
    serialized.includes(
      'New private summary'
    ),
    false
  );


  console.log(
    '✅ optional Audit result works'
  );

  console.log(
    '✅ free-text changes represented only as booleans'
  );
}


/*
|--------------------------------------------------------------------------
| Default service contract remains unchanged
|--------------------------------------------------------------------------
*/

async function defaultContractTest() {
  const applicantId =
    new mongoose.Types.ObjectId();

  const evaluationId =
    new mongoose.Types.ObjectId();

  const existing = {
    _id:
      evaluationId,

    applicantId,

    archived:
      false,

    status:
      'draft',

    evaluator: {
      userId:
        'admin-1',
    },

    criteria: {
      technicalFit:
        3,

      relevantExperience:
        3,

      communication:
        3,

      motivationCommitment:
        3,

      learningPotential:
        3,
    },

    averageRating:
      3,

    weightedScore:
      60,

    recommendation:
      'hold',

    strengths:
      '',

    concerns:
      '',

    summary:
      '',
  };


  const EvaluationModel = {
    async findOne() {
      return existing;
    },

    async updateOne() {
      return {
        matchedCount:
          1,
      };
    },
  };


  const result =
    await updateApplicantEvaluationDraft({
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

      criteria: {
        technicalFit:
          3,

        relevantExperience:
          3,

        communication:
          3,

        motivationCommitment:
          3,

        learningPotential:
          3,
      },

      recommendation:
        'hold',

      EvaluationModel,
    });


  assert.strictEqual(
    result.status,
    'evaluation-updated'
  );

  assert.strictEqual(
    Object.prototype
      .hasOwnProperty
      .call(
        result,
        'result'
      ),
    false
  );

  assert.strictEqual(
    Object.prototype
      .hasOwnProperty
      .call(
        result,
        'auditChanges'
      ),
    false
  );


  console.log(
    '✅ default service return remains unchanged'
  );
}


/*
|--------------------------------------------------------------------------
| Route contract
|--------------------------------------------------------------------------
*/

function routeTest() {
  const source =
    fs.readFileSync(
      'src/routes/applicants.routes.js',
      'utf8'
    );

  const start =
    source.indexOf(
      "  router.patch(\n    '/:id/evaluations/:evaluationId',"
    );

  const end =
    source.indexOf(
      "  router.post(\n    '/:id/evaluations/:evaluationId/submit',",
      start
    );

  assert(
    start >= 0 &&
    end > start
  );

  const block =
    source.slice(
      start,
      end
    );


  assert(
    block.includes(
      'includeAuditResult:'
    )
  );

  assert(
    block.includes(
      "'evaluation.updated'"
    )
  );

  assert(
    block.includes(
      'auditChanges'
    )
  );

  assert(
    block.includes(
      'strengthsChanged'
    )
  );

  assert(
    block.includes(
      'concernsChanged'
    )
  );

  assert(
    block.includes(
      'summaryChanged'
    )
  );


  for (
    const forbidden
    of [
      "'evaluation.strengths'",
      "'evaluation.concerns'",
      "'evaluation.summary'",
    ]
  ) {
    assert.strictEqual(
      block.includes(
        forbidden
      ),
      false
    );
  }


  assert(
    block.includes(
      'success: true'
    )
  );

  assert(
    block.includes(
      'result,'
    )
  );


  console.log(
    '✅ Evaluation update route consumes Audit result'
  );

  console.log(
    '✅ HTTP response remains { success, result }'
  );
}


(async () => {
  await runtimeTest();
  await defaultContractTest();

  routeTest();

  console.log(
    '\nAPPLICANT AUDIT B3B2 TEST PASSED'
  );
})().catch(
  error => {
    console.error(error);
    process.exitCode = 1;
  }
);
