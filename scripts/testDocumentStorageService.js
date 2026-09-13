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
  buildStorageKey,
  sha256,
  createLocalStorageProvider,
  createExternalStorageProvider,
  createS3StorageProvider,
} = require(
  '../services/documentStorageService'
);

async function run() {
  const tempDir =
    await fsp.mkdtemp(
      path.join(
        os.tmpdir(),
        'omah-doc-storage-'
      )
    );

  try {
    const key =
      buildStorageKey({
        applicantId:
          'applicant-001',

        documentGroupId:
          'group-001',

        version: 1,

        originalFileName:
          'My Private CV.pdf',

        objectId:
          'object-001',
      });

    assert.strictEqual(
      key,
      'applicants/applicant-001/group-001/v1/object-001.pdf'
    );

    assert.strictEqual(
      key.includes(
        'My Private CV'
      ),
      false
    );

    console.log(
      '✅ privacy-safe storage key generated'
    );

    const body =
      Buffer.from(
        'OMAH TEST DOCUMENT'
      );

    assert.strictEqual(
      sha256(body).length,
      64
    );

    console.log(
      '✅ SHA-256 checksum generated'
    );

    const local =
      createLocalStorageProvider({
        baseDir:
          tempDir,
      });

    const stored =
      await local.put({
        key,
        body,
      });

    assert.strictEqual(
      stored.provider,
      'local'
    );

    assert.strictEqual(
      stored.sizeBytes,
      body.length
    );

    assert.strictEqual(
      await local.exists({
        key,
      }),
      true
    );

    console.log(
      '✅ local provider stores immutable object'
    );

    await assert.rejects(
      () =>
        local.put({
          key,
          body,
        }),

      /already exists/i
    );

    console.log(
      '✅ local overwrite blocked'
    );

    const descriptor =
      await local
        .getDownloadDescriptor({
          key,
        });

    assert.strictEqual(
      descriptor.kind,
      'local_file'
    );

    assert(
      descriptor.absolutePath
        .startsWith(
          path.resolve(
            tempDir
          )
        )
    );

    console.log(
      '✅ local download descriptor secured'
    );

    await assert.rejects(
      () =>
        local.put({
          key:
            '../outside.pdf',

          body,
        }),

      /invalid path segment|invalid storage key/i
    );

    console.log(
      '✅ path traversal rejected'
    );

    const external =
      createExternalStorageProvider();

    const externalDescriptor =
      await external
        .getDownloadDescriptor({
          externalUrl:
            'https://drive.google.com/example',
        });

    assert.strictEqual(
      externalDescriptor.kind,
      'external_url'
    );

    await assert.rejects(
      () =>
        external.put({
          key,
          body,
        }),

      /read-only/i
    );

    console.log(
      '✅ legacy external provider is read-only'
    );

    const calls = [];

    const s3 =
      createS3StorageProvider({
        bucket:
          'private-omah-test',

        signedUrlExpiresIn:
          300,

        adapter: {
          async putObject(
            input
          ) {
            calls.push([
              'put',
              input,
            ]);
          },

          async objectExists(
            input
          ) {
            calls.push([
              'exists',
              input,
            ]);

            return true;
          },

          async getSignedDownloadUrl(
            input
          ) {
            calls.push([
              'signed',
              input,
            ]);

            return 'https://signed.example/test';
          },

          async deleteObject(
            input
          ) {
            calls.push([
              'delete',
              input,
            ]);
          },
        },
      });

    const s3Stored =
      await s3.put({
        key,
        body,

        contentType:
          'application/pdf',
      });

    assert.strictEqual(
      s3Stored.provider,
      's3'
    );

    assert.strictEqual(
      await s3.exists({
        key,
      }),
      true
    );

    const signed =
      await s3
        .getDownloadDescriptor({
          key,
        });

    assert.strictEqual(
      signed.kind,
      'signed_url'
    );

    assert.strictEqual(
      signed.expiresIn,
      300
    );

    assert.strictEqual(
      signed.url,
      'https://signed.example/test'
    );

    assert.strictEqual(
      calls.some(
        ([name]) =>
          name === 'put'
      ),
      true
    );

    console.log(
      '✅ S3 adapter contract works'
    );

    assert.strictEqual(
      await external.cleanup(),
      false
    );

    await s3.cleanup({
      key,
    });

    assert.strictEqual(
      calls.some(
        ([name]) =>
          name === 'delete'
      ),
      true
    );

    console.log(
      '✅ rollback cleanup contract works'
    );

    assert.strictEqual(
      await local.cleanup({
        key,
      }),
      true
    );

    assert.strictEqual(
      await local.exists({
        key,
      }),
      false
    );

    console.log(
      '✅ temporary local object cleaned up'
    );

    console.log(
      '✅ no MongoDB or real S3 connection used'
    );

    console.log(
      '\nTASK 4 DOCUMENT STORAGE TEST PASSED'
    );
  } finally {
    await fsp.rm(
      tempDir,
      {
        recursive: true,
        force: true,
      }
    );
  }
}

run().catch(
  (error) => {
    console.error(error);
    process.exitCode = 1;
  }
);

