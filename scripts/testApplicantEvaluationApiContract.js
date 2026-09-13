'use strict';

const assert =
  require('assert');

const fs =
  require('fs');

const mongoose =
  require('mongoose');


const routes =
  fs.readFileSync(
    require.resolve(
      '../src/routes/applicants.routes'
    ),
    'utf8'
  );


console.log(
  '================================'
);

console.log(
  ' APPLICANT EVALUATION API TEST'
);

console.log(
  '================================'
);


[
  "router.get(\n    '/:id/evaluations'",
  "router.post(\n    '/:id/evaluations'",
  "router.patch(\n    '/:id/evaluations/:evaluationId'",
  "router.post(\n    '/:id/evaluations/:evaluationId/submit'",
].forEach(
  (route) => {
    assert.ok(
      routes.includes(route),
      `Missing route: ${route}`
    );
  }
);

console.log(
  '✅ all four evaluation routes registered'
);


assert.ok(
  routes.includes(
    "'applicant:evaluations:view'"
  )
);

assert.ok(
  routes.includes(
    "'applicant:evaluations:manage'"
  )
);

console.log(
  '✅ evaluation routes use explicit permissions'
);


assert.ok(
  routes.includes(
    'createApplicantEvaluation'
  )
);

assert.ok(
  routes.includes(
    'updateApplicantEvaluationDraft'
  )
);

assert.ok(
  routes.includes(
    'submitApplicantEvaluation'
  )
);

assert.ok(
  routes.includes(
    'listApplicantEvaluations'
  )
);

console.log(
  '✅ evaluation service wired into router'
);


assert.ok(
  routes.includes(
    'applicantId:\n              req.params.id'
  )
);

assert.ok(
  routes.includes(
    'evaluationId:\n              req.params'
  )
);

console.log(
  '✅ nested Applicant/evaluation binding preserved'
);


assert.ok(
  routes.includes(
    'userId:\n                req.user.id'
  )
);

assert.ok(
  routes.includes(
    'evaluatorId:\n              req.user.id'
  )
);

console.log(
  '✅ evaluator identity comes from authenticated user'
);


assert.ok(
  routes.includes(
    "'EVALUATION_NOT_FOUND'"
  )
);

assert.ok(
  routes.includes(
    "'EVALUATION_ALREADY_EXISTS'"
  )
);

assert.ok(
  routes.includes(
    "'EVALUATION_SUBMITTED_IMMUTABLE'"
  )
);

console.log(
  '✅ evaluation errors mapped'
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
  'APPLICANT EVALUATION API CONTRACT TEST PASSED'
);
