'use strict';

const assert =
  require('assert');

const fs =
  require('fs');

const fsp =
  fs.promises;

const os =
  require('os');

const path =
  require('path');

const {
  createLocalStorageProvider,
} = require(
  '../services/documentStorageService'
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


function modeBits(stat) {
  return stat.mode & 0o777;
}


async function main() {
  const middleware =
    read(
      'src/bootstrap/configureMiddleware.js'
    );

  assert.match(
    middleware,
    /contentSecurityPolicy:\s*isProduction/
  );

  assert.match(
    middleware,
    /frameAncestors/
  );

  assert.match(
    middleware,
    /scriptSrcAttr/
  );

  assert.match(
    middleware,
    /app\.disable\(\s*'x-powered-by'/
  );

  assert.match(
    middleware,
    /Production Origin boundary/
  );

  assert.match(
    middleware,
    /!isProduction\s*&&\s*\/\^http/
  );

  assert.match(
    middleware,
    /Production origin must use HTTPS/
  );

  console.log(
    '✅ production CSP / Origin boundary'
  );


  const authRoutes =
    read(
      'src/routes/auth.routes.js'
    );

  const authMiddleware =
    read(
      'middleware/auth.js'
    );

  assert.match(
    authRoutes,
    /algorithm:\s*'HS256'/
  );

  assert.match(
    authMiddleware,
    /algorithms:\s*\[\s*'HS256'/
  );

  assert.match(
    authRoutes,
    /httpOnly:\s*true/
  );

  assert.match(
    authRoutes,
    /sameSite:\s*'lax'/
  );

  assert.match(
    authRoutes,
    /path:\s*'\/'/
  );

  assert.match(
    authRoutes,
    /Cache-Control/
  );

  assert.match(
    authRoutes,
    /authCookieClearOptions/
  );

  assert.match(
    authMiddleware,
    /JWT_SECRET\.length\s*<\s*32/
  );

  console.log(
    '✅ JWT / auth cookie hardening'
  );


  const envExample =
    read(
      '.env.example'
    );

  for (
    const expected
    of [
      'ALLOW_SIGNUP=false',
      'APPLICANT_AUTO_SYNC_ENABLED=false',
      'APPLICANT_SYNC_WRITE_ENABLED=false',
      'GOOGLE_CALENDAR_ENABLED=false',
      'GOOGLE_CALENDAR_WRITE_ENABLED=false',
      'GOOGLE_DRIVE_DOCUMENT_IMPORT_ENABLED=false',
      'INTERVIEW_EMAIL_ENABLED=false',
      'SWAGGER_ENABLED=false',
      'DEV_API_ENABLED=false',
      'DOCUMENT_STORAGE_PROVIDER=',
    ]
  ) {
    assert.ok(
      envExample.includes(
        expected
      ),
      `Missing safe environment contract: ${expected}`
    );
  }

  console.log(
    '✅ safe committed environment defaults'
  );


  const tempRoot =
    await fsp.mkdtemp(
      path.join(
        os.tmpdir(),
        'omah-security-storage-'
      )
    );

  try {
    const baseDir =
      path.join(
        tempRoot,
        'private-storage',
        'applicant-documents'
      );

    const storage =
      createLocalStorageProvider({
        baseDir,
      });

    const key =
      'applicants/test/document/v1/test.pdf';

    await storage.put({
      key,
      body:
        Buffer.from(
          'p6-permission-test'
        ),
    });

    const filePath =
      path.join(
        baseDir,
        ...key.split('/')
      );

    const fileStat =
      await fsp.stat(
        filePath
      );

    assert.strictEqual(
      modeBits(fileStat),
      0o600
    );

    let directory =
      path.dirname(filePath);

    while (
      directory.startsWith(
        path.resolve(baseDir)
      )
    ) {
      const stat =
        await fsp.stat(
          directory
        );

      assert.strictEqual(
        modeBits(stat),
        0o700
      );

      if (
        path.resolve(directory) ===
        path.resolve(baseDir)
      ) {
        break;
      }

      directory =
        path.dirname(
          directory
        );
    }

    console.log(
      '✅ new private storage uses 0700 / 0600'
    );
  } finally {
    await fsp.rm(
      tempRoot,
      {
        recursive: true,
        force: true,
      }
    );
  }


  assert.ok(
    read(
      'docs/securityAuditP5.md'
    ).includes(
      'hard failures: **0**'
    )
  );

  assert.ok(
    read(
      'docs/security.md'
    ).includes(
      'P5/P6 verified hardening'
    )
  );

  console.log(
    '✅ security audit documentation'
  );

  console.log('');
  console.log(
    'PRODUCTION SECURITY HARDENING TEST PASSED'
  );
}


main().catch(
  error => {
    console.error(error);
    process.exit(1);
  }
);
