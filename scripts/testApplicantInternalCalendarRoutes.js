'use strict';

const assert =
  require('assert');

const createApplicantRouter =
  require(
    '../src/routes/applicants.routes'
  );


function permissionMiddleware(
  permission
) {
  const middleware =
    (req, res, next) =>
      next();

  middleware.permission =
    permission;

  return middleware;
}


const calls = {
  add: [],
  update: [],
  remove: [],
  activities: [],
};


function calendarNote({
  kind = 'task',
  linked = true,
} = {}) {
  return {
    _id:
      'note-1',

    kind,

    calendar: linked
      ? {
          provider:
            'google_calendar',

          eventId:
            'event-1',

          syncStatus:
            'synced',
        }
      : {
          provider:
            '',

          eventId:
            '',

          syncStatus:
            'not_synced',
        },
  };
}


const router =
  createApplicantRouter({
    requireApplicantPermission:
      permissionMiddleware,

    async addInternalItemToCalendar(
      payload
    ) {
      calls.add.push(
        payload
      );

      return {
        note:
          calendarNote({
            kind:
              'task',
          }),
      };
    },

    async updateInternalItemCalendar(
      payload
    ) {
      calls.update.push(
        payload
      );

      return {
        note:
          calendarNote({
            kind:
              'note',
          }),
      };
    },

    async removeInternalItemFromCalendar(
      payload
    ) {
      calls.remove.push(
        payload
      );

      return {
        note:
          calendarNote({
            kind:
              'task',

            linked:
              false,
          }),
      };
    },

    async recordActivity(
      payload
    ) {
      calls.activities.push(
        payload
      );
    },

    activityLogger: {
      error() {},
    },
  });


function routeLayer(
  method,
  path
) {
  const layer =
    router.stack.find(
      candidate =>
        candidate.route &&
        candidate.route.path ===
          path &&
        candidate.route.methods[
          method
        ]
    );

  assert(
    layer,
    `Missing route: ${method.toUpperCase()} ${path}`
  );

  return layer;
}


function handlerFor(
  method,
  path
) {
  const layer =
    routeLayer(
      method,
      path
    );

  const permission =
    layer.route.stack[0]
      ?.handle
      ?.permission;

  assert.strictEqual(
    permission,
    'applicant:notes:manage'
  );

  return layer.route
    .stack
    .at(-1)
    .handle;
}


function response() {
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


function request(
  body = {}
) {
  return {
    params: {
      id:
        'applicant-1',

      noteId:
        'note-1',
    },

    body,

    user: {
      id:
        'admin-1',

      name:
        'Admin User',

      email:
        'admin@example.com',

      role:
        'ADMIN',
    },
  };
}


async function run() {
  const path =
    '/:id/notes/:noteId/calendar';


  const addHandler =
    handlerFor(
      'post',
      path
    );

  const addResponse =
    response();

  await addHandler(
    request({
      timezone:
        'Asia/Beirut',
    }),
    addResponse
  );

  assert.strictEqual(
    addResponse.statusCode,
    201
  );

  assert.strictEqual(
    addResponse.body.success,
    true
  );

  assert.strictEqual(
    calls.add.length,
    1
  );

  assert.strictEqual(
    calls.add[0].timezone,
    'Asia/Beirut'
  );

  assert.strictEqual(
    calls.add[0].actor.userId,
    'admin-1'
  );

  assert.strictEqual(
    calls.activities.at(-1).type,
    'task.calendar_added'
  );

  console.log(
    '✅ POST Calendar route uses injected sync service'
  );


  const updateHandler =
    handlerFor(
      'patch',
      path
    );

  const updateResponse =
    response();

  await updateHandler(
    request({
      timezone:
        'Asia/Beirut',
    }),
    updateResponse
  );

  assert.strictEqual(
    updateResponse.statusCode,
    200
  );

  assert.strictEqual(
    calls.update.length,
    1
  );

  assert.strictEqual(
    calls.activities.at(-1).type,
    'note.calendar_updated'
  );

  console.log(
    '✅ PATCH Calendar route uses injected sync service'
  );


  const removeHandler =
    handlerFor(
      'delete',
      path
    );

  const removeResponse =
    response();

  await removeHandler(
    request(),
    removeResponse
  );

  assert.strictEqual(
    removeResponse.statusCode,
    200
  );

  assert.strictEqual(
    calls.remove.length,
    1
  );

  assert.strictEqual(
    calls.activities.at(-1).type,
    'task.calendar_removed'
  );

  console.log(
    '✅ DELETE Calendar route uses injected sync service'
  );


  assert.strictEqual(
    calls.add.length +
    calls.update.length +
    calls.remove.length,
    3
  );

  console.log(
    '✅ route test performed no Google Calendar call'
  );

  console.log(
    '\nAPPLICANT INTERNAL CALENDAR ROUTE TEST PASSED'
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
