'use strict';

const assert =
  require('assert');

const applicantSwagger =
  require(
    '../docs/applicantSwagger'
  );

const documentSwagger =
  require(
    '../docs/applicantDocumentSwagger'
  );


const HTTP_METHODS =
  new Set([
    'get',
    'post',
    'put',
    'patch',
    'delete',
    'head',
    'options'
  ]);


const expectedApplicantCounts = {
  'Applicant Core':
    7,

  'Applicant Audit & History':
    1,

  'Applicant Search & Analytics':
    5,

  'Applicant Duplicate Review':
    3,

  'Applicant Interviews':
    9,

  'Applicant Calendar':
    1,

  'Applicant Communications':
    3,

  'Applicant Notes & Tasks':
    17,

  'Applicant Replies':
    6,

  'Applicant Tags':
    1,

  'Applicant Submissions':
    4,

  'Applicant Evaluations':
    6,

  'Applicant Documents':
    1
};


const counts = {};

let applicantOperationCount =
  0;


for (
  const [path, pathItem]
  of Object.entries(
    applicantSwagger.paths ||
    {}
  )
) {
  for (
    const [method, operation]
    of Object.entries(
      pathItem ||
      {}
    )
  ) {
    if (
      !HTTP_METHODS.has(
        method.toLowerCase()
      )
    ) {
      continue;
    }


    applicantOperationCount++;


    assert(
      Array.isArray(
        operation.tags
      ),
      `${method.toUpperCase()} ${path} has no tags`
    );


    assert.strictEqual(
      operation.tags.length,
      1,
      `${method.toUpperCase()} ${path} must have exactly one Swagger section`
    );


    const [
      tag
    ] =
      operation.tags;


    assert.notStrictEqual(
      tag,
      'Applicants',
      `${method.toUpperCase()} ${path} still uses generic Applicants tag`
    );


    counts[tag] =
      (
        counts[tag] ||
        0
      ) +
      1;
  }
}


assert.strictEqual(
  applicantOperationCount,
  64,
  'Applicant Swagger operation count changed'
);


for (
  const [
    tag,
    expectedCount
  ]
  of Object.entries(
    expectedApplicantCounts
  )
) {
  assert.strictEqual(
    counts[tag],
    expectedCount,
    `${tag} operation count changed`
  );
}


/*
 * Applicant Documents module remains
 * independently documented.
 */
let documentOperationCount =
  0;


for (
  const [path, pathItem]
  of Object.entries(
    documentSwagger.paths ||
    {}
  )
) {
  for (
    const [method, operation]
    of Object.entries(
      pathItem ||
      {}
    )
  ) {
    if (
      !HTTP_METHODS.has(
        method.toLowerCase()
      )
    ) {
      continue;
    }


    documentOperationCount++;


    assert.deepStrictEqual(
      operation.tags,
      [
        'Applicant Documents'
      ],
      `${method.toUpperCase()} ${path} must remain under Applicant Documents`
    );
  }
}


assert.strictEqual(
  documentOperationCount,
  8,
  'Applicant Document operation count changed'
);


/*
 * Top-level tag definitions.
 */
const applicantTagNames =
  (
    applicantSwagger.tags ||
    []
  ).map(
    tag =>
      tag.name
  );


assert(
  !applicantTagNames.includes(
    'Applicants'
  ),
  'Generic Applicants top-level tag must be removed'
);


assert.strictEqual(
  new Set(
    applicantTagNames
  ).size,
  applicantTagNames.length,
  'Applicant Swagger contains duplicate top-level tags'
);


assert.deepStrictEqual(
  (
    documentSwagger.tags ||
    []
  ).map(
    tag =>
      tag.name
  ),
  [
    'Applicant Documents'
  ],
  'Applicant Documents tag definition changed'
);


/*
 * Critical examples.
 */
assert.deepStrictEqual(
  applicantSwagger.paths[
    '/api/applicants/{id}/audit'
  ].get.tags,
  [
    'Applicant Audit & History'
  ]
);


assert.deepStrictEqual(
  applicantSwagger.paths[
    '/api/applicants/{id}/interviews'
  ].get.tags,
  [
    'Applicant Interviews'
  ]
);


assert.deepStrictEqual(
  applicantSwagger.paths[
    '/api/applicants/calendar/events'
  ].get.tags,
  [
    'Applicant Calendar'
  ]
);


assert.deepStrictEqual(
  applicantSwagger.paths[
    '/api/applicants/{id}/notes/{noteId}/task-status'
  ].patch.tags,
  [
    'Applicant Notes & Tasks'
  ]
);


assert.deepStrictEqual(
  applicantSwagger.paths[
    '/api/applicants/{id}/notes/{noteId}/replies'
  ].get.tags,
  [
    'Applicant Replies'
  ]
);


assert.deepStrictEqual(
  applicantSwagger.paths[
    '/api/applicants/documents/library'
  ].get.tags,
  [
    'Applicant Documents'
  ]
);


console.log(
  '✅ 64 Applicant APIs grouped'
);

console.log(
  '✅ generic Applicants section removed'
);

console.log(
  '✅ Interview APIs separated'
);

console.log(
  '✅ Search & Analytics APIs separated'
);

console.log(
  '✅ Duplicate Review APIs separated'
);

console.log(
  '✅ Calendar API separated'
);

console.log(
  '✅ Communications APIs separated'
);

console.log(
  '✅ Notes & Tasks APIs separated'
);

console.log(
  '✅ Replies APIs separated'
);

console.log(
  '✅ Tags API separated'
);

console.log(
  '✅ Submission APIs separated'
);

console.log(
  '✅ Evaluation APIs separated'
);

console.log(
  '✅ centralized document library joins Applicant Documents'
);

console.log(
  '✅ existing 8 Applicant Document APIs preserved'
);

console.log(
  '\nAPPLICANT SWAGGER GROUPING TEST PASSED'
);
