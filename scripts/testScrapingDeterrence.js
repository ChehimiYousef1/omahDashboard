'use strict';

const assert =
  require('assert');

const express =
  require('express');

const fs =
  require('fs');

const http =
  require('http');

const path =
  require('path');

const {
  createAuthenticatedReadLimiter,
} = require(
  '../middleware/scrapingDeterrence'
);


function read(relativePath) {
  return fs.readFileSync(
    path.join(
      __dirname,
      '..',
      relativePath
    ),
    'utf8'
  );
}


function request(
  port,
  {
    method = 'GET',
    pathName = '/',
    user = 'user-a',
  } = {}
) {
  return new Promise(
    (
      resolve,
      reject
    ) => {
      const req =
        http.request(
          {
            host:
              '127.0.0.1',

            port,

            method,

            path:
              pathName,

            headers: {
              'x-test-user':
                user,
            },
          },
          res => {
            const chunks = [];

            res.on(
              'data',
              chunk =>
                chunks.push(
                  chunk
                )
            );

            res.on(
              'end',
              () => {
                resolve({
                  statusCode:
                    res.statusCode,

                  headers:
                    res.headers,

                  body:
                    Buffer.concat(
                      chunks
                    ).toString(
                      'utf8'
                    ),
                });
              }
            );
          }
        );

      req.on(
        'error',
        reject
      );

      req.end();
    }
  );
}


async function dynamicLimiterTest() {
  const app =
    express();

  app.use(
    (
      req,
      _res,
      next
    ) => {
      req.user = {
        id:
          req.get(
            'x-test-user'
          ) ||
          'user-a',
      };

      next();
    }
  );

  const limiter =
    createAuthenticatedReadLimiter({
      windowMs:
        60 * 1000,

      max:
        2,
    });

  app.all(
    '/sensitive',
    limiter,
    (_req, res) => {
      res.json({
        success: true,
      });
    }
  );

  const server =
    http.createServer(
      app
    );

  await new Promise(
    resolve =>
      server.listen(
        0,
        '127.0.0.1',
        resolve
      )
  );

  const {
    port,
  } =
    server.address();

  try {
    const first =
      await request(
        port,
        {
          user:
            'user-a',
          pathName:
            '/sensitive',
        }
      );

    const second =
      await request(
        port,
        {
          user:
            'user-a',
          pathName:
            '/sensitive',
        }
      );

    const third =
      await request(
        port,
        {
          user:
            'user-a',
          pathName:
            '/sensitive',
        }
      );

    assert.strictEqual(
      first.statusCode,
      200
    );

    assert.strictEqual(
      second.statusCode,
      200
    );

    assert.strictEqual(
      third.statusCode,
      429
    );

    assert.match(
      third.body,
      /SCRAPING_RATE_LIMITED/
    );

    const otherUser =
      await request(
        port,
        {
          user:
            'user-b',
          pathName:
            '/sensitive',
        }
      );

    assert.strictEqual(
      otherUser.statusCode,
      200
    );

    const write =
      await request(
        port,
        {
          method:
            'POST',
          user:
            'user-a',
          pathName:
            '/sensitive',
        }
      );

    assert.strictEqual(
      write.statusCode,
      200
    );

    console.log(
      '✅ per-user GET/HEAD limiter is isolated by authenticated user'
    );

    console.log(
      '✅ non-read methods do not consume scraping-read budget'
    );
  } finally {
    await new Promise(
      resolve =>
        server.close(
          resolve
        )
    );
  }
}


async function main() {
  const middleware =
    read(
      'src/bootstrap/configureMiddleware.js'
    );

  assert.match(
    middleware,
    /P9 SCRAPING DETERRENCE/
  );

  assert.match(
    middleware,
    /'Cache-Control',\s*'private, no-store'/
  );

  assert.match(
    middleware,
    /'Surrogate-Control',\s*'no-store'/
  );

  assert.match(
    middleware,
    /const apiReadLimiter\s*=\s*rateLimit/
  );

  assert.match(
    middleware,
    /max:\s*600/
  );

  assert.match(
    middleware,
    /apiMutationLimiter,\s*apiReadLimiter/
  );

  console.log(
    '✅ API cache and IP read deterrence contract'
  );


  const registry =
    read(
      'src/bootstrap/registerApiRoutes.js'
    );

  const protectedRoutes = [
    '/api/posts',
    '/api/users',
    '/api/companies',
    '/api/applications',
    '/api/applicants/:applicantId/documents',
    '/api/applicants/:applicantId/reports',
    '/api/applicants/talent-pool',
    '/api/applicants',
  ];

  for (
    const route
    of protectedRoutes
  ) {
    const token =
      `'${route}'`;

    const index =
      registry.indexOf(
        token
      );

    assert.ok(
      index >= 0,
      `Missing route mount: ${route}`
    );

    const start =
      registry.lastIndexOf(
        'app.use(',
        index
      );

    const end =
      registry.indexOf(
        '\n  );',
        index
      );

    assert.ok(
      start >= 0 &&
      end >= 0,
      `Could not bound route mount: ${route}`
    );

    const block =
      registry.slice(
        start,
        end
      );

    assert.match(
      block,
      /authenticateToken/
    );

    assert.match(
      block,
      /authenticatedReadLimiter/
    );
  }

  console.log(
    '✅ sensitive read surfaces require auth + per-user read limiting'
  );


  const postsIndex =
    registry.indexOf(
      "'/api/posts'"
    );

  const postsBlock =
    registry.slice(
      registry.lastIndexOf(
        'app.use(',
        postsIndex
      ),
      registry.indexOf(
        '\n  );',
        postsIndex
      )
    );

  assert.match(
    postsBlock,
    /authenticateToken/
  );

  console.log(
    '✅ posts endpoint is not anonymously scrapeable'
  );


  await dynamicLimiterTest();

  console.log('');
  console.log(
    'P9 SCRAPING DETERRENCE TEST PASSED'
  );
}


main().catch(
  error => {
    console.error(
      error
    );

    process.exit(
      1
    );
  }
);
