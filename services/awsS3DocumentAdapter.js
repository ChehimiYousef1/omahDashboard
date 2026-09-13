'use strict';

const {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} = require(
  '@aws-sdk/client-s3'
);

const {
  getSignedUrl,
} = require(
  '@aws-sdk/s3-request-presigner'
);

function createAwsS3DocumentAdapter({
  region,
  endpoint,
  forcePathStyle = false,
} = {}) {
  if (
    !String(
      region ?? ''
    ).trim()
  ) {
    throw new Error(
      'AWS region is required for document S3 storage.'
    );
  }

  const client =
    new S3Client({
      region,

      ...(endpoint
        ? { endpoint }
        : {}),

      forcePathStyle:
        Boolean(
          forcePathStyle
        ),
    });

  return {
    async putObject({
      bucket,
      key,
      body,
      contentType,
    }) {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType:
            contentType,
        })
      );
    },

    async objectExists({
      bucket,
      key,
    }) {
      try {
        await client.send(
          new HeadObjectCommand({
            Bucket: bucket,
            Key: key,
          })
        );

        return true;
      } catch (error) {
        const status =
          error?.$metadata
            ?.httpStatusCode;

        if (status === 404) {
          return false;
        }

        throw error;
      }
    },

    async getSignedDownloadUrl({
      bucket,
      key,
      expiresIn,
    }) {
      return getSignedUrl(
        client,

        new GetObjectCommand({
          Bucket: bucket,
          Key: key,
        }),

        {
          expiresIn,
        }
      );
    },

    async deleteObject({
      bucket,
      key,
    }) {
      await client.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: key,
        })
      );
    },
  };
}

module.exports = {
  createAwsS3DocumentAdapter,
};

