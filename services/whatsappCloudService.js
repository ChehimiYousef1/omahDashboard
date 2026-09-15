'use strict';

const axios =
  require('axios');


function cleanText(value) {
  return String(
    value ?? ''
  ).trim();
}


function whatsappError(
  code,
  message,
  details = null
) {
  const error =
    new Error(message);

  error.code =
    code;

  if (details !== null) {
    error.details =
      details;
  }

  return error;
}


function enabled(env) {
  return (
    cleanText(
      env.WHATSAPP_CLOUD_ENABLED
    ).toLowerCase() ===
    'true'
  );
}


function normalizeInternationalPhone(
  value
) {
  const raw =
    cleanText(value);

  if (!raw) {
    return null;
  }

  let digits = '';

  if (raw.startsWith('+')) {
    digits =
      raw.replace(
        /\D/g,
        ''
      );
  } else if (
    raw.startsWith('00')
  ) {
    digits =
      raw
        .slice(2)
        .replace(
          /\D/g,
          ''
        );
  } else {
    /*
     * Do not guess country codes.
     */
    return null;
  }

  if (
    digits.length < 8 ||
    digits.length > 15
  ) {
    return null;
  }

  return digits;
}


function getWhatsAppCloudStatus(
  env = process.env
) {
  const missing = [];

  if (
    !cleanText(
      env.WHATSAPP_CLOUD_API_VERSION
    )
  ) {
    missing.push(
      'WHATSAPP_CLOUD_API_VERSION'
    );
  }

  if (
    !cleanText(
      env.WHATSAPP_CLOUD_PHONE_NUMBER_ID
    )
  ) {
    missing.push(
      'WHATSAPP_CLOUD_PHONE_NUMBER_ID'
    );
  }

  if (
    !cleanText(
      env.WHATSAPP_CLOUD_ACCESS_TOKEN
    )
  ) {
    missing.push(
      'WHATSAPP_CLOUD_ACCESS_TOKEN'
    );
  }

  return {
    provider:
      'whatsapp_cloud',

    enabled:
      enabled(env),

    configured:
      missing.length === 0,

    ready:
      enabled(env) &&
      missing.length === 0,

    missing,
  };
}


async function sendWhatsAppText({
  to,
  message,

  env =
    process.env,

  httpClient =
    axios,
}) {
  const status =
    getWhatsAppCloudStatus(
      env
    );

  if (!status.enabled) {
    throw whatsappError(
      'WHATSAPP_DISABLED',
      'WhatsApp Cloud delivery is disabled.'
    );
  }

  if (!status.configured) {
    throw whatsappError(
      'WHATSAPP_NOT_CONFIGURED',
      'WhatsApp Cloud delivery is not fully configured.',
      {
        missing:
          status.missing,
      }
    );
  }


  const recipient =
    normalizeInternationalPhone(
      to
    );

  if (!recipient) {
    throw whatsappError(
      'WHATSAPP_PHONE_INVALID',
      'WhatsApp number must use international format, for example +961...'
    );
  }


  const body =
    cleanText(message);

  if (!body) {
    throw whatsappError(
      'WHATSAPP_MESSAGE_REQUIRED',
      'WhatsApp message is required.'
    );
  }


  const apiVersion =
    cleanText(
      env.WHATSAPP_CLOUD_API_VERSION
    );

  const phoneNumberId =
    cleanText(
      env.WHATSAPP_CLOUD_PHONE_NUMBER_ID
    );

  const accessToken =
    cleanText(
      env.WHATSAPP_CLOUD_ACCESS_TOKEN
    );

  const baseUrl =
    cleanText(
      env.WHATSAPP_CLOUD_API_BASE_URL
    ) ||
    'https://graph.facebook.com';


  const url =
    `${baseUrl}/${encodeURIComponent(
      apiVersion
    )}/${encodeURIComponent(
      phoneNumberId
    )}/messages`;


  try {
    const response =
      await httpClient.post(
        url,

        {
          messaging_product:
            'whatsapp',

          recipient_type:
            'individual',

          to:
            recipient,

          type:
            'text',

          text: {
            preview_url:
              false,

            body,
          },
        },

        {
          headers: {
            Authorization:
              `Bearer ${accessToken}`,

            'Content-Type':
              'application/json',
          },

          timeout:
            15000,
        }
      );


    const messageId =
      response
        ?.data
        ?.messages
        ?.[0]
        ?.id ||
      '';


    return {
      sent:
        true,

      provider:
        'whatsapp_cloud',

      recipient,

      messageId,
    };
  } catch (error) {
    const providerMessage =
      cleanText(
        error
          ?.response
          ?.data
          ?.error
          ?.message
      );

    throw whatsappError(
      'WHATSAPP_PROVIDER_ERROR',

      providerMessage
        ? `WhatsApp provider rejected the message: ${providerMessage}`
        : 'WhatsApp provider request failed.'
    );
  }
}


module.exports = {
  cleanText,
  normalizeInternationalPhone,
  getWhatsAppCloudStatus,
  sendWhatsAppText,
};
