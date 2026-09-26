'use strict';

const assert =
  require('assert');

const fs =
  require('fs');

const path =
  require('path');

const {
  validateProductionEnvironment,
} = require(
  './validateProductionEnvironment'
);


function read(relativePath) {
  return fs.readFileSync(
    path.join(
      __dirname,
      '..',
      relativePath
    ),
    'utf8'
  );
}


function envTemplateKeys(
  content
) {
  const result =
    new Map();

  for (
    const line
    of content.split(
      /\r?\n/
    )
  ) {
    const match =
      line.match(
        /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/
      );

    if (!match) {
      continue;
    }

    result.set(
      match[1],
      match[2]
    );
  }

  return result;
}


const design =
  read(
    'docs/productionEnvironmentDesign.md'
  );

for (
  const required
  of [
    'ECS Fargate',
    'Amazon ECR',
    'Application Load Balancer',
    'AWS WAF',
    'MongoDB Atlas',
    'Amazon S3',
    'AWS Secrets Manager',
    'CloudWatch',
    'dashboard.<production-domain>',
    'staging-dashboard.<production-domain>',
    'DOCUMENT_STORAGE_PROVIDER=s3',
    'desired count',
    'CloudFormation',
    'P11 — AWS infrastructure',
  ]
) {
  assert.ok(
    design.includes(
      required
    ),
    `Production design missing: ${required}`
  );
}

console.log(
  '✅ production AWS architecture decisions documented'
);


const envExample =
  read(
    '.env.example'
  );

const envKeys =
  envTemplateKeys(
    envExample
  );

for (
  const key
  of [
    'APPLICANT_EMAIL_FROM',
    'APPLICANT_EMAIL_FROM_NAME',
    'WHATSAPP_CLOUD_ENABLED',
    'WHATSAPP_CLOUD_API_VERSION',
    'WHATSAPP_CLOUD_PHONE_NUMBER_ID',
    'WHATSAPP_CLOUD_ACCESS_TOKEN',
    'WHATSAPP_CLOUD_API_BASE_URL',
  ]
) {
  assert.ok(
    envKeys.has(
      key
    ),
    `.env.example missing ${key}`
  );
}

assert.strictEqual(
  envKeys.get(
    'WHATSAPP_CLOUD_ENABLED'
  ),
  'false'
);

assert.ok(
  !envKeys.has(
    'AWS_ACCESS_KEY_ID'
  )
);

assert.ok(
  !envKeys.has(
    'AWS_SECRET_ACCESS_KEY'
  )
);

console.log(
  '✅ production integration environment template complete'
);


const validEnv = {
  NODE_ENV:
    'production',

  PORT:
    '5000',

  MONGODB_URI:
    'mongodb+srv://example.invalid/omahconnect',

  JWT_SECRET:
    'x'.repeat(
      64
    ),

  ALLOWED_ORIGINS:
    'https://dashboard.example.invalid',

  ALLOW_SIGNUP:
    'false',

  SWAGGER_ENABLED:
    'false',

  DEV_API_ENABLED:
    'false',

  DISABLE_MONGO:
    'false',

  DOCUMENT_STORAGE_PROVIDER:
    's3',

  DOCUMENT_S3_BUCKET:
    'omah-example-private-documents',

  AWS_REGION:
    'us-east-1',

  DOCUMENT_S3_FORCE_PATH_STYLE:
    'false',

  APPLICANT_AUTO_SYNC_ENABLED:
    'false',

  APPLICANT_SYNC_WRITE_ENABLED:
    'false',

  GOOGLE_CALENDAR_ENABLED:
    'false',

  GOOGLE_CALENDAR_WRITE_ENABLED:
    'false',

  GOOGLE_DRIVE_DOCUMENT_IMPORT_ENABLED:
    'false',

  INTERVIEW_EMAIL_ENABLED:
    'false',

  WHATSAPP_CLOUD_ENABLED:
    'false',
};


let result =
  validateProductionEnvironment(
    validEnv
  );

assert.strictEqual(
  result.ok,
  true
);

console.log(
  '✅ safe production baseline validates'
);


result =
  validateProductionEnvironment({
    ...validEnv,
    MONGODB_URI:
      'mongodb://127.0.0.1:27017/omahconnect',
  });

assert.strictEqual(
  result.ok,
  false
);

assert.ok(
  result.errors.some(
    item =>
      item.key ===
      'MONGODB_URI'
  )
);

console.log(
  '✅ localhost production database rejected'
);


result =
  validateProductionEnvironment({
    ...validEnv,
    JWT_SECRET:
      'short',
  });

assert.strictEqual(
  result.ok,
  false
);

assert.ok(
  result.errors.some(
    item =>
      item.key ===
      'JWT_SECRET'
  )
);

console.log(
  '✅ weak JWT production secret rejected'
);


result =
  validateProductionEnvironment({
    ...validEnv,
    ALLOWED_ORIGINS:
      '*',
  });

assert.strictEqual(
  result.ok,
  false
);

console.log(
  '✅ wildcard production origin rejected'
);


result =
  validateProductionEnvironment({
    ...validEnv,
    DOCUMENT_STORAGE_PROVIDER:
      'local',
  });

assert.strictEqual(
  result.ok,
  false
);

assert.ok(
  result.errors.some(
    item =>
      item.key ===
      'DOCUMENT_STORAGE_PROVIDER'
  )
);

console.log(
  '✅ local production document storage rejected'
);


result =
  validateProductionEnvironment({
    ...validEnv,
    GOOGLE_CALENDAR_ENABLED:
      'true',
  });

assert.strictEqual(
  result.ok,
  false
);

assert.ok(
  result.errors.some(
    item =>
      item.key ===
      'GOOGLE_CLIENT_SECRET'
  )
);

console.log(
  '✅ enabled Google integration requires credentials'
);


result =
  validateProductionEnvironment({
    ...validEnv,
    INTERVIEW_EMAIL_ENABLED:
      'true',

    SMTP_HOST:
      'smtp.example.invalid',

    SMTP_PORT:
      '587',

    SMTP_USER:
      'sender@example.invalid',
  });

assert.strictEqual(
  result.ok,
  false
);

assert.ok(
  result.errors.some(
    item =>
      item.key ===
      'SMTP_PASS'
  )
);

console.log(
  '✅ enabled production email requires SMTP secret'
);


result =
  validateProductionEnvironment({
    ...validEnv,
    WHATSAPP_CLOUD_ENABLED:
      'true',

    WHATSAPP_CLOUD_API_VERSION:
      'v1',

    WHATSAPP_CLOUD_PHONE_NUMBER_ID:
      'example',
  });

assert.strictEqual(
  result.ok,
  false
);

assert.ok(
  result.errors.some(
    item =>
      item.key ===
      'WHATSAPP_CLOUD_ACCESS_TOKEN'
  )
);

console.log(
  '✅ enabled WhatsApp Cloud requires access token'
);


const deployment =
  read(
    'docs/deployment.md'
  );

assert.match(
  deployment,
  /P10 selected production target/
);

assert.match(
  deployment,
  /ECS Fargate/
);

assert.match(
  deployment,
  /MongoDB Atlas/
);

console.log(
  '✅ deployment guide points to P10 target'
);


const environmentDoc =
  read(
    'docs/environment.md'
  );

assert.match(
  environmentDoc,
  /P10 production classification/
);

assert.match(
  environmentDoc,
  /WHATSAPP_CLOUD_ACCESS_TOKEN/
);

console.log(
  '✅ environment documentation covers production classification'
);


const docsReadme =
  read(
    'docs/README.md'
  );

assert.match(
  docsReadme,
  /productionEnvironmentDesign\.md/
);

console.log(
  '✅ production design indexed in docs'
);


console.log('');
console.log(
  'P10 PRODUCTION ENVIRONMENT DESIGN TEST PASSED'
);
