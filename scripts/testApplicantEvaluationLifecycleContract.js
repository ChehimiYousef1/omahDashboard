'use strict';

const assert =
  require('assert');

const fs =
  require('fs');

const mongoose =
  require('mongoose');

const swagger =
  require(
    '../docs/applicantSwagger'
  );


const routerSource =
  fs.readFileSync(
    'src/routes/applicants.routes.js',
    'utf8'
  );

const serviceSource =
  fs.readFileSync(
    'services/applicantEvaluationService.js',
    'utf8'
  );

const apiSource =
  fs.readFileSync(
    'omahconnect-admin/src/services/api.ts',
    'utf8'
  );

const uiSource =
  fs.readFileSync(
    'omahconnect-admin/src/components/applicants/ApplicantEvaluationPanel.tsx',
    'utf8'
  );


console.log(
  '================================'
);

console.log(
  ' APPLICANT EVALUATION LIFECYCLE CONTRACT'
);

console.log(
  '================================'
);


[
  '/:id/evaluations/:evaluationId/reopen',
  '/:id/evaluations/:evaluationId',
].forEach(
  (route) => {
    assert.ok(
      routerSource.includes(
        route
      ),
      `Missing lifecycle route: ${route}`
    );
  }
);

console.log(
  '✅ reopen + archive routes registered'
);


[
  'reopenApplicantEvaluation',
  'archiveApplicantEvaluation',
].forEach(
  (name) => {
    assert.ok(
      routerSource.includes(
        name
      ),
      `Missing lifecycle service: ${name}`
    );
  }
);

console.log(
  '✅ lifecycle services wired'
);


assert.ok(
  routerSource.includes(
    'req.user.id'
  )
);

console.log(
  '✅ authenticated evaluator used'
);


[
  'findByIdAndDelete',
  'findOneAndDelete',
  '.deleteOne(',
  '.deleteMany(',
].forEach(
  (operation) => {
    assert.strictEqual(
      serviceSource.includes(
        operation
      ),
      false,
      `Hard delete found: ${operation}`
    );
  }
);

assert.ok(
  serviceSource.includes(
    'archiveApplicantEvaluation'
  )
);

assert.ok(
  serviceSource.includes(
    'archived:'
  )
);

console.log(
  '✅ evaluation deletion is soft archive only'
);


[
  'reopenApplicantEvaluation',
  'archiveApplicantEvaluation',
].forEach(
  (name) => {
    assert.ok(
      apiSource.includes(
        `export const ${name}`
      ),
      `Missing frontend API: ${name}`
    );
  }
);

console.log(
  '✅ frontend lifecycle APIs connected'
);


const submitStart =
  uiSource.indexOf(
    'async function submitEvaluation()'
  );

const submitEnd =
  uiSource.indexOf(
    'async function submitDraft(',
    submitStart
  );

assert.ok(
  submitStart >= 0
);

assert.ok(
  submitEnd >
    submitStart
);

const newSubmit =
  uiSource.slice(
    submitStart,
    submitEnd
  );

assert.ok(
  newSubmit.includes(
    'await createApplicantEvaluation'
  )
);

assert.ok(
  newSubmit.includes(
    '"submitted"'
  )
);

console.log(
  '✅ brand-new Submit is atomic'
);


[
  'Edit Draft',
  'Submit Draft',
  'Reopen & Edit',
  'Delete',
  'Full draft details are visible above',
  'Full submitted evaluation details are visible above',
].forEach(
  (label) => {
    assert.ok(
      uiSource.includes(
        label
      ),
      `Missing lifecycle UI: ${label}`
    );
  }
);

console.log(
  '✅ draft + submitted actions represented'
);


[
  'async function submitDraft',
  'async function reopenAndEdit',
  'async function deleteEvaluation',
].forEach(
  (handler) => {
    assert.ok(
      uiSource.includes(
        handler
      )
    );
  }
);

console.log(
  '✅ lifecycle handlers implemented'
);


assert.ok(
  swagger.paths[
    '/api/applicants/{id}/evaluations/{evaluationId}/reopen'
  ]?.post
);

assert.ok(
  swagger.paths[
    '/api/applicants/{id}/evaluations/{evaluationId}'
  ]?.delete
);

console.log(
  '✅ Swagger lifecycle endpoints documented'
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
  'APPLICANT EVALUATION LIFECYCLE CONTRACT PASSED'
);
