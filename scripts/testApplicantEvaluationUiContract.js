'use strict';

const assert =
  require('assert');

const fs =
  require('fs');

const mongoose =
  require('mongoose');


const panel =
  fs.readFileSync(
    'omahconnect-admin/src/components/applicants/ApplicantEvaluationPanel.tsx',
    'utf8'
  );

const profile =
  fs.readFileSync(
    'omahconnect-admin/src/components/applicants/ApplicantProfilePanel.tsx',
    'utf8'
  );


console.log(
  '================================'
);

console.log(
  ' APPLICANT EVALUATION UI TEST'
);

console.log(
  '================================'
);


assert.ok(
  profile.includes(
    'ApplicantEvaluationPanel'
  )
);

assert.ok(
  profile.includes(
    'tab === "evaluations"'
  )
);

assert.ok(
  profile.includes(
    '"evaluations",'
  )
);

console.log(
  '✅ Evaluations tab connected'
);


[
  'fetchApplicantEvaluations',
  'createApplicantEvaluation',
  'updateApplicantEvaluation',
  'submitApplicantEvaluation',
].forEach(
  (name) => {
    assert.ok(
      panel.includes(name),
      `Missing evaluation UI API: ${name}`
    );
  }
);

console.log(
  '✅ evaluation CRUD workflow connected'
);


[
  'technicalFit',
  'relevantExperience',
  'communication',
  'motivationCommitment',
  'learningPotential',
].forEach(
  (criterion) => {
    assert.ok(
      panel.includes(
        criterion
      ),
      `Missing criterion: ${criterion}`
    );
  }
);

console.log(
  '✅ all five scoring criteria represented'
);


assert.ok(
  panel.includes(
    'weightedPreview'
  )
);

assert.ok(
  panel.includes(
    'averagePreview'
  )
);

assert.ok(
  panel.includes(
    'Score'
  )
);

console.log(
  '✅ live score preview represented'
);


assert.ok(
  panel.includes(
    'Save Draft'
  )
);

assert.ok(
  panel.includes(
    'Submit Evaluation'
  )
);

assert.ok(
  panel.includes(
    'Submitted evaluation — read-only until reopened'
  )
);

console.log(
  '✅ draft + submit + reopen lifecycle UX represented'
);


assert.ok(
  panel.includes(
    'Recommendation remains a recruiter decision'
  )
);

assert.ok(
  panel.includes(
    'Historical Google Form ratings'
  ) ||
  panel.includes(
    'historical Google Form ratings'
  )
);

console.log(
  '✅ recruiter decision separated from historical rating'
);


assert.ok(
  panel.includes(
    'latestApprovedSubmissionId'
  )
);

assert.ok(
  panel.includes(
    'submissions'
  )
);

console.log(
  '✅ evaluation linked to Applicant submission'
);


assert.ok(
  panel.includes(
    'Evaluation History'
  )
);

assert.ok(
  panel.includes(
    'evaluator'
  )
);

assert.ok(
  panel.includes(
    'submittedAt'
  )
);

console.log(
  '✅ evaluation history represented'
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
  'APPLICANT EVALUATION UI TEST PASSED'
);
