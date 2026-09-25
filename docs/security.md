# Production Security

## Security model

OMAH Connect uses layered controls across authentication, authorization, environment secrets, CORS, support-surface restrictions, document access, integration feature gates, audit history, and repository hygiene.

## Secrets

Never commit:

```text
.env
MongoDB credentials
JWT secrets
SMTP passwords
Google client secrets
Google refresh tokens
webhook secrets
private keys
```

`.env.example` contains names/default-safe values only.

Historical credentials that may previously have existed in Git history must be treated as exposed and rotated before production use.

## Frontend configuration

All `VITE_*` values are visible to frontend users. Only non-secret public configuration belongs there.

Current production frontend configuration requires `VITE_API_URL`.

## Production support surfaces

```text
SWAGGER_ENABLED=false
DEV_API_ENABLED=false
```

When disabled:

```text
/api-docs -> 404
/api/dev  -> 404
```

## CORS

Production `ALLOWED_ORIGINS` must contain only intended HTTPS frontend origins.

Do not use an unrestricted wildcard with credentialed traffic.

## Authentication and authorization

Authentication remains server-side.

Applicant routes use Applicant-specific authorization and permission checks rather than a blanket Admin-only gate for all Applicant operations.

Privileged operations can still require elevated permissions where appropriate.

## Applicant documents

Applicant documents require authenticated access, authorization checks, upload validation, private storage, safe view/download behavior and auditable lifecycle operations.

## Integration safety

Write-capable integrations are separately gated:

```text
APPLICANT_SYNC_WRITE_ENABLED
GOOGLE_CALENDAR_WRITE_ENABLED
GOOGLE_DRIVE_DOCUMENT_IMPORT_ENABLED
INTERVIEW_EMAIL_ENABLED
```

Do not enable a write feature merely because its read integration works.

## Production build

Production frontend requirements include explicit `VITE_API_URL`, disabled source maps, and no localhost backend URL embedded in the bundle.

## Repository hygiene

The repository ignores environment files, dependencies, generated builds, logs, local backups, runtime data, private document storage, and temporary files.

## Later security phases

P2 documents the security contract. Later phases still require active verification of dependency vulnerabilities, Git secret history, auth/authz, CORS, cookies/tokens, request validation, injection, XSS, CSRF exposure, uploads, rate limits, abuse controls, bot/crawler behavior, scraping deterrence, TLS, production exposure, cloud permissions, logging and monitoring.
