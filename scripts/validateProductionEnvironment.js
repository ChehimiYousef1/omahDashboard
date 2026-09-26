'use strict';


function text(
  env,
  key
) {
  return String(
    env[key] ?? ''
  ).trim();
}


function enabled(
  env,
  key
) {
  return (
    text(
      env,
      key
    ).toLowerCase() ===
    'true'
  );
}


function disabled(
  env,
  key
) {
  return (
    text(
      env,
      key
    ).toLowerCase() ===
    'false'
  );
}


function validateProductionEnvironment(
  env = process.env
) {
  const errors = [];
  const warnings = [];


  function error(
    key,
    message
  ) {
    errors.push({
      key,
      message,
    });
  }


  function warn(
    key,
    message
  ) {
    warnings.push({
      key,
      message,
    });
  }


  function requireText(
    key
  ) {
    if (!text(env, key)) {
      error(
        key,
        'is required'
      );

      return false;
    }

    return true;
  }


  function requireDisabled(
    key
  ) {
    if (!disabled(env, key)) {
      error(
        key,
        'must be explicitly false for the initial production baseline'
      );
    }
  }


  if (
    text(
      env,
      'NODE_ENV'
    ) !==
    'production'
  ) {
    error(
      'NODE_ENV',
      'must equal production'
    );
  }


  const port =
    Number(
      text(
        env,
        'PORT'
      )
    );

  if (
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535
  ) {
    error(
      'PORT',
      'must be an integer from 1 to 65535'
    );
  }


  const mongoUri =
    text(
      env,
      'MONGODB_URI'
    );

  if (!mongoUri) {
    error(
      'MONGODB_URI',
      'is required'
    );
  } else {
    if (
      !/^mongodb(?:\+srv)?:\/\//i.test(
        mongoUri
      )
    ) {
      error(
        'MONGODB_URI',
        'must use a MongoDB connection URI'
      );
    }

    if (
      /(?:localhost|127\.0\.0\.1|\[?::1\]?)/i.test(
        mongoUri
      )
    ) {
      error(
        'MONGODB_URI',
        'must not target localhost in production'
      );
    }
  }


  const jwtSecret =
    text(
      env,
      'JWT_SECRET'
    );

  if (
    jwtSecret.length <
    32
  ) {
    error(
      'JWT_SECRET',
      'must contain at least 32 characters'
    );
  }


  const originList =
    text(
      env,
      'ALLOWED_ORIGINS'
    )
      .split(',')
      .map(
        value =>
          value.trim()
      )
      .filter(Boolean);

  if (
    originList.length ===
    0
  ) {
    error(
      'ALLOWED_ORIGINS',
      'must contain at least one HTTPS origin'
    );
  }

  for (
    const origin
    of originList
  ) {
    if (origin === '*') {
      error(
        'ALLOWED_ORIGINS',
        'must not contain wildcard origin'
      );

      continue;
    }

    try {
      const parsed =
        new URL(
          origin
        );

      if (
        parsed.protocol !==
        'https:'
      ) {
        error(
          'ALLOWED_ORIGINS',
          'all production browser origins must use HTTPS'
        );
      }

      if (
        [
          'localhost',
          '127.0.0.1',
          '::1',
        ].includes(
          parsed.hostname
        )
      ) {
        error(
          'ALLOWED_ORIGINS',
          'must not contain localhost origins'
        );
      }

      if (
        parsed.origin !==
        origin.replace(
          /\/$/,
          ''
        )
      ) {
        error(
          'ALLOWED_ORIGINS',
          'each entry must be an origin without a path'
        );
      }
    } catch {
      error(
        'ALLOWED_ORIGINS',
        'contains an invalid URL origin'
      );
    }
  }


  requireDisabled(
    'ALLOW_SIGNUP'
  );

  requireDisabled(
    'SWAGGER_ENABLED'
  );

  requireDisabled(
    'DEV_API_ENABLED'
  );

  requireDisabled(
    'DISABLE_MONGO'
  );


  if (
    text(
      env,
      'DOCUMENT_STORAGE_PROVIDER'
    ) !==
    's3'
  ) {
    error(
      'DOCUMENT_STORAGE_PROVIDER',
      'must equal s3 for the selected AWS production design'
    );
  }


  requireText(
    'DOCUMENT_S3_BUCKET'
  );

  requireText(
    'AWS_REGION'
  );


  if (
    enabled(
      env,
      'DOCUMENT_S3_FORCE_PATH_STYLE'
    )
  ) {
    error(
      'DOCUMENT_S3_FORCE_PATH_STYLE',
      'must remain false for native AWS S3'
    );
  }


  if (
    text(
      env,
      'DOCUMENT_S3_ENDPOINT'
    )
  ) {
    warn(
      'DOCUMENT_S3_ENDPOINT',
      'custom S3 endpoint configured; verify this is intentional'
    );
  }


  if (
    text(
      env,
      'DOCUMENT_LOCAL_STORAGE_DIR'
    )
  ) {
    warn(
      'DOCUMENT_LOCAL_STORAGE_DIR',
      'local document path is ignored by the selected S3 production design'
    );
  }


  if (
    enabled(
      env,
      'APPLICANT_AUTO_SYNC_ENABLED'
    )
  ) {
    requireText(
      'APPLICANT_SHEET_CSV_URL'
    );
  }


  if (
    enabled(
      env,
      'APPLICANT_SYNC_WRITE_ENABLED'
    )
  ) {
    requireText(
      'APPLICANT_SHEET_CSV_URL'
    );
  }


  const calendarEnabled =
    enabled(
      env,
      'GOOGLE_CALENDAR_ENABLED'
    );

  const calendarWriteEnabled =
    enabled(
      env,
      'GOOGLE_CALENDAR_WRITE_ENABLED'
    );

  const driveImportEnabled =
    enabled(
      env,
      'GOOGLE_DRIVE_DOCUMENT_IMPORT_ENABLED'
    );


  if (
    calendarWriteEnabled &&
    !calendarEnabled
  ) {
    error(
      'GOOGLE_CALENDAR_WRITE_ENABLED',
      'cannot be true while GOOGLE_CALENDAR_ENABLED is false'
    );
  }


  if (
    calendarEnabled ||
    driveImportEnabled
  ) {
    for (
      const key
      of [
        'GOOGLE_CLIENT_ID',
        'GOOGLE_CLIENT_SECRET',
        'GOOGLE_REFRESH_TOKEN',
      ]
    ) {
      requireText(
        key
      );
    }
  }


  if (calendarEnabled) {
    requireText(
      'GOOGLE_CALENDAR_ID'
    );
  }


  const googleRedirectUri =
    text(
      env,
      'GOOGLE_REDIRECT_URI'
    );

  if (googleRedirectUri) {
    try {
      const parsed =
        new URL(
          googleRedirectUri
        );

      if (
        parsed.protocol !==
        'https:'
      ) {
        error(
          'GOOGLE_REDIRECT_URI',
          'must use HTTPS in production'
        );
      }
    } catch {
      error(
        'GOOGLE_REDIRECT_URI',
        'must be a valid URL'
      );
    }
  }


  if (
    enabled(
      env,
      'INTERVIEW_EMAIL_ENABLED'
    )
  ) {
    for (
      const key
      of [
        'SMTP_HOST',
        'SMTP_PORT',
        'SMTP_USER',
        'SMTP_PASS',
      ]
    ) {
      requireText(
        key
      );
    }

    if (
      !text(
        env,
        'INTERVIEW_EMAIL_FROM'
      ) &&
      !text(
        env,
        'SMTP_USER'
      )
    ) {
      error(
        'INTERVIEW_EMAIL_FROM',
        'or SMTP_USER must provide the production sender address'
      );
    }
  }


  if (
    enabled(
      env,
      'WHATSAPP_CLOUD_ENABLED'
    )
  ) {
    for (
      const key
      of [
        'WHATSAPP_CLOUD_API_VERSION',
        'WHATSAPP_CLOUD_PHONE_NUMBER_ID',
        'WHATSAPP_CLOUD_ACCESS_TOKEN',
      ]
    ) {
      requireText(
        key
      );
    }
  }


  const whatsappBaseUrl =
    text(
      env,
      'WHATSAPP_CLOUD_API_BASE_URL'
    );

  if (
    whatsappBaseUrl
  ) {
    try {
      const parsed =
        new URL(
          whatsappBaseUrl
        );

      if (
        parsed.protocol !==
        'https:'
      ) {
        error(
          'WHATSAPP_CLOUD_API_BASE_URL',
          'must use HTTPS'
        );
      }
    } catch {
      error(
        'WHATSAPP_CLOUD_API_BASE_URL',
        'must be a valid URL'
      );
    }
  }


  if (
    text(
      env,
      'TEST_APPLICANT_EMAIL'
    )
  ) {
    warn(
      'TEST_APPLICANT_EMAIL',
      'test-only recipient configuration should normally be empty in production'
    );
  }


  return {
    ok:
      errors.length ===
      0,

    errors,

    warnings,
  };
}


function printResult(
  result
) {
  for (
    const warning
    of result.warnings
  ) {
    console.warn(
      `⚠️ ${warning.key}: ${warning.message}`
    );
  }

  if (!result.ok) {
    for (
      const error
      of result.errors
    ) {
      console.error(
        `❌ ${error.key}: ${error.message}`
      );
    }

    console.error('');
    console.error(
      'PRODUCTION ENVIRONMENT VALIDATION FAILED'
    );

    return;
  }

  console.log(
    '✅ production environment contract'
  );

  console.log(
    '✅ production secrets/configuration shape accepted'
  );

  console.log('');
  console.log(
    'PRODUCTION ENVIRONMENT VALIDATION PASSED'
  );
}


if (
  require.main ===
  module
) {
  const result =
    validateProductionEnvironment(
      process.env
    );

  printResult(
    result
  );

  if (!result.ok) {
    process.exitCode =
      1;
  }
}


module.exports = {
  text,
  enabled,
  disabled,
  validateProductionEnvironment,
  printResult,
};
