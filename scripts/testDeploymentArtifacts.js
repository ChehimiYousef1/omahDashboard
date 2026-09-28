'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(
    path.join(root, relativePath),
    'utf8'
  );
}

function exists(relativePath) {
  return fs.existsSync(
    path.join(root, relativePath)
  );
}

const requiredFiles = [
  '.dockerignore',
  'Dockerfile',
  'docs/containerization.md',
  'docs/awsInfrastructure.md',
  'infrastructure/cloudformation/foundation.yml',
  'infrastructure/cloudformation/service.yml',
  'infrastructure/parameters/staging.example.json',
  'infrastructure/parameters/production.example.json',
  'scripts/testDockerProductionImage.sh',
];

for (const file of requiredFiles) {
  assert(
    exists(file),
    `Missing deployment artifact: ${file}`
  );
}

console.log('✅ required deployment artifacts exist');

const dockerfile = read('Dockerfile');

for (const token of [
  'node:24-bookworm-slim',
  'npm ci --prefix omahconnect-admin',
  'npm ci --omit=dev',
  'ARG VITE_API_URL=/api',
  'USER nodeapp',
  'HEALTHCHECK',
  'CMD ["node", "server.js"]',
]) {
  assert(
    dockerfile.includes(token),
    `Dockerfile missing: ${token}`
  );
}

assert(
  !dockerfile.includes('COPY . .'),
  'Dockerfile must not copy the whole repository.'
);

console.log('✅ Dockerfile follows explicit multi-stage runtime contract');

const dockerignore = read('.dockerignore');

for (const token of [
  '.git',
  'node_modules/',
  '**/node_modules/',
  '.env',
  '**/.env',
  'data/',
  'private-storage/',
  'omahconnect-admin/dist/',
]) {
  assert(
    dockerignore.includes(token),
    `.dockerignore missing: ${token}`
  );
}

console.log('✅ Docker build context excludes local secrets/runtime data');

const foundation = read(
  'infrastructure/cloudformation/foundation.yml'
);

for (const token of [
  'AWS::EC2::VPC',
  'AWS::ECR::Repository',
  'AWS::ECS::Cluster',
  'AWS::ElasticLoadBalancingV2::LoadBalancer',
  'AWS::WAFv2::WebACL',
  'AWS::WAFv2::WebACLAssociation',
  'AWS::S3::Bucket',
  'AWS::EFS::FileSystem',
  'AWS::EFS::AccessPoint',
  'AWS::EC2::VPCEndpoint',
  'AWS::Logs::LogGroup',
  'AWS::IAM::Role',
  'ImageTagMutability: IMMUTABLE',
  'ScanOnPush: true',
  'BlockPublicAcls: true',
  'VersioningConfiguration:',
  'Encrypted: true',
  'BackupPolicy:',
]) {
  assert(
    foundation.includes(token),
    `foundation.yml missing: ${token}`
  );
}

console.log('✅ AWS foundation contract present');

const legacyAccessPointMatch = foundation.match(
  /  LegacyDataAccessPoint:\n([\s\S]*?)\n  LegacyDataMountTarget1:/
);

assert(
  legacyAccessPointMatch,
  'LegacyDataAccessPoint block missing from foundation.yml'
);

const legacyAccessPoint = legacyAccessPointMatch[1];

assert(
  legacyAccessPoint.includes('AccessPointTags:'),
  'EFS AccessPoint must use AccessPointTags.'
);

assert(
  !legacyAccessPoint.includes('\n      Tags:\n'),
  'EFS AccessPoint must not use unsupported Tags property.'
);

const ecsServiceSecurityGroupMatch = foundation.match(
  /  EcsServiceSecurityGroup:\n([\s\S]*?)\n  EcsFromAlbIngress:/
);

assert(
  ecsServiceSecurityGroupMatch,
  'EcsServiceSecurityGroup block missing from foundation.yml'
);

const ecsServiceSecurityGroup =
  ecsServiceSecurityGroupMatch[1];

assert(
  !ecsServiceSecurityGroup.includes('Description: >'),
  'EC2 security-group rule descriptions must not use folded multiline YAML.'
);

assert(
  ecsServiceSecurityGroup.includes(
    'Description: Egress is constrained by private-subnet routing.'
  ),
  'Expected single-line ECS security-group egress description missing.'
);

assert(
  foundation.includes('HttpsApplicationListener:') &&
  foundation.includes('Protocol: HTTPS') &&
  foundation.includes('TlsCertificateArn:') &&
  foundation.includes('PublicDomainAlias:') &&
  foundation.includes('Type: redirect') &&
  foundation.includes('StatusCode: HTTP_301'),
  'Foundation must define HTTPS, DNS alias, and HTTP-to-HTTPS redirect.'
);

assert(
  foundation.includes('ManagePublicDns:') &&
  foundation.includes('ManagePublicDnsEnabled:') &&
  foundation.includes('Condition: ManagePublicDnsEnabled'),
  'Foundation must support external DNS without creating a Route53 record.'
);

assert(
  foundation.includes('NatGatewayEnabled: !Equals') &&
  foundation.includes('ManagePublicDnsEnabled: !Equals'),
  'Foundation must preserve NAT and external-DNS conditions together.'
);

console.log('✅ external DNS production contract present');

console.log('✅ HTTPS/DNS foundation contract present');

console.log('✅ AWS deploy-time schema regression guards present');

const service = read(
  'infrastructure/cloudformation/service.yml'
);

for (const token of [
  'AWS::ECS::TaskDefinition',
  'AWS::ECS::Service',
  'AWS::ElasticLoadBalancingV2::TargetGroup',
  'RequiresCompatibilities:',
  '- FARGATE',
  'AssignPublicIp: DISABLED',
  'ReadonlyRootFilesystem: true',
  'TransitEncryption: ENABLED',
  'IAM: ENABLED',
  'ContainerPath: /app/data',
  'DOCUMENT_STORAGE_PROVIDER',
  'Value: s3',
  'Name: MONGODB_URI',
  'Name: JWT_SECRET',
  'HealthCheckPath: /ready',
  'HttpsListenerArn',
  'HttpsApplicationListenerRule',
  '- /*',
]) {
  assert(
    service.includes(token),
    `service.yml missing: ${token}`
  );
}

assert(
  !service.includes('AccessKeyId') &&
  !service.includes('SecretAccessKey'),
  'Static AWS credentials must not appear in service template.'
);

console.log('✅ ECS service security/runtime contract present');

const allDeploymentText = [
  dockerfile,
  dockerignore,
  foundation,
  service,
  read('docs/containerization.md'),
  read('docs/awsInfrastructure.md'),
].join('\n');

for (const forbidden of [
  /AKIA[0-9A-Z]{16}/,
  /aws_secret_access_key\s*=/i,
  /BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY/,
]) {
  assert(
    !forbidden.test(allDeploymentText),
    `Deployment artifacts contain a forbidden secret-like pattern: ${forbidden}`
  );
}

console.log('✅ no static credential/private-key material in deployment artifacts');

const staging = JSON.parse(
  read('infrastructure/parameters/staging.example.json')
);

const production = JSON.parse(
  read('infrastructure/parameters/production.example.json')
);

function parameterValue(list, key) {
  const found = list.find(
    (item) => item.ParameterKey === key
  );

  return found?.ParameterValue;
}

assert.strictEqual(
  parameterValue(staging, 'EnvironmentName'),
  'staging'
);

assert.strictEqual(
  parameterValue(production, 'EnvironmentName'),
  'production'
);

assert.notStrictEqual(
  parameterValue(staging, 'VpcCidr'),
  parameterValue(production, 'VpcCidr')
);

console.log('✅ staging/production parameter examples are isolated');

const containerDocs = read('docs/containerization.md');
const awsDocs = read('docs/awsInfrastructure.md');

assert(
  /EFS/i.test(containerDocs) &&
  /legacy JSON/i.test(containerDocs),
  'Container docs must explain legacy JSON persistence.'
);

assert(
  /no\s+AWS\s+resources/i.test(awsDocs) ||
  /does\s+not\s+create\s+AWS\s+resources/i.test(awsDocs),
  'IaC docs must state P11B is definition-only.'
);

console.log('✅ transitional persistence and zero-provisioning boundaries documented');

console.log('');
console.log('P11B DEPLOYMENT ARTIFACT REGRESSION PASSED');
