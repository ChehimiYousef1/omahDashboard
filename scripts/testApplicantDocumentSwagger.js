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

const merged = {
  ...applicantSwagger,

  paths: {
    ...applicantSwagger.paths,
    ...documentSwagger.paths,
  },

  tags: [
    ...(
      applicantSwagger.tags ||
      []
    ),

    ...(
      documentSwagger.tags ||
      []
    ),
  ],
};

assert.strictEqual(
  merged.openapi,
  '3.0.3'
);

const operations = [
  [
    'get',
    '/api/applicants/{applicantId}/documents',
    200,
  ],

  [
    'post',
    '/api/applicants/{applicantId}/documents',
    201,
  ],

  [
    'get',
    '/api/applicants/{applicantId}/documents/{documentId}/versions',
    200,
  ],

  [
    'post',
    '/api/applicants/{applicantId}/documents/{documentId}/versions',
    201,
  ],

  [
    'get',
    '/api/applicants/{applicantId}/documents/{documentId}/download',
    200,
  ],

  [
    'post',
    '/api/applicants/{applicantId}/documents/{documentId}/current',
    200,
  ],

  [
    'post',
    '/api/applicants/{applicantId}/documents/{documentId}/archive',
    200,
  ],

  [
    'post',
    '/api/applicants/{applicantId}/documents/{documentId}/restore',
    200,
  ],
];

for (
  const [
    method,
    path,
    successStatus,
  ] of operations
) {
  const operation =
    merged.paths[path]?.[
      method
    ];

  assert(
    operation,
    'Missing Swagger operation: ' +
      method.toUpperCase() +
      ' ' +
      path
  );

  assert.deepStrictEqual(
    operation.security,
    [
      {
        cookieAuth: [],
      },
    ]
  );

  assert(
    operation.responses[
      successStatus
    ],
    'Missing success response'
  );

  for (
    const status
    of [
      400,
      401,
      403,
      404,
      409,
      500,
    ]
  ) {
    assert(
      operation.responses[
        status
      ],
      'Missing error response ' +
        status +
        ' for ' +
        method +
        ' ' +
        path
    );
  }
}

console.log(
  '✅ all 8 document operations documented'
);

console.log(
  '✅ cookie authentication documented'
);

console.log(
  '✅ standard API errors documented'
);

const upload =
  merged.paths[
    '/api/applicants/{applicantId}/documents'
  ].post;

assert(
  upload.requestBody
    .content[
      'multipart/form-data'
    ]
);

assert.strictEqual(
  upload.requestBody
    .content[
      'multipart/form-data'
    ]
    .schema
    .properties
    .file
    .format,
  'binary'
);

console.log(
  '✅ multipart binary upload documented'
);

for (
  const pathObject
  of Object.values(
    documentSwagger.paths
  )
) {
  assert.strictEqual(
    Boolean(
      pathObject.delete
    ),
    false
  );
}

console.log(
  '✅ no DELETE operation documented'
);

assert.doesNotThrow(
  () =>
    JSON.stringify(merged)
);

console.log(
  '✅ merged OpenAPI spec serializes correctly'
);

console.log(
  '\nTASK 11 DOCUMENT SWAGGER TEST PASSED'
);

