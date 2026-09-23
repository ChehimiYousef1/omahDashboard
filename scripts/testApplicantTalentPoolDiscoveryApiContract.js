'use strict';

const assert =
  require('assert');

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


let capturedQuery =
  null;


const router =
  createRouter({
    requireAdmin,
    requireApplicantPermission,

    services: {
      async listTalentPoolMemberships({
        query,
      }) {
        capturedQuery =
          query;

        return {
          talent: [
            {
              id:
                'candidate-1',
            },
          ],

          pagination: {
            page:
              2,

            limit:
              25,

            total:
              1,

            pages:
              1,
          },

          filters: {
            q:
              'react',
          },
        };
      },

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
  const layer =
    router.stack.find(
      item =>
        item
          ?.route
          ?.path ===
          path &&
        item
          ?.route
          ?.methods
          ?.[method] ===
          true
    );

  assert.ok(
    layer,
    `Missing ${method.toUpperCase()} ${path}`
  );

  return layer;
}


const listRoute =
  findRoute(
    '/',
    'get'
  );


const handles =
  listRoute
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
  ),
  'Talent Pool GET all must require applicant:view'
);


/*
 * Root discovery route must remain ahead of
 * dynamic Applicant membership routes.
 */
const rootIndex =
  router.stack.findIndex(
    layer =>
      layer
        ?.route
        ?.path ===
        '/'
  );

const categoryIndex =
  router.stack.findIndex(
    layer =>
      layer
        ?.route
        ?.path ===
        '/categories'
  );

const memberIndex =
  router.stack.findIndex(
    layer =>
      layer
        ?.route
        ?.path ===
        '/:applicantId'
  );


assert.ok(
  rootIndex >= 0,
  'Talent Pool root route missing'
);

assert.ok(
  categoryIndex >= 0,
  'Talent Pool category route missing'
);

assert.ok(
  memberIndex >= 0,
  'Talent Pool member route missing'
);

assert.ok(
  rootIndex <
  memberIndex,
  'Talent Pool root route must precede dynamic Applicant route'
);

assert.ok(
  categoryIndex <
  memberIndex,
  'Talent Pool category route must precede dynamic Applicant route'
);


/*
 * Execute the GET-all route handler.
 */
const handler =
  listRoute
    .route
    .stack[
      listRoute
        .route
        .stack
        .length -
      1
    ]
    .handle;


const req = {
  query: {
    q:
      'react',

    categoryId:
      '64b64c000000000000000002',

    role:
      'Frontend Developer',

    skill:
      'React',

    tag:
      'high-potential',

    page:
      '2',

    limit:
      '25',
  },
};


const res = {
  statusCode:
    200,

  body:
    null,

  status(
    code
  ) {
    this.statusCode =
      code;

    return this;
  },

  json(
    body
  ) {
    this.body =
      body;

    return this;
  },
};


async function run() {
  await handler(
    req,
    res
  );


  assert.deepStrictEqual(
    capturedQuery,
    req.query,
    'GET all must forward query parameters to discovery service'
  );


  assert.strictEqual(
    res.statusCode,
    200
  );


  assert.strictEqual(
    res.body.success,
    true
  );


  assert.ok(
    Array.isArray(
      res.body.talent
    )
  );


  assert.deepStrictEqual(
    res.body.pagination,
    {
      page:
        2,

      limit:
        25,

      total:
        1,

      pages:
        1,
    }
  );


  assert.deepStrictEqual(
    res.body.filters,
    {
      q:
        'react',
    }
  );


  /*
   * Discovery validation error maps to 400.
   */
  const errorRes = {
    statusCode:
      200,

    body:
      null,

    status(
      code
    ) {
      this.statusCode =
        code;

      return this;
    },

    json(
      body
    ) {
      this.body =
        body;

      return this;
    },
  };


  sendTalentPoolError(
    errorRes,
    Object.assign(
      new Error(
        'Invalid Talent Pool search'
      ),
      {
        code:
          'INVALID_TALENT_POOL_SEARCH',
      }
    )
  );


  assert.strictEqual(
    errorRes.statusCode,
    400
  );


  assert.strictEqual(
    errorRes.body.success,
    false
  );


  console.log(
    '✅ GET /api/applicants/talent-pool registered'
  );

  console.log(
    '✅ GET all requires applicant:view'
  );

  console.log(
    '✅ query parameters forwarded to discovery service'
  );

  console.log(
    '✅ talent collection response contract'
  );

  console.log(
    '✅ pagination response contract'
  );

  console.log(
    '✅ applied filters response contract'
  );

  console.log(
    '✅ invalid discovery query → HTTP 400'
  );

  console.log(
    '✅ root/static routes precede dynamic Applicant ID'
  );

  console.log(
    '\nAPPLICANT TALENT POOL DISCOVERY API CONTRACT TEST PASSED'
  );
}


run().catch(
  error => {
    console.error(
      error
    );

    process.exitCode =
      1;
  }
);
