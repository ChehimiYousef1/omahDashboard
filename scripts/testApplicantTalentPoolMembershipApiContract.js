'use strict';

const assert =
  require('assert');

const {
  APPLICANT_PERMISSIONS,
} =
  require(
    '../utils/applicantPermissions'
  );

const createRouter =
  require(
    '../src/routes/applicantTalentPool.routes'
  );

const {
  sendTalentPoolError,
} =
  require(
    '../src/routes/applicantTalentPool.routes'
  );


function mark(
  kind,
  permission = ''
) {
  const fn =
    (
      req,
      res,
      next
    ) =>
      next();

  fn._kind =
    kind;

  fn._permission =
    permission;

  return fn;
}


const requireAdmin =
  mark(
    'admin'
  );

const requireApplicantPermission =
  permission =>
    mark(
      'permission',
      permission
    );


const router =
  createRouter({
    requireAdmin,
    requireApplicantPermission,

    services: {
      async listTalentPoolCategories() {
        return [];
      },

      async getTalentPoolCategory() {
        return {};
      },

      async createTalentPoolCategory() {
        return {};
      },

      async replaceTalentPoolCategory() {
        return {};
      },

      async patchTalentPoolCategory() {
        return {};
      },

      async archiveTalentPoolCategory() {
        return {};
      },

      async restoreTalentPoolCategory() {
        return {};
      },

      async getTalentPoolMembership() {
        return {};
      },

      async addTalentPoolMembership() {
        return {};
      },

      async replaceTalentPoolMembership() {
        return {};
      },

      async patchTalentPoolMembership() {
        return {};
      },

      async removeTalentPoolMembership() {
        return {};
      },

      async restoreTalentPoolMembership() {
        return {};
      },
    },
  });


function findRoute(
  path,
  method
) {
  const result =
    router.stack.find(
      layer =>
        layer
          ?.route
          ?.path ===
          path &&
        layer
          ?.route
          ?.methods
          ?.[method] ===
          true
    );

  assert.ok(
    result,
    `Missing ${method.toUpperCase()} ${path}`
  );

  return result;
}


function handlesFor(
  path,
  method
) {
  return findRoute(
    path,
    method
  )
    .route
    .stack
    .map(
      layer =>
        layer.handle
    );
}


/*
 * Permission exists in the canonical registry.
 */
assert.ok(
  Array.from(
    APPLICANT_PERMISSIONS ||
    []
  ).includes(
    'applicant:talent-pool:manage'
  ),
  'Talent Pool manage permission must be registered'
);


/*
 * Complete membership lifecycle.
 */
const membershipRoutes = [
  [
    '/:applicantId',
    'get',
  ],

  [
    '/:applicantId',
    'post',
  ],

  [
    '/:applicantId',
    'put',
  ],

  [
    '/:applicantId',
    'patch',
  ],

  [
    '/:applicantId',
    'delete',
  ],

  [
    '/:applicantId/restore',
    'post',
  ],
];


for (
  const [
    path,
    method,
  ]
  of membershipRoutes
) {
  findRoute(
    path,
    method
  );
}


/*
 * Read permission.
 */
assert.ok(
  handlesFor(
    '/:applicantId',
    'get'
  ).some(
    handle =>
      handle._permission ===
      'applicant:view'
  ),
  'GET membership must require applicant:view'
);


/*
 * Mutation permission.
 */
for (
  const [
    path,
    method,
  ]
  of membershipRoutes.slice(1)
) {
  assert.ok(
    handlesFor(
      path,
      method
    ).some(
      handle =>
        handle._permission ===
        'applicant:talent-pool:manage'
    ),
    `${method.toUpperCase()} ${path} must require applicant:talent-pool:manage`
  );
}


/*
 * Static category routes must remain before
 * dynamic Applicant ID routes.
 */
const categoryRouteIndex =
  router.stack.findIndex(
    layer =>
      layer
        ?.route
        ?.path ===
        '/categories'
  );

const memberRouteIndex =
  router.stack.findIndex(
    layer =>
      layer
        ?.route
        ?.path ===
        '/:applicantId'
  );

assert.ok(
  categoryRouteIndex >= 0,
  'Category route missing'
);

assert.ok(
  memberRouteIndex >= 0,
  'Membership route missing'
);

assert.ok(
  categoryRouteIndex <
  memberRouteIndex,
  'Static category routes must precede dynamic membership routes'
);


/*
 * HTTP error mapping.
 */
function mockResponse() {
  return {
    statusCode:
      200,

    body:
      null,

    status(code) {
      this.statusCode =
        code;

      return this;
    },

    json(body) {
      this.body =
        body;

      return this;
    },
  };
}


for (
  const [
    code,
    expectedStatus,
  ]
  of [
    [
      'INVALID_APPLICANT_ID',
      400,
    ],

    [
      'INVALID_TALENT_POOL_INPUT',
      400,
    ],

    [
      'APPLICANT_NOT_FOUND',
      404,
    ],

    [
      'TALENT_POOL_MEMBERSHIP_NOT_FOUND',
      404,
    ],

    [
      'APPLICANT_ARCHIVED',
      409,
    ],

    [
      'TALENT_POOL_MEMBERSHIP_CONFLICT',
      409,
    ],
  ]
) {
  const res =
    mockResponse();

  sendTalentPoolError(
    res,
    Object.assign(
      new Error(
        'Contract test'
      ),
      {
        code,
      }
    )
  );

  assert.strictEqual(
    res.statusCode,
    expectedStatus,
    `${code} should map to HTTP ${expectedStatus}`
  );

  assert.strictEqual(
    res.body.success,
    false
  );
}


console.log(
  '✅ applicant:talent-pool:manage registered'
);

console.log(
  '✅ GET /:applicantId'
);

console.log(
  '✅ POST /:applicantId'
);

console.log(
  '✅ PUT /:applicantId'
);

console.log(
  '✅ PATCH /:applicantId'
);

console.log(
  '✅ DELETE /:applicantId'
);

console.log(
  '✅ POST /:applicantId/restore'
);

console.log(
  '✅ read requires applicant:view'
);

console.log(
  '✅ mutations require applicant:talent-pool:manage'
);

console.log(
  '✅ static category routes precede dynamic Applicant IDs'
);

console.log(
  '✅ 400 invalid-input mapping'
);

console.log(
  '✅ 404 missing-resource mapping'
);

console.log(
  '✅ 409 lifecycle-conflict mapping'
);

console.log(
  '\nAPPLICANT TALENT POOL MEMBERSHIP API CONTRACT TEST PASSED'
);
