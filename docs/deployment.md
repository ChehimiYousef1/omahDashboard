# Production Deployment

## Scope

This document defines the application deployment contract. It does not claim that AWS infrastructure is already provisioned.

Cloud architecture, DNS, TLS termination, network controls and final deployment automation are completed in later infrastructure phases.

## Pre-deployment

```bash
git status --short
git rev-parse HEAD
git fetch origin
npm ci
npm ci --prefix omahconnect-admin
```

## Build

Production requires `VITE_API_URL`.

```bash
npm run build
```

Expected output:

```text
omahconnect-admin/dist/
```

Production source maps are disabled.

## Backend production configuration

Review at minimum:

```text
NODE_ENV=production
MONGODB_URI
JWT_SECRET
ALLOWED_ORIGINS
SWAGGER_ENABLED=false
DEV_API_ENABLED=false
```

Also review every integration feature gate before enabling writes.

## Start

```bash
NODE_ENV=production npm start
```

A production process manager/container/orchestration service should own restart and lifecycle behavior after infrastructure selection.

## Required checks

```text
GET /health  -> 200
GET /ready   -> 200
/api-docs    -> 404
/api/dev     -> 404
```

unless a support surface was deliberately enabled.

Verify the frontend loads over HTTPS and the production API base URL points to the intended backend.

## Smoke test

1. login
2. Applicants
3. Applicant Profile
4. Talent Pool
5. Documents
6. Analytics
7. Calendar
8. verify no unexpected write integration is enabled

## Deployment architecture requirements

The final infrastructure must provide HTTPS, private secret storage, persistent MongoDB, private durable Applicant-document storage, controlled inbound access, logging, monitoring, restart/recovery, backups, DNS ownership, and rollback capability.

No frontend secret may be required.

## Rollback

Use a known Git checkpoint/tag or previously verified deployment artifact.

1. stop new rollout/traffic as appropriate
2. identify previous verified checkpoint
3. redeploy previous application version
4. restore prior environment configuration if it changed
5. verify `/health`
6. verify `/ready`
7. run smoke tests

Do not automatically roll a database backward merely because application code is rolled back.

Database rollback/restore must follow the verified migration and backup procedure.

## P10 selected production target

The first production deployment target is:

```text
GoDaddy domain/DNS
        |
        v
AWS Application Load Balancer + ACM + AWS WAF
        |
        v
ECS Fargate
        |
        +--> Node 24 / Express / React production bundle
        +--> MongoDB Atlas
        +--> private S3 Applicant documents
        +--> Secrets Manager
        +--> CloudWatch
```

The application remains single-origin for the first release. The Node
application serves both the Vite production bundle and the API.

Target public origin:

```text
https://dashboard.<production-domain>
```

Target frontend API value:

```text
VITE_API_URL=https://dashboard.<production-domain>/api
```

Target browser origin:

```text
ALLOWED_ORIGINS=https://dashboard.<production-domain>
```

Initial ECS desired count is one because application rate-limit counters are
currently in-memory. WAF provides the next distributed abuse layer; shared
application rate-limit state is a scaling prerequisite when exact cross-task
counters are required.

Managed Applicant documents use a private S3 bucket. MongoDB remains MongoDB and
the selected managed production database target is MongoDB Atlas.

Production secrets use AWS Secrets Manager. AWS runtime access uses IAM task
roles rather than static access keys.

P10 creates no AWS resources and changes no DNS. P11 provisions the AWS
foundation; P12 deploys staging before production.

The complete design and phase gates are documented in:

```text
docs/productionEnvironmentDesign.md
```
