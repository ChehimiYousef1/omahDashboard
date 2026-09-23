'use strict';

const assert =
  require('assert');

const createRouter =
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
  mark('admin');

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
    },
  });


function route(
  path,
  method
) {
  const result =
    router.stack.find(
      layer =>
        layer.route?.path ===
          path &&
        layer.route
          ?.methods
          ?.[method] === true
    );

  assert.ok(
    result,
    `Missing ${method.toUpperCase()} ${path}`
  );

  return result;
}


const expected = [
  [
    '/categories',
    'get',
  ],

  [
    '/categories/:categoryId',
    'get',
  ],

  [
    '/categories',
    'post',
  ],

  [
    '/categories/:categoryId',
    'put',
  ],

  [
    '/categories/:categoryId',
    'patch',
  ],

  [
    '/categories/:categoryId',
    'delete',
  ],

  [
    '/categories/:categoryId/restore',
    'post',
  ],
];


for (
  const [
    path,
    method,
  ]
  of expected
) {
  route(
    path,
    method
  );
}


for (
  const path
  of [
    '/categories',
    '/categories/:categoryId',
  ]
) {
  const handles =
    route(
      path,
      'get'
    )
      .route
      .stack
      .map(
        layer =>
          layer.handle
      );

  assert.ok(
    handles.some(
      handle =>
        handle._permission ===
        'applicant:view'
    )
  );
}


for (
  const [
    path,
    method,
  ]
  of expected.slice(2)
) {
  const handles =
    route(
      path,
      method
    )
      .route
      .stack
      .map(
        layer =>
          layer.handle
      );

  assert.ok(
    handles.some(
      handle =>
        handle._kind ===
        'admin'
    ),
    `${method.toUpperCase()} ${path} must require Admin`
  );
}


console.log(
  '✅ 7 Category CRUD routes registered'
);

console.log(
  '✅ GET routes require applicant:view'
);

console.log(
  '✅ mutation routes require Admin'
);

console.log(
  '\nAPPLICANT TALENT POOL CATEGORY API CONTRACT TEST PASSED'
);
