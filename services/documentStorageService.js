'use strict';

const crypto =
  require('crypto');

const fs =
  require('fs');

const fsp =
  fs.promises;

const path =
  require('path');

function storageError(
  code,
  message
) {
  const error =
    new Error(message);

  error.code = code;

  return error;
}

function normalizeKey(key) {
  const value =
    String(
      key ?? ''
    )
      .trim()
      .replace(
        /\\/g,
        '/'
      );

  if (!value) {
    throw storageError(
      'STORAGE_KEY_REQUIRED',
      'Storage key is required.'
    );
  }

  if (
    value.startsWith('/') ||
    /^[A-Za-z]:\//.test(
      value
    )
  ) {
    throw storageError(
      'INVALID_STORAGE_KEY',
      'Absolute storage paths are not allowed.'
    );
  }

  const segments =
    value.split('/');

  if (
    segments.some(
      (segment) =>
        !segment ||
        segment === '.' ||
        segment === '..'
    )
  ) {
    throw storageError(
      'INVALID_STORAGE_KEY',
      'Storage key contains an invalid path segment.'
    );
  }

  return segments.join('/');
}

function sanitizeSegment(
  value,
  fieldName
) {
  const sanitized =
    String(
      value ?? ''
    )
      .trim()
      .replace(
        /[^A-Za-z0-9_-]/g,
        '_'
      );

  if (!sanitized) {
    throw storageError(
      'INVALID_STORAGE_SEGMENT',
      fieldName +
        ' is required.'
    );
  }

  return sanitized;
}

function normalizeExtension(
  originalFileName
) {
  const extension =
    path
      .extname(
        String(
          originalFileName ??
            ''
        )
      )
      .toLowerCase();

  if (
    !extension ||
    !/^\.[a-z0-9]{1,10}$/.test(
      extension
    )
  ) {
    return '';
  }

  return extension;
}

function buildStorageKey({
  applicantId,

  documentGroupId,

  version,

  originalFileName = '',

  objectId =
    crypto.randomUUID(),
}) {
  const safeApplicantId =
    sanitizeSegment(
      applicantId,
      'applicantId'
    );

  const safeGroupId =
    sanitizeSegment(
      documentGroupId,
      'documentGroupId'
    );

  const safeObjectId =
    sanitizeSegment(
      objectId,
      'objectId'
    );

  const numericVersion =
    Number(version);

  if (
    !Number.isInteger(
      numericVersion
    ) ||
    numericVersion < 1
  ) {
    throw storageError(
      'INVALID_DOCUMENT_VERSION',
      'version must be a positive integer.'
    );
  }

  const extension =
    normalizeExtension(
      originalFileName
    );

  return [
    'applicants',
    safeApplicantId,
    safeGroupId,
    'v' + numericVersion,
    safeObjectId +
      extension,
  ].join('/');
}

function sha256(body) {
  if (
    !Buffer.isBuffer(body) &&
    !(
      body instanceof
      Uint8Array
    )
  ) {
    throw storageError(
      'INVALID_STORAGE_BODY',
      'Storage body must be a Buffer or Uint8Array.'
    );
  }

  return crypto
    .createHash('sha256')
    .update(body)
    .digest('hex');
}

function toBuffer(body) {
  if (
    Buffer.isBuffer(body)
  ) {
    return body;
  }

  if (
    body instanceof
      Uint8Array
  ) {
    return Buffer.from(
      body
    );
  }

  throw storageError(
    'INVALID_STORAGE_BODY',
    'Storage body must be a Buffer or Uint8Array.'
  );
}

function createLocalStorageProvider({
  baseDir,
}) {
  if (!baseDir) {
    throw storageError(
      'LOCAL_STORAGE_DIR_REQUIRED',
      'baseDir is required for local storage.'
    );
  }

  const root =
    path.resolve(
      baseDir
    );

  function resolveKey(key) {
    const normalized =
      normalizeKey(key);

    const absolute =
      path.resolve(
        root,
        ...normalized.split('/')
      );

    if (
      absolute !== root &&
      !absolute.startsWith(
        root + path.sep
      )
    ) {
      throw storageError(
        'INVALID_STORAGE_KEY',
        'Storage key escapes the configured storage directory.'
      );
    }

    return {
      key: normalized,
      absolute,
    };
  }

  return {
    provider: 'local',

    async put({
      key,
      body,
    }) {
      const resolved =
        resolveKey(key);

      const buffer =
        toBuffer(body);

      await fsp.mkdir(
        path.dirname(
          resolved.absolute
        ),
        {
          recursive: true,
          mode: 0o700,
        }
      );

      try {
        await fsp.writeFile(
          resolved.absolute,
          buffer,
          {
            flag: 'wx',
            mode: 0o600,
          }
        );
      } catch (error) {
        if (
          error?.code ===
            'EEXIST'
        ) {
          throw storageError(
            'STORAGE_OBJECT_EXISTS',
            'Storage object already exists.'
          );
        }

        throw error;
      }

      return {
        provider:
          'local',

        key:
          resolved.key,

        sizeBytes:
          buffer.length,

        checksumSha256:
          sha256(buffer),
      };
    },

    async exists({
      key,
    }) {
      const resolved =
        resolveKey(key);

      try {
        await fsp.access(
          resolved.absolute,
          fs.constants.F_OK
        );

        return true;
      } catch (error) {
        if (
          error?.code ===
            'ENOENT'
        ) {
          return false;
        }

        throw error;
      }
    },

    async getDownloadDescriptor({
      key,
    }) {
      const resolved =
        resolveKey(key);

      if (
        !await this.exists({
          key:
            resolved.key,
        })
      ) {
        throw storageError(
          'STORAGE_OBJECT_NOT_FOUND',
          'Storage object was not found.'
        );
      }

      /*
       * Internal descriptor only.
       * Do not expose absolute paths
       * directly to the browser.
       *
       * The API layer will stream this
       * file after authentication.
       */
      return {
        provider:
          'local',

        kind:
          'local_file',

        key:
          resolved.key,

        absolutePath:
          resolved.absolute,
      };
    },

    /*
     * Internal rollback helper only.
     *
     * This is NOT a business-level
     * document deletion operation.
     */
    async cleanup({
      key,
    }) {
      const resolved =
        resolveKey(key);

      try {
        await fsp.unlink(
          resolved.absolute
        );

        return true;
      } catch (error) {
        if (
          error?.code ===
            'ENOENT'
        ) {
          return false;
        }

        throw error;
      }
    },
  };
}

function createExternalStorageProvider() {
  return {
    provider:
      'external',

    async put() {
      throw storageError(
        'EXTERNAL_STORAGE_READ_ONLY',
        'External storage is read-only.'
      );
    },

    async exists({
      externalUrl,
    }) {
      return Boolean(
        String(
          externalUrl ??
            ''
        ).trim()
      );
    },

    async getDownloadDescriptor({
      externalUrl,
    }) {
      const url =
        String(
          externalUrl ??
            ''
        ).trim();

      if (!url) {
        throw storageError(
          'EXTERNAL_URL_REQUIRED',
          'externalUrl is required.'
        );
      }

      return {
        provider:
          'external',

        kind:
          'external_url',

        url,
      };
    },

    async cleanup() {
      /*
       * Existing external files
       * are never deleted by OMAH.
       */
      return false;
    },
  };
}

function createS3StorageProvider({
  bucket,
  adapter,
  signedUrlExpiresIn =
    300,
}) {
  const normalizedBucket =
    String(
      bucket ?? ''
    ).trim();

  if (!normalizedBucket) {
    throw storageError(
      'S3_BUCKET_REQUIRED',
      'bucket is required for S3 storage.'
    );
  }

  if (
    !adapter ||
    typeof adapter !==
      'object'
  ) {
    throw storageError(
      'S3_ADAPTER_REQUIRED',
      'An S3 adapter is required.'
    );
  }

  for (
    const method
    of [
      'putObject',
      'objectExists',
      'getSignedDownloadUrl',
      'deleteObject',
    ]
  ) {
    if (
      typeof adapter[
        method
      ] !==
      'function'
    ) {
      throw storageError(
        'INVALID_S3_ADAPTER',
        'S3 adapter must implement ' +
          method +
          '().'
      );
    }
  }

  return {
    provider: 's3',

    async put({
      key,
      body,
      contentType =
        'application/octet-stream',
    }) {
      const normalizedKey =
        normalizeKey(key);

      const buffer =
        toBuffer(body);

      await adapter.putObject({
        bucket:
          normalizedBucket,

        key:
          normalizedKey,

        body:
          buffer,

        contentType,
      });

      return {
        provider:
          's3',

        key:
          normalizedKey,

        sizeBytes:
          buffer.length,

        checksumSha256:
          sha256(buffer),
      };
    },

    async exists({
      key,
    }) {
      const normalizedKey =
        normalizeKey(key);

      return Boolean(
        await adapter.objectExists({
          bucket:
            normalizedBucket,

          key:
            normalizedKey,
        })
      );
    },

    async getDownloadDescriptor({
      key,
    }) {
      const normalizedKey =
        normalizeKey(key);

      const url =
        await adapter
          .getSignedDownloadUrl({
            bucket:
              normalizedBucket,

            key:
              normalizedKey,

            expiresIn:
              signedUrlExpiresIn,
          });

      return {
        provider:
          's3',

        kind:
          'signed_url',

        key:
          normalizedKey,

        url,

        expiresIn:
          signedUrlExpiresIn,
      };
    },

    /*
     * Used only for rollback of a
     * failed upload transaction.
     */
    async cleanup({
      key,
    }) {
      const normalizedKey =
        normalizeKey(key);

      await adapter.deleteObject({
        bucket:
          normalizedBucket,

        key:
          normalizedKey,
      });

      return true;
    },
  };
}

function createDocumentStorageProvider({
  provider,
  ...options
}) {
  switch (
    String(
      provider ?? ''
    ).trim()
  ) {
    case 'local':
      return createLocalStorageProvider(
        options
      );

    case 'external':
      return createExternalStorageProvider();

    case 's3':
      return createS3StorageProvider(
        options
      );

    default:
      throw storageError(
        'INVALID_STORAGE_PROVIDER',
        'Unknown document storage provider.'
      );
  }
}

module.exports = {
  normalizeKey,
  buildStorageKey,
  sha256,

  createLocalStorageProvider,
  createExternalStorageProvider,
  createS3StorageProvider,
  createDocumentStorageProvider,
};

