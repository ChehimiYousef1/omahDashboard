'use strict';

const {
  google,
} = require('googleapis');


const DEFAULT_CALENDAR_ID =
  'primary';

const DEFAULT_SEND_UPDATES =
  'none';


function envEnabled(value) {
  return (
    String(value || '')
      .trim()
      .toLowerCase() ===
    'true'
  );
}


function cleanText(value) {
  return String(
    value ?? ''
  ).trim();
}


function uniqueStrings(values) {
  return [
    ...new Set(
      (Array.isArray(values)
        ? values
        : []
      )
        .map(cleanText)
        .filter(Boolean)
    ),
  ];
}


function getGoogleCalendarConfig(
  env = process.env
) {
  return {
    enabled:
      envEnabled(
        env.GOOGLE_CALENDAR_ENABLED
      ),

    writeEnabled:
      envEnabled(
        env.GOOGLE_CALENDAR_WRITE_ENABLED
      ),

    clientId:
      cleanText(
        env.GOOGLE_CLIENT_ID
      ),

    clientSecret:
      cleanText(
        env.GOOGLE_CLIENT_SECRET
      ),

    redirectUri:
      cleanText(
        env.GOOGLE_REDIRECT_URI
      ),

    refreshToken:
      cleanText(
        env.GOOGLE_REFRESH_TOKEN
      ),

    calendarId:
      cleanText(
        env.GOOGLE_CALENDAR_ID
      ) ||
      DEFAULT_CALENDAR_ID,

    sendUpdates:
      cleanText(
        env.GOOGLE_CALENDAR_SEND_UPDATES
      ) ||
      DEFAULT_SEND_UPDATES,
  };
}


function isGoogleCalendarConfigured(
  env = process.env
) {
  const config =
    getGoogleCalendarConfig(
      env
    );

  return Boolean(
    config.enabled &&
    config.clientId &&
    config.clientSecret &&
    config.refreshToken
  );
}


function getConfigurationStatus(
  env = process.env
) {
  const config =
    getGoogleCalendarConfig(
      env
    );

  const missing = [];

  if (!config.clientId) {
    missing.push(
      'GOOGLE_CLIENT_ID'
    );
  }

  if (!config.clientSecret) {
    missing.push(
      'GOOGLE_CLIENT_SECRET'
    );
  }

  if (!config.refreshToken) {
    missing.push(
      'GOOGLE_REFRESH_TOKEN'
    );
  }

  return {
    enabled:
      config.enabled,

    writeEnabled:
      config.writeEnabled,

    configured:
      isGoogleCalendarConfigured(
        env
      ),

    calendarId:
      config.calendarId,

    sendUpdates:
      config.sendUpdates,

    missing,
  };
}


function createOAuthClient(
  env = process.env
) {
  const config =
    getGoogleCalendarConfig(
      env
    );

  if (
    !isGoogleCalendarConfigured(
      env
    )
  ) {
    const error =
      new Error(
        'Google Calendar is not configured.'
      );

    error.code =
      'GOOGLE_CALENDAR_NOT_CONFIGURED';

    throw error;
  }

  const client =
    new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri ||
        undefined
    );

  client.setCredentials({
    refresh_token:
      config.refreshToken,
  });

  return client;
}


function createCalendarClient(
  env = process.env
) {
  return google.calendar({
    version: 'v3',

    auth:
      createOAuthClient(
        env
      ),
  });
}


/*
 * READ-ONLY availability lookup.
 *
 * No Calendar event is created,
 * changed or deleted here.
 */
async function checkFreeBusy({
  timeMin,
  timeMax,
  calendarIds = [],
  timezone = 'UTC',

  env = process.env,
  calendarClient = null,
}) {
  const status =
    getConfigurationStatus(
      env
    );

  const ids =
    uniqueStrings(
      calendarIds
    );

  if (!status.enabled) {
    return {
      enabled: false,
      configured:
        status.configured,

      checked: false,

      reason:
        'GOOGLE_CALENDAR_DISABLED',

      calendars: {},
    };
  }

  if (!status.configured) {
    return {
      enabled: true,
      configured: false,
      checked: false,

      reason:
        'GOOGLE_CALENDAR_NOT_CONFIGURED',

      missing:
        status.missing,

      calendars: {},
    };
  }

  if (ids.length === 0) {
    return {
      enabled: true,
      configured: true,
      checked: false,

      reason:
        'NO_CALENDARS_REQUESTED',

      calendars: {},
    };
  }

  const start =
    new Date(timeMin);

  const end =
    new Date(timeMax);

  if (
    Number.isNaN(
      start.getTime()
    ) ||
    Number.isNaN(
      end.getTime()
    ) ||
    end <= start
  ) {
    const error =
      new Error(
        'A valid availability time range is required.'
      );

    error.code =
      'GOOGLE_CALENDAR_TIME_RANGE_INVALID';

    throw error;
  }

  const calendar =
    calendarClient ||
    createCalendarClient(
      env
    );

  const response =
    await calendar
      .freebusy
      .query({
        requestBody: {
          timeMin:
            start.toISOString(),

          timeMax:
            end.toISOString(),

          timeZone:
            cleanText(
              timezone
            ) || 'UTC',

          items:
            ids.map(
              (id) => ({
                id,
              })
            ),
        },
      });

  const calendars =
    response.data
      ?.calendars || {};

  const result = {};

  for (const id of ids) {
    const calendarData =
      calendars[id] || {};

    result[id] = {
      busy:
        Array.isArray(
          calendarData.busy
        )
          ? calendarData.busy
          : [],

      errors:
        Array.isArray(
          calendarData.errors
        )
          ? calendarData.errors
          : [],
    };
  }

  return {
    enabled: true,
    configured: true,
    checked: true,

    calendars:
      result,
  };
}


/*
 * This guard must be called by every
 * future create/update/delete Calendar
 * operation.
 *
 * GOOGLE_CALENDAR_ENABLED=true
 *              AND
 * GOOGLE_CALENDAR_WRITE_ENABLED=true
 *
 * are both required.
 */
function assertCalendarWriteEnabled(
  env = process.env
) {
  const status =
    getConfigurationStatus(
      env
    );

  if (!status.enabled) {
    const error =
      new Error(
        'Google Calendar integration is disabled.'
      );

    error.code =
      'GOOGLE_CALENDAR_DISABLED';

    throw error;
  }

  if (!status.configured) {
    const error =
      new Error(
        'Google Calendar is not configured.'
      );

    error.code =
      'GOOGLE_CALENDAR_NOT_CONFIGURED';

    throw error;
  }

  if (!status.writeEnabled) {
    const error =
      new Error(
        'Google Calendar write operations are disabled.'
      );

    error.code =
      'GOOGLE_CALENDAR_WRITE_DISABLED';

    throw error;
  }

  return true;
}


module.exports = {
  DEFAULT_CALENDAR_ID,
  DEFAULT_SEND_UPDATES,

  envEnabled,
  getGoogleCalendarConfig,
  isGoogleCalendarConfigured,
  getConfigurationStatus,

  createOAuthClient,
  createCalendarClient,

  checkFreeBusy,

  assertCalendarWriteEnabled,
};
