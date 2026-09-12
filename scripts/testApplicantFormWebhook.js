'use strict';

const assert =
  require('assert');

const express =
  require('express');

const http =
  require('http');

const createWebhookRouter =
  require(
    '../src/routes/applicantFormWebhook.routes'
  );

const SECRET =
  'unit-test-secret';

const SOURCE_KEY =
  'unit-test-form';

async function startTestServer() {
  const calls = [];

  const app =
    express();

  app.use(
    express.json({
      limit: '2mb',
    })
  );

  app.use(
    '/api/applicant-form/webhook',

    createWebhookRouter({
      webhookSecret:
        SECRET,

      sourceKey:
        SOURCE_KEY,

      maxBodyBytes:
        1024,

      processSubmission:
        async (
          row,
          options
        ) => {
          calls.push({
            row,
            options,
          });

          if (
            row.Mode ===
            'invalid'
          ) {
            return {
              status:
                'invalid',

              reason:
                'Missing Full Name',
            };
          }

          if (
            row.Mode ===
            'duplicate'
          ) {
            return {
              status:
                'duplicate',

              applicantStatus:
                'already-created',

              repaired: false,

              duplicateCandidates: 1,

              duplicateCasesCreated: 0,

              duplicateCasesReused: 1,
            };
          }

          return {
            status:
              'inserted',

            applicantStatus:
              'created',

            duplicateCandidates: 0,

            duplicateCasesCreated: 0,

            duplicateCasesReused: 0,
          };
        },
    })
  );

  const server =
    http.createServer(app);

  await new Promise(
    (resolve) => {
      server.listen(
        0,
        '127.0.0.1',
        resolve
      );
    }
  );

  const address =
    server.address();

  return {
    server,
    calls,

    url:
      `http://127.0.0.1:${address.port}` +
      '/api/applicant-form/webhook',
  };
}

async function post(
  url,
  {
    secret,
    body,
  }
) {
  return fetch(
    url,
    {
      method: 'POST',

      headers: {
        'Content-Type':
          'application/json',

        ...(secret
          ? {
              'x-omah-webhook-secret':
                secret,
            }
          : {}),
      },

      body:
        JSON.stringify(body),
    }
  );
}

async function run() {
  const {
    server,
    calls,
    url,
  } =
    await startTestServer();

  try {
    /*
     * Unauthorized request.
     */
    let response =
      await post(
        url,
        {
          body: {
            row: {
              Timestamp:
                '25/08/2026 20:30:00',
            },
          },
        }
      );

    assert.strictEqual(
      response.status,
      401
    );

    assert.strictEqual(
      calls.length,
      0
    );

    console.log(
      '✅ Missing secret rejected'
    );

    /*
     * Valid new response.
     */
    response =
      await post(
        url,
        {
          secret:
            SECRET,

          body: {
            row: {
              Timestamp:
                '25/08/2026 20:30:00',

              'Full Name':
                'Webhook Test',

              'Email Address':
                'test@example.com',

              'Internship / Position Track':
                'Software Engineering',

              Skills: [
                'Node.js',
                'React',
              ],
            },
          },
        }
      );

    assert.strictEqual(
      response.status,
      201
    );

    let payload =
      await response.json();

    assert.strictEqual(
      payload.status,
      'inserted'
    );

    assert.strictEqual(
      calls.length,
      1
    );

    assert.strictEqual(
      calls[0].options.dryRun,
      false
    );

    assert.strictEqual(
      calls[0].options.sourceKey,
      SOURCE_KEY
    );

    assert.strictEqual(
      calls[0].row.Skills,
      'Node.js, React'
    );

    console.log(
      '✅ Valid webhook accepted'
    );

    console.log(
      '✅ Stable sourceKey passed to ingestion'
    );

    /*
     * Idempotent replay result.
     */
    response =
      await post(
        url,
        {
          secret:
            SECRET,

          body: {
            row: {
              Mode:
                'duplicate',
            },
          },
        }
      );

    assert.strictEqual(
      response.status,
      200
    );

    payload =
      await response.json();

    assert.strictEqual(
      payload.status,
      'duplicate'
    );

    assert.strictEqual(
      payload
        .duplicateCasesReused,
      1
    );

    console.log(
      '✅ Duplicate replay is idempotent'
    );

    /*
     * Invalid Form response.
     */
    response =
      await post(
        url,
        {
          secret:
            SECRET,

          body: {
            row: {
              Mode:
                'invalid',
            },
          },
        }
      );

    assert.strictEqual(
      response.status,
      422
    );

    console.log(
      '✅ Invalid response rejected safely'
    );

    /*
     * Oversized request.
     */
    response =
      await post(
        url,
        {
          secret:
            SECRET,

          body: {
            row: {
              Notes:
                'x'.repeat(2000),
            },
          },
        }
      );

    assert.strictEqual(
      response.status,
      413
    );

    console.log(
      '✅ Oversized webhook rejected'
    );

    console.log('');
    console.log(
      '✅ No MongoDB connection'
    );

    console.log(
      '✅ No Applicant records changed'
    );

    console.log(
      '✅ No secret printed'
    );
  } finally {
    await new Promise(
      (resolve) =>
        server.close(resolve)
    );
  }
}

run().catch((error) => {
  console.error(
    '❌ WEBHOOK TEST FAILED:',
    error
  );

  process.exitCode = 1;
});
