'use strict';

const path =
  require('path');

const {
  createLocalStorageProvider,
  createExternalStorageProvider,
  createS3StorageProvider,
} = require(
  './documentStorageService'
);

const {
  createAwsS3DocumentAdapter,
} = require(
  './awsS3DocumentAdapter'
);

function envText(
  env,
  key
) {
  return String(
    env[key] ?? ''
  ).trim();
}

function configuredProviderName(
  env = process.env
) {
  const configured =
    envText(
      env,
      'DOCUMENT_STORAGE_PROVIDER'
    );

  if (configured) {
    return configured;
  }

  if (
    env.NODE_ENV ===
    'production'
  ) {
    const error =
      new Error(
        'DOCUMENT_STORAGE_PROVIDER must be configured in production.'
      );

    error.code =
      'DOCUMENT_STORAGE_PROVIDER_REQUIRED';

    throw error;
  }

  return 'local';
}

function createDocumentStorageFactory({
  env = process.env,
  cwd = process.cwd(),
  s3Adapter,
} = {}) {
  let localProvider = null;
  let externalProvider = null;
  let s3Provider = null;

  function getLocal() {
    if (!localProvider) {
      const baseDir =
        envText(
          env,
          'DOCUMENT_LOCAL_STORAGE_DIR'
        ) ||
        path.join(
          cwd,
          'private-storage',
          'applicant-documents'
        );

      localProvider =
        createLocalStorageProvider({
          baseDir,
        });
    }

    return localProvider;
  }

  function getExternal() {
    if (!externalProvider) {
      externalProvider =
        createExternalStorageProvider();
    }

    return externalProvider;
  }

  function getS3() {
    if (!s3Provider) {
      const bucket =
        envText(
          env,
          'DOCUMENT_S3_BUCKET'
        );

      const region =
        envText(
          env,
          'AWS_REGION'
        ) ||
        envText(
          env,
          'AWS_DEFAULT_REGION'
        );

      const endpoint =
        envText(
          env,
          'DOCUMENT_S3_ENDPOINT'
        );

      const forcePathStyle =
        envText(
          env,
          'DOCUMENT_S3_FORCE_PATH_STYLE'
        ).toLowerCase() ===
        'true';

      const adapter =
        s3Adapter ||
        createAwsS3DocumentAdapter({
          region,
          endpoint:
            endpoint ||
            undefined,
          forcePathStyle,
        });

      s3Provider =
        createS3StorageProvider({
          bucket,
          adapter,

          signedUrlExpiresIn:
            300,
        });
    }

    return s3Provider;
  }

  function getProvider(
    provider
  ) {
    switch (
      String(
        provider ?? ''
      ).trim()
    ) {
      case 'local':
        return getLocal();

      case 'external':
        return getExternal();

      case 's3':
        return getS3();

      default: {
        const error =
          new Error(
            'Unknown document storage provider.'
          );

        error.code =
          'INVALID_STORAGE_PROVIDER';

        throw error;
      }
    }
  }

  function getUploadProvider() {
    return getProvider(
      configuredProviderName(
        env
      )
    );
  }

  return {
    getProvider,
    getUploadProvider,
  };
}

module.exports = {
  configuredProviderName,
  createDocumentStorageFactory,
};

