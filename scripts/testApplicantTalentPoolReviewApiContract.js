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


let capturedReview =
  null;

let capturedSchedule =
  null;


const router =
  createRouter({
    requireAdmin,
    requireApplicantPermission,

    services: {
      async listTalentPoolMemberships() {
        return {
          talent: [],
          pagination: {},
          filters: {},
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

      async completeTalentPoolReview(
        input
      ) {
        capturedReview =
          input;

        return {
          id:
            input.applicantId,

          talentPool: {
            reviewStatus:
              'reviewed',
          },
        };
      },

      async scheduleTalentPoolReview(
        input
      ) {
        capturedSchedule =
          input;

        return {
          id:
            input.applicantId,

          talentPool: {
            reviewStatus:
              'scheduled',
          },
        };
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
      item =>
        item.handle
    );
}


function finalHandler(
  path,
  method
) {
  const stack =
    findRoute(
      path,
      method
    )
      .route
      .stack;

  return stack[
    stack.length -
    1
  ].handle;
}


function response() {
  return {
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
}


const REVIEW_ROUTE =
  '/:applicantId/review';

const SCHEDULE_ROUTE =
  '/:applicantId/review/schedule';


findRoute(
  REVIEW_ROUTE,
  'post'
);

findRoute(
  SCHEDULE_ROUTE,
  'post'
);


for (
  const path
  of [
    REVIEW_ROUTE,
    SCHEDULE_ROUTE,
  ]
) {
  assert.ok(
    handlesFor(
      path,
      'post'
    ).some(
      handle =>
        handle._permission ===
        'applicant:talent-pool:manage'
    ),
    `${path} must require applicant:talent-pool:manage`
  );
}


/*
 * Review completion forwards Applicant,
 * payload, and actor.
 */
const reviewReq = {
  params: {
    applicantId:
      'applicant-1',
  },

  body: {
    nextReviewAt:
      '2026-10-23T10:00:00.000Z',
  },

  user: {
    id:
      'recruiter-1',
  },
};


const reviewRes =
  response();


async function run() {
  await finalHandler(
    REVIEW_ROUTE,
    'post'
  )(
    reviewReq,
    reviewRes
  );


  assert.strictEqual(
    capturedReview
      .applicantId,
    'applicant-1'
  );


  assert.deepStrictEqual(
    capturedReview
      .input,
    reviewReq.body
  );


  assert.strictEqual(
    capturedReview
      .actor,
    reviewReq.user
  );


  assert.strictEqual(
    reviewRes.statusCode,
    200
  );


  assert.strictEqual(
    reviewRes.body.success,
    true
  );


  assert.strictEqual(
    reviewRes
      .body
      .talent
      .talentPool
      .reviewStatus,

    'reviewed'
  );


  /*
   * Schedule route forwards payload without
   * pretending a review was completed.
   */
  const scheduleReq = {
    params: {
      applicantId:
        'applicant-2',
    },

    body: {
      nextReviewAt:
        '2026-11-01T09:00:00.000Z',
    },

    user: {
      id:
        'admin-1',
    },
  };


  const scheduleRes =
    response();


  await finalHandler(
    SCHEDULE_ROUTE,
    'post'
  )(
    scheduleReq,
    scheduleRes
  );


  assert.strictEqual(
    capturedSchedule
      .applicantId,
    'applicant-2'
  );


  assert.deepStrictEqual(
    capturedSchedule
      .input,
    scheduleReq.body
  );


  assert.strictEqual(
    capturedSchedule
      .actor,
    scheduleReq.user
  );


  assert.strictEqual(
    scheduleRes.statusCode,
    200
  );


  assert.strictEqual(
    scheduleRes.body.success,
    true
  );


  assert.strictEqual(
    scheduleRes
      .body
      .talent
      .talentPool
      .reviewStatus,

    'scheduled'
  );


  /*
   * Review validation codes remain client errors.
   */
  for (
    const code
    of [
      'INVALID_TALENT_POOL_REVIEW_INPUT',
      'INVALID_TALENT_POOL_REVIEW_DATE',
      'TALENT_POOL_REVIEW_DATE_REQUIRED',
      'TALENT_POOL_REVIEW_DATE_PAST',
    ]
  ) {
    const res =
      response();

    sendTalentPoolError(
      res,
      Object.assign(
        new Error(
          'Review contract error'
        ),
        {
          code,
        }
      )
    );

    assert.strictEqual(
      res.statusCode,
      400,
      `${code} must map to HTTP 400`
    );

    assert.strictEqual(
      res.body.success,
      false
    );
  }


  /*
   * Existing lifecycle conflicts stay 409.
   */
  const conflictRes =
    response();

  sendTalentPoolError(
    conflictRes,
    Object.assign(
      new Error(
        'Inactive membership'
      ),
      {
        code:
          'TALENT_POOL_MEMBERSHIP_CONFLICT',
      }
    )
  );

  assert.strictEqual(
    conflictRes.statusCode,
    409
  );


  console.log(
    '✅ POST /:applicantId/review registered'
  );

  console.log(
    '✅ POST /:applicantId/review/schedule registered'
  );

  console.log(
    '✅ review route requires applicant:talent-pool:manage'
  );

  console.log(
    '✅ schedule route requires applicant:talent-pool:manage'
  );

  console.log(
    '✅ review payload forwarded'
  );

  console.log(
    '✅ review actor forwarded'
  );

  console.log(
    '✅ schedule payload forwarded'
  );

  console.log(
    '✅ schedule actor forwarded'
  );

  console.log(
    '✅ review validation errors → HTTP 400'
  );

  console.log(
    '✅ membership conflicts remain HTTP 409'
  );

  console.log(
    '\nAPPLICANT TALENT POOL REVIEW API CONTRACT TEST PASSED'
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
