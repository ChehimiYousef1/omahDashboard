'use strict';

const crypto =
  require('crypto');

const express =
  require('express');

const {
  processSubmission:
    defaultProcessSubmission,
} = require(
  '../../services/applicantFormSyncService'
);

function secretDigest(value) {
  return crypto
    .createHash('sha256')
    .update(
      String(value || ''),
      'utf8'
    )
    .digest();
}

function secretsMatch(
  provided,
  expected
) {
  if (!expected) {
    return false;
  }

  return crypto.timingSafeEqual(
    secretDigest(provided),
    secretDigest(expected)
  );
}

function normalizeWebhookRow(
  row
) {
  if (
    !row ||
    typeof row !== 'object' ||
    Array.isArray(row)
  ) {
    return null;
  }

  const normalized = {};

  for (
    const [key, value]
    of Object.entries(row)
  ) {
    if (Array.isArray(value)) {
      normalized[key] =
        value
          .map((item) =>
            String(item ?? '').trim()
          )
          .filter(Boolean)
          .join(', ');

      continue;
    }

    if (
      value === null ||
      value === undefined
    ) {
      normalized[key] = '';

      continue;
    }

    if (
      typeof value === 'object'
    ) {
      normalized[key] =
        String(value);

      continue;
    }

    normalized[key] =
      String(value);
  }

  return normalized;
}

function bodySizeBytes(body) {
  return Buffer.byteLength(
    JSON.stringify(
      body ?? {}
    ),
    'utf8'
  );
}

module.exports = ({
  processSubmission =
    defaultProcessSubmission,

  webhookSecret =
    process.env
      .APPLICANT_FORM_WEBHOOK_SECRET,

  sourceKey =
    process.env
      .APPLICANT_FORM_SOURCE_KEY ||
    'omah-applicant-form-v2',

  maxBodyBytes =
    64 * 1024,
} = {}) => {
  const router =
    express.Router();

  router.post(
    '/',
    async (req, res) => {
      /*
       * Fail closed when deployment
       * configuration is incomplete.
       */
      if (!webhookSecret) {
        return res.status(503).json({
          success: false,
          error:
            'Webhook is not configured.',
        });
      }

      const providedSecret =
        req.get(
          'x-omah-webhook-secret'
        );

      if (
        !secretsMatch(
          providedSecret,
          webhookSecret
        )
      ) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized.',
        });
      }

      /*
       * Global Express JSON parsing
       * currently allows 2 MB.
       *
       * The webhook itself accepts
       * only a much smaller payload.
       */
      if (
        bodySizeBytes(req.body) >
        maxBodyBytes
      ) {
        return res.status(413).json({
          success: false,
          error:
            'Webhook payload is too large.',
        });
      }

      const row =
        normalizeWebhookRow(
          req.body?.row
        );

      if (!row) {
        return res.status(400).json({
          success: false,
          error:
            'Webhook row is required.',
        });
      }

      try {
        const outcome =
          await processSubmission(
            row,
            {
              dryRun: false,
              sourceKey,
            }
          );

        if (
          outcome.status ===
          'invalid'
        ) {
          return res
            .status(422)
            .json({
              success: false,
              status:
                'invalid',

              /*
               * Validation reason contains
               * field names only, not the
               * applicant's submitted values.
               */
              error:
                outcome.reason ||
                'Invalid form response.',
            });
        }

        if (
          outcome.status !==
            'inserted' &&
          outcome.status !==
            'duplicate'
        ) {
          return res
            .status(500)
            .json({
              success: false,
              error:
                'Unexpected ingestion result.',
            });
        }

        return res
          .status(
            outcome.status ===
              'inserted'
              ? 201
              : 200
          )
          .json({
            success: true,

            status:
              outcome.status,

            applicantStatus:
              outcome
                .applicantStatus ||
              null,

            repaired:
              Boolean(
                outcome.repaired
              ),

            duplicateCandidates:
              Number(
                outcome
                  .duplicateCandidates ||
                0
              ),

            duplicateCasesCreated:
              Number(
                outcome
                  .duplicateCasesCreated ||
                0
              ),

            duplicateCasesReused:
              Number(
                outcome
                  .duplicateCasesReused ||
                0
              ),
          });
      } catch (error) {
        /*
         * Never log request body,
         * applicant values or secret.
         */
        console.error(
          'Applicant webhook error:',
          error?.code ||
            error?.name ||
            'UNKNOWN_ERROR'
        );

        return res
          .status(500)
          .json({
            success: false,
            error:
              'Applicant ingestion failed.',
          });
      }
    }
  );

  return router;
};

module.exports.secretsMatch =
  secretsMatch;

module.exports.normalizeWebhookRow =
  normalizeWebhookRow;

module.exports.bodySizeBytes =
  bodySizeBytes;
