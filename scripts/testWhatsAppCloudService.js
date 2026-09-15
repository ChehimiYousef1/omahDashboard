'use strict';

const assert =
  require('assert');

const {
  normalizeInternationalPhone,
  getWhatsAppCloudStatus,
  sendWhatsAppText,
} = require(
  '../services/whatsappCloudService'
);


async function expectCode(
  promise,
  expectedCode
) {
  try {
    await promise;

    assert.fail(
      `Expected ${expectedCode}`
    );
  } catch (error) {
    assert.strictEqual(
      error.code,
      expectedCode
    );
  }
}


async function main() {
  assert.strictEqual(
    normalizeInternationalPhone(
      '+961 70 123 456'
    ),
    '96170123456'
  );

  assert.strictEqual(
    normalizeInternationalPhone(
      '00961 70 123 456'
    ),
    '96170123456'
  );

  assert.strictEqual(
    normalizeInternationalPhone(
      '70 123 456'
    ),
    null
  );

  console.log(
    '✅ international phone normalization'
  );


  const disabledEnv = {
    WHATSAPP_CLOUD_ENABLED:
      'false',
  };

  const disabledStatus =
    getWhatsAppCloudStatus(
      disabledEnv
    );

  assert.strictEqual(
    disabledStatus.enabled,
    false
  );

  assert.strictEqual(
    disabledStatus.ready,
    false
  );

  console.log(
    '✅ provider disabled by default'
  );


  let calls = 0;

  const fakeHttpClient = {
    async post() {
      calls += 1;

      return {
        data: {
          messages: [
            {
              id:
                'wamid.test-message',
            },
          ],
        },
      };
    },
  };


  await expectCode(
    sendWhatsAppText({
      to:
        '+96170123456',

      message:
        'Test message',

      env:
        disabledEnv,

      httpClient:
        fakeHttpClient,
    }),

    'WHATSAPP_DISABLED'
  );

  assert.strictEqual(
    calls,
    0
  );

  console.log(
    '✅ disabled provider makes no HTTP request'
  );


  const configuredEnv = {
    WHATSAPP_CLOUD_ENABLED:
      'true',

    WHATSAPP_CLOUD_API_VERSION:
      'vTEST',

    WHATSAPP_CLOUD_PHONE_NUMBER_ID:
      '123456789',

    WHATSAPP_CLOUD_ACCESS_TOKEN:
      'fake-test-token',

    WHATSAPP_CLOUD_API_BASE_URL:
      'https://example.invalid',
  };


  let captured = null;

  const capturingHttpClient = {
    async post(
      url,
      payload,
      options
    ) {
      captured = {
        url,
        payload,
        options,
      };

      return {
        data: {
          messages: [
            {
              id:
                'wamid.test-message',
            },
          ],
        },
      };
    },
  };


  const result =
    await sendWhatsAppText({
      to:
        '+961 70 123 456',

      message:
        'Hello Applicant',

      env:
        configuredEnv,

      httpClient:
        capturingHttpClient,
    });


  assert.strictEqual(
    result.sent,
    true
  );

  assert.strictEqual(
    result.recipient,
    '96170123456'
  );

  assert.strictEqual(
    result.messageId,
    'wamid.test-message'
  );

  assert.strictEqual(
    captured.payload
      .messaging_product,
    'whatsapp'
  );

  assert.strictEqual(
    captured.payload.to,
    '96170123456'
  );

  assert.strictEqual(
    captured.payload.type,
    'text'
  );

  assert.strictEqual(
    captured.payload.text.body,
    'Hello Applicant'
  );

  assert(
    captured.options
      .headers
      .Authorization
      .startsWith(
        'Bearer '
      )
  );

  console.log(
    '✅ WhatsApp payload built safely'
  );


  await expectCode(
    sendWhatsAppText({
      to:
        '70123456',

      message:
        'Hello',

      env:
        configuredEnv,

      httpClient:
        capturingHttpClient,
    }),

    'WHATSAPP_PHONE_INVALID'
  );

  console.log(
    '✅ local number rejected without country-code guessing'
  );


  console.log(
    'WHATSAPP CLOUD SERVICE TEST PASSED'
  );
}


main().catch(
  (error) => {
    console.error(error);

    process.exit(1);
  }
);
