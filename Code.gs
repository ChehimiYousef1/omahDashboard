'use strict';

/*
 * ==================================================
 * CONFIGURATION HELPERS
 * ==================================================
 */

function getOmahConfig_() {
  const properties =
    PropertiesService.getScriptProperties();

  const webhookUrl =
    properties.getProperty(
      'OMAH_WEBHOOK_URL'
    );

  const webhookSecret =
    properties.getProperty(
      'OMAH_WEBHOOK_SECRET'
    );

  if (!webhookUrl) {
    throw new Error(
      'OMAH_WEBHOOK_URL is missing.'
    );
  }

  if (!webhookSecret) {
    throw new Error(
      'OMAH_WEBHOOK_SECRET is missing.'
    );
  }

  return {
    webhookUrl,
    webhookSecret,
  };
}


/*
 * ==================================================
 * NORMALIZATION
 * ==================================================
 */

function normalizeAnswer_(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return '';
  }

  if (Array.isArray(value)) {
    return value
      .map(function (item) {
        return String(item || '').trim();
      })
      .filter(Boolean);
  }

  return String(value);
}


/*
 * Convert either:
 *
 * 1. Spreadsheet form-submit event:
 *      e.namedValues
 *
 * 2. Google Form submit event:
 *      e.response
 *
 * into the same row structure expected
 * by the OMAH backend.
 */
function buildApplicantRow_(e) {
  if (!e) {
    throw new Error(
      'Form submission event is missing.'
    );
  }

  /*
   * -----------------------------------------------
   * Spreadsheet-bound trigger
   * -----------------------------------------------
   */
  if (e.namedValues) {
    return e.namedValues;
  }

  /*
   * -----------------------------------------------
   * Form-bound trigger
   * -----------------------------------------------
   */
  if (
    e.response &&
    typeof e.response
      .getItemResponses ===
      'function'
  ) {
    const row = {};

    const timestamp =
      e.response.getTimestamp();

    if (timestamp) {
      row.Timestamp =
        Utilities.formatDate(
          timestamp,
          Session.getScriptTimeZone(),
          'dd/MM/yyyy HH:mm:ss'
        );
    }

    const itemResponses =
      e.response.getItemResponses();

    itemResponses.forEach(
      function (itemResponse) {
        const item =
          itemResponse.getItem();

        const title =
          item.getTitle();

        const answer =
          normalizeAnswer_(
            itemResponse.getResponse()
          );

        /*
         * Google Form question titles become
         * the backend field/header names.
         */
        row[title] = answer;
      }
    );

    return row;
  }

  throw new Error(
    'Unsupported Google Form submission event.'
  );
}


/*
 * ==================================================
 * WEBHOOK REQUEST
 * ==================================================
 */

function sendApplicantToOmah_(row) {
  const config =
    getOmahConfig_();

  const response =
    UrlFetchApp.fetch(
      config.webhookUrl,
      {
        method: 'post',

        contentType:
          'application/json',

        headers: {
          'x-omah-webhook-secret':
            config.webhookSecret,
        },

        payload:
          JSON.stringify({
            row: row,
          }),

        muteHttpExceptions:
          true,
      }
    );

  const status =
    response.getResponseCode();

  /*
   * 201 = newly created
   * 200 = safe/idempotent replay
   */
  if (
    status === 200 ||
    status === 201
  ) {
    console.log(
      'OMAH applicant webhook successful. HTTP ' +
      status
    );

    return status;
  }

  /*
   * Never log:
   *
   * - applicant answers
   * - webhook secret
   * - response body containing PII
   */
  console.error(
    'OMAH applicant webhook failed. HTTP ' +
    status
  );

  throw new Error(
    'OMAH applicant webhook failed. HTTP ' +
    status
  );
}


/*
 * ==================================================
 * REAL GOOGLE FORM SUBMISSION HANDLER
 * ==================================================
 *
 * Supports:
 *
 * - From form → On form submit
 * - From spreadsheet → On form submit
 */
function onApplicantFormSubmit(e) {
  const row =
    buildApplicantRow_(e);

  return sendApplicantToOmah_(
    row
  );
}


/*
 * ==================================================
 * MANUAL CONNECTIVITY TEST
 * ==================================================
 *
 * Intentionally incomplete payload.
 *
 * Expected:
 * HTTP 422
 *
 * No Applicant or Submission should be created.
 */
function testOmahWebhookConnection() {
  const config =
    getOmahConfig_();

  const response =
    UrlFetchApp.fetch(
      config.webhookUrl,
      {
        method: 'post',

        contentType:
          'application/json',

        headers: {
          'x-omah-webhook-secret':
            config.webhookSecret,
        },

        payload:
          JSON.stringify({
            row: {
              Timestamp:
                '25/08/2026 20:30:00',
            },
          }),

        muteHttpExceptions:
          true,
      }
    );

  const status =
    response.getResponseCode();

  console.log(
    'OMAH connectivity HTTP status: ' +
    status
  );

  if (status !== 422) {
    throw new Error(
      'Expected HTTP 422 but received ' +
      status
    );
  }

  console.log(
    'OMAH webhook connectivity passed.'
  );
}


/*
 * ==================================================
 * TRIGGER DIAGNOSTIC
 * ==================================================
 *
 * Safe to run manually.
 */
function checkOmahTriggers() {
  const triggers =
    ScriptApp.getProjectTriggers();

  if (triggers.length === 0) {
    console.log(
      'NO INSTALLED TRIGGERS FOUND'
    );

    return;
  }

  triggers.forEach(
    function (trigger, index) {
      console.log(
        'Trigger ' +
        (index + 1) +
        ': function=' +
        trigger.getHandlerFunction() +
        ', event=' +
        trigger.getEventType() +
        ', source=' +
        trigger.getTriggerSource()
      );
    }
  );
}

function diagnoseOmahFormIntegration() {
  console.log(
    '===== OMAH FORM INTEGRATION DIAGNOSTIC ====='
  );

  const properties =
    PropertiesService.getScriptProperties();

  console.log(
    'Webhook URL configured: ' +
    Boolean(
      properties.getProperty(
        'OMAH_WEBHOOK_URL'
      )
    )
  );

  console.log(
    'Webhook secret configured: ' +
    Boolean(
      properties.getProperty(
        'OMAH_WEBHOOK_SECRET'
      )
    )
  );

  console.log(
    '===== INSTALLED TRIGGERS ====='
  );

  const triggers =
    ScriptApp.getProjectTriggers();

  if (triggers.length === 0) {
    console.log(
      'NO INSTALLED TRIGGERS'
    );
  }

  triggers.forEach(
    function (trigger, index) {
      console.log(
        'Trigger ' +
        (index + 1) +
        ': function=' +
        trigger.getHandlerFunction() +
        ', event=' +
        trigger.getEventType() +
        ', source=' +
        trigger.getTriggerSource()
      );
    }
  );

  console.log(
    '===== GOOGLE FORM FIELD TITLES ====='
  );

  const form =
    FormApp.getActiveForm();

  if (!form) {
    console.log(
      'NO ACTIVE FORM FOUND'
    );

    return;
  }

  form.getItems().forEach(
    function (item, index) {
      console.log(
        (index + 1) +
        ': ' +
        item.getTitle()
      );
    }
  );

  console.log(
    '===== END DIAGNOSTIC ====='
  );
}