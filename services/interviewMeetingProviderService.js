'use strict';

const {
  getConfigurationStatus:
    getGoogleConfigurationStatus,
} =
  require(
    './googleCalendarService'
  );


const MEETING_PROVIDERS = [
  'google_meet',
  'zoom',
  'microsoft_teams',
];


const PROVIDER_LABELS = {
  google_meet:
    'Google Meet',

  zoom:
    'Zoom',

  microsoft_teams:
    'Microsoft Teams',
};


function cleanText(value) {
  return String(
    value ?? ''
  )
    .trim()
    .toLowerCase();
}


function providerError(
  code,
  message
) {
  const error =
    new Error(
      message
    );

  error.code =
    code;

  return error;
}


function validateMeetingProvider(
  provider
) {
  const normalized =
    cleanText(
      provider
    );

  if (
    !MEETING_PROVIDERS.includes(
      normalized
    )
  ) {
    throw providerError(
      'MEETING_PROVIDER_INVALID',

      'Meeting provider must be Google Meet, Zoom, or Microsoft Teams.'
    );
  }

  return normalized;
}


function googleMeetStatus(
  env = process.env
) {
  const google =
    getGoogleConfigurationStatus(
      env
    );

  const readyForScheduling =
    Boolean(
      google.enabled &&
      google.writeEnabled &&
      google.configured
    );


  let status =
    'setup_required';

  if (
    google.configured &&
    google.enabled &&
    !google.writeEnabled
  ) {
    status =
      'read_only';
  }

  if (
    readyForScheduling
  ) {
    status =
      'ready';
  }


  return {
    provider:
      'google_meet',

    label:
      PROVIDER_LABELS
        .google_meet,

    implemented:
      true,

    enabled:
      Boolean(
        google.enabled
      ),

    configured:
      Boolean(
        google.configured
      ),

    writeEnabled:
      Boolean(
        google.writeEnabled
      ),

    readyForScheduling,

    status,

    missing:
      Array.isArray(
        google.missing
      )
        ? google.missing
        : [],
  };
}


function zoomStatus() {
  return {
    provider:
      'zoom',

    label:
      PROVIDER_LABELS
        .zoom,

    implemented:
      false,

    enabled:
      false,

    configured:
      false,

    writeEnabled:
      false,

    readyForScheduling:
      false,

    status:
      'not_implemented',

    missing: [],
  };
}


function microsoftTeamsStatus() {
  return {
    provider:
      'microsoft_teams',

    label:
      PROVIDER_LABELS
        .microsoft_teams,

    implemented:
      false,

    enabled:
      false,

    configured:
      false,

    writeEnabled:
      false,

    readyForScheduling:
      false,

    status:
      'not_implemented',

    missing: [],
  };
}


function getMeetingProviderStatus(
  provider,
  env = process.env
) {
  const normalized =
    validateMeetingProvider(
      provider
    );


  switch (
    normalized
  ) {
    case 'google_meet':
      return googleMeetStatus(
        env
      );

    case 'zoom':
      return zoomStatus();

    case 'microsoft_teams':
      return microsoftTeamsStatus();

    default:
      throw providerError(
        'MEETING_PROVIDER_INVALID',

        'Unsupported meeting provider.'
      );
  }
}


function getMeetingProviderStatuses(
  env = process.env
) {
  return MEETING_PROVIDERS.map(
    (
      provider
    ) =>
      getMeetingProviderStatus(
        provider,
        env
      )
  );
}


function assertMeetingProviderReady(
  provider,
  env = process.env
) {
  const status =
    getMeetingProviderStatus(
      provider,
      env
    );

  if (
    !status.implemented
  ) {
    throw providerError(
      'MEETING_PROVIDER_NOT_IMPLEMENTED',

      `${status.label} integration is not implemented yet.`
    );
  }


  if (
    !status.readyForScheduling
  ) {
    throw providerError(
      'MEETING_PROVIDER_NOT_READY',

      `${status.label} is not configured for automatic meeting creation.`
    );
  }


  return status;
}


module.exports = {
  MEETING_PROVIDERS,
  PROVIDER_LABELS,

  validateMeetingProvider,

  getMeetingProviderStatus,
  getMeetingProviderStatuses,

  assertMeetingProviderReady,
};
