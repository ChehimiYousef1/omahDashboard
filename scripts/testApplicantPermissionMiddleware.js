'use strict';

const assert =
  require('assert');

const requireApplicantPermission =
  require(
    '../middleware/requireApplicantPermission'
  );

function createResponse() {
  return {
    statusCode: 200,
    body: null,

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

function run({
  user,
  permission,
}) {
  const req = {
    user,
  };

  const res =
    createResponse();

  let nextCalled =
    false;

  requireApplicantPermission(
    permission
  )(
    req,
    res,
    () => {
      nextCalled =
        true;
    }
  );

  return {
    res,
    nextCalled,
  };
}

assert.strictEqual(
  run({
    user: {
      role: 'Admin',
    },

    permission:
      'applicant:edit',
  }).nextCalled,

  true
);

assert.strictEqual(
  run({
    user: {
      role:
        'Super Admin',
    },

    permission:
      'applicant:archive',
  }).nextCalled,

  true
);

const recruiter =
  run({
    user: {
      role:
        'Recruiter',
    },

    permission:
      'applicant:view',
  });

assert.strictEqual(
  recruiter.nextCalled,
  false
);

assert.strictEqual(
  recruiter.res.statusCode,
  403
);

const anonymous =
  run({
    user: null,

    permission:
      'applicant:view',
  });

assert.strictEqual(
  anonymous.res.statusCode,
  401
);

assert.throws(
  () =>
    requireApplicantPermission(
      'applicant:unknown'
    ),

  /Unknown Applicant permission/
);

console.log(
  '✅ TASK 13 PERMISSION MIDDLEWARE PASSED'
);

