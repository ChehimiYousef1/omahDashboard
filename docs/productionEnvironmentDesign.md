# Production Environment Design

## Status and scope

This document is the P10 production-environment design for OMAH Connect.

P10 defines the target production and staging architecture. It does **not**
provision AWS resources, change DNS, create certificates, deploy production
traffic, or insert real credentials into the repository.

The design intentionally follows the current application architecture instead
of introducing an unnecessary frontend/backend split before the first verified
production release.

## Primary deployment decision

The first production release uses one public application origin:

```text
https://dashboard.<production-domain>
```

The Node application continues to serve:

- the compiled React/Vite frontend
- `/api/*`
- `/health`
- `/ready`

The frontend production build uses:

```text
VITE_API_URL=https://dashboard.<production-domain>/api
```

The backend uses:

```text
ALLOWED_ORIGINS=https://dashboard.<production-domain>
```

Using one public application origin preserves the current cookie,
authentication, CORS, SPA-fallback and API behavior with the smallest production
change surface.

A separate frontend S3/CloudFront deployment can be introduced later if there
is a measured performance or operational reason. It is not required for the
first production release.

## Target architecture

```text
Internet
   |
   v
GoDaddy-managed domain / DNS
   |
   v
HTTPS
   |
   v
AWS Application Load Balancer
   |
   +--> AWS WAF web ACL
   |
   v
ECS Fargate service
   |
   +--> Node 24 application
   |      +--> React/Vite production bundle
   |      +--> Express API
   |      +--> /health
   |      +--> /ready
   |
   +--> MongoDB Atlas
   |
   +--> private Amazon S3 Applicant-document bucket
   |
   +--> AWS Secrets Manager
   |
   +--> CloudWatch Logs / alarms
   |
   +--> Google / SMTP / WhatsApp external services
```

Container images are stored in Amazon ECR and tagged with the deployment Git
commit SHA.

## Compute

### ECS Fargate

The selected first-production compute target is Amazon ECS on Fargate.

Reasons:

- no server OS patching is required for the application host
- the existing Node process can run unchanged inside a container
- ECS integrates with ECR, ALB, IAM roles, Secrets Manager and CloudWatch
- deployment can use immutable image tags based on verified Git commits
- application lifecycle already supports `SIGTERM` / graceful shutdown

P11 creates the container and AWS infrastructure. No Dockerfile or AWS
infrastructure artifact existed at the P10 preflight checkpoint.

### Initial task count

Initial production desired count:

```text
1
```

The current P7/P9 application rate limiters use in-memory counters. A single
task preserves deterministic application-level counters.

Before horizontal application scaling, add the required edge controls and
either:

1. accept that application counters are per task because AWS WAF provides the
   primary distributed abuse boundary, or
2. move application rate-limit state to a shared store such as Redis.

This is an explicit scaling gate, not an accidental limitation.

## Network layout

Production target:

- one VPC
- at least two Availability Zones
- public subnets for the Application Load Balancer
- private application subnets for ECS tasks
- outbound internet connectivity for Google, SMTP, WhatsApp and other required
  external services
- an S3 VPC endpoint should be used where practical for private S3 traffic
- security groups enforce the inbound path

Security-group intent:

```text
Internet
  -> ALB: 443

ALB security group
  -> ECS application security group: application port only

ECS
  -> MongoDB Atlas
  -> S3
  -> required external integrations
```

The ECS task must not expose the Node application port directly to the public
internet.

Production high-availability networking should use resilient outbound egress.
A lower-cost staging environment may deliberately use a reduced egress design,
but the cost/availability trade-off must be recorded.

## TLS and domain model

P14/P15 bind the final domain and certificate.

Target shape:

```text
dashboard.<production-domain>
staging-dashboard.<production-domain>
```

The registrar may remain GoDaddy. DNS may remain at GoDaddy or be delegated to
Route 53 during the DNS phase.

TLS uses AWS Certificate Manager for the Application Load Balancer.

HTTP port 80, if opened at all, redirects to HTTPS 443.

No production browser origin may use HTTP, localhost or wildcard CORS.

## AWS WAF

Associate an AWS WAF v2 web ACL with the public Application Load Balancer.

P11/P13 define and verify:

- AWS managed baseline rule groups appropriate to the application
- rate-based rules for abusive IP traffic
- request-size / malformed-request protections where appropriate
- logging
- exclusions only when a verified application workflow requires one

Application P7/P8/P9 controls remain defense in depth. WAF does not replace
authentication or Applicant RBAC.

## Database

MongoDB remains the application database.

Production target:

```text
MongoDB Atlas on AWS
```

Do not migrate the application to a different Mongo-compatible database merely
for infrastructure consolidation without a separate compatibility exercise.

Production requirements:

- TLS connection
- dedicated least-privilege database user
- production database separated from staging
- Atlas backup policy enabled
- network access restricted to the production application path
- no `0.0.0.0/0` database allow-list for production

Preferred production networking is Atlas AWS PrivateLink on a supported
dedicated Atlas tier. If the selected production budget/tier cannot use
PrivateLink, use a documented temporary network-access design with controlled
AWS egress addresses and remove broad temporary access rules before production
go-live.

The application connection string remains a secret:

```text
MONGODB_URI
```

## Database migrations

Migrations remain explicit and forward-only.

Production sequence:

```text
backup
restore verification / safe staging verification
npm run migrate:check
npm run migrate:status
apply staging migration
validate staging
approved production migration step
deploy compatible application
verify /health and /ready
```

Application startup must not silently execute migrations.

## Applicant document storage

Production managed documents use:

```text
DOCUMENT_STORAGE_PROVIDER=s3
```

The production bucket is private and separate from staging.

Required controls:

- S3 Block Public Access enabled
- bucket/object access only through least-privilege IAM
- encryption at rest
- TLS-only access
- S3 Versioning enabled
- lifecycle/retention policy defined
- no public website access
- no static AWS access keys inside application environment files

The current application already creates short-lived S3 download URLs with a
300-second lifetime. That remains the initial production download lifetime
unless P13 identifies a reason to shorten it.

Legacy external document URLs remain transitional records. New managed
production documents should use OMAH-controlled S3 storage.

## IAM model

Use separate ECS roles:

### Task execution role

Used by ECS for infrastructure actions such as:

- pulling the ECR image
- sending container logs
- resolving task-definition secret references where configured

### Application task role

Used by the running Node application.

Grant only the permissions required for the private Applicant-document bucket
and any other explicitly approved runtime AWS API.

Do not use long-lived `AWS_ACCESS_KEY_ID` /
`AWS_SECRET_ACCESS_KEY` values in `.env`.

## Secrets and configuration

### Secrets Manager

Store production secrets in AWS Secrets Manager:

- `MONGODB_URI`
- `JWT_SECRET`
- `SMTP_PASS`
- `APPLICANT_FORM_WEBHOOK_SECRET`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN`
- `WHATSAPP_CLOUD_ACCESS_TOKEN`
- any future provider credential

Credentials known to have existed in repository history must not be reused in
production.

### Non-secret runtime configuration

Examples:

- `NODE_ENV`
- `PORT`
- `ALLOWED_ORIGINS`
- feature gates
- `AWS_REGION`
- `DOCUMENT_STORAGE_PROVIDER`
- `DOCUMENT_S3_BUCKET`
- provider names / public identifiers that are not credentials

### Public frontend build configuration

Only public values belong in `VITE_*`.

For the initial same-origin deployment:

```text
VITE_API_URL=https://dashboard.<production-domain>/api
```

No secret may be placed in a `VITE_*` value.

## Production feature-gate baseline

First production deployment starts conservatively.

```text
NODE_ENV=production
ALLOW_SIGNUP=false
SWAGGER_ENABLED=false
DEV_API_ENABLED=false
DISABLE_MONGO=false

DOCUMENT_STORAGE_PROVIDER=s3
DOCUMENT_S3_FORCE_PATH_STYLE=false

APPLICANT_AUTO_SYNC_ENABLED=false
APPLICANT_SYNC_WRITE_ENABLED=false

GOOGLE_CALENDAR_ENABLED=false
GOOGLE_CALENDAR_WRITE_ENABLED=false
GOOGLE_DRIVE_DOCUMENT_IMPORT_ENABLED=false

INTERVIEW_EMAIL_ENABLED=false
WHATSAPP_CLOUD_ENABLED=false
```

Write-capable integrations are enabled one at a time only after staging
verification of credentials, target account, recipient behavior and rollback /
disable procedure.

## Integration requirements

### Applicant ingestion

Production webhook and synchronization credentials/configuration are isolated
from staging.

Write synchronization remains disabled until the production data source and
idempotency behavior are verified.

### Google

Google OAuth secrets remain backend-only.

Before enabling Calendar writes or Drive import:

- production OAuth client/configuration verified
- refresh token verified
- scopes verified
- Calendar target verified
- Drive source/ownership verified
- notification/update behavior verified

### SMTP

Production SMTP must fail closed if credentials are missing.

Enable interview/applicant email only after:

- sender identity verified
- recipient behavior tested in staging
- SMTP credential rotated for production
- failure/disable procedure verified

### WhatsApp Cloud

Production WhatsApp Cloud configuration uses:

- `WHATSAPP_CLOUD_ENABLED`
- `WHATSAPP_CLOUD_API_VERSION`
- `WHATSAPP_CLOUD_PHONE_NUMBER_ID`
- `WHATSAPP_CLOUD_ACCESS_TOKEN`
- optional `WHATSAPP_CLOUD_API_BASE_URL`

The access token is a secret. The feature remains disabled until a staging
message test is explicitly approved.

## Health, readiness and lifecycle

Use existing endpoints:

```text
GET /health
GET /ready
```

Recommended infrastructure use:

- container/process liveness: `/health`
- load-balancer target readiness: `/ready`

A deployment is not accepted merely because the process listens on a port.

ECS deployment health must include application readiness and the normal
post-deployment smoke suite.

Graceful `SIGTERM` handling must remain enabled so deployments can drain active
requests before task termination.

## Logging and monitoring

The current application primarily logs to stdout/stderr.

ECS routes container output to CloudWatch Logs.

P11/P17 add:

- structured log group naming
- retention
- ALB request metrics
- target health alarms
- ECS CPU/memory alarms
- task restart/deployment failure alarms
- application 5xx monitoring
- WAF metrics/logging
- MongoDB Atlas alerts
- backup-failure alerts

Never log secrets, refresh tokens, SMTP passwords, JWT secrets or full
authorization headers.

## Backup and recovery

Production recovery covers at least:

- MongoDB Atlas application data
- S3 Applicant documents
- deployment image / Git checkpoint
- configuration references
- secret versions through the secret-management system

S3 Versioning is enabled for managed documents.

Database backups are managed by the selected Atlas production backup policy.

A release is not considered recoverable until staging restore verification has
been performed using the production-style backup mechanisms.

The existing local P4 restore drill remains evidence for the local backup
workflow, not a substitute for production restore verification.

## Staging isolation

P12 deploys staging before production.

Staging uses:

```text
https://staging-dashboard.<production-domain>
```

It must have separate:

- MongoDB database/cluster context
- S3 bucket
- Secrets Manager secrets
- webhook secret
- integration feature-gate values

Staging must not silently send production email, Calendar invitations or
WhatsApp messages.

## Release artifact strategy

Application release artifact:

```text
ECR image tagged with Git commit SHA
```

A release record maps:

```text
Git commit
Git checkpoint tag
ECR image digest/tag
environment
migration status
deployment time
smoke-test result
```

Rollback uses a previously verified immutable image/checkpoint. Database state
is not automatically downgraded when application code is rolled back.

## Infrastructure as code

P11 should provision AWS resources through an auditable infrastructure-as-code
workflow rather than relying on console-only configuration.

AWS CloudFormation is the preferred initial AWS-native path for this project.
Secrets are referenced, not embedded in templates.

MongoDB Atlas resources may be configured through Atlas tooling or a separately
controlled provider workflow. Atlas credentials must not be committed.

## P10 acceptance decisions

P10 is complete when the repository records and validates these decisions:

- single-origin first production deployment
- ECS Fargate + ECR
- public ALB + ACM + WAF
- private ECS application networking
- MongoDB Atlas
- private S3 managed-document storage
- Secrets Manager
- CloudWatch
- explicit production environment validation
- conservative integration feature gates
- separate staging environment
- explicit backup/migration/rollback boundaries
- no AWS/DNS resources provisioned during P10

## Phase boundary

After P10:

```text
P11 — AWS infrastructure
P12 — AWS staging deployment
P13 — online security audit
P14 — GoDaddy domain / DNS
P15 — HTTPS / certificate finalization
P16 — production deployment
P17 — monitoring / automated backups
P18 — final security + functional regression
P19 — final documentation / checkpoint
```
