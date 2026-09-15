'use strict';

const https = require('https');

const {
  MAX_DOCUMENT_SIZE_BYTES,
} = require(
  './applicantDocumentValidationService'
);

function serviceError(
  code,
  message,
  status = null
) {
  const error = new Error(message);
  error.code = code;

  if (status) {
    error.status = status;
  }

  return error;
}

function text(value) {
  return String(
    value ?? ''
  ).trim();
}

function extractDriveFileId(
  value
) {
  const raw = text(value);

  if (!raw) {
    return null;
  }

  if (
    /^[A-Za-z0-9_-]{20,100}$/
      .test(raw)
  ) {
    return raw;
  }

  let url;

  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  const host =
    url.hostname
      .toLowerCase()
      .replace(
        /^www\./,
        ''
      );

  if (
    host !==
    'drive.google.com'
  ) {
    return null;
  }

  const pathMatch =
    url.pathname.match(
      /\/file\/d\/([A-Za-z0-9_-]{20,100})(?:\/|$)/
    );

  if (pathMatch) {
    return pathMatch[1];
  }

  const queryId =
    text(
      url.searchParams.get(
        'id'
      )
    );

  if (
    /^[A-Za-z0-9_-]{20,100}$/
      .test(queryId)
  ) {
    return queryId;
  }

  return null;
}

function requestIPv4({
  hostname,
  path,
  method = 'GET',
  headers = {},
  body = null,
  maxBytes =
    MAX_DOCUMENT_SIZE_BYTES,
}) {
  return new Promise(
    (
      resolve,
      reject
    ) => {
      const req =
        https.request(
          {
            hostname,
            port: 443,
            path,
            method,

            family: 4,

            headers,

            timeout:
              20000,
          },

          res => {
            const chunks = [];
            let total = 0;
            let finished = false;

            const fail =
              error => {
                if (finished) {
                  return;
                }

                finished = true;
                reject(error);
              };

            res.on(
              'data',
              chunk => {
                total +=
                  chunk.length;

                if (
                  total >
                  maxBytes
                ) {
                  const error =
                    serviceError(
                      'GOOGLE_RESPONSE_TOO_LARGE',
                      'Google response exceeded the configured size limit.'
                    );

                  res.destroy(
                    error
                  );

                  fail(error);
                  return;
                }

                chunks.push(
                  chunk
                );
              }
            );

            res.on(
              'error',
              fail
            );

            res.on(
              'end',
              () => {
                if (finished) {
                  return;
                }

                finished = true;

                resolve({
                  statusCode:
                    res.statusCode ||
                    0,

                  headers:
                    res.headers,

                  body:
                    Buffer.concat(
                      chunks
                    ),
                });
              }
            );
          }
        );

      req.on(
        'timeout',
        () => {
          req.destroy(
            serviceError(
              'GOOGLE_REQUEST_TIMEOUT',
              'Google request timed out.'
            )
          );
        }
      );

      req.on(
        'error',
        reject
      );

      if (body) {
        req.write(body);
      }

      req.end();
    }
  );
}

function parseJson(
  response,
  errorCode
) {
  try {
    return JSON.parse(
      response.body
        .toString(
          'utf8'
        )
    );
  } catch {
    throw serviceError(
      errorCode,
      'Google returned an invalid JSON response.'
    );
  }
}

function throwGoogleError(
  response
) {
  let payload = {};

  try {
    payload =
      JSON.parse(
        response.body
          .toString(
            'utf8'
          )
      );
  } catch {
    // Safe fallback.
  }

  const message =
    text(
      payload
        ?.error
        ?.message
    ) ||
    'Google Drive request failed.';

  let code =
    'GOOGLE_DRIVE_REQUEST_FAILED';

  if (
    response.statusCode ===
      401 ||
    response.statusCode ===
      403
  ) {
    code =
      'GOOGLE_DRIVE_ACCESS_DENIED';
  }

  if (
    response.statusCode ===
      404
  ) {
    code =
      'GOOGLE_DRIVE_FILE_NOT_FOUND';
  }

  throw serviceError(
    code,
    message,
    response.statusCode
  );
}

function createGoogleDriveDocumentService({
  env = process.env,

  requestFn =
    requestIPv4,
} = {}) {
  async function accessToken() {
    const clientId =
      text(
        env.GOOGLE_CLIENT_ID
      );

    const clientSecret =
      text(
        env.GOOGLE_CLIENT_SECRET
      );

    const refreshToken =
      text(
        env.GOOGLE_REFRESH_TOKEN
      );

    if (
      !clientId ||
      !clientSecret ||
      !refreshToken
    ) {
      throw serviceError(
        'GOOGLE_DRIVE_NOT_CONFIGURED',
        'Google Drive OAuth credentials are not configured.'
      );
    }

    const body =
      new URLSearchParams({
        client_id:
          clientId,

        client_secret:
          clientSecret,

        refresh_token:
          refreshToken,

        grant_type:
          'refresh_token',
      }).toString();

    const response =
      await requestFn({
        hostname:
          'oauth2.googleapis.com',

        path:
          '/token',

        method:
          'POST',

        headers: {
          'Content-Type':
            'application/x-www-form-urlencoded',

          'Content-Length':
            Buffer.byteLength(
              body
            ),
        },

        body,

        maxBytes:
          1024 * 1024,
      });

    if (
      response.statusCode <
        200 ||
      response.statusCode >=
        300
    ) {
      throwGoogleError(
        response
      );
    }

    const payload =
      parseJson(
        response,
        'GOOGLE_OAUTH_INVALID_RESPONSE'
      );

    const token =
      text(
        payload.access_token
      );

    if (!token) {
      throw serviceError(
        'GOOGLE_ACCESS_TOKEN_MISSING',
        'Google did not return an access token.'
      );
    }

    return token;
  }

  async function downloadFile(
    externalUrl
  ) {
    const fileId =
      extractDriveFileId(
        externalUrl
      );

    if (!fileId) {
      throw serviceError(
        'INVALID_GOOGLE_DRIVE_FILE',
        'The external document is not a supported Google Drive file.'
      );
    }

    const token =
      await accessToken();

    const metadataResponse =
      await requestFn({
        hostname:
          'www.googleapis.com',

        path:
          '/drive/v3/files/' +
          encodeURIComponent(
            fileId
          ) +
          '?fields=' +
          encodeURIComponent(
            'id,name,mimeType,size'
          ) +
          '&supportsAllDrives=true',

        headers: {
          Authorization:
            `Bearer ${token}`,
        },

        maxBytes:
          1024 * 1024,
      });

    if (
      metadataResponse.statusCode <
        200 ||
      metadataResponse.statusCode >=
        300
    ) {
      throwGoogleError(
        metadataResponse
      );
    }

    const metadata =
      parseJson(
        metadataResponse,
        'GOOGLE_DRIVE_METADATA_INVALID'
      );

    const mimeType =
      text(
        metadata.mimeType
      );

    if (
      mimeType.startsWith(
        'application/vnd.google-apps.'
      )
    ) {
      throw serviceError(
        'GOOGLE_NATIVE_DOCUMENT_UNSUPPORTED',
        'Google Docs, Sheets and Slides are not supported as Applicant file uploads.'
      );
    }

    const declaredSize =
      Number(
        metadata.size
      );

    if (
      Number.isFinite(
        declaredSize
      ) &&
      declaredSize >
        MAX_DOCUMENT_SIZE_BYTES
    ) {
      throw serviceError(
        'DOCUMENT_FILE_TOO_LARGE',
        'Document exceeds the 10 MB limit.'
      );
    }

    const fileResponse =
      await requestFn({
        hostname:
          'www.googleapis.com',

        path:
          '/drive/v3/files/' +
          encodeURIComponent(
            fileId
          ) +
          '?alt=media&supportsAllDrives=true',

        headers: {
          Authorization:
            `Bearer ${token}`,
        },

        maxBytes:
          MAX_DOCUMENT_SIZE_BYTES,
      });

    if (
      fileResponse.statusCode <
        200 ||
      fileResponse.statusCode >=
        300
    ) {
      throwGoogleError(
        fileResponse
      );
    }

    const originalname =
      text(
        metadata.name
      );

    if (!originalname) {
      throw serviceError(
        'GOOGLE_DRIVE_FILENAME_MISSING',
        'Google Drive file name is missing.'
      );
    }

    return {
      fileId,

      originalname,

      mimetype:
        mimeType,

      buffer:
        fileResponse.body,
    };
  }

  return {
    downloadFile,
  };
}

module.exports = {
  extractDriveFileId,
  requestIPv4,
  createGoogleDriveDocumentService,
};
